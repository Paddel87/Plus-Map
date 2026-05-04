import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useWakeLock } from "@/hooks/use-wake-lock";

interface FakeSentinel {
  released: boolean;
  release: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
}

function fakeSentinel(): FakeSentinel {
  return {
    released: false,
    release: vi.fn(async function (this: FakeSentinel) {
      this.released = true;
    }),
    addEventListener: vi.fn(),
  };
}

beforeEach(() => {
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
});

afterEach(() => {
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
});

describe("useWakeLock", () => {
  test("requests a sentinel when enabled and reports active", async () => {
    const sentinel = fakeSentinel();
    const request = vi.fn(async () => sentinel);
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });
    const { result } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(result.current.status).toBe("active"));
    expect(request).toHaveBeenCalledWith("screen");
    expect(result.current.active).toBe(true);
  });

  test("reports unsupported when wakeLock API is missing", async () => {
    const { result } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(result.current.message).toMatch(/Wake-Lock-API/);
  });

  test("releases sentinel on unmount", async () => {
    const sentinel = fakeSentinel();
    const request = vi.fn(async () => sentinel);
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });
    const { result, unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(result.current.status).toBe("active"));
    unmount();
    expect(sentinel.release).toHaveBeenCalled();
  });

  test("stays idle while disabled", () => {
    const { result } = renderHook(() => useWakeLock(false));
    expect(result.current.status).toBe("idle");
    expect(result.current.active).toBe(false);
  });
});
