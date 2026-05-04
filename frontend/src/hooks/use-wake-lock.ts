"use client";

import { useEffect, useRef, useState } from "react";

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

interface WakeLockApi {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

export type WakeLockStatus =
  | "idle"
  | "requesting"
  | "active"
  | "released"
  | "unsupported"
  | "error";

export interface UseWakeLockResult {
  status: WakeLockStatus;
  active: boolean;
  message: string | null;
}

export function useWakeLock(enabled: boolean): UseWakeLockResult {
  const [status, setStatus] = useState<WakeLockStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setMessage(null);
      return;
    }
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setStatus("unsupported");
      setMessage("Bildschirm bitte nicht sperren — Wake-Lock-API nicht verfügbar.");
      return;
    }

    let cancelled = false;
    setStatus("requesting");
    setMessage(null);

    async function acquire() {
      try {
        const wakeLock = (navigator as unknown as { wakeLock: WakeLockApi }).wakeLock;
        const sentinel = await wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setStatus("active");
        setMessage(null);
        sentinel.addEventListener?.("release", () => {
          if (!cancelled) setStatus("released");
        });
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Wake-Lock fehlgeschlagen.");
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible" && sentinelRef.current?.released) {
        sentinelRef.current = null;
        acquire();
      }
    }

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);

  return { status, active: status === "active", message };
}
