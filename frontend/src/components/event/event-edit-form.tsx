"use client";

/**
 * Edit form for an existing event (M5c.4, ADR-040).
 *
 * Mutations go through RxDB-Push (ADR-036 §C); REST-PATCH endpoints
 * stay alive for SQLAdmin but the frontend never touches them. The
 * form loads event + applications once from RxDB, lets the user
 * change only the fields the ADR-029 conflict matrix marks as
 * mutable, and patches the changed docs on submit.
 *
 * Editable fields (per ADR-040 §C):
 *   Event       — note (LWW), reveal_participants (LWW), ended_at
 *                 (FWW, only when currently null).
 *   Application — note (LWW), recipient_id (LWW), ended_at (FWW,
 *                 only when currently null).
 *
 * Read-only / immutable fields stay visible but don't render as
 * inputs. Performer-FK and the three position FKs are deliberately
 * not exposed (ADR-040 §K) — corrections happen via soft-delete +
 * fresh entry.
 */

import { Loader2, Trash2 } from "lucide-react";
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
import type { AuthUser } from "@/lib/auth";
import {
  errorsForApplication,
  errorsForEvent,
  validateBackfill,
  type BackfillError,
} from "@/lib/event-backfill-validation";
import { useDatabase } from "@/lib/rxdb/provider";
import type { ApplicationDocType, EventDocType } from "@/lib/rxdb/types";
import type { EventDetail, PersonRead } from "@/lib/types";

const PLATFORM_CONFIRM_LOCK = (message: string): boolean =>
  typeof window === "undefined" ? false : window.confirm(message);

interface EditableEvent {
  endedAt: string; // datetime-local; "" if currently null
  title: string;
  note: string;
  legacyExternalRef: string;
  revealParticipants: boolean;
}

interface EditableApplication {
  id: string;
  startedAt: string; // datetime-local readonly display
  endedAt: string;
  recipientId: string;
  recipientName: string;
  note: string;
  restraintTypeIds: string[];
  // Cached so the diff knows whether `ended_at` was originally null.
  endedAtWasLocked: boolean;
  // Snapshot for diff.
  initial: {
    endedAt: string;
    recipientId: string;
    note: string;
    restraintTypeIds: string[];
  };
}

export interface EventEditFormProps {
  /**
   * Current user — used for the embedded Picker quick-propose copy
   * (Editor → pending vs Admin → auto-approve). The authoritative
   * RBAC gate for the page itself still lives in the server wrapper
   * (`canEditEvent` redirect).
   */
  user: AuthUser;
  initialEvent: EventDetail;
}

export function EventEditForm({ user, initialEvent }: EventEditFormProps) {
  const router = useRouter();
  const database = useDatabase();
  const [event, setEvent] = useState<EditableEvent | null>(null);
  const [eventEndedAtWasLocked, setEventEndedAtWasLocked] = useState<boolean>(false);
  const [eventInitial, setEventInitial] = useState<EditableEvent | null>(null);
  const [applications, setApplications] = useState<EditableApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ADR-057 §E: re-run validateBackfill on every form-state change so
  // bounds/duration violations surface inline instead of waiting for
  // the user to hit submit. Errors are only rendered after the first
  // submit attempt to avoid noisy first-paint complaints about empty
  // fields the user hasn't touched yet.
  const liveErrors = useMemo<BackfillError[]>(() => {
    if (!event) return [];
    const result = validateBackfill({
      lat: typeof initialEvent.lat === "number" ? initialEvent.lat : Number(initialEvent.lat),
      lon: typeof initialEvent.lon === "number" ? initialEvent.lon : Number(initialEvent.lon),
      startedAt: initialEvent.started_at,
      endedAt: localToIso(event.endedAt),
      applications: applications.map((a) => ({
        uiId: a.id,
        startedAt: localToIso(a.startedAt),
        endedAt: localToIso(a.endedAt),
        recipientId: a.recipientId || null,
        note: a.note || null,
      })),
    });
    return result.valid ? [] : result.errors;
  }, [event, applications, initialEvent]);
  const errors = submitAttempted ? liveErrors : liveErrors.filter(isBoundsOrDuration);

  // Load event + applications from RxDB once (ADR-040 §F).
  useEffect(() => {
    if (!database) return;
    let cancelled = false;
    (async () => {
      const eventDoc = await database.events.findOne(initialEvent.id).exec();
      const applicationDocs = await database.applications
        .find({
          selector: { event_id: initialEvent.id, _deleted: { $eq: false } },
          sort: [{ sequence_no: "asc" }],
        })
        .exec();
      if (cancelled) return;
      const eventEditable: EditableEvent = {
        endedAt: isoToLocal(eventDoc?.ended_at ?? initialEvent.ended_at),
        title: eventDoc?.title ?? initialEvent.title ?? "",
        note: eventDoc?.note ?? initialEvent.note ?? "",
        legacyExternalRef: eventDoc?.legacy_external_ref ?? initialEvent.legacy_external_ref ?? "",
        revealParticipants: eventDoc?.reveal_participants ?? initialEvent.reveal_participants,
      };
      setEvent(eventEditable);
      setEventInitial(eventEditable);
      setEventEndedAtWasLocked((eventDoc?.ended_at ?? initialEvent.ended_at) !== null);

      const editableApps: EditableApplication[] = applicationDocs.map((doc) => {
        const json = doc.toJSON() as ApplicationDocType;
        const matchingPerson = initialEvent.participants.find((p) => p.id === json.recipient_id);
        const restraintIds = [...(json.equipment_item_ids ?? [])];
        return {
          id: json.id,
          startedAt: isoToLocal(json.started_at),
          endedAt: isoToLocal(json.ended_at),
          recipientId: json.recipient_id,
          recipientName: matchingPerson?.name ?? json.recipient_id,
          note: json.note ?? "",
          restraintTypeIds: restraintIds,
          endedAtWasLocked: json.ended_at !== null,
          initial: {
            endedAt: isoToLocal(json.ended_at),
            recipientId: json.recipient_id,
            note: json.note ?? "",
            restraintTypeIds: [...restraintIds],
          },
        };
      });
      setApplications(editableApps);
      setLoading(false);
    })().catch((error) => {
      toast.error("Edit-Daten konnten nicht geladen werden", {
        description: error instanceof Error ? error.message : String(error),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [database, initialEvent]);

  const eventErrors = useMemo(() => errorsForEvent(errors), [errors]);

  function patchEvent(patch: Partial<EditableEvent>) {
    setEvent((current) => (current ? { ...current, ...patch } : current));
  }

  function patchApplication(id: string, patch: Partial<EditableApplication>) {
    setApplications((current) => current.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function handleDeleteApplication(id: string): Promise<void> {
    if (!database) return;
    if (!PLATFORM_CONFIRM_LOCK("Stopp endgültig löschen?")) return;
    const doc = await database.applications.findOne(id).exec();
    if (!doc) return;
    const now = new Date().toISOString();
    await doc.patch({ _deleted: true, deleted_at: now, updated_at: now });
    setApplications((current) => current.filter((a) => a.id !== id));
    toast.success("Stopp gelöscht");
  }

  async function handleDeleteEvent(): Promise<void> {
    if (!database) return;
    if (!PLATFORM_CONFIRM_LOCK("Tour endgültig löschen? Alle Stopps werden mitgelöscht."))
      return;
    const doc = await database.events.findOne(initialEvent.id).exec();
    if (!doc) return;
    const now = new Date().toISOString();
    await doc.patch({ _deleted: true, deleted_at: now, updated_at: now });
    toast.success("Tour gelöscht");
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSubmitAttempted(true);
    if (!database || !event || !eventInitial) return;

    if (liveErrors.length > 0) {
      toast.error(`${liveErrors.length} Eingabe-Probleme`, {
        description: "Bitte die markierten Felder prüfen.",
      });
      return;
    }

    setPending(true);
    try {
      const eventDoc = await database.events.findOne(initialEvent.id).exec();
      if (eventDoc) {
        const patch: Partial<EventDocType> = {};
        if (event.title !== eventInitial.title) {
          patch.title = event.title.trim() || null;
        }
        if (event.note !== eventInitial.note) {
          patch.note = event.note.trim() || null;
        }
        if (event.legacyExternalRef !== eventInitial.legacyExternalRef) {
          patch.legacy_external_ref = event.legacyExternalRef.trim() || null;
        }
        if (event.revealParticipants !== eventInitial.revealParticipants) {
          patch.reveal_participants = event.revealParticipants;
        }
        if (eventEndedAtWasLocked === false && event.endedAt !== eventInitial.endedAt) {
          patch.ended_at = localToIso(event.endedAt);
        }
        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString();
          await eventDoc.patch(patch);
        }
      }

      for (const app of applications) {
        const doc = await database.applications.findOne(app.id).exec();
        if (!doc) continue;
        const patch: Partial<ApplicationDocType> = {};
        if (app.note !== app.initial.note) {
          patch.note = app.note.trim() || null;
        }
        if (app.recipientId && app.recipientId !== app.initial.recipientId) {
          patch.recipient_id = app.recipientId;
        }
        if (app.endedAtWasLocked === false && app.endedAt !== app.initial.endedAt) {
          patch.ended_at = localToIso(app.endedAt);
        }
        if (!setEquals(app.restraintTypeIds, app.initial.restraintTypeIds)) {
          patch.equipment_item_ids = [...app.restraintTypeIds];
        }
        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString();
          await doc.patch(patch);
        }
      }

      toast.success("Änderungen gespeichert", {
        description: "Sync läuft im Hintergrund.",
      });
      router.push(`/events/${initialEvent.id}`);
      router.refresh();
    } catch (error) {
      toast.error("Speichern fehlgeschlagen", {
        description: error instanceof Error ? error.message : String(error),
      });
      setPending(false);
    }
  }

  if (loading || !event) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tour</CardTitle>
          <CardDescription>
            Standort und Start-Zeitstempel sind aus Live-Modus-Konsistenz fixiert (ADR-029) und
            nicht editierbar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div>
              <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Start</span>
              <p className="font-mono">
                {new Date(initialEvent.started_at).toLocaleString("de-DE")}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Standort</span>
              <p className="font-mono">
                {numericLat(initialEvent.lat).toFixed(5)}, {numericLat(initialEvent.lon).toFixed(5)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="event-edit-ended-at">
              Ende {eventEndedAtWasLocked ? "(bereits gesetzt, FWW)" : "(optional)"}
            </Label>
            <Input
              id="event-edit-ended-at"
              type="datetime-local"
              value={event.endedAt}
              onChange={(e) => patchEvent({ endedAt: e.target.value })}
              disabled={eventEndedAtWasLocked}
              data-testid="event-edit-ended-at"
              aria-invalid={hasFieldError(eventErrors, "duration")}
            />
            {hasFieldError(eventErrors, "duration") ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {fieldErrorMessage(eventErrors, "duration")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="event-edit-title">Titel (optional, max. 120 Zeichen)</Label>
            <Input
              id="event-edit-title"
              type="text"
              value={event.title}
              onChange={(e) => patchEvent({ title: e.target.value })}
              maxLength={120}
              placeholder="z. B. „Konzert in Bremen"
              data-testid="event-edit-title"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="event-edit-note">Notiz</Label>
            <textarea
              id="event-edit-note"
              value={event.note}
              onChange={(e) => patchEvent({ note: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="event-edit-legacy-ref">Externe Referenz (optional)</Label>
            <Input
              id="event-edit-legacy-ref"
              type="text"
              value={event.legacyExternalRef}
              onChange={(e) => patchEvent({ legacyExternalRef: e.target.value })}
              placeholder={"z. B. „w3w://demo.alpha.foxtrot“ oder URL"}
              data-testid="event-edit-legacy-ref"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={event.revealParticipants}
              onChange={(e) => patchEvent({ revealParticipants: e.target.checked })}
              data-testid="event-edit-reveal"
            />
            Beteiligten-Namen sichtbar (`reveal_participants`)
          </label>
          <div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={pending}
              data-testid="event-edit-delete"
            >
              <Trash2 aria-hidden /> Event löschen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stopps</CardTitle>
          <CardDescription>
            Start-Zeitstempel und Erfasser sind fixiert. Ausrüstung ist über den Picker editierbar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {applications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Keine Stopps vorhanden.
            </p>
          ) : null}
          {applications.map((app, index) => {
            const rowErrors = errorsForApplication(errors, app.id);
            return (
              <div
                key={app.id}
                data-testid="event-edit-application-row"
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
                    onClick={() => handleDeleteApplication(app.id)}
                    aria-label="Stopp löschen"
                    data-testid="event-edit-delete-application"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <Label>Start (fixiert)</Label>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {app.startedAt || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`app-edit-${app.id}-ended-at`}>
                      Ende {app.endedAtWasLocked ? "(FWW, fixiert)" : ""}
                    </Label>
                    <Input
                      id={`app-edit-${app.id}-ended-at`}
                      type="datetime-local"
                      value={app.endedAt}
                      onChange={(e) => patchApplication(app.id, { endedAt: e.target.value })}
                      disabled={app.endedAtWasLocked}
                      aria-invalid={rowErrors.length > 0}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Begleitung</Label>
                  <RecipientPicker
                    value={
                      {
                        id: app.recipientId,
                        name: app.recipientName,
                        alias: null,
                        note: null,
                        origin: "managed",
                        linkable: false,
                        is_deleted: false,
                        deleted_at: null,
                        created_at: new Date(0).toISOString(),
                      } as PersonRead
                    }
                    onChange={(next) =>
                      patchApplication(app.id, {
                        recipientId: next?.id ?? "",
                        recipientName: next?.name ?? "",
                      })
                    }
                    excludePersonIds={[]}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Ausrüstung (optional)</Label>
                  <EquipmentPicker
                    value={app.restraintTypeIds}
                    onChange={(next) => patchApplication(app.id, { restraintTypeIds: next })}
                    isAdmin={user.role === "admin"}
                    id={`app-edit-${app.id}-restraints`}
                  />
                </div>
                {/* Position-Picker im Plus-Map-UI ausgeblendet. */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`app-edit-${app.id}-note`}>Notiz</Label>
                  <Input
                    id={`app-edit-${app.id}-note`}
                    value={app.note}
                    onChange={(e) => patchApplication(app.id, { note: e.target.value })}
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
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-slate-50/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Speichere…
            </>
          ) : (
            "Änderungen speichern"
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

function isoToLocal(value: string | null | undefined): string {
  if (!value) return "";
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return "";
  // datetime-local wants `YYYY-MM-DDTHH:MM` in local time without zone.
  const date = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localToIso(value: string): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function numericLat(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function hasFieldError(errors: BackfillError[], field: string): boolean {
  return errors.some((e) => e.kind === "event" && e.field === field);
}

function fieldErrorMessage(errors: BackfillError[], field: string): string {
  return errors.find((e) => e.kind === "event" && e.field === field)?.message ?? "";
}

function setEquals(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const item of b) {
    if (!set.has(item)) return false;
  }
  return true;
}

function isBoundsOrDuration(err: BackfillError): boolean {
  if (err.kind === "event") return err.field === "duration";
  return err.field === "bounds" || err.field === "duration" || err.field === "overlap";
}
