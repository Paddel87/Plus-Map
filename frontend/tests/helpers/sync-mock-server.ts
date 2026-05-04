/**
 * In-process mock for the FastAPI sync endpoints (ADR-035 §E).
 *
 * Reimplements just enough of the protocol so the frontend
 * `replication.ts` can drive a full pull/push roundtrip in jsdom:
 *
 * - `GET  /api/sync/{events,applications}/pull`
 * - `POST /api/sync/{events,applications}/push`
 *
 * Conflict resolution is intentionally simplified to "idempotent
 * insert + last-write-wins on update" — the full per-field matrix from
 * ADR-029 is the backend's job and is covered by the pytest suite.
 *
 * The mock is intentionally synchronous (no setTimeout / queue): tests
 * resolve via `replication.events.awaitInSync()`, not by sleeping.
 */

import type {
  ApplicationDocType,
  EventDocType,
  EventParticipantDocType,
  SyncCheckpoint,
} from "@/lib/rxdb/types";

interface PullRequest {
  updated_at?: string;
  id?: string;
  limit?: number;
}

interface PullResponse<T> {
  documents: T[];
  checkpoint: SyncCheckpoint | null;
}

interface PushRow<T> {
  assumedMasterState?: T | null;
  newDocumentState: T;
}

type DocCommon = { id: string; updated_at: string; _deleted?: boolean };

export interface MockServerState {
  events: Map<string, EventDocType>;
  applications: Map<string, ApplicationDocType>;
  /** Auto-participant rows surfaced by the pull-only event-participants endpoint (M5c.1b). */
  eventParticipants: Map<string, EventParticipantDocType>;
  /** Number of `_ensure_participant` invocations — proxies the auto-participant trigger. */
  participantInserts: number;
  /** Total push rows the mock has accepted (for idempotency assertions). */
  acceptedPushes: number;
}

export function createMockServerState(): MockServerState {
  return {
    events: new Map(),
    applications: new Map(),
    eventParticipants: new Map(),
    participantInserts: 0,
    acceptedPushes: 0,
  };
}

/** Strict (updated_at, id) cursor compare matching ADR-030. */
function cursorGt<T extends DocCommon>(a: T, ck: SyncCheckpoint): boolean {
  if (a.updated_at > ck.updated_at) return true;
  if (a.updated_at < ck.updated_at) return false;
  return a.id > ck.id;
}

function cursorAsc<T extends DocCommon>(a: T, b: T): number {
  if (a.updated_at !== b.updated_at) {
    return a.updated_at < b.updated_at ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function pull<T extends DocCommon>(store: Map<string, T>, req: PullRequest): PullResponse<T> {
  const limit = req.limit ?? 100;
  const all = Array.from(store.values()).sort(cursorAsc);
  const filtered =
    req.updated_at && req.id
      ? all.filter((doc) => cursorGt(doc, { updated_at: req.updated_at!, id: req.id! }))
      : all;
  const documents = filtered.slice(0, limit);
  const tail = documents[documents.length - 1];
  const checkpoint: SyncCheckpoint | null = tail
    ? { updated_at: tail.updated_at, id: tail.id }
    : null;
  return { documents, checkpoint };
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface MockFetchOptions {
  /** Sentinel for the offline test path; the fetch wrapper checks it. */
  isOnline: () => boolean;
  /** Required CSRF token; mock returns 403 if header is missing/mismatched. */
  csrfToken: string;
  /** Mutable backend state. */
  state: MockServerState;
}

const SYNC_PATH = /^\/api\/sync\/(events|applications|event-participants)\/(pull|push)(?:\?(.*))?$/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Build a fetch implementation tied to the given mock state. */
export function makeMockFetch(options: MockFetchOptions): typeof fetch {
  const { isOnline, csrfToken, state } = options;

  return async (input, init) => {
    if (!isOnline()) {
      // Mirrors browser behaviour when the radio is off: a TypeError
      // surfaces as a NetworkError to the caller (RxDB retries).
      throw new TypeError("Network request failed (mock offline)");
    }

    const url = typeof input === "string" ? input : (input as Request).url;
    const match = SYNC_PATH.exec(url.replace(/^https?:\/\/[^/]+/, ""));
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }
    const [, collection, action, query] = match;
    const params = new URLSearchParams(query ?? "");

    if (action === "pull") {
      const req: PullRequest = {
        updated_at: params.get("updated_at") ?? undefined,
        id: params.get("id") ?? undefined,
        limit: params.get("limit") ? Number(params.get("limit")) : undefined,
      };
      if (collection === "events") return jsonResponse(pull(state.events, req));
      if (collection === "applications") return jsonResponse(pull(state.applications, req));
      // event-participants is pull-only (M5c.1b, ADR-037 §D).
      return jsonResponse(pull(state.eventParticipants, req));
    }

    // event-participants has no push handler in M5c.1b; the real backend
    // returns 405. The mock mirrors that.
    if (collection === "event-participants") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // push branch — CSRF guard mirrors the real middleware.
    const headerCsrf = (init?.headers as Record<string, string> | undefined)?.["X-CSRF-Token"];
    if (!headerCsrf || headerCsrf !== csrfToken) {
      return jsonResponse({ detail: "csrf_token_invalid" }, 403);
    }

    const body = init?.body ? JSON.parse(String(init.body)) : [];
    if (!Array.isArray(body)) return jsonResponse([], 200);

    if (collection === "events") {
      const conflicts = applyEventPushes(state, body as PushRow<EventDocType>[]);
      return jsonResponse(conflicts);
    }
    const conflicts = applyApplicationPushes(state, body as PushRow<ApplicationDocType>[]);
    return jsonResponse(conflicts);
  };
}

function applyEventPushes(state: MockServerState, rows: PushRow<EventDocType>[]): EventDocType[] {
  const conflicts: EventDocType[] = [];
  for (const row of rows) {
    state.acceptedPushes += 1;
    const next = row.newDocumentState;
    const existing = state.events.get(next.id);
    if (existing && !row.assumedMasterState) {
      conflicts.push(existing);
      continue;
    }
    if (!existing && row.assumedMasterState) {
      conflicts.push({ ...row.assumedMasterState, _deleted: true, deleted_at: nowIso() });
      continue;
    }
    if (!existing) {
      // Server rewrites updated_at and ensures the auto-participant edge.
      const stored: EventDocType = { ...next, updated_at: bumpClock(next.updated_at) };
      state.events.set(stored.id, stored);
      state.participantInserts += 1;
      // The real backend's `start_event` adds the creator as a
      // participant (ADR-012). Tests that don't seed a creator just
      // skip this branch by leaving `created_by` null.
      if (next.created_by) {
        addParticipantRow(state, next.id, next.created_by);
      }
      continue;
    }
    // Idempotent re-push of identical state → no-op.
    if (sameEvent(existing, next)) continue;
    // Last-write-wins update path; bump updated_at server-side.
    const merged: EventDocType = { ...existing, ...next, updated_at: bumpClock(next.updated_at) };
    state.events.set(merged.id, merged);
  }
  return conflicts;
}

function applyApplicationPushes(
  state: MockServerState,
  rows: PushRow<ApplicationDocType>[],
): ApplicationDocType[] {
  const conflicts: ApplicationDocType[] = [];
  for (const row of rows) {
    state.acceptedPushes += 1;
    const next = row.newDocumentState;
    const existing = state.applications.get(next.id);
    if (existing && !row.assumedMasterState) {
      conflicts.push(existing);
      continue;
    }
    if (!existing && row.assumedMasterState) {
      conflicts.push({ ...row.assumedMasterState, _deleted: true, deleted_at: nowIso() });
      continue;
    }
    if (!existing) {
      // Mirror the backend: server-authoritative sequence_no = max+1.
      const seq = nextSequenceFor(state, next.event_id);
      const stored: ApplicationDocType = {
        ...next,
        sequence_no: seq,
        updated_at: bumpClock(next.updated_at),
      };
      state.applications.set(stored.id, stored);
      state.participantInserts += 1; // auto-participant for performer
      addParticipantRow(state, next.event_id, next.performer_id);
      if (next.recipient_id !== next.performer_id) {
        state.participantInserts += 1;
        addParticipantRow(state, next.event_id, next.recipient_id);
      }
      continue;
    }
    if (sameApplication(existing, next)) continue;
    const merged: ApplicationDocType = {
      ...existing,
      ...next,
      sequence_no: existing.sequence_no, // immutable-after-create per ADR-029
      updated_at: bumpClock(next.updated_at),
    };
    state.applications.set(merged.id, merged);
  }
  return conflicts;
}

function addParticipantRow(state: MockServerState, eventId: string, personId: string): void {
  // Idempotent: server holds a UNIQUE(event_id, person_id) constraint
  // (ADR-037 §A); the auto-participant helper is a no-op if the row
  // already exists. Mirror that here so test scenarios can replay
  // pushes without double-inserting participants.
  for (const ep of state.eventParticipants.values()) {
    if (ep.event_id === eventId && ep.person_id === personId && !ep._deleted) {
      return;
    }
  }
  const now = bumpClock(new Date().toISOString());
  const id = randomUuid();
  state.eventParticipants.set(id, {
    id,
    event_id: eventId,
    person_id: personId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    _deleted: false,
  });
}

function randomUuid(): string {
  // jsdom's crypto.randomUUID is stable enough for tests; falls back
  // to a manual v4-like string when not available.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = (n: number) =>
    Math.floor(Math.random() * 16 ** n)
      .toString(16)
      .padStart(n, "0");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

function nextSequenceFor(state: MockServerState, eventId: string): number {
  let max = 0;
  for (const app of state.applications.values()) {
    if (app.event_id === eventId && app.sequence_no > max) max = app.sequence_no;
  }
  return max + 1;
}

function sameEvent(a: EventDocType, b: EventDocType): boolean {
  return (
    a.id === b.id &&
    a.started_at === b.started_at &&
    a.ended_at === b.ended_at &&
    a.lat === b.lat &&
    a.lon === b.lon &&
    a.note === b.note &&
    a._deleted === b._deleted
  );
}

function sameApplication(a: ApplicationDocType, b: ApplicationDocType): boolean {
  return (
    a.id === b.id &&
    a.event_id === b.event_id &&
    a.performer_id === b.performer_id &&
    a.recipient_id === b.recipient_id &&
    a.started_at === b.started_at &&
    a.ended_at === b.ended_at &&
    a.note === b.note &&
    a._deleted === b._deleted
  );
}

let clockCounter = 0;
/** Strictly monotonic ISO timestamp so cursor comparisons stay deterministic. */
function bumpClock(suggested: string): string {
  clockCounter += 1;
  const base = new Date(suggested).getTime();
  return new Date(base + clockCounter).toISOString();
}
