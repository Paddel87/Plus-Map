"use client";

/**
 * Tiny pill in the app shell that surfaces RxDB replication state
 * (synchronisiert / offene Änderungen / Fehler / offline). The
 * status is computed in `lib/rxdb/replication.ts` from the active
 * and error streams plus `navigator.onLine`.
 */

import { Cloud, CloudOff, Loader2, TriangleAlert } from "lucide-react";

import { useSyncStatus } from "@/lib/rxdb/provider";
import { cn } from "@/lib/cn";

interface IndicatorVariant {
  icon: typeof Cloud;
  label: string;
  className: string;
  spin?: boolean;
}

const VARIANTS: Record<string, IndicatorVariant> = {
  idle: {
    icon: Cloud,
    label: "synchronisiert",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  active: {
    icon: Loader2,
    label: "wird synchronisiert…",
    className: "text-sky-600 dark:text-sky-400",
    spin: true,
  },
  offline: {
    icon: CloudOff,
    label: "offline",
    className: "text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: TriangleAlert,
    label: "Sync-Fehler",
    className: "text-red-600 dark:text-red-400",
  },
};

export interface SyncStatusIndicatorProps {
  /** Show the label text next to the icon (sidebar). */
  showLabel?: boolean;
  className?: string;
}

export function SyncStatusIndicator({ showLabel = false, className }: SyncStatusIndicatorProps) {
  const status = useSyncStatus();
  const variant = VARIANTS[status] ?? VARIANTS.idle!;
  const Icon = variant.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        variant.className,
        className,
      )}
      role="status"
      aria-label={`Synchronisation: ${variant.label}`}
      title={variant.label}
      data-sync-status={status}
    >
      <Icon className={cn("h-3.5 w-3.5", variant.spin && "animate-spin")} aria-hidden />
      {showLabel ? <span>{variant.label}</span> : null}
    </span>
  );
}
