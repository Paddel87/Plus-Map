"""Drift test: backend Pydantic doc schemas vs frontend RxDB JSON schemas.

Implements ADR-031: the two sides are hand-maintained and a single test
catches accidental drift before it reaches the frontend.

The test compares property names, JSON-Schema types, and the ``required``
list. Pydantic-side metadata that has no RxDB equivalent (titles,
defaults, examples) is intentionally ignored — RxDB is the source of
truth for the wire format.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from app.sync.schemas import ApplicationDoc, EventDoc, EventParticipantDoc

# Repository root resolved from this file's location.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_SCHEMA_DIR = _REPO_ROOT / "frontend" / "src" / "lib" / "rxdb" / "schemas"


def _load_frontend_schema(name: str) -> dict[str, Any]:
    path = _SCHEMA_DIR / name
    assert path.exists(), f"Frontend RxDB schema missing: {path}"
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def _pydantic_schema(model: type) -> dict[str, Any]:
    """JSON schema in serialization mode (RxDB consumes serialized payloads)."""
    return model.model_json_schema(by_alias=True, mode="serialization")


# JSON-Schema type-set normaliser. Pydantic emits ``{"anyOf": [...]}`` for
# nullable fields; RxDB's RxDB-flavoured JSON Schema uses ``{"type": [...]}``.
def _normalised_types(prop: dict[str, Any]) -> set[str]:
    if "anyOf" in prop:
        types: set[str] = set()
        for variant in prop["anyOf"]:
            t = variant.get("type")
            if isinstance(t, str):
                types.add(t)
            elif isinstance(t, list):
                types.update(t)
        return types
    t = prop.get("type")
    if isinstance(t, str):
        return {t}
    if isinstance(t, list):
        return set(t)
    if "$ref" in prop:
        # E.g. UUID refs into $defs — treated as 'string' on the wire.
        return {"string"}
    return set()


@pytest.mark.parametrize(
    ("schema_file", "model"),
    [
        ("event.schema.json", EventDoc),
        ("application.schema.json", ApplicationDoc),
        ("event_participant.schema.json", EventParticipantDoc),
    ],
)
def test_property_names_match(schema_file: str, model: type) -> None:
    fe = _load_frontend_schema(schema_file)
    be = _pydantic_schema(model)
    fe_props = set(fe["properties"].keys())
    be_props = set(be["properties"].keys())
    assert fe_props == be_props, (
        f"{schema_file}: properties differ. "
        f"frontend-only: {fe_props - be_props}, "
        f"backend-only: {be_props - fe_props}"
    )


@pytest.mark.parametrize(
    ("schema_file", "model"),
    [
        ("event.schema.json", EventDoc),
        ("application.schema.json", ApplicationDoc),
        ("event_participant.schema.json", EventParticipantDoc),
    ],
)
def test_property_types_match(schema_file: str, model: type) -> None:
    fe = _load_frontend_schema(schema_file)
    be = _pydantic_schema(model)
    for prop_name, fe_prop in fe["properties"].items():
        be_prop = be["properties"][prop_name]
        # Backend may model UUID as $ref; resolve.
        if "$ref" in be_prop:
            ref = be_prop["$ref"].split("/")[-1]
            be_prop = be["$defs"][ref]
        # ``anyOf`` containing $ref → resolve each variant.
        if "anyOf" in be_prop:
            resolved = []
            for variant in be_prop["anyOf"]:
                if "$ref" in variant:
                    ref = variant["$ref"].split("/")[-1]
                    resolved.append(be["$defs"][ref])
                else:
                    resolved.append(variant)
            be_prop = {"anyOf": resolved}
        fe_types = _normalised_types(fe_prop)
        be_types = _normalised_types(be_prop)
        assert fe_types == be_types, (
            f"{schema_file}.{prop_name}: type set differs. frontend={fe_types}, backend={be_types}"
        )


@pytest.mark.parametrize(
    ("schema_file", "model"),
    [
        ("event.schema.json", EventDoc),
        ("application.schema.json", ApplicationDoc),
        ("event_participant.schema.json", EventParticipantDoc),
    ],
)
def test_required_lists_match(schema_file: str, model: type) -> None:
    fe = _load_frontend_schema(schema_file)
    be = _pydantic_schema(model)
    fe_required = set(fe.get("required", []))
    be_required = set(be.get("required", []))
    assert fe_required == be_required, (
        f"{schema_file}: required lists differ. "
        f"frontend-only: {fe_required - be_required}, "
        f"backend-only: {be_required - fe_required}"
    )
