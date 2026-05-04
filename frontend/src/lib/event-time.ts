/**
 * Display helpers for the ADR-058 ``time_precision`` marker.
 *
 * Storage stays full datetime; only the rendered representation is
 * conditioned on the precision marker. Used by Dashboard, Event-Detail,
 * MapView popup and any other surface that shows event timestamps to
 * the operator.
 */

import type { TimePrecision } from "@/lib/types";

const MONTH_NAMES_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

/**
 * Format ``iso`` according to ``precision``. Always uses the browser's
 * local time zone for display.
 *
 *   year   → "2024"
 *   month  → "Mai 2024"
 *   day    → "01.05.2024"
 *   hour   → "01.05.2024, 12 Uhr"
 *   minute → "01.05.2024, 12:30"  (default behaviour)
 */
export function formatEventTime(iso: string, precision: TimePrecision): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  switch (precision) {
    case "year":
      return String(date.getFullYear());
    case "month":
      return `${MONTH_NAMES_DE[date.getMonth()]} ${date.getFullYear()}`;
    case "day":
      return date.toLocaleDateString("de-DE");
    case "hour":
      return `${date.toLocaleDateString("de-DE")}, ${date.getHours().toString().padStart(2, "0")} Uhr`;
    case "minute":
    default:
      return date.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  }
}

/**
 * Format the time *range* (started_at .. ended_at) according to the
 * event's precision. For ``year``/``month`` precision the end-time is
 * usually redundant ("Mai 2024 — Mai 2024"); we fall back to a single
 * formatted timestamp in that case. For finer precisions the standard
 * "start — end" layout applies.
 */
export function formatEventTimeRange(
  startedIso: string,
  endedIso: string | null,
  precision: TimePrecision,
): string {
  const start = formatEventTime(startedIso, precision);
  if (endedIso === null) return start;
  const end = formatEventTime(endedIso, precision);
  if (start === end) return start;
  return `${start} — ${end}`;
}
