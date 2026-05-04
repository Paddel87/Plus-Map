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
