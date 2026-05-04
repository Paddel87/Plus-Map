"use client";

import { Crosshair, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RecipientPicker } from "@/components/person/recipient-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { AuthUser } from "@/lib/auth";
import { DEFAULT_MAP_CENTER } from "@/lib/map";
import { useDatabase } from "@/lib/rxdb/provider";
import type { PersonRead } from "@/lib/types";

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[360px] w-full" />,
  },
);

const RECIPIENT_DRAFT_PREFIX = "hcmap:event-recipient:";

export interface EventCreateFormProps {
  user: AuthUser;
}

export function EventCreateForm({ user }: EventCreateFormProps) {
  const router = useRouter();
  const database = useDatabase();
  const geolocation = useGeolocation({ auto: true });
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [recipient, setRecipient] = useState<PersonRead | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (geolocation.fix && coords === null) {
      setCoords({ lat: geolocation.fix.lat, lon: geolocation.fix.lon });
    }
  }, [geolocation.fix, coords]);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!coords) {
      toast.error("Standort fehlt", {
        description: "Bitte den Marker auf der Karte setzen oder GPS aktivieren.",
      });
      return;
    }
    if (!database) {
      toast.error("Lokale Datenbank wird noch geladen", {
        description: "Einen Moment, dann nochmal probieren.",
      });
      return;
    }

    setPending(true);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await database.events.insert({
        id,
        started_at: now,
        ended_at: null,
        lat: coords.lat,
        lon: coords.lon,
        legacy_external_ref: null,
        reveal_participants: false,
        title: title.trim() || null,
        note: note.trim() || null,
        time_precision: "minute",
        // Server overrides created_by with the authenticated user (ADR-029).
        created_by: user.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        _deleted: false,
      });
      // The recipient becomes a participant only after the first application
      // is pushed (auto-participant per ADR-012). Stash the choice so the
      // live view can pre-fill the application sheet.
      if (typeof window !== "undefined" && recipient) {
        try {
          window.sessionStorage.setItem(`${RECIPIENT_DRAFT_PREFIX}${id}`, recipient.id);
        } catch {
          /* sessionStorage disabled — non-fatal. */
        }
      }
      toast.success("Tour gestartet", {
        description: "Live-Erfassung läuft. Sync läuft im Hintergrund.",
      });
      router.push(`/events/${id}`);
      router.refresh();
    } catch (error) {
      toast.error("Tour konnte nicht gestartet werden", {
        description: error instanceof Error ? error.message : String(error),
      });
      setPending(false);
    }
  }

  const submitLabel = pending ? "Starte…" : "Tour starten";
  const gpsLabel =
    geolocation.status === "requesting" ? "Standort wird ermittelt…" : "Standort erneut anfordern";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standort</CardTitle>
          <CardDescription>
            GPS wird beim Öffnen abgefragt. Marker auf der Karte verschieben oder antippen, um zu
            korrigieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => geolocation.request()}
              disabled={geolocation.status === "requesting"}
            >
              {geolocation.status === "requesting" ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Crosshair aria-hidden />
              )}
              {gpsLabel}
            </Button>
            {geolocation.error ? (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {geolocation.error}
              </span>
            ) : null}
            {coords ? (
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
              </span>
            ) : null}
          </div>
          <LocationPickerMap
            lat={coords?.lat ?? null}
            lon={coords?.lon ?? null}
            onChange={(next) => setCoords(next)}
          />
          {!coords ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standort ist Pflicht. Tippe auf die Karte, um einen Marker zu setzen (Default-Center{" "}
              {DEFAULT_MAP_CENTER.lat.toFixed(2)}, {DEFAULT_MAP_CENTER.lon.toFixed(2)}).
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Begleitung</CardTitle>
          <CardDescription>
            Wer ist mit dabei? Ohne Auswahl bist du allein unterwegs (Erfasser = du).
            {recipient ? (
              <span className="mt-1 block text-xs text-slate-700 dark:text-slate-300">
                Hinweis: {recipient.name} wird automatisch als Mit-dabei erfasst und kann die Tour
                später einsehen.
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecipientPicker
            value={recipient}
            onChange={setRecipient}
            excludePersonIds={[user.person_id]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Titel (optional)</CardTitle>
          <CardDescription>
            Kurze Bezeichnung zur Wiederfindung im Dashboard und auf der Karte. Maximal 120 Zeichen.
            Leer lassen = Anzeige fällt auf Startzeit + Koordinaten zurück.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. „Konzert in Bremen"
            maxLength={120}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notiz (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Kontext, Stimmung, Setting…"
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-slate-50/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" disabled={!coords || pending || !database}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
