/**
 * Form tests for M7.3 (LookupForm + RestraintTypeForm).
 *
 * Cover the four user-visible outcomes named in ADR-042 §B/§F:
 *   1. Submit happy path → POST body shape.
 *   2. UNIQUE conflict (409) → toast.error.
 *   3. Edit-mode pre-fills the existing entry.
 *   4. Cancel button + post-success navigate back to listing.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LookupForm } from "@/components/catalog/lookup-form";
import { RestraintTypeForm } from "@/components/catalog/restraint-type-form";
import type { LookupCatalogEntry, RestraintTypeEntry } from "@/lib/catalog/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

function withQuery(): (props: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function setFetch(handler: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
  toastErrorMock.mockClear();
  toastSuccessMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LookupForm — create as admin", () => {
  it("posts the trimmed body and navigates back", async () => {
    let captured: { url: string; body: unknown } | null = null;
    setFetch(async (input, init) => {
      captured = {
        url: typeof input === "string" ? input : input.toString(),
        body: init?.body ? JSON.parse(init.body as string) : null,
      };
      return new Response(
        JSON.stringify({
          id: "ap-new",
          name: "Strappado",
          description: null,
          status: "approved",
          suggested_by: null,
          approved_by: "u-admin",
          rejected_by: null,
          rejected_at: null,
          reject_reason: null,
          created_at: "2026-04-28T12:00:00Z",
          updated_at: null,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupForm kind="arm-positions" mode={{ type: "create" }} isAdmin />
      </Wrapper>,
    );
    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "  Strappado  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Freigeben & speichern" }));
    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured!.url).toBe("/api/arm-positions");
    expect(captured!.body).toEqual({ name: "Strappado", description: null });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin/catalogs/arm-positions"));
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("shows a 409 toast when the entry already exists", async () => {
    setFetch(
      async () =>
        new Response(
          JSON.stringify({ detail: "Catalog entry conflicts with an existing row: …" }),
          { status: 409, headers: { "content-type": "application/json" } },
        ),
    );
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupForm kind="arm-positions" mode={{ type: "create" }} isAdmin />
      </Wrapper>,
    );
    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "Strappado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Freigeben & speichern" }));
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    const [title] = toastErrorMock.mock.calls[0] as [string, unknown];
    expect(title).toBe("Eintrag existiert bereits");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("rejects empty name client-side without posting", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupForm kind="arm-positions" mode={{ type: "create" }} isAdmin />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Freigeben & speichern" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });
});

describe("LookupForm — editor variant + edit-mode", () => {
  it("uses the editor button label when isAdmin is false", () => {
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupForm kind="arm-positions" mode={{ type: "create" }} isAdmin={false} />
      </Wrapper>,
    );
    expect(screen.getByRole("button", { name: "Vorschlag einreichen" })).toBeInTheDocument();
  });

  it("pre-fills the entry in edit mode and PATCHes on submit", async () => {
    const entry: LookupCatalogEntry = {
      id: "ap-existing",
      name: "Strappado",
      description: "alte Beschreibung",
      status: "approved",
      suggested_by: null,
      approved_by: "u-admin",
      rejected_by: null,
      rejected_at: null,
      reject_reason: null,
      created_at: "2026-04-26T08:00:00Z",
      updated_at: null,
    };
    let captured: { url: string; method: string; body: unknown } | null = null;
    setFetch(async (input, init) => {
      captured = {
        url: typeof input === "string" ? input : input.toString(),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(init.body as string) : null,
      };
      return new Response(JSON.stringify({ ...entry, name: "Strappado-X" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupForm kind="arm-positions" mode={{ type: "edit", entry }} isAdmin />
      </Wrapper>,
    );
    expect(screen.getByLabelText("Name *")).toHaveValue("Strappado");
    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "Strappado-X" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured!.method).toBe("PATCH");
    expect(captured!.url).toBe("/api/arm-positions/ap-existing");
    expect(captured!.body).toEqual({
      name: "Strappado-X",
      description: "alte Beschreibung",
    });
  });
});

describe("RestraintTypeForm", () => {
  it("renders all four field rows + display name", () => {
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <RestraintTypeForm mode={{ type: "create" }} isAdmin />
      </Wrapper>,
    );
    expect(screen.getByLabelText("Display-Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Kategorie *")).toBeInTheDocument();
    expect(screen.getByLabelText("Mechanik")).toBeInTheDocument();
    expect(screen.getByLabelText("Marke")).toBeInTheDocument();
    expect(screen.getByLabelText("Modell")).toBeInTheDocument();
  });

  it("submits with empty mechanical_type as null and trimmed values", async () => {
    let body: unknown = null;
    setFetch(async (_input, init) => {
      body = init?.body ? JSON.parse(init.body as string) : null;
      return new Response(
        JSON.stringify({
          id: "rt-new",
          category: "rope",
          brand: null,
          model: null,
          mechanical_type: null,
          display_name: "Hanfseil",
          status: "approved",
          suggested_by: null,
          approved_by: "u-admin",
          rejected_by: null,
          rejected_at: null,
          reject_reason: null,
          note: null,
          created_at: "2026-04-28T12:00:00Z",
          updated_at: null,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <RestraintTypeForm mode={{ type: "create" }} isAdmin />
      </Wrapper>,
    );
    fireEvent.change(screen.getByLabelText("Display-Name *"), {
      target: { value: "  Hanfseil  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Freigeben & speichern" }));
    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toEqual({
      category: "rope",
      brand: null,
      model: null,
      mechanical_type: null,
      display_name: "Hanfseil",
      note: null,
    });
  });

  it("pre-fills edit-mode values and PATCHes the right URL", async () => {
    const entry: RestraintTypeEntry = {
      id: "rt-existing",
      category: "handcuffs",
      brand: "ASP",
      model: "Chain",
      mechanical_type: "chain",
      display_name: "ASP Chain Cuffs",
      status: "approved",
      suggested_by: null,
      approved_by: "u-admin",
      rejected_by: null,
      rejected_at: null,
      reject_reason: null,
      note: null,
      created_at: "2026-04-26T10:00:00Z",
      updated_at: null,
    };
    let captured: { url: string; method: string } | null = null;
    setFetch(async (input, init) => {
      captured = {
        url: typeof input === "string" ? input : input.toString(),
        method: init?.method ?? "GET",
      };
      return new Response(JSON.stringify(entry), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <RestraintTypeForm mode={{ type: "edit", entry }} isAdmin />
      </Wrapper>,
    );
    expect(screen.getByLabelText("Display-Name *")).toHaveValue("ASP Chain Cuffs");
    expect(screen.getByLabelText("Marke")).toHaveValue("ASP");
    expect(screen.getByLabelText("Modell")).toHaveValue("Chain");
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured!.method).toBe("PATCH");
    expect(captured!.url).toBe("/api/restraint-types/rt-existing");
  });
});
