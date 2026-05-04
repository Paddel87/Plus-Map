"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminUsers, useDeactivateAdminUser, useUpdateAdminUser } from "@/lib/admin/api";
import type { AdminUserRead, UserRole } from "@/lib/admin/types";

export default function AdminUsersPage() {
  const { data, isLoading, isError, error, refetch } = useAdminUsers();
  const update = useUpdateAdminUser();
  const deactivate = useDeactivateAdminUser();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User-Verwaltung</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Anlage, Rolle und Aktivierungsstatus. Passwort-Reset läuft über
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
              /api/auth/forgot-password
            </code>
            .
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">+ Neuer User</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alle User</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Lade User…</p>
          ) : isError ? (
            <p className="text-sm text-red-600">
              Fehler: {error instanceof Error ? error.message : "?"}
            </p>
          ) : data ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">E-Mail</th>
                    <th className="px-2 py-2">Rolle</th>
                    <th className="px-2 py-2">Aktiv</th>
                    <th className="px-2 py-2">Person</th>
                    <th className="px-2 py-2 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      busy={update.isPending || deactivate.isPending}
                      onChangeRole={async (newRole) => {
                        try {
                          await update.mutateAsync({
                            id: u.id,
                            payload: { role: newRole },
                          });
                          toast.success(`Rolle von ${u.email} → ${newRole}`);
                        } catch (err) {
                          toast.error(`Update fehlgeschlagen: ${msg(err)}`);
                        }
                      }}
                      onDeactivate={async () => {
                        if (!confirm(`User ${u.email} deaktivieren?`)) return;
                        try {
                          await deactivate.mutateAsync(u.id);
                          toast.success(`${u.email} deaktiviert.`);
                          await refetch();
                        } catch (err) {
                          toast.error(`Deaktivierung fehlgeschlagen: ${msg(err)}`);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
              {data.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Keine User.</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  busy,
  onChangeRole,
  onDeactivate,
}: {
  user: AdminUserRead;
  busy: boolean;
  onChangeRole: (role: UserRole) => Promise<void>;
  onDeactivate: () => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(user.role);

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-2 py-2 align-middle">
        <span className="font-mono text-xs">{user.email}</span>
        {user.display_name ? (
          <span className="ml-2 text-slate-500">{user.display_name}</span>
        ) : null}
      </td>
      <td className="px-2 py-2 align-middle">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={role}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value as UserRole;
            setRole(next);
            void onChangeRole(next);
          }}
        >
          <option value="admin">admin</option>
          <option value="editor">editor</option>
          <option value="viewer">viewer</option>
        </select>
      </td>
      <td className="px-2 py-2 align-middle">
        {user.is_active ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            aktiv
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            deaktiviert
          </span>
        )}
      </td>
      <td className="px-2 py-2 align-middle font-mono text-xs text-slate-500">
        {user.person_id.slice(0, 8)}…
      </td>
      <td className="px-2 py-2 text-right align-middle">
        {user.is_active ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void onDeactivate()}>
            Deaktivieren
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : "unbekannter Fehler";
}
