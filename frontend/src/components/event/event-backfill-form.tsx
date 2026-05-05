"use client";

/**
 * Backfill form for retroactive event entry (M5c.3, ADR-039).
 *
 * Mirrors the Live `EventCreateForm` skeleton (location, recipient,
 * note) but exposes editable `started_at` / `ended_at` for the event
 * and a growing list of applications, each with their own timestamps,
 * recipient, and note. On submit the form runs the pure
 * `validateBackfill` rules from `lib/event-backfill-validation.ts`,
 * surfaces inline errors, and on success inserts the event followed
 * by each application into RxDB. The Live-Modus write path
 * (auto-participant trigger, push replication) is reused unchanged.
 */

import { Crosshair, Loader2, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EquipmentPicker } from "@/components/catalog/equipment-picker";
import { RecipientPicker } from "@/components/person/recipient-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { AuthUser } from "@/lib/auth";
import {
  errorsForApplication,
  errorsForEvent,
  validateBackfill,
  type BackfillApplicationInput,
  type BackfillError,
  type BackfillEventInput,
} from "@/lib/event-backfill-validation";
import { DEFAULT_MAP_CENTER } from "@/lib/map";
import { useDatabase } from "@/lib/rxdb/provider";
import type { PersonRead, TimePrecision } from "@/lib/types";

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[360px] w-full" />,
  },
);

interface ApplicationRow {
  uiId: string;
  startedAt: string; // datetime-local string (no zone)
  endedAt: string;
  recipient: PersonRead | null;
  note: string;
  restraintTypeIds: string[];
}

export interface EventBackfillFormProps {
  user: AuthUser;
}

export function EventBackfillForm({ user }: EventBackfillFormProps) {
  const router = useRouter();
  const database = useDatabase();
  const geolocation = useGeolocation({ auto: false });
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [eventStartedAt, setEventStartedAt] = useState("");
  const [eventEndedAt, setEventEndedAt] = useState("");
  const [precision, setPrecision] = useState<TimePrecision>("minute");
  const [yearValue, setYearValue] = useState("");
  const [monthValue, setMonthValue] = useState("");
  const [dayValue, setDayValue] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [legacyExternalRef, setLegacyExternalRef] = useState("");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [errors, setErrors] = useState<BackfillError[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (geolocation.fix && coords === null) {
      setCoords({ lat: geolocation.fix.lat, lon: geolocation.fix.lon });
    }
  }, [geolocation.fix, coords]);

  const eventErrors = useMemo(() => errorsForEvent(errors), [errors]);

  function addApplication() {
    setApplications((current) => [
      ...current,
      {
        uiId: crypto.randomUUID(),
        startedAt: eventStartedAt,
        endedAt: "",
        recipient: null,
        note: "",
        restraintTypeIds: [],
      },
    ]);
  }

  function removeApplication(uiId: string) {
    setApplications((current) => current.filter((a) => a.uiId !== uiId));
    setErrors((current) => current.filter((e) => !(e.kind === "application" && e.uiId === uiId)));
  }

  function updateApplication(uiId: string, patch: Partial<ApplicationRow>) {
    setApplications((current) => current.map((a) => (a.uiId === uiId ? { ...a, ...patch } : a)));
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!database) {
      toast.error("Lokale Datenbank wird noch geladen", {
        description: "Einen Moment, dann nochmal probieren.",
      });
      return;
    }

    const startedIsoForValidation = precisionStartedIso(
      precision,
      yearValue,
      monthValue,
      dayValue,
      eventStartedAt,
    );
    const endedIsoForValidation = precisionEndedIso(
      precision,
      yearValue,
      monthValue,
      dayValue,
      eventEndedAt,
    );
    const input: BackfillEventInput = {
      startedAt: startedIsoForValidation,
      endedAt: endedIsoForValidation,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      applications: applications.map<BackfillApplicationInput>((a) => ({
        uiId: a.uiId,
        startedAt: localToIso(a.startedAt),
        endedAt: localToIso(a.endedAt),
        recipientId: a.recipient?.id ?? null,
        note: a.note.trim() || null,
      })),
    };

    const result = validateBackfill(input);
    if (!result.valid) {
      setErrors(result.errors);
      toast.error(`${result.errors.length} Eingabe-Probleme`, {
        description: "Bitte die markierten Felder prüfen.",
      });
      return;
    }
    setErrors([]);

    setPending(true);
    const eventId = crypto.randomUUID();
    const startedIso = startedIsoForValidation!;
    const endedIso = endedIsoForValidation;
    const now = new Date().toISOString();
    try {
      await database.events.insert({
        id: eventId,
        started_at: startedIso,
        ended_at: endedIso,
        lat: coords!.lat,
        lon: coords!.lon,
        legacy_external_ref: legacyExternalRef.trim() || null,
        reveal_participants: false,
        title: title.trim() || null,
        note: note.trim() || null,
        time_precision: precision,
        created_by: user.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        _deleted: false,
      });
      // Insert apps in chronological order so the optimistic
      // sequence_no matches the order the server will assign on push
      // (ADR-029, ADR-039 §F).
      for (let i = 0; i < result.sortedApplications.length; i += 1) {
        const sorted = result.sortedApplications[i]!;
        const original = applications.find((a) => a.uiId === sorted.uiId)!;
        const appId = crypto.randomUUID();
        await database.applications.insert({
          id: appId,
          event_id: eventId,
          performer_id: user.person_id,
          recipient_id: original.recipient?.id ?? user.person_id,
          sequence_no: i + 1,
          started_at: sorted.startedAt,
          ended_at: sorted.endedAt,
          note: sorted.note,
          created_by: user.id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          _deleted: false,
          equipment_item_ids: original.restraintTypeIds,
        });
      }
      toast.success("Tour erfasst", {
        description: `${result.sortedApplications.length} Application${result.sortedApplications.length === 1 ? "" : "s"} gespeichert. Sync läuft im Hintergrund.`,
      });
      router.push(`/events/${eventId}`);
      router.refresh();
    } catch (error) {
      toast.error("Tour konnte nicht gespeichert werden", {
        description: error instanceof Error ? error.message : String(error),
      });
      setPending(false);
    }
  }

  const gpsLabel =
    geolocation.status === "requesting"
      ? "Standort wird ermittelt…"
      : "Aktuellen Standort übernehmen";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standort</CardTitle>
          <CardDescription>
            Marker auf der Karte tippen, oder GPS übernehmen, falls die Erfassung am gleichen Ort
            stattfindet.
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
              Default-Center {DEFAULT_MAP_CENTER.lat.toFixed(2)},{" "}
              {DEFAULT_MAP_CENTER.lon.toFixed(2)}.
            </p>
          ) : null}
          {hasFieldError(eventErrors, "location") ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {fieldErrorMessage(eventErrors, "location")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zeitraum</CardTitle>
          <CardDescription>
            Wie genau erinnerst du das Event? Bei groben Erinnerungen (Beispiel: Sommer 2024) reicht
            eine niedrigere Granularität — ehrlicher als erfundene Pseudo-Genauigkeit (ADR-058).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="event-precision">Genauigkeit</Label>
            <select
              id="event-precision"
              value={precision}
              onChange={(e) => setPrecision(e.target.value as TimePrecision)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
              data-testid="event-backfill-precision"
            >
              <option value="minute">Datum + Uhrzeit</option>
              <option value="hour">Datum + Stunde</option>
              <option value="day">Datum</option>
              <option value="month">Monat</option>
              <option value="year">Jahr</option>
            </select>
          </div>
          {precision === "year" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="event-year">Jahr</Label>
              <Input
                id="event-year"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                placeholder="2024"
                data-testid="event-backfill-year"
              />
              {hasFieldError(eventErrors, "started_at") ? (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {fieldErrorMessage(eventErrors, "started_at")}
                </p>
              ) : null}
            </div>
          ) : precision === "month" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-month">Monat</Label>
                <select
                  id="event-month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                  data-testid="event-backfill-month"
                >
                  <option value="">— Monat —</option>
                  <option value="1">Januar</option>
                  <option value="2">Februar</option>
                  <option value="3">März</option>
                  <option value="4">April</option>
                  <option value="5">Mai</option>
                  <option value="6">Juni</option>
                  <option value="7">Juli</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Dezember</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-month-year">Jahr</Label>
                <Input
                  id="event-month-year"
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={2100}
                  value={yearValue}
                  onChange={(e) => setYearValue(e.target.value)}
                  placeholder="2024"
                />
              </div>
            </div>
          ) : precision === "day" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="event-day">Datum</Label>
              <Input
                id="event-day"
                type="date"
                value={dayValue}
                onChange={(e) => setDayValue(e.target.value)}
                data-testid="event-backfill-day"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-started-at">
                  Start {precision === "hour" ? "(Datum + Stunde)" : ""}
                </Label>
                <Input
                  id="event-started-at"
                  type={precision === "hour" ? "datetime-local" : "datetime-local"}
                  value={eventStartedAt}
                  onChange={(e) => setEventStartedAt(e.target.value)}
                  aria-invalid={hasFieldError(eventErrors, "started_at")}
                  data-testid="event-backfill-started-at"
                />
                {hasFieldError(eventErrors, "started_at") ? (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {fieldErrorMessage(eventErrors, "started_at")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-ended-at">Ende (optional)</Label>
                <Input
                  id="event-ended-at"
                  type="datetime-local"
                  value={eventEndedAt}
                  onChange={(e) => setEventEndedAt(e.target.value)}
                  aria-invalid={
                    hasFieldError(eventErrors, "ended_at") || hasFieldError(eventErrors, "duration")
                  }
                  data-testid="event-backfill-ended-at"
                />
                {hasFieldError(eventErrors, "duration") ? (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {fieldErrorMessage(eventErrors, "duration")}
                  </p>
                ) : null}
              </div>
            </div>
          )}
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
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. „Konzert in Bremen"
            maxLength={120}
            data-testid="event-backfill-title"
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
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kontext, Setting, Zusatzinfo…"
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Externe Referenz (optional)</CardTitle>
          <CardDescription>
            Selbstreferenz auf eine externe Quelle des Events (z. B. ursprüngliche 3-Wort-Adresse,
            Projekt-ID, externe URL). Freitext, kein Format-Constraint (ADR-050).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            value={legacyExternalRef}
            onChange={(e) => setLegacyExternalRef(e.target.value)}
            placeholder={"z. B. „w3w://demo.alpha.foxtrot“ oder URL"}
            data-testid="event-backfill-legacy-ref"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stopps</CardTitle>
          <CardDescription>
            Mehrere Applications können nacheinander angelegt werden — Reihenfolge ergibt sich beim
            Speichern automatisch aus den Start-Zeiten.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {applications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Noch kein Stopp erfasst. Mindestens null erlaubt — manche Events sind nur
              Marker ohne Sequenz.
            </p>
          ) : null}
          {applications.map((row, index) => {
            const rowErrors = errorsForApplication(errors, row.uiId);
            return (
              <div
                key={row.uiId}
                data-testid="event-backfill-application-row"
                className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Stopp {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeApplication(row.uiId)}
                    aria-label="Stopp entfernen"
                    data-testid="event-backfill-remove-application"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`app-${row.uiId}-started-at`}>Start</Label>
                    <Input
                      id={`app-${row.uiId}-started-at`}
                      type="datetime-local"
                      value={row.startedAt}
                      onChange={(e) => updateApplication(row.uiId, { startedAt: e.target.value })}
                      aria-invalid={rowErrors.some(
                        (er) =>
                          er.kind === "application" &&
                          (er.field === "started_at" ||
                            er.field === "duration" ||
                            er.field === "bounds" ||
                            er.field === "overlap"),
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`app-${row.uiId}-ended-at`}>Ende (optional)</Label>
                    <Input
                      id={`app-${row.uiId}-ended-at`}
                      type="datetime-local"
                      value={row.endedAt}
                      onChange={(e) => updateApplication(row.uiId, { endedAt: e.target.value })}
                      aria-invalid={rowErrors.some(
                        (er) =>
                          er.kind === "application" &&
                          (er.field === "ended_at" ||
                            er.field === "duration" ||
                            er.field === "bounds"),
                      )}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Begleitung</Label>
                  <RecipientPicker
                    value={row.recipient}
                    onChange={(next) => updateApplication(row.uiId, { recipient: next })}
                    excludePersonIds={[]}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Ausrüstung (optional)</Label>
                  <EquipmentPicker
                    value={row.restraintTypeIds}
                    onChange={(next) => updateApplication(row.uiId, { restraintTypeIds: next })}
                    isAdmin={user.role === "admin"}
                    id={`app-${row.uiId}-restraints`}
                  />
                </div>
                {/* Position-Picker im Plus-Map-UI ausgeblendet. */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`app-${row.uiId}-note`}>Notiz (optional)</Label>
                  <Input
                    id={`app-${row.uiId}-note`}
                    value={row.note}
                    onChange={(e) => updateApplication(row.uiId, { note: e.target.value })}
                    placeholder="Position, Bemerkung…"
                  />
                </div>
                {rowErrors.length > 0 ? (
                  <ul className="space-y-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {rowErrors.map((err, i) => (
                      <li key={`${err.field}-${i}`}>{err.message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            onClick={addApplication}
            data-testid="event-backfill-add-application"
          >
            <Plus aria-hidden /> Application hinzufügen
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-slate-50/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" disabled={pending || !database}>
          {pending ? "Speichere…" : "Tour speichern"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

function localToIso(value: string): string | null {
  if (!value) return null;
  // datetime-local has the form `YYYY-MM-DDTHH:MM` (no timezone). We
  // interpret it in the browser's local zone, which `new Date(...)`
  // does by default for that format, then serialise to ISO-8601 UTC.
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * ADR-058: derive the started_at ISO timestamp from the precision-
 * specific input fields. For year/month/day the timestamp anchors to
 * the first instant of the chosen range; for hour/minute the regular
 * datetime-local field is used.
 */
function precisionStartedIso(
  precision: TimePrecision,
  year: string,
  month: string,
  day: string,
  startedAt: string,
): string | null {
  if (precision === "year") {
    const y = Number(year);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) return null;
    return new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString();
  }
  if (precision === "month") {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) return null;
    if (!Number.isFinite(m) || m < 1 || m > 12) return null;
    return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)).toISOString();
  }
  if (precision === "day") {
    if (!day) return null;
    return new Date(`${day}T00:00:00`).toISOString();
  }
  return localToIso(startedAt);
}

/**
 * ADR-058: derive the ended_at ISO timestamp from precision-specific
 * inputs. For year/month/day there is no separate end-input — the end
 * is conceptually "the same range" and we leave ended_at at null
 * (operator can refine later if a tighter window matters).
 */
function precisionEndedIso(
  precision: TimePrecision,
  _year: string,
  _month: string,
  _day: string,
  endedAt: string,
): string | null {
  if (precision === "year" || precision === "month" || precision === "day") {
    return null;
  }
  return localToIso(endedAt);
}

function hasFieldError(errors: BackfillError[], field: string): boolean {
  return errors.some((e) => e.kind === "event" && e.field === field);
}

function fieldErrorMessage(errors: BackfillError[], field: string): string {
  return errors.find((e) => e.kind === "event" && e.field === field)?.message ?? "";
}
