"""Search and Throwbacks routes (ADR-015, ADR-020 §G)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_rls_session
from app.schemas.common import Page
from app.schemas.search import SearchHit, ThrowbackEvent
from app.services import search as search_svc

router = APIRouter(tags=["search"])


@router.get(
    "/search",
    response_model=Page[SearchHit],
    summary="Full-text search over Event and Application notes (German tsvector)",
)
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_rls_session),
) -> Page[SearchHit]:
    hits, total = await search_svc.search(session, query=q, limit=limit, offset=offset)
    return Page[SearchHit](items=hits, total=total, limit=limit, offset=offset)


@router.get(
    "/throwbacks/today",
    response_model=list[ThrowbackEvent],
    summary="Events from this calendar day in past years",
)
async def throwbacks_today(
    session: AsyncSession = Depends(get_rls_session),
) -> list[ThrowbackEvent]:
    return await search_svc.throwbacks_today(session)
