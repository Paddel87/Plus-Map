/**
 * Integration test for `CatalogListing` (M7.2 + M7.4).
 *
 * Verifies the listing reads `?status=` from the URL, calls the right
 * `/api/<kind>` endpoint, writes back to the URL via `router.replace`
 * when the StatusFilter changes, and renders the correct
 * call-to-action button per role. M7.4 broadened the prop from
 * `isAdmin` to a full `currentUser` so editor-withdraw can compare
 * `entry.suggested_by` against the viewer's id.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogListing, parseStatusParam } from "@/components/catalog/catalog-listing";
import type { RbacUser } from "@/lib/rbac";

const replaceMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => searchParams,
}));

const ADMIN: RbacUser = { id: "u-admin", role: "admin" };
const EDITOR: RbacUser = { id: "u-editor", role: "editor" };

function withQuery(): (props: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replaceMock.mockClear();
  searchParams = new URLSearchParams();
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "http://localhost/admin/catalogs/equipment-items", origin: "http://localhost" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockListResponse(items: unknown[], expectedQuery: (url: string) => void) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
    expectedQuery(url);
    return new Response(JSON.stringify({ items, total: items.length, limit: 50, offset: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

describe("parseStatusParam", () => {
  it("returns 'all' for null / unknown / 'all'", () => {
    expect(parseStatusParam(null)).toBe("all");
    expect(parseStatusParam("all")).toBe("all");
    expect(parseStatusParam("garbage")).toBe("all");
  });
  it("passes through known statuses", () => {
    expect(parseStatusParam("approved")).toBe("approved");
    expect(parseStatusParam("pending")).toBe("pending");
    expect(parseStatusParam("rejected")).toBe("rejected");
  });
});

describe("CatalogListing (M7.2)", () => {
  it("calls /api/<kind> without status when URL has none", async () => {
    let calledUrl: string | null = null;
    mockListResponse([], (url) => {
      calledUrl = url;
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    await waitFor(() => expect(calledUrl).not.toBeNull());
    expect(calledUrl).toBe("/api/equipment-items");
  });

  it("forwards URL ?status=pending to the API", async () => {
    searchParams = new URLSearchParams({ status: "pending" });
    let calledUrl: string | null = null;
    mockListResponse([], (url) => {
      calledUrl = url;
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="arm-positions" currentUser={ADMIN} />
      </Wrapper>,
    );
    await waitFor(() => expect(calledUrl).not.toBeNull());
    expect(calledUrl).toBe("/api/arm-positions?status=pending");
  });

  it("renders the loaded entries", async () => {
    mockListResponse(
      [
        {
          id: "r-1",
          category: "tools",
          brand: null,
          model: null,
          display_name: "Hanfseil",
          status: "approved",
          suggested_by: null,
          approved_by: null,
          rejected_by: null,
          rejected_at: null,
          reject_reason: null,
          note: null,
          created_at: "2026-04-26T10:00:00Z",
          updated_at: null,
        },
      ],
      () => {},
    );
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    expect(await screen.findByText("Hanfseil")).toBeInTheDocument();
    expect(screen.getByText("1 Einträge")).toBeInTheDocument();
  });

  it("writes URL ?status when StatusFilter changes from 'all' to 'pending'", async () => {
    mockListResponse([], () => {});
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Vorgeschlagen" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/admin/catalogs/equipment-items?status=pending", {
      scroll: false,
    });
  });

  it("removes the URL param when switching back to 'all'", async () => {
    searchParams = new URLSearchParams({ status: "approved" });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        href: "http://localhost/admin/catalogs/equipment-items?status=approved",
        origin: "http://localhost",
      },
    });
    mockListResponse([], () => {});
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Alle" }));
    expect(replaceMock).toHaveBeenCalledWith("/admin/catalogs/equipment-items", { scroll: false });
  });

  it("renders 'Neuer Eintrag' for admins, 'Neuen Vorschlag einreichen' for editors", async () => {
    mockListResponse([], () => {});
    const Wrapper = withQuery();
    const { rerender } = render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    const adminLink = await screen.findByRole("link", { name: "Neuer Eintrag" });
    expect(adminLink).toHaveAttribute("href", "/admin/catalogs/equipment-items/new");
    rerender(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={EDITOR} />
      </Wrapper>,
    );
    const editorLink = await screen.findByRole("link", {
      name: "Neuen Vorschlag einreichen",
    });
    expect(editorLink).toHaveAttribute("href", "/admin/catalogs/equipment-items/new");
  });

  it("shows an error alert when the API rejects", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      return new Response("nope", { status: 500 });
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <CatalogListing kind="equipment-items" currentUser={ADMIN} />
      </Wrapper>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/nicht laden/i);
  });
});
