"use client";

/**
 * Event detail page — client-only render (M5c.1a, ADR-036).
 *
 * Replaces the previous Server Component that called `getServerMe()` and
 * SSR-fetched the event before any HTML left the server. The
 * client-only flow:
 *
 *  1. `useMe()` (TanStack Query) gives us the user; we redirect to
 *     `/login?next=...` if anonymous.
 *  2. `useEventDoc(id)` subscribes to RxDB so live updates flow into the
 *     page reactively (matches the M5b.3 read path).
 *  3. `useEventDetailFetch(id)` does ONE REST GET for `plus_code` and
 *     `participants` — these don't live in RxDB yet (M5c.1b will move
 *     participants into a sync collection).
 *  4. The render decision tree — see ADR-036 §H — combines both signals:
 *     - both still loading → skeleton
 *     - REST 404 + RxDB null → next/navigation `notFound()`
 *     - REST OK → use the server detail
 *     - REST failed/404 + RxDB has it → synthesize a minimal
 *       `EventDetail` from the doc so the offline-insert-direct-nav case
 *       renders the event instead of 404.
 *
 * The downstream `EventDetailView` (M5c.2, ADR-038) renders both
 * running and ended events in the same component tree, so the page
 * itself does not branch on `ended_at`.
 */

import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EventDetailView } from "@/components/event/event-detail-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useDatabase } from "@/lib/rxdb/provider";
import type { EventDocType, EventParticipantDocType } from "@/lib/rxdb/types";
import { type EventDetail, type PersonRead } from "@/lib/types";

type RxdbState = { resolved: false; doc: null } | { resolved: true; doc: EventDocType | null };

type ServerState =
  | { status: "loading" }
  | { status: "ok"; detail: EventDetail }
  | { status: "not-found" }
  | { status: "error" };

export default function EventDetailPage() {
  // `useParams()` reads the dynamic segment client-side without
  // suspending — App Router's `params` Promise was a poor fit because
  // suspending the entire page on a synchronous route segment hurts
  // both UX and testability.
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const me = useMe();
  const database = useDatabase();
  const [rxdb, setRxdb] = useState<RxdbState>({ resolved: false, doc: null });
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [server, setServer] = useState<ServerState>({ status: "loading" });
  // `serverFetchVersion` increments to trigger a REST refetch when the
  // RxDB participant set surfaces a person the snapshot doesn't yet
  // know — typical case is the auto-participant after an offline
  // application reconnects (ADR-037 §E).
  const [serverFetchVersion, setServerFetchVersion] = useState(0);

  // RxDB subscription: tracks the event doc reactively. The `resolved`
  // flag distinguishes "haven't heard back yet" from "RxDB definitely
  // doesn't have this id" — we need that disambiguation for the
  // hard-404 branch.
  useEffect(() => {
    if (!database) return;
    setRxdb({ resolved: false, doc: null });
    const sub = database.events.findOne(id).$.subscribe((next) => {
      setRxdb({ resolved: true, doc: next ? (next.toJSON() as EventDocType) : null });
    });
    return () => sub.unsubscribe();
  }, [database, id]);

  // RxDB subscription for the participant set (M5c.1b, ADR-037 §I).
  // Only the person_ids — Person details (name/alias) still come from
  // the REST snapshot below; the hybrid is documented in ADR-037 §E.
  useEffect(() => {
    if (!database) return;
    const sub = database.event_participants
      .find({ selector: { event_id: id, _deleted: { $eq: false } } })
      .$.subscribe((rows) => {
        const next = rows.map((r) => (r.toJSON() as EventParticipantDocType).person_id).sort();
        setParticipantIds((current) =>
          current.length === next.length && current.every((v, i) => v === next[i]) ? current : next,
        );
      });
    return () => sub.unsubscribe();
  }, [database, id]);

  // One-shot REST fetch for fields not yet in RxDB (`plus_code`) plus
  // the Person details that back the participant list. Re-runs when
  // `serverFetchVersion` bumps — see the "missing-name → refetch" effect
  // below.
  useEffect(() => {
    let cancelled = false;
    setServer({ status: "loading" });
    apiFetch<EventDetail>(`/api/events/${id}`)
      .then((detail) => {
        if (cancelled) return;
        setServer({ status: "ok", detail });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setServer({ status: "not-found" });
        } else {
          setServer({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, serverFetchVersion]);

  // Trigger a REST refetch when the RxDB participant set has at least
  // one id that the latest server snapshot doesn't know about. This
  // closes the offline-application → reconnect → auto-participant
  // round-trip without polling (ADR-037 §E).
  useEffect(() => {
    if (server.status !== "ok") return;
    if (participantIds.length === 0) return;
    const known = new Set(server.detail.participants.map((p) => p.id));
    const hasUnknown = participantIds.some((pid) => !known.has(pid));
    if (hasUnknown) {
      setServerFetchVersion((v) => v + 1);
    }
  }, [participantIds, server]);

  // Auth gating. `useMe()` resolves to `null` for anonymous users; we
  // bounce to login and pass `next` so the post-login redirect lands
  // back here.
  useEffect(() => {
    if (!me.isPending && me.data === null) {
      router.replace(`/login?next=/events/${id}`);
    }
  }, [me.isPending, me.data, router, id]);

  // Auth still resolving or anonymous → skeleton (the redirect effect
  // above moves the page along).
  const user = me.data;
  if (me.isPending || !user) {
    return <DetailSkeleton />;
  }

  // Both data sources still pending → skeleton.
  if (!rxdb.resolved && server.status === "loading") {
    return <DetailSkeleton />;
  }

  // Hard 404: server is sure it's gone AND RxDB doesn't have it.
  if (rxdb.resolved && rxdb.doc === null && server.status === "not-found") {
    notFound();
  }

  // Pick the source of truth for the initial event payload.
  const initial = pickInitialEvent(server, rxdb, participantIds);
  if (!initial) {
    // REST is loading and RxDB has nothing yet — keep showing skeleton.
    if (server.status === "loading" || (server.status === "error" && !rxdb.resolved)) {
      return <DetailSkeleton />;
    }
    // REST failed and RxDB resolved-empty → can't render anything useful.
    return <UnavailableCard />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {initial.ended_at === null ? "Live-Tour" : "Tour"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gestartet am {new Date(initial.started_at).toLocaleString("de-DE")}
          {initial.ended_at
            ? ` · beendet ${new Date(initial.ended_at).toLocaleString("de-DE")}`
            : ""}
        </p>
      </header>
      <EventDetailView user={user} initialEvent={initial} />
    </div>
  );
}

/**
 * Decide which payload to render with.
 *
 * REST OK is always preferred (it carries `plus_code` and the full
 * `Person` details). When REST has failed or returned 404 but RxDB has
 * the doc — the offline-insert-then-direct-nav case — we fall back to
 * a synthesized `EventDetail` whose `plus_code` is empty and whose
 * `participants` list is built from the RxDB participant ids
 * (anonymous placeholders until the server delivers names; see
 * ADR-037 §E).
 *
 * If REST returned a snapshot, we still merge in the live participant
 * ids from RxDB — they are the source of truth for membership. Person
 * details fall back to the snapshot's name if available, otherwise to
 * an anonymous "?" placeholder until the next REST refetch.
 */
function pickInitialEvent(
  server: ServerState,
  rxdb: RxdbState,
  participantIds: string[],
): EventDetail | null {
  if (server.status === "ok") {
    return mergeParticipants(server.detail, participantIds);
  }
  if (rxdb.resolved && rxdb.doc) {
    return synthesizeFromRxdb(rxdb.doc, participantIds);
  }
  return null;
}

function mergeParticipants(detail: EventDetail, rxdbIds: string[]): EventDetail {
  if (rxdbIds.length === 0) return detail;
  const byId = new Map(detail.participants.map((p) => [p.id, p]));
  const merged: PersonRead[] = rxdbIds.map((id) => byId.get(id) ?? anonymousPerson(id));
  return { ...detail, participants: merged };
}

function synthesizeFromRxdb(doc: EventDocType, participantIds: string[]): EventDetail {
  return {
    id: doc.id,
    started_at: doc.started_at,
    ended_at: doc.ended_at,
    lat: doc.lat,
    lon: doc.lon,
    reveal_participants: doc.reveal_participants,
    title: doc.title,
    note: doc.note,
    time_precision: doc.time_precision ?? "minute",
    legacy_external_ref: doc.legacy_external_ref,
    created_by: doc.created_by,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    plus_code: "",
    participants: participantIds.map(anonymousPerson),
  };
}

function anonymousPerson(personId: string): PersonRead {
  return {
    id: personId,
    name: "…",
    alias: null,
    note: null,
    origin: "managed",
    linkable: false,
    is_deleted: false,
    deleted_at: null,
    created_at: new Date(0).toISOString(),
  };
}

function DetailSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4"
      data-testid="event-detail-skeleton"
    >
      <header className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </header>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function UnavailableCard() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tour</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Konnte nicht geladen werden.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backend nicht erreichbar</CardTitle>
          <CardDescription>Bitte später erneut versuchen.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link href="/">Zurück zum Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
