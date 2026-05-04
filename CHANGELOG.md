# Changelog

Alle nutzerrelevanten Änderungen werden hier dokumentiert.
Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung folgt [SemVer](https://semver.org/lang/de/).
Bis zum ersten Go-Live (M11) bleibt das Projekt auf `0.0.0`.

## [Unreleased]

### Added

- **M5c-NACH — Externe Referenz im Edit/Backfill-UI (2026-05-04, ADR-050 §S3).**
  Optionales Freitext-Feld `legacy_external_ref` an Events ist jetzt im UI angeschlossen: Eingabe in der nachträglichen Erfassung (`/events/new/backfill`) und im Edit-Modus (`/events/{id}/edit`), bedingte Anzeige im Detail-View, wenn nicht null. Live-Modus bleibt bewusst ohne Eingabe (ADR-050 §S3-A — Selbstreferenz für Bestand, nicht für neue Live-Events). Mitglieder können damit beim Nachtragen die ursprüngliche 3-Wort-Adresse, eine externe URL oder eine Projekt-ID an einem definierten Ort ablegen, statt sie in `event.note` zu vermischen. Frontend-only — Backend, RxDB-Schema (LWW) und DB-Spalte sind seit ADR-050 (2026-05-01) vorhanden. Volle Suite **289/289** grün (+7 neue Tests), Browser-Smoke bestätigt End-to-End-Pfad inkl. RxDB-LWW-Sync. **Damit ist das ADR-050-Final-Tag-Followup vor `v0.1.0`-Final abgeschlossen.**

### Changed

- **M11-HOTFIX-011 — `reveal_participants`-Toggle prominent im Beteiligte-Tab (2026-05-03, Issue [#23](https://github.com/Paddel87/HC-Map/issues/23) Befund 1 / korrigiert via [#27](https://github.com/Paddel87/HC-Map/issues/27), ADR-059).**
  Der Sichtbarkeits-Toggle für Klarnamen, der bisher nur im Edit-UI versteckt war, erscheint jetzt direkt im Beteiligte-Card-Header der Event-Detail-Ansicht — sichtbar nur für Editoren (Admin oder Event-Ersteller). Strikte Default-Logik („Klardaten verborgen, sichtbar nur via expliziter Aktion") bleibt unverändert; die Aktion ist über den RxDB-`updated_at`-Cursor und den M11-HOTFIX-003-Logger protokolliert. Der bestehende Edit-UI-Toggle bleibt zusätzlich verfügbar. Frontend-only, kein Backend-Touch. **Damit ist der RC-3-Operator-Befundbericht-Triage-Block ([#22](https://github.com/Paddel87/HC-Map/issues/22)–[#27](https://github.com/Paddel87/HC-Map/issues/27)) vollständig abgearbeitet.**

### Added

- **M11-HOTFIX-010 — Event.`time_precision`-Marker für retrospektive Erfassung (2026-05-03, Issue [#24](https://github.com/Paddel87/HC-Map/issues/24), ADR-058).**
  Events bekommen einen Granularitäts-Marker (`year`/`month`/`day`/`hour`/`minute`, Default `minute`), der ehrliche grobe Erinnerungen erlaubt („Sommer 2024" als `year`, „Mai 2024" als `month`) statt erfundener Pseudo-Genauigkeit. Backend-Migration mit CHECK-Constraint, RxDB-Schema-Bump v2→v3 mit Migrations-Strategie. Backfill-Form bekommt einen Präzisions-Wechsler mit dynamischen Eingabefeldern (Jahr-Input für `year`, Monat-Select+Jahr-Input für `month`, Date-Input für `day`, datetime-local für `hour`/`minute`). Anzeige-Logik in Dashboard/Detail/MapView nutzt zentralen `formatEventTime`-Helper. Storage bleibt voller Datetime — nur das Display ist konditioniert. Backend `pytest` **258/258** + Frontend `vitest` **282/282** grün, Browser-Smoke bestätigt End-to-End: API persistiert, Detail-View zeigt „2024" für year-Events und „Mai 2024" für month-Events.

### Fixed

- **M11-HOTFIX-009 — Application-Lifecycle Auto-Stop bei Event-Ende (2026-05-03, Issue [#23](https://github.com/Paddel87/HC-Map/issues/23) Befund 2, ADR-057).**
  Wenn ein Event beendet wird, werden alle noch laufenden Applications dieses Events automatisch auf den Event-Ende-Zeitstempel gesetzt — Lifecycle-Kaskade ist jetzt konzeptkonform. Greift an drei Server-Pfaden: `POST /api/events/{id}/end` (Live-Modus), `PATCH /api/events/{id}` (Edit-Form) und RxDB-Event-Push (Offline-Reconnect-Fall). Frontend ergänzt um Stop-Button pro aktive Application in der Timeline (kein Umweg mehr über „Event bearbeiten") und um Live-Validation im Edit-Form (Bounds-Verletzungen sind sofort sichtbar, nicht erst nach Submit-Klick). Volle Backend-Suite **258/258** + Frontend-Suite **282/282** grün, End-to-End-Browser-Smoke bestätigt: Event mit zwei laufenden Applications → Event-Ende → beide Applications haben exakt `event.ended_at`-Timestamp.

### Added

- **M11-HOTFIX-008 — Optionales `event.title`-Feld für Identifikation und Wiederfindung (2026-05-03, Issue [#27](https://github.com/Paddel87/HC-Map/issues/27) Befund 4+5, ADR-056).**
  Events bekommen ein optionales Titel-Feld (max. 120 Zeichen) zur schnellen Wiederfindung im Dashboard und auf der Karte. Backend-Migration `event.title VARCHAR(120) NULL`, RxDB-Schema-Bump v1→v2 mit Migrations-Strategie (alte Docs erhalten `title=null`), neues Eingabefeld in beiden Erfassungs-Forms (Live + Backfill) sowie editierbar in der Bearbeiten-Ansicht. Anzeige als Hauptzeile im Dashboard, prominenter Header im Event-Detail, erste Zeile im Karten-Marker-Popup. Fallback bei NULL: aktuelle Startzeit-/Koordinaten-Darstellung. Volle Backend-Suite **256/256** + Frontend-Suite **282/282** grün, Browser-Smoke bestätigt End-to-End-Pipeline (POST API → DB → RxDB-Sync → alle UI-Stellen).

- **M11-HOTFIX-007 — MapLibre `GeolocateControl` (Fadenkreuz) in Karten-Komponenten (2026-05-03, Issue [#22](https://github.com/Paddel87/HC-Map/issues/22)).**
  Beide Karten-Komponenten ([`frontend/src/components/map/map-view.tsx`](frontend/src/components/map/map-view.tsx) und [`frontend/src/components/map/location-picker-map.tsx`](frontend/src/components/map/location-picker-map.tsx)) zeigen jetzt das MapLibre-Standard-Crosshair-Control unter den Zoom-Buttons oben rechts. Tap zentriert die Karte auf den eigenen GPS-Fix; im `LocationPickerMap` wird zusätzlich der Marker direkt auf die User-Position gesetzt — kein separater zweiter Tap nötig. Operator-Wunsch aus dem RC-3-Mobile-Test auf Nodica1: Pan/Zoom-Aufwand entfällt, gerade wenn Default-Karten-Region weit weg vom aktuellen Standort liegt. Kein neuer Stack-Bestandteil, keine Datenmodell-/API-Änderung; volle Suite **282/282** grün, Browser-Verifikation auf `/map` und `/events/new` bestätigt das Control-DOM.

### Changed

- **M10.9-Postfix — GHCR-Image-Tag-Konvention klargestellt (2026-05-02).**
  Quer durch [.env.example](.env.example),
  [README.md](README.md), [ops/runbook.md](ops/runbook.md),
  [docs/decisions.md](docs/decisions.md) (ADR-051 §E),
  [docs/fahrplan.md](docs/fahrplan.md): Image-Tags haben kein
  `v`-Prefix, weil `docker/metadata-action`'s
  `type=semver,pattern=v{{version}}` das führende `v` strippt. Git-Tag
  bleibt `v0.1.0-rc.1`, GHCR-Image-Tag ist `0.1.0-rc.1`. Operator-Doku
  und ADR-Tabelle entsprechend gefixt; "Häufige Stolperer"-Tabelle
  in `ops/runbook.md` §14 erweitert um den `manifest unknown`-Fall.
  ADR-051 §F-Annahme „Image-Bytes identisch zu RC" als nicht-garantiert
  markiert (BuildKit-Default ist nicht-deterministisch — sichtbar daran,
  dass `:main` und `:0.1.0-rc.1` aus identischem Commit `a309d8d`
  unterschiedliche Digests haben).

## [v0.1.0-rc.1] — 2026-05-02

Erste deployment-fähige Multi-Instanz-Variante. M10 als Release-Candidate-
Bündel abgeschlossen.

[GitHub Pre-Release](https://github.com/Paddel87/HC-Map/releases/tag/v0.1.0-rc.1)
| GHCR-Image-Tags: `:0.1.0-rc.1`, `:rc` (alle drei: backend, frontend, backup,
linux/amd64 + arm64, anonym pullbar).

### Fixed

- **M10.9 RC-Smoke deckt zwei RC-Image-/Compose-Defekte auf (2026-05-02).**
  Die im lokalen Voll-Compose-Smoke (Variant B per Patrick-Freigabe:
  Caddy mit `tls internal` + Traefik mit self-signed Cert alternativ)
  entdeckten Show-Stopper sind im selben Push behoben:
  - **Blocker #003 — Backend-Image enthielt keine Migrations.**
    [docker/backend.Dockerfile](docker/backend.Dockerfile) kopierte nur
    `backend/app` in das Image; der Auto-Migrations-Runner aus
    [backend/app/migrations_runner.py](backend/app/migrations_runner.py)
    (ADR-051 §F) crashte beim Startup mit
    `alembic.util.exc.CommandError: Path doesn't exist: /app/migrations`.
    Fix: Builder- und Runtime-Stage kopieren zusätzlich
    `backend/migrations`, `backend/alembic.ini` und `backend/scripts`.
    Das Skripte-Verzeichnis braucht's für
    `python -m scripts.bootstrap_admin` aus
    [ops/runbook.md](ops/runbook.md) §9. Verifikation: lokales Image
    `hc-map-backend:smoke-fix` fährt alle 7 Migrationen
    (`20260425_1700_initial` bis `20260501_1200_legacy_ref`) sauber
    durch und kommt healthy hoch.
  - **Blocker #004 — Traefik-Overlay mountete `/var/run/docker.sock` nicht.**
    [docker/compose.traefik.yml](docker/compose.traefik.yml) konfiguriert
    in [docker/traefik/traefik.yml.example](docker/traefik/traefik.yml.example)
    den Docker-Provider (Service-Discovery via Labels), reichte den
    Socket aber nicht in den Traefik-Container — Folge:
    `Cannot connect to the Docker daemon` bei jedem Request, alle
    routenbasierten Endpunkte 404. Fix: read-only Bind-Mount
    `/var/run/docker.sock:/var/run/docker.sock:ro` ergänzt. Auf einer
    Linux-VPS reicht das (Standard-`docker`-Gruppen-Membership des
    Sockets greift); für den lokalen macOS-Smoke war zusätzlich ein
    file-Provider-Routing-Snippet in
    [docker/traefik/dynamic.yml.example](docker/traefik/dynamic.yml.example)
    nötig (Docker-Desktop-Permission-Quirk).

### Verified

- **M10.9 — RC-Voll-Smoke gegen lokalen Prod-Compose-Stack (2026-05-02).**
  Per ADR-051 §I durchgespielt; Voll-Sweep-Variant B (Caddy + Traefik
  alternativ, Mailpit als SMTP-Sink, lokaler rclone-Remote für die
  Backup-Pipeline). **Caddy-Pfad voll grün:** Healthcheck (TLS via
  Caddy-internal-CA), Bootstrap-Admin via
  `python -m scripts.bootstrap_admin`, Login (CSRF + JWT-Session-Cookie
  unter HTTPS, beide Cookies mit `Secure`-Flag), Live-Event via
  `POST /api/events/start`, Backfill-Event mit `legacy_external_ref`
  (M5c-NACH-Feldpfad), `PATCH /api/events/{id}` (`note`-Update,
  `updated_at` springt korrekt), Anonymisierung (Person → `name='[gelöscht]'`,
  `is_deleted=t`, `deleted_at` gestempelt), Person-Merge (Source
  soft-deleted mit `[merged → <target-uuid>]`-Marker, Target unverändert),
  Stats (2 Events, 4 Personen, 1 Admin-Role, leere Top-Listen), Export
  (`schema_version=1`, 11 Collections, 3263 Bytes). **Backup-Roundtrip
  grün:** `pg_dump --format=custom | age | rclone rcat local:` schreibt
  73-KB age-encrypted-Dump in Backup-Volume; Restore-Container
  (`--entrypoint /usr/local/bin/restore.sh`) holt + entschlüsselt + restored
  in zweite DB `hcmap_restore`; identische Row-Counts (2/4/1/2
  event/person/user/event_participant). Schema-Diff zeigt 120 Zeilen
  Differenz, davon 100 % `GRANT … TO app_user` — Folge der bewussten
  `pg_restore --no-owner --no-acl` Wahl in
  [docker/backup/restore.sh](docker/backup/restore.sh) (cluster-agnostic
  Restore). **Mail-Reset-Roundtrip gegen Mailpit grün:**
  `POST /api/auth/forgot-password` → 202 ohne User-Enumeration; Mail
  taucht in Mailpit auf (`SUBJECT: HC-Map: Passwort zuruecksetzen`,
  Plain-Text-Body mit `https://hc-map.localhost/reset-password?token=…`);
  Token extrahiert; `POST /api/auth/reset-password` → 200; Re-Login mit
  neuem Passwort → 204 + neue Session. **Traefik-Pfad alternativ grün:**
  HTTP→HTTPS-Redirect (301), TLS-Termination mit self-signed Cert,
  Login (Cookie-`Secure` aktiv: `secure=TRUE` für `hcmap_session`
  + `hcmap_csrf`), Live-Event-Anlage. Verbleibende Limitierung: das
  Schema-Diff-Erwartungs-`null`-Versprechen aus
  [ops/runbook.md](ops/runbook.md) §12.4 ist zu stark formuliert —
  bei `--no-acl`-Restore ist der GRANT-Block immer Differenz; sollte in
  einem Folge-Doku-Patch präzisiert werden (M10.9-Followup, nicht-blockierend).

### Changed

- **M10.7.1 — GitHub-Actions-Major-Bumps auf Node-24-fähige Runtimes (2026-05-01).**
  Beide Workflows ([.github/workflows/ci.yml](.github/workflows/ci.yml) +
  [.github/workflows/release.yml](.github/workflows/release.yml)) ziehen
  alle neun GitHub-Actions auf Node-24-Major-Tags um:
  `actions/checkout@v4 → @v6`, `actions/cache@v4 → @v5`,
  `actions/setup-node@v4 → @v6`,
  `astral-sh/setup-uv@v5 → @v8.1.0` (immutable Pin per astral-Empfehlung —
  v8 hat keine floating major-/minor-Tags mehr, Supply-Chain-Hardening),
  `docker/build-push-action@v6 → @v7`,
  `docker/login-action@v3 → @v4`,
  `docker/metadata-action@v5 → @v6`,
  `docker/setup-buildx-action@v3 → @v4`,
  `docker/setup-qemu-action@v3 → @v4`. Audit lief live gegen die
  GitHub-Releases-API plus `action.yml`-Contents-API; alle neun
  `using: node24` direkt aus den Ziel-Tags verifiziert. `actionlint
  v1.7.12` clean. Kein Anwendungscode berührt — Test-Stand unverändert
  (Backend pytest 246/246, Frontend vitest 278/278). Beide Stichtage
  aus Blocker #002 entschärft (2026-06-02 Runner-Default Node 24,
  2026-09-16 Node-20-Entfernung). Auflösung von
  [Blocker #002](docs/blockers.md#blocker-002-github-actions-runtime-deprecation-nodejs-20)
  per [ADR-052](docs/decisions.md#adr-052--github-actions-major-bumps-auf-node-24-fähige-runtimes-m1071).

### Added

- **M10.8 — `ops/runbook.md` als Operator-Dokumentation neu angelegt (2026-05-01).**
  Neues Verzeichnis [`ops/`](ops/) mit der Datei
  [`ops/runbook.md`](ops/runbook.md) (~13 KB, 14 Abschnitte). Deckt den
  vollen Operator-Workflow für eine fremde HC-Map-Instanz ab:
  Voraussetzungen-Tabelle (VPS-Mindestgrößen, OS, DNS, SMTP,
  Backup-Ziel, lokale Tools), SSH-Hardening (Non-Root-User, Key-only
  sshd-Konfig, ufw + fail2ban), Docker-Engine + Compose-v2-Plugin
  (offizielles Repo), Repo-Klon und `.env.prod`-Pflichtfeld-Tabelle,
  Reverse-Proxy-Wahl (Caddy / Traefik / eigener Proxy), SMTP-Backend-
  Tabelle für die drei typischen TLS-Modi, age-Key-Walkthrough
  (Generierung lokal, Public-Key auf Server, Private-Key in
  Passwort-Manager + 2-Personen-Split, jährliche Rotation),
  rclone-Walkthrough mit den vier Templates aus
  [`docker/secrets/rclone.conf.example`](docker/secrets/rclone.conf.example)
  (Hetzner Storage Box / Backblaze B2 / generisches S3 / Local-FS),
  Stack-Start mit beiden Overlay-Varianten, Admin-Bootstrap,
  7-Punkte-Smoke-Test, Update-Pfad mit Notfall-`HCMAP_SKIP_MIGRATIONS`
  und Rollback-Hinweis, **Restore-Drill als Pflichtkapitel vor
  Go-Live**, Betriebs-Spickzettel + Volume-Tabelle und „Häufige
  Stolperer"-Tabelle mit 11 Symptom→Ursache-Paaren. Implementiert
  ADR-051 §H/§I („M10.8") und macht das in M10.5/M10.6 angelegte
  Compose-Bündel auch ohne ADR-Lektüre für eine fremde Person
  bedienbar.

### Changed

- **M10.8 — README umstrukturiert auf Operator-zentrierten Lese-Pfad (2026-05-01).**
  Inhaltsverzeichnis und Reihenfolge nach
  [ADR-051 §H](docs/decisions.md#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann)
  neu aufgeteilt: **Operator-Quickstart** als oberster Aktions-Abschnitt
  mit 8 nummerierten Schritten (Hardening → Repo → ENV →
  Reverse-Proxy → age + rclone → Stack-Start → Bootstrap → Smoke),
  **Konfiguration** (Pflichtvariablen-Tabelle, Image-Tag-Schema),
  **Backups** (Schedule-Tabelle, Verschlüsselungs-Kurzhinweis,
  Restore-Verweis), **Update-Pfad** (Backend-Start-Sequenz mit
  Advisory-Lock und Alembic, Rollback-Klausel), **Sicherheit und
  Datenschutz** (unverändert, an Operator-Position verschoben),
  **Development-Setup** mit Untergliederung (Voraussetzungen, Docker,
  Backend-ohne-Docker, Frontend-ohne-Docker, Pre-commit) nach unten
  verlagert. Tech-Stack-Tabelle um Backup-Zeile ergänzt. Projektstatus
  zeigt M10.8 als ✅. **Architektur und Dokumentation** mit
  [`ops/runbook.md`](ops/runbook.md) in der Doku-Tabelle. Header bekommt
  neuen [CI-Status-Badge](https://github.com/Paddel87/hc-map/actions/workflows/ci.yml/badge.svg?branch=main),
  Phase-Badge auf `M10.7-erledigt` aktualisiert (M10.8 ist Doku, kein
  Phasenwechsel; CLAUDE.md §6: Badges spiegeln Ist-Zustand).

- **README + project-context.md auf aktuellen Stand gebracht (2026-05-01).**
  Status-Tabelle und der lange Beschreibungs-Block standen bei M6/M7.3
  und kannten weder M7-M10 noch M9-Verwerfung. Repo-Struktur-Block
  ähnlich veraltet. Komplett umgeschrieben: kompakter Phase-1-Überblick
  (M0–M8 erledigt, M9 verworfen, M10 RC-Bündel mit Sub-Step-Status),
  Test-Stand und Sub-Step-Liste M10.1–M10.9 explizit. Phase-Badge
  M10.3-erledigt → M10.4-erledigt. Tech-Stack-Tabelle: Reverse-Proxy
  „Caddy oder Traefik via Compose-Overlay", Admin-UI-Pfad korrigiert
  (zwei Schichten gemäß ADR-049, kein erfundener `/admin-dash`-Pfad),
  Mail-Versand-Zeile ergänzt, Multi-Arch-Hinweis. „Explizit nicht
  erlaubt" ohne Selbstwiderspruch zur AGPLv3-Wahl umformuliert.
  Sicherheits-Abschnitt: Passwort-Reset als produktiv markiert.
  Setup: Hinweis auf MapTiler-Key und SMTP-Default ergänzt.
  Konsistent dazu in `project-context.md` §6: Projektlizenz von
  „noch offen" auf AGPL-3.0-only fixiert (Verweis auf ADR-051),
  Ausschlussliste umformuliert (proprietäre/source-available
  statt GPL).

### Changed

- **M10.6-Folge-Anpassung — `compose.prod.yml` `backup`-Service auf GHCR-Image umgestellt (2026-05-01).**
  Nach dem ersten erfolgreichen `build-push`-Run (CI Run #3) und
  Patricks Umstellung der drei GHCR-Pakete auf „Public" wurde der
  `backup`-Service in
  [`docker/compose.prod.yml`](docker/compose.prod.yml) von
  `build: docker/backup.Dockerfile` auf
  `image: ghcr.io/paddel87/hc-map-backup:${HCMAP_IMAGE_TAG:-rc}` +
  `pull_policy: always` umgestellt — analog backend/frontend.
  Anonymous-`docker pull` aller drei Images verifiziert; Image-Smoke
  bestätigt die enthaltenen Versionen (backup: pg_dump 16.13, age
  1.1.1, rclone v1.60.1; backend: Python 3.12.13; frontend: Node
  22.22.2). `compose.prod.yml`-Validierung mit beiden
  Reverse-Proxy-Overlays clean.

### Fixed

- **M10.7-Followup #2 — `frontend/public/.gitkeep` für reproduzierbaren Frontend-Image-Build (2026-05-01).**
  CI-Run #2 (`gh run 25225805748`) zeigte einen zweiten Fehler: das
  Frontend-Multi-Arch-Image scheiterte an
  [`docker/frontend.Dockerfile:53`](docker/frontend.Dockerfile:53)
  (`COPY --from=builder /app/public ./public`), weil das Repo kein
  `frontend/public/`-Verzeichnis hatte (Next.js-Konvention erlaubt
  das, der Dockerfile-`COPY` aber nicht). Backend- und Backup-Image
  wurden im selben Lauf erfolgreich nach GHCR gepusht — das beweist
  zugleich, dass die Workflow-Permissions ohne manuelle Anpassung
  bereits ausreichen (Default „Read and write" auf neuen Repos).
  Fix: leerer
  [`frontend/public/.gitkeep`](frontend/public/.gitkeep) angelegt mit
  Hinweis-Kommentar (Operator kann später echte Static-Assets
  einlegen). Lokal verifiziert: `docker build -f docker/frontend.Dockerfile`
  läuft sauber durch (Layer #21 grün).

- **M10.7-Followup #1 — Prettier-Sweep über 47 historisch nicht-formatierte Files (2026-05-01).**
  Der erste CI-Run (`gh run 25225432180`) deckte auf, dass 47 Files
  seit M5b/M7 nicht mehr durch `prettier --write` gelaufen waren und
  in einem nicht-kanonischen Wrap-Zustand committed lagen. Vor M10.7
  gab es keine CI-Stufe für `format:check`, deshalb war das im Repo
  unsichtbar geblieben. Die ursprüngliche M10.7-Verifikation hatte
  `format:check` lokal nicht ausgeführt (Annahme: Node-24-Drift, CI
  fährt Node 22 also dort grün); diese Annahme war falsch.
  Fix: `corepack pnpm format` über alle Files. Diff ist rein
  Whitespace/Wrap (Zeilen-Joining), keine Logik-Änderungen. Cross-
  Verifikation in einem `node:22-bookworm-slim`-Container (entspricht
  dem GitHub-Runner): `format:check` clean. Nach `prettier --write`
  ist der Output stabil über Node 22 + 24 — die Pre-M10.7-Annahme zur
  Node-Version-Drift war nicht haltbar.

### Added

- **M10.7 — GitHub Actions CI + GHCR-Push (Multi-Arch, ADR-051 §E, 2026-05-01).**
  - Neuer Workflow
    [`.github/workflows/ci.yml`](.github/workflows/ci.yml) mit drei
    Jobs:
    - `backend-lint-test` — Postgres+PostGIS-Service-Container
      (`postgis/postgis:16-3.5`, gepinnt analog
      `compose.prod.yml`), `astral-sh/setup-uv@v5`
      (`version: 0.11.8`), `uv python install 3.12`,
      `uv sync --frozen`,
      `uv run ruff check`/`ruff format --check`/`mypy --strict app`/`pytest -ra`.
      Test-DB-Override via
      `HCMAP_TEST_DATABASE_URL=postgresql+psycopg://...`
      (Conftest skipt dann den testcontainers-Pfad).
    - `frontend-lint-test` — `actions/setup-node@v4`
      (`node-version: 22`), `corepack enable` (zieht pnpm 10.33
      aus `packageManager`), `actions/cache@v4` für
      `pnpm store path`, `pnpm install --frozen-lockfile`,
      `pnpm typecheck`/`lint`/`format:check`/`test --run`.
    - `build-push` — `needs: [backend-lint-test, frontend-lint-test]`,
      `if: push && (main || v*.*.* tag)`. Matrix über drei Images
      (`backend`, `frontend`, `backup`).
      `docker/setup-qemu-action@v3` +
      `docker/setup-buildx-action@v3`, GHCR-Login per
      `GITHUB_TOKEN`, `docker/metadata-action@v5` rendert Tags
      gemäß Schema (RC-Tag → `:vX.Y.Z-rc.N` + `:rc`; Final-Tag →
      `:vX.Y.Z` + `:vX.Y` + `:X` + `:latest`; `main`-Push →
      `:main` + `:sha-<short>`), `docker/build-push-action@v6`
      baut `linux/amd64,linux/arm64` mit GHA-Cache
      (`type=gha,scope=<image>,mode=max`).
    - `concurrency: ci-${{ github.workflow }}-${{ github.ref }}`
      mit `cancel-in-progress: true`.
  - Neuer Workflow
    [`.github/workflows/release.yml`](.github/workflows/release.yml)
    triggered auf `v*.*.*`-Tags, läuft parallel zu `ci.yml`-build-push.
    Awk-Extraktion aus
    [`CHANGELOG.md`](CHANGELOG.md): matcht `## [vX.Y.Z]`/`## [X.Y.Z]`
    und fällt für RC-Tags (`-rc.x`) auf `## [Unreleased]` zurück.
    `gh release create` mit `--prerelease`-Flag, wenn der Tag
    einen Bindestrich enthält.
  - **Verifikation:**
    - `actionlint` (rhysd/actionlint via Docker) clean auf beiden
      Workflows.
    - CHANGELOG-Awk lokal gegen aktuellen Stand simuliert:
      `v0.1.0-rc.1` → `## [Unreleased]`-Inhalt extrahiert,
      `v0.1.0` (hypothetisch) → 0 Zeilen → Workflow-Fallback
      „see CHANGELOG.md" greift.
    - Backend-CI lokal repliziert (Postgres-16-3.5 als
      Service-Container auf `localhost:5433`):
      `ruff check` clean (112 Files), `ruff format --check` clean,
      `mypy --strict app` clean (66 Files), `pytest -ra`
      **246/246 grün** (89 s).
    - Frontend-CI lokal repliziert
      (`corepack pnpm install --frozen-lockfile`):
      `pnpm typecheck` clean, `pnpm lint` clean,
      `pnpm test --run` **278/278 grün** (5 s).
      `format:check` lokal nicht ausgeführt (bekannter Node-24-Drift
      aus M8.5; CI fährt Node 22, dort grün).
  - **Operator-Hinweise (manuelle Repo-Schritte, nicht Code):**
    `Settings → Actions → General → Workflow permissions` muss
    auf „Read and write" stehen, damit
    `release.yml` (`gh release create`) und `build-push` (Push zu
    GHCR) den `GITHUB_TOKEN`-Scope tatsächlich nutzen können.
    GHCR-Paket-Sichtbarkeit (`hc-map-backend`, `hc-map-frontend`,
    `hc-map-backup`) muss nach erstem Push manuell auf „Public"
    gestellt werden (Standard ist „Private"; AGPLv3-Linie aus
    ADR-051 §E sieht „Public" vor).

- **M10.6 — Backup-Service (`pg_dump | age | rclone` via cron, ADR-051 §D, 2026-05-01).**
  - Neues Image
    [`docker/backup.Dockerfile`](docker/backup.Dockerfile):
    `debian:bookworm-slim` + `postgresql-client-16` (aus PGDG) +
    `age` + `rclone` + `cron` + `tini`. Multi-arch-fähig.
  - Skripte unter [`docker/backup/`](docker/backup/):
    `backup.sh` (parameterisiert nach `daily|weekly|monthly`),
    `retention.sh` (14d/56d/365d via `rclone delete --min-age`,
    Skip auf nicht-existente Buckets via `rclone lsf`-Probe),
    `restore.sh` (rclone-Pull + age-Decrypt + `pg_restore`),
    `entrypoint.sh` (Env-/Secret-Validierung +
    `rclone listremotes`-Probe + Render `/etc/hc-map/backup.env`
    als Cron-Brücke + optional Sofort-Backup via
    `HCMAP_BACKUP_RUN_ON_START=1`), `run-backup`/`run-retention`
    (Cron-Wrapper), `crontab` (UTC: 03:17 daily, 03:33 Sun
    weekly, 03:47 1st monthly, 04:00 daily retention sweep —
    Job-Output via `> /proc/1/fd/1 2>&1` an tini →
    `docker logs`).
  - Operator-Templates
    [`docker/secrets/age-recipients.txt.example`](docker/secrets/age-recipients.txt.example) und
    [`docker/secrets/rclone.conf.example`](docker/secrets/rclone.conf.example)
    (Hetzner Storage Box / Backblaze B2 / Generic S3 / lokales
    Filesystem als Vorlagen). Working-Copies `age-recipients.txt`
    und `rclone.conf` über [`.gitignore`](.gitignore)
    ausgeschlossen.
  - [`docker/compose.prod.yml`](docker/compose.prod.yml) um
    `backup`-Service erweitert: build aus
    `docker/backup.Dockerfile` (M10.7 wird auf GHCR-Image
    umstellen), Pflicht-Env mit `:?`-Marker
    (`HCMAP_BACKUP_REMOTE`, `HCMAP_BACKUP_PREFIX`), `PG*`-Env aus
    den DB-Vars abgeleitet, Secrets-Block (`age-recipients` →
    `secrets/age-recipients.txt`, `rclone-conf` →
    `secrets/rclone.conf`), `depends_on: db service_healthy`.
  - [`.env.example`](.env.example) Backup-Block überarbeitet:
    `HCMAP_BACKUP_AGE_RECIPIENTS` entfernt (Recipients laufen
    über Docker-Secret, nicht Env), `HCMAP_BACKUP_RUN_ON_START`
    ergänzt, Doku-Header erklärt rclone-Remote- und
    Prefix-Mechanik.
  - **Restore-Mechanik:** Private-Key (`AGE_IDENTITY_FILE`) wird
    vom Operator manuell gemountet, **nicht** im Container
    aufbewahrt. `restore.sh` zeigt im Header ein vollständiges
    `docker run`-Beispiel und weist darauf hin, dass die Ziel-DB
    aus `template0` erstellt werden muss (PostGIS-Image
    pre-installiert tiger/topology in `template1`, was
    `pg_restore --exit-on-error` sonst kollidiert).
  - **Verifikation:** Roundtrip-Test gegen zwei Postgres-Container
    (PostGIS 16-3.5) im eigenen Bridge-Netz, rclone-Remote
    `local:` → Schema-Diff (`pg_dump --schema-only` Source vs.
    Restore) = **0 Zeilen**, Daten-Diff (sortierte
    `INSERT`-Statements) = **0 Zeilen**, PostGIS-Extension,
    GIST-Index, GEOGRAPHY/GEOMETRY-Spalten, NULL-Werte und
    TIMESTAMPTZ-Defaults alle erhalten. Cron-Daemon-Smoke:
    tini PID 1, cron PID 7, Crontab korrekt geladen,
    `run-backup`-Wrapper aus laufendem Container exec-bar
    (sourced `/etc/hc-map/backup.env` und schreibt zweites
    Backup-File). Retention-Skript exit 0 wenn weekly/monthly
    noch leer. Compose-Validierung mit beiden
    Reverse-Proxy-Overlays clean.

- **M10.5 — Produktions-Compose + Reverse-Proxy-Overlays + Migrations-Auto-Run (ADR-051 §B/§F, 2026-05-01).**
  - Neue Datei [`docker/compose.prod.yml`](docker/compose.prod.yml):
    `db`, `backend`, `frontend` am internen Bridge-Netz, kein
    Host-Port-Mapping. Backend zieht
    `ghcr.io/paddel87/hc-map-{backend,frontend}:${HCMAP_IMAGE_TAG:-rc}`,
    Pflicht-Env mit `:?`-Marker (`HCMAP_DB_*`, `HCMAP_SECRET_KEY`,
    `HCMAP_BASE_URL`). Backend startet uvicorn mit
    `--proxy-headers --forwarded-allow-ips=*`.
  - Neue Reverse-Proxy-Overlays:
    [`docker/compose.caddy.yml`](docker/compose.caddy.yml) +
    [`docker/Caddyfile.example`](docker/Caddyfile.example) für
    Caddy v2 (Auto-TLS via Let's Encrypt, Routing
    `/api/*`+`/admin/*` → backend, sonst frontend) und
    [`docker/compose.traefik.yml`](docker/compose.traefik.yml) +
    [`docker/traefik/traefik.yml.example`](docker/traefik/traefik.yml.example) +
    [`docker/traefik/dynamic.yml.example`](docker/traefik/dynamic.yml.example)
    für Traefik v3.1 (Routing per Service-Labels,
    Secure-Headers-Middleware, TLS-1.2+-Mindestversion).
    Operator kombiniert per `docker compose -f compose.prod.yml -f
    compose.caddy.yml --env-file .env.prod up -d` (analog Traefik).
  - [`.env.example`](.env.example) Prod-Block ergänzt:
    `HCMAP_DOMAIN`, `HCMAP_ACME_EMAIL`, `HCMAP_COOKIE_DOMAIN`,
    `HCMAP_IMAGE_TAG` (default `rc`), `HCMAP_SKIP_MIGRATIONS`,
    `HCMAP_BACKUP_REMOTE`/`_PREFIX`/`_AGE_RECIPIENTS` (forward-
    kompatibel für M10.6).
  - Neues Modul
    [`backend/app/migrations_runner.py`](backend/app/migrations_runner.py):
    `alembic upgrade head` läuft beim FastAPI-Lifespan-Startup unter
    Postgres-Advisory-Lock `pg_try_advisory_lock(47_110_815)`. Bei
    Lock-Hold blockiert ein zweiter Backend-Container auf
    `pg_advisory_lock` und gibt sofort wieder frei (kein
    Re-Upgrade). Aktiv nur bei `HCMAP_ENVIRONMENT=production`,
    Override `HCMAP_SKIP_MIGRATIONS=1` für Notfälle. Tests skippen
    via Environment-Gating, ihre eigene Schema-Lifecycle bleibt
    intakt.
  - [`backend/app/main.py`](backend/app/main.py): FastAPI-Lifespan
    `_build_lifespan(settings)` führt den Migrations-Runner vor dem
    ersten Request aus.
  - [`.gitignore`](.gitignore): Operator-Working-Copies
    `docker/Caddyfile`, `docker/traefik/traefik.yml`,
    `docker/traefik/dynamic.yml` ignoriert; Examples bleiben tracked.
  - Tests: 15 neue in
    [`backend/tests/test_migrations_runner.py`](backend/tests/test_migrations_runner.py)
    (DSN-Helpers, `_should_run`-Gating-Matrix, Lock-ID-Range, Skip
    ohne DB-Zugriff, Lock-Roundtrip-Integration mit echtem Postgres,
    Concurrent-Wait-Szenario auf Side-Connection). Backend-Suite
    246/246 grün, Frontend unverändert 278/278.

- **M10.4 — Einwilligungs-Vorlage (ADR-051 §G, 2026-05-01).**
  - Neue Datei [`docs/templates/consent-de.md`](docs/templates/consent-de.md):
    deutschsprachige Markdown-Vorlage mit Platzhaltern
    (`[GRUPPENNAME]`, `[ADMIN-NAME]`, `[ADMIN-KONTAKT]`,
    `[INSTANZ-URL]`, `[HOSTING-PROVIDER]`, `[HOSTING-STANDORT]`,
    `[BACKUP-ZIEL]`, `[DATUM]`).
  - 12 Abschnitte plus Bestätigungs-Block: Worum es geht, erfasste
    Daten, Vertrauensmodell (ADR-001), Anonymisierungs-Grenzen
    (ADR-002), On-the-fly-Erfassung (ADR-014), Aggregat-Statistik
    in kleinen Gruppen (ADR-015), Auskunfts-/Anonymisierungs-/
    Berichtigungs-/Beschwerderechte, Speicherdauer,
    Geräteverschlüsselung als User-Pflicht (ADR-032), Foto-/Medien-
    Hinweis als Phase-2-Platzhalter, Konsequenz bei Nicht-Zustimmung,
    Änderungsregel.
  - Verweis auf die Vorlage aus [`README.md`](README.md) (Datenschutz-
    Abschnitt) und [`docs/project-context.md`](docs/project-context.md)
    §6 ergänzt.
  - Disclaimer im Header des Templates: keine Rechtsberatung,
    Operator passt Platzhalter an und lässt ggf. juristisch prüfen.

- **M10.3 — Projektlizenz AGPLv3 (ADR-051 §A, 2026-05-01).**
  - `LICENSE`-File mit dem unveränderten AGPLv3-Volltext (Quelle:
    https://www.gnu.org/licenses/agpl-3.0.txt) im Repo-Root.
  - SPDX-Identifier `AGPL-3.0-only` in
    [`backend/pyproject.toml`](backend/pyproject.toml) und
    [`frontend/package.json`](frontend/package.json) gesetzt
    (vorher Backend `UNLICENSED`, Frontend ohne Feld).
  - README: Lizenz-Badge auf `AGPL-3.0-only` aktualisiert (vorher
    `lizenz-offen-red`), Phase-Badge auf `M10.3-erledigt`.
    Lizenz-Abschnitt umformuliert mit kurzer Zusammenfassung der
    Multi-Instanz-Implikationen (selbst hosten erlaubt, proprietäre
    Forks nicht — entspricht der Multi-Instanz-Linie aus ADR-051).
  - **Compliance-Check:** `pip-licenses` (76 Backend-Pakete) und
    `pnpm licenses list --prod` (Frontend-Prod-Tree) ad-hoc
    durchlaufen. Keine GPL-Treffer außer LGPL-Bibliotheken
    (`psycopg`/`psycopg-binary` über dynamisches Linking aus Python,
    `@img/sharp-libvips-darwin-arm64` als optionale Native-Lib für
    `sharp`) — alle drei sind AGPLv3-kompatibel über
    LGPL-Dynamic-Linking-Ausnahme. Keine proprietären Treffer.

- **M10.2 — produktiver Mail-Versand und Passwort-Reset-UI (ADR-051 §C, 2026-05-01).**
  - Backend-Dep `aiosmtplib>=5,<6` (asyncio-natives SMTP). Neuer
    `SMTPMailer` in [`backend/app/auth/mail.py`](backend/app/auth/mail.py)
    neben dem bestehenden `LoggingBackend`. Auswahl per
    `HCMAP_SMTP_HOST` — leer = Logging (Dev/Test), gesetzt = SMTP (Prod).
    Validiert beim Konstruktor: `smtp_host`, `smtp_from`, plus
    `starttls`-vs.-`use_tls`-Exklusivität.
  - Neue Settings in [`backend/app/config.py`](backend/app/config.py):
    `HCMAP_SMTP_{HOST,PORT,USER,PASSWORD,STARTTLS,USE_TLS,FROM,FROM_NAME}`,
    plus `HCMAP_BASE_URL` (Frontend-Origin für Reset-/Verify-Links).
  - Plain-Text-Templates `password_reset.txt` und `verify.txt` in
    `backend/app/auth/templates/`, deutsch.
  - Frontend-Pages
    [`(public)/forgot-password/page.tsx`](frontend/src/app/(public)/forgot-password/page.tsx)
    und
    [`(public)/reset-password/page.tsx`](frontend/src/app/(public)/reset-password/page.tsx)
    inkl. Form-Komponenten in `src/components/auth/`. „Passwort vergessen?"-Link
    in der Login-Form.
  - No-Enumeration-Verhalten: Forgot-Form zeigt immer „Falls die E-Mail
    existiert …", auch bei Server-Fehlern.
  - **Tests:** Backend +15 Tests (`tests/test_auth_mail.py`, 231/231
    grün). Frontend +7 Tests (`tests/forgot-password-form.test.tsx`,
    `tests/reset-password-form.test.tsx`, 278/278 grün). `ruff`/`mypy
    --strict`/`tsc --noEmit`/`eslint` clean.
  - **Browser-Smoke:** voller Reset-Roundtrip lokal verifiziert
    (`POST /api/auth/forgot-password 202` → Reset-URL aus Backend-Log →
    `POST /api/auth/reset-password 200` → Re-Login mit neuem Passwort →
    `POST /api/auth/login 204` → RxDB-Sync grün).

### Changed

- **M9 (w3w-Migration) verworfen — ADR-050 (2026-05-01).** Kein
  Migrationsskript mehr; Bestand wird manuell über die M5c-Erfassungs-UI
  nachgetragen. Folge:
  - Spalte `event.w3w_legacy` umbenannt zu `event.legacy_external_ref`
    (Alembic-Migration `20260501_1200_legacy_external_ref`, reversibel,
    keine Datenmigration nötig).
  - Sync-Strategie für das Feld geändert von `server-authoritative
    (Migrations-Artefakt)` zu **LWW** (last-write-wins) — Spalte ist
    jetzt user-eingebbar im Edit/Backfill-Modus (UI-Anbindung als
    eigener Fahrplan-Schritt M5c-NACH, nicht-blockierend für M10/M11).
  - RxDB-Schema-Bump v0 → v1 mit Migration-Strategy (alter Feldwert
    wandert auf das neue Property, fehlt-zu-null-Default für Docs ohne
    Eintrag).
  - Backend (Models, Pydantic, Sync-Service inkl. immutable→LWW-Wechsel,
    Routes, Services, Exports), Frontend (TypeScript-Types, RxDB-Schema,
    Edit-/Backfill-/Detail-Komponenten) und Tests (8 Backend, 6 Frontend
    + 1 neuer LWW-Test) konsistent umgestellt.
  - what3words-API ist keine geplante externe Abhängigkeit mehr —
    `project-context.md` §5 und `architecture.md`-Tabelle bereinigt.
  - M11-Akzeptanzkriterium „keine Daten aus w3w fehlen" entfällt;
    Mitglieder bestätigen Vollständigkeit informell.

### Added

- **M8.5 — Frontend Personen-Verwaltung und Export-UI (ADR-049 §H, M8 abgeschlossen):**
  - **`/admin/persons`** mit Suchfeld und Filter-Toggles `origin =
    on_the_fly`, `linkable = true`, `unlinked` und `inkl. anonymisierte /
    gemergte` (kombinierbar). Personen-Tabelle zeigt Origin, Linkable-
    Status, ob ein User mit der Person verknüpft ist, und den Aktiv-/
    Inaktiv-Status; pro Reihe `Mergen…` und `Anonymisieren…` (deaktiviert
    für soft-deleted Personen).
  - **Merge-Wizard** als Radix-Dialog mit Source-Vorschau, Target-Picker
    (Radio-Liste über aktuelle Filter, exklusive Source/soft-deleted),
    POST `/api/admin/persons/{id}/merge` und Result-Anzeige (Konflikt-
    Counts: Participants neu zugeordnet, gelöschte Participants,
    Applications-Performer/Recipient).
  - **Anonymisierungs-Dialog** mit DSGVO-Art.-17-Hinweis (ADR-002),
    POST `/api/persons/{id}/anonymize` (admin-only-Endpoint aus M2,
    bewusst nicht unter `/api/admin/` dupliziert).
  - **Export-Trigger** als Download-Anker auf `/api/admin/export/all`
    (`hc-map-export.json`); Schema unverändert ggü. M8.3.
  - **TanStack-Query-Erweiterung** in `frontend/src/lib/admin/api.ts`:
    neuer Hook `useAdminPersons` (separater Cache-Key
    `["admin","persons", …]` neben dem M8.4-Linkable-Picker, Default
    `limit=200`, `include_deleted` durchgereicht) und
    `useAnonymizePerson` mit gezielter Cache-Invalidation auf
    `persons`/`linkable-persons`/`stats`.
  - **Tests:** `tests/admin-api.test.tsx` um 4 Cases ergänzt
    (Cache-Key-Stabilität `adminPersonsQueryKey`, GET `/api/persons` mit
    `include_deleted`, POST `merge`-Body, POST `anonymize` ohne Body).
    Volle Frontend-Suite **271/271 grün**, `pnpm typecheck`/`pnpm lint`
    clean.

- **M8.4 — Frontend Admin-Dashboard und User-Verwaltung (ADR-049 §H):**
  - **Dashboard `/admin`** zeigt 4 Stat-Cards (Events gesamt, Personen,
    On-the-fly-unverknüpft, Pending-Vorschläge), Events/Monat über die
    letzten 12 Monate, User-Count pro Rolle, Top-Restraints (10),
    Top-Arm-/Hand-Positionen (5). Direkt-Links zur User-/Personen-
    Verwaltung und Export-Download.
  - **`/admin/users`** mit Listing aller User, Inline-Rollen-Toggle
    (PATCH /api/admin/users/{id}) und Soft-Deactivate per Confirm-
    Dialog (DELETE /api/admin/users/{id}).
  - **`/admin/users/new`** mit Modus-Wahl: linkable Person aus der
    Live-Erfassung verknüpfen (ADR-014, Filter `linkable === true`)
    oder gleichzeitig neue Person anlegen (`new_person`-Body).
  - **TanStack-Query-Layer** in `frontend/src/lib/admin/`: typsichere
    Hooks gegen den `/api/admin/*`-Surface mit Cache-Key-Hierarchie
    `["admin", <resource>, ...]` und automatischer Invalidation der
    Stats-/Users-Subtrees nach Mutation. 6 Smoke-Tests in
    `tests/admin-api.test.tsx`.

### Added

- **M8.3 — Backend `/api/admin/*`-Endpoints (ADR-049 §E/§F/§G):**
  Fünf Surfaces unter `/api/admin/` ergänzen die SQLAdmin-Stammdaten-
  Pflege um Workflow-fähige Bausteine, die das Next.js-Frontend ab M8.4
  konsumieren wird:
  - `users` CRUD inkl. der Linkable-Person-Bridge aus ADR-014 (Body
    nimmt entweder `existing_person_id` einer Person mit `linkable=true`
    oder `new_person` mit `PersonCreate`-Feldern; Validator erzwingt
    genau eine der beiden Quellen).
  - `stats` mit sechs Aggregat-Queries (Events/Monat letzte 12, Top-10
    Restraints, Top-5 Arm-/Hand-Positionen, User-Count je Rolle, Personen-
    Count, on-the-fly-unverknüpft, Pending-Catalog-Proposals). Kein
    Caching in M8 — bei Pfad-A-Volumen unkritisch.
  - `export/all` als strukturierter JSON-Dump mit
    `schema_version = 1`/`exported_at`-Zeitstempel und allen 10 Domain-
    Tabellen. `hashed_password` und PostGIS-`geom` werden bewusst aus
    der Antwort entfernt.
  - `persons/{source_id}/merge` re-pointet `event_participant`/
    `application` von Source auf Target. `(event_id, person_id)`-
    UNIQUE-Konflikte werden vorab durch Soft-Delete der überlappenden
    Source-Participant-Rows aufgelöst. Source-Person wird soft-deleted
    mit Audit-Marker `[merged → <uuid>]`. Refused mit 409, wenn Source
    oder Target an einen User gebunden ist.
- Anonymisierung bleibt unter `/api/persons/{id}/anonymize` (admin-only,
  M2/ADR-002) — kein Duplikat unter `/api/admin/`.

### Changed

- **`/api/admin/export/all`** liefert nicht mehr nur Events/Applications/
  Participants/Restraints (alter Endpoint aus `routes/exports.py`),
  sondern den vollständigen `AdminExport`-Dump mit allen 10 Domain-
  Tabellen plus Versionsfeldern. Die alte Implementierung wurde
  entfernt; der bestehende Test `test_admin_export_all_requires_admin`
  trifft das neue Endpoint und bleibt grün.

### Added

- **M8.2 — SQLAdmin-Schicht unter `/admin` (ADR-049, Backend-Teil):**
  Selbst-gehostetes Admin-UI parallel zum Next.js-Frontend, ausschließlich
  für Rolle `admin`. Cookie-Bridge zur fastapi-users-Session
  (`hcmap_session`-Reuse, kein zweiter Auth-Pfad); RLS-Stamping über eine
  `_StampingAsyncSession`-Subklasse, die bei jeder DB-Session
  `app_user` + `app.current_*`-GUCs setzt — `FORCE ROW LEVEL SECURITY` ist
  somit auch in SQLAdmin durchgängig wirksam. ModelViews für 8 Domain-
  Tabellen (User, Person, RestraintType, ArmPosition, HandPosition,
  HandOrientation, Event, Application). `Application` ist read-only
  und `Event` erlaubt weder Create noch Hard-Delete — Mutationen laufen
  weiterhin über die RxDB-Sync-Pipeline (ADR-029, ADR-033). Direkter
  Zugriff auf `/admin/login` (GET) wird auf den Next.js-`/login`
  umgeleitet, sodass die SQLAdmin-Login-Form unerreichbar bleibt.
- **Neue Backend-Dependencies:** `sqladmin` `>=0.25,<0.26` (BSD-3),
  `itsdangerous` `>=2.2,<3` (Starlette-`SessionMiddleware`-Backing).

### Changed

- **STACK-002 — Backend-Stack-Drift Voll-Sweep (ADR-048, Variante B aus Audit Blocker #001 Punkt 3):**
  Backend-Pin-Bump auf jeweils aktuelle Stable-Linie, **ohne** Runtime-Majors
  (Postgres/Node/Python). Auslöser: Audit am 2026-04-30 zeigte 13 out-of-range
  Constraint-Caps in [`backend/pyproject.toml`](backend/pyproject.toml).
  Variante B am 2026-04-30 freigegeben (Patrick).
  - **Backend-Pakete (Constraint-Caps + Lockfile):**
    `fastapi` `0.115.14` → `0.136.1` (`<0.116` → `<0.137`),
    `fastapi-users` `14.0.2` → `15.0.5` (`<15` → `<16`),
    `uvicorn[standard]` `0.32.1` → `0.46.0` (`<0.33` → `<0.47`),
    `structlog` `24.4.0` → `25.5.0` (`<25` → `<26`),
    `argon2-cffi` `23.1.0` → `25.1.0` (`<24` → `<26`, CalVer),
    `asyncpg` `0.30.0` → `0.31.0` (`<0.31` → `<0.32`),
    `geoalchemy2` `0.15.2` → `0.19.0` (`<0.16` → `<0.20`),
    `uuid-utils` `0.10.0` → `0.14.1` (`<0.11` → `<0.15`),
    `httpx` `0.27.2` → `0.28.1` (`<0.28` → `<0.29`),
    `pyjwt` `2.10.1` → `2.12.1` (Within-Constraint-Refresh, `<3` unverändert),
    `pwdlib` `0.2.1` → `0.3.0` (transitiv via fastapi-users 15),
    `python-multipart` `0.0.20` → `0.0.27` (transitiv).
  - **Dev-Tooling:**
    `ruff` `0.7.4` → `0.15.12` (`<0.8` → `<0.16`),
    `pytest` `8.4.2` → `9.0.3` (`<9` → `<10`, Major),
    `pytest-asyncio` `0.24.0` → `1.3.0` (`<0.25` → `<2`, Major).
  - **Pre-commit-Hooks ([.pre-commit-config.yaml](.pre-commit-config.yaml)):**
    `pre-commit/pre-commit-hooks` `v5.0.0` → `v6.0.0`,
    `astral-sh/ruff-pre-commit` `v0.7.4` → `v0.15.12`,
    `pre-commit/mirrors-mypy` `v1.13.0` → `v1.20.2`.
  - **Container-Images:**
    [`docker/backend.Dockerfile`](docker/backend.Dockerfile)
    `ghcr.io/astral-sh/uv:0.8.17` → `0.11.8`;
    [`docker/docker-compose.yml`](docker/docker-compose.yml)
    `postgis/postgis:16-3.4` → `16-3.5` (Postgres-Major bleibt 16,
    PostGIS Binary 3.5.2; bestehende Test-Volumes brauchen einmalig
    `ALTER EXTENSION postgis UPDATE` für saubere Procs, neue Volumes
    starten clean).
  - **Code-Modernisierung durch ruff 0.15:** `class X(str, enum.Enum)`
    → `class X(enum.StrEnum)` in
    [`app/models/catalog.py`](backend/app/models/catalog.py),
    [`app/models/person.py`](backend/app/models/person.py),
    [`app/models/user.py`](backend/app/models/user.py).
    Generic Functions/Classes auf Python-3.12-Type-Parameter
    umgestellt in
    [`app/services/catalog.py`](backend/app/services/catalog.py),
    [`app/routes/catalog.py`](backend/app/routes/catalog.py),
    [`app/schemas/common.py`](backend/app/schemas/common.py).
    Alte `TypeVar`-Modul-Definitionen entfernt (Auto-Fix-Halbmigration
    nachgezogen, siehe ADR-048 §C). Ungenutzte Tupel-Entpackungen
    in 5 Test-Files mit `_`-Präfix versehen (`RUF059`).
  - **Format-Drift:** 22 Bestand-Files reformatiert durch
    `ruff format` 0.15-Layout (mehrzeilige Funktions-Signaturen
    werden bei Bedarf wieder auf eine Zeile zurückgezogen, sofern
    `line-length = 100` passt). Funktional unverändert.
  - **Verifikation:** `pytest` 182/182 grün; `mypy --strict` clean
    (56 Files); `ruff check` clean; `ruff format --check` clean;
    `docker compose build backend` clean (`uv:0.11.8`-Image baut in
    1.4 s); `docker compose up db` startet `postgis 16-3.5`,
    `postgis_full_version()` zeigt `3.5.2`. Smoke-Run gegen Image
    bestätigt Versionen aller Major-Bumps.
  - **Out-of-Scope:** Postgres-Major (16 → 17/18), Node-Major
    (22 → 24 LTS), Python-Major (3.12 → 3.13), `engines: ">=22 <23"`
    in [`frontend/package.json`](frontend/package.json) (unangetastet),
    SQLAdmin-Aufnahme (Teil von M8), CLAUDE.md-Methodik-Härtung
    (Blocker #001 Punkt 2 bleibt offen).

- **STACK-001 — Next.js 15.0.4 → 16.2.4 (ADR-047, Pfad C aus Blocker #001 + Variante Z2):**
  Frontend-Stack-Bump auf aktuelle Major-Linie. Auslöser: Dev-Overlay-Banner
  „Next.js (15.0.4) is outdated" empirisch im Live-Preview verifiziert
  (Blocker #001 vom 2026-04-29). Migrationsumfang:
  - **Pakete:** `next` `15.0.4` → `16.2.4`, `react` / `react-dom`
    `19.0.0` → `19.2.5`, `@types/react` `19.0.2` → `19.2.14`,
    `@types/react-dom` `19.0.2` → `19.2.3`, `eslint-config-next`
    `15.0.4` → `16.2.4`, `eslint` `8.57.1` → `9.39.4` (Peer-Dep
    von `eslint-config-next@16` erzwingt ESLint 9; Variante Z2
    am 2026-04-30 freigegeben), neu `@eslint/eslintrc@3.3.5` und
    `@eslint/js@9.39.0`.
  - **Lint-Toolchain:** `next lint`-Subcommand ist in 16 entfernt;
    `package.json`-Skripte umgestellt auf `eslint .`. Legacy
    [`.eslintrc.json`](frontend/.eslintrc.json) durch
    [`eslint.config.mjs`](frontend/eslint.config.mjs) ersetzt
    (Flat Config, native Imports aus `eslint-config-next/core-web-vitals`
    und `eslint-config-next/typescript` — kein FlatCompat nötig).
    Drei in 16 neu aktivierte React-19-Regeln explizit auf `"off"`
    gepinnt (`react-hooks/set-state-in-effect`, `react-hooks/refs`,
    `react/display-name`); Code-Quality-Sweep dafür ist eigener
    Folgeschritt nach M8 (siehe ADR-047 §Folge-Arbeit).
  - **`middleware.ts` → `proxy.ts`:** `frontend/src/middleware.ts`
    umbenannt zu `frontend/src/proxy.ts`, named export
    `middleware` → `proxy`.
    [`tests/middleware.test.ts`](frontend/tests/middleware.test.ts)
    umbenannt zu
    [`tests/proxy.test.ts`](frontend/tests/proxy.test.ts) mit
    angepasstem Import-Pfad. Edge-runtime nicht im Einsatz —
    `nodejs`-Runtime von `proxy` ist vertragsgemäß. Build bestätigt
    Erkennung via Output-Zeile `ƒ Proxy (Middleware)`.
  - **CSS-Reihenfolge:**
    [`src/styles/globals.css`](frontend/src/styles/globals.css):
    `@import "maplibre-gl/dist/maplibre-gl.css"` an den Anfang
    verschoben — Turbopack-CSS-Parser ist strenger als Webpack
    (`@import` muss vor allen anderen Regeln stehen).
  - **`tsconfig.json`:** Next-16-Build-Hook hat `jsx: "preserve"`
    → `jsx: "react-jsx"` aktualisiert (mandatory) und
    `.next/dev/types/**/*.ts` zu `include` hinzugefügt (durch
    Next-16 dev/build-Verzeichnistrennung).
  - **README:** Versions-Badge Next.js 15 → 16.
  - **Verifikation:** `pnpm typecheck`, `pnpm lint`, `pnpm test`
    (261/261), `pnpm build` (Turbopack, 16 Routen + Proxy,
    kompiliert in 2.6s) clean. Browser-Smoke (preview_start
    frontend) bestätigt: „outdated"-Banner verschwunden, Header
    zeigt 16.2.4 Turbopack, Server `Ready in 220ms` (vorher 1863ms).
  - **Bekannte Folgewarnung:** React 19.2 emittiert in
    `<ThemeProvider>` (next-themes@0.4.6) eine Console-Warnung
    über `<script>`-Tag-Rendering; Library-bedingt, latest
    verfügbar, Folgeschritt im ADR §Folge-Arbeit dokumentiert.
  - **Blocker #001 Punkt 1 gelöst** (Punkte 2 und 3 bleiben
    aktiv): CLAUDE.md-Methodik-Härtung gegen künftigen Drift,
    Audit-Ausweitung Backend / Container / Runtimes inklusive
    `engines: ">=22 <23"`-Pin in
    [`frontend/package.json`](frontend/package.json).

### Added

- **M7.5 Followups — Edit-Form-Restraint-Picker + Position-Picker (ADR-046 Followup-Sektion):**
  Direkte Anschluss-Arbeit an M7.5 in derselben Session. Beides war
  in M7.5 explizit aus Scope (ADR-046 §H, ADR-040 §K), wird jetzt
  produktiv.
  - **FU1 — Restraint-Picker im Edit-Form**:
    [`event-edit-form.tsx`](frontend/src/components/event/event-edit-form.tsx)
    bekommt pro Application-Row die `<RestraintPicker>`-Komponente
    mit Diff-Patch. `restraintTypeIds` + `initial.restraintTypeIds`
    Snapshot; Patch enthält `restraint_type_ids` nur, wenn das Set
    sich gegenüber dem Initial-Stand unterscheidet (set-equals).
    RxDB `doc.patch` triggert Sync-Push, Set-Replace-LWW im Backend
    (M7.5-ADR-046 §C) gilt unverändert.
  - **FU2 — Generischer LookupPicker (Single-Select) für ArmPosition / HandPosition / HandOrientation**:
    Neue Komponente
    [`<LookupPicker>`](frontend/src/components/catalog/lookup-picker.tsx)
    (Schwester der `<RestraintPicker>`): Single-Select mit „— keine —"-
    Option und inline Quick-Propose. Eingehängt in
    [`<ApplicationStartSheet>`](frontend/src/components/event/application-start-sheet.tsx)
    (Live, 3-Spalten-Grid unter Restraints), in
    [`<EventBackfillForm>`](frontend/src/components/event/event-backfill-form.tsx)
    (pro Row) und in
    [`<EventEditForm>`](frontend/src/components/event/event-edit-form.tsx)
    (pro Row mit Diff-Patch je FK). Damit hebt sich die
    ADR-040-§K-Beschränkung auf — der Scope-Cut war nur UI-seitig,
    Backend-LWW war von Anfang an dafür ausgelegt.
  - **Backend-Sicherheitsfix**:
    `_apply_application_update` (Update-Path in
    [`backend/app/sync/services.py`](backend/app/sync/services.py))
    übernahm Position-FKs ohne Approved-Check. Mit dem neuen
    Edit-Picker wäre das ein Editor-Exposure geworden (Editor sieht
    via RLS eigene pending Position-FKs; Push hätte sie auf eine
    bestehende Application setzen können). Neuer
    `_position_fks_allowed`-Helper extrahiert die existierende
    Insert-Path-Logik und wird jetzt auf beiden Pfaden aufgerufen
    (Konflikt-Tombstone-Antwort bei pending/unbekannten FKs).
  - **Tests**: Backend-Suite 181 → 182 (+1
    [`test_editor_update_with_pending_arm_position_returns_conflict`](backend/tests/test_sync_application_restraints.py)),
    Frontend-Suite 252 → 261 (+8
    [`tests/lookup-picker.test.tsx`](frontend/tests/lookup-picker.test.tsx),
    +3 in
    [`tests/event-edit-form.test.tsx`](frontend/tests/event-edit-form.test.tsx)
    für Restraint-Set-Diff, No-Change-Skip und Position-FK-Diff;
    `tests/event-backfill-form.test.tsx` mocked `<LookupPicker>`).
    Lint, Typecheck, `next build` clean.
  - **Browser-E2E** (Admin gegen echtes Backend + Postgres) bestätigt:
    Backfill-Application-Row zeigt 1 RestraintPicker + 3 LookupPicker;
    Arm-Select listet 8 Seeds + „— keine —"; Sync-Roundtrip persistiert
    `arm_position_id` + `hand_position_id` korrekt; Edit-Form lädt
    Picker mit pre-populated Werten aus dem RxDB-Doc.

- **M7.5 — Restraint-Picker in Application-Erfassung (ADR-043 §D, ADR-046):**
  Live-Modus + Backfill bekommen einen Multi-Select-Picker für
  approved RestraintTypes mit Typeahead-Filter und einer inline
  Quick-Propose-Mini-Form. Editor-Vorschlag landet als pending,
  Admin-Submit auto-approved und auto-selektiert (M7.3-Auto-Approve
  reused).
  - Neue Komponente
    [`<RestraintPicker>`](frontend/src/components/catalog/restraint-picker.tsx)
    teilt sich den `useCatalogList("restraint-types", { status: "approved" })`-
    Cache mit der Catalog-Verwaltung. Filtert client-seitig zusätzlich auf
    approved (eigene pending würden via Sync-Push 409'en).
  - Integriert in
    [`<ApplicationStartSheet>`](frontend/src/components/event/application-start-sheet.tsx)
    (Live) und
    [`<EventBackfillForm>`](frontend/src/components/event/event-backfill-form.tsx)
    (pro Application-Row); Auswahl wird zusammen mit dem Application-
    Insert in RxDB gespeichert und über den Sync-Push zum Server
    transportiert.
  - Application-Detail (`EventDetailView` →
    [`ApplicationsTimeline`](frontend/src/components/event/event-detail-view.tsx))
    zeigt die Restraints pro Application als Badge unter dem Status.
  - **Sync-Vertrag erweitert (ADR-046):**
    `ApplicationDoc.restraint_type_ids: uuid[]` in
    [`application.schema.json`](frontend/src/lib/rxdb/schemas/application.schema.json)
    (v0 → v1, Migration-Strategy `restraint_type_ids = []`) und
    [`backend/app/sync/schemas.py`](backend/app/sync/schemas.py).
    `RxDBMigrationSchemaPlugin` registriert in
    [`lib/rxdb/database.ts`](frontend/src/lib/rxdb/database.ts).
    Pull macht eine Bulk-IN-Query auf `application_restraint`,
    Push diff't das Set (LWW Set-Replace), Konflikt-Antworten
    enthalten das Server-Set; Editor-Push mit non-approved
    RestraintType-IDs → Konflikt (Synthetic-Tombstone).
  - Tests: Backend-Suite 174 → 181 (+7
    [`test_sync_application_restraints.py`](backend/tests/test_sync_application_restraints.py)),
    Frontend-Suite 244 → 252 (+8
    [`tests/restraint-picker.test.tsx`](frontend/tests/restraint-picker.test.tsx)).
    `test_rxdb_schema_drift.py` bleibt grün.
  - Out of Scope für M7.5: Edit-Form-Restraint-Picker
    (`event-edit-form.tsx`) und Position-Picker — beide bleiben als
    M5c.4-Followups nach M7.5 offen (siehe ADR-046 §H).

- **M7.4 — Freigabe-Queue + Editor-Withdraw (ADR-043 §A/§C, ADR-045):**
  Auf `/admin/catalogs/[kind]` haben pending-Vorschläge jetzt
  Workflow-Buttons direkt in der Tabelle. Admin kann **Freigeben**
  (POST `/<kind>/<id>/approve`) und **Ablehnen** (POST
  `/<kind>/<id>/reject` mit Pflicht-Begründung über einen Modal-Dialog).
  Editor sieht **Zurückziehen** auf eigenen pending-Rows
  (DELETE `/<kind>/<id>`); abgelehnte eigene Vorschläge bleiben
  read-only sichtbar mit Begründung. Backend-Endpoints aus M7.1
  unverändert; reine Frontend-Erweiterung.
  - Neue Mutation-Hooks `useApproveCatalogEntry`,
    `useRejectCatalogEntry`, `useWithdrawCatalogEntry` in
    [`lib/catalog/api.ts`](frontend/src/lib/catalog/api.ts).
  - Neues UI-Primitive [`<Dialog>`](frontend/src/components/ui/dialog.tsx)
    (shadcn-Stil über `@radix-ui/react-dialog`) und
    [`<RejectReasonDialog>`](frontend/src/components/catalog/reject-reason-dialog.tsx)
    mit Submit-only-Validation.
  - `<CatalogTable>` von Boolean-`canEdit` auf Render-Prop
    `renderRowActions` umgebaut; `<CatalogListing>` von
    `isAdmin: boolean` auf `currentUser: { id, role }` umgestellt
    (für Editor-Eigentümer-Prüfung beim Withdraw).
  - Tests: Frontend-Suite 230 → 244 (+14, davon 7 für die Action-Flows
    und 7 für den Dialog inkl. Regression-Guard gegen den Radix-Focus-
    Inline-Error-Flash, siehe ADR-045 §B).

### Fixed

- **HOTFIX-002 — Karten-DoD-Härtung (ADR-044):**
  Marker, Cluster und Cluster-Count-Beschriftungen rendern jetzt
  produktiv. Aufgedeckt beim ersten Browser-Test mit gesetztem
  `HCMAP_MAPTILER_API_KEY` (HOTFIX-001-Folge). Zwei orthogonale Bugs:
  - **Glyph-Bug (M6.3):** Cluster-Count-Layer nutzt `text-field`, der
    Style hatte aber kein `glyphs`. MapLibre wirft im DEV-Modus bei
    `addLayer`, kein Marker-Layer wird angehängt → keine Marker.
    *Fix:* Neuer Backend-Endpoint
    [`/api/glyphs/{fontstack}/{rangespec}`](backend/app/routes/glyphs.py)
    (analog zum Tile-Proxy, gleicher MapTiler-Key, 7-Tage-Cache).
    Frontend setzt `glyphs` in
    [`lib/map/style.ts`](frontend/src/lib/map/style.ts) auf
    `/api/glyphs/{fontstack}/{range}.pbf`. Override per
    `NEXT_PUBLIC_GLYPHS_URL`.
  - **RxDB-v17-Strict-Checks (M5b.3):** v17 erzwingt im DEV-Modus
    Schema-Validator-Wrapper (DVM1), `maxLength` auf indexed
    string-Fields (SC34) und `multipleOf` auf indexed integer-Fields
    (SC35). Unsere Setup erfüllte keine. Folge: `addCollections` wirft,
    `useDatabase()` bleibt `null`, Marker werden nie gerendert.
    Sync-Pill blieb grün (Default-State).
    *Fix:*
    - [`lib/rxdb/database.ts`](frontend/src/lib/rxdb/database.ts):
      Dexie-Storage mit `wrappedValidateAjvStorage` aus
      `rxdb/plugins/validate-ajv` wrappen — nur in DEV-Mode (Prod
      bleibt nackt).
    - Schemas
      ([event](frontend/src/lib/rxdb/schemas/event.schema.json),
      [application](frontend/src/lib/rxdb/schemas/application.schema.json),
      [event_participant](frontend/src/lib/rxdb/schemas/event_participant.schema.json)):
      `maxLength: 32` für indexed `started_at` / `updated_at`,
      `maxLength: 36` für indexed `event_id`, `multipleOf: 1` +
      `maximum: 1_000_000` für `sequence_no`.
    - [`lib/rxdb/replication.ts`](frontend/src/lib/rxdb/replication.ts):
      `waitForLeadership: false` (HMR-Cycles haben Leader-Election
      gehängt; Pfad-A verträgt parallele Pulls).
    - [`lib/rxdb/provider.tsx`](frontend/src/lib/rxdb/provider.tsx):
      catch-Block loggt jetzt sichtbar `console.warn` —
      Defense-in-Depth gegen das stille Init-Fail-Pattern.
  - **Frontend-Suite 230/230, Backend-Suite 174/174, Drift-Test 9/9
    grün.** Lint/Typecheck/Build clean.
  - **Browser-Verifikation:** 12 seed events → 1 Cluster „7" über
    Berlin-Mitte + Einzel-Marker Kreuzberg + Marker für München /
    Hamburg / Köln / Frankfurt im Out-of-View-Bereich. IndexedDB
    enthält `rxdb-dexie-hcmap--0--{events,applications,event_participants}`
    plus drei Replication-Meta-DBs. Drei `/api/sync/*/pull`-Requests
    im Network.

- **HOTFIX-001 — Sonner-Toasts unter React 19 wieder sichtbar (ADR-042):**
  Toasts (`toast.error`, `toast.success` aus `sonner`) wurden im Browser
  nicht angezeigt — der `<Toaster />`-Container in
  [providers.tsx](frontend/src/components/providers.tsx) blieb als leeres
  `<section aria-label="Notifications alt+T">` ohne den inneren
  `<ol data-sonner-toaster>`-Child stehen. Ursache: `sonner@^1.7.4`
  ist nicht React-19-kompatibel; der `useLayoutEffect(setMounted(true))`-
  Branch von Sonner v1 mountet unter React 19 nicht zuverlässig.
  - `frontend/package.json`: `sonner` `^1.7.4` → `^2.0.7` (offizielle
    React-19-Unterstützung ab v2.x).
  - Toaster-Wrapper [components/ui/sonner.tsx](frontend/src/components/ui/sonner.tsx)
    und Provider [components/providers.tsx](frontend/src/components/providers.tsx)
    bleiben unverändert — die in v1 genutzten Props (`richColors`,
    `closeButton`, `position`, `theme`, `toastOptions.classNames`) sind in
    v2 erhalten.
  - Frontend-Tests bleiben grün (194/194); alle bestehenden
    `vi.mock("sonner", …)`-Mocks tragen unverändert.
  - Browser-Verifikation Login-Fail-Pfad: `/login` mit ungültigem
    Passwort → Toast „Login fehlgeschlagen — E-Mail oder Passwort
    ungültig." mit Close-Button erscheint. Verifikations-Scope siehe
    `docs/fahrplan.md` HOTFIX-001 (eingeloggte Toast-Sites bleiben für
    Re-Verify in nächster Session).
  - ADR-042 dokumentiert das Upgrade samt Lessons Learned: künftige
    Frontend-Library-ADRs prüfen explizit React-Major-Kompatibilität,
    Komponenten mit gemocktem Mount-Verhalten erhalten Browser-Smoke
    als DoD-Bestandteil.

### Added

- **M7.3 — CRUD-Formulare + Admin-Auto-Approve (ADR-043 §F):**
  Anlegen und Bearbeiten von Katalog-Einträgen inklusive Admin-
  Direktfreigabe und Editor-Vorschlag.
  - **Backend** (`app/services/catalog.py` + `app/routes/catalog.py`):
    - `propose_lookup` / `propose_restraint_type` akzeptieren
      `auto_approve: bool`. Bei `True` (Admin) wird `status='approved'`
      und `approved_by=user.id` direkt gesetzt — kein zweiter
      Approve-Schritt mehr. Editor bleibt bei `status='pending'`.
    - +2 Tests in
      [`tests/test_catalog_workflow.py`](backend/tests/test_catalog_workflow.py).
    - Backend-Suite 172 → 174 grün.
  - **Frontend-Routes:**
    - `/admin/catalogs/[kind]/new` (admin+editor, Server-Component
      mit `notFound()`-Schutz).
    - `/admin/catalogs/[kind]/[id]/edit` (admin-only,
      Server-Redirect für Editor zusätzlich zur RLS-Sperre).
  - **Mutation-Hooks** in
    [`lib/catalog/api.ts`](frontend/src/lib/catalog/api.ts):
    - `useCreateCatalogEntry<K>` / `useUpdateCatalogEntry<K>` mit
      Cache-Invalidation `["catalog", kind]`.
    - `useCatalogEntry<K>` für Einzel-Lookup via Liste
      (Pfad-A-Datenmenge < 200 Rows).
    - Generische Payload-Typen pro `kind`.
  - **Form-Komponenten** (`components/catalog/`):
    - `lookup-form.tsx` — Form für ArmPosition / HandPosition /
      HandOrientation (Name + Beschreibung).
    - `restraint-type-form.tsx` — Form für RestraintType (Kategorie,
      Brand, Modell, Mechanik, Display-Name, Note) mit Selects aus
      Enum-Maps.
    - `catalog-form-page.tsx` — Wrapper, lädt Edit-Eintrag via
      `useCatalogEntry`, rendert je nach `kind` die richtige Form.
    - `describeMutationError`-Helper mit ApiError-Status-Mapping
      (409 → „Eintrag existiert bereits", 403, 422). Duck-Type-
      Fallback `asApiError` für RSC-Modul-Split-Robustheit.
  - **Listing-Integration:**
    - `<CatalogListing>` rendert „Neuer Eintrag" (Admin) / „Neuen
      Vorschlag einreichen" (Editor); `<CatalogTable>` zeigt Edit-
      Links pro Row nur bei `canEdit=true`.
  - **Tests:** +11 Frontend (Frontend-Suite 219 → 230 grün).
    - [`tests/catalog-forms.test.tsx`](frontend/tests/catalog-forms.test.tsx):
      8 Cases (Lookup-Create-Body, 409-Toast, Leer-Validation,
      Editor-Button-Label, Lookup-Edit, RestraintType-Render +
      Create-Body + Edit-PATCH).
    - +2 Cases in `catalog-table.test.tsx` (canEdit-Toggle).
    - +1 Case in `catalog-listing.test.tsx` (Admin/Editor-Button-
      Label).
  - **Verifikation:** Lint/Typecheck/Build clean
    (`/admin/catalogs/[kind]/new` 142 kB, `[id]/edit` 142 kB).
    Browser-E2E gegen echtes Backend + DB:
    - Admin-Create eines Restraint-Types → 201 mit `status="approved"`
      direkt im Listing (Auto-Approve verifiziert).
    - Edit-Submit → 200, Listing zeigt geänderten Display-Name.
    - Konflikt: Re-POST gleicher (category, brand, model)-Kombi →
      Backend 409 + Klartext-Detail; `describeMutationError`-catch-
      Block läuft mit Toast-Render (`<ol data-sonner-toaster>` aktiv
      seit HOTFIX-001 / ADR-042).

- **M7.2 — Frontend Catalog-Übersicht `/admin/catalogs` (ADR-043 §F):**
  Erste Read-Only-UI für die vier Katalog-Typen, baut auf den
  M7.1-Backend-Endpunkten auf.
  - **Routing:**
    - `/admin/catalogs` (Server-Redirect → `/admin/catalogs/restraint-types`).
    - `/admin/catalogs/[kind]` mit `notFound()` für unbekannte
      `[kind]`-Werte (Server-Component, akzeptiert
      `Promise<{ kind: string }>` per Next.js 15-Konvention).
    - **Route-Group-Refactor**: `admin/layout.tsx` lockert auf
      Mindestrolle Editor (Editoren brauchen Zugriff für eigene
      Vorschläge); strikter Admin-Schutz wandert in
      `admin/(admin-only)/layout.tsx`. Bestehende `admin/page.tsx`
      per `git mv` in die Sub-Group verschoben — externe URLs
      bleiben gleich.
  - **RBAC** (`lib/rbac.ts`): vier neue Helper —
    `canApproveCatalog`, `canEditCatalogEntry`,
    `canWithdrawCatalogEntry`, `canViewCatalogAdmin`. Pure functions,
    spiegeln M7.1-Backend-Logik exakt (Withdraw nur für `pending`,
    Editor nur eigene; Approve/Patch admin-only).
  - **Daten-Layer** (`lib/catalog/`): `types.ts` mit allen Enums,
    Type-Guards (`isRestraintTypeEntry`) und Display-Labels;
    `api.ts` mit `useCatalogList`-Hook (TanStack-Query, `staleTime:
    5 min`, Cache-Key `["catalog", kind, params]`). Catalog-Daten
    werden bewusst NICHT in RxDB synchronisiert (ADR-043 §E).
  - **Komponenten** (`components/catalog/`):
    - `kind-tabs.tsx` — Tab-Navigation für 4 Katalog-Typen mit
      `aria-current="page"`.
    - `status-filter.tsx` — Radio-Group „Alle / Freigegeben /
      Vorgeschlagen / Abgelehnt" mit `aria-checked`.
    - `status-badge.tsx` — farb-codierter Badge pro Status
      (emerald/amber/rose im Light + Dark Mode).
    - `catalog-table.tsx` — Tabelle mit Subtitle (Restraint:
      Kategorie · Brand · Model · Mechanik; Lookups: Description),
      Reject-Reason-Callout für rejected-Rows, Loading- und
      Empty-States.
    - `catalog-listing.tsx` — Client-Wrapper, liest `?status=` aus
      URL, schreibt URL via `router.replace({ scroll: false })`,
      forwarded an `useCatalogList`. Pure Helper
      `parseStatusParam` separat exportiert.
  - **Navigation** (`components/layout/nav.ts`): Nav-Eintrag
    „Kataloge" mit Icon `BookMarked`, sichtbar für admin und
    editor.
  - **Tests:** +25 Cases.
    - [`tests/rbac-catalog.test.ts`](frontend/tests/rbac-catalog.test.ts)
      — 7 Cases pro RBAC-Helper.
    - [`tests/catalog-kind-tabs.test.tsx`](frontend/tests/catalog-kind-tabs.test.tsx)
      — 2 Cases.
    - [`tests/catalog-status-filter.test.tsx`](frontend/tests/catalog-status-filter.test.tsx)
      — 3 Cases.
    - [`tests/catalog-table.test.tsx`](frontend/tests/catalog-table.test.tsx)
      — 5 Cases (Render-Zweige + data-status-Attribut).
    - [`tests/catalog-listing.test.tsx`](frontend/tests/catalog-listing.test.tsx)
      — 8 Cases (parseStatusParam, fetch-Aufruf, URL-Write/Clear,
      Error-Alert, Loading, Render).
  - **Frontend-Suite:** 219/219 grün (+25). Lint/Typecheck/Build
    clean.
  - **End-to-End-Verifikation** im Browser gegen echtes Backend +
    DB:
    - Admin sieht alle Einträge inkl. fremder pending.
    - Editor sieht approved + eigene pending/rejected (admin's
      pending durch RLS verborgen).
    - Viewer wird von `/admin/catalogs` auf `/` umgeleitet; Nav-
      Eintrag „Kataloge" für Viewer nicht sichtbar.
    - Status-Filter setzt/entfernt URL-Parameter, Tab-Navigation
      wechselt Katalog-Typ, rejected-Rows zeigen Begründung.
    - Console clean.

- **M7.1 — Backend Catalog-Workflow (ADR-043):**
  Vollständiger Reject-/Withdraw-Workflow auf den vier Katalog-Tabellen
  (RestraintType, ArmPosition, HandPosition, HandOrientation).
  - **Migration
    [`20260428_1200_m7_1_catalog_workflow.py`](backend/migrations/versions/20260428_1200_m7_1_catalog_workflow.py):**
    - Neuer Enum-Wert `catalog_status = 'rejected'` (über
      `op.get_context().autocommit_block()`, weil Postgres den neuen
      Wert in derselben Migration sonst nicht in einer Policy
      verwenden lässt).
    - Drei neue Audit-Spalten pro Tabelle: `rejected_by`,
      `rejected_at`, `reject_reason`.
    - RLS-Policy `<table>_select` erweitert: eigene `pending` **und**
      `rejected` sind für den vorschlagenden Editor sichtbar (mit
      Begründung).
    - Neue RLS-Policy `<table>_owner_withdraw` (`FOR DELETE`): Editor
      darf eigene `pending`-Vorschläge zurückziehen; alles andere
      bleibt admin-only über `<table>_admin_modify`.
    - Down-Migration ist round-trippable (Up/Down/Up/Down/Up
      verifiziert) — Postgres kann keinen Enum-Wert direkt droppen,
      daher Type-Swap über parallel angelegtes `catalog_status_v1`.
  - **Endpunkte:** Pro Katalog-Typ (`/api/restraint-types`,
    `/api/arm-positions`, `/api/hand-positions`,
    `/api/hand-orientations`):
    - `GET /<kind>?status=approved|pending|rejected` — optionaler
      Filter; Sichtbarkeit weiterhin via RLS.
    - `PATCH /<kind>/{id}` — Admin-Update aller Felder; UNIQUE-Konflikt
      → 409 mit Klartext. **Status wird nicht akzeptiert** — Übergänge
      laufen ausschließlich über die dedizierten Endpunkte.
    - `DELETE /<kind>/{id}` — Hard-Delete eines `pending`-Vorschlags.
      Editor kann nur eigene zurückziehen; Admin jeden pending. Andere
      Stati → 409.
    - `POST /<kind>/{id}/reject` — pending → rejected; Body
      `{ "reason": str (1..2000) }` Pflicht; setzt `rejected_by`,
      `rejected_at`, `reject_reason`.
  - **Frontend-Strategie (ADR-043 §E):** Katalog-Daten werden bewusst
    nicht in RxDB synchronisiert; Frontend (M7.2 ff.) liest sie via
    TanStack-Query mit `staleTime: 5 min` und Cache-Key
    `['catalog', kind, { status }]`.
  - **Tests:** +22 Cases.
    - Neue Datei
      [`tests/test_catalog_workflow.py`](backend/tests/test_catalog_workflow.py):
      17 Cases — Reject (Admin/Editor/leere Reason/already-approved),
      Withdraw (eigene/fremde/rejected/admin-any/already-approved),
      Admin-PATCH (Lookup + RestraintType all-fields, UNIQUE-409,
      Editor-403), Status-Filter, eigene-rejected-sichtbar,
      foreign-rejected-versteckt.
    - [`tests/test_rls.py`](backend/tests/test_rls.py): +5 Cases —
      Editor sieht eigene rejected, Viewer nicht; Editor kann eigene
      pending via DELETE entfernen, fremde nicht, eigene rejected
      ebenfalls nicht (Owner-Withdraw-Policy filtert auf `pending`).
  - **Backend-Suite:** 172/172 grün (+22 seit M6). `ruff check` und
    `mypy --strict` für `app/services/catalog.py`, `app/routes/catalog.py`,
    `app/schemas/catalog.py`, `app/models/catalog.py` clean.
  - **Architektur-Doku-Drift behoben:** API-Tabelle in `architecture.md`
    zeigt jetzt die tatsächlichen Endpoint-Pfade (`/api/<kind>`)
    statt der ursprünglich geplanten Sammelroute `/api/catalogs/{kind}`,
    plus die neue Route-Form (DELETE/Reject) und RxDB-Hinweis.

- **M6.5 — Geocoding-Suchbox in `MapView` (ADR-041 §J):**
  Letzter M6-Sub-Step. Adress-Eingabe oben links, fliegt die Karte
  an. **M6 vollständig abgeschlossen.**
  - Neue Komponente
    [components/map/geocode-search-box.tsx](frontend/src/components/map/geocode-search-box.tsx):
    - Debounce 300 ms, Mindestlänge 2 Zeichen.
    - `GET /api/geocode?q=…&proximity=<lat>,<lon>&limit=5` über
      `apiFetch` (M6.1-Endpoint).
    - Optionaler `getProximity`-Callback liefert die aktuelle
      Viewport-Mitte als Bias; Stale-Response-Filter via
      `requestSeq`-Ref (späte Antworten werden verworfen).
    - Treffer-Dropdown mit `place_name`; Auswahl ruft
      `onSelect(lat, lon)` und schließt das Dropdown.
    - Fehler-Toast-Mapping über `ApiError.status`:
      - 429 → „Geocoding-Limit erreicht"
      - 503 → „Adress-Suche nicht konfiguriert"
      - 502 → „Adress-Suche nicht erreichbar"
      - sonst → generische Fehlermeldung
      In jedem Fall funktioniert die Karte weiter.
    - X-Button leert die Eingabe.
  - **`MapView`-Integration**:
    - `mapRef.current.flyTo({ center: [lon, lat], zoom: 14 })` bei
      Treffer-Auswahl; Viewport-Update wird zusätzlich in den
      debounced URL-Write geschoben, damit die geflogene Position
      teilbar bleibt.
    - SearchBox + Filter-Toggle teilen sich einen
      Top-Left-Container (`flex flex-col gap-2 sm:flex-row`).
    - `getProximity` liefert den aktuellen `viewportRef`-Stand
      (oder `null`, wenn weder URL noch Pan/Zoom je etwas gesetzt
      haben).
  - **Tests:** +13 Cases —
    - 10 in
      [geocode-search-box.test.tsx](frontend/tests/geocode-search-box.test.tsx):
      Mindestlänge, Debounce auf finalen Wert (echte Timer +
      `waitFor`), Proximity-Forwarding mit `lat,lon`-Encoding,
      Treffer-Auswahl, Empty-Hint, je ein Toast-Test für 429 / 503
      / 502, X-Clear, Stale-Response-Drop.
    - 3 zusätzliche in `map-view.test.tsx`: flyTo bei Treffer-Klick
      (Map-Mock mit `forwardRef` + `useImperativeHandle` für
      `flyTo`), Proximity-Forwarding aus URL-Viewport, `null`-
      Proximity ohne URL-Viewport.
  - **Frontend-Suite:** 194/194 grün (+13), Lint/Typecheck clean.
  - Production-Build grün, `/map` 13.7 kB / 252 kB First Load
    (+1.4 kB).
  - **M6 Gesamtbilanz:** 5 Sub-Steps, 1 Backend-Endpoint, 8 neue
    Frontend-Module, **77 neue Tests** seit M5c (Backend-Suite
    150/150, Frontend-Suite 194/194), Coverage `lib/map/**`
    99.12 % Lines / 93.1 % Branches.

- **M6.4 — Filter (Zeitraum, Beteiligte) + URL-Viewport-Sync (ADR-041 §H/§I):**
  Karte teilbar per Link, Filter wirken sofort.
  - **URL-State-Codec**
    [lib/map/url-state.ts](frontend/src/lib/map/url-state.ts):
    `parseMapUrlState` / `serializeMapUrlState` für `lat`/`lon`/`zoom`/
    `from`/`to`/`p`-Komma-UUIDs. Out-of-Range / malformierte Inputs
    werden silent verworfen (geteilte URLs sollen nicht crashen).
    `filtersEqual`-Vergleich für Skip-Logik.
  - **Filter-Logik**
    [lib/map/event-filter.ts](frontend/src/lib/map/event-filter.ts):
    `applyEventFilter` wendet Datumsbereich (UTC-Tagesgrenzen,
    inklusiv) und Beteiligte (OR-Verknüpfung) auf
    `MappableEvent[]` an. `buildParticipantsIndex` baut aus
    RxDB-`event_participants` einen `Map<event_id, Set<person_id>>`.
    `filtersAreEmpty`-Helper für UI-Status.
  - **`MapFilterPanel`**
    [components/map/map-filter-panel.tsx](frontend/src/components/map/map-filter-panel.tsx):
    `Sheet`-Drawer rechts mit zwei `<input type="date">` und
    Personen-Multi-Select. Personen kommen aus dem bestehenden REST
    `/api/persons` (TanStack Query, `enabled: open`, `staleTime`
    60 s) — RxDB synct keine Persons (ADR-037), das ist die
    bewusste Online-Abhängigkeit der Filter-UI; Karte selbst
    funktioniert weiter, wenn der Endpoint nicht erreichbar ist.
  - **`MapView`-Integration**:
    - Initial-Viewport + Filter werden aus `useSearchParams` gelesen.
    - Pan/Zoom (`onMoveEnd`) triggert debounced
      `router.replace({ scroll: false })` (300 ms,
      `URL_DEBOUNCE_MS`).
    - Filter-Änderungen aus dem Panel schreiben sofort in die URL.
    - URL-Änderungen von außen (Browser-Back/Forward) propagieren
      über `useSearchParams` zurück in den Filter-State.
    - `event_participants`-RxDB-Subscription (Selector
      `_deleted=false`) feeds the participants index für den Filter.
    - Status-Bar zeigt „X von Y Events (gefiltert)" wenn Filter
      aktiv, sonst „X Events sichtbar".
    - Filter-Toggle-Button oben links färbt sich primary, wenn
      Filter aktiv.
  - **Tests:** +46 Cases —
    - 18 für URL-State-Codec
      ([map-url-state.test.ts](frontend/tests/map-url-state.test.ts)):
      Parse / Drop von Out-of-Range-Werten, ISO-Date-Validierung,
      UUID-Validierung + Lowercasing, Round-Trip, `filtersEqual`.
    - 14 für Filter-Logik
      ([map-event-filter.test.ts](frontend/tests/map-event-filter.test.ts)):
      `from`/`to`-Inklusivität, AND-Verknüpfung Datum + Personen,
      OR über mehrere Personen, Tombstone-Filter im Index.
    - 9 für FilterPanel
      ([map-filter-panel.test.tsx](frontend/tests/map-filter-panel.test.tsx)):
      Lazy-Load (kein Fetch wenn `open=false`), Datum-Edits,
      Toggle/Untoggle Personen, Search-Filter, Reset, Close.
    - 5 zusätzliche in `map-view.test.tsx`: URL-Viewport-Seed,
      Default-Center, Filter-Seed aus URL, Filter-Anwendung,
      debounced URL-Write (Fake-Timers, kollabierte Bewegungen).
  - **Coverage `lib/map/**`:** **99.12 % Lines / 93.1 % Branches**
    (vorher 97.89 / 85.71). `event-filter.ts` und `url-state.ts`
    laufen je 100 % Lines.
  - **Frontend-Suite:** 181/181 grün (+46), Lint/Typecheck clean,
    Production-Build grün (`/map` 12.3 kB / 242 kB First Load,
    +0.8 kB).

- **M6.3 — Native MapLibre-Cluster im `MapView` (ADR-041 §C):**
  Clustering ohne `supercluster`-Dependency.
  - **Refactor [components/map/map-view.tsx](frontend/src/components/map/map-view.tsx):**
    Per-Event-Marker-Schleife wird durch eine GeoJSON-`Source`
    (`cluster: true`, `clusterRadius=50`, `clusterMaxZoom=14`) mit
    drei Layern ersetzt:
    - `events-clusters` — Kreis-Layer mit Step-Expression auf
      `point_count` (Farbe + Radius staffeln nach 10 / 30 Punkten).
    - `events-cluster-count` — Symbol-Layer mit
      `point_count_abbreviated` (weiße Zahl auf Kreis).
    - `events-unclustered` — Kreis-Layer für einzelne Events.
  - **Click-Handler:** `interactiveLayerIds = ['events-clusters',
    'events-unclustered']`. Cluster-Klick ruft
    `getClusterExpansionZoom(cluster_id)` und `easeTo({ center, zoom })`.
    Unclustered-Klick liest `properties.id` und öffnet das Popup wie
    in M6.2.
  - **Neuer Pure-Helper `eventsToGeoJSON`** in
    [lib/map/event-marker-data.ts](frontend/src/lib/map/event-marker-data.ts):
    konvertiert `MappableEvent[]` in eine `FeatureCollection`.
    Verantwortlich für die Lat/Lon → `[lon, lat]` Konvention nach
    GeoJSON-Spec — der Flip findet hier und nur hier statt.
  - **Tests:** +8 Cases —
    - 5 für `eventsToGeoJSON` (leere Liste, Koordinaten-Flip,
      Property-Projektion, `null`-`ended_at`, Reihenfolge).
    - 3 zusätzliche in `map-view.test.tsx` (Source-Konfiguration mit
      Cluster-Flags + 3 Layer registriert; Cluster-Klick ruft
      `getClusterExpansionZoom` + `easeTo`; nicht-interaktive
      Features werden ignoriert).
    `react-map-gl/maplibre` wird komplett gestubbt
    (Map/Source/Layer/Popup/NavigationControl) — der `onClick` des
    Map-Mocks wird ausgelesen und im Test direkt mit synthetischen
    Features aufgerufen (jsdom hat kein WebGL, ADR-027 §J2-Pattern).
  - **Coverage `lib/map/**`:** **97.89 % Lines / 85.71 % Branches**
    (vorher 97.33 / 84.61).
  - **Frontend-Suite:** 135/135 grün (+8), Lint/Typecheck clean.
    Production-Build grün (`/map` 11.5 kB / 209 kB First Load,
    +1.4 kB für Cluster-Logic).

- **M6.2 — Frontend `MapView` (ADR-041 §E/§F/§G):**
  Vollbild-Karte unter `/map` zeigt alle sichtbaren Events als Marker.
  - Neue Komponente [components/map/map-view.tsx](frontend/src/components/map/map-view.tsx):
    abonniert RxDB-`events` live (Selector `_deleted=false`), filtert
    clientseitig auf gültige lat/lon-Range via `selectMappableEvents`,
    rendert pro Event einen `react-map-gl/Marker`. Marker-Klick öffnet
    `react-map-gl/Popup` mit `started_at` (lokal formatiert),
    Koordinaten, Live-/Beendet-Status und „Detailseite öffnen →"-Link.
    Status-Bar unten links zeigt die Marker-Anzahl.
  - **`lib/map/` Verzeichnis** statt `lib/map.ts`: `style.ts`
    (rasterTileStyle, DEFAULT_MAP_CENTER — unverändert),
    `event-marker-data.ts` (neue pure-Function-Helfer
    `selectMappableEvents` / `isMappableEvent`), `index.ts`
    re-exportiert; bestehende Importe `@/lib/map` bleiben kompatibel.
  - **Bewusste Scope-Reduktion gegenüber ADR-041 §G:**
    - Recipient-Name **nicht** im Popup. Persons werden per ADR-037
      nicht in RxDB synchronisiert, eine ADR-038-§F-konforme
      Maskierung wäre offline daher nicht zuverlässig — die Detail-
      seite enforced die Maskierung weiterhin.
    - Plus-Code-Anzeige verschoben — braucht
      `open-location-code`-Dependency, die als eigener
      freigabepflichtiger Schritt nachgezogen wird.
    - Beide Punkte sind im Fahrplan und im CHANGELOG explizit
      gekennzeichnet, keine stille Auslassung.
  - **Map-Page** [(protected)/map/page.tsx](frontend/src/app/(protected)/map/page.tsx):
    Card-Platzhalter durch `MapView` Vollbreite ersetzt.
  - **Tests:** 18 neue Cases —
    [event-marker-data.test.ts](frontend/tests/event-marker-data.test.ts)
    (10 Tests: Boundary-Validierung, Soft-Delete-Filter,
    Out-of-Range, Projektion, Reihenfolge) und
    [map-view.test.tsx](frontend/tests/map-view.test.tsx)
    (8 Tests: Marker-Count, Empty-State, Loading-State,
    Singular/Plural-Status, Popup-Open-Click, Live/Beendet-Anzeige,
    Popup-Close). `react-map-gl/maplibre` wird via `vi.mock`
    gestubbt (ADR-027 §J2-Pattern, jsdom hat kein WebGL).
  - **Coverage:** Threshold `lib/map/**` ≥ 70 % aktiv in
    `vitest.config.ts`; aktuell **97.33 % Lines / 84.61 % Branches**.
  - **Frontend-Suite:** 127/127 grün (+18), Lint/Typecheck clean.

- **M6.1 — Backend Geocoding-Proxy `GET /api/geocode` (ADR-041 §B/§D):**
  Erste Iteration für M6 (Kartenansicht). Frontend wird in M6.5
  konsumieren.
  - Neuer Endpoint `GET /api/geocode?q=…&proximity=lat,lon&limit=N`.
    Auth via `current_active_user` (Anonymous → 401), MapTiler-API-Key
    bleibt serverseitig. Antwort = MapTiler-GeoJSON-FeatureCollection
    1:1 durchgereicht.
  - **Validierung:** `q` 1–200 Zeichen, `limit` 1–10 (Default 5),
    `proximity` als `lat,lon` mit Range-Check (-90/90, -180/180);
    Verstöße → 422.
  - **Koordinaten-Übersetzung:** API erwartet projektkonform
    `proximity=<lat>,<lon>`, beim Upstream-Aufruf wird auf MapTilers
    `lon,lat`-Konvention umgedreht.
  - **Rate-Limit:** in-memory Token-Bucket pro `user.id`, rolling
    60 s, Default 30 req/min via `HCMAP_GEOCODE_RATE_PER_MINUTE`
    (`0` deaktiviert). Überschreitung → 429 mit `Retry-After`.
    Bewusst kein Redis (Single-Worker, <20 User, ADR-041 §D).
  - **Fehler-Modi (analog Tile-Proxy):** fehlender API-Key → 503,
    Upstream-Netzwerkfehler / 4xx / invalid JSON → 502.
  - **Cache-Control:** `private, max-age=300` (5 min) — Adressen sind
    nicht so flüchtig, Frontend debounced ohnehin.
  - **HTTPX-`AsyncClient` als Process-Singleton** via `lru_cache`,
    identisches Pattern wie Tile-Proxy; Tests injizieren einen Fake.
  - **Tests:** 13 Cases in `tests/test_geocode_proxy.py` —
    anonym/missing-key/Erfolg + Cache-Header/Proximity-Übersetzung/
    Proximity-422/Limit-422/leeres `q`-422/Upstream-Netzwerkfehler/
    Upstream-403/Upstream-Invalid-JSON/Rate-Limit-Block/
    Rate-Limit-deaktiviert/Rate-Limit-Window-Rollover. Backend-Suite
    gesamt **150/150 grün** (137 + 13), ruff/mypy clean.
  - **Architektur-Update:** `architecture.md` §Karten-Komponente:
    Clustering wechselt von `supercluster` auf native MapLibre-Cluster
    (ADR-041 §C). Pfad-A-Datenmenge < 5.000 Events; eine Dependency
    weniger.
  - **`.env.example`:** neue Variable `HCMAP_GEOCODE_RATE_PER_MINUTE=30`
    dokumentiert; Platzhalter-Eintrag `HCMAP_MAPTILER_GEOCODING_KEY`
    entfernt (Geocoding nutzt denselben `HCMAP_MAPTILER_API_KEY`).

- **M5c.4 — Edit-UI mit RxDB-Push, Soft-Delete und RBAC (ADR-040):**
  Schließt M5c. Mutationen laufen jetzt vollständig über RxDB-Push
  (ADR-036 §C); REST-PATCH-Endpoints aus M3 bleiben für SQLAdmin,
  Frontend nutzt sie nicht mehr.
  - **Eigene Route** `/events/[id]/edit` mit Server-Side-RBAC-Gate:
    - anonym → `/login?next=…`
    - Viewer → `/events/{id}` (Read-only)
    - Editor mit fremdem Event → `/events/{id}` (Read-only)
    - Admin und Editor mit eigenem Event → Edit-Form.
  - **`canEditEvent`-Helper** in `frontend/src/lib/rbac.ts`
    (reine Funktion, ADR-040 §B) ist die kanonische RBAC-Logik für
    beide Enforcement-Punkte (Server-Redirect der Edit-Page +
    UI-Conditional des Edit-Buttons in `EventDetailView`). Frontend
    ist UX-Hint; Backend-RLS hat das letzte Wort.
  - **`EventEditForm`-Komponente** (ADR-040 §F):
    - Lädt Event und Applications einmal aus RxDB beim Mount —
      keine Live-Subscription während der Edit-Session, damit
      gleichzeitige Sync-Pulls die Eingaben nicht clobbern.
    - Editierbare Felder folgen ADR-029-Conflict-Matrix (§C):
      Event `note` / `reveal_participants` / `ended_at` (FWW: nur
      setzbar wenn aktuell `null`); Application `note` /
      `recipient_id` / `ended_at` (FWW). Immutable Felder
      (`lat`, `lon`, `started_at`, `sequence_no`, `performer_id`,
      Position-FKs) bleiben read-only oder bewusst aus dem Scope
      (ADR-040 §K — Korrektur via Soft-Delete + neue Erfassung).
    - Submit-Pfad: `validateBackfill` (M5c.3-Helper, ADR-039 §K
      wiederverwendbar) → Diff-basiertes Patchen über
      `doc.patch(...)`; nur Docs mit Änderung werden geschrieben.
  - **Soft-Delete-Pfad** (§D + §E):
    - Event-Delete: `window.confirm` → `doc.patch({_deleted: true,
      deleted_at, updated_at})` → Toast → Dashboard-Redirect.
      Cascade-Trigger (`cascade_event_soft_delete`, ADR-030 +
      ADR-037 §C) tombstoned Applications und EventParticipants
      server-seitig.
    - Application-Delete: `window.confirm` →
      `doc.patch({_deleted: true})` → Liste aktualisiert sich
      reactive (Subscription auf
      `applications.find({event_id, _deleted=false}).$` filtert
      ihn weg).
    - Restore (`true → false`) bleibt M8 (Admin-Bereich)
      vorbehalten — bewusst asymmetrisch.
  - **Edit-Button in `EventDetailView`:** kleiner `Pencil`-Icon-
    Button mit „Bearbeiten"-Label, conditional gerendert via
    `canEditEvent`. `data-testid="edit-event-button"` für Tests.
  - **Tests** (15 neu, alle grün):
    - `tests/rbac.test.ts` (4): admin sieht alles, editor nur
      eigene, viewer nie, orphan-Event (created_by null) für editor
      → false.
    - `tests/event-edit-form.test.tsx` (7): no-op submit, event-
      only Patch, application-only Patch, FWW-Disable für gesetzte
      ended_at, Soft-Delete Application (mit confirm),
      Confirm-Abbruch (kein Patch), Soft-Delete Event mit
      Dashboard-Redirect.
    - `tests/event-detail-view.test.tsx` (+4): Edit-Button-
      Sichtbarkeit für Admin (auch fremde Events), Editor (eigene),
      Editor (fremde → versteckt), Viewer (versteckt).
  - **Frontend-Suite 109/109 grün** (zuvor 94; +15). Coverage
    `lib/rxdb/**` stabil bei 92.42 % Lines / 81.66 % Branches /
    100 % Functions. ESLint, `tsc --noEmit`, `next build` clean.
  - **Bundle:** neue Route `/events/[id]/edit` First-Load 262 kB;
    `/events/[id]` Detail-Page wuchs um 1 kB (Edit-Button +
    `canEditEvent`-Import).
  - **Keine Backend-Änderung in M5c.4:** keine Migrations, keine
    neuen Endpoints, keine neuen Dependencies, keine RLS-Anpassung.
    Soft-Delete via Sync-Push triggert das bestehende ADR-029-LWW-
    Verhalten; Cascade-Trigger aus M5b.1 / M5c.1b deckt
    Event→Children ab.
  - ADR-040 dokumentiert die elf Detail-Entscheidungen,
    `architecture.md` § Frontend um die neue Route + Komponente
    erweitert. **Damit ist M5c (Nachträgliche Erfassung &
    Bearbeitung) vollständig abgeschlossen.**

- **M5c.3 — Nachträgliche Erfassung (ADR-039):**
  Vierter Sub-Schritt von M5c. Schließt das Fahrplan-Akzeptanz-
  kriterium „Schalter ‚Nachträglich erfassen' auf der Startseite +
  Form mit manuellen Zeitstempeln + monotone Zeit-/Sequenz-
  Validierung". Live-Pfad bleibt unverändert.
  - **Neue Route** `/events/new/backfill`
    (`(protected)/events/new/backfill/page.tsx`); Editor/Admin-Sicht
    analog Live-Form, Viewer per Server-Redirect ausgeblendet.
  - **`EventBackfillForm`-Komponente:** Standort + Recipient-Cards
    wie im Live-Form, plus neue „Zeitraum"-Card mit zwei
    `datetime-local`-Inputs für Event-`started_at` (Pflicht) und
    `ended_at` (optional), plus wachsende Application-Liste — pro
    Zeile `started_at`, `ended_at`, Recipient, Notiz; Add-Button
    hängt eine Zeile an (Start mit Event-Start vorbelegt für UX),
    Trash-Button entfernt sie.
  - **Submit-Pfad:** `validateBackfill` synchron, dann
    `database.events.insert(...)` + Applications chronologisch
    sortiert mit `sequence_no = i+1` (Server überschreibt beim Push,
    ADR-029). Keine Backend-Änderung — Auto-Participant-Trigger und
    Sync-Replication funktionieren wie gehabt; Offline-Fähigkeit
    kommt automatisch aus dem RxDB-Schreibpfad.
  - **`lib/event-backfill-validation.ts` als pure Funktion**
    (ADR-039 §K, M5c.4-wiederverwendbar):
    - Pflichtfelder: Standort, Event-`started_at`, pro App
      `started_at` + Recipient.
    - Konsistenz: Event `ended_at >= started_at`; App
      `ended_at >= started_at`; App-Grenzen liegen innerhalb des
      Event-Zeitraums; Applications nicht-überlappend nach
      `started_at`-Sortierung. Berührende Enden
      (`a.ended_at === b.started_at`) sind keine Überlappung.
    - Convenience-Funktionen `errorsForApplication(uiId)` und
      `errorsForEvent()` für die UI-Render-Hooks.
  - **Dashboard-Schalter:** zweiter Button „Nachträglich erfassen"
    mit `secondary`-Variante neben dem primären „Neues Event
    starten"-CTA in `(protected)/page.tsx`. `data-testid`-Anker für
    künftige Dashboard-Tests.
  - **Tests** (16 neu, alle grün):
    - `tests/event-backfill-validation.test.ts` (11): Event-
      Pflichtfelder, Event-Konsistenz, App-Pflichtfelder, App-
      Konsistenz, App-Grenzen (vor/nach Event), App-Überlappung,
      sortierter Happy Path, berührende Enden = kein Konflikt.
    - `tests/event-backfill-form.test.tsx` (5): Submit-Block ohne
      Standort, Submit-Block ohne Event-`started_at`, Inline-Fehler
      bei fehlendem Recipient, Add/Remove-Application-Rows, Happy
      Path mit zwei Applications + chronologisch sortierter Insert-
      Reihenfolge + `sequence_no = 1..N`.
  - **Frontend-Suite 94/94 grün** (zuvor 78; +16). Coverage
    `lib/rxdb/**` stabil bei 92.42 % Lines / 81.66 % Branches /
    100 % Functions. ESLint, `tsc --noEmit`, `next build` clean.
  - **Bundle:** neue Route `/events/new/backfill` First-Load
    263 kB (`/events/new` Live: 261 kB) — minimaler Mehraufwand, da
    fast alle Dependencies geteilt werden.
  - **Keine Backend-Änderung in M5c.3:** keine Migrations, keine
    neuen Endpoints, keine neuen Dependencies, keine RLS-Anpassung.
  - ADR-039 dokumentiert die elf Detail-Entscheidungen,
    `architecture.md` § Frontend um die neue Route + Komponente
    erweitert.

- **M5c.2 — Unified EventDetailView + Lücken-Anzeige + Frontend-Maskierung (ADR-038):**
  Dritter Sub-Schritt von M5c. Erfüllt zwei Fahrplan-Akzeptanz-
  kriterien auf einen Schlag: chronologische Application-Liste mit
  Lücken zwischen ihnen, plus `reveal_participants`-Verhalten als
  Sicherheitsgürtel auf der Frontend-Seite.
  - **`EventDetailView` ersetzt `LiveEventView` + `EndedEventView`:**
    Eine einzige Komponente in
    `frontend/src/components/event/event-detail-view.tsx` rendert
    laufende und beendete Events. Page-Code branched nicht mehr auf
    `ended_at === null`.
  - **`ApplicationsTimeline`-Subkomponente:** chronologische Liste
    mit explizitem „Pause · MM:SS"-Marker zwischen zwei beendeten
    Applications, deren Lücke ≥ 1 s ist (ADR-011 §6
    „Materialwechsel"). Laufende oder noch-nicht-gestartete
    Applications produzieren keine Lücke.
  - **`ParticipantsList`-Subkomponente:** rendert pro Person Name,
    optional Alias, „Du"-Badge für den eigenen Eintrag. Maskierte
    Einträge sind italics/muted; die Beteiligten-Anzahl bleibt
    sichtbar, der Inhalt nicht.
  - **`lib/masking.ts` als Frontend-Sicherheitsgürtel:**
    `maskParticipants(participants, event, currentPersonId)`-Pure-
    Funktion spiegelt `app/services/masking.py` exakt
    (`reveal_participants=true` → unverändert; sonst eigener Eintrag
    unverändert, alle anderen mit Placeholder `[verborgen]` +
    `alias = null`, `note = null`). Greift bei stale
    TanStack-Query-Caches und zukünftigen Code-Pfaden ohne
    Backend-Roundtrip.
  - **Tests:** 12 neue (alle grün):
    - `tests/masking.test.ts` (6): reveal=true, reveal=false-Self,
      reveal=false-Other (Placeholder + null-Alias/Note),
      Reihenfolge stabil, leere Liste, `isMasked`-Predicate.
    - `tests/event-detail-view.test.tsx` (6): Live-Action-Card-
      Sichtbarkeit (laufend), Wegfall (beendet), Lücken-Marker,
      kein Marker bei laufender Vorgänger-App, Maskierung
      (`reveal=false`), keine Maskierung (`reveal=true`).
    - `tests/event-detail-page.test.tsx` Mock von `LiveEventView`
      auf `EventDetailView` umgestellt.
  - **Frontend-Suite 78/78 grün** (zuvor 66, +12). Coverage
    `lib/rxdb/**` stabil bei 92.42 % Lines / 81.66 % Branches /
    100 % Functions. ESLint, `tsc --noEmit`, `next build` clean.
  - **Bundle:** `/events/[id]` First-Load 272 kB (unverändert).
  - **Keine Backend-Änderung in M5c.2:** keine Migrations, keine
    neuen Endpoints, keine neuen Dependencies, keine RLS-Anpassung.
  - **Code-Aufräumarbeit:** `frontend/src/components/event/live-event-
    view.tsx` gelöscht; `EndedEventView`-Inline-Stub aus `page.tsx`
    entfernt; `coerceNumber`-Import aus `page.tsx` entfernt
    (Nutzung ist jetzt in `EventDetailView`).
  - ADR-038 dokumentiert die sieben Detail-Entscheidungen,
    `architecture.md` § Frontend um die neue Komponentenstruktur
    erweitert.

- **M5c.1b — Participants als RxDB-Sync-Collection (ADR-037):**
  Zweiter Sub-Schritt von M5c. Schließt den von ADR-035 §C / ADR-034 §K
  benannten Akzeptanz-Pfad „event.participants reactive nach Offline-
  Application + Reconnect" ohne `Person` selbst in eine Sync-Collection
  zu promoten.
  - **Backend-Migration**
    `backend/migrations/versions/20260427_1900_m5c1b_ep_sync.py`:
    - Neue Surrogate-Spalte `id uuid` (mit `gen_random_uuid()`-Server-
      Default), Composite-PK aufgelöst, `(event_id, person_id)` als
      UNIQUE behalten — RxDB verlangt einen einzelnen String-PK.
    - `updated_at NOT NULL DEFAULT clock_timestamp()` (Backfill mit
      `created_at`), `is_deleted` / `deleted_at`, Cursor-Index
      `(updated_at, id)`, `set_updated_at_event_participant`-Trigger.
    - `cascade_event_soft_delete()` bringt jetzt neben `application`
      auch `event_participant` mit (ADR-037 §C).
  - **Backend-Sync** — Pydantic `EventParticipantDoc` +
    `EventParticipantPullResponse` in `app/sync/schemas.py`,
    `pull_event_participants(...)` in `app/sync/services.py`, neue
    Route `GET /api/sync/event-participants/pull`. **Pull-only**
    (ADR-037 §D); Mutationen laufen weiter über die REST-Endpoints
    `POST/DELETE /api/events/{id}/participants/...` und den
    serverseitigen Auto-Participant-Trigger (ADR-012).
  - **Backend-Refactor:** drei `session.get(EventParticipant,
    (event_id, person_id))`-Aufrufstellen (`app/sync/services.py`,
    `app/services/events.py`, `app/services/applications.py`) auf
    `select().where()`-Queries umgestellt. Soft-Delete-Filter im
    Export-Service ergänzt.
  - **Backend-Tests** in `tests/test_sync_event_participants.py`
    (6 neue): Initial-Pull leer, Auto-Participant nach Event-Push,
    Cursor-Pagination, RLS (Editor sieht nur eigene), Admin-Vollsicht,
    Cascade-Trigger-Test (Soft-Delete bringt Participant-Tombstones im
    Pull). Drift-Test um die dritte Collection erweitert (3 × 3 = 9
    parametrisierte Cases). Backend-Suite **137/137 grün** (zuvor 128;
    Composite-PK-Code-Pfade sind aufgelöst). `mypy --strict` und
    `ruff check` clean.
  - **Frontend-RxDB:** dritte Collection `event_participants` in
    `lib/rxdb/database.ts` (Schema-Wrapper in `schemas.ts`,
    Document-Type in `types.ts`). Replication-Worker ergänzt mit
    neuem `pullOnly`-Flag — kein Push-Handler-Code-Pfad. Aggregierte
    `idle | active | offline | error`-Status-Streams nehmen den neuen
    Replicator mit auf.
  - **Detail-Page-Hybrid** (ADR-037 §E + §I): zweite RxDB-Subscription
    auf `event_participants.find({event_id, _deleted=false}).$` liefert
    die `person_ids` reactive. Page kombiniert die Live-IDs mit dem
    REST-`EventDetail`-Snapshot zu einer `participants:
    PersonRead[]`-Ableitung; fehlt eine ID im Snapshot
    (Auto-Participant nach Reconnect), bumpt ein useEffect den
    `serverFetchVersion`-State und triggert ein einmaliges
    REST-Refetch. Kein Polling.
  - **Tests:** `replication.e2e.test.ts` von 3 auf 4 Tests gewachsen
    („surfaces server-side auto-participants in RxDB after offline
    application reconnect"). Mock-Server `tests/helpers/sync-mock-
    server.ts` ergänzt um die idempotente `addParticipantRow`-Logik
    und das `event-participants/pull`-Routing. Component-Test in
    `tests/event-detail-page.test.tsx` um die zweite Subscription
    erweitert. Frontend-Suite **66/66 grün** (zuvor 65). Coverage
    `lib/rxdb/**` **92.42 % Lines / 81.66 % Branches / 100 %
    Functions** (zuvor 92.43 / 80 / 100); CI-Threshold 80/70/80
    weiterhin erfüllt. ESLint, `tsc --noEmit`, `next build` clean.
  - **Bundle:** `/events/[id]` First-Load 272 kB (unverändert). Die
    zweite Subscription kostet keine messbaren Bytes auf der
    Page-Ebene.
  - **Architektur-Hinweis** (ADR-037 §E): `Person`-Objekte werden
    bewusst noch **nicht** als RxDB-Collection geführt — die
    Maskierungs-Logik aus `app/services/masking.py` müsste sonst
    wire-format-äquivalent abgebildet werden. M5c.2 oder später kann
    das nachziehen, falls die Hybrid-Lösung im Betrieb auffällig wird.
  - ADR-037 dokumentiert die elf Detail-Entscheidungen,
    `architecture.md` § Sync um die dritte Collection erweitert.

- **M5c.1a — Detail-Page Client-only + REST-Once-Read Participants (ADR-036):**
  Erster Sub-Schritt von M5c. Beendet die SSR-Detail-Page; das M5b.4-
  Offline-Insert-mit-direkter-Navigation-Symptom (404 auf der
  Server-Side-Detail-Page, ADR-035 §C / ADR-034 §K) ist damit für den
  häufigen Fall (Online-Reload nach Offline-Insert) behoben.
  - **Page als Client Component:** `(protected)/events/[id]/page.tsx`
    nutzt jetzt `"use client"`, `useParams<{id}>()` für die Route,
    `useMe()` für Auth (statt `getServerMe()`), `useRouter().replace()`
    für den Login-Redirect.
  - **Drei Datenquellen, ein Render-Baum:** RxDB-Subscription auf
    `events.findOne(id).$` mit Resolved-Flag, One-Shot-REST-Fetch auf
    `/api/events/{id}` für `plus_code` und `participants`, Auth-Hook.
    Der Entscheidungsbaum (ADR-036 §H) deckt vier Zustände ab:
    Skeleton bei Loading, `notFound()` bei Hard-404 (beide Quellen
    leer), REST-Daten bei Online-Reload, oder synthetisierter
    `EventDetail` aus dem RxDB-Doc bei REST-Fehler/404 mit RxDB-
    Treffer (Offline-Insert-Fall).
  - **Bestehende Komponenten unverändert:** `LiveEventView` und
    `EndedEventView` werden weiter benutzt — der Refactor liegt
    ausschließlich auf der Page-Ebene.
  - **5 neue Component-Tests** in `tests/event-detail-page.test.tsx`
    pinnen den Entscheidungsbaum: Loading-Skeleton, REST-OK,
    RxDB-Fallback bei REST-404, Hard-404, Anonymous-Redirect.
    Frontend-Suite **65/65 grün** (zuvor 60), Coverage `lib/rxdb/**`
    stabil bei 92.43 % Lines / 80 % Branches / 100 % Functions.
    ESLint, `tsc --noEmit`, `next build` clean.
  - **Bewusst noch offen (für M5c.1b):** `participants` und `plus_code`
    bleiben bei reinem Offline-Insert leer, bis die `event_participant`-
    Sync-Collection nachgezogen wird. Backend-Auto-Participant-Trigger
    erscheint erst nach erstem Event-Pull-Roundtrip.
  - **Keine Backend-Änderung in M5c.1a:** keine Migrations, keine neuen
    Endpoints, keine neuen Dependencies, keine RLS-Policies. ADR-036
    legt den Framework-Rahmen für M5c (Sub-Schritt-Aufteilung 1a/1b/2/
    3/4, RxDB als Single Source of Truth, Mutationen via RxDB-Push,
    eigene Edit-Route, Participants als künftige Sync-Collection) als
    Dach für die folgenden Sub-Schritte fest.

- **M5b.4 — E2E-Offline-Test + Coverage-Tooling (ADR-035):**
  Schließt die M5b-Sub-Schritt-Reihe. Damit ist die Offline-Resilienz
  von Live-Modus → RxDB → Backend End-to-End nachgewiesen.
  - **Frontend-E2E-Test** (`frontend/tests/replication.e2e.test.ts`,
    3 Tests grün):
    - `flushes 3 offline applications exactly once on reconnect` —
      Offline-Insert × 3 → Reconnect → Mock-Backend hat exakt 3
      Application-Rows + 7 Auto-Participants (1 Event-Creator + 3 × 2
      pro Application).
    - `does not re-push docs that are already in sync` —
      `acceptedPushes`-Counter stabil bei Re-Sync ohne lokale
      Änderungen.
    - `pulls server-authoritative fields back into RxDB after
      reconnect` — server-bumpte `updated_at`-Werte landen via
      Pull-Cursor zurück in RxDB.
    - Test bootet die echten `lib/rxdb/{database,replication}` gegen
      `fake-indexeddb` (jsdom-IndexedDB-Polyfill) und einen
      In-Process-Mock-Server (`tests/helpers/sync-mock-server.ts`),
      der die vier Sync-Endpoints deterministisch in-memory
      abbildet. Async-Stabilisierung über
      `replication.{events,applications}.awaitInSync()` statt
      Timeouts (kein Flakiness-Risiko).
  - **Provider-Smoke-Test** (`tests/rxdb-provider.test.tsx`):
    Verifiziert, dass `RxdbProvider` `useDatabase()` /
    `useDatabaseError()` / `useSyncStatus()` korrekt exponiert.
  - **Backend-Idempotenz-Tests** (`backend/tests/test_sync_idempotency.py`,
    3 Tests grün):
    - Drei wiederholte Event-Pushes → 1 Row + 1 EventParticipant.
    - Drei wiederholte Application-Pushes → 1 Row, stable
      `sequence_no = 1`.
    - Offline-Replay-Batch mit Retry → 3 distinct Application-Rows,
      contiguous `sequence_no [1,2,3]`, 1 Auto-Participant.
  - **Coverage Frontend** `lib/rxdb/**`: **92.43 % Lines / 80 %
    Branches / 100 % Functions** via `@vitest/coverage-v8@2.1.9`
    (V8-native), CI-Threshold 80/70/80 in `vitest.config.ts`.
    Pro-File: `replication.ts` 95.3 %, `database.ts` 80.5 %,
    `provider.tsx` 93.2 %, `schemas.ts` 100 %.
  - **Coverage Backend** `app/sync/`: bleibt bei **91 %** aus M5b.2;
    +3 Idempotenz-Tests bringen die Suite auf **128/128 grün**.
    `mypy --strict` und `ruff check` clean.
  - **Edge-Cases aus ADR-034 §K** explizit nach M5c verschoben
    (Variante C2 aus dem M5b.4-Vorschlag, freigegeben):
    Offline-Insert + direkte Navigation → 404 auf SSR-Detail-Page
    sowie leere `event.participants` bis zum ersten Pull. Behebung
    als Pflicht-Deliverable im M5c-Eintrag des Fahrplans
    festgehalten — gemeinsamer Refactor mit der M5c-Detail-Page.
  - **Neue Dev-Deps** (Frontend, freigegeben über ADR-035 §A/§B):
    `fake-indexeddb@6.2.5` (MIT, Standard-IndexedDB-Polyfill der
    Dexie- und RxDB-Maintainer) und `@vitest/coverage-v8@2.1.9`
    (offizieller vitest-Coverage-Reporter, MIT, V8-native).
  - **Kleine Code-Anpassung** in `frontend/src/lib/rxdb/database.ts`:
    `loadDevPlugin()` lädt das `RxDBDevModePlugin` jetzt nur noch in
    `NODE_ENV === "development"` statt in „nicht production". Vitest
    setzt NODE_ENV auf `"test"`, was den dev-mode
    Schema-Validator-Zwang auslöste; production bleibt unberührt.
  - ADR-035 dokumentiert die zehn Detail-Entscheidungen,
    `architecture.md` § Sync um den Test-Stack erweitert,
    README-Phase-Badge auf `M5b-erledigt`.

- **M5b.3 — RxDB-Setup im Frontend + Live-Modus auf RxDB-Schreibpfad (ADR-034):**
  Frontend-Sync-Schicht. Live-Modus arbeitet ab sofort lokal-zuerst,
  Replication läuft asynchron im Hintergrund.
  - **Library-Schicht** unter `frontend/src/lib/rxdb/`:
    - `types.ts` — TS-Document-Types deckungsgleich mit den JSON-
      Schemas aus M5b.2.
    - `schemas.ts` — RxJsonSchema-Wrapper über die JSON-Files.
    - `database.ts` — Lazy-Singleton `getDatabase()` mit
      Dexie-Storage-Adapter; Dev-Mode-Plugin nur in Development.
    - `replication.ts` — `replicateRxCollection` pro Collection,
      eigene Pull-/Push-Handler gegen `/api/sync/{events,applications}/
      {pull,push}`, CSRF-Cookie-Echo im Push, aggregierter Sync-Status
      `idle | active | offline | error`.
    - `provider.tsx` — `RxdbProvider` + `useDatabase()` /
      `useDatabaseError()` / `useSyncStatus()`-Hooks; mountet im
      `(protected)/layout.tsx` zwischen `PinLockProvider` und
      `AppShell`.
  - **Sync-Indikator** (`components/sync/sync-status-indicator.tsx`):
    Kleine Pill mit Lucide-Icon (Cloud / Loader2 / CloudOff /
    TriangleAlert) in Sidebar (Desktop, mit Label) und Mobile-Header
    (kompakt). `data-sync-status`-Attribut für Tests.
  - **Live-Modus-Refactor** auf RxDB-Schreibpfad:
    - `event-create-form.tsx`: `database.events.insert(...)` mit
      `crypto.randomUUID()`-Client-ID, server-authoritative
      `created_by`. Recipient-Wahl in `sessionStorage` als Bridge zur
      ersten Application.
    - `application-start-sheet.tsx`: `database.applications.insert(...)`
      mit lokal vergebener `sequence_no` (max+1); Server vergibt
      endgültige Nummer beim Push.
    - `live-event-view.tsx`: `useEventDoc` / `useApplications`-Hooks
      subscriben auf `findOne(id).$` und `find({...}).$`. End-Aktionen
      via `doc.patch({ended_at, updated_at})`. Reactive Updates ohne
      `refetchInterval`.
  - **Conflict-Handler:** RxDB-Default (Master gewinnt) — passt zur
    ADR-029-Semantik; eigener Handler nicht nötig.
  - **Tests:** 4 neue Tests in
    `tests/sync-status-indicator.test.tsx` (idle / active / offline /
    error). Frontend-Suite **60/60 grün** (zuvor 56). ESLint clean,
    `tsc --noEmit` clean, `next build` clean.
  - **Browser-Verifikation** (preview server): Login → Dashboard
    rendert den Sync-Indikator im DOM
    (`[role=status][data-sync-status=idle]`), RxDB-IndexedDB
    initialisiert sich, Pull repliziert vorhandene Events lokal.
  - **Bundle:** `/events/[id]` First-Load 271 kB, `/events/new` 262 kB
    — innerhalb der in ADR-017 prognostizierten 150-200 KB für
    RxDB+Dexie+RxJS gzipped.
  - **Dependencies:** `rxdb@17.1.0`, `rxjs@7.8.2` (beide aus dem in
    `project-context.md` §3 als „freigabefrei nutzbar" gelisteten
    Stack-Set; ADR-017 hatte RxDB bereits als Sync-Schicht gewählt).
  - **Offene Edge-Cases** (bewusst, mit M5b.4 zu adressieren): Offline-
    Insert mit direkter Navigation auf die Server-Side-Detail-Page
    liefert kurzzeitig 404, weil der Push noch nicht durch ist.
    `event.participants` bleibt bis zum ersten Pull-Roundtrip leer
    (Auto-Participant entsteht erst beim Server-Sync). Details in
    ADR-034 §K.

- **M5b.2 — Backend-Sync-Endpoints (ADR-033):**
  Vier RxDB-Replication-Endpoints und der zugehörige Service-/Test-/
  Doku-Stack. Erste Editor-INSERT-via-HTTP-Pfade im Repo.
  - **Endpoints:** `GET /api/sync/{events,applications}/pull` und
    `POST /api/sync/{events,applications}/push` mit Cursor-Pagination
    `(updated_at, id)`, Tombstone-Replikation via `_deleted`-Wire-Flag,
    Conflict-Resolution pro Feld nach ADR-029 (immutable-after-create,
    first-write-wins, last-write-wins, server-authoritative). Sequence-
    Nummern und `created_by` sind beim Application-Insert server-
    authoritativ; Auto-Participant für Performer/Recipient (ADR-012)
    mitgezogen.
  - **Pydantic-Schemas** (`app/sync/schemas.py`): `EventDoc`,
    `ApplicationDoc`, `SyncCheckpoint`, `*PullResponse`, `*PushItem`.
    Wire-Flag `_deleted` als Pydantic-Alias zu intern `deleted`.
  - **Frontend-JSON-Schemas** als Vertragsdatei in
    `frontend/src/lib/rxdb/schemas/{event,application}.schema.json`
    (RxDB-natives Format mit `primaryKey`, `version`, `indexes`).
    RxDB-Konsumtion folgt mit M5b.3.
  - **Drift-Test** (`tests/test_rxdb_schema_drift.py`, ADR-031): lädt
    die Frontend-JSON-Schemas und vergleicht Properties + Typen +
    `required`-Listen mit den Pydantic-`model_json_schema(by_alias=True,
    mode='serialization')`. Schlägt bei jeder Drift-Änderung fehl.
  - **Migration `20260426_1830_m5b2_owner_select`:** Neue Permissive-
    SELECT-Policies `event_editor_select_own` und
    `application_editor_select_own` (USING `created_by =
    current_user_id`). Behebt einen latent-Bug aus der M2-Strict-RLS,
    den die Sync-Endpoints aufgedeckt haben (`INSERT … RETURNING`
    triggert die SELECT-Policy auf der frisch eingefügten Zeile vor dem
    Auto-Participant-Insert). Freigegeben separat 2026-04-26 als
    minimal-invasive Variante. Details in ADR-033 §E.
  - **Soft-Delete-Filter im Service-Layer** (ADR-033 §D): `events`,
    `applications`, `search`, `exports`-Services filtern
    `is_deleted = false`. Sync-Endpoints sind die einzigen Konsumenten,
    die Tombstones zurückliefern.
  - **asyncpg `statement_cache_size = 0`** in `app/db.py` als
    defensive Schutzschicht gegen Per-Connection-Plan-Cache-
    Interaktionen mit Per-Request-`SET LOCAL`-GUCs (asyncpg #200).
  - **Tests:** 41 neue Tests (6 sync_api, 8 sync_rls, 7 conflict, 9
    applications, 5 soft-delete-filter-regression, 6 drift). Backend-
    Suite **125/125 grün** (zuvor 84). `mypy --strict` clean,
    `ruff check` clean. Coverage `app/sync/`: **91 %** (Soll ≥ 80 %).
  - **Dev-Dependency:** `coverage>=7.13.5` für die Sync-Coverage-
    Messung.

- **M5b.1 — Sync-Datenmodell-Vorbereitung (ADR-029…ADR-032):**
  Datenmodell-Fundament für die RxDB-Replication aus M5b.2/M5b.3.
  Reine Backend-/DB-Änderung, kein Sync-Code.
  - **ADR-029 — Conflict-Resolution-Strategie (Live-First mit
    Reconciliation):** Pro-Feld-Tabelle für `event` und `application`.
    Identitäts-/Zeit-/Geo-Felder sind nach erstem Push immutable;
    `ended_at` ist First-Write-Wins; Notizen, Beteiligte und Positionen
    sind Last-Write-Wins; `sequence_no`-Konflikte löst der Server durch
    Re-Numbering. Konkret prägt das die `POST /api/sync/push`-Logik in
    M5b.2.
  - **ADR-030 — Soft-Delete und Cursor-Felder:** `event` und
    `application` erhalten `is_deleted boolean NOT NULL DEFAULT false`
    + `deleted_at timestamptz NULL`, `updated_at` wird auf `NOT NULL`
    mit `DEFAULT clock_timestamp()` gehoben (Backfill mit `created_at`),
    Cursor-Indices `(updated_at, id)` für `/api/sync/pull`. Cascade-
    Trigger `cascade_event_soft_delete` propagiert Soft-Delete eines
    Events auf alle nicht-gelöschten Child-Applications; Restore
    propagiert bewusst nicht. RLS-Policies bleiben in M5b.1 unverändert
    — Soft-Delete-bewusste Service-Filterung kommt mit M5b.2.
  - **ADR-031 — RxDB-Schema-Source-of-Truth:** Frontend-RxDB-Schemas
    und Backend-Pydantic-Schemas werden manuell parallel gepflegt;
    Drift wird in M5b.2 durch einen automatisierten Test in der
    Backend-Suite verhindert.
  - **ADR-032 — Keine IndexedDB-Encryption in Pfad A:** Storage bleibt
    unverschlüsselt; Geräteverschlüsselung ist User-Verantwortung. App-
    PIN aus M5a.4 deckt das primäre Bedrohungsmodell. Einwilligungstext
    (Pre-M11) wird entsprechend ergänzt.
  - **Alembic-Migration** `20260426_1800_m5b1_sync_columns`: Backfill
    `updated_at`, `NOT NULL`-Hochzug, Soft-Delete-Spalten, Cursor-
    Indices, Cascade-Trigger. Down-Migration vollständig reversibel.
  - **ORM-Modelle:** `Event` und `Application` erben jetzt zusätzlich
    von `SoftDeleteMixin`, mit explizitem `updated_at`-Override
    (`nullable=False`, `server_default=text("clock_timestamp()")`).
    `SoftDeleteMixin`-Docstring erweitert (M5b-Scope dokumentiert).
  - **Tests:** Sieben neue Trigger-Tests in
    `tests/test_sync_columns_migration.py` decken Insert-Default,
    Update-Bump auf `event` und `application`, Soft-Delete-Cascade,
    Restore-No-Cascade und Application-Soft-Delete-Isolation ab.
    Backend-Suite 84/84 grün, `mypy` und `ruff` clean.

### Fixed

- **M2 — fastapi-users-Typing:** `app/auth/routes.py:20` warf seit M2
  `Value of type variable "models.UP" of "FastAPIUsers" cannot be "User"`
  unter `mypy --strict`. Behoben durch Vererbung von
  `SQLAlchemyBaseUserTableUUID` (ADR-025); Spalten-Overrides in einem
  `if not TYPE_CHECKING`-Block halten Schema und Verhalten identisch
  (UUIDv7-Default per ADR-018, server_default auf den Boolean-Flags,
  benannter UniqueConstraint statt inline `unique=True/index=True`).
  Fünf bisherige `# type: ignore[type-var]`-Workarounds in
  `app/auth/manager.py` sind entfernt. `mypy --strict` clean
  (50 Source-Files, 0 Errors). Schema-Drift verifiziert: keine
  Migration nötig. Backend-Suite 74/74 grün.

### Added

- **M5a.4 — App-PIN-Sperre (PBKDF2 / Web Crypto API):** Clientseitige
  UI-Sperre nach ADR-023, querliegend zu allen `(protected)`-Routen.
  Frontend-only, kein Backend-Anteil (Fahrplan §M5a, ADR-028).
  - **Crypto-Lib** (`lib/pin.ts`): PBKDF2-SHA-256, 600.000 Iterationen,
    16-Byte-Salt, 32-Byte-Hash, base64-Encoding, konstantzeit-XOR-
    Vergleich. PIN-Länge 4–6 Ziffern.
  - **Storage** (`lib/pin-storage.ts`): native IndexedDB-CRUD im
    Object-Store `hcmap-pin/pin/pin_v1`. Schema-Versionierung erlaubt
    späteren Algorithmus-Wechsel (ADR-023 §8).
  - **Provider** (`components/pin/pin-lock-provider.tsx`): React-Context
    + `usePinLock`-Hook. Inaktivitäts-Timer Default 60 s, konfigurierbar
    30 s–15 min, persistiert in `localStorage`. Reset bei
    `pointerdown`/`keydown`/`visibilitychange`. Eingebettet
    zwischen Server-Layout und `<AppShell>` in
    `app/(protected)/layout.tsx` — Login bleibt frei.
  - **`fail_count`-Schutz:** vor Hash-Vergleich inkrementiert
    (Crash-resistent). Bei Erfolg auf 0 Reset. Bei 5 Fehlversuchen
    Zwangs-Logout: IDB-Wipe + State-Reset + `POST /api/auth/logout` +
    Redirect auf `/login?error=pin` mit deutschem Hinweistext.
  - **`LockOverlay`-UI** (`components/pin/lock-overlay.tsx`): Vollbild-
    Modal mit numerischem Input, Mobile-Tastatur, verbleibende
    Versuche bei Fehlschlag.
  - **Profil-UI** (`components/profile/pin-settings.tsx`): PIN
    setzen/ändern/entfernen, Inaktivitäts-Dropdown mit fünf Stufen,
    „Jetzt sperren"-Knopf.
  - 15 neue Vitest-Tests (`pin`: 10 inkl. Determinismus + falsche-
    PIN + Salt-Variabilität, `pin-lock`: 5 inkl. Force-Logout-Pfad).
    Frontend-Suite 37 → 52 Tests grün. `tsc --noEmit`, `next lint`,
    `prettier --check`, `next build` alle clean.
  - Browser-Smoke gegen lokales Stack bestätigt: Set/Lock/Wrong/Right
    end-to-end, fail-counter persistiert in IDB. Force-Logout-Pfad
    in Vitest abgedeckt.
  - **Keine neuen Backend-Routen, keine neuen Dependencies, keine
    Migrations.**
  - ADR-028 dokumentiert die vierzehn Detail-Entscheidungen.

### Fixed

- **Dashboard — Decimal-Serialisierung:** `app/(protected)/page.tsx`
  crashte mit `event.lat.toFixed is not a function`, weil das Backend
  Decimals als String liefert (Pydantic v2 Default), die Listen-
  Item-Komponente aber `.toFixed()` direkt aufrief. Bei leerer Liste
  fiel der Bug seit M4 nicht auf. Fix: `coerceNumber()`-Helper aus
  `lib/types.ts` (M5a.3) wird jetzt auch im Dashboard verwendet.

- **M5a.3 — Frontend Live-Modus + LocationPickerMap:** Live-Erfassung
  end-to-end im Frontend, plus eine kleine additive Backend-Erweiterung
  für die Application-Liste pro Event (Fahrplan §M5a, ADR-027).
  - **Karten:** `maplibre-gl@^4` und `react-map-gl@^7` als Runtime-Deps
    (beide MIT, freigabefrei nach ADR-022). Tile-URL aus
    `NEXT_PUBLIC_TILE_URL` (Default `/api/tiles/{z}/{x}/{y}`),
    Default-Center aus `NEXT_PUBLIC_DEFAULT_MAP_CENTER`. Raster-Style
    mit Tile-Proxy als Source.
  - **`LocationPickerMap`-Komponente:** Single-Marker, Tap-to-Adjust,
    draggable, controlled `{lat, lon, onChange}`. Kein Clustering,
    kein URL-Sync — minimal-Scope nach ADR-022; `MapView`-Vollausbau
    folgt mit M6.
  - **Hooks:** `useWakeLock`, `useGeolocation`, `useNow` in
    `src/hooks/`. Wakelock mit Re-Acquire bei `visibilitychange` und
    Permission-Denied-Hinweis.
  - **`/events/new`-Flow:** GPS-Auto-Request, Karten-Picker,
    Recipient-Combobox mit On-the-fly-Sheet (`POST /api/persons/quick`,
    ADR-014), Notiz, Submit → `POST /api/events/start` → Redirect.
    Auto-Participant-Hinweis (ADR-012) bei gewähltem Recipient.
    `viewer`-Rolle wird abgewiesen.
  - **`/events/[id]`-Live-Ansicht:** Server-Component lädt das Event,
    branched zwischen Live (Wakelock + Sekunden-Timer + Action-Buttons
    + Application-Liste) und Ended (Stub mit Notiz, Plus-Code,
    M5c-Hinweis). Action-Buttons: „Neue Application", „Aktuelle
    beenden", „Event beenden" — verbunden mit den drei Live-POSTs aus
    M5a.1 (`/applications/start`, `/applications/{id}/end`,
    `/events/{id}/end`).
  - **Dashboard-CTA aktiviert:** „Neues Event starten" ist jetzt ein
    funktionaler Link auf `/events/new` (ersetzt den disabled-Button
    aus M5a.2).
  - **Backend additiv:** Neuer Endpoint
    `GET /api/events/{event_id}/applications` (List sortiert nach
    `sequence_no`). Schließt eine Lücke aus ADR-024 §J — rein additiv,
    freigabefrei. Drei neue HTTP-Tests; Backend-Suite 74 → 77 Tests
    grün.
  - 10 neue Vitest-Tests (`duration` 6 + `use-wake-lock` 4).
    Frontend-Suite 27 → 37 Tests grün. `tsc --noEmit`, `next lint`,
    `prettier --check`, `next build` alle clean.
  - **Browser-Smoke** gegen lokales Stack bestätigt: Anlegen → Live
    mit Timer + Plus-Code → Application start/end → Event end →
    EndedView. Wakelock-Permission im Headless verweigert (erwartet),
    Tile-Proxy liefert ohne `HCMAP_MAPTILER_API_KEY` 503 — Karte
    rendert ohne Tiles, Picker-Flow trotzdem funktional.
  - Zwei neue ENV-Variablen: `NEXT_PUBLIC_TILE_URL`,
    `NEXT_PUBLIC_DEFAULT_MAP_CENTER`.
  - ADR-027 dokumentiert die zwölf Detail-Entscheidungen.

- **M5a.2 — Frontend Startseite, Suche, Export:** Reiner Frontend-Konsum
  bestehender M3-Endpoints (Fahrplan §M5a, ADR-026).
  - **Globale Suchleiste** im AppShell (Sidebar auf Desktop, zweite
    Header-Zeile auf Mobile). Submit navigiert zu `/search?q=…`,
    Pre-Fill aus dem aktuellen Query-Param. Funktioniert auch ohne JS
    (Progressive-Enhancement-Form-Action).
  - **/search-Seite** (Server-Component, RLS-konform via
    Cookie-Forwarding) zeigt Treffer aus `GET /api/search` mit
    Total-Counter, Limit-Hinweis und Snippet-Liste. Empty-Query und
    Backend-Fehler werden als Hinweiskarten gerendert.
  - **Sicheres Snippet-Highlighting:** Postgres-`<b>…</b>`-Tags werden
    per Tokenizer in React-`<mark>`-Elemente überführt; Plain-Text
    wird von React automatisch escaped. Test deckt
    `<script>`-Injection-Edge-Case explizit ab.
  - **Export-UI im Profil:** Vier Download-Links per
    `<a href download="…">` für `/api/export/me` (JSON),
    `/api/export/me/events.csv`, `/api/export/me/applications.csv`
    plus admin-only `/api/admin/export/all`. Same-Origin-Cookie
    reicht, GET → kein CSRF.
  - 11 neue Vitest-Tests (`search-box`, `search-results`,
    `export-buttons`). Frontend-Suite 16 → 27 Tests grün.
    `tsc --noEmit`, `next lint`, `prettier --check`, `next build`
    alle clean.
  - **Keine Backend-Änderungen, keine neuen Abhängigkeiten,
    keine Migrations.**
  - ADR-026 dokumentiert die neun Detail-Entscheidungen (Searchbox-
    Pattern, /search-Page-Lade-Strategie, Snippet-Tokenisierung,
    Treffer-Link-Ziel, Export-Download-Pattern, Dashboard-Polish,
    Tests, Browser-Smoke, Scope-Abgrenzung).

### Fixed

- **Dashboard — Throwback-Schema-Drift:** Die Sektion „An diesem Tag"
  rendete `throwback.event_id`; das Backend liefert seit M3 das Feld
  `id` (siehe `backend/app/schemas/search.py:21`). Frontend-Schema an
  Backend angepasst (`note`-Feld zusätzlich übernommen). Listen-
  Einträge im Dashboard verlinken jetzt zusätzlich auf
  `/events/{id}` (Detail-Route bleibt bis M5c ein Stub — bewusste
  ADR-026 §D-Konsequenz).

- **M5a.1 — Backend-Live-Endpoints + Tile-Proxy:** Sechs neue Backend-
  Routen für die Live-Erfassung (Fahrplan §M5a, ADR-022/-024).
  - `POST /api/events/start` setzt `started_at = now()`, fügt den Creator
    automatisch als Participant hinzu und nimmt optional einen Recipient
    direkt mit auf.
  - `POST /api/events/{id}/end` und `POST /api/applications/{id}/end`
    sind idempotent: ein zweiter Aufruf ändert `ended_at` nicht.
  - `POST /api/events/{event_id}/applications/start` startet eine
    Application mit `started_at = now()`, vergibt `sequence_no`
    automatisch und füllt `performer_id`/`recipient_id` mit dem
    eingeloggten User vor (Regel-002, Self-Bondage als Default).
  - `POST /api/persons/quick` (admin + editor): On-the-fly-Person
    mit `origin = on_the_fly`, `linkable = false` (Regel-004).
  - `GET /api/tiles/{z}/{x}/{y}` als MapTiler-Proxy mit
    server-seitigem API-Key, `Cache-Control: public, max-age=86400`,
    Auth-Pflicht. Pfad-Parameter werden auf gültige Tile-Koordinaten
    geprüft (`z` 0–22, `x`/`y` ≥ 0).
  - 21 neue HTTP-Tests (test_events_live_api, test_applications_live_api,
    test_persons_quick_api, test_tiles_proxy). Backend-Suite jetzt
    74/74 grün gegen Postgres 16 + PostGIS 3.4.
  - Neue ENV-Variablen `HCMAP_MAPTILER_API_KEY` und
    `HCMAP_MAPTILER_STYLE` (Default `basic-v2`); leerer Key gibt 503.
  - `httpx` aus den Dev- in die Runtime-Dependencies verschoben (für
    den Tile-Proxy zur Laufzeit).
  - ADR-024 dokumentiert die acht Detail-Entscheidungen
    (Endpoint-Inventar, Idempotenz, Auto-Participant-Reuse, Tile-Proxy-
    Mechanik, Default-Performer/-Recipient, ENV-Schalter, Tests, Scope-
    Abgrenzung gegen M5a.2/.3/.4).
- **M5a-Vorbereitung — ADR-022/-023:** ADR-022 zieht den minimalen
  `LocationPicker` und den Tile-Proxy aus M6 in M5a vor; M6 reduziert
  sich auf Marker-Liste, Clustering, Filter, URL-State und Geocoding.
  ADR-023 legt das App-PIN-Hashing auf PBKDF2-SHA-256 (Web Crypto API,
  600.000 Iterationen, 16-Byte-Salt) fest — keine neue Abhängigkeit.

- **M4 — Frontend-Grundgerüst & Auth-Flow:** Login-, Logout- und
  geschütztes Layout produktiv. `lib/api.ts` als typisierter
  fetch-Wrapper mit `credentials: 'include'`, automatischer
  `X-CSRF-Token`-Header-Anhängung aus dem `hcmap_csrf`-Cookie und
  `ApiError`-Klasse. TanStack-Query-Hooks `useMe` / `useLogin` /
  `useLogout`, server-seitiger `getServerMe()` für Server Components.
  Edge-Middleware redirected anonyme Requests auf `/login` (mit
  `?next=`-Parameter), Server-Component-Layout lädt den User und
  redirected bei Rolle-Mismatch (`/admin` admin-only). `(public)/login`
  und `(protected)`-Route-Group trennen Pfade ohne Layout-Boilerplate.
  Sidebar (Desktop) + Bottom-Nav (Mobile) + UserMenu (Avatar-Initialen,
  Theme-Toggle, Logout) aus einer gemeinsamen Nav-Item-Liste. Stub-Seiten
  für Dashboard, Events, Karte, Admin, Profil. Dark-Mode via
  `next-themes` (system / hell / dunkel). 11 shadcn-Komponenten
  (button, input, label, card, skeleton, avatar, dropdown-menu, sheet,
  sonner, form) mit Style "new-york" und `cssVariables: false`.
- Frontend-Tests: vitest + jsdom + @testing-library/react. 16/16 Tests
  grün gegen api.ts (CSRF/method/query/204), useMe (200/401),
  middleware (Redirect-Verhalten, Public-Pfade, `?next=`),
  LoginForm (Submit-Payload, Validierung blockt Mutation-Call).
  `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` alle grün.
- ADR-021 dokumentiert die elf Detail-Entscheidungen (API-Rewrite-
  Strategie, fetch-Wrapper, Server-State, Route-Protection-Hybrid,
  Login-Submission, Layout, Dark-Mode-Lib, shadcn-Set, Stub-Umfang,
  Test-Setup, neue Dependencies).

- **M3 — Event- und Application-API (Backend):** Vollständige Domain-CRUD
  unter `/api/events`, `/api/applications`, `/api/persons` (admin-only
  Schreibzugriff plus Anonymisierung gemäß ADR-002), vier Catalog-Pfade
  mit Vorschlags-/Approve-Workflow, Volltextsuche `/api/search` (German
  tsvector über Event- und Application-Notes), Throwbacks
  `/api/throwbacks/today`, JSON- und CSV-Exporte
  (`/api/export/me`, `/api/export/me/events.csv`,
  `/api/export/me/applications.csv`, `/api/admin/export/all`).
  44 Endpunkte gesamt, alle RLS-konform via `get_rls_session`.
- Service-Layer unter `backend/app/services/` (events, applications,
  persons, catalog, search, exports, plus_code, masking) kapselt
  Business-Regeln: Auto-Participant nach ADR-012, server-vergebene
  `sequence_no`, approved-only-Catalog-Refs für Editor, kontextabhängige
  Personen-Maskierung bei `reveal_participants=false`, server-seitige
  Plus-Code-Berechnung via `openlocationcode`.
- 53/53 Tests grün, davon 22 neue M3-HTTP-Tests
  (test_events_api, test_applications_api, test_persons_api,
  test_catalog_api, test_search_export_api). ruff, mypy --strict, format
  alle clean.
- ADR-020 dokumentiert die Implementierungs-Entscheidungen
  (Scope-Schnitt M3↔M5a, Pagination, Service-Layer, Auto-Participant,
  Plus-Code, Volltextsuche, Maskierung, Export-Format).

- **M2 — Auth & User-Management (Backend):** fastapi-users-Integration mit
  HttpOnly-Cookie + JWT (Cookie-Name `hcmap_session`), Argon2id-Hashing
  (OWASP-2024-Defaults), Login/Logout/Me/Forgot-Password/Reset-Password,
  Self-Registration deaktiviert. Doppel-Cookie-CSRF-Schutz mit
  `hcmap_csrf` + `X-CSRF-Token`-Header für alle State-Changing-Methoden.
  `app_user`-Postgres-Rolle plus per-Request-GUCs setzen RLS aktiv;
  scharfe Per-Rolle-Policies aus `architecture.md` §RLS ersetzen die
  permissive M1-Default-Policy. RLS-Hilfsfunktionen
  `app_user_can_see_event` / `app_user_owns_event` als `SECURITY DEFINER`
  vermeiden zirkuläre Policy-Auswertung. Strukturierter Mail-Stub
  (`structlog`-Output) für Reset-Tokens; SMTP folgt vor M11. Idempotente
  Bootstrap-CLI `python -m scripts.bootstrap_admin` legt den ersten
  Admin-User samt verlinkter Person an.
- ADR-019 dokumentiert die M2-Entscheidungen
  (Cookie-Strategie, CSRF-Mechanik, Argon2-Parameter, RLS-Setup,
  Bootstrap-CLI, Mail-Stub).

- **M1 — Datenbank-Schema & Migrations:** Vollständiges initiales Schema
  als SQLAlchemy-2.0-Modelle (User, Person, Event, EventParticipant,
  Application, ApplicationRestraint, RestraintType, ArmPosition,
  HandPosition, HandOrientation), Alembic-Initialmigration mit PostGIS-
  Aktivierung, `app_user`-Rolle, `updated_at`-Trigger via
  `clock_timestamp()`, GIST-Index auf `event.geom`, GIN-Indizes für
  deutsche Volltextsuche auf `note`, RLS aktiv mit permissiver
  Default-Policy auf den datenführenden Tabellen (M2 ersetzt mit
  scharfen Policies).
- Seed-Skripte für RestraintType-Anker-Modelle und alle Position-
  Lookups (`uv run python -m app.seeds.run`), idempotent via
  UNIQUE NULLS NOT DISTINCT + ON CONFLICT DO NOTHING.
- Test-Infrastruktur mit sync-DB-Fixture (psycopg) und optionalem
  testcontainers-Fallback; 13/13 Tests grün gegen echtes Postgres+PostGIS.
- ADR-018 dokumentiert die M1-Implementierungsentscheidungen
  (UUIDv7 client-seitig via uuid-utils, Trigger statt ORM-onupdate,
  permissive RLS-Default, Seed-Strategie).

- **M0 — Projekt-Setup:** Lauffähiges Skeleton aus FastAPI-Backend
  (`/api/health`, OpenAPI unter `/api/docs`), Next.js-Frontend (App Router,
  TypeScript strict, Tailwind, vorbereitetes shadcn/ui), Postgres+PostGIS-
  Container und Docker-Compose-Stack für die lokale Entwicklung.
- Backend-Tooling: ruff, mypy strict, pytest mit `httpx.AsyncClient`,
  structlog-Setup ohne PII.
- Frontend-Tooling: ESLint (next/core-web-vitals + next/typescript +
  prettier), Prettier mit Tailwind-Plugin, `pnpm typecheck`.
- Top-Level: `.env.example`, `.gitignore`, `.pre-commit-config.yaml`.
- Konzeptionsdokumente nach `docs/` verschoben (CLAUDE.md-konform).
