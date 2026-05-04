"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PersonQuickSheet } from "@/components/person/person-quick-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Page, PersonRead } from "@/lib/types";

export interface RecipientPickerProps {
  value: PersonRead | null;
  onChange: (person: PersonRead | null) => void;
  excludePersonIds?: readonly string[];
}

export function RecipientPicker({ value, onChange, excludePersonIds = [] }: RecipientPickerProps) {
  const [filter, setFilter] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["persons", "list"],
    queryFn: () => apiFetch<Page<PersonRead>>("/api/persons", { query: { limit: 100 } }),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const exclude = new Set(excludePersonIds);
    const needle = filter.trim().toLowerCase();
    return items
      .filter((p) => !p.is_deleted)
      .filter((p) => !exclude.has(p.id))
      .filter((p) => {
        if (!needle) return true;
        return (
          p.name.toLowerCase().includes(needle) ||
          (p.alias?.toLowerCase().includes(needle) ?? false)
        );
      });
  }, [data, filter, excludePersonIds]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{value.name}</div>
          {value.alias ? (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{value.alias}</div>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Ändern
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Person suchen…"
          aria-label="Person suchen"
          className="h-9 pl-9"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
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
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
            Keine Treffer{filter ? ` für „${filter}“` : ""}.
          </div>
        ) : (
          <ul role="listbox" aria-label="Personen-Auswahl">
            {filtered.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => onChange(person)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                    "hover:bg-slate-50 dark:hover:bg-slate-900",
                  )}
                >
                  <span className="font-medium">{person.name}</span>
                  {person.alias ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {person.alias}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setQuickOpen(true)}
        className="justify-start"
      >
        <Plus aria-hidden /> Neue Person hinzufügen
      </Button>
      <PersonQuickSheet
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onCreated={(person) => {
          onChange(person);
        }}
      />
    </div>
  );
}
