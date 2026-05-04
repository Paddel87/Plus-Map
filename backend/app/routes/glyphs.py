"""MapTiler glyph (font PBF) proxy.

MapLibre's symbol layers (e.g. cluster-count text labels) require a
``glyphs`` URL on the style spec. We forward to MapTiler with the
server-side API key, mirroring the tile proxy in ``routes/tiles.py``.
Authenticated users only.
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

router = APIRouter(prefix="/glyphs", tags=["glyphs"])

_GLYPH_CACHE_SECONDS = 86_400 * 7  # fonts change rarely
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


@lru_cache(maxsize=1)
def _http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT)


@router.get(
    "/{fontstack}/{rangespec}",
    summary="Proxy font glyphs from MapTiler (auth required, server-side key)",
)
async def get_glyph(
    fontstack: str = Path(..., min_length=1, max_length=200),
    rangespec: str = Path(..., min_length=1, max_length=40),
    _user: User = Depends(current_active_user),
) -> StreamingResponse:
    settings = get_settings()
    if not settings.maptiler_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Glyph provider not configured.",
        )
    # MapTiler's glyph endpoint expects "{fontstack}/{range}.pbf"; we
    # accept the range with the .pbf suffix as MapLibre sends it.
    url = f"https://api.maptiler.com/fonts/{fontstack}/{rangespec}?key={settings.maptiler_api_key}"
    client = _http_client()
    try:
        upstream = await client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Glyph upstream unreachable.",
        ) from exc
    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Glyph upstream returned error.",
        )
    media_type = upstream.headers.get("content-type", "application/x-protobuf")

    async def _iter() -> AsyncIterator[bytes]:
        yield upstream.content

    return StreamingResponse(
        _iter(),
        media_type=media_type,
        headers={"Cache-Control": f"public, max-age={_GLYPH_CACHE_SECONDS}"},
    )
