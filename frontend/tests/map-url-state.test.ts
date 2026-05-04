/**
 * Round-trip and validation coverage for the map URL-state codec
 * (M6.4, ADR-041 §H).
 */

import { describe, expect, it } from "vitest";

import { filtersEqual, parseMapUrlState, serializeMapUrlState, type MapFilters } from "@/lib/map";

function params(input: string): URLSearchParams {
  return new URLSearchParams(input);
}

const EMPTY_FILTERS: MapFilters = {
  from: null,
  to: null,
  participantIds: [],
};

describe("parseMapUrlState", () => {
  it("returns empty state for an empty URL", () => {
    expect(parseMapUrlState(params(""))).toEqual({
      viewport: null,
      filters: EMPTY_FILTERS,
    });
  });

  it("parses a valid viewport", () => {
    expect(parseMapUrlState(params("lat=52.52&lon=13.405&zoom=11.5"))).toEqual({
      viewport: { lat: 52.52, lon: 13.405, zoom: 11.5 },
      filters: EMPTY_FILTERS,
    });
  });

  it("drops the viewport when one component is missing", () => {
    expect(parseMapUrlState(params("lat=52.5&lon=13.4")).viewport).toBeNull();
    expect(parseMapUrlState(params("lat=52.5&zoom=11")).viewport).toBeNull();
  });

  it("drops the viewport on out-of-range values", () => {
    expect(parseMapUrlState(params("lat=200&lon=13&zoom=11")).viewport).toBeNull();
    expect(parseMapUrlState(params("lat=52&lon=200&zoom=11")).viewport).toBeNull();
    expect(parseMapUrlState(params("lat=52&lon=13&zoom=99")).viewport).toBeNull();
  });

  it("parses ISO from/to dates", () => {
    expect(parseMapUrlState(params("from=2026-04-01&to=2026-04-30")).filters).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
      participantIds: [],
    });
  });

  it("rejects malformed date strings", () => {
    const f = parseMapUrlState(params("from=2026/04/01&to=April")).filters;
    expect(f.from).toBeNull();
    expect(f.to).toBeNull();
  });

  it("parses comma-separated UUID participant ids", () => {
    const ids = parseMapUrlState(
      params("p=11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222"),
    ).filters.participantIds;
    expect(ids).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("drops invalid UUIDs and de-duplicates", () => {
    const ids = parseMapUrlState(
      params(
        "p=11111111-1111-1111-1111-111111111111,not-a-uuid,11111111-1111-1111-1111-111111111111",
      ),
    ).filters.participantIds;
    expect(ids).toEqual(["11111111-1111-1111-1111-111111111111"]);
  });

  it("lowercases participant UUIDs for canonical comparison", () => {
    const ids = parseMapUrlState(params("p=AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")).filters
      .participantIds;
    expect(ids).toEqual(["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"]);
  });
});

describe("serializeMapUrlState", () => {
  it("serializes empty state to an empty string", () => {
    expect(serializeMapUrlState({ viewport: null, filters: EMPTY_FILTERS })).toBe("");
  });

  it("serializes a viewport with trimmed precision", () => {
    expect(
      serializeMapUrlState({
        viewport: { lat: 52.5, lon: 13.4, zoom: 11 },
        filters: EMPTY_FILTERS,
      }),
    ).toBe("lat=52.5&lon=13.4&zoom=11");
  });

  it("serializes filters", () => {
    expect(
      serializeMapUrlState({
        viewport: null,
        filters: {
          from: "2026-04-01",
          to: "2026-04-30",
          participantIds: ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"],
        },
      }),
    ).toBe("from=2026-04-01&to=2026-04-30&p=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("round-trips viewport + filters faithfully", () => {
    const original = {
      viewport: { lat: 52.52, lon: 13.405, zoom: 11.5 },
      filters: {
        from: "2026-04-01",
        to: "2026-04-30",
        participantIds: ["11111111-1111-1111-1111-111111111111"],
      },
    };
    const serialized = serializeMapUrlState(original);
    expect(parseMapUrlState(params(serialized))).toEqual(original);
  });
});

describe("filtersEqual", () => {
  it("returns true for identical content", () => {
    expect(
      filtersEqual(
        { from: "2026-04-01", to: null, participantIds: ["a", "b"] },
        { from: "2026-04-01", to: null, participantIds: ["a", "b"] },
      ),
    ).toBe(true);
  });

  it("detects from/to differences", () => {
    expect(
      filtersEqual(
        { from: "2026-04-01", to: null, participantIds: [] },
        { from: "2026-04-02", to: null, participantIds: [] },
      ),
    ).toBe(false);
  });

  it("detects participant differences (length and content)", () => {
    expect(
      filtersEqual(
        { from: null, to: null, participantIds: ["a"] },
        { from: null, to: null, participantIds: ["a", "b"] },
      ),
    ).toBe(false);
    expect(
      filtersEqual(
        { from: null, to: null, participantIds: ["a", "b"] },
        { from: null, to: null, participantIds: ["a", "c"] },
      ),
    ).toBe(false);
  });
});
