"use client";

/**
 * Single-Select-Picker für die drei Lookup-Tabellen
 * (ArmPosition / HandPosition / HandOrientation).
 *
 * Schwester der `<RestraintPicker>` aus M7.5; gleicher TanStack-Query-
 * Cache-Key, gleiche Quick-Propose-Mechanik (Editor → pending,
 * Admin → auto-approve), aber mit Single-Select-Semantik (nullable
 * FK auf Application). Eingeführt mit M7.5-FU2.
 *
 * Filtert die Liste client-seitig auf `status='approved'` — Editor
 * sieht via RLS auch eigene pending, aber Backend-Update-/Insert-
 * Pfad lehnt non-approved Position-FKs ab (`_apply_application_update`
 * + `_insert_application_or_conflict`), sonst würde der nächste Push
 * konflikten.
 */

import { Loader2, Plus, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { describeMutationError } from "@/components/catalog/lookup-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogList, useCreateCatalogEntry, type LookupCreatePayload } from "@/lib/catalog/api";
import {
  CATALOG_KIND_LABELS,
  isRestraintTypeEntry,
  type CatalogKind,
  type LookupCatalogEntry,
} from "@/lib/catalog/types";
import { cn } from "@/lib/cn";

type LookupKind = Exclude<CatalogKind, "restraint-types">;

export interface LookupPickerProps {
  kind: LookupKind;
  /** Currently selected lookup id, or null for the "— keine —" choice. */
  value: string | null;
  onChange: (id: string | null) => void;
  isAdmin: boolean;
  /** Optional id used for label/aria wiring. */
  id?: string;
  /** Visible label/heading shown above the picker. */
  label: string;
}

interface QuickProposeState {
  open: boolean;
  name: string;
  description: string;
  attemptedSubmit: boolean;
}

const INITIAL_QUICK: QuickProposeState = {
  open: false,
  name: "",
  description: "",
  attemptedSubmit: false,
};

export function LookupPicker({ kind, value, onChange, isAdmin, id, label }: LookupPickerProps) {
  const reactId = useId();
  const baseId = id ?? `lookup-picker-${reactId}`;
  const [quick, setQuick] = useState<QuickProposeState>(INITIAL_QUICK);

  const list = useCatalogList(kind, { status: "approved", limit: 200 });
  const create = useCreateCatalogEntry(kind);

  const approved = useMemo(() => {
    const items = list.data?.items ?? [];
    return items
      .filter((entry): entry is LookupCatalogEntry => !isRestraintTypeEntry(entry))
      .filter((entry) => entry.status === "approved")
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [list.data]);

  const selected = useMemo(
    () => approved.find((entry) => entry.id === value) ?? null,
    [approved, value],
  );

  const submitQuick = async () => {
    const trimmed = quick.name.trim();
    if (trimmed.length === 0) {
      setQuick((q) => ({ ...q, attemptedSubmit: true }));
      return;
    }
    const body: LookupCreatePayload = {
      name: trimmed,
      description: quick.description.trim() === "" ? null : quick.description.trim(),
    };
    try {
      const entry = await create.mutateAsync(body);
      const isApprovedNow = !isRestraintTypeEntry(entry) && entry.status === "approved";
      if (isAdmin && isApprovedNow && !isRestraintTypeEntry(entry)) {
        toast.success(`${CATALOG_KIND_LABELS[kind]}-Eintrag freigegeben`, {
          description: `„${entry.name}" ist jetzt auswählbar.`,
        });
        onChange(entry.id);
      } else {
        toast.success("Vorschlag eingereicht", {
          description: "Wird nach Admin-Freigabe auswählbar.",
        });
      }
      setQuick(INITIAL_QUICK);
    } catch (err) {
      describeMutationError(err);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid="lookup-picker" data-kind={kind}>
      <Label htmlFor={`${baseId}-select`}>{label}</Label>
      <div className="flex items-center gap-2">
        <select
          id={`${baseId}-select`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          disabled={list.isPending}
          className={cn(
            "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300",
          )}
          data-testid="lookup-picker-select"
        >
          <option value="">— keine —</option>
          {approved.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
        {value !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label={`${label} zurücksetzen`}
            data-testid="lookup-picker-clear"
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      {list.isPending ? <Skeleton className="h-3 w-24" /> : null}
      {list.isError ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          {label} konnte nicht geladen werden.{" "}
          <button type="button" className="underline" onClick={() => list.refetch()}>
            Erneut
          </button>
        </p>
      ) : null}
      {selected?.description ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{selected.description}</p>
      ) : null}

      {!quick.open ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setQuick((q) => ({ ...q, open: true }))}
          className="self-start text-xs"
          data-testid="lookup-picker-propose-toggle"
        >
          <Plus aria-hidden />{" "}
          {isAdmin ? `Neuen ${label}-Eintrag anlegen` : `Neuen ${label}-Vorschlag einreichen`}
        </Button>
      ) : (
        <div
          className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
          data-testid="lookup-picker-propose-form"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${baseId}-name`}>{label}-Name *</Label>
            <Input
              id={`${baseId}-name`}
              value={quick.name}
              onChange={(e) =>
                setQuick((q) => ({ ...q, name: e.target.value, attemptedSubmit: false }))
              }
              maxLength={120}
              autoFocus
              aria-invalid={
                quick.attemptedSubmit && quick.name.trim().length === 0 ? "true" : undefined
              }
            />
            {quick.attemptedSubmit && quick.name.trim().length === 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                Name darf nicht leer sein.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${baseId}-description`}>Beschreibung (optional)</Label>
            <Input
              id={`${baseId}-description`}
              value={quick.description}
              onChange={(e) => setQuick((q) => ({ ...q, description: e.target.value }))}
              maxLength={500}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setQuick(INITIAL_QUICK)}
              disabled={create.isPending}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={submitQuick}
              disabled={create.isPending}
              data-testid="lookup-picker-propose-submit"
            >
              {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {isAdmin ? "Anlegen" : "Vorschlagen"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
