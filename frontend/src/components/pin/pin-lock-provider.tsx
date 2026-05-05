"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { LockOverlay } from "@/components/pin/lock-overlay";
import { apiFetch } from "@/lib/api";
import { hashPin, verifyPin as verifyPinHash, PIN_FAIL_LIMIT, type PinRecord } from "@/lib/pin";
import { clearPinRecord, loadPinRecord, savePinRecord, updateFailCount } from "@/lib/pin-storage";

export const DEFAULT_INACTIVITY_MS = 60_000;
const TIMEOUT_STORAGE_KEY = "plusmap.pinLock.inactivityMs";
const ACTIVITY_EVENTS: ReadonlyArray<keyof DocumentEventMap> = [
  "pointerdown",
  "keydown",
  "visibilitychange",
];

export interface PinLockState {
  status: "loading" | "no-pin" | "unlocked" | "locked";
  failCount: number;
  remainingAttempts: number;
  inactivityMs: number;
  /** Set or replace the PIN. */
  setPin: (pin: string) => Promise<void>;
  /** Remove any stored PIN. */
  clearPin: () => Promise<void>;
  /** Lock the UI immediately. */
  lock: () => void;
  /** Try to unlock with a candidate PIN. Returns true on success. */
  tryUnlock: (pin: string) => Promise<boolean>;
  /** Update the inactivity timeout (in ms). */
  setInactivityMs: (ms: number) => void;
}

const PinLockContext = createContext<PinLockState | null>(null);

export function usePinLock(): PinLockState {
  const ctx = useContext(PinLockContext);
  if (!ctx) {
    throw new Error("usePinLock muss innerhalb eines PinLockProviders verwendet werden.");
  }
  return ctx;
}

export interface PinLockProviderProps {
  children: ReactNode;
}

export function PinLockProvider({ children }: PinLockProviderProps) {
  const router = useRouter();
  const [record, setRecord] = useState<PinRecord | null>(null);
  const [status, setStatus] = useState<PinLockState["status"]>("loading");
  const [inactivityMs, setInactivityMsState] = useState<number>(() => readInactivityMs());
  const timeoutRef = useRef<number | null>(null);

  // Initial load from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadPinRecord();
        if (cancelled) return;
        setRecord(loaded);
        setStatus(loaded ? "unlocked" : "no-pin");
      } catch {
        if (cancelled) return;
        setRecord(null);
        setStatus("no-pin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lock = useCallback(() => {
    setStatus((prev) => (prev === "unlocked" ? "locked" : prev));
  }, []);

  const resetTimer = useCallback(() => {
    if (typeof window === "undefined") return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (status !== "unlocked") return;
    timeoutRef.current = window.setTimeout(() => {
      lock();
    }, inactivityMs);
  }, [status, inactivityMs, lock]);

  // Activity listeners drive the inactivity timer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status !== "unlocked") {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    function onActivity(event: Event) {
      if (event.type === "visibilitychange") {
        if (document.visibilityState === "visible") {
          resetTimer();
        } else if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }
      resetTimer();
    }
    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, onActivity);
    }
    resetTimer();
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        document.removeEventListener(evt, onActivity);
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status, resetTimer]);

  const setPin = useCallback(async (pin: string) => {
    const next = await hashPin(pin);
    await savePinRecord(next);
    setRecord(next);
    setStatus("unlocked");
  }, []);

  const clearPin = useCallback(async () => {
    await clearPinRecord();
    setRecord(null);
    setStatus("no-pin");
  }, []);

  const forceLogout = useCallback(async () => {
    await clearPinRecord().catch(() => {});
    setRecord(null);
    setStatus("no-pin");
    try {
      await apiFetch<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore: even without a clean logout, redirecting to /login is
      // sufficient — the proxy will treat the user as unauthenticated
      // on the next request because the session cookie is gone or invalid.
    }
    router.push("/login?error=pin");
    router.refresh();
  }, [router]);

  const tryUnlock = useCallback(
    async (candidate: string) => {
      if (!record) {
        return false;
      }
      // Increment fail_count BEFORE the comparison so that a crash mid-verify
      // still leaves the persisted counter incremented (ADR-023 §Fehlversuch-Zähler).
      const tentative = await updateFailCount(record, record.fail_count + 1);
      setRecord(tentative);
      let ok = false;
      try {
        ok = await verifyPinHash(candidate, tentative);
      } catch {
        ok = false;
      }
      if (ok) {
        const reset = await updateFailCount(tentative, 0);
        setRecord(reset);
        setStatus("unlocked");
        return true;
      }
      if (tentative.fail_count >= PIN_FAIL_LIMIT) {
        await forceLogout();
        return false;
      }
      return false;
    },
    [record, forceLogout],
  );

  const setInactivityMs = useCallback((ms: number) => {
    const clamped = Math.max(15_000, Math.min(15 * 60_000, Math.round(ms)));
    setInactivityMsState(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TIMEOUT_STORAGE_KEY, String(clamped));
      } catch {
        // localStorage unavailable; runtime value stays in state for this session.
      }
    }
  }, []);

  const value = useMemo<PinLockState>(
    () => ({
      status,
      failCount: record?.fail_count ?? 0,
      remainingAttempts: Math.max(0, PIN_FAIL_LIMIT - (record?.fail_count ?? 0)),
      inactivityMs,
      setPin,
      clearPin,
      lock,
      tryUnlock,
      setInactivityMs,
    }),
    [status, record, inactivityMs, setPin, clearPin, lock, tryUnlock, setInactivityMs],
  );

  return (
    <PinLockContext.Provider value={value}>
      {children}
      {status === "locked" ? <LockOverlay /> : null}
    </PinLockContext.Provider>
  );
}

function readInactivityMs(): number {
  if (typeof window === "undefined") return DEFAULT_INACTIVITY_MS;
  try {
    const raw = window.localStorage.getItem(TIMEOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_INACTIVITY_MS;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 15_000) return DEFAULT_INACTIVITY_MS;
    return Math.min(parsed, 15 * 60_000);
  } catch {
    return DEFAULT_INACTIVITY_MS;
  }
}
