"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminExportUrl,
  useAdminPersons,
  useAdminUsers,
  useAnonymizePerson,
  useMergePerson,
} from "@/lib/admin/api";
import type { PersonMergeResponse } from "@/lib/admin/types";
import { ApiError } from "@/lib/api";
import type { PersonRead } from "@/lib/types";

type DialogMode =
  | { kind: "closed" }
  | { kind: "merge"; source: PersonRead }
  | { kind: "anonymize"; person: PersonRead };

export default function AdminPersonsPage() {
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [onlyOnTheFly, setOnlyOnTheFly] = useState(false);
  const [onlyLinkable, setOnlyLinkable] = useState(false);
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>({ kind: "closed" });

  const persons = useAdminPersons({
    q: search.trim() || undefined,
    include_deleted: includeDeleted || undefined,
    limit: 200,
  });
  const users = useAdminUsers({ limit: 200 });

  const linkedPersonIds = useMemo(() => {
    const set = new Set<string>();
    for (const u of users.data?.items ?? []) set.add(u.person_id);
    return set;
  }, [users.data]);

  const filtered = useMemo(() => {
    const items = persons.data?.items ?? [];
    return items.filter((p) => {
      if (onlyOnTheFly && p.origin !== "on_the_fly") return false;
      if (onlyLinkable && !p.linkable) return false;
      if (onlyUnlinked && linkedPersonIds.has(p.id)) return false;
      return true;
    });
  }, [persons.data, onlyOnTheFly, onlyLinkable, onlyUnlinked, linkedPersonIds]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personen-Verwaltung</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Filterung, Merge und Anonymisierung. Stammdaten-Pflege liegt unter
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
              /admin/person
            </code>
            (SQLAdmin).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">← Dashboard</Link>
          </Button>
          <Button asChild>
            <a href={adminExportUrl()} download="plus-map-export.json">
              Export herunterladen
            </a>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-search">Suche (Name)</Label>
            <Input
              id="person-search"
              placeholder="Name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterToggle
              label="origin = on_the_fly"
              active={onlyOnTheFly}
              onClick={() => setOnlyOnTheFly((v) => !v)}
            />
            <FilterToggle
              label="linkable = true"
              active={onlyLinkable}
              onClick={() => setOnlyLinkable((v) => !v)}
            />
            <FilterToggle
              label="unlinked"
              active={onlyUnlinked}
              onClick={() => setOnlyUnlinked((v) => !v)}
            />
            <FilterToggle
              label="inkl. anonymisierte / gemergte"
              active={includeDeleted}
              onClick={() => setIncludeDeleted((v) => !v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Personen{" "}
            <span className="ml-2 font-mono text-xs text-slate-500">
              {filtered.length} / {persons.data?.items.length ?? 0}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {persons.isLoading || users.isLoading ? (
            <p className="text-sm text-slate-500">Lade Personen…</p>
          ) : persons.isError ? (
            <p className="text-sm text-red-600">
              Fehler: {persons.error instanceof Error ? persons.error.message : "?"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Origin</th>
                    <th className="px-2 py-2">Linkable</th>
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <PersonRow
                      key={p.id}
                      person={p}
                      linked={linkedPersonIds.has(p.id)}
                      onMerge={() => setDialog({ kind: "merge", source: p })}
                      onAnonymize={() => setDialog({ kind: "anonymize", person: p })}
                    />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Keine Personen entsprechen dem Filter.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <MergeDialog
        open={dialog.kind === "merge"}
        source={dialog.kind === "merge" ? dialog.source : null}
        candidates={filtered}
        onClose={() => setDialog({ kind: "closed" })}
      />
      <AnonymizeDialog
        open={dialog.kind === "anonymize"}
        person={dialog.kind === "anonymize" ? dialog.person : null}
        onClose={() => setDialog({ kind: "closed" })}
      />
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }
    >
      {label}
    </button>
  );
}

function PersonRow({
  person,
  linked,
  onMerge,
  onAnonymize,
}: {
  person: PersonRead;
  linked: boolean;
  onMerge: () => void;
  onAnonymize: () => void;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-2 py-2 align-middle">
        <span className="font-medium">{person.name}</span>
        {person.alias ? <span className="ml-2 text-slate-500">({person.alias})</span> : null}
        <div className="font-mono text-[10px] text-slate-400">{person.id.slice(0, 8)}…</div>
      </td>
      <td className="px-2 py-2 align-middle text-xs text-slate-600 dark:text-slate-300">
        {person.origin}
      </td>
      <td className="px-2 py-2 align-middle">
        {person.linkable ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            linkable
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-2 py-2 align-middle">
        {linked ? (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            verknüpft
          </span>
        ) : (
          <span className="text-xs text-slate-400">unlinked</span>
        )}
      </td>
      <td className="px-2 py-2 align-middle">
        {person.is_deleted ? (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            inaktiv
          </span>
        ) : (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            aktiv
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-right align-middle">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={person.is_deleted} onClick={onMerge}>
            Mergen…
          </Button>
          <Button size="sm" variant="outline" disabled={person.is_deleted} onClick={onAnonymize}>
            Anonymisieren…
          </Button>
        </div>
      </td>
    </tr>
  );
}

function MergeDialog({
  open,
  source,
  candidates,
  onClose,
}: {
  open: boolean;
  source: PersonRead | null;
  candidates: PersonRead[];
  onClose: () => void;
}) {
  const merge = useMergePerson();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [result, setResult] = useState<PersonMergeResponse | null>(null);

  const targets = candidates.filter((p) => source && p.id !== source.id && !p.is_deleted);

  const close = () => {
    setTargetId(null);
    setResult(null);
    merge.reset();
    onClose();
  };

  const submit = async () => {
    if (!source || !targetId) return;
    try {
      const res = await merge.mutateAsync({ sourceId: source.id, target_id: targetId });
      setResult(res);
      toast.success(
        `Merge ok: ${res.affected_event_participants} Participants, ` +
          `${res.affected_applications_performer + res.affected_applications_recipient} Stopps.`,
      );
    } catch (err) {
      const detail = err instanceof ApiError ? extractDetail(err.detail) : msg(err);
      toast.error(`Merge fehlgeschlagen: ${detail}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? close() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Personen mergen</DialogTitle>
          <DialogDescription>
            Re-Pointing aller FKs (Tour-Begleitung, Stopps) von Source auf Target. Source
            wird soft-deleted und mit Audit-Marker versehen. Konflikte bei
            <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">
              event_participant.UNIQUE
            </code>
            werden automatisch aufgelöst (Source-Eintrag verworfen).
          </DialogDescription>
        </DialogHeader>

        {source ? (
          <div className="flex flex-col gap-3">
            <div>
              <Label>Source (wird soft-deleted)</Label>
              <div className="mt-1 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="font-medium">{source.name}</span>
                {source.alias ? (
                  <span className="ml-2 text-slate-500">({source.alias})</span>
                ) : null}
                <div className="font-mono text-[10px] text-slate-400">{source.id}</div>
              </div>
            </div>

            <div>
              <Label>Target (übernimmt alle Verknüpfungen)</Label>
              <div className="mt-1 max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
                {targets.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">
                    Keine geeigneten Targets im aktuellen Filter. Filter anpassen oder Suche leeren.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {targets.map((t) => (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input
                            type="radio"
                            name="merge-target"
                            value={t.id}
                            checked={targetId === t.id}
                            onChange={() => setTargetId(t.id)}
                          />
                          <span>{t.name}</span>
                          {t.alias ? <span className="text-slate-500">({t.alias})</span> : null}
                          <span className="ml-auto text-xs text-slate-400">{t.origin}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {result ? (
              <div className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Merge erfolgreich. Participants neu zugeordnet:{" "}
                <strong>{result.affected_event_participants}</strong>, gelöschte Konflikte:{" "}
                <strong>{result.deleted_event_participants}</strong>, Stopps (Erfasser):{" "}
                <strong>{result.affected_applications_performer}</strong>, (Recipient):{" "}
                <strong>{result.affected_applications_recipient}</strong>.
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {result ? "Schließen" : "Abbrechen"}
          </Button>
          {!result ? (
            <Button onClick={() => void submit()} disabled={!targetId || merge.isPending}>
              {merge.isPending ? "Merge läuft…" : "Merge bestätigen"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnonymizeDialog({
  open,
  person,
  onClose,
}: {
  open: boolean;
  person: PersonRead | null;
  onClose: () => void;
}) {
  const anonymize = useAnonymizePerson();
  const [done, setDone] = useState(false);

  const close = () => {
    setDone(false);
    anonymize.reset();
    onClose();
  };

  const submit = async () => {
    if (!person) return;
    try {
      await anonymize.mutateAsync(person.id);
      setDone(true);
      toast.success(`Person anonymisiert: ${person.name}.`);
    } catch (err) {
      const detail = err instanceof ApiError ? extractDetail(err.detail) : msg(err);
      toast.error(`Anonymisierung fehlgeschlagen: ${detail}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? close() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Person anonymisieren</DialogTitle>
          <DialogDescription>
            DSGVO Art. 17 (ADR-002). Setzt
            <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">
              name = &apos;[gelöscht]&apos;
            </code>
            ,<code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">alias = NULL</code>,
            <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">note = NULL</code>,
            <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">
              is_deleted = true
            </code>
            und stempelt
            <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">deleted_at</code>.
            Verknüpfungen zu Touren und Stopps bleiben erhalten.
          </DialogDescription>
        </DialogHeader>

        {person ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <div>
              <strong>{person.name}</strong>
              {person.alias ? (
                <span className="ml-2 text-amber-700 dark:text-amber-400">({person.alias})</span>
              ) : null}
            </div>
            <div className="font-mono text-[10px]">{person.id}</div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {done ? "Schließen" : "Abbrechen"}
          </Button>
          {!done ? (
            <Button onClick={() => void submit()} disabled={anonymize.isPending}>
              {anonymize.isPending ? "Anonymisiere…" : "Anonymisierung bestätigen"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const d = (detail as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Unbekannter Fehler";
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : "unbekannter Fehler";
}
