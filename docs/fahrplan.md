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

- **Stand vom:** 2026-05-04 — Erst-Deployment-Befunde aus Issue #1 in Bearbeitung. Bugs 1–3 (Backend-Crash, Refactor-Lag im Seed-Script) im Autonomiebereich. Bug 4 (Tarnungs-Cut) freigabepflichtig.
- **Laufende Phase:** Phase 0 (Test-Aufbau).
- **Nächster Schritt:** Bugfixes M0.1.{1,2,3} abschließen, dann ADR-Vorschlag für Bug 4 zur Entscheidung vorlegen.

## Phasen-Übersicht

| Phase   | Meilenstein | Titel                                           | Status     |
|---------|-------------|-------------------------------------------------|------------|
| 0 Test  | M0          | Plus-Map-Scaffolding aus Snapshot               | [IN ARBEIT] |
| 0 Test  | M0.1        | Bugfixes aus Issue #1 (Bugs 1–3)                | [ERLEDIGT] 2026-05-04 |
| 0 Test  | M0.2        | Tarnungs-Cut Backend/DB (Issue #1, Bug 4)       | [WARTET-AUF-FREIGABE] |
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

## M0.2 — Tarnungs-Cut (freigabepflichtig)

Status [WARTET-AUF-FREIGABE]. Bug 4 aus Issue #1 berührt API-Verträge, Datenmodell, Migrationen und Frontend-Routing. Vorschlag wird im selben Turn als `ENTSCHEIDUNG ERFORDERLICH`-Block formuliert; Umsetzung erst nach Freigabe und ADR-001.

Detaillierte Meilenstein-Beschreibungen folgen, sobald die jeweilige Phase ansteht.
