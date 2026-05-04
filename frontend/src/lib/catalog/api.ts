"use client";

/**
 * TanStack-Query hooks for the RestraintType (equipment) catalog.
 *
 * Cache-Key shape: `["catalog", kind, { status }]` — mutations
 * invalidate `["catalog", kind]` to cover every filter variant.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Page } from "@/lib/types";

import type { AnyCatalogEntry, CatalogKind, CatalogStatus, RestraintTypeEntry } from "./types";

export interface CatalogListParams {
  status?: CatalogStatus;
  limit?: number;
  offset?: number;
}

export function catalogQueryKey(kind: CatalogKind, params: CatalogListParams = {}) {
  const { status, limit, offset } = params;
  return [
    "catalog",
    kind,
    { status: status ?? null, limit: limit ?? null, offset: offset ?? null },
  ] as const;
}

export async function fetchCatalogPage(
  kind: CatalogKind,
  params: CatalogListParams = {},
): Promise<Page<AnyCatalogEntry>> {
  return await apiFetch<Page<AnyCatalogEntry>>(`/api/${kind}`, {
    query: {
      status: params.status,
      limit: params.limit,
      offset: params.offset,
    },
  });
}

/**
 * Lists catalog entries. Backend RLS already filters by role
 * (admin = all, editor = approved + own pending/rejected, viewer =
 * approved). The optional `status` query narrows further.
 */
export function useCatalogList(kind: CatalogKind, params: CatalogListParams = {}) {
  return useQuery({
    queryKey: catalogQueryKey(kind, params),
    queryFn: () => fetchCatalogPage(kind, params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * RestraintType create body. The backend accepts the same body for
 * both editor proposals and admin direct-approve creates; the route
 * promotes admin-created entries to `status='approved'` automatically
 * (ADR-042 §F).
 */
export interface RestraintTypeCreatePayload {
  category: string;
  brand?: string | null;
  model?: string | null;
  mechanical_type?: string | null;
  display_name: string;
  note?: string | null;
}

export type CatalogCreatePayload<K extends CatalogKind> = K extends "restraint-types"
  ? RestraintTypeCreatePayload
  : never;

export type RestraintTypeUpdatePayload = Partial<RestraintTypeCreatePayload>;
export type CatalogUpdatePayload<K extends CatalogKind> = K extends "restraint-types"
  ? RestraintTypeUpdatePayload
  : never;

export function useCreateCatalogEntry<K extends CatalogKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation<AnyCatalogEntry, Error, CatalogCreatePayload<K>>({
    mutationFn: async (body) =>
      await apiFetch<AnyCatalogEntry>(`/api/${kind}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalog", kind] });
    },
  });
}

export function useUpdateCatalogEntry<K extends CatalogKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation<AnyCatalogEntry, Error, { id: string; body: CatalogUpdatePayload<K> }>({
    mutationFn: async ({ id, body }) =>
      await apiFetch<AnyCatalogEntry>(`/api/${kind}/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalog", kind] });
    },
  });
}

/**
 * Admin-only: promote a pending entry to `approved`. Backend sets
 * `approved_by` / `approved_at` server-side (ADR-043 §B).
 */
export function useApproveCatalogEntry<K extends CatalogKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation<AnyCatalogEntry, Error, { id: string }>({
    mutationFn: async ({ id }) =>
      await apiFetch<AnyCatalogEntry>(`/api/${kind}/${id}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalog", kind] });
    },
  });
}

/**
 * Admin-only: reject a pending entry with a mandatory reason. The
 * proposing editor will continue to see the row with the reason
 * attached (RLS lets `suggested_by = self` see own rejected rows).
 */
export function useRejectCatalogEntry<K extends CatalogKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation<AnyCatalogEntry, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) =>
      await apiFetch<AnyCatalogEntry>(`/api/${kind}/${id}/reject`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalog", kind] });
    },
  });
}

/**
 * Hard-delete a pending entry. Admin: any pending row. Editor: own
 * pending only — RLS enforces both. Approved/rejected rows are not
 * deletable by either (backend returns 409 CatalogStateError).
 */
export function useWithdrawCatalogEntry<K extends CatalogKind>(kind: K) {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      await apiFetch<void>(`/api/${kind}/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalog", kind] });
    },
  });
}

export async function fetchCatalogEntry(
  kind: CatalogKind,
  id: string,
): Promise<RestraintTypeEntry> {
  // The list endpoint is the only read path the API exposes, so we
  // page-scan with a status-agnostic call and pick the matching row.
  // Catalog tables are tiny (<200 rows in Pfad A), so a single
  // page is enough.
  const page = await fetchCatalogPage(kind, { limit: 200 });
  const found = page.items.find((entry) => entry.id === id);
  if (!found) {
    throw new Error("Eintrag nicht gefunden");
  }
  return found;
}

export function useCatalogEntry<K extends CatalogKind>(kind: K, id: string | null) {
  return useQuery({
    queryKey: ["catalog", kind, "entry", id ?? ""] as const,
    queryFn: () => fetchCatalogEntry(kind, id as string),
    enabled: id !== null,
    staleTime: 60 * 1000,
  });
}
