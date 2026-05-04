"""Event service: CRUD with RLS-aware ordering and the participant join."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.event import Event, EventParticipant
from app.models.person import Person
from app.schemas.event import EventCreate, EventStart, EventUpdate


async def list_events(
    session: AsyncSession,
    *,
    limit: int,
    offset: int,
) -> tuple[Sequence[Event], int]:
    """List events visible to the current request.

    RLS filtering happens automatically because the session was set up
    via ``get_rls_session`` (see ``app.deps``). Soft-deleted rows
    (``is_deleted = true``, ADR-030) are filtered out at the
    service layer; the sync endpoints are the only consumer that
    must see tombstones.
    """
    total = await session.scalar(
        select(func.count()).select_from(Event).where(Event.is_deleted.is_(False))
    )
    rows = (
        (
            await session.execute(
                select(Event)
                .where(Event.is_deleted.is_(False))
                .order_by(Event.started_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    return rows, int(total or 0)


async def create_event(
    session: AsyncSession,
    payload: EventCreate,
    *,
    created_by: uuid.UUID,
) -> Event:
    event = Event(
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        lat=payload.lat,
        lon=payload.lon,
        reveal_participants=payload.reveal_participants,
        title=payload.title,
        note=payload.note,
        time_precision=payload.time_precision,
        legacy_external_ref=payload.legacy_external_ref,
        created_by=created_by,
    )
    session.add(event)
    await session.flush()
    await session.refresh(event)
    return event


async def get_event(session: AsyncSession, event_id: uuid.UUID) -> Event | None:
    """Fetch event by id; soft-deleted rows are treated as absent (ADR-030)."""
    event = await session.get(Event, event_id)
    if event is None or event.is_deleted:
        return None
    return event


async def update_event(
    session: AsyncSession,
    event: Event,
    payload: EventUpdate,
) -> Event:
    was_open = event.ended_at is None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await session.flush()
    # ADR-057: when ended_at transitions from null to non-null, cascade
    # to any still-running applications.
    if was_open and event.ended_at is not None:
        await auto_stop_open_applications(session, event.id, event.ended_at)
    await session.refresh(event)
    return event


async def delete_event(session: AsyncSession, event: Event) -> None:
    await session.delete(event)
    await session.flush()


async def start_event(
    session: AsyncSession,
    payload: EventStart,
    *,
    created_by: uuid.UUID,
    creator_person_id: uuid.UUID,
) -> Event:
    """Create a Live-mode event with ``started_at = now()`` (ADR-024 §B).

    The creator is implicitly added as a participant. If a recipient is
    supplied, it is added as a second participant so subsequent
    live-applications can default to it.
    """
    event = Event(
        started_at=datetime.now(tz=UTC),
        ended_at=None,
        lat=payload.lat,
        lon=payload.lon,
        reveal_participants=payload.reveal_participants,
        title=payload.title,
        note=payload.note,
        time_precision=payload.time_precision,
        created_by=created_by,
    )
    session.add(event)
    await session.flush()
    await session.refresh(event)

    await add_participant(session, event.id, creator_person_id)
    if payload.recipient_id and payload.recipient_id != creator_person_id:
        await add_participant(session, event.id, payload.recipient_id)
    return event


async def end_event(session: AsyncSession, event: Event) -> Event:
    """Set ``ended_at = now()`` if not already set (idempotent).

    Also auto-stops every still-running Application of the event by
    setting their ``ended_at`` to the same timestamp (ADR-057). This
    keeps the lifecycle cascade consistent — a finished event must
    not have running children.
    """
    if event.ended_at is None:
        ended_at = datetime.now(tz=UTC)
        event.ended_at = ended_at
        await session.flush()
        await auto_stop_open_applications(session, event.id, ended_at)
        await session.refresh(event)
    return event


async def auto_stop_open_applications(
    session: AsyncSession,
    event_id: uuid.UUID,
    ended_at: datetime,
) -> int:
    """Close every running, non-deleted Application of the event (ADR-057).

    Returns the number of Application rows that were updated. Idempotent:
    if no Applications are running, the UPDATE matches zero rows and
    nothing is changed. ``updated_at`` is left to the database trigger
    (``set_updated_at``, see M1 migration) so the RxDB cursor advances.
    """
    result = await session.execute(
        update(Application)
        .where(
            Application.event_id == event_id,
            Application.ended_at.is_(None),
            Application.is_deleted.is_(False),
        )
        .values(ended_at=ended_at)
    )
    # `result` is a CursorResult for bulk DML, which carries rowcount;
    # the typed Result[Any] return signature hides that, hence the cast.
    return int(getattr(result, "rowcount", 0) or 0)


async def list_participants(session: AsyncSession, event_id: uuid.UUID) -> Sequence[Person]:
    rows = (
        (
            await session.execute(
                select(Person)
                .join(EventParticipant, EventParticipant.person_id == Person.id)
                .where(EventParticipant.event_id == event_id)
                .order_by(Person.name)
            )
        )
        .scalars()
        .all()
    )
    return rows


async def add_participant(
    session: AsyncSession, event_id: uuid.UUID, person_id: uuid.UUID
) -> EventParticipant | None:
    """Insert participant link if not already present.

    ``EventParticipant`` got a surrogate UUID PK in M5c.1b (ADR-037
    §A); the ``(event_id, person_id)`` uniqueness now lives in the
    UNIQUE constraint, so we look the row up by query rather than
    composite-key ``session.get``.
    """
    existing = await session.scalar(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.person_id == person_id,
        )
    )
    if existing is not None:
        return None
    link = EventParticipant(event_id=event_id, person_id=person_id)
    session.add(link)
    await session.flush()
    return link


async def remove_participant(
    session: AsyncSession, event_id: uuid.UUID, person_id: uuid.UUID
) -> bool:
    link = await session.scalar(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.person_id == person_id,
        )
    )
    if link is None:
        return False
    await session.delete(link)
    await session.flush()
    return True
