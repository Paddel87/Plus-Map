import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SyncStatusIndicator } from "@/components/sync/sync-status-indicator";
import type { SyncStatus } from "@/lib/rxdb/replication";

const mockStatus = vi.fn<() => SyncStatus>();

vi.mock("@/lib/rxdb/provider", () => ({
  useSyncStatus: () => mockStatus(),
}));

describe("SyncStatusIndicator", () => {
  test("renders the idle (synchronisiert) variant by default", () => {
    mockStatus.mockReturnValue("idle");
    render(<SyncStatusIndicator />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Synchronisation: synchronisiert");
    expect(status.dataset.syncStatus).toBe("idle");
  });

  test("renders the active variant with spinner", () => {
    mockStatus.mockReturnValue("active");
    render(<SyncStatusIndicator />);
    const status = screen.getByRole("status");
    expect(status.dataset.syncStatus).toBe("active");
    expect(status.querySelector("svg")).toHaveClass("animate-spin");
  });

  test("renders the offline variant", () => {
    mockStatus.mockReturnValue("offline");
    render(<SyncStatusIndicator showLabel />);
    const status = screen.getByRole("status");
    expect(status.dataset.syncStatus).toBe("offline");
    expect(status).toHaveTextContent("offline");
  });

  test("renders the error variant", () => {
    mockStatus.mockReturnValue("error");
    render(<SyncStatusIndicator showLabel />);
    const status = screen.getByRole("status");
    expect(status.dataset.syncStatus).toBe("error");
    expect(status).toHaveTextContent("Sync-Fehler");
  });
});
