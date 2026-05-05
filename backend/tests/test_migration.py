"""Migration smoke tests (Fahrplan: M1 acceptance criterion)."""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

EXPECTED_TABLES = {
    "alembic_version",
    "application",
    "application_restraint",
    "event",
    "event_participant",
    "person",
    "restraint_type",
    "spatial_ref_sys",  # PostGIS-managed
    "user",
}


def test_all_tables_present(db_engine: Engine) -> None:
    with db_engine.connect() as conn:
        names = set(inspect(conn).get_table_names())
    assert EXPECTED_TABLES.issubset(names), EXPECTED_TABLES - names


def test_postgis_extension_active(db_engine: Engine) -> None:
    with db_engine.connect() as conn:
        version = conn.execute(text("SELECT PostGIS_Version()")).scalar_one()
        assert version.startswith("3."), version


def test_app_user_role_exists(db_engine: Engine) -> None:
    with db_engine.connect() as conn:
        present = conn.execute(text("SELECT 1 FROM pg_roles WHERE rolname = 'app_user'")).scalar()
    assert present == 1


def test_rls_enabled_on_data_tables(db_engine: Engine) -> None:
    with db_engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT relname FROM pg_class "
                "WHERE relrowsecurity = true AND relkind = 'r' "
                "ORDER BY relname"
            )
        ).all()
    rls_tables = {r[0] for r in rows}
    assert {"event", "event_participant", "application", "application_restraint"} <= rls_tables
