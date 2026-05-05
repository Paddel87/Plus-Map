"""Application service.

Owns three special behaviours described in ADR-020:
- Auto-Participant: performer + recipient are inserted as
  ``EventParticipant`` if not already present (ADR-012).
- ``sequence_no`` is assigned server-side as next free integer per event.
- Catalog refs (restraint types) must be ``status='approved'`` unless the
  user is admin.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationRestraint
from app.models.catalog import CatalogStatus, RestraintType
from app.models.event import EventParticipant
from app.models.user import UserRole
from app.schemas.application import (
    ApplicationCreate,
    ApplicationLiveStart,
    ApplicationUpdate,
)


async def _ensure_approved_catalog(
    session: AsyncSession,
    *,
    role: UserRole,
    restraint_type_ids: list[uuid.UUID],
) -> None:
    """Reject the request if any catalog reference is not 'approved'.

    Admins are exempt: they may use pending catalog entries directly.
    """
    if role == UserRole.ADMIN:
        return
    for rt_id in restraint_type_ids:
        row = await session.get(RestraintType, rt_id)
        if row is None or row.status != CatalogStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Catalog reference restraint_type={rt_id} is not approved",
            )


async def _next_sequence_no(session: AsyncSession, event_id: uuid.UUID) -> int:
    current = await session.scalar(
        select(func.max(Application.sequence_no)).where(Application.event_id == event_id)
    )
    return int(current or 0) + 1


async def _ensure_participant(
    session: AsyncSession,
    event_id: uuid.UUID,
    person_id: uuid.UUID,
) -> None:
    """Auto-Participant insert (ADR-012). Looked up via the UNIQUE
    ``(event_id, person_id)`` constraint introduced in M5c.1b
    (ADR-037 §A) instead of the previous composite PK."""
    existing = await session.scalar(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.person_id == person_id,
        )
    )
    if existing is None:
        session.add(EventParticipant(event_id=event_id, person_id=person_id))
        await session.flush()


async def create_application(
    session: AsyncSession,
    *,
    event_id: uuid.UUID,
    payload: ApplicationCreate,
    created_by: uuid.UUID,
    role: UserRole,
    strict: bool = False,
) -> Application:
    if strict and payload.performer_id == payload.recipient_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="erfasser und begleitung dürfen nicht identisch sein",
        )
    await _ensure_approved_catalog(
        session,
        role=role,
        restraint_type_ids=payload.restraint_type_ids,
    )
    seq = await _next_sequence_no(session, event_id)
    application = Application(
        event_id=event_id,
        performer_id=payload.performer_id,
        recipient_id=payload.recipient_id,
        sequence_no=seq,
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        note=payload.note,
        created_by=created_by,
    )
    session.add(application)
    await session.flush()

    # Auto-Participant (ADR-012)
    await _ensure_participant(session, event_id, payload.performer_id)
    if payload.recipient_id != payload.performer_id:
        await _ensure_participant(session, event_id, payload.recipient_id)

    for rt_id in payload.restraint_type_ids:
        session.add(ApplicationRestraint(application_id=application.id, restraint_type_id=rt_id))
    await session.flush()
    await session.refresh(application)
    return application


async def start_application(
    session: AsyncSession,
    *,
    event_id: uuid.UUID,
    payload: ApplicationLiveStart,
    created_by: uuid.UUID,
    requester_person_id: uuid.UUID,
    role: UserRole,
) -> Application:
    """Create a Live-mode application (ADR-024 §B, fahrplan §M5a).

    ``started_at`` is set to ``now()``. ``performer_id`` defaults to the
    requester's person (Regel-002); ``recipient_id`` defaults to the
    same person (self-bondage) if not supplied — UI is expected to pass
    the chosen recipient explicitly.
    """
    performer_id = payload.performer_id or requester_person_id
    recipient_id = payload.recipient_id or requester_person_id

    await _ensure_approved_catalog(
        session,
        role=role,
        restraint_type_ids=payload.restraint_type_ids,
    )
    seq = await _next_sequence_no(session, event_id)
    application = Application(
        event_id=event_id,
        performer_id=performer_id,
        recipient_id=recipient_id,
        sequence_no=seq,
        started_at=datetime.now(tz=UTC),
        ended_at=None,
        note=payload.note,
        created_by=created_by,
    )
    session.add(application)
    await session.flush()

    # Auto-Participant (ADR-012)
    await _ensure_participant(session, event_id, performer_id)
    if recipient_id != performer_id:
        await _ensure_participant(session, event_id, recipient_id)

    for rt_id in payload.restraint_type_ids:
        session.add(ApplicationRestraint(application_id=application.id, restraint_type_id=rt_id))
    await session.flush()
    await session.refresh(application)
    return application


async def end_application(
    session: AsyncSession,
    application: Application,
) -> Application:
    """Set ``ended_at = now()`` if not already set (idempotent)."""
    if application.ended_at is None:
        application.ended_at = datetime.now(tz=UTC)
        await session.flush()
        await session.refresh(application)
    return application


async def get_application(session: AsyncSession, application_id: uuid.UUID) -> Application | None:
    """Fetch application by id; soft-deleted rows are absent (ADR-030)."""
    application = await session.get(Application, application_id)
    if application is None or application.is_deleted:
        return None
    return application


async def list_applications_for_event(
    session: AsyncSession, event_id: uuid.UUID
) -> Sequence[Application]:
    rows = (
        (
            await session.execute(
                select(Application)
                .where(Application.event_id == event_id)
                .where(Application.is_deleted.is_(False))
                .order_by(Application.sequence_no)
            )
        )
        .scalars()
        .all()
    )
    return rows


async def restraint_ids_for(session: AsyncSession, application_id: uuid.UUID) -> list[uuid.UUID]:
    rows = (
        (
            await session.execute(
                select(ApplicationRestraint.restraint_type_id).where(
                    ApplicationRestraint.application_id == application_id
                )
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


async def update_application(
    session: AsyncSession,
    application: Application,
    payload: ApplicationUpdate,
) -> Application:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, field, value)
    await session.flush()
    await session.refresh(application)
    return application


async def delete_application(session: AsyncSession, application: Application) -> None:
    await session.delete(application)
    await session.flush()
