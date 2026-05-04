"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";
import { CATALOG_KINDS, CATALOG_KIND_LABELS, type CatalogKind } from "@/lib/catalog/types";

export function KindTabs({ active }: { active: CatalogKind }) {
  return (
    <nav
      aria-label="Katalog-Typ"
      className="flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
    >
      {CATALOG_KINDS.map((kind) => {
        const isActive = kind === active;
        return (
          <Link
            key={kind}
            href={`/admin/catalogs/${kind}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50",
            )}
          >
            {CATALOG_KIND_LABELS[kind]}
          </Link>
        );
      })}
    </nav>
  );
}
