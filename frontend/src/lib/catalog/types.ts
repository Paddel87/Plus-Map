/**
 * Frontend types for the four catalog tables (M7.x).
 *
 * Mirrors the backend `app/schemas/catalog.py` shape. Catalog data is
 * intentionally not synced via RxDB (ADR-042 §E); we read it via
 * TanStack-Query against `/api/<kind>` and re-fetch on mutations.
 */

export type CatalogStatus = "approved" | "pending" | "rejected";

export type CatalogKind =
  | "restraint-types"
  | "arm-positions"
  | "hand-positions"
  | "hand-orientations";

export const CATALOG_KINDS: readonly CatalogKind[] = [
  "restraint-types",
  "arm-positions",
  "hand-positions",
  "hand-orientations",
] as const;

export const CATALOG_KIND_LABELS: Record<CatalogKind, string> = {
  "restraint-types": "Restraints",
  "arm-positions": "Armhaltung",
  "hand-positions": "Handhaltung",
  "hand-orientations": "Handausrichtung",
};

export type RestraintCategory =
  | "handcuffs"
  | "thumbcuffs"
  | "legcuffs"
  | "cuffs_leather"
  | "rope"
  | "tape"
  | "cable_tie"
  | "cloth"
  | "strap"
  | "other";

export type RestraintMechanicalType = "chain" | "hinged" | "rigid";

interface CatalogAuditFields {
  id: string;
  status: CatalogStatus;
  suggested_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LookupCatalogEntry extends CatalogAuditFields {
  name: string;
  description: string | null;
}

export interface RestraintTypeEntry extends CatalogAuditFields {
  category: RestraintCategory;
  brand: string | null;
  model: string | null;
  mechanical_type: RestraintMechanicalType | null;
  display_name: string;
  note: string | null;
}

export type CatalogEntry<K extends CatalogKind = CatalogKind> = K extends "restraint-types"
  ? RestraintTypeEntry
  : LookupCatalogEntry;

export type AnyCatalogEntry = LookupCatalogEntry | RestraintTypeEntry;

export function isRestraintTypeEntry(entry: AnyCatalogEntry): entry is RestraintTypeEntry {
  return "display_name" in entry;
}

/** Display label for an entry. */
export function entryLabel(entry: AnyCatalogEntry): string {
  return isRestraintTypeEntry(entry) ? entry.display_name : entry.name;
}

export const STATUS_LABELS: Record<CatalogStatus, string> = {
  approved: "Freigegeben",
  pending: "Vorgeschlagen",
  rejected: "Abgelehnt",
};

export const RESTRAINT_CATEGORY_LABELS: Record<RestraintCategory, string> = {
  handcuffs: "Handschellen",
  thumbcuffs: "Daumenschellen",
  legcuffs: "Fußschellen",
  cuffs_leather: "Lederschellen",
  rope: "Seil",
  tape: "Tape",
  cable_tie: "Kabelbinder",
  cloth: "Stoff",
  strap: "Riemen",
  other: "Sonstiges",
};

export const MECHANICAL_TYPE_LABELS: Record<RestraintMechanicalType, string> = {
  chain: "Chain",
  hinged: "Hinged",
  rigid: "Rigid",
};
