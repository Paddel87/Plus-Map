import { notFound, redirect } from "next/navigation";

import { CatalogFormPage } from "@/components/catalog/catalog-form-page";
import { KindTabs } from "@/components/catalog/kind-tabs";
import { getServerMe } from "@/lib/auth-server";
import { CATALOG_KINDS, CATALOG_KIND_LABELS, type CatalogKind } from "@/lib/catalog/types";

function isKnownKind(value: string): value is CatalogKind {
  return (CATALOG_KINDS as readonly string[]).includes(value);
}

export default async function CatalogEditPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (!isKnownKind(kind)) notFound();
  const user = await getServerMe();
  // Edit is admin-only (ADR-042 §B). Editor lands on this URL only by
  // hand-typing; redirect them back to the listing rather than 403.
  if (user?.role !== "admin") {
    redirect(`/admin/catalogs/${kind}`);
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Katalog-Eintrag bearbeiten</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aktive Ansicht: <strong>{CATALOG_KIND_LABELS[kind]}</strong>. Status-Übergänge laufen über
          die Workflow-Aktionen (M7.4), nicht über dieses Formular.
        </p>
      </header>
      <KindTabs active={kind} />
      <CatalogFormPage kind={kind} entryId={id} isAdmin />
    </div>
  );
}
