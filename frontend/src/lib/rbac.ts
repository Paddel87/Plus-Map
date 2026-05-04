/**
 * Role-based access checks shared by server-redirect gates and
 * conditional UI renders. Pure functions — backend RLS still has the
 * final say.
 */

import type { UserRole } from "./auth";

export interface RbacUser {
  id: string;
  role: UserRole;
}

export interface RbacEvent {
  /** Owner of the event (User-id, not Person-id). May be `null` for
   *  legacy or system-created events. */
  created_by: string | null;
}

/**
 * `true` when the user may edit the event.
 *
 * - Admin: always.
 * - Editor: only if `event.created_by === user.id`.
 * - Viewer (and anonymous): never.
 *
 * Mirrors the RLS-policy combination from migration
 * `20260425_1730_strict_rls` + the M5b.2 owner-select layer; the
 * frontend gate is a UX hint only, the backend RLS still has the
 * final say.
 */
export function canEditEvent(user: RbacUser, event: RbacEvent): boolean {
  if (user.role === "admin") return true;
  if (user.role === "editor") {
    return Boolean(event.created_by) && event.created_by === user.id;
  }
  return false;
}

/** Subset of a catalog row needed for ownership checks. */
export interface RbacCatalogEntry {
  status: "approved" | "pending" | "rejected";
  suggested_by: string | null;
}

/** True if the user may approve or reject pending catalog entries. */
export function canApproveCatalog(user: RbacUser): boolean {
  return user.role === "admin";
}

/** True if the user may PATCH a catalog entry. Admin-only (ADR-042 §B). */
export function canEditCatalogEntry(user: RbacUser): boolean {
  return user.role === "admin";
}

/**
 * True if the user may withdraw a pending catalog entry.
 *
 * - Admin: any pending row.
 * - Editor: only own pending rows (mirrors `<table>_owner_withdraw`
 *   RLS policy from M7.1).
 * - Viewer: never.
 */
export function canWithdrawCatalogEntry(user: RbacUser, entry: RbacCatalogEntry): boolean {
  if (entry.status !== "pending") return false;
  if (user.role === "admin") return true;
  if (user.role === "editor") {
    return Boolean(entry.suggested_by) && entry.suggested_by === user.id;
  }
  return false;
}

/** True if the user may even visit the catalog management UI. */
export function canViewCatalogAdmin(user: RbacUser): boolean {
  return user.role === "admin" || user.role === "editor";
}
