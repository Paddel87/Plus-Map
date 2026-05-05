"""EquipmentItem seed data.

Outdoor-equipment anchor models, pre-approved (status=``approved``).
Matches the EquipmentCategory taxonomy from `app/models/catalog.py`.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class EquipmentItemSeed:
    category: str
    brand: str | None
    model: str | None
    display_name: str
    note: str | None = None


SEEDS: Sequence[EquipmentItemSeed] = (
    EquipmentItemSeed(
        category="mobility",
        brand="Leki",
        model="Makalu Lite",
        display_name="Wanderstöcke (Leki Makalu Lite)",
    ),
    EquipmentItemSeed(
        category="lighting",
        brand="Petzl",
        model="Tikka",
        display_name="Stirnlampe (Petzl Tikka)",
    ),
    EquipmentItemSeed(
        category="navigation",
        brand="Suunto",
        model="M-3 Global",
        display_name="Kompass (Suunto M-3 Global)",
    ),
    EquipmentItemSeed(
        category="navigation",
        brand="DAV",
        model="BY 09 Allgäu",
        display_name="Topografische Karte (DAV BY 09)",
    ),
    EquipmentItemSeed(
        category="hydration",
        brand="Nalgene",
        model="Wide Mouth 1l",
        display_name="Trinkflasche (Nalgene Wide Mouth 1l)",
    ),
    EquipmentItemSeed(
        category="carrying",
        brand="Deuter",
        model="Speed Lite 21",
        display_name="Rucksack (Deuter Speed Lite 21)",
    ),
    EquipmentItemSeed(
        category="safety",
        brand="Tatonka",
        model="First Aid Mini",
        display_name="Erste-Hilfe-Set (Tatonka Mini)",
    ),
    EquipmentItemSeed(
        category="tools",
        brand="Leatherman",
        model="Wave+",
        display_name="Multitool (Leatherman Wave+)",
    ),
    EquipmentItemSeed(
        category="documentation",
        brand="Sony",
        model="RX100 VII",
        display_name="Kamera (Sony RX100 VII)",
    ),
    EquipmentItemSeed(
        category="comfort",
        brand="Therm-a-Rest",
        model="Z Seat",
        display_name="Sitzkissen (Therm-a-Rest Z Seat)",
    ),
)

INSERT_SQL = """
INSERT INTO equipment_item
    (id, category, brand, model, display_name, status)
VALUES
    (gen_random_uuid(), :category, :brand, :model, :display_name, 'approved')
ON CONFLICT ON CONSTRAINT uq_equipment_item_identity DO NOTHING
"""
