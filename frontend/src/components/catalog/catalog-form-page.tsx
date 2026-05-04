"use client";

/**
 * Client-side wrapper that picks the right form per catalog kind.
 *
 * Used by both the create page (`/admin/catalogs/[kind]/new`) and the
 * edit page (`/admin/catalogs/[kind]/[id]/edit`). The edit page passes
 * an `entryId` and the wrapper pulls the entry from the catalog list
 * via TanStack-Query (single page-scan, ADR-042 §E — catalog tables
 * are tiny in Pfad A).
 */

import { LookupForm } from "@/components/catalog/lookup-form";
import { RestraintTypeForm } from "@/components/catalog/restraint-type-form";
import { useCatalogEntry } from "@/lib/catalog/api";
import { isRestraintTypeEntry, type CatalogKind } from "@/lib/catalog/types";

export function CatalogFormPage({
  kind,
  entryId,
  isAdmin,
}: {
  kind: CatalogKind;
  entryId: string | null;
  isAdmin: boolean;
}) {
  const entryQuery = useCatalogEntry(kind, entryId);

  if (entryId !== null) {
    if (entryQuery.isLoading) {
      return (
        <div
          role="status"
          className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
        >
          Lade Eintrag …
        </div>
      );
    }
    if (entryQuery.isError || !entryQuery.data) {
      return (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          Eintrag konnte nicht geladen werden.
        </div>
      );
    }
    const entry = entryQuery.data;
    if (kind === "restraint-types") {
      if (!isRestraintTypeEntry(entry)) {
        return null;
      }
      return <RestraintTypeForm mode={{ type: "edit", entry }} isAdmin={isAdmin} />;
    }
    if (isRestraintTypeEntry(entry)) {
      return null;
    }
    return <LookupForm kind={kind} mode={{ type: "edit", entry }} isAdmin={isAdmin} />;
  }

  if (kind === "restraint-types") {
    return <RestraintTypeForm mode={{ type: "create" }} isAdmin={isAdmin} />;
  }
  return <LookupForm kind={kind} mode={{ type: "create" }} isAdmin={isAdmin} />;
}
