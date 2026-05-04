"use client";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminExportUrl, useAdminStats } from "@/lib/admin/api";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export default function AdminPage() {
  const { data, isLoading, isError, error } = useAdminStats();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin-Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Überblick und Workflow-Aktionen. Stammdaten-Pflege liegt unter
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
            /admin
          </code>
          (SQLAdmin, ADR-016).
        </p>
        <nav className="flex gap-3 text-sm">
          <Link className="text-blue-600 underline dark:text-blue-400" href="/admin/users">
            User-Verwaltung
          </Link>
          <Link className="text-blue-600 underline dark:text-blue-400" href="/admin/persons">
            Personen-Verwaltung
          </Link>
          <a
            className="text-blue-600 underline dark:text-blue-400"
            href={adminExportUrl()}
            download="plus-map-export.json"
          >
            Export herunterladen
          </a>
        </nav>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-500">Lade Kennzahlen…</CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            Stats konnten nicht geladen werden: {error instanceof Error ? error.message : "?"}
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Touren gesamt" value={data.events_total} />
            <StatCard label="Personen" value={data.persons_total} />
            <StatCard
              label="On-the-fly, unverknüpft"
              value={data.persons_on_the_fly_unlinked}
              accent={data.persons_on_the_fly_unlinked > 0 ? "warning" : undefined}
            />
            <StatCard
              label="Pending Vorschläge"
              value={data.pending_catalog_proposals}
              accent={data.pending_catalog_proposals > 0 ? "warning" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Touren pro Monat (letzte 12)</CardTitle>
                <CardDescription>Chronologisch, ohne Soft-Deleted.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.events_per_month_last_12.length === 0 ? (
                  <EmptyHint>Keine Touren in den letzten 12 Monaten.</EmptyHint>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.events_per_month_last_12.map((m) => (
                      <li
                        key={`${m.year}-${m.month}`}
                        className="flex items-baseline justify-between py-1.5 text-sm"
                      >
                        <span>
                          {MONTH_LABELS[m.month - 1]} {m.year}
                        </span>
                        <span className="font-mono">{m.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">User-Verteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {(["admin", "editor", "viewer"] as const).map((role) => (
                    <li key={role} className="flex items-baseline justify-between">
                      <span className="capitalize">{role}</span>
                      <span className="font-mono">{data.users_by_role[role] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TopList
              title="Top Ausrüstung"
              items={data.top_restraints.map((r) => ({
                id: r.id,
                label: r.display_name,
                count: r.count,
              }))}
            />
            <TopList
              title="Top Trage-Modi"
              items={data.top_arm_positions.map((p) => ({
                id: p.id,
                label: p.name,
                count: p.count,
              }))}
            />
            <TopList
              title="Top Halte-Positionen"
              items={data.top_hand_positions.map((p) => ({
                id: p.id,
                label: p.name,
                count: p.count,
              }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "warning" }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span
          className={
            accent === "warning"
              ? "font-mono text-2xl font-semibold text-amber-600 dark:text-amber-400"
              : "font-mono text-2xl font-semibold"
          }
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; count: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyHint>Noch keine Daten.</EmptyHint>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((it) => (
              <li key={it.id} className="flex items-baseline justify-between py-1.5 text-sm">
                <span className="truncate">{it.label}</span>
                <span className="ml-2 font-mono">{it.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}
