"use client";

import { useCallback, useEffect, useState } from "react";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "success"
  | "denied"
  | "unavailable"
  | "unsupported";

export interface GeolocationFix {
  lat: number;
  lon: number;
  accuracy: number | null;
}

export interface UseGeolocationResult {
  status: GeolocationStatus;
  fix: GeolocationFix | null;
  error: string | null;
  request: () => void;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
  /** When true, request a fix automatically once on mount. */
  auto?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const { enableHighAccuracy = true, timeoutMs = 10_000, maximumAgeMs = 0, auto = true } = options;
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [fix, setFix] = useState<GeolocationFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("Standortbestimmung wird vom Browser nicht unterstützt.");
      return;
    }
    setStatus("requesting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("success");
        setError(null);
        setFix({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Standortzugriff wurde verweigert.");
        } else {
          setStatus("unavailable");
          setError(err.message || "Standort nicht verfügbar.");
        }
      },
      { enableHighAccuracy, timeout: timeoutMs, maximumAge: maximumAgeMs },
    );
  }, [enableHighAccuracy, timeoutMs, maximumAgeMs]);

  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return { status, fix, error, request };
}
