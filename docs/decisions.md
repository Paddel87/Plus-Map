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
