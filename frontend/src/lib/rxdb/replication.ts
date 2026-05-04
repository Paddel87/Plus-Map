/**
 * RxDB ↔ FastAPI replication for the `events` and `applications`
 * collections (ADR-017, ADR-029, ADR-030).
 *
 * Pull walks the server-side `(updated_at, id)` cursor, push posts each
 * document with `assumedMasterState` so the backend can run the per-
 * field conflict resolution from ADR-029. Conflicts come back as
 * server-master docs; we let RxDB's default conflict handler pick the
 * master, which matches ADR-029 ("server wins").
 */

import { lastOfArray } from "rxdb";
import { replicateRxCollection, type RxReplicationState } from "rxdb/plugins/replication";
import { BehaviorSubject } from "rxjs";

import type {
  ApplicationCollection,
  EventCollection,
  EventParticipantCollection,
  HCMapDatabase,
} from "./database";
import type {
  ApplicationDocType,
  EventDocType,
  EventParticipantDocType,
  SyncCheckpoint,
} from "./types";

const DEFAULT_PULL_BATCH = 100;
const DEFAULT_PUSH_BATCH = 50;
const REPLICATION_IDENTIFIER = "hcmap-fastapi-sync-v1";

interface PullResult<T> {
  documents: T[];
  checkpoint: SyncCheckpoint | null;
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${input} → ${response.status}: ${text || response.statusText}`);
  }
  return (await response.json()) as T;
}

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)hcmap_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

function buildPullParams(checkpoint: SyncCheckpoint | null, batchSize: number): string {
  const params = new URLSearchParams();
  params.set("limit", String(batchSize));
  if (checkpoint) {
    params.set("updated_at", checkpoint.updated_at);
    params.set("id", checkpoint.id);
  }
  return params.toString();
}

type ReadOnlyCollectionPath = "event-participants";
type WritableCollectionPath = "events" | "applications";
type CollectionPath = WritableCollectionPath | ReadOnlyCollectionPath;

interface MakeReplicationOptions {
  collectionPath: CollectionPath;
  /** Pull-only collections (M5c.1b, ADR-037 §D) skip the push handler. */
  pullOnly?: boolean;
}

function makeReplication<T extends EventDocType | ApplicationDocType | EventParticipantDocType>(
  collection: EventCollection | ApplicationCollection | EventParticipantCollection,
  { collectionPath, pullOnly = false }: MakeReplicationOptions,
): RxReplicationState<T, SyncCheckpoint> {
  return replicateRxCollection<T, SyncCheckpoint>({
    replicationIdentifier: `${REPLICATION_IDENTIFIER}-${collectionPath}`,
    collection: collection as never,
    deletedField: "_deleted",
    retryTime: 5_000,
    // Pfad A is single-tab-dominant (mobile + occasional desktop) — gating
    // pull/push on RxDB's broadcast-channel leader election added a
    // multi-second delay before the first pull and, in HMR cycles,
    // occasionally never resolved at all (DB initialised but no
    // /api/sync/* requests in Network). Disabling leadership lets every
    // tab replicate independently; duplicate pull traffic is acceptable
    // for a < 20-user system.
    waitForLeadership: false,
    autoStart: true,
    pull: {
      batchSize: DEFAULT_PULL_BATCH,
      async handler(lastCheckpoint: SyncCheckpoint | undefined, batchSize: number) {
        const query = buildPullParams(lastCheckpoint ?? null, batchSize);
        const result = await fetchJson<PullResult<T>>(`/api/sync/${collectionPath}/pull?${query}`);
        const documents = result.documents;
        // Always advance the checkpoint to the last seen doc, even if the
        // backend echoed the previous checkpoint when no rows changed.
        const tail = lastOfArray(documents);
        const checkpoint: SyncCheckpoint | undefined = tail
          ? { updated_at: tail.updated_at, id: tail.id }
          : (result.checkpoint ?? lastCheckpoint ?? undefined);
        return { documents, checkpoint };
      },
    },
    ...(pullOnly
      ? {}
      : {
          push: {
            batchSize: DEFAULT_PUSH_BATCH,
            async handler(rows: { assumedMasterState?: T; newDocumentState: T }[]): Promise<T[]> {
              const csrf = readCsrfCookie();
              if (!csrf) {
                // Without a CSRF token the backend rejects the push; surfacing
                // as a thrown error lets RxDB schedule a retry once the cookie
                // is re-issued (e.g. after re-login).
                throw new Error("CSRF token missing — push aborted, will retry");
              }
              const conflicts = await fetchJson<T[]>(`/api/sync/${collectionPath}/push`, {
                method: "POST",
                headers: { "X-CSRF-Token": csrf },
                body: JSON.stringify(rows),
              });
              return conflicts;
            },
          },
        }),
  });
}

/** Aggregate sync status for the global indicator (ADR-033 §H wrap-up). */
export type SyncStatus = "idle" | "active" | "error" | "offline";

export interface ReplicationHandles {
  events: RxReplicationState<EventDocType, SyncCheckpoint>;
  applications: RxReplicationState<ApplicationDocType, SyncCheckpoint>;
  /** Pull-only — see ADR-037 §D. */
  eventParticipants: RxReplicationState<EventParticipantDocType, SyncCheckpoint>;
  status$: BehaviorSubject<SyncStatus>;
  stop: () => Promise<void>;
}

export function startReplication(database: HCMapDatabase): ReplicationHandles {
  const eventsRep = makeReplication<EventDocType>(database.events, {
    collectionPath: "events",
  });
  const applicationsRep = makeReplication<ApplicationDocType>(database.applications, {
    collectionPath: "applications",
  });
  const eventParticipantsRep = makeReplication<EventParticipantDocType>(
    database.event_participants,
    { collectionPath: "event-participants", pullOnly: true },
  );

  const status$ = new BehaviorSubject<SyncStatus>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
  );

  // RxDB exposes `active$` / `error$` as plain Observables, so we keep
  // local snapshots and recompute the aggregate status on every emission.
  let eventsActive = false;
  let applicationsActive = false;
  let participantsActive = false;
  let eventsErrored = false;
  let applicationsErrored = false;
  let participantsErrored = false;

  function recompute(): void {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      status$.next("offline");
      return;
    }
    if (eventsErrored || applicationsErrored || participantsErrored) {
      status$.next("error");
      return;
    }
    if (eventsActive || applicationsActive || participantsActive) {
      status$.next("active");
      return;
    }
    status$.next("idle");
  }

  const subs = [
    eventsRep.active$.subscribe((active) => {
      eventsActive = active;
      recompute();
    }),
    applicationsRep.active$.subscribe((active) => {
      applicationsActive = active;
      recompute();
    }),
    eventParticipantsRep.active$.subscribe((active) => {
      participantsActive = active;
      recompute();
    }),
    eventsRep.error$.subscribe(() => {
      eventsErrored = true;
      recompute();
    }),
    applicationsRep.error$.subscribe(() => {
      applicationsErrored = true;
      recompute();
    }),
    eventParticipantsRep.error$.subscribe(() => {
      participantsErrored = true;
      recompute();
    }),
  ];

  const onlineHandler = () => recompute();
  const offlineHandler = () => recompute();
  if (typeof window !== "undefined") {
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
  }

  return {
    events: eventsRep,
    applications: applicationsRep,
    eventParticipants: eventParticipantsRep,
    status$,
    async stop(): Promise<void> {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onlineHandler);
        window.removeEventListener("offline", offlineHandler);
      }
      subs.forEach((s) => s.unsubscribe());
      await Promise.all([
        eventsRep.cancel(),
        applicationsRep.cancel(),
        eventParticipantsRep.cancel(),
      ]);
    },
  };
}
