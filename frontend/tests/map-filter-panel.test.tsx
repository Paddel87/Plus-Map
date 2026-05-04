/**
 * Component coverage for `MapFilterPanel` (M6.4, ADR-041 §I).
 *
 * Persons come from the existing REST `/api/persons` endpoint via
 * TanStack Query — RxDB does not sync the Persons collection
 * (ADR-037). Tests stub `fetch` per case and wrap the panel in a
 * fresh `QueryClientProvider` so the cache stays isolated.
 */

import "fake-indexeddb/auto";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MapFilterPanel } from "@/components/map/map-filter-panel";
import type { MapFilters } from "@/lib/map";

function withQuery(): (props: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockPersonsEndpoint(persons: Array<{ id: string; name: string }>) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
    if (url.startsWith("/api/persons")) {
      return new Response(
        JSON.stringify({
          items: persons.map((p) => ({
            id: p.id,
            name: p.name,
            alias: null,
            note: null,
            origin: "managed",
            linkable: false,
            is_deleted: false,
            deleted_at: null,
            created_at: "2026-04-27T12:00:00Z",
          })),
          total: persons.length,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  });
}

const PERSON_A = "11111111-1111-1111-1111-111111111111";
const PERSON_B = "22222222-2222-2222-2222-222222222222";

const EMPTY_FILTERS: MapFilters = {
  from: null,
  to: null,
  participantIds: [],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MapFilterPanel (M6.4)", () => {
  it("does not load persons until the panel opens", () => {
    mockPersonsEndpoint([]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel
        open={false}
        onOpenChange={() => {}}
        filters={EMPTY_FILTERS}
        onChange={onChange}
      />,
      { wrapper: withQuery() },
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("emits a from-date change immediately", () => {
    mockPersonsEndpoint([]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel open onOpenChange={() => {}} filters={EMPTY_FILTERS} onChange={onChange} />,
      { wrapper: withQuery() },
    );
    fireEvent.change(screen.getByTestId("map-filter-from"), {
      target: { value: "2026-04-01" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      from: "2026-04-01",
      to: null,
      participantIds: [],
    });
  });

  it("emits a to-date change immediately", () => {
    mockPersonsEndpoint([]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel
        open
        onOpenChange={() => {}}
        filters={{ from: "2026-04-01", to: null, participantIds: [] }}
        onChange={onChange}
      />,
      { wrapper: withQuery() },
    );
    fireEvent.change(screen.getByTestId("map-filter-to"), {
      target: { value: "2026-04-30" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      from: "2026-04-01",
      to: "2026-04-30",
      participantIds: [],
    });
  });

  it("clears a date when the input is emptied", () => {
    mockPersonsEndpoint([]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel
        open
        onOpenChange={() => {}}
        filters={{ from: "2026-04-01", to: null, participantIds: [] }}
        onChange={onChange}
      />,
      { wrapper: withQuery() },
    );
    fireEvent.change(screen.getByTestId("map-filter-from"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      from: null,
      to: null,
      participantIds: [],
    });
  });

  it("toggles a participant on click", async () => {
    mockPersonsEndpoint([
      { id: PERSON_A, name: "Alice" },
      { id: PERSON_B, name: "Bob" },
    ]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel open onOpenChange={() => {}} filters={EMPTY_FILTERS} onChange={onChange} />,
      { wrapper: withQuery() },
    );
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    const aliceCheckbox = screen
      .getAllByTestId("map-filter-participant")
      .find((el) => el.dataset.personId === PERSON_A);
    expect(aliceCheckbox).toBeDefined();
    fireEvent.click(aliceCheckbox!);

    expect(onChange).toHaveBeenLastCalledWith({
      from: null,
      to: null,
      participantIds: [PERSON_A],
    });
  });

  it("untoggles a previously selected participant", async () => {
    mockPersonsEndpoint([{ id: PERSON_A, name: "Alice" }]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel
        open
        onOpenChange={() => {}}
        filters={{ from: null, to: null, participantIds: [PERSON_A] }}
        onChange={onChange}
      />,
      { wrapper: withQuery() },
    );
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    const aliceCheckbox = screen
      .getAllByTestId("map-filter-participant")
      .find((el) => el.dataset.personId === PERSON_A);
    fireEvent.click(aliceCheckbox!);

    expect(onChange).toHaveBeenLastCalledWith({
      from: null,
      to: null,
      participantIds: [],
    });
  });

  it("filters the participant list by the search query", async () => {
    mockPersonsEndpoint([
      { id: PERSON_A, name: "Alice" },
      { id: PERSON_B, name: "Bob" },
    ]);
    render(
      <MapFilterPanel open onOpenChange={() => {}} filters={EMPTY_FILTERS} onChange={() => {}} />,
      { wrapper: withQuery() },
    );
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Person suchen"), {
      target: { value: "bob" },
    });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("clears every filter on reset", () => {
    mockPersonsEndpoint([]);
    const onChange = vi.fn();
    render(
      <MapFilterPanel
        open
        onOpenChange={() => {}}
        filters={{
          from: "2026-04-01",
          to: "2026-04-30",
          participantIds: [PERSON_A],
        }}
        onChange={onChange}
      />,
      { wrapper: withQuery() },
    );
    fireEvent.click(screen.getByTestId("map-filter-reset"));
    expect(onChange).toHaveBeenLastCalledWith({
      from: null,
      to: null,
      participantIds: [],
    });
  });

  it("closes the sheet via the Fertig button", () => {
    mockPersonsEndpoint([]);
    const onOpenChange = vi.fn();
    render(
      <MapFilterPanel
        open
        onOpenChange={onOpenChange}
        filters={EMPTY_FILTERS}
        onChange={() => {}}
      />,
      { wrapper: withQuery() },
    );
    fireEvent.click(screen.getByTestId("map-filter-close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
