"""Person routes: list/CRUD plus admin-only anonymisation."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.routes import current_active_user
from app.deps import get_rls_session, require_role
from app.models.person import Person
from app.models.user import User, UserRole
from app.schemas.common import Page
from app.schemas.person import (
    PersonCreate,
    PersonQuickCreate,
    PersonRead,
    PersonUpdate,
)
from app.services import persons as person_svc

router = APIRouter(prefix="/persons", tags=["persons"])


@router.get("", response_model=Page[PersonRead])
async def list_persons(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, description="Filter by case-insensitive name match"),
    include_deleted: bool = False,
    session: AsyncSession = Depends(get_rls_session),
) -> Page[PersonRead]:
    rows, total = await person_svc.list_persons(
        session,
        limit=limit,
        offset=offset,
        include_deleted=include_deleted,
        name_query=q,
    )
    return Page[PersonRead](
        items=[PersonRead.model_validate(p) for p in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=PersonRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a managed person (admin-only)",
)
async def create_person(
    payload: PersonCreate,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> PersonRead:
    person = await person_svc.create_person(session, payload, created_by=user.id)
    return PersonRead.model_validate(person)


@router.post(
    "/quick",
    response_model=PersonRead,
    status_code=status.HTTP_201_CREATED,
    summary="On-the-fly person from Live mode (admin + editor, ADR-014)",
)
async def quick_create_person(
    payload: PersonQuickCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> PersonRead:
    if user.role not in (UserRole.ADMIN, UserRole.EDITOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role.",
        )
    person = await person_svc.quick_create_person(session, payload, created_by=user.id)
    return PersonRead.model_validate(person)


@router.get("/{person_id}", response_model=PersonRead)
async def get_person(
    person_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> PersonRead:
    person = await session.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return PersonRead.model_validate(person)


@router.patch("/{person_id}", response_model=PersonRead)
async def patch_person(
    person_id: uuid.UUID,
    payload: PersonUpdate,
    _: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> PersonRead:
    person = await session.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await person_svc.update_person(session, person, payload)
    return PersonRead.model_validate(person)


@router.post(
    "/{person_id}/anonymize",
    response_model=PersonRead,
    summary="DSGVO Art. 17 anonymisation (admin-only, ADR-002)",
)
async def anonymize_person(
    person_id: uuid.UUID,
    _: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> PersonRead:
    person = await session.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await person_svc.anonymize_person(session, person)
    return PersonRead.model_validate(person)
