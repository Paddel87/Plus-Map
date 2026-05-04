"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAdminUser, useLinkablePersons } from "@/lib/admin/api";
import type { AdminUserCreatePayload, UserRole } from "@/lib/admin/types";
import { ApiError } from "@/lib/api";

type PersonMode = "existing" | "new";

export default function AdminUserNewPage() {
  const router = useRouter();
  const create = useCreateAdminUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [displayName, setDisplayName] = useState("");

  const [personMode, setPersonMode] = useState<PersonMode>("existing");
  const [personSearch, setPersonSearch] = useState("");
  const [existingPersonId, setExistingPersonId] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonAlias, setNewPersonAlias] = useState("");

  const personsQuery = useLinkablePersons({ q: personSearch || undefined, limit: 50 });
  const linkable = useMemo(
    () => (personsQuery.data?.items ?? []).filter((p) => p.linkable && !p.is_deleted),
    [personsQuery.data],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AdminUserCreatePayload = {
      email,
      password,
      role,
      display_name: displayName || null,
    };
    if (personMode === "existing") {
      if (!existingPersonId) {
        toast.error("Bitte eine linkable Person auswählen.");
        return;
      }
      payload.existing_person_id = existingPersonId;
    } else {
      if (!newPersonName.trim()) {
        toast.error("Bitte einen Namen für die neue Person angeben.");
        return;
      }
      payload.new_person = {
        name: newPersonName,
        alias: newPersonAlias || null,
        linkable: true,
      };
    }
    try {
      await create.mutateAsync(payload);
      toast.success(`User ${email} angelegt.`);
      router.push("/admin/users");
    } catch (err) {
      const detail = err instanceof ApiError ? extractDetail(err.detail) : "Unbekannter Fehler";
      toast.error(`Anlage fehlgeschlagen: ${detail}`);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Neuer User</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verknüpfung mit einer linkable Person aus der Live-Erfassung oder Anlage einer neuen
          Person.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">E-Mail</Label>
            <Input
              id="user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">Passwort (≥ 12 Zeichen)</Label>
            <Input
              id="user-password"
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-role">Rolle</Label>
            <select
              id="user-role"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-display-name">Anzeigename (optional)</Label>
            <Input
              id="user-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Person</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3">
            <ModeButton
              active={personMode === "existing"}
              onClick={() => setPersonMode("existing")}
            >
              Bestehende verknüpfen
            </ModeButton>
            <ModeButton active={personMode === "new"} onClick={() => setPersonMode("new")}>
              Neu anlegen
            </ModeButton>
          </div>

          {personMode === "existing" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="person-search">Suche (Name)</Label>
              <Input
                id="person-search"
                placeholder="Name…"
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
              />
              <div className="max-h-64 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
                {linkable.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">
                    Keine linkable Person gefunden. Tipp: ADR-014 — eine Person muss in SQLAdmin auf
                    <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">
                      linkable=true
                    </code>
                    gesetzt werden, bevor sie hier auftaucht.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {linkable.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input
                            type="radio"
                            name="existing-person"
                            value={p.id}
                            checked={existingPersonId === p.id}
                            onChange={() => setExistingPersonId(p.id)}
                          />
                          <span>{p.name}</span>
                          {p.alias ? <span className="text-slate-500">({p.alias})</span> : null}
                          <span className="ml-auto text-xs text-slate-400">{p.origin}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-person-name">Name</Label>
                <Input
                  id="new-person-name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-person-alias">Alias (optional)</Label>
                <Input
                  id="new-person-alias"
                  value={newPersonAlias}
                  onChange={(e) => setNewPersonAlias(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Lege an…" : "User anlegen"}
        </Button>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded border border-blue-600 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }
    >
      {children}
    </button>
  );
}

function extractDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const d = (detail as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Validierungsfehler";
}
