"use client";

import { Lock, ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { usePinLock, DEFAULT_INACTIVITY_MS } from "@/components/pin/pin-lock-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIMEOUT_OPTIONS: ReadonlyArray<{ ms: number; label: string }> = [
  { ms: 30_000, label: "30 Sekunden" },
  { ms: 60_000, label: "1 Minute (Default)" },
  { ms: 120_000, label: "2 Minuten" },
  { ms: 300_000, label: "5 Minuten" },
  { ms: 900_000, label: "15 Minuten" },
];

function pickClosestOption(ms: number): number {
  let best = TIMEOUT_OPTIONS[0]!.ms;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const option of TIMEOUT_OPTIONS) {
    const diff = Math.abs(option.ms - ms);
    if (diff < bestDiff) {
      best = option.ms;
      bestDiff = diff;
    }
  }
  return best;
}

export function PinSettings() {
  const { status, setPin, clearPin, lock, inactivityMs, setInactivityMs } = usePinLock();
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedTimeout, setSelectedTimeout] = useState<number>(() =>
    pickClosestOption(inactivityMs ?? DEFAULT_INACTIVITY_MS),
  );

  useEffect(() => {
    setSelectedTimeout(pickClosestOption(inactivityMs));
  }, [inactivityMs]);

  if (status === "loading") {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Lade PIN-Einstellungen…</p>;
  }

  const isConfigured = status === "unlocked" || status === "locked";

  async function onSubmitNewPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin !== confirm) {
      toast.error("PINs stimmen nicht überein.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("PIN muss 4 bis 6 Ziffern enthalten.");
      return;
    }
    setSubmitting(true);
    try {
      await setPin(pin);
      toast.success("PIN gespeichert.");
      setPinValue("");
      setConfirm("");
      setEditing(false);
    } catch (error) {
      toast.error("PIN konnte nicht gespeichert werden", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onClear() {
    setSubmitting(true);
    try {
      await clearPin();
      toast.success("PIN entfernt. UI ist nicht mehr gesperrt.");
    } catch (error) {
      toast.error("PIN konnte nicht entfernt werden", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        {isConfigured ? (
          <>
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
            <span>PIN ist aktiv. Sperre nach Inaktivität oder per Knopf.</span>
          </>
        ) : (
          <>
            <ShieldOff className="h-5 w-5 text-slate-500" aria-hidden />
            <span>Keine PIN gesetzt — UI bleibt unverschlossen.</span>
          </>
        )}
      </div>

      {!isConfigured || editing ? (
        <form onSubmit={onSubmitNewPin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin-new">Neue PIN (4–6 Ziffern)</Label>
            <Input
              id="pin-new"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              minLength={4}
              maxLength={6}
              value={pin}
              onChange={(event) => setPinValue(event.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin-confirm">PIN bestätigen</Label>
            <Input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              minLength={4}
              maxLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Speichere…" : isConfigured ? "PIN aktualisieren" : "PIN setzen"}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setPinValue("");
                  setConfirm("");
                }}
                disabled={submitting}
              >
                Abbrechen
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            <Lock aria-hidden /> PIN ändern
          </Button>
          <Button type="button" variant="secondary" onClick={() => lock()}>
            <Lock aria-hidden /> Jetzt sperren
          </Button>
          <Button type="button" variant="ghost" onClick={onClear} disabled={submitting}>
            PIN entfernen
          </Button>
        </div>
      )}

      {isConfigured && !editing ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="pin-timeout">Sperre nach</Label>
          <select
            id="pin-timeout"
            value={selectedTimeout}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSelectedTimeout(next);
              setInactivityMs(next);
            }}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
          >
            {TIMEOUT_OPTIONS.map((option) => (
              <option key={option.ms} value={option.ms}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inaktivität wird zurückgesetzt bei Tippen, Tastendruck oder Tab-Wechsel.
          </p>
        </div>
      ) : null}
    </div>
  );
}
