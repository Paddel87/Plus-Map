/**
 * Component coverage for the M7.5 EquipmentPicker (ADR-046 §G).
 *
 * Covers the three behaviours called out in ADR-043 §H:
 *   1. typeahead filter (display_name + brand + model + category match)
 *   2. multi-select toggle (chip + listbox stay in sync)
 *   3. quick-propose submit (Editor pending vs Admin auto-approve)
 *
 * Pending entries leaked through the cache (RLS lets the proposing
 * editor see their own pending) must NOT be selectable — the picker
 * filters status='approved' client-side so an editor doesn't generate
 * a sync push that the backend would 409 on (ADR-046 §C, §G).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EquipmentPicker } from "@/components/catalog/equipment-picker";
import type { EquipmentItemEntry } from "@/lib/catalog/types";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

function makeRestraint(
  overrides: Partial<EquipmentItemEntry> & Pick<EquipmentItemEntry, "id" | "display_name">,
): EquipmentItemEntry {
  return {
    id: overrides.id,
    display_name: overrides.display_name,
    category: overrides.category ?? "tools",
    brand: overrides.brand ?? null,
    model: overrides.model ?? null,
    note: overrides.note ?? null,
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

const SEED: EquipmentItemEntry[] = [
  makeRestraint({
    id: "11111111-1111-1111-1111-111111111111",
    display_name: "ASP Chain",
    category: "navigation",
    brand: "ASP",
  }),
  makeRestraint({
    id: "22222222-2222-2222-2222-222222222222",
    display_name: "Clejuso Model 13",
    category: "navigation",
    brand: "Clejuso",
    model: "Model 13",
  }),
  makeRestraint({
    id: "33333333-3333-3333-3333-333333333333",
    display_name: "Hanfseil",
    category: "tools",
  }),
  makeRestraint({
    id: "44444444-4444-4444-4444-444444444444",
    display_name: "Pending Proposal",
    category: "tools",
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

function mockListResponse(items: EquipmentItemEntry[]): void {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    return new Response(JSON.stringify({ items, total: items.length, limit: 50, offset: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

beforeEach(() => {
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "http://localhost/", origin: "http://localhost" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EquipmentPicker — typeahead", () => {
  it("filters by display_name substring", async () => {
    mockListResponse(SEED);
    const Wrapper = withQuery();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <EquipmentPicker value={[]} onChange={onChange} isAdmin={false} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    // All three approved entries visible by default.
    expect(screen.getAllByTestId("equipment-picker-option")).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Ausrüstung suchen"), {
      target: { value: "Clejuso" },
    });
    expect(screen.getAllByTestId("equipment-picker-option")).toHaveLength(1);
    expect(screen.getByText("Clejuso Model 13")).toBeInTheDocument();
  });

  it("matches across brand, model, and category labels", async () => {
    mockListResponse(SEED);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <EquipmentPicker value={[]} onChange={vi.fn()} isAdmin={false} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    // "Navigation" is the German label for the `navigation` category.
    fireEvent.change(screen.getByLabelText("Ausrüstung suchen"), {
      target: { value: "Navigation" },
    });
    expect(screen.getAllByTestId("equipment-picker-option")).toHaveLength(2);
  });

  it("hides pending entries even when the API returns them", async () => {
    // RLS lets a proposing editor see their own pending; the picker
    // must not surface those — backend would 409 on the sync push.
    mockListResponse(SEED);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <EquipmentPicker value={[]} onChange={vi.fn()} isAdmin={false} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("Pending Proposal")).toBeNull();
    expect(screen.getAllByTestId("equipment-picker-option")).toHaveLength(3);
  });
});

describe("EquipmentPicker — multi-select", () => {
  it("calls onChange with the toggled set", async () => {
    mockListResponse(SEED);
    const Wrapper = withQuery();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <EquipmentPicker value={[]} onChange={onChange} isAdmin={false} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByText("ASP Chain"));
    expect(onChange).toHaveBeenLastCalledWith(["11111111-1111-1111-1111-111111111111"]);
  });

  it("renders a removable chip per selected id and lists option as selected", async () => {
    mockListResponse(SEED);
    const Wrapper = withQuery();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <EquipmentPicker
          value={["11111111-1111-1111-1111-111111111111"]}
          onChange={onChange}
          isAdmin={false}
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    const selectedList = screen.getByTestId("equipment-picker-selected");
    expect(within(selectedList).getByText("ASP Chain")).toBeInTheDocument();

    const selectedOptions = screen
      .getAllByTestId("equipment-picker-option")
      .filter((el) => el.dataset.selected === "true");
    expect(selectedOptions).toHaveLength(1);

    fireEvent.click(within(selectedList).getByLabelText('„ASP Chain" entfernen'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe("EquipmentPicker — quick-propose", () => {
  it("blocks submit when display_name is empty", async () => {
    mockListResponse(SEED);
    const Wrapper = withQuery();
    render(
      <Wrapper>
        <EquipmentPicker value={[]} onChange={vi.fn()} isAdmin={false} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByTestId("equipment-picker-propose-toggle"));
    fireEvent.click(screen.getByTestId("equipment-picker-propose-submit"));
    // Inline error appears, no POST issued.
    const form = screen.getByTestId("equipment-picker-propose-form");
    expect(within(form).getByRole("alert")).toHaveTextContent(/leer/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // only the initial list GET
  });

  it("submits a pending proposal as editor and toasts", async () => {
    let postBody: string | null = null;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          postBody = init.body as string;
          return new Response(
            JSON.stringify({
              ...SEED[0],
              id: "55555555-5555-5555-5555-555555555555",
              display_name: "New Editor Suggestion",
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
        <EquipmentPicker value={[]} onChange={onChange} isAdmin={false} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByTestId("equipment-picker-propose-toggle"));
    const form = screen.getByTestId("equipment-picker-propose-form");
    fireEvent.change(within(form).getByLabelText(/Display-Name/), {
      target: { value: "New Editor Suggestion" },
    });
    fireEvent.click(screen.getByTestId("equipment-picker-propose-submit"));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    expect(postBody).not.toBeNull();
    const parsed = JSON.parse(postBody!);
    expect(parsed.display_name).toBe("New Editor Suggestion");
    // Editor proposal must NOT auto-select — it stays pending and isn't
    // approved yet.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("auto-selects the new entry when Admin submits (auto-approve)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(
            JSON.stringify({
              ...SEED[0],
              id: "66666666-6666-6666-6666-666666666666",
              display_name: "Admin Direct",
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
        <EquipmentPicker
          value={["11111111-1111-1111-1111-111111111111"]}
          onChange={onChange}
          isAdmin
        />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("equipment-picker-option").length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByTestId("equipment-picker-propose-toggle"));
    const form = screen.getByTestId("equipment-picker-propose-form");
    fireEvent.change(within(form).getByLabelText(/Display-Name/), {
      target: { value: "Admin Direct" },
    });
    fireEvent.click(screen.getByTestId("equipment-picker-propose-submit"));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    // Existing selection preserved + new id appended.
    expect(onChange).toHaveBeenCalledWith([
      "11111111-1111-1111-1111-111111111111",
      "66666666-6666-6666-6666-666666666666",
    ]);
  });
});
