"""Seed-Skript für die Plus-Map Test-Instanz.

Legt an:
  - Equipment-Katalog (EquipmentItem, Status `approved`) mit ~10 Outdoor-Items.
  - 5 Personen (Erfasser + 4 Begleiter).
  - 1 Editor-User, verknüpft mit der ersten Person.
  - 8 Touren über die letzten 90 Tage gestreut.
  - 16 Stopps verteilt auf die Touren (1 bis 3 pro Tour).
  - EventParticipant-Verknüpfungen.

Idempotent: bricht ab, wenn das Editor-Konto bereits existiert.

Usage (innerhalb des Backend-Containers):
    docker compose -f docker/compose.plus-map.yml exec backend \\
        uv run python -m scripts.seed_plus_map \\
        --tester-email testerin@plus-map.example \\
        --tester-password 'change-me-12-chars-min' \\
        --tester-name 'Testerin'
"""

from __future__ import annotations

import argparse
import asyncio
import random
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.auth.manager import _password_helper
from app.db import get_engine, get_sessionmaker
from app.models.application import Application
from app.models.catalog import (
    CatalogStatus,
    EquipmentCategory,
    EquipmentItem,
)
from app.models.event import Event, EventParticipant
from app.models.person import Person, PersonOrigin
from app.models.user import User, UserRole
from sqlalchemy import select

# ----------------------------------------------------------------------
# Demo-Daten
# ----------------------------------------------------------------------

EQUIPMENT: list[tuple[str, str | None, str | None, EquipmentCategory]] = [
    # (display_name, brand, model, category)
    ("Wanderstöcke (Leki Makalu Lite)", "Leki", "Makalu Lite", EquipmentCategory.MOBILITY),
    ("Stirnlampe (Petzl Tikka)", "Petzl", "Tikka", EquipmentCategory.LIGHTING),
    ("Kompass (Suunto M-3 Global)", "Suunto", "M-3 Global", EquipmentCategory.NAVIGATION),
    ("Topografische Karte (DAV BY 09)", "DAV", "BY 09 Allgäu", EquipmentCategory.NAVIGATION),
    (
        "Trinkflasche (Nalgene Wide Mouth 1l)",
        "Nalgene",
        "Wide Mouth 1l",
        EquipmentCategory.HYDRATION,
    ),
    ("Rucksack (Deuter Speed Lite 21)", "Deuter", "Speed Lite 21", EquipmentCategory.CARRYING),
    ("Erste-Hilfe-Set (Tatonka Mini)", "Tatonka", "First Aid Mini", EquipmentCategory.SAFETY),
    ("Multitool (Leatherman Wave+)", "Leatherman", "Wave+", EquipmentCategory.TOOLS),
    ("Kamera (Sony RX100 VII)", "Sony", "RX100 VII", EquipmentCategory.DOCUMENTATION),
    ("Sitzkissen (Therm-a-Rest Z Seat)", "Therm-a-Rest", "Z Seat", EquipmentCategory.COMFORT),
]

PERSONS = [
    "Anna",
    "Bea",
    "Carla",
    "Dora",
]  # Erfasser kommt extra (= Tester)

# GPS-Anker für Tour-Cluster
ANCHORS = [
    ("Frankenjura", 49.7913, 11.5092),
    ("Pfälzer Wald", 49.3000, 7.9000),
    ("Stadtgebiet", 48.7758, 9.1829),
    ("Wald nahe", 48.0833, 11.5667),
]

TOUR_NAMES = [
    "Wanderung Burgruine Tour",
    "Foto-Spaziergang Altstadt",
    "Naturbeobachtung Bachlauf",
    "Picknick am Aussichtspunkt",
    "Stadtrundgang Sehenswürdigkeiten",
    "Sonntags-Wanderung Kammweg",
    "Foto-Tour Sonnenuntergang",
    "Kurze Mittagsrunde Park",
]

STOP_NOTES = [
    "Schöner Aussichtspunkt",
    "Pause unter alter Eiche",
    "Wegweiser fotografiert",
    "Kurze Trinkpause",
    "Vogelbeobachtung",
    "Brunnen mit klarem Wasser",
    "Bachüberquerung",
    "Aussicht auf das Tal",
    "Kleines Café entdeckt",
    "Picknick-Plätzchen",
]


async def _seed(tester_email: str, tester_password: str, tester_name: str) -> int:
    engine = get_engine()
    sm = get_sessionmaker()
    rng = random.Random(42)
    now = datetime.now(UTC)

    try:
        async with sm() as session:
            existing_user = await session.execute(
                select(User).where(User.email == tester_email.lower())
            )
            if existing_user.scalars().first() is not None:
                print(f"Refusing to seed: user {tester_email} already exists.")
                return 1

            # --- Personen + Tester-User ---
            tester_person = Person(name=tester_name, origin=PersonOrigin.MANAGED, linkable=True)
            session.add(tester_person)
            await session.flush()

            companions: list[Person] = []
            for name in PERSONS:
                p = Person(name=name, origin=PersonOrigin.ON_THE_FLY, linkable=False)
                session.add(p)
                companions.append(p)
            await session.flush()

            helper = _password_helper()
            tester_user = User(
                email=tester_email.lower(),
                hashed_password=helper.hash(tester_password),
                is_active=True,
                is_verified=True,
                is_superuser=False,
                role=UserRole.EDITOR,
                person_id=tester_person.id,
            )
            session.add(tester_user)
            await session.flush()

            # --- Equipment-Katalog ---
            equipment_objs: list[EquipmentItem] = []
            for display_name, brand, model, category in EQUIPMENT:
                ei = EquipmentItem(
                    category=category,
                    brand=brand,
                    model=model,
                    display_name=display_name,
                    status=CatalogStatus.APPROVED,
                    approved_by=tester_user.id,
                )
                session.add(ei)
                equipment_objs.append(ei)

            await session.flush()

            # --- Touren + Stopps ---
            tour_count = 8
            for i in range(tour_count):
                anchor_name, anchor_lat, anchor_lon = rng.choice(ANCHORS)
                jitter_lat = rng.uniform(-0.05, 0.05)
                jitter_lon = rng.uniform(-0.05, 0.05)
                days_ago = rng.randint(2, 90)
                duration_minutes = rng.randint(45, 240)
                started = now - timedelta(days=days_ago, hours=rng.randint(0, 12))
                ended = started + timedelta(minutes=duration_minutes)

                tour_title = TOUR_NAMES[i % len(TOUR_NAMES)] + f" ({anchor_name})"
                tour = Event(
                    started_at=started,
                    ended_at=ended,
                    lat=Decimal(str(round(anchor_lat + jitter_lat, 6))),
                    lon=Decimal(str(round(anchor_lon + jitter_lon, 6))),
                    title=tour_title,
                    note=None,
                    legacy_external_ref=None,
                    reveal_participants=False,
                    time_precision="minute",
                    created_by=tester_user.id,
                )
                session.add(tour)
                await session.flush()

                # Begleitung pro Tour: 0 bis 2 zufaellige
                companions_in_tour = rng.sample(companions, k=rng.randint(0, 2))
                participant_persons = [tester_person, *companions_in_tour]
                for p in participant_persons:
                    session.add(EventParticipant(event_id=tour.id, person_id=p.id))

                # Stopps: 1 bis 3 pro Tour
                stop_count = rng.randint(1, 3)
                cumulative = started + timedelta(minutes=5)
                for seq in range(1, stop_count + 1):
                    stop_started = cumulative
                    stop_ended = stop_started + timedelta(minutes=rng.randint(10, 40))
                    cumulative = stop_ended + timedelta(minutes=rng.randint(5, 25))
                    recipient = rng.choice(participant_persons)
                    if recipient.id == tester_person.id and len(participant_persons) > 1:
                        # Erfasser ist Tester; Begleitung soll Recipient sein
                        recipient = rng.choice(
                            [p for p in participant_persons if p.id != tester_person.id]
                        )
                    app = Application(
                        event_id=tour.id,
                        performer_id=tester_person.id,
                        recipient_id=recipient.id,
                        sequence_no=seq,
                        started_at=stop_started,
                        ended_at=stop_ended if stop_ended <= ended else ended,
                        note=rng.choice(STOP_NOTES),
                        created_by=tester_user.id,
                    )
                    session.add(app)

            await session.commit()
            print(
                f"Seeded plus-map demo data: 1 tester user ({tester_email}), "
                f"{len(PERSONS)} companions, {len(EQUIPMENT)} equipment items, "
                f"{tour_count} tours."
            )
            return 0
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tester-email", required=True)
    parser.add_argument("--tester-password", required=True)
    parser.add_argument("--tester-name", default="Testerin")
    args = parser.parse_args()
    return asyncio.run(_seed(args.tester_email, args.tester_password, args.tester_name))


if __name__ == "__main__":
    raise SystemExit(main())
