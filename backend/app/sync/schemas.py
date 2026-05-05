"""Pydantic schemas for the RxDB sync endpoints (ADR-029, ADR-030, ADR-031).

These models are the wire-format contract between the FastAPI sync
endpoints and the frontend RxDB collections. The same shape is mirrored
in ``frontend/src/lib/rxdb/schemas/{event,application}.schema.json``;
``backend/tests/test_rxdb_schema_drift.py`` keeps the two sides in sync.

Field naming follows RxDB conventions: the tombstone flag travels on
the wire as ``_deleted`` (Pydantic alias), while the DB column is named
``is_deleted``. ``populate_by_name = True`` accepts both spellings on
input.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EventDoc(BaseModel):
    """Event document in the RxDB replication shape.

    Lat/lon use ``float`` because RxDB JSON Schema models them as
    ``number``. The DB column is ``Numeric(9,6)`` and the conversion
    happens in :mod:`app.sync.services`. ``geom`` is the stored
    PostGIS column and not part of the wire format (server-generated).
    """

    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None = None
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    legacy_external_ref: str | None = None
    reveal_participants: bool = False
    title: str | None = Field(default=None, max_length=120)
    note: str | None = None
    # ADR-058: display-only granularity marker. Storage stays full
    # datetime; only the rendered representation is conditioned.
    time_precision: Literal["year", "month", "day", "hour", "minute"] = "minute"
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    deleted: bool = Field(default=False, alias="_deleted")


class EventParticipantDoc(BaseModel):
    """EventParticipant document in the RxDB replication shape (M5c.1b, ADR-037).

    Surrogate ``id`` PK keeps the row addressable for RxDB; ``event_id``
    and ``person_id`` carry the join. ``Person`` details are not part
    of this wire format — the frontend resolves names through the
    existing ``GET /api/events/{id}`` REST snapshot (ADR-037 §E).
    """

    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    event_id: uuid.UUID
    person_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    deleted: bool = Field(default=False, alias="_deleted")


class ApplicationDoc(BaseModel):
    """Application document in the RxDB replication shape.

    ``restraint_type_ids`` is the denormalised n:m link to
    ``application_restraint`` (ADR-046, M7.5). Set-Replace LWW: the
    server stores the union as separate rows, the wire format
    materialises it as an unordered UUID array. Default ``[]`` so
    pre-existing pulls without the field stay valid.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    event_id: uuid.UUID
    performer_id: uuid.UUID
    recipient_id: uuid.UUID
    sequence_no: int = Field(ge=1)
    started_at: datetime | None = None
    ended_at: datetime | None = None
    note: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    deleted: bool = Field(default=False, alias="_deleted")
    restraint_type_ids: list[uuid.UUID] = Field(default_factory=list)


class SyncCheckpoint(BaseModel):
    """Cursor for ``GET /api/sync/{collection}/pull`` (ADR-030).

    Tuple ``(updated_at, id)`` — strictly increasing per the M1
    ``set_updated_at`` trigger. ``id`` breaks ties when two rows share
    the same microsecond.
    """

    updated_at: datetime
    id: uuid.UUID


class EventPullResponse(BaseModel):
    documents: list[EventDoc]
    checkpoint: SyncCheckpoint | None = None


class ApplicationPullResponse(BaseModel):
    documents: list[ApplicationDoc]
    checkpoint: SyncCheckpoint | None = None


class EventParticipantPullResponse(BaseModel):
    """Pull response for ``GET /api/sync/event-participants/pull``.

    M5c.1b is pull-only (ADR-037 §D); there is intentionally no
    matching ``EventParticipantPushItem`` — the frontend never pushes
    participant rows directly. Auto-Participant inserts originate from
    server-side logic (ADR-012) and surface here on the next pull.
    """

    documents: list[EventParticipantDoc]
    checkpoint: SyncCheckpoint | None = None


class EventPushItem(BaseModel):
    """One push entry. ``assumed_master_state`` is ``None`` for inserts."""

    model_config = ConfigDict(populate_by_name=True)

    assumed_master_state: EventDoc | None = Field(default=None, alias="assumedMasterState")
    new_document_state: EventDoc = Field(alias="newDocumentState")


class ApplicationPushItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    assumed_master_state: ApplicationDoc | None = Field(default=None, alias="assumedMasterState")
    new_document_state: ApplicationDoc = Field(alias="newDocumentState")
