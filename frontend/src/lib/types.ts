export interface PersonRead {
  id: string;
  name: string;
  alias: string | null;
  note: string | null;
  origin: "managed" | "on_the_fly";
  linkable: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
}

export type TimePrecision = "year" | "month" | "day" | "hour" | "minute";

export interface EventListItem {
  id: string;
  started_at: string;
  ended_at: string | null;
  lat: number | string;
  lon: number | string;
  reveal_participants: boolean;
  title: string | null;
  note: string | null;
  time_precision: TimePrecision;
  legacy_external_ref: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface EventDetail extends EventListItem {
  plus_code: string;
  participants: PersonRead[];
}

export interface ApplicationRead {
  id: string;
  event_id: string;
  performer_id: string;
  recipient_id: string;
  sequence_no: number;
  started_at: string | null;
  ended_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string | null;
  equipment_item_ids: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface EventStartPayload {
  lat: number;
  lon: number;
  recipient_id?: string;
  reveal_participants?: boolean;
  title?: string;
  note?: string;
  time_precision?: TimePrecision;
}

export interface ApplicationLiveStartPayload {
  performer_id?: string;
  recipient_id?: string;
  note?: string;
  equipment_item_ids?: string[];
}

export function coerceNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}
