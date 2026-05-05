/**
 * Frontend types for the EquipmentItem (outdoor-equipment) catalog.
 *
 * Mirrors the backend `app/schemas/catalog.py` shape. Catalog data is
 * intentionally not synced via RxDB (ADR-042 §E); we read it via
 * TanStack-Query against `/api/equipment-items` and re-fetch on
 * mutations.
 */

export type CatalogStatus = "approved" | "pending" | "rejected";

export type CatalogKind = "equipment-items";

export const CATALOG_KINDS: readonly CatalogKind[] = ["equipment-items"] as const;

export const CATALOG_KIND_LABELS: Record<CatalogKind, string> = {
  "equipment-items": "Ausrüstung",
};

export type EquipmentCategory =
  | "navigation"
  | "lighting"
  | "hydration"
  | "nutrition"
  | "safety"
  | "tools"
  | "documentation"
  | "comfort"
  | "mobility"
  | "carrying"
  | "clothing"
  | "shelter"
  | "other";

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

export interface EquipmentItemEntry extends CatalogAuditFields {
  category: EquipmentCategory;
  brand: string | null;
  model: string | null;
  display_name: string;
  note: string | null;
}

export type CatalogEntry<K extends CatalogKind = CatalogKind> = K extends "equipment-items"
  ? EquipmentItemEntry
  : never;

export type AnyCatalogEntry = EquipmentItemEntry;

/** Display label for an entry. */
export function entryLabel(entry: AnyCatalogEntry): string {
  return entry.display_name;
}

export const STATUS_LABELS: Record<CatalogStatus, string> = {
  approved: "Freigegeben",
  pending: "Vorgeschlagen",
  rejected: "Abgelehnt",
};

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  navigation: "Navigation",
  lighting: "Beleuchtung",
  hydration: "Trinkwasser",
  nutrition: "Verpflegung",
  safety: "Sicherheit",
  tools: "Werkzeug",
  documentation: "Dokumentation",
  comfort: "Komfort",
  mobility: "Fortbewegung",
  carrying: "Tragen",
  clothing: "Bekleidung",
  shelter: "Unterkunft",
  other: "Sonstiges",
};
