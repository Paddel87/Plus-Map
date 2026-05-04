"use client";

/**
 * Filter drawer for `MapView` (M6.4, ADR-041 §I).
 *
 * Two filter dimensions: time range (two ``<input type="date">``) and
 * participants (multi-select against ``/api/persons``). Persons are
 * loaded via REST when the panel opens — RxDB does not sync the
 * Persons collection (ADR-037), so the filter UI accepts the online
 * dependency: when the request fails the panel surfaces an error,
 * the rest of the map keeps working.
 *
 * The component is fully controlled — parent owns the filter state
 * and persists it via ``serializeMapUrlState``.
 */

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { MapFilters } from "@/lib/map";
import type { Page, PersonRead } from "@/lib/types";

export interface MapFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
}

export function MapFilterPanel({ open, onOpenChange, filters, onChange }: MapFilterPanelProps) {
  const [query, setQuery] = useState("");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["persons", "list"],
    queryFn: () =>
      apiFetch<Page<PersonRead>>("/api/persons", {
        query: { limit: 100 },
      }),
    staleTime: 60_000,
    enabled: open,
  });

  const filteredPersons = useMemo(() => {
    const items = data?.items ?? [];
    const needle = query.trim().toLowerCase();
    return items
      .filter((p) => !p.is_deleted)
      .filter((p) => {
        if (!needle) return true;
        return (
          p.name.toLowerCase().includes(needle) ||
          (p.alias?.toLowerCase().includes(needle) ?? false)
        );
      });
  }, [data, query]);

  const selectedSet = useMemo(() => new Set(filters.participantIds), [filters.participantIds]);

  function handleFromChange(value: string) {
    onChange({ ...filters, from: value || null });
  }

  function handleToChange(value: string) {
    onChange({ ...filters, to: value || null });
  }

  function toggleParticipant(personId: string) {
    const next = new Set(selectedSet);
    if (next.has(personId)) next.delete(personId);
    else next.add(personId);
    onChange({ ...filters, participantIds: Array.from(next) });
  }

  function reset() {
    onChange({ from: null, to: null, participantIds: [] });
    setQuery("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden sm:max-w-sm"
        data-testid="map-filter-panel"
      >
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <SheetDescription>
            Wirken sofort und werden in der URL gespeichert — Link teilbar.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pt-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Zeitraum</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs">
                <span>Von</span>
                <Input
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(event) => handleFromChange(event.target.value)}
                  data-testid="map-filter-from"
                  aria-label="Startdatum (von)"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span>Bis</span>
                <Input
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(event) => handleToChange(event.target.value)}
                  data-testid="map-filter-to"
                  aria-label="Enddatum (bis)"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Beteiligte</h3>
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Person suchen…"
              aria-label="Person suchen"
              className="h-9"
            />
            <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
              {isPending ? (
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-3/4" />
                </div>
              ) : isError ? (
                <div className="flex items-center justify-between p-3 text-sm">
                  <span className="text-red-600 dark:text-red-400">
                    Personen konnten nicht geladen werden.
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
                    Erneut
                  </Button>
                </div>
              ) : filteredPersons.length === 0 ? (
                <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
                  Keine Treffer{query ? ` für „${query}“` : ""}.
                </p>
              ) : (
                <ul role="listbox" aria-label="Beteiligte filtern" className="flex flex-col">
                  {filteredPersons.map((person) => {
                    const checked = selectedSet.has(person.id);
                    return (
                      <li key={person.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(person.id)}
                            data-testid="map-filter-participant"
                            data-person-id={person.id}
                          />
                          <span className="flex-1 truncate">{person.name}</span>
                          {person.alias ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              · {person.alias}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
        <SheetFooter className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={reset} data-testid="map-filter-reset">
            <X aria-hidden /> Zurücksetzen
          </Button>
          <Button onClick={() => onOpenChange(false)} data-testid="map-filter-close">
            Fertig
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
