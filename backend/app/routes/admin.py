"""Admin-only routes mounted under /api/admin (M8.3, ADR-049).

Five surfaces:

* ``users`` - CRUD with the linkable-person bridge from ADR-014 (admin
  may either link the new account to a pre-existing ``linkable=true``
  person or create a fresh person row in the same transaction).
* ``persons/{id}/merge`` - dedicated merge workflow (the existing
  ``/api/persons/{id}/anonymize`` covers DSGVO Art. 17 and is reused).
* ``stats`` - one aggregate response with monthly counts, top
  restraints/positions, user/person counts, pending catalog proposals.
* ``export/all`` - structured JSON dump used as the offline-snapshot
  ("Notausstieg") path from ADR-015.

Every endpoint depends on ``require_role(UserRole.ADMIN)`` and runs
through ``get_rls_session``. RLS already grants admins a row-level
bypass via ``current_role = 'admin'``, so plain SELECTs see everything.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.manager import _password_helper
from app.deps import get_rls_session, require_role
from app.models.application import Application, ApplicationRestraint
from app.models.catalog import CatalogStatus, RestraintType
from app.models.event import Event, EventParticipant
from app.models.person import Person, PersonOrigin
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminExport,
    AdminStats,
    AdminUserCreate,
    AdminUserRead,
    AdminUserUpdate,
    MonthlyEventCount,
    PersonMergeRequest,
    PersonMergeResponse,
    RestraintCount,
)
from app.schemas.common import Page
from app.services import person_merge as merge_svc
from app.services import persons as person_svc
from app.services.person_merge import PersonMergeError

router = APIRouter(prefix="/admin", tags=["admin"])

_ADMIN_DEP = Depends(require_role(UserRole.ADMIN))


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users", response_model=Page[AdminUserRead])
async def list_users(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    _admin: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> Page[AdminUserRead]:
    base = select(User)
    if role is not None:
        base = base.where(User.role == role)
    if is_active is not None:
        base = base.where(User.is_active.is_(is_active))  # type: ignore[attr-defined]
    total = await session.scalar(select(func.count()).select_from(base.subquery()))
    rows = (
        (await session.execute(base.order_by(User.email).limit(limit).offset(offset)))
        .scalars()
        .all()
    )
    return Page[AdminUserRead](
        items=[AdminUserRead.model_validate(u) for u in rows],
        total=int(total or 0),
        limit=limit,
        offset=offset,
    )


@router.post(
    "/users",
    response_model=AdminUserRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: AdminUserCreate,
    actor: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> AdminUserRead:
    person_id = await _resolve_person_for_user(session, payload, actor=actor)

    helper = _password_helper()
    user = User(
        email=payload.email,
        hashed_password=helper.hash(payload.password),
        is_active=True,
        is_verified=payload.is_verified,
        is_superuser=False,
        role=payload.role,
        person_id=person_id,
        display_name=payload.display_name,
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        # Email or person_id UNIQUE collision.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use or person already linked to a user.",
        ) from exc
    await session.refresh(user)
    return AdminUserRead.model_validate(user)


async def _resolve_person_for_user(
    session: AsyncSession,
    payload: AdminUserCreate,
    *,
    actor: User,
) -> uuid.UUID:
    if payload.existing_person_id is not None:
        person = await session.get(Person, payload.existing_person_id)
        if person is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="existing_person_id not found.",
            )
        if person.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Person is deleted; cannot link a user.",
            )
        if not person.linkable:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Person is not flagged linkable=true (ADR-014).",
            )
        return person.id

    assert payload.new_person is not None  # validator enforces
    new_person = await person_svc.create_person(session, payload.new_person, created_by=actor.id)
    return new_person.id


@router.patch("/users/{user_id}", response_model=AdminUserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    _admin: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> AdminUserRead:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await session.flush()
    await session.refresh(user)
    return AdminUserRead.model_validate(user)


@router.delete(
    "/users/{user_id}",
    response_model=AdminUserRead,
    summary="Deactivate user (soft action - keeps audit trail)",
)
async def deactivate_user(
    user_id: uuid.UUID,
    actor: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> AdminUserRead:
    if user_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Refusing to deactivate the calling admin.",
        )
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    user.is_active = False
    await session.flush()
    await session.refresh(user)
    return AdminUserRead.model_validate(user)


# ---------------------------------------------------------------------------
# Person merge
# ---------------------------------------------------------------------------


@router.post(
    "/persons/{source_id}/merge",
    response_model=PersonMergeResponse,
    summary="Re-point all FKs from source to target, soft-delete source.",
)
async def merge_person(
    source_id: uuid.UUID,
    payload: PersonMergeRequest,
    actor: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> PersonMergeResponse:
    try:
        result = await merge_svc.merge_persons(
            session,
            source_id=source_id,
            target_id=payload.target_id,
            actor_user_id=actor.id,
        )
    except PersonMergeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return PersonMergeResponse(
        source_id=result.source_id,
        target_id=result.target_id,
        affected_event_participants=result.affected_event_participants,
        deleted_event_participants=result.deleted_event_participants,
        affected_applications_performer=result.affected_applications_performer,
        affected_applications_recipient=result.affected_applications_recipient,
    )


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStats)
async def get_stats(
    _admin: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> AdminStats:
    events_total = await session.scalar(
        select(func.count()).select_from(Event).where(Event.is_deleted.is_(False))
    )

    twelve_months_ago = datetime.now(tz=UTC) - timedelta(days=365)
    monthly_q = (
        select(
            func.extract("year", Event.started_at).label("y"),
            func.extract("month", Event.started_at).label("m"),
            func.count().label("c"),
        )
        .where(Event.is_deleted.is_(False))
        .where(Event.started_at >= twelve_months_ago)
        .group_by("y", "m")
        .order_by("y", "m")
    )
    monthly_rows = (await session.execute(monthly_q)).all()
    monthly = [
        MonthlyEventCount(year=int(r.y), month=int(r.m), count=int(r.c)) for r in monthly_rows
    ]

    top_restraints_q = (
        select(
            RestraintType.id,
            RestraintType.display_name,
            func.count().label("c"),
        )
        .join(
            ApplicationRestraint,
            ApplicationRestraint.restraint_type_id == RestraintType.id,
        )
        .join(Application, Application.id == ApplicationRestraint.application_id)
        .where(Application.is_deleted.is_(False))
        .group_by(RestraintType.id, RestraintType.display_name)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_restraints = [
        RestraintCount(id=r.id, display_name=r.display_name, count=int(r.c))
        for r in (await session.execute(top_restraints_q)).all()
    ]

    users_by_role_q = select(User.role, func.count()).group_by(User.role)
    users_by_role: dict[UserRole, int] = {
        cast(UserRole, role): int(c) for role, c in (await session.execute(users_by_role_q)).all()
    }

    persons_total = await session.scalar(
        select(func.count()).select_from(Person).where(Person.is_deleted.is_(False))
    )
    on_the_fly_unlinked = await session.scalar(
        select(func.count())
        .select_from(Person)
        .outerjoin(User, User.person_id == Person.id)
        .where(Person.is_deleted.is_(False))
        .where(Person.origin == PersonOrigin.ON_THE_FLY)
        .where(User.id.is_(None))  # type: ignore[attr-defined]
    )
    pending_proposals = int(
        await session.scalar(
            select(func.count())
            .select_from(RestraintType)
            .where(RestraintType.status == CatalogStatus.PENDING)
        )
        or 0
    )

    return AdminStats(
        events_total=int(events_total or 0),
        events_per_month_last_12=monthly,
        top_restraints=top_restraints,
        users_by_role=users_by_role,
        persons_total=int(persons_total or 0),
        persons_on_the_fly_unlinked=int(on_the_fly_unlinked or 0),
        pending_catalog_proposals=pending_proposals,
    )


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


@router.get(
    "/export/all",
    response_model=AdminExport,
    summary="Full structured JSON dump (ADR-015 'Notausstieg' / ADR-049 §G).",
)
async def export_all(
    _admin: User = _ADMIN_DEP,
    session: AsyncSession = Depends(get_rls_session),
) -> AdminExport:
    return AdminExport(
        exported_at=datetime.now(tz=UTC),
        users=await _dump(session, User),
        persons=await _dump(session, Person),
        events=await _dump(session, Event),
        applications=await _dump(session, Application),
        event_participants=await _dump(session, EventParticipant),
        application_restraints=await _dump(session, ApplicationRestraint),
        restraint_types=await _dump(session, RestraintType),
    )


async def _dump(session: AsyncSession, model: Any) -> list[dict[str, object]]:
    rows = (await session.execute(select(model))).scalars().all()
    return [_row_to_dict(r) for r in rows]


def _row_to_dict(row: Any) -> dict[str, object]:
    out: dict[str, object] = {}
    for col in row.__table__.columns:
        v = getattr(row, col.name)
        # Drop unserialisable PostGIS geometry payload; lat/lon mirror it.
        if col.name == "geom":
            continue
        # Hashed password never leaves the DB even in admin export.
        if col.name == "hashed_password":
            continue
        if isinstance(v, datetime):
            out[col.name] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            out[col.name] = str(v)
        else:
            out[col.name] = v
    return out
