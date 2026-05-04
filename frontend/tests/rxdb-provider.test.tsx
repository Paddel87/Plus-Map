/**
 * Smoke test for the React `RxdbProvider` glue.
 *
 * Boots the provider in jsdom + fake-indexeddb so the `getDatabase()`
 * effect runs to completion. Verifies:
 *  1. `useDatabase()` flips from `null` to an `RxDatabase` after mount.
 *  2. `useSyncStatus()` exposes the replication status stream.
 *  3. `useDatabaseError()` stays `null` on the happy path.
 *
 * The full offline / push / pull behaviour lives in
 * `replication.e2e.test.ts`; this file only covers the provider's
 * mount-and-expose responsibilities.
 */

import "fake-indexeddb/auto";

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetDatabaseForTests, getDatabase } from "@/lib/rxdb/database";
import { RxdbProvider, useDatabase, useDatabaseError, useSyncStatus } from "@/lib/rxdb/provider";

function Probe() {
  const db = useDatabase();
  const error = useDatabaseError();
  const status = useSyncStatus();
  return (
    <div>
      <span data-testid="db">{db ? "ready" : "loading"}</span>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error ? error.message : "none"}</span>
    </div>
  );
}

beforeEach(() => {
  document.cookie = "hcmap_csrf=provider-test-csrf";
  // Stub fetch so the replication doesn't race against an unbound net
  // dependency — every URL just answers with an empty pull batch.
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(JSON.stringify({ documents: [], checkpoint: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
});

afterEach(async () => {
  try {
    const db = await getDatabase();
    await db.remove();
  } catch {
    /* nothing to remove */
  }
  _resetDatabaseForTests();
  vi.unstubAllGlobals();
});

describe("RxdbProvider", () => {
  it("exposes the database, status, and error hooks after mount", async () => {
    render(
      <RxdbProvider>
        <Probe />
      </RxdbProvider>,
    );

    expect(screen.getByTestId("db")).toHaveTextContent("loading");

    await waitFor(() => expect(screen.getByTestId("db")).toHaveTextContent("ready"));
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    // Status starts at "idle" and may pass through "active" while the
    // initial replication runs; we only assert it's one of the legal
    // values to keep the test deterministic.
    expect(["idle", "active", "offline", "error"]).toContain(
      screen.getByTestId("status").textContent,
    );
  });
});
