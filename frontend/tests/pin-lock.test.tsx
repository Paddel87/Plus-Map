import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PinLockProvider, usePinLock } from "@/components/pin/pin-lock-provider";
import type { PinRecord } from "@/lib/pin";

const pushMock = vi.fn();
const refreshMock = vi.fn();
let memory: PinRecord | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, back: vi.fn() }),
}));

vi.mock("@/lib/pin-storage", () => ({
  loadPinRecord: vi.fn(async () => memory),
  savePinRecord: vi.fn(async (record: PinRecord) => {
    memory = record;
  }),
  clearPinRecord: vi.fn(async () => {
    memory = null;
  }),
  updateFailCount: vi.fn(async (record: PinRecord, failCount: number) => {
    const next: PinRecord = { ...record, fail_count: failCount };
    memory = next;
    return next;
  }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return <PinLockProvider>{children}</PinLockProvider>;
}

beforeEach(() => {
  memory = null;
  pushMock.mockReset();
  refreshMock.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 204 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePinLock", () => {
  test("starts in no-pin state when storage is empty", async () => {
    const { result } = renderHook(() => usePinLock(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("no-pin"));
    expect(result.current.failCount).toBe(0);
  });

  test("setPin transitions to unlocked and persists the record", async () => {
    const { result } = renderHook(() => usePinLock(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("no-pin"));
    await act(async () => {
      await result.current.setPin("1234");
    });
    expect(result.current.status).toBe("unlocked");
    expect(memory).not.toBeNull();
    expect(memory?.fail_count).toBe(0);
  }, 30_000);

  test("tryUnlock with the correct PIN unlocks and resets the fail counter", async () => {
    const { result } = renderHook(() => usePinLock(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("no-pin"));
    await act(async () => {
      await result.current.setPin("4242");
    });
    await act(async () => {
      result.current.lock();
    });
    await waitFor(() => expect(result.current.status).toBe("locked"));
    let unlocked: boolean | undefined;
    await act(async () => {
      unlocked = await result.current.tryUnlock("4242");
    });
    expect(unlocked).toBe(true);
    expect(result.current.status).toBe("unlocked");
    expect(result.current.failCount).toBe(0);
  }, 30_000);

  test("tryUnlock with a wrong PIN increments the fail counter and stays locked", async () => {
    const { result } = renderHook(() => usePinLock(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("no-pin"));
    await act(async () => {
      await result.current.setPin("0815");
    });
    await act(async () => {
      result.current.lock();
    });
    let unlocked: boolean | undefined;
    await act(async () => {
      unlocked = await result.current.tryUnlock("0816");
    });
    expect(unlocked).toBe(false);
    expect(result.current.status).toBe("locked");
    expect(result.current.failCount).toBe(1);
    expect(result.current.remainingAttempts).toBe(4);
  }, 30_000);

  test("five wrong attempts force a logout and route to /login?error=pin", async () => {
    const { result } = renderHook(() => usePinLock(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("no-pin"));
    await act(async () => {
      await result.current.setPin("9999");
    });
    await act(async () => {
      result.current.lock();
    });
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await result.current.tryUnlock("0000");
      });
    }
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login?error=pin"));
    expect(memory).toBeNull();
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const calls = fetchMock.mock.calls;
    expect(calls.some(([url]) => String(url) === "/api/auth/logout")).toBe(true);
  }, 60_000);
});
