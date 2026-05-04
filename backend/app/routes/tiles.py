"""MapTiler tile proxy (ADR-022, ADR-024 §C).

Front-ends MapLibre GL JS; the API key stays server-side. Authenticated
users only — tiles are user-independent so no RLS is needed, but anonymous
proxying would expose the upstream key to scraping.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, status
from fastapi.responses import StreamingResponse

from app.auth.routes import current_active_user
from app.config import get_settings
from app.models.user import User

router = APIRouter(prefix="/tiles", tags=["tiles"])

_TILE_CACHE_SECONDS = 86_400
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


@lru_cache(maxsize=1)
def _http_client() -> httpx.AsyncClient:
    """Process-singleton AsyncClient.

    ``lru_cache`` keeps a single instance alive for the process. Tests
    monkey-patch ``app.routes.tiles._http_client`` to inject a fake.
    """
    return httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT)


def _build_upstream_url(z: int, x: int, y: int, *, api_key: str, style: str) -> str:
    return f"https://api.maptiler.com/maps/{style}/{z}/{x}/{y}.png?key={api_key}"


@router.get(
    "/{z}/{x}/{y}",
    summary="Proxy raster tile from MapTiler (auth required, server-side key)",
)
async def get_tile(
    z: int = Path(..., ge=0, le=22),
    x: int = Path(..., ge=0),
    y: int = Path(..., ge=0),
    _user: User = Depends(current_active_user),
) -> StreamingResponse:
    settings = get_settings()
    if not settings.maptiler_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tile provider not configured.",
        )

    url = _build_upstream_url(
        z,
        x,
        y,
        api_key=settings.maptiler_api_key,
        style=settings.maptiler_style,
    )
    client = _http_client()
    try:
        upstream = await client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Tile upstream unreachable.",
        ) from exc

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Tile upstream returned error.",
        )

    media_type = upstream.headers.get("content-type", "image/png")

    async def _iter() -> AsyncIterator[bytes]:
        yield upstream.content

    return StreamingResponse(
        _iter(),
        media_type=media_type,
        headers={"Cache-Control": f"public, max-age={_TILE_CACHE_SECONDS}"},
    )
