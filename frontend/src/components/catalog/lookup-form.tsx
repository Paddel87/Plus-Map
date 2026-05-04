"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  type LookupCreatePayload,
} from "@/lib/catalog/api";
import {
  CATALOG_KIND_LABELS,
  type CatalogKind,
  type LookupCatalogEntry,
} from "@/lib/catalog/types";

export type LookupFormMode = { type: "create" } | { type: "edit"; entry: LookupCatalogEntry };

export function LookupForm({
  kind,
  mode,
  isAdmin,
}: {
  kind: Exclude<CatalogKind, "restraint-types">;
  mode: LookupFormMode;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const initial = mode.type === "edit" ? mode.entry : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const create = useCreateCatalogEntry(kind);
  const update = useUpdateCatalogEntry(kind);
  const pending = create.isPending || update.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error("Name darf nicht leer sein");
      return;
    }
    const body: LookupCreatePayload = {
      name: trimmedName,
      description: description.trim() === "" ? null : description.trim(),
    };
    try {
      if (mode.type === "create") {
        await create.mutateAsync(body);
        toast.success(
          isAdmin ? `${CATALOG_KIND_LABELS[kind]}-Eintrag freigegeben` : `Vorschlag eingereicht`,
        );
      } else {
        await update.mutateAsync({ id: mode.entry.id, body });
        toast.success("Eintrag aktualisiert");
      }
      router.push(`/admin/catalogs/${kind}`);
      router.refresh();
    } catch (err) {
      describeMutationError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-name">Name *</Label>
        <Input
          id="catalog-name"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-description">Beschreibung</Label>
        <textarea
          id="catalog-description"
          name="description"
          rows={3}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Speichere …"
            : mode.type === "create"
              ? isAdmin
                ? "Freigeben & speichern"
                : "Vorschlag einreichen"
              : "Änderungen speichern"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/admin/catalogs/${kind}`)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

function asApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err;
  // Defensive: Next.js can split client/server modules and break
  // `instanceof` checks across the boundary. Fall back to duck-typing
  // by `name + status` (set in api.ts).
  if (
    err !== null &&
    typeof err === "object" &&
    (err as { name?: unknown }).name === "ApiError" &&
    typeof (err as { status?: unknown }).status === "number"
  ) {
    return err as ApiError;
  }
  return null;
}

export function describeMutationError(err: unknown): void {
  const apiErr = asApiError(err);
  if (apiErr) {
    if (apiErr.status === 409) {
      toast.error("Eintrag existiert bereits", {
        description:
          typeof apiErr.detail === "object" && apiErr.detail
            ? ((apiErr.detail as { detail?: string }).detail ?? apiErr.message)
            : apiErr.message,
      });
      return;
    }
    if (apiErr.status === 403) {
      toast.error("Keine Berechtigung", { description: apiErr.message });
      return;
    }
    if (apiErr.status === 422) {
      toast.error("Eingabe ungültig", { description: apiErr.message });
      return;
    }
  }
  toast.error("Speichern fehlgeschlagen", {
    description: err instanceof Error ? err.message : String(err),
  });
}
