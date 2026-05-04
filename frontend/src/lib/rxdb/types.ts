/**
 * TypeScript document types for the RxDB-replicated collections.
 *
 * Hand-maintained to match the JSON schemas under
 * `frontend/src/lib/rxdb/schemas/{event,application}.schema.json` and the
 * backend Pydantic schemas in `backend/app/sync/schemas.py`. The
 * backend drift test (`tests/test_rxdb_schema_drift.py`, ADR-031) is
 * the authoritative guard against the JSON ↔ Pydantic side; this file
 * mirrors the JSON-schema shape into TypeScript so RxDB can produce
 * typed `RxDocument`s.
 *
 * The wire-format flag `_deleted` doubles as RxDB's tombstone marker —
 * RxDB itself reserves the field name and treats it as the soft-delete
 * indicator, which dovetails neatly with ADR-030.
 */

/** ADR-058: granularity marker for retrospective event entry. */
export type TimePrecision = "year" | "month" | "day" | "hour" | "minute";

export interface EventDocType {
  id: string;
  started_at: string; // ISO 8601, UTC
  ended_at: string | null;
  lat: number;
  lon: number;
  legacy_external_ref: string | null;
  reveal_participants: boolean;
  title: string | null;
  note: string | null;
  time_precision: TimePrecision;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _deleted: boolean;
}

/**
 * EventParticipant link row replicated via /api/sync/event-participants
 * (M5c.1b, ADR-037). Pull-only — there is no client-side mutation
 * path: server-side auto-participant inserts (ADR-012) and the
 * existing REST endpoints handle the writes; the frontend only reads.
 */
export interface EventParticipantDocType {
  id: string;
  event_id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _deleted: boolean;
}

export interface ApplicationDocType {
  id: string;
  event_id: string;
  performer_id: string;
  recipient_id: string;
  arm_position_id: string | null;
  hand_position_id: string | null;
  hand_orientation_id: string | null;
  sequence_no: number;
  started_at: string | null;
  ended_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _deleted: boolean;
  /**
   * Denormalised n:m link to ``application_restraint`` (ADR-046).
   * Wire-format default is ``[]``; the backend stores rows separately
   * and replaces the set on push (LWW).
   */
  restraint_type_ids: string[];
}

/** Cursor for the pull endpoint — `(updated_at, id)` per ADR-030. */
export interface SyncCheckpoint {
  updated_at: string;
  id: string;
}
