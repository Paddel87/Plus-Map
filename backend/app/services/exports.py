"""JSON/CSV export service (ADR-015, ADR-020 §J).

JSON is a single non-streaming object; CSV is exposed per entity as a
streaming response in the route layer (``app/routes/exports.py``).
"""

from __future__ import annotations

import csv
import io
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationEquipment
from app.models.catalog import EquipmentItem
from app.models.event import Event, EventParticipant


async def build_json_export(session: AsyncSession) -> dict[str, Any]:
    # Soft-deleted rows are excluded from exports (ADR-030).
    events = (
        (await session.execute(select(Event).where(Event.is_deleted.is_(False)))).scalars().all()
    )
    apps = (
        (await session.execute(select(Application).where(Application.is_deleted.is_(False))))
        .scalars()
        .all()
    )
    # event_participant got soft-delete columns in M5c.1b (ADR-037 §B);
    # exports follow the same "tombstones excluded" rule as events
    # and applications.
    eps = (
        (
            await session.execute(
                select(EventParticipant).where(EventParticipant.is_deleted.is_(False))
            )
        )
        .scalars()
        .all()
    )
    aes = (await session.execute(select(ApplicationEquipment))).scalars().all()

    referenced_ei_ids = {ae.equipment_item_id for ae in aes}
    eis: list[EquipmentItem] = []
    if referenced_ei_ids:
        eis = list(
            (
                await session.execute(
                    select(EquipmentItem).where(EquipmentItem.id.in_(referenced_ei_ids))
                )
            )
            .scalars()
            .all()
        )

    return {
        "version": "1",
        "events": [_event_to_dict(e) for e in events],
        "applications": [_app_to_dict(a) for a in apps],
        "event_participants": [_ep_to_dict(ep) for ep in eps],
        "application_equipment": [_ae_to_dict(ae) for ae in aes],
        "equipment_items": [_ei_to_dict(ei) for ei in eis],
    }


async def stream_events_csv(session: AsyncSession) -> AsyncIterator[str]:
    """Yield CSV rows for the events table (header + visible rows)."""
    headers = [
        "id",
        "started_at",
        "ended_at",
        "lat",
        "lon",
        "reveal_participants",
        "note",
        "created_by",
        "created_at",
    ]
    yield _csv_line(headers)
    rows = (await session.execute(select(Event).where(Event.is_deleted.is_(False)))).scalars().all()
    for e in rows:
        yield _csv_line(
            [
                str(e.id),
                e.started_at.isoformat(),
                e.ended_at.isoformat() if e.ended_at else "",
                str(e.lat),
                str(e.lon),
                "true" if e.reveal_participants else "false",
                e.note or "",
                str(e.created_by) if e.created_by else "",
                e.created_at.isoformat(),
            ]
        )


async def stream_applications_csv(session: AsyncSession) -> AsyncIterator[str]:
    headers = [
        "id",
        "event_id",
        "performer_id",
        "recipient_id",
        "sequence_no",
        "started_at",
        "ended_at",
        "note",
    ]
    yield _csv_line(headers)
    rows = (
        (await session.execute(select(Application).where(Application.is_deleted.is_(False))))
        .scalars()
        .all()
    )
    for a in rows:
        yield _csv_line(
            [
                str(a.id),
                str(a.event_id),
                str(a.performer_id),
                str(a.recipient_id),
                str(a.sequence_no),
                a.started_at.isoformat() if a.started_at else "",
                a.ended_at.isoformat() if a.ended_at else "",
                a.note or "",
            ]
        )


# ---- helpers --------------------------------------------------------


def _csv_line(values: list[str]) -> str:
    buf = io.StringIO()
    csv.writer(buf).writerow(values)
    return buf.getvalue()


def _event_to_dict(e: Event) -> dict[str, Any]:
    return {
        "id": str(e.id),
        "started_at": e.started_at.isoformat(),
        "ended_at": e.ended_at.isoformat() if e.ended_at else None,
        "lat": str(e.lat),
        "lon": str(e.lon),
        "reveal_participants": e.reveal_participants,
        "note": e.note,
        "legacy_external_ref": e.legacy_external_ref,
        "created_by": str(e.created_by) if e.created_by else None,
        "created_at": e.created_at.isoformat(),
    }


def _app_to_dict(a: Application) -> dict[str, Any]:
    return {
        "id": str(a.id),
        "event_id": str(a.event_id),
        "performer_id": str(a.performer_id),
        "recipient_id": str(a.recipient_id),
        "sequence_no": a.sequence_no,
        "started_at": a.started_at.isoformat() if a.started_at else None,
        "ended_at": a.ended_at.isoformat() if a.ended_at else None,
        "note": a.note,
        "created_at": a.created_at.isoformat(),
    }


def _ep_to_dict(ep: EventParticipant) -> dict[str, Any]:
    return {
        "event_id": str(ep.event_id),
        "person_id": str(ep.person_id),
        "created_at": ep.created_at.isoformat(),
    }


def _ae_to_dict(ae: ApplicationEquipment) -> dict[str, Any]:
    return {
        "application_id": str(ae.application_id),
        "equipment_item_id": str(ae.equipment_item_id),
        "created_at": ae.created_at.isoformat(),
    }


def _ei_to_dict(ei: EquipmentItem) -> dict[str, Any]:
    return {
        "id": str(ei.id),
        "category": ei.category.value,
        "brand": ei.brand,
        "model": ei.model,
        "display_name": ei.display_name,
        "status": ei.status.value,
    }
