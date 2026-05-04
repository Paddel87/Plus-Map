"""Person service: CRUD, list, anonymisation (ADR-002, ADR-020)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person, PersonOrigin
from app.schemas.person import PersonCreate, PersonQuickCreate, PersonUpdate


async def list_persons(
    session: AsyncSession,
    *,
    limit: int,
    offset: int,
    include_deleted: bool = False,
    name_query: str | None = None,
) -> tuple[Sequence[Person], int]:
    base_filter = (
        select(Person) if include_deleted else select(Person).where(Person.is_deleted.is_(False))
    )
    if name_query:
        base_filter = base_filter.where(Person.name.ilike(f"%{name_query}%"))
    total = await session.scalar(select(func.count()).select_from(base_filter.subquery()))
    rows = (
        (await session.execute(base_filter.order_by(Person.name).limit(limit).offset(offset)))
        .scalars()
        .all()
    )
    return rows, int(total or 0)


async def create_person(
    session: AsyncSession,
    payload: PersonCreate,
    *,
    created_by: uuid.UUID,
) -> Person:
    person = Person(
        name=payload.name,
        alias=payload.alias,
        note=payload.note,
        linkable=payload.linkable,
        created_by=created_by,
    )
    session.add(person)
    await session.flush()
    await session.refresh(person)
    return person


async def quick_create_person(
    session: AsyncSession,
    payload: PersonQuickCreate,
    *,
    created_by: uuid.UUID,
) -> Person:
    """Spontaneous on-the-fly person from the live capture flow.

    Forces ``origin = on_the_fly`` and ``linkable = false`` (Regel-004).
    """
    person = Person(
        name=payload.name,
        alias=payload.alias,
        origin=PersonOrigin.ON_THE_FLY,
        linkable=False,
        created_by=created_by,
    )
    session.add(person)
    await session.flush()
    await session.refresh(person)
    return person


async def update_person(
    session: AsyncSession,
    person: Person,
    payload: PersonUpdate,
) -> Person:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    await session.flush()
    await session.refresh(person)
    return person


async def anonymize_person(session: AsyncSession, person: Person) -> Person:
    """Apply the anonymisation rule from ADR-002.

    Replaces ``name`` with the placeholder, clears ``alias`` and ``note``,
    sets ``is_deleted = true`` and ``deleted_at = now()``. Foreign-key
    relations stay intact so audit trails survive.
    """
    person.name = "[gelöscht]"
    person.alias = None
    person.note = None
    person.is_deleted = True
    person.deleted_at = datetime.now(tz=UTC)
    await session.flush()
    await session.refresh(person)
    return person
