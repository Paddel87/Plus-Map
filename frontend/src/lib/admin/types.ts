/**
 * TypeScript mirrors of the Pydantic schemas in
 * ``backend/app/schemas/admin.py`` (M8.3, ADR-049).
 *
 * Manual parallel maintenance — same convention as the catalog and
 * sync schemas. Backend OpenAPI is the source of truth for casing and
 * field shape; deviations break the API tests immediately.
 */

import type { PersonRead } from "@/lib/types";

export type UserRole = "admin" | "editor" | "viewer";

export interface AdminUserRead {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  person_id: string;
  display_name: string | null;
  created_at: string;
}

export interface AdminUserCreatePayload {
  email: string;
  password: string;
  role: UserRole;
  display_name?: string | null;
  existing_person_id?: string;
  new_person?: {
    name: string;
    alias?: string | null;
    note?: string | null;
    linkable?: boolean;
  };
  is_verified?: boolean;
}

export interface AdminUserUpdatePayload {
  role?: UserRole;
  is_active?: boolean;
  display_name?: string | null;
}

export interface MonthlyEventCount {
  year: number;
  month: number;
  count: number;
}

export interface EquipmentCount {
  id: string;
  display_name: string;
  count: number;
}

export interface AdminStats {
  events_total: number;
  events_per_month_last_12: MonthlyEventCount[];
  top_equipment: EquipmentCount[];
  users_by_role: Record<UserRole, number>;
  persons_total: number;
  persons_on_the_fly_unlinked: number;
  pending_catalog_proposals: number;
}

export interface PersonMergeRequest {
  target_id: string;
}

export interface PersonMergeResponse {
  source_id: string;
  target_id: string;
  affected_event_participants: number;
  deleted_event_participants: number;
  affected_applications_performer: number;
  affected_applications_recipient: number;
}

export type LinkablePerson = PersonRead;
