"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { usePinLock } from "@/components/pin/pin-lock-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LockOverlay() {
  const { tryUnlock, remainingAttempts, status } = usePinLock();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (status !== "locked") return null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await tryUnlock(pin);
      if (!ok) {
        setError("PIN ist falsch.");
        setPin("");
      } else {
        setPin("");
      }
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App ist gesperrt"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm"
    >
      <form
        onSubmit={onSubmit}
        className="mx-4 flex w-full max-w-sm flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl"
      >
        <div className="flex items-center gap-2 text-base font-semibold">
          <Lock className="h-5 w-5" aria-hidden /> App gesperrt
        </div>
        <p className="text-sm text-slate-400">
          PIN eingeben, um die Oberfläche zu entsperren. Die Server-Sitzung bleibt aktiv.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pin-input" className="text-slate-200">
            PIN
          </Label>
          <Input
            id="pin-input"
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            minLength={4}
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, ""))}
            disabled={submitting}
            className="h-12 bg-slate-900 text-center font-mono text-2xl tracking-[0.5em] text-slate-100"
          />
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error} Verbleibende Versuche: {remainingAttempts}.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Nach 5 falschen Versuchen wird die Sitzung beendet (ADR-023).
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={submitting || pin.length < 4}
          className="h-11 bg-slate-100 text-slate-900 hover:bg-slate-200"
        >
          {submitting ? "Prüfe…" : "Entsperren"}
        </Button>
      </form>
    </div>
  );
}
