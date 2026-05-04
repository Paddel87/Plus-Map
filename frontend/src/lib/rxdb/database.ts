/**
 * RxDB database singleton (browser-only).
 *
 * Lazy-initialised via `getDatabase()` so the heavy RxDB bundle is not
 * pulled in by SSR. Uses the Dexie storage adapter (IndexedDB-backed,
 * per ADR-017) without encryption (ADR-032: keys / app-PIN cover the
 * threat model in Pfad A).
 *
 * The dev-mode plugin is loaded only when `NODE_ENV !== 'production'`;
 * it adds expensive runtime checks that catch schema misuse and is the
 * RxDB-recommended setup for local development.
 */

import { addRxPlugin, createRxDatabase, type RxDatabase, type RxCollection } from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import { applicationSchema, eventParticipantSchema, eventSchema } from "./schemas";
import type { ApplicationDocType, EventDocType, EventParticipantDocType } from "./types";

// Schema migrations are required for any version bump on a collection
// (M7.5 / ADR-046 introduces v1 of the application schema). Always
// loaded — strips down to a single small chunk.
addRxPlugin(RxDBMigrationSchemaPlugin);

export type EventCollection = RxCollection<EventDocType>;
export type ApplicationCollection = RxCollection<ApplicationDocType>;
export type EventParticipantCollection = RxCollection<EventParticipantDocType>;

export interface HCMapCollections {
  events: EventCollection;
  applications: ApplicationCollection;
  event_participants: EventParticipantCollection;
}

export type HCMapDatabase = RxDatabase<HCMapCollections>;

const DB_NAME = "hcmap";
let dbPromise: Promise<HCMapDatabase> | null = null;
let devPluginLoaded = false;

async function loadDevPlugin(): Promise<boolean> {
  if (devPluginLoaded) return true;
  // Production strips dev-mode + validator for bundle size; vitest skips
  // both because the plugin demands a schema-validator wrapper around
  // the storage. Only the interactive `next dev` path
  // (NODE_ENV === "development") loads them.
  if (process.env.NODE_ENV !== "development") return false;
  const { RxDBDevModePlugin } = await import("rxdb/plugins/dev-mode");
  addRxPlugin(RxDBDevModePlugin);
  devPluginLoaded = true;
  return true;
}

async function buildStorage() {
  const dexieStorage = getRxStorageDexie();
  // dev-mode (RxDB ≥ 17) requires the storage to be wrapped in a schema
  // validator at the top level (error DVM1) — without it, `createRxDatabase`
  // throws and the provider stays in default state with no UI feedback.
  // Production omits the wrapper to keep the bundle small.
  if (process.env.NODE_ENV !== "development") return dexieStorage;
  const { wrappedValidateAjvStorage } = await import("rxdb/plugins/validate-ajv");
  return wrappedValidateAjvStorage({ storage: dexieStorage });
}

async function buildDatabase(): Promise<HCMapDatabase> {
  await loadDevPlugin();
  const storage = await buildStorage();
  const db = await createRxDatabase<HCMapCollections>({
    name: DB_NAME,
    storage,
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: false,
  });
  await db.addCollections({
    events: {
      schema: eventSchema,
      // Schema v0 → v1 (ADR-050): rename `w3w_legacy` to
      // `legacy_external_ref`. Old field is dropped, new field carries
      // the same value (or null for docs that never had one).
      // Schema v1 → v2 (ADR-056, M11-HOTFIX-008): add optional `title`
      // (default null — UI falls back to start-time/coordinate display
      // when unset).
      // Schema v2 → v3 (ADR-058, M11-HOTFIX-010): add `time_precision`
      // (default 'minute' — backwards-compatible with existing rows).
      migrationStrategies: {
        1: (doc: Record<string, unknown>) => {
          const { w3w_legacy, ...rest } = doc;
          return { ...rest, legacy_external_ref: w3w_legacy ?? null };
        },
        2: (doc: Record<string, unknown>) => ({ ...doc, title: null }),
        3: (doc: Record<string, unknown>) => ({ ...doc, time_precision: "minute" }),
      },
    },
    applications: {
      schema: applicationSchema,
      // Schema v0 → v1 (M7.5, ADR-046): add the optional
      // `restraint_type_ids` array. Existing local docs default to an
      // empty set so the next push doesn't accidentally drop server
      // restraints (LWW would replace them with []).
      migrationStrategies: {
        1: (doc: Record<string, unknown>) => ({ ...doc, restraint_type_ids: [] }),
      },
    },
    event_participants: { schema: eventParticipantSchema },
  });
  return db;
}

/**
 * Resolve the singleton RxDB instance. Calling this on the server is a
 * programming error — IndexedDB doesn't exist there. The provider gates
 * initialisation on the client mount, so callers downstream are safe.
 */
export function getDatabase(): Promise<HCMapDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("RxDB is browser-only; called from server"));
  }
  if (!dbPromise) {
    dbPromise = buildDatabase().catch((error) => {
      // Visible warn — silent failures here used to hide RxDB-init bugs
      // (no DB in IndexedDB, no replication requests, but UI thinks
      // everything's fine because Provider stays in default state).
      console.warn("[hcmap-rxdb] buildDatabase failed:", error);
      // Reset so the next call can retry from a clean slate.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Test helper — drops the cached promise so a fresh DB can be created. */
export function _resetDatabaseForTests(): void {
  dbPromise = null;
}
