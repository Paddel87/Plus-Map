"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CatalogTable } from "@/components/catalog/catalog-table";
import { describeMutationError } from "@/components/catalog/lookup-form";
import { RejectReasonDialog } from "@/components/catalog/reject-reason-dialog";
import { StatusFilter, type StatusFilterValue } from "@/components/catalog/status-filter";
import { Button } from "@/components/ui/button";
import {
  useApproveCatalogEntry,
  useCatalogList,
  useRejectCatalogEntry,
  useWithdrawCatalogEntry,
} from "@/lib/catalog/api";
import {
  CATALOG_KIND_LABELS,
  STATUS_LABELS,
  entryLabel,
  type AnyCatalogEntry,
  type CatalogKind,
  type CatalogStatus,
} from "@/lib/catalog/types";
import {
  canApproveCatalog,
  canEditCatalogEntry,
  canWithdrawCatalogEntry,
  type RbacUser,
} from "@/lib/rbac";

/** Read the `status` URL query param and coerce to a known value. */
export function parseStatusParam(raw: string | null): StatusFilterValue {
  if (raw === "approved" || raw === "pending" || raw === "rejected") return raw;
  return "all";
}

function emptyHint(kind: CatalogKind, status: StatusFilterValue): string {
  const kindLabel = CATALOG_KIND_LABELS[kind];
  if (status === "all") return `Keine Einträge in „${kindLabel}".`;
  return `Keine Einträge mit Status „${STATUS_LABELS[status as CatalogStatus]}" in „${kindLabel}".`;
}

export function CatalogListing({
  kind,
  currentUser,
}: {
  kind: CatalogKind;
  currentUser: RbacUser;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const status = parseStatusParam(params.get("status"));

  const queryStatus = status === "all" ? undefined : status;
  const query = useCatalogList(kind, { status: queryStatus });

  const isAdmin = currentUser.role === "admin";
  const canApprove = canApproveCatalog(currentUser);
  const canEdit = canEditCatalogEntry(currentUser);

  const approve = useApproveCatalogEntry(kind);
  const reject = useRejectCatalogEntry(kind);
  const withdraw = useWithdrawCatalogEntry(kind);

  const [rejectingEntry, setRejectingEntry] = useState<AnyCatalogEntry | null>(null);

  const handleChange = useCallback(
    (next: StatusFilterValue) => {
      const url = new URL(window.location.href);
      if (next === "all") {
        url.searchParams.delete("status");
      } else {
        url.searchParams.set("status", next);
      }
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    },
    [router],
  );

  const entries = useMemo(() => query.data?.items ?? [], [query.data]);

  const handleApprove = useCallback(
    async (entry: AnyCatalogEntry) => {
      try {
        await approve.mutateAsync({ id: entry.id });
        toast.success(`„${entryLabel(entry)}" freigegeben`);
      } catch (err) {
        describeMutationError(err);
      }
    },
    [approve],
  );

  const handleWithdraw = useCallback(
    async (entry: AnyCatalogEntry) => {
      try {
        await withdraw.mutateAsync({ id: entry.id });
        toast.success(`„${entryLabel(entry)}" zurückgezogen`);
      } catch (err) {
        describeMutationError(err);
      }
    },
    [withdraw],
  );

  const handleRejectSubmit = useCallback(
    async (reason: string) => {
      if (!rejectingEntry) return;
      const target = rejectingEntry;
      try {
        await reject.mutateAsync({ id: target.id, reason });
        toast.success(`„${entryLabel(target)}" abgelehnt`);
        setRejectingEntry(null);
      } catch (err) {
        describeMutationError(err);
      }
    },
    [reject, rejectingEntry],
  );

  const renderRowActions = useCallback(
    (entry: AnyCatalogEntry) => {
      const showApprove = canApprove && entry.status === "pending";
      const showReject = canApprove && entry.status === "pending";
      const showWithdraw = canWithdrawCatalogEntry(currentUser, entry);
      const showEdit = canEdit && entry.status !== "pending";
      const buttons: ReactNode[] = [];
      if (showApprove) {
        buttons.push(
          <Button
            key="approve"
            type="button"
            size="sm"
            disabled={approve.isPending}
            onClick={() => void handleApprove(entry)}
          >
            Freigeben
          </Button>,
        );
      }
      if (showReject) {
        buttons.push(
          <Button
            key="reject"
            type="button"
            size="sm"
            variant="destructive"
            disabled={reject.isPending}
            onClick={() => setRejectingEntry(entry)}
          >
            Ablehnen
          </Button>,
        );
      }
      if (showWithdraw) {
        buttons.push(
          <Button
            key="withdraw"
            type="button"
            size="sm"
            variant="ghost"
            disabled={withdraw.isPending}
            onClick={() => void handleWithdraw(entry)}
          >
            Zurückziehen
          </Button>,
        );
      }
      if (showEdit) {
        buttons.push(
          <Link
            key="edit"
            href={`/admin/catalogs/${kind}/${entry.id}/edit`}
            className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
          >
            Bearbeiten
          </Link>,
        );
      }
      return buttons.length === 0 ? null : <>{buttons}</>;
    },
    [
      approve.isPending,
      canApprove,
      canEdit,
      currentUser,
      handleApprove,
      handleWithdraw,
      kind,
      reject.isPending,
      withdraw.isPending,
    ],
  );

  return (
    <section className="flex flex-col gap-3" aria-label="Katalog-Einträge">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusFilter value={status} onChange={handleChange} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {query.isLoading ? "" : `${query.data?.total ?? 0} Einträge`}
          </span>
          <Button asChild size="sm">
            <Link href={`/admin/catalogs/${kind}/new`}>
              {isAdmin ? "Neuer Eintrag" : "Neuen Vorschlag einreichen"}
            </Link>
          </Button>
        </div>
      </div>
      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          Konnte Katalog nicht laden.
        </div>
      ) : (
        <CatalogTable
          entries={entries}
          kind={kind}
          isLoading={query.isLoading}
          emptyHint={emptyHint(kind, status)}
          renderRowActions={renderRowActions}
        />
      )}
      <RejectReasonDialog
        open={rejectingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setRejectingEntry(null);
        }}
        entryLabel={rejectingEntry ? entryLabel(rejectingEntry) : ""}
        onSubmit={handleRejectSubmit}
        isPending={reject.isPending}
      />
    </section>
  );
}
