/**
 * RxDB collection schemas.
 *
 * The JSON schemas under `./schemas/` are the wire-format contract
 * shared with the backend (ADR-031). RxDB consumes them as
 * `RxJsonSchema`s; the backend's `tests/test_rxdb_schema_drift.py`
 * keeps both sides in lock-step.
 */

import type { RxJsonSchema } from "rxdb";

import applicationSchemaJson from "./schemas/application.schema.json";
import eventParticipantSchemaJson from "./schemas/event_participant.schema.json";
import eventSchemaJson from "./schemas/event.schema.json";
import type { ApplicationDocType, EventDocType, EventParticipantDocType } from "./types";

/**
 * Cast through `unknown` because RxDB's `RxJsonSchema<T>` is a tighter
 * shape than the JSON file's plain object — `as const` would drop the
 * `version` literal, which RxDB requires.
 */
export const eventSchema = eventSchemaJson as unknown as RxJsonSchema<EventDocType>;
export const applicationSchema =
  applicationSchemaJson as unknown as RxJsonSchema<ApplicationDocType>;
export const eventParticipantSchema =
  eventParticipantSchemaJson as unknown as RxJsonSchema<EventParticipantDocType>;
