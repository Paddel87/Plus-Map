"use client";

import { cn } from "@/lib/cn";
import type { CatalogStatus } from "@/lib/catalog/types";
import { STATUS_LABELS } from "@/lib/catalog/types";

export type StatusFilterValue = CatalogStatus | "all";

const VALUES: readonly StatusFilterValue[] = ["all", "approved", "pending", "rejected"];

const VALUE_LABELS: Record<StatusFilterValue, string> = {
  all: "Alle",
  approved: STATUS_LABELS.approved,
  pending: STATUS_LABELS.pending,
  rejected: STATUS_LABELS.rejected,
};

export function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilterValue;
  onChange: (next: StatusFilterValue) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Status-Filter"
      className="flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
    >
      {VALUES.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            {VALUE_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
