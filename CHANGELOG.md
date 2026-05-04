# Changelog

Alle nutzerrelevanten Änderungen werden hier dokumentiert.

Format: [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Geändert
- Initiales Scaffolding aus Snapshot eines Plus-Code-Logbuch-Vorgängers übernommen, danach auf Plus-Map-Schwerpunkt (Outdoor-Touren mit Stopps und Ausrüstung) umgearbeitet.
- `Settings` ignoriert leere Env-Variablen (`env_ignore_empty=True`); Compose-Defaults wie `HCMAP_SMTP_FROM=${...:-}` greifen damit als „nicht gesetzt" auf den Field-Default zurück.

### Behoben
- Backend-Crash beim Start, wenn `HCMAP_SMTP_FROM` leer war (Pydantic-`EmailStr`-ValidationError gegen leeren String). Issue #1, Bug 1.
- `scripts/seed_plus_map.py`: `PersonOrigin.LINKED`/`MANUAL` → `MANAGED`/`ON_THE_FLY` (Modell wurde umbenannt, Seed-Script lag im Lag). Issue #1, Bug 2.
- `scripts/seed_plus_map.py`: Konstruktor-Kwarg `label=` → `name=` für `ArmPosition`/`HandPosition`/`HandOrientation` (Schema-Spalte heißt `name`). Issue #1, Bug 3.

### Entfernt (Breaking)
- Vollständiger Tarnungs-Cut der drei Lookup-Catalogs `ArmPosition`/`HandPosition`/`HandOrientation` aus dem Snapshot. Per [ADR-001](docs/decisions.md). Issue #1, Bug 4.
  - Backend: 18 API-Endpoints unter `/api/{arm,hand}-positions` und `/api/hand-orientations` entfernt; drei SQLAdmin-Views entfernt; FK-Spalten `arm_position_id`/`hand_position_id`/`hand_orientation_id` aus `application` gedroppt; Modelle, REST-Schemas, Sync-Schemas, Exports und Admin-Statistiken bereinigt; Alembic-Migration `20260504_2200_drop_lookups` (DROP COLUMN × 3 + DROP TABLE × 3).
  - Frontend: Branding „HC-Map" → „Plus-Map" (acht UI-Stellen + `package.json`); `CatalogKind`-Type-Union auf `"restraint-types"` reduziert; `lookup-form.tsx` und `lookup-picker.tsx` gelöscht; `describeMutationError` nach `mutation-error.ts` extrahiert; FK-Felder aus RxDB-Schema und Application-Forms entfernt.
  - Sync-Wire-Format-Breaking-Change: keine produktiven RxDB-Clients vorhanden (Phase 0).
