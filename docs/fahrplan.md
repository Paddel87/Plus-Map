<!--
Zweck: Fahrplan für die Umsetzung von Plus-Map.

Status-Marker:
- [OFFEN]                – definiert, noch nicht begonnen
- [IN ARBEIT]            – aktuell in Bearbeitung
- [WARTET-AUF-FREIGABE]  – Vorschlag formuliert, wartet auf Entscheidung
- [BLOCKIERT]            – nicht fortsetzbar, siehe blockers.md
- [ERLEDIGT]             – DoD erfüllt, verifiziert, mit Datum
- [VERWORFEN]            – bewusst nicht umgesetzt
-->

# Plus-Map — Fahrplan

## Aktueller Stand

- **Stand vom:** 2026-05-06 — Welle-2-Nachzug (M0.4) abgeschlossen: Frontend-Admin-Crash behoben, RxDB-Schema v2 etabliert, Identity-Rename `hcmap` → `plusmap` durchgezogen (ADR-003, ADR-004). Backend 251 Tests grün, Frontend 272 Tests + lint + typecheck grün, mypy + ruff grün.
- **Laufende Phase:** Phase 0 (Test-Aufbau).
- **Nächster Schritt:** M1 (UI-Anpassung) und M2 (Compose-Stack-Provisionierung). End-to-End-Browser-Smoke gegen `/admin` ist Operator-Aktion (Postgres-Stack + Bootstrap-Admin nötig).

## Phasen-Übersicht

| Phase   | Meilenstein | Titel                                           | Status     |
|---------|-------------|-------------------------------------------------|------------|
| 0 Test  | M0          | Plus-Map-Scaffolding aus Snapshot               | [IN ARBEIT] |
| 0 Test  | M0.1        | Bugfixes aus Issue #1 (Bugs 1–3)                | [ERLEDIGT] 2026-05-04 |
| 0 Test  | M0.2        | Tarnungs-Cut Backend/DB (Issue #1, Bug 4)       | [ERLEDIGT] 2026-05-04 |
| 0 Test  | M0.3        | Equipment-Domäne umbenennen (Issue #4, ADR-002) | [ERLEDIGT] 2026-05-05 |
| 0 Test  | M0.4        | Welle-2-Nachzug (Issue #6, ADR-003 + ADR-004)   | [ERLEDIGT] 2026-05-06 |
| 0 Test  | M1          | UI-Anpassung Tour/Stopp/Erfasser/Ausrüstung     | [OFFEN]    |
| 0 Test  | M2          | Compose-Stack-Provisionierung                   | [OFFEN]    |
| 0 Test  | M3          | Demo-Daten-Seed + Tester-Account                | [OFFEN]    |
| 0 Test  | M4          | Externer Usability-Test                         | [OFFEN]    |

## M0.1 — Bugfixes aus Issue #1

Quelle: [Issue #1](https://github.com/Paddel87/Plus-Map/issues/1), Befunde aus Erst-Deployment vom 2026-05-04 auf Commit `c2d6016`. Bugs 1–3 sind Implementierungs-Bugs ohne Architekturwirkung und werden im Autonomiebereich (CLAUDE.md §5) abgearbeitet.

| Schritt | Titel                                                              | Status        |
|---------|--------------------------------------------------------------------|---------------|
| M0.1.1  | Bug 1 — SMTP-Validation: leere Env-Variablen tolerieren            | [ERLEDIGT] 2026-05-04 |
| M0.1.2  | Bug 2 — `seed_plus_map.py`: `PersonOrigin`-Member korrigieren       | [ERLEDIGT] 2026-05-04 |
| M0.1.3  | Bug 3 — `seed_plus_map.py`: `name=`-Kwarg statt `label=`            | [ERLEDIGT] 2026-05-04 |

**M0.1.1 — Bug 1.** `app/config.py`: leere Env-Variablen sollen auf den Field-Default zurückfallen statt gegen `EmailStr` validiert zu werden. Lösung: `env_ignore_empty=True` in `SettingsConfigDict`. Akzeptanz: Backend startet mit unbesetztem `HCMAP_SMTP_FROM` ohne ValidationError; bestehende Tests grün.

**M0.1.2 — Bug 2.** `backend/scripts/seed_plus_map.py` Zeilen 123 und 129: `PersonOrigin.LINKED` → `PersonOrigin.MANAGED`, `PersonOrigin.MANUAL` → `PersonOrigin.ON_THE_FLY`. Akzeptanz: Seed-Script läuft ohne `AttributeError` durch.

**M0.1.3 — Bug 3.** `backend/scripts/seed_plus_map.py` Zeilen 163–165: Kwarg `label=` → `name=` (Schema-Spalte heißt `name`). Akzeptanz: Seed-Script legt Platzhalter-Einträge in `arm_position`, `hand_position`, `hand_orientation` an. Hinweis: das im Issue-Vorschlag erwähnte Entfernen des `HandOrientation`-Imports ist nicht nötig — das Modell existiert auf `c2d6016` (`backend/app/models/catalog.py:191`); die im Issue gemeldete `ImportError` stammte vermutlich aus einem stale gebauten Image.

## M0.2 — Tarnungs-Cut (Option A, ADR-001)

Status [IN ARBEIT]. Freigabe für Option A erteilt am 2026-05-04, festgehalten in [ADR-001](decisions.md). Vollständiger Cut über Backend, Datenmodell, API, Frontend und Migration.

| Schritt  | Titel                                                                  | Status      |
|----------|------------------------------------------------------------------------|-------------|
| M0.2.1   | Backend: 18 Routes + 3 SQLAdmin-Views + Router-Mounts entfernen        | [ERLEDIGT] 2026-05-04 |
| M0.2.2   | Backend: FK-Spalten aus `application` + REST-/Sync-Schemas + Exports + Admin-Stats entfernen | [ERLEDIGT] 2026-05-04 |
| M0.2.3   | Backend: 3 Lookup-Modelle aus `app/models/catalog.py` entfernen        | [ERLEDIGT] 2026-05-04 |
| M0.2.4   | Backend: `seed_plus_map.py` + `app/seeds/positions.py` + `seeds/run.py` von Lookup-Daten befreien | [ERLEDIGT] 2026-05-04 |
| M0.2.5   | Alembic-Migration `20260504_2200_drop_lookups`: DROP COLUMN × 3 + DROP TABLE × 3 | [ERLEDIGT] 2026-05-04 |
| M0.2.6   | Frontend: Branding HC-Map → Plus-Map (acht UI-Stellen, plus package.json) | [ERLEDIGT] 2026-05-04 |
| M0.2.7   | Frontend: `CatalogKind` reduziert + `lookup-form.tsx`/`lookup-picker.tsx` gelöscht + dependents refaktoriert | [ERLEDIGT] 2026-05-04 |
| M0.2.8   | Verifikation: Backend 251 Tests grün, Frontend lint+typecheck grün, Browser-Smoke (Login zeigt Plus-Map) | [ERLEDIGT] 2026-05-04 |

## M0.3 — Equipment-Rename (Option A, ADR-002)

Status [IN ARBEIT]. Freigabe für Option A erteilt am 2026-05-05, festgehalten in [ADR-002](decisions.md). Welle 2 des Tarnungs-Cuts: Equipment-Domäne sprachlich auf Outdoor umstellen, damit Stufe-2- und Stufe-3-Beobachter konsistent sind.

| Schritt  | Titel                                                                                | Status      |
|----------|--------------------------------------------------------------------------------------|-------------|
| M0.3.1   | Backend: `RestraintType` → `EquipmentItem` (Modell, Tabelle, Schemas, Routes)        | [ERLEDIGT] 2026-05-05 |
| M0.3.2   | Backend: `RestraintCategory` → `EquipmentCategory` (Outdoor-Werte) + `RestraintMechanicalType` ersatzlos entfernt | [ERLEDIGT] 2026-05-05 |
| M0.3.3   | Backend: `application_restraint` → `application_equipment` + Spalte/Sync-Feld umbenannt | [ERLEDIGT] 2026-05-05 |
| M0.3.4   | Backend: SQLAdmin + Seeds + `seed_plus_map.py` (re-kategorisierte Demo-Daten)        | [ERLEDIGT] 2026-05-05 |
| M0.3.5   | Alembic-Migration `20260505_1300_equipment_rename`: Tabellen-Rename + ENUM-Type-Convert + DROP `mechanical_type` | [ERLEDIGT] 2026-05-05 |
| M0.3.6   | Frontend: Types + API-Hooks + RxDB-Schema umbenennen                                 | [ERLEDIGT] 2026-05-05 |
| M0.3.7   | Frontend: `equipment-picker.tsx` + `equipment-item-form.tsx` (ohne Mechanical-Type-Select) | [ERLEDIGT] 2026-05-05 |
| M0.3.8   | Verifikation: Backend 251 Tests grün, Frontend 272 Tests + lint + typecheck grün, Migration-Roundtrip + Compose-Smoke | [ERLEDIGT] 2026-05-05 |

## M0.4 — Welle-2-Nachzug (Issue #6)

Status [ERLEDIGT] 2026-05-06. Quelle: [Issue #6](https://github.com/Paddel87/Plus-Map/issues/6). Drei zusammenhängende Befunde aus dem Erst-Smoke-Test nach Welle 2: ein Frontend-Crash (autonom-Bugfix nach §5), ein RxDB-Schema-Drift (ADR-003, freigegeben 2026-05-05), und ein durchgängiger Identity-Rename `hcmap` → `plusmap` (ADR-004, freigegeben 2026-05-05 inkl. Sub-Entscheidungen B1–B4).

| Schritt  | Titel                                                                                                          | Status      |
|----------|----------------------------------------------------------------------------------------------------------------|-------------|
| M0.4.1   | Frontend-Admin: `top_restraints` → `top_equipment`, orphaned `top_arm_positions`/`top_hand_positions` entfernen | [ERLEDIGT] 2026-05-06 |
| M0.4.2   | RxDB-Schema-Migration v1 → v2 (`application.schema.json` Bump + Drop-Strategie für Welle-0/1-Felder)          | [ERLEDIGT] 2026-05-06 |
| M0.4.3   | Identity-Rename `hcmap` → `plusmap` (Pydantic-Settings-Prefix, Cookies, Logger, Storage-Keys, Compose, README) | [ERLEDIGT] 2026-05-06 |
| M0.4.4   | Verifikation: Backend ruff + mypy + 251 pytest grün, Frontend lint + typecheck + 272 vitest grün                | [ERLEDIGT] 2026-05-06 |

**M0.4.1 — Frontend-Admin-DTO.** Bei der Bestandsaufnahme zeigte sich, dass das Frontend nicht nur den Welle-2-Rename verpasst hat, sondern auch die Welle-1-Drops: `frontend/src/lib/admin/types.ts` führt noch `top_arm_positions` und `top_hand_positions`, die das Backend (`backend/app/schemas/admin.py`) nicht mehr liefert. Akzeptanz: `RestraintCount` → `EquipmentCount`, `top_restraints` → `top_equipment`, `top_arm_positions`/`top_hand_positions`/`PositionCount` ersatzlos gelöscht; `page.tsx` rendert nur noch eine TopList „Top Ausrüstung"; `tests/admin-api.test.tsx` Mock-Body angepasst.

**M0.4.2 — RxDB-Migration v2.** Schema-Version-Bump `application.schema.json` von 1 auf 2; Migrationsstrategie in `database.ts` ergänzt, die `arm_position_id`, `hand_position_id`, `hand_orientation_id`, `restraint_type_ids` aus dem Doc-Body entfernt und `equipment_item_ids = []` defaultet. Backend-Drift-Test (`tests/test_rxdb_schema_drift.py`) erwartet Version 2.

**M0.4.3 — Identity-Rename.** Vollständiger Rename in einer Welle, gemäß Tabelle in ADR-004. Reihenfolge der Implementierung: Backend-Settings-Prefix + Compose/Env zuerst (sonst ist der Stack nach Teil-Rename nicht startbar), danach Cookie-/Logger-/IndexedDB-Renames, zum Schluss Doku.

**M0.4.4 — Verifikation.** Backend: `uv run ruff check app tests` und `uv run ruff format --check` sauber, `uv run mypy app` ohne Findings (66 Files), `uv run pytest -x -q` 251 grün. Frontend: `pnpm run lint` und `pnpm run typecheck` ohne Befunde, `pnpm run test` 272 grün (38 Test-Dateien). End-to-End-Browser-Smoke (`/admin` rendert, IndexedDB heißt `plusmap`, Cookies heißen `plusmap_session`/`plusmap_csrf`) ist Operator-Aktion: setzt `compose.plus-map.yml`-Stack mit aktualisierter `.env.plus-map` (`PLUSMAP_*`) und Bootstrap-Admin voraus.

Detaillierte Meilenstein-Beschreibungen für M1+ folgen, sobald die jeweilige Phase ansteht.
