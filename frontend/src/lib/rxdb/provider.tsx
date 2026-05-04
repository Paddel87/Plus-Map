"use client";

/**
 * Client-only RxDB provider.
 *
 * Mounts inside the protected app shell (after the PIN gate) and
 * exposes:
 *   - `useDatabase()` — `RxDatabase` once it's ready, `null` while
 *     loading, `Error` if init fails.
 *   - `useSyncStatus()` — current `idle | active | error | offline`.
 *
 * Only one provider should exist per page; the database itself is a
 * module-level singleton (`getDatabase()`) so React Strict Mode's
 * double-invoke is safe.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getDatabase, type HCMapDatabase } from "./database";
import { startReplication, type ReplicationHandles, type SyncStatus } from "./replication";

interface RxdbContextValue {
  database: HCMapDatabase | null;
  error: Error | null;
  status: SyncStatus;
}

const RxdbContext = createContext<RxdbContextValue>({
  database: null,
  error: null,
  status: "idle",
});

export function RxdbProvider({ children }: { children: ReactNode }) {
  const [database, setDatabase] = useState<HCMapDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    let handles: ReplicationHandles | null = null;
    let statusSub: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        const db = await getDatabase();
        if (cancelled) return;
        setDatabase(db);
        handles = startReplication(db);
        statusSub = handles.status$.subscribe((next) => setStatus(next));
      } catch (caught) {
        if (cancelled) return;
        // Visible warn — silent failures here used to hide RxDB-init
        // bugs (no DB in IndexedDB, no replication requests, but UI
        // looked fine because Provider stayed in default state).
        console.warn("[hcmap-rxdb] provider init failed:", caught);
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    })();

    return () => {
      cancelled = true;
      statusSub?.unsubscribe();
      // Cancel replications on unmount but don't tear the DB down — it's
      // the module-level singleton and other route changes might re-mount
      // this provider almost immediately.
      void handles?.stop();
    };
  }, []);

  return (
    <RxdbContext.Provider value={{ database, error, status }}>{children}</RxdbContext.Provider>
  );
}

export function useDatabase(): HCMapDatabase | null {
  return useContext(RxdbContext).database;
}

export function useDatabaseError(): Error | null {
  return useContext(RxdbContext).error;
}

export function useSyncStatus(): SyncStatus {
  return useContext(RxdbContext).status;
}
