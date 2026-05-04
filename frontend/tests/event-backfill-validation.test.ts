/**
 * Unit coverage for the M5c.3 backfill validation helper (ADR-039 §K).
 */

import { describe, expect, it } from "vitest";

import {
  errorsForApplication,
  errorsForEvent,
  validateBackfill,
  type BackfillApplicationInput,
  type BackfillEventInput,
} from "@/lib/event-backfill-validation";

const T = (offsetMin: number) =>
  new Date(Date.UTC(2026, 3, 27, 12, 0, 0, 0) + offsetMin * 60_000).toISOString();

function app(
  uiId: string,
  startedAt: string | null,
  endedAt: string | null,
  recipientId: string | null = "11111111-2222-3333-4444-555555555555",
): BackfillApplicationInput {
  return { uiId, startedAt, endedAt, recipientId, note: null };
}

function event(overrides: Partial<BackfillEventInput> = {}): BackfillEventInput {
  return {
    startedAt: T(0),
    endedAt: T(60),
    lat: 52.5,
    lon: 13.4,
    applications: [],
    ...overrides,
  };
}

describe("validateBackfill — event-level", () => {
  it("accepts the minimal valid input (location + started_at, no apps)", () => {
    const result = validateBackfill(event({ endedAt: null, applications: [] }));
    expect(result.valid).toBe(true);
  });

  it("rejects missing location", () => {
    const result = validateBackfill(event({ lat: null, lon: null }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(errorsForEvent(result.errors).map((e) => e.field)).toContain("location");
  });

  it("rejects missing event started_at", () => {
    const result = validateBackfill(event({ startedAt: null }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(errorsForEvent(result.errors).map((e) => e.field)).toContain("started_at");
  });

  it("rejects ended_at before started_at", () => {
    const result = validateBackfill(event({ startedAt: T(60), endedAt: T(30) }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(errorsForEvent(result.errors).map((e) => e.field)).toContain("duration");
  });
});

describe("validateBackfill — per-application", () => {
  it("rejects missing application started_at and recipient", () => {
    const result = validateBackfill(event({ applications: [app("a", null, null, null)] }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    const fields = errorsForApplication(result.errors, "a").map((e) => e.field);
    expect(fields).toContain("started_at");
    expect(fields).toContain("recipient");
  });

  it("rejects application ended_at before started_at", () => {
    const result = validateBackfill(event({ applications: [app("a", T(20), T(10))] }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    const fields = errorsForApplication(result.errors, "a").map((e) => e.field);
    expect(fields).toContain("duration");
  });

  it("rejects application starting before the event", () => {
    const result = validateBackfill(event({ applications: [app("a", T(-10), T(5))] }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(errorsForApplication(result.errors, "a").map((e) => e.field)).toContain("bounds");
  });

  it("rejects application ending after the event", () => {
    const result = validateBackfill(event({ applications: [app("a", T(10), T(70))] }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(errorsForApplication(result.errors, "a").map((e) => e.field)).toContain("bounds");
  });

  it("rejects two overlapping applications", () => {
    const result = validateBackfill(
      event({
        applications: [
          app("a", T(0), T(20)),
          app("b", T(15), T(30)), // overlaps with a
        ],
      }),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(errorsForApplication(result.errors, "b").map((e) => e.field)).toContain("overlap");
  });
});

describe("validateBackfill — happy path with multiple applications", () => {
  it("returns the apps sorted by started_at and no errors", () => {
    const result = validateBackfill(
      event({
        applications: [app("c", T(40), T(55)), app("a", T(0), T(20)), app("b", T(20), T(40))],
      }),
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.sortedApplications.map((a) => a.uiId)).toEqual(["a", "b", "c"]);
  });

  it("treats touching ends (a.ended_at === b.started_at) as non-overlap", () => {
    const result = validateBackfill(
      event({
        applications: [app("a", T(0), T(20)), app("b", T(20), T(40))],
      }),
    );
    expect(result.valid).toBe(true);
  });
});
