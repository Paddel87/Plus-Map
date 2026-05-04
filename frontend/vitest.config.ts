import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
    // The RxDB E2E suite under tests/replication.e2e.test.ts boots a real
    // RxDB instance against fake-indexeddb. Boot/teardown takes a few
    // seconds; raise the per-test timeout so slower CI runners don't false-
    // alarm. Other tests are unaffected because the timeout is a ceiling.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html"],
      // `lib/rxdb/**` and `lib/map/**` are the two coverage-tracked
      // domains. The map directory only owns pure helpers — the
      // MapLibre wrapper code in `components/map/*.tsx` is exercised
      // via mocks (ADR-027 §J2 / ADR-041 §K) and stays out of the
      // coverage scope.
      include: ["src/lib/rxdb/**", "src/lib/map/**"],
      exclude: ["src/lib/rxdb/schemas/**", "src/lib/rxdb/types.ts"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
        // Per-pattern threshold for the map helpers (lower bar than
        // rxdb because `style.ts` runs window-only code paths jsdom
        // can't fully exercise).
        "src/lib/map/**": {
          lines: 70,
          statements: 70,
          functions: 70,
          branches: 70,
        },
      },
    },
  },
});
