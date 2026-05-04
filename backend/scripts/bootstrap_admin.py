"""Bootstrap script for the very first admin user (ADR-019, decision G1).

Idempotent: if any user already exists, the script exits with a clear
message instead of creating a second admin.

Usage:
    uv run python -m scripts.bootstrap_admin \
        --email admin@example.invalid \
        --password 'a-12-char-or-more' \
        --name 'Admin Person'

Or via env (HCMAP_BOOTSTRAP_EMAIL / _PASSWORD / _NAME).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from app.auth.manager import _password_helper
from app.db import get_engine, get_sessionmaker
from app.models.person import Person
from app.models.user import User, UserRole
from sqlalchemy import select


async def _bootstrap(email: str, password: str, person_name: str) -> int:
    engine = get_engine()
    sm = get_sessionmaker()
    try:
        async with sm() as session:
            existing = await session.execute(select(User).limit(1))
            if existing.scalars().first() is not None:
                print("Refusing to bootstrap: at least one user already exists.")
                return 1

            person = Person(name=person_name)
            session.add(person)
            await session.flush()

            helper = _password_helper()
            user = User(
                email=email.lower(),
                hashed_password=helper.hash(password),
                is_active=True,
                is_verified=True,
                is_superuser=False,
                role=UserRole.ADMIN,
                person_id=person.id,
            )
            session.add(user)
            await session.commit()

            print(f"Bootstrapped admin user {user.email} (role=admin).")
            return 0
    finally:
        await engine.dispose()


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create the first admin user. Idempotent.")
    parser.add_argument("--email", default=os.environ.get("HCMAP_BOOTSTRAP_EMAIL"))
    parser.add_argument("--password", default=os.environ.get("HCMAP_BOOTSTRAP_PASSWORD"))
    parser.add_argument(
        "--name",
        default=os.environ.get("HCMAP_BOOTSTRAP_NAME", "Admin"),
        help="Display name of the admin's Person record.",
    )
    args = parser.parse_args(argv)
    if not args.email or not args.password:
        parser.error("--email and --password (or HCMAP_BOOTSTRAP_* env) required")
    if len(args.password) < 12:
        parser.error("password must be at least 12 characters")
    return args


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return asyncio.run(_bootstrap(args.email, args.password, args.name))


if __name__ == "__main__":
    sys.exit(main())
