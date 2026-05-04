"""HTTP tests for the MapTiler geocoding proxy (M6.1, ADR-041 §B/§D)."""

from __future__ import annotations

from typing import Any

import httpx
import pytest
from app.models.user import UserRole
from app.routes import geocode as geocode_module
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import login_as


class _FakeResponse:
    def __init__(
        self,
        status_code: int,
        json_payload: Any | None = None,
        raw_text: str | None = None,
    ) -> None:
        self.status_code = status_code
        self._json_payload = json_payload
        self._raw_text = raw_text or ""
        self.headers: dict[str, str] = {"content-type": "application/json"}

    def json(self) -> Any:
        if self._json_payload is None:
            raise ValueError("invalid json")
        return self._json_payload


class _FakeAsyncClient:
    """Stand-in for httpx.AsyncClient; records the URL for assertions."""

    def __init__(
        self,
        *,
        response: _FakeResponse | None = None,
        raise_exc: bool = False,
    ) -> None:
        self._response = response
        self._raise_exc = raise_exc
        self.last_url: str | None = None
        self.calls = 0

    async def get(self, url: str, **_: Any) -> _FakeResponse:
        self.calls += 1
        self.last_url = url
        if self._raise_exc:
            raise httpx.ConnectError("simulated network failure")
        assert self._response is not None
        return self._response


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    geocode_module.reset_rate_limiter()


def _sample_payload() -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "place_name": "Berlin, Germany",
                "center": [13.4050, 52.5200],
            }
        ],
    }


async def test_anonymous_request_blocked(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    resp = await client.get("/api/geocode", params={"q": "Berlin"})
    assert resp.status_code == 401


async def test_missing_api_key_returns_503(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "")
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/geocode", params={"q": "Berlin"})
    assert resp.status_code == 503


async def test_successful_query_returns_geojson_with_cache_header(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    fake = _FakeAsyncClient(response=_FakeResponse(200, json_payload=_sample_payload()))
    monkeypatch.setattr("app.routes.geocode._http_client", lambda: fake)

    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get(
        "/api/geocode",
        params={"q": "Berlin Mitte", "limit": 3},
    )

    assert resp.status_code == 200, resp.text
    assert "max-age=300" in resp.headers["cache-control"]
    body = resp.json()
    assert body["type"] == "FeatureCollection"
    assert body["features"][0]["place_name"] == "Berlin, Germany"

    assert fake.last_url is not None
    assert "/geocoding/Berlin%20Mitte.json" in fake.last_url
    assert "key=test-key" in fake.last_url
    assert "limit=3" in fake.last_url
    assert "language=de" in fake.last_url


async def test_proximity_is_translated_to_lon_lat(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    fake = _FakeAsyncClient(response=_FakeResponse(200, json_payload=_sample_payload()))
    monkeypatch.setattr("app.routes.geocode._http_client", lambda: fake)

    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get(
        "/api/geocode",
        params={"q": "Park", "proximity": "52.52,13.405"},
    )

    assert resp.status_code == 200
    assert fake.last_url is not None
    # MapTiler expects lon,lat — our API received lat,lon → must be flipped.
    # Comma may be raw or %2C-encoded; both are valid in query strings.
    assert "proximity=13.405,52.52" in fake.last_url or "proximity=13.405%2C52.52" in fake.last_url


async def test_invalid_proximity_returns_422(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    await login_as(client, async_session_factory, role=UserRole.ADMIN)

    bad_inputs = ["nope", "1.0", "200,0", "0,200", "1,2,3"]
    for raw in bad_inputs:
        resp = await client.get(
            "/api/geocode",
            params={"q": "x", "proximity": raw},
        )
        assert resp.status_code == 422, f"{raw!r} should be rejected, got {resp.status_code}"


async def test_limit_out_of_range_returns_422(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    await login_as(client, async_session_factory, role=UserRole.ADMIN)

    for limit in (0, 11, 99):
        resp = await client.get(
            "/api/geocode",
            params={"q": "x", "limit": limit},
        )
        assert resp.status_code == 422, f"limit={limit} should be rejected"


async def test_empty_query_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/geocode", params={"q": ""})
    assert resp.status_code == 422


async def test_upstream_network_error_returns_502(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.routes.geocode._http_client",
        lambda: _FakeAsyncClient(raise_exc=True),
    )
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/geocode", params={"q": "Berlin"})
    assert resp.status_code == 502


async def test_upstream_status_4xx_returns_502(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.routes.geocode._http_client",
        lambda: _FakeAsyncClient(response=_FakeResponse(403, raw_text="forbidden")),
    )
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/geocode", params={"q": "Berlin"})
    assert resp.status_code == 502


async def test_upstream_invalid_json_returns_502(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.routes.geocode._http_client",
        lambda: _FakeAsyncClient(response=_FakeResponse(200, json_payload=None)),
    )
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/geocode", params={"q": "Berlin"})
    assert resp.status_code == 502


async def test_rate_limit_enforced_per_user(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setenv("HCMAP_GEOCODE_RATE_PER_MINUTE", "2")
    monkeypatch.setattr(
        "app.routes.geocode._http_client",
        lambda: _FakeAsyncClient(response=_FakeResponse(200, json_payload=_sample_payload())),
    )

    await login_as(client, async_session_factory, role=UserRole.ADMIN)

    r1 = await client.get("/api/geocode", params={"q": "a"})
    r2 = await client.get("/api/geocode", params={"q": "b"})
    r3 = await client.get("/api/geocode", params={"q": "c"})

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    assert "retry-after" in {h.lower() for h in r3.headers}


async def test_rate_limit_disabled_when_zero(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setenv("HCMAP_GEOCODE_RATE_PER_MINUTE", "0")
    monkeypatch.setattr(
        "app.routes.geocode._http_client",
        lambda: _FakeAsyncClient(response=_FakeResponse(200, json_payload=_sample_payload())),
    )
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    for _ in range(5):
        resp = await client.get("/api/geocode", params={"q": "x"})
        assert resp.status_code == 200


async def test_rate_limit_window_rolls_over(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """After the 60 s window expires, the bucket frees up."""
    monkeypatch.setenv("HCMAP_MAPTILER_API_KEY", "test-key")
    monkeypatch.setenv("HCMAP_GEOCODE_RATE_PER_MINUTE", "1")
    monkeypatch.setattr(
        "app.routes.geocode._http_client",
        lambda: _FakeAsyncClient(response=_FakeResponse(200, json_payload=_sample_payload())),
    )

    fake_now = {"value": 1000.0}

    def _now() -> float:
        return fake_now["value"]

    monkeypatch.setattr("app.routes.geocode._now", _now)

    await login_as(client, async_session_factory, role=UserRole.ADMIN)

    r1 = await client.get("/api/geocode", params={"q": "a"})
    assert r1.status_code == 200

    # Same second → blocked.
    r2 = await client.get("/api/geocode", params={"q": "b"})
    assert r2.status_code == 429

    # Advance past the rolling window → allowed again.
    fake_now["value"] += 61.0
    r3 = await client.get("/api/geocode", params={"q": "c"})
    assert r3.status_code == 200
