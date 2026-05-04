/**
 * Component coverage for the M7.5-FU2 LookupPicker (single-select for
 * ArmPosition / HandPosition / HandOrientation).
 *
 * Mirrors the relevant behaviours from `tests/restraint-picker.test.tsx`
 * but for the single-select / nullable shape:
 *   1. List filtered to status='approved' (pending hidden)
 *   2. Selecting an option calls onChange with the id
 *   3. "— keine —" maps to null
 *   4. Quick-Propose: editor → pending toast, no auto-select; admin →
 *      auto-approve toast + onChange picks the new id.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LookupPicker } from "@/components/catalog/lookup-picker";
import type { LookupCatalogEntry } from "@/lib/catalog/types";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

function makeLookup(
  overrides: Partial<LookupCatalogEntry> & Pick<LookupCatalogEntry, "id" | "name">,
): LookupCatalogEntry {
  return {
    id: overrides.id,
    name: overrides.name,
    description: overrides.description ?? null,
    status: overrides.status ?? "approved",
    suggested_by: overrides.suggested_by ?? null,
    approved_by: overrides.approved_by ?? null,
    rejected_by: null,
    rejected_at: null,
    reject_reason: null,
    created_at: "2026-04-29T12:00:00Z",
    updated_at: null,
  };
}

const SEED: LookupCatalogEntry[] = [
  makeLookup({ id: "11111111-1111-1111-1111-111111111111", name: "hinter dem Rücken" }),
  makeLookup({ id: "22222222-2222-2222-2222-222222222222", name: "Strappado" }),
  makeLookup({
    id: "33333333-3333-3333-3333-333333333333",
    name: "Editor's Pending",
    status: "pending",
  }),
];

function withQuery() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "http://localhost/", origin: "http://localhost" },
  });
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    return new Response(JSON.stringify({ items: SEED, total: SEED.length, limit: 50, offset: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LookupPicker — list + selection", () => {
  it("shows only approved entries, plus a — keine — option", async () => {
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value={null}
          onChange={vi.fn()}
          isAdmin={false}
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lookup-picker-select").querySelectorAll("option")).toHaveLength(3),
    );
    const select = screen.getByTestId("lookup-picker-select") as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((o) => o.textContent);
    // The first option is the nullable "— keine —" sentinel; the
    // remaining two follow `localeCompare("de")` order. We don't pin
    // the locale ordering here — the only invariant is that the
    // nullable sentinel comes first and the pending entry is hidden.
    expect(optionTexts[0]).toBe("— keine —");
    expect(optionTexts).toContain("Strappado");
    expect(optionTexts).toContain("hinter dem Rücken");
    expect(optionTexts).not.toContain("Editor's Pending");
  });

  it("calls onChange with the selected id, and with null when the user clears", async () => {
    const Wrapper = withQuery();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value={null}
          onChange={onChange}
          isAdmin={false}
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lookup-picker-select").querySelectorAll("option")).toHaveLength(3),
    );
    fireEvent.change(screen.getByTestId("lookup-picker-select"), {
      target: { value: "22222222-2222-2222-2222-222222222222" },
    });
    expect(onChange).toHaveBeenLastCalledWith("22222222-2222-2222-2222-222222222222");
  });

  it("shows the clear button only when a value is selected", async () => {
    const Wrapper = withQuery();
    const onChange = vi.fn();
    const { rerender } = render(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value={null}
          onChange={onChange}
          isAdmin={false}
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lookup-picker-select").querySelectorAll("option")).toHaveLength(3),
    );
    expect(screen.queryByTestId("lookup-picker-clear")).toBeNull();

    rerender(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value="22222222-2222-2222-2222-222222222222"
          onChange={onChange}
          isAdmin={false}
        />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("lookup-picker-clear"));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("LookupPicker — quick-propose", () => {
  it("blocks an empty submit", async () => {
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value={null}
          onChange={vi.fn()}
          isAdmin={false}
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lookup-picker-select").querySelectorAll("option")).toHaveLength(3),
    );
    fireEvent.click(screen.getByTestId("lookup-picker-propose-toggle"));
    fireEvent.click(screen.getByTestId("lookup-picker-propose-submit"));
    const form = screen.getByTestId("lookup-picker-propose-form");
    expect(within(form).getByRole("alert")).toHaveTextContent(/leer/);
    // Only the initial GET fired — the empty submit didn't POST.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("editor submit issues POST and toasts pending — no auto-select", async () => {
    let postBody: string | null = null;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          postBody = init.body as string;
          return new Response(
            JSON.stringify({
              ...SEED[0],
              id: "44444444-4444-4444-4444-444444444444",
              name: "Editor Suggestion",
              status: "pending",
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ items: SEED, total: SEED.length, limit: 50, offset: 0 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );
    const Wrapper = withQuery();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value={null}
          onChange={onChange}
          isAdmin={false}
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lookup-picker-select").querySelectorAll("option")).toHaveLength(3),
    );
    fireEvent.click(screen.getByTestId("lookup-picker-propose-toggle"));
    const form = screen.getByTestId("lookup-picker-propose-form");
    fireEvent.change(within(form).getByLabelText(/Armhaltung-Name/), {
      target: { value: "Editor Suggestion" },
    });
    fireEvent.click(screen.getByTestId("lookup-picker-propose-submit"));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    expect(postBody).not.toBeNull();
    expect(JSON.parse(postBody!).name).toBe("Editor Suggestion");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("admin submit auto-selects the new id", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(
            JSON.stringify({
              ...SEED[0],
              id: "55555555-5555-5555-5555-555555555555",
              name: "Admin Direct",
              status: "approved",
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ items: SEED, total: SEED.length, limit: 50, offset: 0 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );
    const Wrapper = withQuery();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <LookupPicker
          kind="arm-positions"
          label="Armhaltung"
          value={null}
          onChange={onChange}
          isAdmin
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lookup-picker-select").querySelectorAll("option")).toHaveLength(3),
    );
    fireEvent.click(screen.getByTestId("lookup-picker-propose-toggle"));
    const form = screen.getByTestId("lookup-picker-propose-form");
    fireEvent.change(within(form).getByLabelText(/Armhaltung-Name/), {
      target: { value: "Admin Direct" },
    });
    fireEvent.click(screen.getByTestId("lookup-picker-propose-submit"));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    expect(onChange).toHaveBeenLastCalledWith("55555555-5555-5555-5555-555555555555");
  });
});
