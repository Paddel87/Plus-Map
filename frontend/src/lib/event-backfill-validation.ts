/**
 * Pure validation for the M5c.3 backfill form (ADR-039 §E + §K).
 *
 * Backfill events bring their own ``started_at`` / ``ended_at`` and
 * an ordered list of applications, each with their own timestamps.
 * The rules below mirror the Live-Modus invariants from ADR-011
 * and the per-field strategy from ADR-029, but apply *before* a
 * single document touches RxDB so the user sees consistency
 * problems up-front.
 *
 * Pure function on purpose: M5c.4's edit UI will reuse the same
 * validation against an already-saved event, so coupling to
 * RxDB / TanStack-Query / toasts is deliberately avoided here.
 */

export interface BackfillApplicationInput {
  /** Stable client-generated identifier — used to anchor errors to UI rows. */
  uiId: string;
  startedAt: string | null;
  endedAt: string | null;
  recipientId: string | null;
  note: string | null;
}

export interface BackfillEventInput {
  startedAt: string | null;
  endedAt: string | null;
  lat: number | null;
  lon: number | null;
  applications: BackfillApplicationInput[];
}

export type BackfillError =
  | { kind: "event"; field: "location" | "started_at" | "ended_at" | "duration"; message: string }
  | {
      kind: "application";
      uiId: string;
      field: "started_at" | "ended_at" | "recipient" | "duration" | "bounds" | "overlap";
      message: string;
    };

export type BackfillValidationResult =
  | { valid: true; sortedApplications: BackfillApplicationInput[] }
  | { valid: false; errors: BackfillError[] };

function parseTime(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Run all backfill checks and return either a sanitised, chronologically
 * sorted list of applications, or the full set of issues.
 *
 * The sort step is part of validation (rather than the caller's job)
 * because the overlap check depends on a stable order — sorting once
 * here keeps both consistent.
 */
export function validateBackfill(input: BackfillEventInput): BackfillValidationResult {
  const errors: BackfillError[] = [];

  // --- Event-level required fields ---------------------------------------
  if (input.lat === null || input.lon === null) {
    errors.push({
      kind: "event",
      field: "location",
      message: "Standort ist Pflicht. Tippe auf die Karte oder GPS antippen.",
    });
  }
  const eventStart = parseTime(input.startedAt);
  if (eventStart === null) {
    errors.push({
      kind: "event",
      field: "started_at",
      message: "Start-Zeitstempel des Events ist Pflicht.",
    });
  }
  const eventEnd = parseTime(input.endedAt);
  // Event-level consistency.
  if (eventStart !== null && eventEnd !== null && eventEnd < eventStart) {
    errors.push({
      kind: "event",
      field: "duration",
      message: "Event-Ende liegt vor dem Event-Start.",
    });
  }

  // --- Per-application checks --------------------------------------------
  for (const app of input.applications) {
    const appStart = parseTime(app.startedAt);
    const appEnd = parseTime(app.endedAt);

    if (appStart === null) {
      errors.push({
        kind: "application",
        uiId: app.uiId,
        field: "started_at",
        message: "Application-Start ist Pflicht.",
      });
    }
    if (!app.recipientId) {
      errors.push({
        kind: "application",
        uiId: app.uiId,
        field: "recipient",
        message: "Recipient ist Pflicht.",
      });
    }
    if (appStart !== null && appEnd !== null && appEnd < appStart) {
      errors.push({
        kind: "application",
        uiId: app.uiId,
        field: "duration",
        message: "Application-Ende liegt vor dem Start.",
      });
    }
    if (appStart !== null && eventStart !== null && appStart < eventStart) {
      errors.push({
        kind: "application",
        uiId: app.uiId,
        field: "bounds",
        message: "Application beginnt vor dem Event-Start.",
      });
    }
    if (appEnd !== null && eventEnd !== null && appEnd > eventEnd) {
      errors.push({
        kind: "application",
        uiId: app.uiId,
        field: "bounds",
        message: "Application endet nach dem Event-Ende.",
      });
    }
  }

  // --- Overlap check (only meaningful once each app has a started_at) ----
  const sortable = input.applications
    .filter((a) => parseTime(a.startedAt) !== null)
    .sort((a, b) => parseTime(a.startedAt)! - parseTime(b.startedAt)!);
  for (let i = 1; i < sortable.length; i += 1) {
    const previous = sortable[i - 1]!;
    const current = sortable[i]!;
    const previousEnd = parseTime(previous.endedAt);
    const currentStart = parseTime(current.startedAt)!;
    if (previousEnd !== null && currentStart < previousEnd) {
      errors.push({
        kind: "application",
        uiId: current.uiId,
        field: "overlap",
        message: "Diese Application überlappt mit der vorigen.",
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Re-sort the full list so the caller can iterate in chronological
  // order when inserting (sequence_no follows that order, ADR-039 §F).
  const sortedApplications = [...input.applications].sort((a, b) => {
    const aStart = parseTime(a.startedAt) ?? 0;
    const bStart = parseTime(b.startedAt) ?? 0;
    return aStart - bStart;
  });
  return { valid: true, sortedApplications };
}

/** Convenience: pick the error messages for a particular application uiId. */
export function errorsForApplication(errors: BackfillError[], uiId: string): BackfillError[] {
  return errors.filter((e) => e.kind === "application" && e.uiId === uiId);
}

/** Convenience: pick the event-level error messages. */
export function errorsForEvent(errors: BackfillError[]): BackfillError[] {
  return errors.filter((e) => e.kind === "event");
}
