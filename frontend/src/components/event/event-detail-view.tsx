"use client";

/**
 * Unified event detail view (M5c.2, ADR-038).
 *
 * Replaces the previous `LiveEventView` + `EndedEventView` split: the
 * same component now renders running and ended events. Three sections:
 *
 *   1. Status card (location, plus-code, total timer; live-action
 *      buttons only when `isLive`).
 *   2. Applications timeline — chronological list with explicit
 *      "Pause" markers between completed applications, so the
 *      material-change gaps from ADR-011 §6 are visible.
 *   3. Participants list, masked client-side via `maskParticipants`
 *      (ADR-038 §C). The backend already masks names; this is the
 *      defense-in-depth step described in ADR-036 §B.
 */

import { Flag, Pause, Pencil, Play, Plus, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ApplicationStartSheet } from "@/components/event/application-start-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { useWakeLock } from "@/hooks/use-wake-lock";
import type { AuthUser } from "@/lib/auth";
import { useCatalogList } from "@/lib/catalog/api";
import { diffSeconds, formatDuration } from "@/lib/duration";
import { isMasked, maskParticipants } from "@/lib/masking";
import { formatEventTime } from "@/lib/event-time";
import { canEditEvent } from "@/lib/rbac";
import { useDatabase } from "@/lib/rxdb/provider";
import type { ApplicationDocType, EventDocType } from "@/lib/rxdb/types";
import { coerceNumber, type EventDetail, type PersonRead, type TimePrecision } from "@/lib/types";

const RECIPIENT_DRAFT_PREFIX = "hcmap:event-recipient:";

export interface EventDetailViewProps {
  user: AuthUser;
  initialEvent: EventDetail;
}

export function EventDetailView({ user, initialEvent }: EventDetailViewProps) {
  const router = useRouter();
  const database = useDatabase();
  const now = useNow(1000);
  const [startOpen, setStartOpen] = useState(false);

  const eventDoc = useEventDoc(initialEvent.id);
  const applications = useApplications(initialEvent.id);

  const event = useMemo<MergedEvent>(
    () => mergeEvent(initialEvent, eventDoc),
    [initialEvent, eventDoc],
  );
  const isLive = event.ended_at === null;
  useWakeLock(isLive);

  const totalSeconds = isLive
    ? Math.max(0, Math.round((now - Date.parse(event.started_at)) / 1000))
    : event.ended_at
      ? diffSeconds(event.started_at, event.ended_at)
      : 0;

  const activeApplication = applications.find((a) => a.ended_at === null) ?? null;

  const maskedParticipants = useMemo(
    () => maskParticipants(event.participants, event, user.person_id),
    [event, user.person_id],
  );

  const recipientPerson = pickRecipientPerson(
    applications,
    maskedParticipants,
    user.person_id,
    initialEvent.id,
  );

  async function handleEndApplication(applicationId: string): Promise<void> {
    if (!database) return;
    const doc = await database.applications.findOne(applicationId).exec();
    if (!doc) {
      toast.error("Stopp nicht im lokalen Speicher gefunden");
      return;
    }
    const now = new Date().toISOString();
    await doc.patch({ ended_at: now, updated_at: now });
  }

  async function handleToggleReveal(next: boolean): Promise<void> {
    if (!database) return;
    const doc = await database.events.findOne(initialEvent.id).exec();
    if (!doc) {
      toast.error("Tour nicht im lokalen Speicher gefunden");
      return;
    }
    const now = new Date().toISOString();
    await doc.patch({ reveal_participants: next, updated_at: now });
    toast.success(next ? "Namen für dich freigegeben" : "Namen wieder verborgen", {
      description: "Audit-pflichtige Aktion — wird über Sync protokolliert.",
    });
  }

  async function handleEndEvent(): Promise<void> {
    if (!database) return;
    const doc = await database.events.findOne(initialEvent.id).exec();
    if (!doc) {
      toast.error("Tour nicht im lokalen Speicher gefunden");
      return;
    }
    const now = new Date().toISOString();
    await doc.patch({ ended_at: now, updated_at: now });
    toast.success("Tour beendet", { description: "Wakelock freigegeben." });
    router.push("/");
    router.refresh();
  }

  const editable = canEditEvent(user, { created_by: initialEvent.created_by });

  return (
    <div className="flex flex-col gap-4" data-testid="event-detail-view">
      <Card>
        <CardHeader>
          {event.title?.trim() ? (
            <p
              className="text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100"
              data-testid="event-detail-title"
            >
              {event.title.trim()}
            </p>
          ) : null}
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span>{isLive ? "Tour läuft" : "Tour beendet"}</span>
            <span className="font-mono text-2xl tabular-nums">{formatDuration(totalSeconds)}</span>
          </CardTitle>
          <CardDescription>
            <span data-testid="event-detail-time">
              {formatEventTime(event.started_at, event.time_precision)}
            </span>
            {" · "}
            Standort: {coerceNumber(event.lat).toFixed(5)}, {coerceNumber(event.lon).toFixed(5)}
            {event.plus_code ? ` · Plus Code ${event.plus_code}` : ""}
          </CardDescription>
          {event.legacy_external_ref?.trim() ? (
            <p
              className="pt-1 text-xs text-slate-500 dark:text-slate-400"
              data-testid="event-detail-legacy-ref"
            >
              <span className="font-medium">Externe Referenz:</span>{" "}
              <span className="break-all font-mono">{event.legacy_external_ref}</span>
            </p>
          ) : null}
          {editable ? (
            <div className="pt-1">
              <Button asChild variant="secondary" size="sm" data-testid="edit-event-button">
                <Link href={`/events/${initialEvent.id}/edit`}>
                  <Pencil aria-hidden /> Bearbeiten
                </Link>
              </Button>
            </div>
          ) : null}
        </CardHeader>
        {isLive ? (
          <CardContent className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Button size="lg" onClick={() => setStartOpen(true)} disabled={!database}>
                <Plus aria-hidden /> Neuer Stopp
              </Button>
              {activeApplication ? (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => handleEndApplication(activeApplication.id)}
                  disabled={!database}
                >
                  <Pause aria-hidden /> Aktuellen beenden
                </Button>
              ) : (
                <Button size="lg" variant="secondary" disabled>
                  <Play aria-hidden /> Kein laufender Stopp
                </Button>
              )}
            </div>
            <Button size="lg" variant="destructive" onClick={handleEndEvent} disabled={!database}>
              <Flag aria-hidden /> Tour beenden
            </Button>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stopps</CardTitle>
          <CardDescription>
            {applications.length === 0
              ? "Noch kein Stopp erfasst."
              : `${applications.length} Stopp${applications.length === 1 ? "" : "s"} in Reihenfolge.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!database ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : applications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLive
                ? "Tippe auf „Neuer Stopp“, um den ersten zu starten."
                : "In dieser Tour wurden keine Stopps erfasst."}
            </p>
          ) : (
            <ApplicationsTimeline
              applications={applications}
              now={now}
              isLive={isLive}
              onStop={isLive ? handleEndApplication : undefined}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mit dabei</CardTitle>
          <CardDescription>
            {maskedParticipants.length === 0
              ? "Noch keine Begleitung erfasst."
              : event.reveal_participants
                ? `${maskedParticipants.length} Personen sichtbar.`
                : "Andere Begleitung wird verborgen."}
          </CardDescription>
          {editable ? (
            <RevealParticipantsToggle
              checked={event.reveal_participants}
              onChange={handleToggleReveal}
            />
          ) : null}
        </CardHeader>
        <CardContent>
          <ParticipantsList participants={maskedParticipants} currentPersonId={user.person_id} />
        </CardContent>
      </Card>

      <ApplicationStartSheet
        open={startOpen}
        onOpenChange={setStartOpen}
        eventId={initialEvent.id}
        performerPersonId={user.person_id}
        currentUserRole={user.role}
        defaultRecipient={recipientPerson}
        onCreated={() => {
          // Reactive subscription updates the list automatically.
        }}
      />
    </div>
  );
}

interface MergedEvent {
  id: string;
  started_at: string;
  ended_at: string | null;
  lat: number | string;
  lon: number | string;
  title: string | null;
  note: string | null;
  legacy_external_ref: string | null;
  time_precision: TimePrecision;
  plus_code: string;
  participants: readonly PersonRead[];
  reveal_participants: boolean;
}

function mergeEvent(server: EventDetail, doc: EventDocType | null): MergedEvent {
  if (!doc) return server;
  return {
    id: doc.id,
    started_at: doc.started_at,
    ended_at: doc.ended_at,
    lat: doc.lat,
    lon: doc.lon,
    title: doc.title,
    note: doc.note,
    legacy_external_ref: doc.legacy_external_ref,
    time_precision: doc.time_precision ?? "minute",
    plus_code: server.plus_code,
    participants: server.participants,
    reveal_participants: doc.reveal_participants,
  };
}

function useEventDoc(eventId: string): EventDocType | null {
  const database = useDatabase();
  const [doc, setDoc] = useState<EventDocType | null>(null);
  useEffect(() => {
    if (!database) return;
    const sub = database.events
      .findOne(eventId)
      .$.subscribe((next) => setDoc(next ? (next.toJSON() as EventDocType) : null));
    return () => sub.unsubscribe();
  }, [database, eventId]);
  return doc;
}

function useApplications(eventId: string): ApplicationDocType[] {
  const database = useDatabase();
  const [docs, setDocs] = useState<ApplicationDocType[]>([]);
  useEffect(() => {
    if (!database) return;
    const sub = database.applications
      .find({
        selector: { event_id: eventId, _deleted: { $eq: false } },
        sort: [{ sequence_no: "asc" }],
      })
      .$.subscribe((rows) => setDocs(rows.map((r) => r.toJSON() as ApplicationDocType)));
    return () => sub.unsubscribe();
  }, [database, eventId]);
  return docs;
}

/**
 * Render the chronological application list and surface the gap
 * between two completed applications as an explicit "Pause" row
 * (ADR-038 §B). A gap requires both the previous `ended_at` and the
 * next `started_at` to be set; running or not-yet-started applications
 * don't produce a gap.
 */
function ApplicationsTimeline({
  applications,
  now,
  isLive,
  onStop,
}: {
  applications: ApplicationDocType[];
  now: number;
  isLive: boolean;
  onStop?: (applicationId: string) => Promise<void> | void;
}) {
  // M7.5: resolve equipment_item_ids → display names via the M7.x
  // catalog cache. Same query key the picker uses, so this view shares
  // a single fetch with the picker on the same page.
  const restraints = useCatalogList("equipment-items", { status: "approved", limit: 200 });
  const restraintNames = useMemo(() => {
    const map = new Map<string, string>();
    const items = restraints.data?.items ?? [];
    for (const item of items) {
      map.set(item.id, item.display_name);
    }
    return map;
  }, [restraints.data]);

  type Item =
    | { kind: "app"; app: ApplicationDocType }
    | { kind: "gap"; key: string; durationSeconds: number };

  const items: Item[] = [];
  for (let i = 0; i < applications.length; i += 1) {
    const app = applications[i]!;
    if (i > 0) {
      const previous = applications[i - 1]!;
      const previousEnded = previous.ended_at;
      const nextStarted = app.started_at;
      if (previousEnded && nextStarted) {
        const gapSeconds = diffSeconds(previousEnded, nextStarted);
        if (gapSeconds >= 1) {
          items.push({
            kind: "gap",
            key: `gap-${previous.id}-${app.id}`,
            durationSeconds: gapSeconds,
          });
        }
      }
    }
    items.push({ kind: "app", app });
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="applications-timeline">
      {items.map((item) => {
        if (item.kind === "gap") {
          return (
            <li
              key={item.key}
              data-testid="applications-timeline-gap"
              className="flex items-center gap-2 px-3 text-xs text-slate-500 dark:text-slate-400"
            >
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden />
              <span className="font-mono tabular-nums">
                Pause · {formatDuration(item.durationSeconds)}
              </span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden />
            </li>
          );
        }
        const application = item.app;
        const startedAt = application.started_at;
        const endedAt = application.ended_at;
        const seconds = startedAt
          ? endedAt
            ? diffSeconds(startedAt, endedAt)
            : Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000))
          : 0;
        const isActive = endedAt === null;
        return (
          <li
            key={application.id}
            data-testid="applications-timeline-app"
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  #{application.sequence_no}
                </span>
                <span
                  className={
                    isActive
                      ? "inline-flex h-2 w-2 rounded-full bg-emerald-500"
                      : "inline-flex h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600"
                  }
                  aria-hidden
                />
                <span className="text-sm">{isActive ? "läuft" : "beendet"}</span>
              </div>
              {application.equipment_item_ids.length > 0 ? (
                <ul
                  className="flex flex-wrap gap-1 pt-1"
                  data-testid="applications-timeline-app-restraints"
                >
                  {application.equipment_item_ids.map((rtId) => (
                    <li key={rtId}>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {restraintNames.get(rtId) ?? `Unbekannt (${rtId.slice(0, 8)})`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {application.note ? (
                <p className="truncate pt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {application.note}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base tabular-nums">{formatDuration(seconds)}</span>
              {isLive && isActive && onStop ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void onStop(application.id)}
                  data-testid="applications-timeline-stop"
                  aria-label={`Stopp #${application.sequence_no} beenden`}
                >
                  <Square aria-hidden /> Stop
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RevealParticipantsToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => Promise<void> | void;
}) {
  return (
    <label
      className="mt-2 flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/40"
      data-testid="reveal-participants-toggle"
    >
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => void onChange(event.target.checked)}
          data-testid="reveal-participants-checkbox"
        />
        <span className="font-medium">Namen sichtbar</span>
      </span>
      <span className="text-xs italic text-slate-600 dark:text-slate-400">
        Audit-pflichtige Aktion — wird protokolliert.
      </span>
    </label>
  );
}

function ParticipantsList({
  participants,
  currentPersonId,
}: {
  participants: readonly PersonRead[];
  currentPersonId: string;
}) {
  if (participants.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Keine Begleitung erfasst.</p>;
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="participants-list">
      {participants.map((person) => {
        const masked = isMasked(person);
        const isSelf = person.id === currentPersonId;
        return (
          <li
            key={person.id}
            data-testid="participants-list-item"
            data-masked={masked ? "true" : "false"}
            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
          >
            <span
              className={
                masked
                  ? "italic text-slate-500 dark:text-slate-400"
                  : "text-slate-900 dark:text-slate-100"
              }
            >
              {person.name}
            </span>
            {person.alias ? (
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                · {person.alias}
              </span>
            ) : null}
            {isSelf ? (
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Du
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function pickRecipientPerson(
  applications: readonly ApplicationDocType[],
  participants: readonly PersonRead[],
  excludePersonId: string,
  eventId: string,
): PersonRead | null {
  // Prefer the most recent application's recipient.
  for (let i = applications.length - 1; i >= 0; i -= 1) {
    const candidateId = applications[i]?.recipient_id;
    if (!candidateId || candidateId === excludePersonId) continue;
    const match = participants.find((p) => p.id === candidateId);
    if (match) return match;
  }
  // Fall back to the recipient drafted in the create form (sessionStorage).
  if (typeof window === "undefined") return null;
  let draftId: string | null = null;
  try {
    draftId = window.sessionStorage.getItem(`${RECIPIENT_DRAFT_PREFIX}${eventId}`);
  } catch {
    return null;
  }
  if (!draftId) return null;
  return participants.find((p) => p.id === draftId) ?? null;
}
