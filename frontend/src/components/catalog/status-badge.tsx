import { cn } from "@/lib/cn";
import { STATUS_LABELS, type CatalogStatus } from "@/lib/catalog/types";

const VARIANT_CLASS: Record<CatalogStatus, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export function StatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANT_CLASS[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
