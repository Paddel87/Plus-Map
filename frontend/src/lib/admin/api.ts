"use client";

/**
 * TanStack-Query hooks for the /api/admin/* surface (M8.4, ADR-049).
 *
 * Cache-Key shape: `["admin", <resource>, ...]` — mutations invalidate
 * the resource subtree. Stale time is short (60s) because admin
 * actions are infrequent and feedback latency matters more than
 * caching gains.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Page, PersonRead } from "@/lib/types";

import type {
  AdminStats,
  AdminUserCreatePayload,
  AdminUserRead,
  AdminUserUpdatePayload,
  PersonMergeRequest,
  PersonMergeResponse,
  UserRole,
} from "./types";

const ADMIN_KEY = ["admin"] as const;

// ---------- Stats ----------

export function adminStatsQueryKey() {
  return [...ADMIN_KEY, "stats"] as const;
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminStatsQueryKey(),
    queryFn: () => apiFetch<AdminStats>("/api/admin/stats"),
    staleTime: 60 * 1000,
  });
}

// ---------- Users ----------

export interface AdminUserListParams {
  role?: UserRole;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export function adminUsersQueryKey(params: AdminUserListParams = {}) {
  const { role, is_active, limit, offset } = params;
  return [
    ...ADMIN_KEY,
    "users",
    {
      role: role ?? null,
      is_active: is_active ?? null,
      limit: limit ?? null,
      offset: offset ?? null,
    },
  ] as const;
}

export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery({
    queryKey: adminUsersQueryKey(params),
    queryFn: () =>
      apiFetch<Page<AdminUserRead>>("/api/admin/users", {
        query: {
          role: params.role,
          is_active: params.is_active,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    staleTime: 60 * 1000,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserCreatePayload) =>
      apiFetch<AdminUserRead>("/api/admin/users", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "users"] });
      void qc.invalidateQueries({ queryKey: adminStatsQueryKey() });
    },
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserUpdatePayload }) =>
      apiFetch<AdminUserRead>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "users"] });
    },
  });
}

export function useDeactivateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<AdminUserRead>(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "users"] });
    },
  });
}

// ---------- Person picker (linkable) ----------

export interface PersonsListParams {
  q?: string;
  limit?: number;
  offset?: number;
  include_deleted?: boolean;
}

export function linkablePersonsQueryKey(params: PersonsListParams = {}) {
  const { q, limit, offset } = params;
  return [
    ...ADMIN_KEY,
    "linkable-persons",
    { q: q ?? null, limit: limit ?? null, offset: offset ?? null },
  ] as const;
}

/**
 * Lists every Person reachable to the admin (RLS makes that "all").
 * The caller is responsible for filtering ``linkable === true`` in the
 * UI - the backend API doesn't expose a server-side ``linkable=true``
 * filter today and adding one would mean a route change in M8.3, which
 * we deliberately kept out of scope.
 */
export function useLinkablePersons(params: PersonsListParams = {}) {
  return useQuery({
    queryKey: linkablePersonsQueryKey(params),
    queryFn: () =>
      apiFetch<Page<PersonRead>>("/api/persons", {
        query: {
          q: params.q,
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
        },
      }),
    staleTime: 60 * 1000,
  });
}

// ---------- Admin persons listing (Filter/Merge/Anonymize, M8.5) ----------

/**
 * Admin-facing persons list. Same backend route as ``useLinkablePersons``
 * but a separate cache key so the M8.4 user-creation picker and the
 * M8.5 merge/anonymise workspace can coexist without invalidating each
 * other on every keystroke. The optional ``include_deleted`` flag lets
 * the admin still see the soft-delete trail of merged/anonymised rows.
 */
export function adminPersonsQueryKey(params: PersonsListParams = {}) {
  const { q, limit, offset, include_deleted } = params;
  return [
    ...ADMIN_KEY,
    "persons",
    {
      q: q ?? null,
      limit: limit ?? null,
      offset: offset ?? null,
      include_deleted: include_deleted ?? null,
    },
  ] as const;
}

export function useAdminPersons(params: PersonsListParams = {}) {
  return useQuery({
    queryKey: adminPersonsQueryKey(params),
    queryFn: () =>
      apiFetch<Page<PersonRead>>("/api/persons", {
        query: {
          q: params.q,
          limit: params.limit ?? 200,
          offset: params.offset ?? 0,
          include_deleted: params.include_deleted,
        },
      }),
    staleTime: 30 * 1000,
  });
}

// ---------- Person merge ----------

export function useMergePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, target_id }: { sourceId: string } & PersonMergeRequest) =>
      apiFetch<PersonMergeResponse>(`/api/admin/persons/${sourceId}/merge`, {
        method: "POST",
        body: { target_id },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "linkable-persons"] });
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "persons"] });
      void qc.invalidateQueries({ queryKey: adminStatsQueryKey() });
    },
  });
}

// ---------- Person anonymise (DSGVO Art. 17, ADR-002) ----------

/**
 * POSTs ``/api/persons/{id}/anonymize`` (the existing endpoint from M2,
 * deliberately reused per ADR-049 §H instead of being re-mounted under
 * ``/api/admin/*``). 100 % coverage requirement comes from
 * project-context.md §6 (DSGVO-Pflicht).
 */
export function useAnonymizePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PersonRead>(`/api/persons/${id}/anonymize`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "persons"] });
      void qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "linkable-persons"] });
      void qc.invalidateQueries({ queryKey: adminStatsQueryKey() });
    },
  });
}

// ---------- Export ----------

export function adminExportUrl() {
  return "/api/admin/export/all";
}
