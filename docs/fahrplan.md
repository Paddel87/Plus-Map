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

- **Stand vom:** 2026-05-04 — Erst-Deployment-Befunde aus Issue #1 abgearbeitet. Bugs 1–3 (M0.1) und vollständiger Tarnungs-Cut (M0.2, ADR-001) abgeschlossen. Migration `20260504_2200_drop_lookups` ist die neue Head-Revision.
- **Laufende Phase:** Phase 0 (Test-Aufbau).
- **Nächster Schritt:** M1 (UI-Anpassung Tour/Stopp/Erfasser/Ausrüstung) und M2 (Compose-Stack-Provisionierung) gemäß bestehender Phasen-Übersicht.

## Phasen-Übersicht

| Phase   | Meilenstein | Titel                                           | Status     |
|---------|-------------|-------------------------------------------------|------------|
| 0 Test  | M0          | Plus-Map-Scaffolding aus Snapshot               | [IN ARBEIT] |
| 0 Test  | M0.1        | Bugfixes aus Issue #1 (Bugs 1–3)                | [ERLEDIGT] 2026-05-04 |
| 0 Test  | M0.2        | Tarnungs-Cut Backend/DB (Issue #1, Bug 4)       | [ERLEDIGT] 2026-05-04 |
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

Detaillierte Meilenstein-Beschreibungen folgen, sobald die jeweilige Phase ansteht.
