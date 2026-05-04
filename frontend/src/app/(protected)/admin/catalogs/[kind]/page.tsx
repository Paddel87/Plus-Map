import { notFound } from "next/navigation";

import { CatalogListing } from "@/components/catalog/catalog-listing";
import { KindTabs } from "@/components/catalog/kind-tabs";
import { getServerMe } from "@/lib/auth-server";
import { CATALOG_KINDS, CATALOG_KIND_LABELS, type CatalogKind } from "@/lib/catalog/types";

function isKnownKind(value: string): value is CatalogKind {
  return (CATALOG_KINDS as readonly string[]).includes(value);
}

export default async function CatalogKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKnownKind(kind)) notFound();
  // Auth + role gate is enforced by `app/(protected)/admin/layout.tsx`.
  const user = await getServerMe();
  if (!user) notFound();
  const isAdmin = user.role === "admin";
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Katalog-Verwaltung</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aktive Ansicht: <strong>{CATALOG_KIND_LABELS[kind]}</strong>.
          {isAdmin
            ? " Anlagen werden direkt freigegeben; pending-Vorschläge können freigegeben oder mit Begründung abgelehnt werden."
            : " Eigene Vorschläge bleiben sichtbar — pending-Vorschläge können zurückgezogen, abgelehnte zeigen die Begründung."}
        </p>
      </header>
      <KindTabs active={kind} />
      <CatalogListing kind={kind} currentUser={{ id: user.id, role: user.role }} />
    </div>
  );
}
