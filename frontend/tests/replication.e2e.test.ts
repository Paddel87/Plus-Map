/**
 * End-to-end coverage for the M5b offline → reconnect → exact-once
 * promise (ADR-035). We boot the real RxDB stack from
 * `lib/rxdb/{database,replication}` against a `fake-indexeddb`-backed
 * IndexedDB, route the replication's HTTP calls through an in-process
 * mock of the FastAPI sync endpoints, and watch for the public
 * `awaitInSync()` signal instead of relying on timers.
 *
 * Three scenarios cover the M5b.4 acceptance criterion:
 *
 *   1. offline insert × 3 → reconnect → mock backend has exactly three
 *      applications, one event, one participant per actor (no dupes).
 *   2. re-trigger replication → no extra pushes, mock counters are
 *      stable (idempotency guard).
 *   3. server-bumped fields (`sequence_no`, `updated_at`) round-trip
 *      back into RxDB on the next pull and overwrite the optimistic
 *      client values.
 */

// fake-indexeddb has to win the import race against any module that
// touches IndexedDB at evaluation time, hence the side-effect import
// at the very top of the file.
import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetDatabaseForTests, getDatabase } from "@/lib/rxdb/database";
import { startReplication, type ReplicationHandles } from "@/lib/rxdb/replication";
import type { ApplicationDocType, EventDocType } from "@/lib/rxdb/types";

import {
  createMockServerState,
  makeMockFetch,
  type MockServerState,
} from "./helpers/sync-mock-server";

const CSRF = "test-csrf-token";

// Stable IDs make pull-cursor sorting deterministic across runs.
const EVENT_ID = "00000000-0000-4000-8000-000000000001";
const PERFORMER_ID = "00000000-0000-4000-8000-000000000010";
const RECIPIENT_ID = "00000000-0000-4000-8000-000000000020";
const APP_IDS = [
  "00000000-0000-4000-8000-0000000000a1",
  "00000000-0000-4000-8000-0000000000a2",
  "00000000-0000-4000-8000-0000000000a3",
];

let online = true;
let state: MockServerState;
let originalFetch: typeof fetch;
let handles: ReplicationHandles | null = null;

function setOnline(next: boolean): void {
  online = next;
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => next,
  });
  window.dispatchEvent(new Event(next ? "online" : "offline"));
}

beforeEach(() => {
  state = createMockServerState();
  originalFetch = globalThis.fetch;
  online = true;
  vi.stubGlobal(
    "fetch",
    makeMockFetch({
      isOnline: () => online,
      csrfToken: CSRF,
      state,
    }),
  );
  // jsdom provides `document.cookie`; the replication's `readCsrfCookie`
  // matches against the standard `hcmap_csrf=...` shape.
  document.cookie = `hcmap_csrf=${encodeURIComponent(CSRF)}`;
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
});

afterEach(async () => {
  if (handles) {
    await handles.stop();
    handles = null;
  }
  // Drop the RxDB so the next test gets a fresh database; both the
  // module-level singleton and the underlying IndexedDB content are
  // cleared.
  try {
    const db = await getDatabase();
    await db.remove();
  } catch {
    // first test, or previously removed — nothing to do.
  }
  _resetDatabaseForTests();
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
});

function buildEvent(): EventDocType {
  const now = new Date("2026-04-27T12:00:00.000Z").toISOString();
  return {
    id: EVENT_ID,
    started_at: now,
    ended_at: null,
    lat: 52.5,
    lon: 13.4,
    legacy_external_ref: null,
    reveal_participants: false,
    note: null,
    created_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    _deleted: false,
  };
}

function buildApplication(index: number): ApplicationDocType {
  const ts = new Date(
    new Date("2026-04-27T12:00:00.000Z").getTime() + (index + 1) * 60_000,
  ).toISOString();
  return {
    id: APP_IDS[index]!,
    event_id: EVENT_ID,
    performer_id: PERFORMER_ID,
    recipient_id: RECIPIENT_ID,
    arm_position_id: null,
    hand_position_id: null,
    hand_orientation_id: null,
    sequence_no: index + 1,
    started_at: ts,
    ended_at: null,
    note: null,
    created_by: null,
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    _deleted: false,
  };
}

async function bootReplication() {
  const db = await getDatabase();
  handles = startReplication(db);
  // Ensure the initial replication settled before the test logic kicks
  // in — otherwise the first push could race with the leadership claim.
  await handles.events.awaitInitialReplication();
  await handles.applications.awaitInitialReplication();
  return { db, handles };
}

describe("RxDB replication — M5b.4 offline / reconnect E2E", () => {
  it("flushes 3 offline applications exactly once on reconnect", async () => {
    const { db } = await bootReplication();

    // Online: seed the event so the offline applications have a parent.
    await db.events.insert(buildEvent());
    await handles!.events.awaitInSync();
    expect(state.events.size).toBe(1);
    expect(state.acceptedPushes).toBe(1);

    // Offline: three application inserts must not reach the backend.
    setOnline(false);
    for (let i = 0; i < 3; i += 1) {
      await db.applications.insert(buildApplication(i));
    }
    expect(state.applications.size).toBe(0);

    // Reconnect: replication should drain the queue and persist all three.
    setOnline(true);
    handles!.events.reSync();
    handles!.applications.reSync();
    await handles!.applications.awaitInSync();

    expect(state.applications.size).toBe(3);
    const ids = Array.from(state.applications.values()).map((a) => a.id);
    expect(new Set(ids).size).toBe(3);
    // One participant insert for the event creator + one per application
    // performer/recipient pair: 1 + 3 × 2 = 7. Counted as a proxy for the
    // backend's auto-participant trigger (ADR-012).
    expect(state.participantInserts).toBe(7);
  });

  it("does not re-push docs that are already in sync", async () => {
    const { db } = await bootReplication();
    await db.events.insert(buildEvent());
    await db.applications.insert(buildApplication(0));
    await handles!.events.awaitInSync();
    await handles!.applications.awaitInSync();

    const baselinePushes = state.acceptedPushes;
    const baselineApps = state.applications.size;

    // Idempotent re-trigger: nothing changed locally, nothing should ship.
    handles!.events.reSync();
    handles!.applications.reSync();
    await handles!.events.awaitInSync();
    await handles!.applications.awaitInSync();

    expect(state.acceptedPushes).toBe(baselinePushes);
    expect(state.applications.size).toBe(baselineApps);
  });

  it("surfaces server-side auto-participants in RxDB after offline application reconnect (M5c.1b)", async () => {
    const { db } = await bootReplication();
    await db.events.insert(buildEvent());
    await handles!.events.awaitInSync();

    // Offline: insert an application — the auto-participant trigger
    // would normally fire server-side and add performer + recipient
    // rows to event_participant.
    setOnline(false);
    await db.applications.insert(buildApplication(0));
    expect(await db.event_participants.find().exec()).toHaveLength(0);

    // Reconnect — application push triggers the auto-participant edges
    // in the mock server, then a pull cycle replicates them back into
    // RxDB.
    setOnline(true);
    handles!.applications.reSync();
    await handles!.applications.awaitInSync();
    handles!.eventParticipants.reSync();
    await handles!.eventParticipants.awaitInSync();

    expect(state.eventParticipants.size).toBe(2);
    const stored = await db.event_participants
      .find({ selector: { event_id: EVENT_ID, _deleted: { $eq: false } } })
      .exec();
    const personIds = stored.map((d) => d.person_id).sort();
    expect(personIds).toEqual([PERFORMER_ID, RECIPIENT_ID].sort());
  });

  it("pulls server-authoritative fields back into RxDB after reconnect", async () => {
    const { db } = await bootReplication();
    await db.events.insert(buildEvent());
    await handles!.events.awaitInSync();

    // Offline-insert two applications with optimistic seq_no 1 and 2.
    setOnline(false);
    await db.applications.insert(buildApplication(0));
    await db.applications.insert(buildApplication(1));

    // Reconnect — server bumps `updated_at` on insert; the first cycle
    // pushes the local docs and the cursor advances on the second cycle's
    // pull (RxDB doesn't re-fetch the just-pushed docs in the same
    // round-trip, that's the master-wins handler's job on the next pull).
    setOnline(true);
    handles!.applications.reSync();
    await handles!.applications.awaitInSync();
    handles!.applications.reSync();
    await handles!.applications.awaitInSync();

    const stored = await db.applications.find().exec();
    expect(stored).toHaveLength(2);
    for (const doc of stored) {
      const serverDoc = state.applications.get(doc.id);
      expect(serverDoc, `mock backend missing ${doc.id}`).toBeDefined();
      expect(doc.updated_at).toBe(serverDoc!.updated_at);
    }
  });
});
