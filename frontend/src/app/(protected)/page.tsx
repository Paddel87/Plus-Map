import { Calendar, Clock, Map as MapIcon, NotebookPen } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerMe } from "@/lib/auth-server";
import { formatEventTime } from "@/lib/event-time";
import { coerceNumber, type TimePrecision } from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

interface EventListItem {
  id: string;
  started_at: string;
  ended_at: string | null;
  lat: number | string;
  lon: number | string;
  title: string | null;
  note: string | null;
  time_precision: TimePrecision;
}

interface EventListResponse {
  items: EventListItem[];
  total: number;
}

interface ThrowbackItem {
  id: string;
  started_at: string;
  note: string | null;
  years_ago: number;
}

async function loadServerData<T>(path: string, cookieHeader: string): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const user = await getServerMe();
  if (!user) return null;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [events, throwbacks] = await Promise.all([
    loadServerData<EventListResponse>("/api/events?limit=5", cookieHeader),
    loadServerData<ThrowbackItem[]>("/api/throwbacks/today", cookieHeader),
  ]);
  const greeting = user.display_name?.trim() || user.email;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Hallo, {greeting}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rolle: <span className="font-medium">{user.role}</span>
        </p>
      </header>
      {user.role !== "viewer" ? (
        <section
          className="flex flex-col gap-2 md:flex-row md:items-center"
          data-testid="dashboard-event-actions"
        >
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/events/new" data-testid="dashboard-new-event">
              <Clock className="mr-2 h-5 w-5" />
              Neue Tour starten
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full md:w-auto">
            <Link href="/events/new/backfill" data-testid="dashboard-backfill-event">
              <NotebookPen className="mr-2 h-5 w-5" />
              Nachträglich erfassen
            </Link>
          </Button>
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" /> Letzte Events
            </CardTitle>
            <CardDescription>
              {events ? `${events.total} sichtbar (RLS-gefiltert)` : "Backend nicht erreichbar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {events && events.items.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {events.items.map((event) => {
                  const trimmedTitle = event.title?.trim();
                  const timeLabel = formatEventTime(
                    event.started_at,
                    event.time_precision ?? "minute",
                  );
                  return (
                    <li key={event.id}>
                      <Link
                        href={`/events/${event.id}`}
                        className="flex flex-col gap-0.5 rounded-md border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                      >
                        <span className="font-medium">{trimmedTitle ?? timeLabel}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {trimmedTitle ? `${timeLabel} · ` : ""}
                          {coerceNumber(event.lat).toFixed(4)}, {coerceNumber(event.lon).toFixed(4)}
                          {event.note ? ` — ${event.note}` : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Noch keine Touren sichtbar. Tippe oben auf „Neue Tour starten“.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="h-5 w-5" /> An diesem Tag
            </CardTitle>
            <CardDescription>Touren vom heutigen Datum in vergangenen Jahren</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {throwbacks && throwbacks.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {throwbacks.map((tb) => (
                  <li key={tb.id}>
                    <Link
                      href={`/events/${tb.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <span>{new Date(tb.started_at).toLocaleDateString("de-DE")}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        vor {tb.years_ago} {tb.years_ago === 1 ? "Jahr" : "Jahren"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">Heute keine Treffer.</p>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schnelleinstieg</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Button asChild variant="secondary">
              <Link href="/events">Touren</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/map">Karte</Link>
            </Button>
            {user.role === "admin" ? (
              <Button asChild variant="secondary">
                <Link href="/admin">Admin</Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/profile">Profil</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
