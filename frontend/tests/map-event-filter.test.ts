/**
 * Pure-function coverage for the event filter (M6.4, ADR-041 §I).
 */

import { describe, expect, it } from "vitest";

import {
  applyEventFilter,
  buildParticipantsIndex,
  filtersAreEmpty,
  type MappableEvent,
} from "@/lib/map";

function event(overrides: Partial<MappableEvent> = {}): MappableEvent {
  return {
    id: "evt-1",
    lat: 52.52,
    lon: 13.405,
    started_at: "2026-04-15T12:00:00Z",
    ended_at: null,
    note: null,
    reveal_participants: false,
    ...overrides,
  };
}

const emptyIndex = new Map<string, ReadonlySet<string>>();

describe("applyEventFilter — date range", () => {
  it("returns the input when no criteria are set", () => {
    const events = [event({ id: "a" }), event({ id: "b" })];
    expect(
      applyEventFilter(events, {
        from: null,
        to: null,
        participantIds: [],
        participantsByEvent: emptyIndex,
      }),
    ).toEqual(events);
  });

  it("filters by `from` (inclusive at midnight UTC)", () => {
    const events = [
      event({ id: "before", started_at: "2026-03-31T23:59:59Z" }),
      event({ id: "exact-start", started_at: "2026-04-01T00:00:00Z" }),
      event({ id: "after", started_at: "2026-04-02T08:00:00Z" }),
    ];
    const result = applyEventFilter(events, {
      from: "2026-04-01",
      to: null,
      participantIds: [],
      participantsByEvent: emptyIndex,
    });
    expect(result.map((e) => e.id)).toEqual(["exact-start", "after"]);
  });

  it("filters by `to` (inclusive at end of day UTC)", () => {
    const events = [
      event({ id: "early", started_at: "2026-04-30T08:00:00Z" }),
      event({ id: "edge", started_at: "2026-04-30T23:59:59.999Z" }),
      event({ id: "next-day", started_at: "2026-05-01T00:00:01Z" }),
    ];
    const result = applyEventFilter(events, {
      from: null,
      to: "2026-04-30",
      participantIds: [],
      participantsByEvent: emptyIndex,
    });
    expect(result.map((e) => e.id)).toEqual(["early", "edge"]);
  });

  it("supports a closed range (from + to)", () => {
    const events = [
      event({ id: "before", started_at: "2026-04-01T08:00:00Z" }),
      event({ id: "in-range-1", started_at: "2026-04-15T08:00:00Z" }),
      event({ id: "in-range-2", started_at: "2026-04-25T08:00:00Z" }),
      event({ id: "after", started_at: "2026-05-01T08:00:00Z" }),
    ];
    const result = applyEventFilter(events, {
      from: "2026-04-10",
      to: "2026-04-30",
      participantIds: [],
      participantsByEvent: emptyIndex,
    });
    expect(result.map((e) => e.id)).toEqual(["in-range-1", "in-range-2"]);
  });
});

describe("applyEventFilter — participants", () => {
  const personA = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const personB = "aaaaaaaa-bbbb-cccc-dddd-000000000002";
  const personC = "aaaaaaaa-bbbb-cccc-dddd-000000000003";

  const index = new Map<string, ReadonlySet<string>>([
    ["evt-a", new Set([personA, personB])],
    ["evt-b", new Set([personC])],
    ["evt-c", new Set([personA])],
  ]);

  it("keeps events that include any selected participant", () => {
    const events = [event({ id: "evt-a" }), event({ id: "evt-b" }), event({ id: "evt-c" })];
    const result = applyEventFilter(events, {
      from: null,
      to: null,
      participantIds: [personA],
      participantsByEvent: index,
    });
    expect(result.map((e) => e.id)).toEqual(["evt-a", "evt-c"]);
  });

  it("treats multiple participant ids as OR", () => {
    const events = [event({ id: "evt-a" }), event({ id: "evt-b" }), event({ id: "evt-c" })];
    const result = applyEventFilter(events, {
      from: null,
      to: null,
      participantIds: [personB, personC],
      participantsByEvent: index,
    });
    expect(result.map((e) => e.id)).toEqual(["evt-a", "evt-b"]);
  });

  it("drops events with no participant index entry", () => {
    const events = [event({ id: "evt-a" }), event({ id: "evt-unknown" })];
    const result = applyEventFilter(events, {
      from: null,
      to: null,
      participantIds: [personA],
      participantsByEvent: index,
    });
    expect(result.map((e) => e.id)).toEqual(["evt-a"]);
  });

  it("treats participant ids case-insensitively", () => {
    const events = [event({ id: "evt-a" })];
    const result = applyEventFilter(events, {
      from: null,
      to: null,
      participantIds: [personA.toUpperCase()],
      participantsByEvent: index,
    });
    expect(result.map((e) => e.id)).toEqual(["evt-a"]);
  });

  it("combines date range and participant filters (AND)", () => {
    const events = [
      event({ id: "evt-a", started_at: "2026-04-01T08:00:00Z" }),
      event({ id: "evt-c", started_at: "2026-05-01T08:00:00Z" }),
    ];
    const result = applyEventFilter(events, {
      from: "2026-04-15",
      to: null,
      participantIds: [personA],
      participantsByEvent: index,
    });
    expect(result.map((e) => e.id)).toEqual(["evt-c"]);
  });
});

describe("buildParticipantsIndex", () => {
  it("groups person_ids by event_id, ignoring tombstones", () => {
    const index = buildParticipantsIndex([
      { event_id: "e1", person_id: "p1", _deleted: false },
      { event_id: "e1", person_id: "p2", _deleted: false },
      { event_id: "e2", person_id: "p3", _deleted: false },
      { event_id: "e1", person_id: "p99", _deleted: true },
    ]);
    expect(index.get("e1")).toEqual(new Set(["p1", "p2"]));
    expect(index.get("e2")).toEqual(new Set(["p3"]));
    expect(index.size).toBe(2);
  });
});

describe("filtersAreEmpty", () => {
  it("recognises the empty state", () => {
    expect(filtersAreEmpty({ from: null, to: null, participantIds: [] })).toBe(true);
  });

  it("any non-null/non-empty member counts as non-empty", () => {
    expect(filtersAreEmpty({ from: "2026-04-01", to: null, participantIds: [] })).toBe(false);
    expect(filtersAreEmpty({ from: null, to: "2026-04-30", participantIds: [] })).toBe(false);
    expect(filtersAreEmpty({ from: null, to: null, participantIds: ["x"] })).toBe(false);
  });
});
