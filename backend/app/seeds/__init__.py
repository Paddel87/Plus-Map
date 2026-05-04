"""Catalog seed scripts (M1).

Runs idempotently via INSERT ... ON CONFLICT DO NOTHING on the catalog
unique constraints. Architecture forbids seed data inside Alembic
migrations (see ADR-018, decision E1).
"""
