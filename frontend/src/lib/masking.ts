/**
 * Frontend-Sicherheitsgürtel for `reveal_participants` (M5c.2, ADR-038).
 *
 * The backend already masks names in `app/services/masking.py` before
 * the REST snapshot leaves the server; this helper re-applies the
 * exact same rule on the client side. It catches two failure modes:
 *
 *  1. A stale TanStack-Query cache that still holds an
 *     un-masked snapshot from before `reveal_participants` was
 *     toggled from `true` to `false`.
 *  2. Future code paths that surface `Person` objects without going
 *     through the REST detail endpoint (e.g. a `Person` RxDB
 *     collection added in a later sub-step). M5c.1b kept Person out
 *     of sync deliberately for that reason — but the helper exists so
 *     the day we add it, the masking rule still holds.
 *
 * The placeholder string mirrors the backend constant and stays in
 * sync via the unit test in `tests/masking.test.ts`.
 */

import type { PersonRead } from "./types";

export const MASK_PLACEHOLDER = "[verborgen]";

interface MaskableEvent {
  reveal_participants: boolean;
}

/**
 * Apply the per-event masking rule to a list of participants.
 *
 * - `reveal_participants === true` → return `participants` as-is.
 * - Otherwise: each participant whose `id === currentPersonId` stays
 *   unmasked; every other participant is rewritten with the
 *   placeholder name and `alias` / `note` cleared.
 *
 * The function is pure; reuse it from any view that renders participant
 * names so the same rule applies whether the data came from REST,
 * RxDB cache, or a future client-side aggregation.
 */
export function maskParticipants(
  participants: readonly PersonRead[],
  event: MaskableEvent,
  currentPersonId: string,
): PersonRead[] {
  if (event.reveal_participants) {
    return [...participants];
  }
  return participants.map((person) => {
    if (person.id === currentPersonId) return person;
    return {
      ...person,
      name: MASK_PLACEHOLDER,
      alias: null,
      note: null,
    };
  });
}

/** Indicator for the UI that an entry is a placeholder, not a real name. */
export function isMasked(person: PersonRead): boolean {
  return person.name === MASK_PLACEHOLDER;
}
