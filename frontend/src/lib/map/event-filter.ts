/**
 * Pure event-filter logic for the map page (M6.4, ADR-041 §I).
 *
 * `applyEventFilter` runs over the in-memory MappableEvent[] and
 * returns the subset that matches the URL-driven criteria. Lives
 * outside the React tree so unit tests can pin its semantics
 * deterministically.
 */

import type { MappableEvent } from "./event-marker-data";

export interface EventFilterCriteria {
  /** ISO date (YYYY-MM-DD) — events with started_at on or after this day pass. */
  from: string | null;
  /** ISO date (YYYY-MM-DD) — events with started_at on or before this day pass. */
  to: string | null;
  /** Person IDs — event passes when at least one selected person participates. */
  participantIds: readonly string[];
  /** event_id → set of participating person_ids (from RxDB event_participants). */
  participantsByEvent: ReadonlyMap<string, ReadonlySet<string>>;
}

export function applyEventFilter(
  events: readonly MappableEvent[],
  criteria: EventFilterCriteria,
): MappableEvent[] {
  const fromTs = criteria.from ? Date.parse(`${criteria.from}T00:00:00Z`) : null;
  // `to` is inclusive on the day → match anything strictly before the next day.
  const toTs = criteria.to ? Date.parse(`${criteria.to}T23:59:59.999Z`) : null;
  const participantSet =
    criteria.participantIds.length > 0
      ? new Set(criteria.participantIds.map((id) => id.toLowerCase()))
      : null;

  const result: MappableEvent[] = [];
  for (const event of events) {
    if (fromTs !== null || toTs !== null) {
      const startedTs = Date.parse(event.started_at);
      if (!Number.isFinite(startedTs)) continue;
      if (fromTs !== null && startedTs < fromTs) continue;
      if (toTs !== null && startedTs > toTs) continue;
    }
    if (participantSet) {
      const eventParticipants = criteria.participantsByEvent.get(event.id);
      if (!eventParticipants) continue;
      if (!hasIntersection(participantSet, eventParticipants)) continue;
    }
    result.push(event);
  }
  return result;
}

function hasIntersection(needle: ReadonlySet<string>, haystack: ReadonlySet<string>): boolean {
  for (const id of needle) {
    if (haystack.has(id.toLowerCase()) || haystack.has(id)) return true;
  }
  return false;
}

/**
 * Build the `participantsByEvent` index from raw event_participants
 * RxDB documents. Soft-deleted rows are dropped.
 */
export function buildParticipantsIndex(
  rows: readonly { event_id: string; person_id: string; _deleted: boolean }[],
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row._deleted) continue;
    let bucket = index.get(row.event_id);
    if (!bucket) {
      bucket = new Set<string>();
      index.set(row.event_id, bucket);
    }
    bucket.add(row.person_id);
  }
  return index;
}

export function filtersAreEmpty(
  filters: Pick<EventFilterCriteria, "from" | "to" | "participantIds">,
): boolean {
  return filters.from === null && filters.to === null && filters.participantIds.length === 0;
}
