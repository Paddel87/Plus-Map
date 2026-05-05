"use client";

/**
 * Multi-Select-Picker mit Typeahead für approved EquipmentItems (M7.5, ADR-046).
 *
 * Liest die Liste über den TanStack-Query-Cache aus M7.x
 * (`useCatalogList("equipment-items", { status: "approved" })`) und
 * filtert client-seitig auf approved (Editor sieht via RLS auch eigene
 * pending; die wären aber nicht via Sync-Push verlinkbar — wir blenden
 * sie hier zusätzlich aus, damit der Picker nicht zur Konflikt-Falle
 * wird).
 *
 * Quick-Propose ist eine inline ausklappbare Mini-Form (kein eigenes
 * Sheet — der Picker lebt selbst schon in einem Sheet/einer Card; ein
 * verschachteltes Sheet wäre auf Mobile fragil). Submit nutzt den
 * gleichen `useCreateCatalogEntry`-Hook wie das volle Form aus M7.3:
 * Editor erzeugt pending, Admin auto-approve. Bei Erfolg wird der
 * Catalog-Cache invalidiert, der Picker re-fetched, ein neuer approved
 * Eintrag (Admin) wird automatisch sichtbar; pending bleibt unsichtbar
 * für die Auswahl, der Editor bekommt ein Toast.
 */

import { Loader2, Plus, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { describeMutationError } from "@/components/catalog/mutation-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCatalogList,
  useCreateCatalogEntry,
  type EquipmentItemCreatePayload,
} from "@/lib/catalog/api";
import {
  EQUIPMENT_CATEGORY_LABELS,
  type EquipmentCategory,
  type EquipmentItemEntry,
} from "@/lib/catalog/types";
import { cn } from "@/lib/cn";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300";

export interface EquipmentPickerProps {
  /** Currently selected restraint-type IDs (set semantics; order ignored). */
  value: readonly string[];
  /** Called whenever the selection changes. */
  onChange: (ids: string[]) => void;
  /** Drives the Quick-Propose copy (Editor: "Vorschlag", Admin: "Eintrag"). */
  isAdmin: boolean;
  /** Optional id used for label/aria-describedby wiring. */
  id?: string;
}

interface QuickProposeState {
  open: boolean;
  category: EquipmentCategory;
  brand: string;
  model: string;
  displayName: string;
  attemptedSubmit: boolean;
}

const INITIAL_QUICK: QuickProposeState = {
  open: false,
  category: "tools",
  brand: "",
  model: "",
  displayName: "",
  attemptedSubmit: false,
};

function entrySubtitle(entry: EquipmentItemEntry): string {
  const parts: string[] = [EQUIPMENT_CATEGORY_LABELS[entry.category]];
  if (entry.brand) parts.push(entry.brand);
  if (entry.model) parts.push(entry.model);
  return parts.join(" · ");
}

function matchesNeedle(entry: EquipmentItemEntry, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    entry.display_name,
    entry.brand ?? "",
    entry.model ?? "",
    EQUIPMENT_CATEGORY_LABELS[entry.category],
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function EquipmentPicker({ value, onChange, isAdmin, id }: EquipmentPickerProps) {
  const reactId = useId();
  const baseId = id ?? `equipment-picker-${reactId}`;
  const [filter, setFilter] = useState("");
  const [quick, setQuick] = useState<QuickProposeState>(INITIAL_QUICK);

  const list = useCatalogList("equipment-items", { status: "approved", limit: 200 });
  const create = useCreateCatalogEntry("equipment-items");

  const approved = useMemo(() => {
    const items = list.data?.items ?? [];
    return items.filter((entry) => entry.status === "approved");
  }, [list.data]);

  const byId = useMemo(() => {
    const map = new Map<string, EquipmentItemEntry>();
    approved.forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [approved]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return approved
      .filter((entry) => matchesNeedle(entry, needle))
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
  }, [approved, filter]);

  const selected = new Set(value);

  const toggle = (entryId: string) => {
    const next = new Set(value);
    if (next.has(entryId)) next.delete(entryId);
    else next.add(entryId);
    onChange(Array.from(next));
  };

  const remove = (entryId: string) => {
    onChange(value.filter((v) => v !== entryId));
  };

  const submitQuick = async () => {
    const trimmed = quick.displayName.trim();
    if (trimmed.length === 0) {
      setQuick((q) => ({ ...q, attemptedSubmit: true }));
      return;
    }
    const body: EquipmentItemCreatePayload = {
      category: quick.category,
      brand: quick.brand.trim() === "" ? null : quick.brand.trim(),
      model: quick.model.trim() === "" ? null : quick.model.trim(),
      display_name: trimmed,
      note: null,
    };
    try {
      const entry = await create.mutateAsync(body);
      if (isAdmin && entry.status === "approved") {
        toast.success("Equipment-Typ freigegeben", {
          description: `„${entry.display_name}" ist jetzt auswählbar.`,
        });
        // Auto-select the new entry so Admin can immediately use it.
        onChange([...new Set([...value, entry.id])]);
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
    <div className="flex flex-col gap-2" data-testid="equipment-picker">
      {selected.size > 0 ? (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label="Ausgewählte Ausrüstung"
          data-testid="equipment-picker-selected"
        >
          {Array.from(selected).map((entryId) => {
            const entry = byId.get(entryId);
            if (!entry) {
              // Selected id no longer in the approved list (e.g. revoked
              // status). Show a placeholder so the user can still
              // remove it.
              return (
                <li key={entryId}>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-50">
                    <span>Unbekannt ({entryId.slice(0, 8)})</span>
                    <button
                      type="button"
                      aria-label="Auswahl entfernen"
                      onClick={() => remove(entryId)}
                      className="rounded-full p-0.5 hover:bg-black/10"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                </li>
              );
            }
            return (
              <li key={entryId}>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  <span>{entry.display_name}</span>
                  <button
                    type="button"
                    aria-label={`„${entry.display_name}" entfernen`}
                    onClick={() => remove(entryId)}
                    className="rounded-full p-0.5 hover:bg-black/10"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          id={`${baseId}-search`}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Ausrüstung suchen…"
          aria-label="Ausrüstung suchen"
          className="h-9 pl-9"
        />
      </div>

      <div
        className="max-h-56 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800"
        data-testid="equipment-picker-list"
      >
        {list.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : list.isError ? (
          <div className="flex items-center justify-between p-3 text-sm">
            <span className="text-red-600 dark:text-red-400">
              Restraints konnten nicht geladen werden.
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => list.refetch()}>
              Erneut
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
            Keine Treffer{filter ? ` für „${filter}“` : ""}.
          </div>
        ) : (
          <ul role="listbox" aria-multiselectable="true" aria-label="Ausrüstungs-Auswahl">
            {filtered.map((entry) => {
              const isSelected = selected.has(entry.id);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggle(entry.id)}
                    data-testid="equipment-picker-option"
                    data-selected={isSelected ? "true" : "false"}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                      "hover:bg-slate-50 dark:hover:bg-slate-900",
                      isSelected && "bg-slate-100 dark:bg-slate-800",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                          : "border-slate-300 dark:border-slate-700",
                      )}
                      aria-hidden
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{entry.display_name}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {entrySubtitle(entry)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!quick.open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setQuick((q) => ({ ...q, open: true }))}
          className="justify-start"
          data-testid="equipment-picker-propose-toggle"
        >
          <Plus aria-hidden /> {isAdmin ? "Neuen Eintrag anlegen" : "Neuen Vorschlag einreichen"}
        </Button>
      ) : (
        <div
          className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
          data-testid="equipment-picker-propose-form"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${baseId}-display-name`}>Display-Name *</Label>
            <Input
              id={`${baseId}-display-name`}
              value={quick.displayName}
              onChange={(e) =>
                setQuick((q) => ({ ...q, displayName: e.target.value, attemptedSubmit: false }))
              }
              maxLength={300}
              placeholder="z. B. Clejuso Model 13"
              autoFocus
              aria-invalid={
                quick.attemptedSubmit && quick.displayName.trim().length === 0 ? "true" : undefined
              }
            />
            {quick.attemptedSubmit && quick.displayName.trim().length === 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                Display-Name darf nicht leer sein.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${baseId}-category`}>Kategorie *</Label>
              <select
                id={`${baseId}-category`}
                value={quick.category}
                onChange={(e) =>
                  setQuick((q) => ({ ...q, category: e.target.value as EquipmentCategory }))
                }
                className={SELECT_CLASS}
              >
                {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${baseId}-brand`}>Marke</Label>
              <Input
                id={`${baseId}-brand`}
                value={quick.brand}
                onChange={(e) => setQuick((q) => ({ ...q, brand: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${baseId}-model`}>Modell</Label>
              <Input
                id={`${baseId}-model`}
                value={quick.model}
                onChange={(e) => setQuick((q) => ({ ...q, model: e.target.value }))}
                maxLength={200}
              />
            </div>
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
              data-testid="equipment-picker-propose-submit"
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
