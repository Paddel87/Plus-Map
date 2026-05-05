"""Application routes: top-level get/patch/delete (ADR-020 §B).

Creation lives nested under events (``POST /api/events/{id}/applications``).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_rls_session
from app.schemas.application import ApplicationRead, ApplicationUpdate
from app.services import applications as application_svc

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/{application_id}", response_model=ApplicationRead)
async def get_application(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> ApplicationRead:
    application = await application_svc.get_application(session, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    ei_ids = await application_svc.equipment_ids_for(session, application_id)
    return ApplicationRead.model_validate({**application.__dict__, "equipment_item_ids": ei_ids})


@router.patch("/{application_id}", response_model=ApplicationRead)
async def patch_application(
    application_id: uuid.UUID,
    payload: ApplicationUpdate,
    session: AsyncSession = Depends(get_rls_session),
) -> ApplicationRead:
    application = await application_svc.get_application(session, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await application_svc.update_application(session, application, payload)
    ei_ids = await application_svc.equipment_ids_for(session, application_id)
    return ApplicationRead.model_validate({**application.__dict__, "equipment_item_ids": ei_ids})


@router.delete(
    "/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_application(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> Response:
    application = await application_svc.get_application(session, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await application_svc.delete_application(session, application)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{application_id}/end",
    response_model=ApplicationRead,
    summary="Finish an application in Live mode (ended_at = now(), idempotent)",
)
async def end_application(
    application_id: uuid.UUID,
    session: AsyncSession = Depends(get_rls_session),
) -> ApplicationRead:
    application = await application_svc.get_application(session, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await application_svc.end_application(session, application)
    ei_ids = await application_svc.equipment_ids_for(session, application_id)
    return ApplicationRead.model_validate({**application.__dict__, "equipment_item_ids": ei_ids})
