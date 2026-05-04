"""RestraintType seed data (M1).

Source: ``architecture.md`` §Katalog-Seed (M1) and ``fahrplan.md`` Z. 105.
Limited to anchor models that the Admin pre-approved. The wider review list
in ``docs/restraint-types-seed-review.md`` is loaded after Admin sign-off
(see ADR-018, decision F1).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class RestraintTypeSeed:
    category: str
    brand: str | None
    model: str | None
    mechanical_type: str | None
    display_name: str
    note: str | None = None


def _cuff(brand: str, model: str, mech: str) -> RestraintTypeSeed:
    return RestraintTypeSeed(
        category="handcuffs",
        brand=brand,
        model=model,
        mechanical_type=mech,
        display_name=f"{brand} {model} ({mech})",
    )


SEEDS: Sequence[RestraintTypeSeed] = (
    # Handcuffs — chain
    _cuff("ASP", "Chain", "chain"),
    _cuff("Smith & Wesson", "Model 100", "chain"),
    _cuff("Peerless", "Model 700", "chain"),
    # Handcuffs — hinged
    _cuff("ASP", "Ultra Cuffs", "hinged"),
    _cuff("TCH", "840", "hinged"),
    _cuff("Peerless", "Model 730", "hinged"),
    # Handcuffs — rigid
    _cuff("Clejuso", "Model 13", "rigid"),
    _cuff("Clejuso", "Model 15 Heavy", "rigid"),
    _cuff("ASP", "Rigid Ultra", "rigid"),
    # Thumbcuffs
    RestraintTypeSeed(
        category="thumbcuffs",
        brand="Clejuso",
        model="Standard",
        mechanical_type=None,
        display_name="Clejuso Daumenschellen",
    ),
    # Legcuffs
    RestraintTypeSeed(
        category="legcuffs",
        brand="Peerless",
        model="Model 703",
        mechanical_type="chain",
        display_name="Peerless Model 703 Beinschellen",
    ),
    # Materials — brand stays NULL, model carries the discriminator so the
    # UNIQUE(category, brand, model, mechanical_type) NULLS NOT DISTINCT
    # constraint sees distinct rows.
    RestraintTypeSeed(
        category="rope", brand=None, model="Seil", mechanical_type=None, display_name="Seil"
    ),
    RestraintTypeSeed(
        category="tape",
        brand=None,
        model="Bondage-Tape",
        mechanical_type=None,
        display_name="Bondage-Tape",
    ),
    RestraintTypeSeed(
        category="tape",
        brand=None,
        model="Klebeband",
        mechanical_type=None,
        display_name="Klebeband",
    ),
    RestraintTypeSeed(
        category="cloth",
        brand=None,
        model="Schal",
        mechanical_type=None,
        display_name="Schal",
    ),
    RestraintTypeSeed(
        category="strap",
        brand=None,
        model="Lederriemen",
        mechanical_type=None,
        display_name="Lederriemen",
    ),
    RestraintTypeSeed(
        category="cable_tie",
        brand=None,
        model="Kabelbinder",
        mechanical_type=None,
        display_name="Kabelbinder",
    ),
)

INSERT_SQL = """
INSERT INTO restraint_type
    (id, category, brand, model, mechanical_type, display_name, status)
VALUES
    (gen_random_uuid(), :category, :brand, :model, :mechanical_type, :display_name, 'approved')
ON CONFLICT ON CONSTRAINT uq_restraint_type_identity DO NOTHING
"""
