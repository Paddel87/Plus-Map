<!--
Zweck: Architektur- und Grundsatzentscheidungen für Plus-Map als ADRs.
       Jede Entscheidung ist nachvollziehbar und mit Begründung dokumentiert.

Format pro ADR:
  ## ADR-NNN — Titel
  - Status: Proposed / Accepted / Superseded by ADR-XYZ
  - Datum: YYYY-MM-DD
  - Kontext
  - Entscheidung
  - Konsequenzen
-->

# Architecture Decision Records

## ADR-001 — Vollständiger Tarnungs-Cut (Lookup-Catalogs entfernen)

- **Status:** Accepted
- **Datum:** 2026-05-04
- **Berührt:** §4.1 Architektur, §4.4 Datenmodell, §4.5 API-Vertrag

### Kontext

Der Fork-Snapshot (Plus-Code-Helfer-Vorgänger) hat drei Lookup-Catalog-Modelle aus seiner ursprünglichen Domäne mitgebracht: `ArmPosition`, `HandPosition`, `HandOrientation`. Sie sind tief verankert: drei FK-Spalten in `application`, REST- und Sync-Schemas, Admin-Statistiken (`top_arm`/`top_hand`), JSON/CSV-Export, drei SQLAdmin-Views, 18 API-Endpoints, Frontend-Catalog-Tabs mit Detail-Routen und Form-Komponenten. Issue #1 (Bug 4) hat dokumentiert, dass der bisherige „Cut" rein kosmetisch im Frontend stattgefunden hat — Backend, DB-Tabellen, FK-Spalten und API blieben unverändert. Eine DB-Inspektion (Backup, pgAdmin) zeigt die ursprüngliche Domäne sofort.

Plus-Map ist konzeptionell als Outdoor-Touren-Logbuch positioniert (siehe README, `project-context.md`). Die drei Lookup-Catalogs haben keine Bedeutung in dieser Domäne und sollen vor dem ersten externen Usability-Test (M4) restlos verschwinden.

### Entscheidung

**Option A — Vollständiger Cut.** Alle Spuren der drei Lookup-Domänen werden aus dem Repo entfernt:

- Modelle `ArmPosition`/`HandPosition`/`HandOrientation` aus `app/models/catalog.py` entfernt
- FK-Spalten `arm_position_id`/`hand_position_id`/`hand_orientation_id` aus `application` gedroppt (Alembic-Migration)
- Tabellen `arm_position`/`hand_position`/`hand_orientation` gedroppt (gleiche Migration)
- 18 API-Endpoints und drei Router-Mounts entfernt
- Drei SQLAdmin-Views entfernt
- REST-Schemas (`app/schemas/application.py`), Sync-Schemas (`app/sync/schemas.py`), Exports (`app/services/exports.py`), Admin-Statistiken (`top_arm`/`top_hand` in `app/routes/admin.py`) bereinigt
- Seed-Script (`scripts/seed_plus_map.py`) — Platzhalter-Inserts und Imports raus
- Frontend-Branding „HC-Map" → „Plus-Map" (sechs UI-sichtbare Stellen)
- Frontend `CatalogKind`-Type-Union auf `"restraint-types"` reduziert; abhängige Komponenten (`lookup-form.tsx` u. ä.) sauber refaktoriert
- Catalog-Detail-Routen `/admin/catalogs/{arm-positions,hand-positions,hand-orientations}/` und ihre Lookup-Form-Komponenten/Hooks entfernt

### Konsequenzen

**Akzeptiert:**

- Sync-Schema-Breaking-Change. Keine produktiven RxDB-Clients vorhanden (Phase 0, Test-Aufbau).
- `Application` verliert drei Felder ersatzlos. Die Outdoor-Domäne braucht sie nicht.
- ~30–50 Dateien geändert, eine neue Alembic-Migration.

**Vorteil:**

- Ein abgeschlossener, sauberer Schnitt statt eines halben Restbestands, der bei jeder späteren Schema-Änderung erklärt werden müsste.
- DB-Backup/pgAdmin/Replikation zeigen die Domäne nicht mehr.
- Frontend-Type-System bleibt konsistent statt mit Workarounds zu leben.

**Out of Scope:**

- Konzeptionelle Umbenennung von `Application`/`Event` in domänen-passendere Namen (`Stop`/`Tour` o. ä.). Issue-Reporter weist auf den Wunsch hin; wird bei Bedarf in eigener ADR adressiert.

### Verbindung

- Quelle: Issue [#1](https://github.com/Paddel87/Plus-Map/issues/1), Bug 4
- Fahrplan: M0.2

## ADR-002 — Equipment-Domäne: vollständige Umbenennung mit Outdoor-Taxonomie

- **Status:** Accepted
- **Datum:** 2026-05-05
- **Berührt:** §4.1 Architektur, §4.4 Datenmodell, §4.5 API-Vertrag (gleichzeitig)

### Kontext

ADR-001 hat den Lookup-Catalog-Cut sauber gezogen, aber nur Stufe 1 der Beobachter (Casual-Browser-User mit Sidebar/Tabs/Listen-Inhalten) abgedeckt. Der verbliebene Equipment-Catalog führt im Backend noch durchgängig die ursprüngliche Restraint-Domäne: Modell `RestraintType`, Tabelle `restraint_type`, URL-Slug `/api/restraint-types`, Enum `RestraintCategory` mit Werten `handcuffs`/`thumbcuffs`/`legcuffs`/`cuffs_leather`/`rope`/`tape`/`cable_tie`/`cloth`/`strap`/`other`, Enum `RestraintMechanicalType` mit Werten `chain`/`hinged`/`rigid`. Diese Begriffe sind in URL-Bar, Network-Tab, HTTP-Logs und Datenbank direkt sichtbar.

Stufe 2 (DevTools / Sysadmin / Log-Reader) und Stufe 3 (Pentester / DB-Inspektor) sehen damit weiterhin den Restraint-Frame, obwohl README, UI-Strings und Demo-Daten durchgängig Outdoor-Touren zeigen. Issue [#4](https://github.com/Paddel87/Plus-Map/issues/4) verlangt, diese Inkonsistenz aufzulösen.

### Entscheidung

**Option A — Vollständiger Sweep mit echter Outdoor-Taxonomie.** Die gesamte Equipment-Domäne wird sprachlich auf Outdoor umgestellt:

- Modell `RestraintType` → `EquipmentItem`. Tabelle `restraint_type` → `equipment_item`.
- URL-Prefix `/api/restraint-types` → `/api/equipment-items`. Frontend-Route `/admin/catalogs/restraint-types` → `/admin/catalogs/equipment-items`. Hard-Cut, kein Übergangs-Alias (Phase 0, kein externer API-Konsument).
- Enum `RestraintCategory` → `EquipmentCategory` mit echten Outdoor-Werten: `navigation`, `lighting`, `hydration`, `nutrition`, `safety`, `tools`, `documentation`, `comfort`, `mobility`, `carrying`, `clothing`, `shelter`, `other`.
- Enum `RestraintMechanicalType` ersatzlos entfernt; Spalte `mechanical_type` auf `equipment_item` gedroppt — im Outdoor-Frame semantisch leer.
- Join-Tabelle `application_restraint` → `application_equipment`. Spalte `restraint_type_id` → `equipment_item_id`. Sync-Feld `restraint_type_ids` → `equipment_item_ids`.
- Frontend-Komponenten und -Hooks parallel umbenannt: `restraint-picker.tsx` → `equipment-picker.tsx`, `restraint-type-form.tsx` → `equipment-item-form.tsx`. Mechanical-Type-Select in der Form entfällt.
- Seed-Daten in `scripts/seed_plus_map.py` werden re-kategorisiert (Wanderstöcke → `mobility`, Stirnlampe → `lighting`, Kompass + Karte → `navigation`, Trinkflasche → `hydration`, Rucksack → `carrying`, Erste-Hilfe-Set → `safety`, Multitool → `tools`, Kamera → `documentation`, Sitzkissen → `comfort`).

### Konsequenzen

**Akzeptiert:**

- Sync-Wire-Format-Breaking-Change (`equipment_item_ids` statt `restraint_type_ids`). Phase 0, keine produktiven RxDB-Klienten.
- API-URL-Hard-Cut. Bookmarks und externe Konsumenten gibt es im geschlossenen Nutzerkreis nicht.
- Alembic-Migration mit ENUM-Type-Konvertierung (USING-Cast: alle existierenden Werte → `'other'`, da kein semantisches Mapping zwischen `handcuffs`/etc. und Outdoor-Kategorien existiert). Aufwendiger als der reine DROP aus ADR-001, aber strukturell vergleichbar.
- ~30–50 Dateien, viele Renames; Diff-Größe vergleichbar mit ADR-001.

**Vorteil:**

- Tarnung wird konsistent über alle drei Beobachter-Stufen. Backup, pgAdmin, DevTools, Network-Tab, Access-Logs zeigen ausschließlich den Outdoor-Frame.
- Die `mechanical_type`-Spalte verschwindet ersatzlos — eine Outdoor-Domäne braucht sie nicht.
- Das Datenmodell stimmt mit der README-Positionierung überein: ein Außenstehender sieht im Code dieselbe Domäne wie auf der Login-Seite.

**Out of Scope:**

- Die Modellnamen `Application` und `Event` bleiben unverändert. Der ursprüngliche Issue-Reporter zu ADR-001 hatte eine Umbenennung in `Stop`/`Tour` o. ä. angeregt; das ist eine separate ADR (vermutlich Welle 3).

### Verbindung

- Quelle: Issue [#4](https://github.com/Paddel87/Plus-Map/issues/4)
- Vorgänger: ADR-001 (Welle 1, Lookup-Cut)
- Fahrplan: M0.3
