"""Event + EventParticipant + nested Applications routes (ADR-020 §B)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.routes import current_active_user
from app.deps import get_rls_session
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationLiveStart,
    ApplicationRead,
)
from app.schemas.common import Page
from app.schemas.event import (
    EventCreate,
    EventDetail,
    EventListItem,
    EventStart,
    EventUpdate,
)
from app.schemas.person import PersonRead
from app.services import applications as application_svc
from app.services import events as event_svc
from app.services import masking
from app.services.plus_code import encode as encode_plus_code

router = APIRouter(prefix="/events", tags=["events"])


@router.get(
    "",
    response_model=Page[EventListItem],
    summary="List events visible to the current user",
)
async def list_events(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_rls_session),
) -> Page[EventListItem]:
    rows, total = await event_svc.list_events(session, limit=limit, offset=offset)
    return Page[EventListItem](
        items=[EventListItem.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=EventDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create an event (non-Live mode)",
)
async def create_event(
    payload: EventCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> EventDetail:
    event = await event_svc.create_event(session, payload, created_by=user.id)
    # The creator is implicitly a participant (so they can see their own event).
    await event_svc.add_participant(session, event.id, user.person_id)
    return await _build_detail(session, event.id, user)


@router.post(
    "/start",
    response_model=EventDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Start an event in Live mode (started_at = now())",
)
async def start_event(
    payload: EventStart,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> EventDetail:
    event = await event_svc.start_event(
        session,
        payload,
        created_by=user.id,
        creator_person_id=user.person_id,
    )
    return await _build_detail(session, event.id, user)


@router.post(
    "/{event_id}/end",
    response_model=EventDetail,
    summary="Finish an event in Live mode (ended_at = now(), idempotent)",
)
async def end_event(
    event_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> EventDetail:
    event = await event_svc.get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await event_svc.end_event(session, event)
    return await _build_detail(session, event_id, user)


@router.get(
    "/{event_id}",
    response_model=EventDetail,
    summary="Event detail with participants and Plus Code",
)
async def get_event(
    event_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> EventDetail:
    return await _build_detail(session, event_id, user)


@router.patch("/{event_id}", response_model=EventDetail)
async def patch_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> EventDetail:
    event = await event_svc.get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await event_svc.update_event(session, event, payload)
    return await _build_detail(session, event_id, user)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_event(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> Response:
    event = await event_svc.get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await event_svc.delete_event(session, event)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Participants -----------------------------------------------------


@router.post(
    "/{event_id}/participants",
    response_model=list[PersonRead],
    summary="Add a person as a participant",
)
async def add_participant(
    event_id: uuid.UUID,
    person_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> list[PersonRead]:
    await event_svc.add_participant(session, event_id, person_id)
    return await _participants(session, event_id, user)


@router.delete(
    "/{event_id}/participants/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def remove_participant(
    event_id: uuid.UUID,
    person_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> Response:
    removed = await event_svc.remove_participant(session, event_id, person_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Nested Application creation (per architecture.md §API) -----------


@router.get(
    "/{event_id}/applications",
    response_model=list[ApplicationRead],
    summary="List applications of an event in sequence order",
)
async def list_applications_for_event(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> list[ApplicationRead]:
    event = await event_svc.get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    rows = await application_svc.list_applications_for_event(session, event_id)
    result: list[ApplicationRead] = []
    for application in rows:
        ei_ids = await application_svc.equipment_ids_for(session, application.id)
        result.append(
            ApplicationRead.model_validate({**application.__dict__, "equipment_item_ids": ei_ids})
        )
    return result


@router.post(
    "/{event_id}/applications",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_application_for_event(
    event_id: uuid.UUID,
    payload: ApplicationCreate,
    strict: bool = Query(default=False),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> ApplicationRead:
    application = await application_svc.create_application(
        session,
        event_id=event_id,
        payload=payload,
        created_by=user.id,
        role=user.role,
        strict=strict,
    )
    ei_ids = await application_svc.equipment_ids_for(session, application.id)
    return ApplicationRead.model_validate({**application.__dict__, "equipment_item_ids": ei_ids})


@router.post(
    "/{event_id}/applications/start",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Start an application in Live mode (started_at = now())",
)
async def start_application_for_event(
    event_id: uuid.UUID,
    payload: ApplicationLiveStart,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> ApplicationRead:
    application = await application_svc.start_application(
        session,
        event_id=event_id,
        payload=payload,
        created_by=user.id,
        requester_person_id=user.person_id,
        role=user.role,
    )
    ei_ids = await application_svc.equipment_ids_for(session, application.id)
    return ApplicationRead.model_validate({**application.__dict__, "equipment_item_ids": ei_ids})


# --- helpers ----------------------------------------------------------


async def _build_detail(session: AsyncSession, event_id: uuid.UUID, user: User) -> EventDetail:
    event = await event_svc.get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    participants = await _participants(session, event_id, user)
    return EventDetail(
        id=event.id,
        started_at=event.started_at,
        ended_at=event.ended_at,
        lat=event.lat,
        lon=event.lon,
        reveal_participants=event.reveal_participants,
        title=event.title,
        note=event.note,
        time_precision=event.time_precision,
        legacy_external_ref=event.legacy_external_ref,
        created_by=event.created_by,
        created_at=event.created_at,
        updated_at=event.updated_at,
        plus_code=encode_plus_code(event.lat, event.lon),
        participants=participants,
    )


async def _participants(session: AsyncSession, event_id: uuid.UUID, user: User) -> list[PersonRead]:
    event = await event_svc.get_event(session, event_id)
    if event is None:
        return []
    persons = await event_svc.list_participants(session, event_id)
    return [
        masking.project_participant(p, event=event, requesting_person_id=user.person_id)
        for p in persons
    ]
