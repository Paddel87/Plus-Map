/**
 * Workflow-action tests for `CatalogListing` (M7.4 / ADR-043).
 *
 * Verifies the per-row action buttons:
 *   - Admin sees Approve+Reject on pending rows; Edit on approved/rejected.
 *   - Editor sees Withdraw on own pending; nothing on foreign rows.
 *   - Approve POSTs to /<kind>/<id>/approve.
 *   - Reject opens dialog; submitting POSTs reason to /<kind>/<id>/reject.
 *   - Withdraw DELETEs /<kind>/<id>.
 *   - All three invalidate the listing query (next list-call replays).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogListing } from "@/components/catalog/catalog-listing";
import type { LookupCatalogEntry, EquipmentItemEntry } from "@/lib/catalog/types";
import type { RbacUser } from "@/lib/rbac";

const replaceMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ status: "pending" }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

const ADMIN: RbacUser = { id: "u-admin", role: "admin" };
const EDITOR_A: RbacUser = { id: "u-editor-a", role: "editor" };
const EDITOR_B: RbacUser = { id: "u-editor-b", role: "editor" };

const PENDING_BY_EDITOR_A: EquipmentItemEntry = {
  id: "rt-pending",
  category: "tools",
  brand: null,
  model: null,
  display_name: "Hanfseil",
  status: "pending",
  suggested_by: "u-editor-a",
  approved_by: null,
  rejected_by: null,
  rejected_at: null,
  reject_reason: null,
  note: null,
  created_at: "2026-04-28T10:00:00Z",
  updated_at: null,
};

const APPROVED_ROW: LookupCatalogEntry = {
  id: "ap-approved",
  name: "Standing",
  description: null,
  status: "approved",
  suggested_by: null,
  approved_by: "u-admin",
  rejected_by: null,
  rejected_at: null,
  reject_reason: null,
  created_at: "2026-04-26T08:00:00Z",
  updated_at: null,
};

interface MockCall {
  url: string;
  method: string;
  body: unknown;
}

function setupFetch(items: unknown[]): MockCall[] {
  const calls: MockCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : null;
      calls.push({ url, method, body });
      if (method === "GET") {
        return new Response(JSON.stringify({ items, total: items.length, limit: 50, offset: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      // POST approve/reject return the updated row.
      return new Response(JSON.stringify(items[0] ?? {}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

function withQuery(): (props: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replaceMock.mockClear();
  toastErrorMock.mockClear();
  toastSuccessMock.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      href: "http://localhost/admin/catalogs/equipment-items?status=pending",
      origin: "http://localhost",
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CatalogListing — admin actions on pending row", () => {
  it("renders Freigeben + Ablehnen buttons", async () => {
    setupFetch([PENDING_BY_EDITOR_A]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    expect(await screen.findByText("Hanfseil")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Freigeben" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ablehnen" })).toBeInTheDocument();
  });

  it("Freigeben POSTs to /<kind>/<id>/approve and toasts success", async () => {
    const calls = setupFetch([PENDING_BY_EDITOR_A]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    await screen.findByText("Hanfseil");
    fireEvent.click(screen.getByRole("button", { name: "Freigeben" }));
    await waitFor(() =>
      expect(
        calls.some(
          (c) => c.method === "POST" && c.url === "/api/equipment-items/rt-pending/approve",
        ),
      ).toBe(true),
    );
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    const [msg] = toastSuccessMock.mock.calls[0] as [string];
    expect(msg).toContain("Hanfseil");
    expect(msg).toContain("freigegeben");
  });

  it("Ablehnen opens dialog, blocks empty submit, then POSTs trimmed reason", async () => {
    const calls = setupFetch([PENDING_BY_EDITOR_A]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    await screen.findByText("Hanfseil");
    fireEvent.click(screen.getByRole("button", { name: "Ablehnen" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // Empty submit must not POST.
    fireEvent.click(screen.getByRole("button", { name: "Ablehnen" }));
    expect(calls.find((c) => c.method === "POST" && c.url.endsWith("/reject"))).toBeUndefined();

    fireEvent.change(screen.getByLabelText("Begründung *"), {
      target: { value: "  Doppelt — Hanfseil ist schon als Hanfseil-A geführt.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ablehnen" }));

    await waitFor(() => {
      const rejectCall = calls.find(
        (c) => c.method === "POST" && c.url === "/api/equipment-items/rt-pending/reject",
      );
      expect(rejectCall).toBeDefined();
      expect(rejectCall!.body).toEqual({
        reason: "Doppelt — Hanfseil ist schon als Hanfseil-A geführt.",
      });
    });
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  });
});

describe("CatalogListing — editor variant", () => {
  it("editor (owner) sees Zurückziehen on own pending row", async () => {
    setupFetch([PENDING_BY_EDITOR_A]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={EDITOR_A} />
      </Wrapper>,
    );
    await screen.findByText("Hanfseil");
    expect(screen.getByRole("button", { name: "Zurückziehen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Freigeben" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ablehnen" })).toBeNull();
  });

  it("editor (non-owner) sees no actions on foreign pending rows", async () => {
    setupFetch([PENDING_BY_EDITOR_A]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={EDITOR_B} />
      </Wrapper>,
    );
    await screen.findByText("Hanfseil");
    expect(screen.queryByRole("button", { name: "Zurückziehen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Freigeben" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ablehnen" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Bearbeiten" })).toBeNull();
  });

  it("Zurückziehen DELETEs /<kind>/<id> and toasts success", async () => {
    const calls = setupFetch([PENDING_BY_EDITOR_A]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={EDITOR_A} />
      </Wrapper>,
    );
    await screen.findByText("Hanfseil");
    fireEvent.click(screen.getByRole("button", { name: "Zurückziehen" }));
    await waitFor(() =>
      expect(
        calls.some((c) => c.method === "DELETE" && c.url === "/api/equipment-items/rt-pending"),
      ).toBe(true),
    );
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  });
});

describe("CatalogListing — admin Bearbeiten on approved", () => {
  it("renders Bearbeiten link only for approved/rejected rows", async () => {
    setupFetch([APPROVED_ROW]);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="arm-positions" currentUser={ADMIN} />
      </Wrapper>,
    );
    const link = await screen.findByRole("link", { name: "Bearbeiten" });
    expect(link).toHaveAttribute("href", "/admin/catalogs/arm-positions/ap-approved/edit");
  });
});
