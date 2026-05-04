import { notFound } from "next/navigation";

import { CatalogFormPage } from "@/components/catalog/catalog-form-page";
import { KindTabs } from "@/components/catalog/kind-tabs";
import { getServerMe } from "@/lib/auth-server";
import { CATALOG_KINDS, CATALOG_KIND_LABELS, type CatalogKind } from "@/lib/catalog/types";

function isKnownKind(value: string): value is CatalogKind {
  return (CATALOG_KINDS as readonly string[]).includes(value);
}

export default async function CatalogCreatePage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKnownKind(kind)) notFound();
  const user = await getServerMe();
  // Parent layout already enforces editor-or-admin; we just need
  // the role flag to switch the submit-button label.
  const isAdmin = user?.role === "admin";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAdmin ? "Neuer Katalog-Eintrag" : "Neuen Vorschlag einreichen"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aktive Ansicht: <strong>{CATALOG_KIND_LABELS[kind]}</strong>.
          {isAdmin
            ? " Admin-Anlagen werden direkt freigegeben."
            : " Vorschläge sind sichtbar nur für dich und Admins, bis sie freigegeben werden."}
        </p>
      </header>
      <KindTabs active={kind} />
      <CatalogFormPage kind={kind} entryId={null} isAdmin={isAdmin} />
    </div>
  );
}
