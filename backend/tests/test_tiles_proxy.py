"""HTTP tests for the MapTiler tile proxy (M5a.1, ADR-022)."""

from __future__ import annotations

from typing import Any

import httpx
import pytest
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import login_as


class _FakeResponse:
    def __init__(self, status_code: int, content: bytes, content_type: str) -> None:
        self.status_code = status_code
        self.content = content
        self.headers: dict[str, str] = {"content-type": content_type}


class _FakeAsyncClient:
    """Stand-in for httpx.AsyncClient in tests; records calls."""

    def __init__(self, *, response: _FakeResponse | None = None, raise_exc: bool = False) -> None:
        self._response = response
        self._raise_exc = raise_exc
        self.last_url: str | None = None

    async def get(self, url: str, **kwargs: Any) -> _FakeResponse:
        self.last_url = url
        if self._raise_exc:
            raise httpx.ConnectError("simulated network failure")
        assert self._response is not None
        return self._response


async def test_anonymous_request_blocked(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLUSMAP_MAPTILER_API_KEY", "test-key")
    resp = await client.get("/api/tiles/3/4/5")
    assert resp.status_code == 401


async def test_missing_api_key_returns_503(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLUSMAP_MAPTILER_API_KEY", "")
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/tiles/3/4/5")
    assert resp.status_code == 503


async def test_successful_tile_returns_image_with_cache_header(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLUSMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setenv("PLUSMAP_MAPTILER_STYLE", "basic-v2")
    fake = _FakeAsyncClient(
        response=_FakeResponse(200, b"\x89PNG\r\n\x1a\n--fake--", "image/png"),
    )
    monkeypatch.setattr("app.routes.tiles._http_client", lambda: fake)

    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/tiles/3/4/5")
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "image/png"
    assert "max-age=86400" in resp.headers["cache-control"]
    assert resp.content.startswith(b"\x89PNG")
    assert fake.last_url is not None
    assert "/maps/basic-v2/3/4/5.png" in fake.last_url
    assert "key=test-key" in fake.last_url


async def test_upstream_network_error_returns_502(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLUSMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.routes.tiles._http_client",
        lambda: _FakeAsyncClient(raise_exc=True),
    )
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/tiles/3/4/5")
    assert resp.status_code == 502


async def test_upstream_status_4xx_returns_502(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLUSMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.routes.tiles._http_client",
        lambda: _FakeAsyncClient(
            response=_FakeResponse(403, b"forbidden", "text/plain"),
        ),
    )
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/tiles/3/4/5")
    assert resp.status_code == 502


async def test_zoom_out_of_range_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLUSMAP_MAPTILER_API_KEY", "test-key")
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/tiles/99/0/0")
    assert resp.status_code == 422
