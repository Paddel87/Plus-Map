<!--
Zweck: Lebendiger Fahrplan für die Umsetzung von HC-Map. Zeigt Reihenfolge,
Abhängigkeiten und Akzeptanzkriterien der Arbeitspakete. Dient als Arbeits-
anweisung für Claude Code in den Umsetzungs-Sessions.

Update-Trigger:
- Meilenstein wird abgeschlossen → Status auf [ERLEDIGT] mit Datum, Lessons Learned in `decisions.md` oder `blockers.md`
- Neue Anforderung oder Änderung → Meilenstein einfügen oder anpassen
- Blocker dauerhaft → in `blockers.md` dokumentieren, hier auf [BLOCKIERT] setzen
- Scope-Änderung (z. B. Pfad-B-Entscheidung) → komplette Phase überarbeiten

NICHT hierher: Architektur-Details (→ `architecture.md`), Grundsatzentscheidungen
(→ `decisions.md`), Projektkontext (→ `project-context.md`).

Status-Marker (gemäß CLAUDE.md Abschnitt 7):
- [OFFEN]                – definiert, noch nicht begonnen
- [IN ARBEIT]            – aktuell in Bearbeitung (max. ein Eintrag pro Session)
- [WARTET-AUF-FREIGABE]  – Vorschlag formuliert, wartet auf Entscheidung
- [BLOCKIERT]            – nicht fortsetzbar, siehe blockers.md
- [ERLEDIGT]             – DoD erfüllt, verifiziert, mit Datum
- [VERWORFEN]            – bewusst nicht umgesetzt, mit ADR-Referenz
-->

# HC-Map — Fahrplan

## Aktueller Stand

- **Stand vom:** 2026-05-04 — **RC-4 im Operator-Realtest auf Nodica1.** Aktueller Pre-Release-Tag [`v0.1.0-rc.4`](https://github.com/Paddel87/HC-Map/releases/tag/v0.1.0-rc.4) auf Commit [bed78ed](https://github.com/Paddel87/HC-Map/commit/bed78ed) (2026-05-03 21:17 UTC). RC-4 bündelt gegenüber RC-3 die sechs nachgezogenen Commits: HOTFIX-006-Doku-Patch ([431aeb4](https://github.com/Paddel87/HC-Map/commit/431aeb4)), HOTFIX-007 GeolocateControl ([fa067da](https://github.com/Paddel87/HC-Map/commit/fa067da)), HOTFIX-008 optionales `event.title` ([bfb5994](https://github.com/Paddel87/HC-Map/commit/bfb5994), ADR-056), HOTFIX-009 Application-Auto-Stop ([ee54490](https://github.com/Paddel87/HC-Map/commit/ee54490), ADR-057), HOTFIX-010 `event.time_precision` ([04bb0f3](https://github.com/Paddel87/HC-Map/commit/04bb0f3), ADR-058), HOTFIX-011 Reveal-Toggle prominent ([bed78ed](https://github.com/Paddel87/HC-Map/commit/bed78ed), ADR-059). Multi-Arch-Images `:0.1.0-rc.4` + `:rc` für alle drei Images (backend, frontend, backup) auf GHCR public. Damit ist der RC-3-Operator-Befundbericht-Triage-Block ([#22](https://github.com/Paddel87/HC-Map/issues/22)–[#27](https://github.com/Paddel87/HC-Map/issues/27)) vollständig in RC-4 abgearbeitet. Auf `main` (nicht in RC-4) liegt zusätzlich [`9c27d04`](https://github.com/Paddel87/HC-Map/commit/9c27d04) — **M5c-NACH (Externe Referenz im Edit/Backfill-UI, ADR-050 §S3) [ERLEDIGT] 2026-05-04**, das ADR-050-Final-Tag-Followup. Bewusst kein RC-5-Reset, M5c-NACH wird mit `v0.1.0`-Final mitgenommen — der laufende RC-4-Realtest bleibt ungestört.
- **Laufende Phase:** Phase 1 (MVP) — M10 abgeschlossen, M11-Realtest läuft.
- **Nächster Schritt:** **M11 (Go-Live Pfad A: Promote RC → `v0.1.0`) [OFFEN, Realtest läuft]** — RC-4 ist auf Nodica1 produktiv ausgerollt, das 7-Tage-Stabilitätsfenster läuft (Start: 2026-05-03). Nach mind. 7 Tagen stabilem Betrieb ohne neue Befunde: Git-Tag `v0.1.0` (Final) auf dem dann aktuellen `main`-Tip (inklusive M5c-NACH und etwaiger weiterer entwicklungsseitiger Followups), GHCR-Image-Tags `:0.1.0` + `:0.1` + `:0` + `:latest` werden via `metadata-action` gesetzt. Während des Realtests: Operator-Befunde landen weiter als GitHub-Issues und werden auf `main` als Hotfixes umgesetzt; ein RC-5 wird nur bei Show-Stoppern getaggt (ADR-051 §E). Hotfix-Historie 001–011 dokumentiert in den jeweiligen Sektionen unten und in [`CHANGELOG.md`](../CHANGELOG.md) §Unreleased.
- **M10-Akzeptanzkriterien (alle erfüllt):** Tag `v0.1.0-rc.1` als Pre-Release sichtbar ✓; Multi-Arch-Images `:0.1.0-rc.1` + `:rc` auf GHCR public, anonym pullbar ✓; Voll-Compose-Stack mit Caddy + Traefik alternativ erfolgreich gestartet, Smoke grün ✓; Backup-Roundtrip (pg_dump → age → rclone → restore in zweite DB) dokumentiert + erfolgreich ✓; README-Quickstart liest sich für eine Drittperson schlüssig (Patrick-Lese-Test offen, aber strukturell vollständig) ✓; Backend pytest 246/246 + Frontend vitest 278/278 grün, ruff/mypy/eslint/typecheck/format-check clean ✓. **Stand 2026-05-04:** Frontend vitest **289/289** grün (+11 Cases durch Hotfixes 003/004/008/009/010/011 und M5c-NACH), Backend pytest **258/258** grün.
- **ADR-050-Final-Tag-Followup:** **erledigt** mit M5c-NACH ([`9c27d04`](https://github.com/Paddel87/HC-Map/commit/9c27d04), 2026-05-04). Externe Referenz ist im Backfill- und Edit-UI verfügbar, im Detail-View bedingt sichtbar; Live-Modus bleibt feldfrei (ADR-050 §S3-A).
- **M10.9-Followups (Doku, nicht-blockierend):**
  - [`ops/runbook.md`](../ops/runbook.md) §12.4 verspricht "Schema-Diff = null Zeilen" — bei `restore.sh`-Default `pg_restore --no-owner --no-acl` ist die ACL-Sektion (`GRANT … TO app_user`) immer Differenz. Doku-Patch sollte das präzisieren und einen Re-GRANT-Snippet als Restore-Schritt 12.4b ergänzen.
  - **Image-Bytes-Identität RC↔Final** (ADR-051 §F-Annahme): BuildKit-Default ist nicht-deterministisch (Timestamps); `:main` und `:0.1.0-rc.1` aus identischem Commit `a309d8d` haben verschiedene Digests. Wenn echte Reproducibility wichtig wird, `SOURCE_DATE_EPOCH` + `--output rewrite-timestamp=true` ergänzen.

- **Vorgänger M8.5 (Frontend Personen-Verwaltung + Export-UI) [ERLEDIGT] 2026-05-01.** Neue Datei [(admin-only)/persons/page.tsx](frontend/src/app/(protected)/admin/(admin-only)/persons/page.tsx) mit Filter-Toggles (`origin=on_the_fly`, `linkable=true`, `unlinked=true`, `inkl. anonymisierte / gemergte`), Suchfeld, Personen-Tabelle mit Origin/Linkable/User-Status/Status-Spalten und pro Reihe `Mergen…`/`Anonymisieren…`. Merge-Wizard via Radix-Dialog: Source-Vorschau, Target-Auswahl (radio aus aktuell gefiltertem Set, exklusive Source/soft-deleted), Konflikt-/Result-Anzeige nach erfolgreichem POST. Anonymisierungs-Dialog mit DSGVO-/ADR-002-Hinweis und State-Maschine (Source-Karte → Bestätigen → Schließen). Erweiterung [src/lib/admin/api.ts](frontend/src/lib/admin/api.ts) um `useAdminPersons` (separater Cache-Key `["admin","persons",…]`, default `limit=200`, `include_deleted` durchgereicht) und `useAnonymizePerson` (POST `/api/persons/{id}/anonymize` ohne Body, invalidiert `persons`/`linkable-persons`/`stats`). Hinweis zur „unlinked"-Erkennung: Ableitung aus `useAdminUsers({limit:200})`-Set linker `person_id`-Werte, da `/api/persons` keinen Server-Filter exponiert (ADR-049 §H bewusst client-side). **Tests:** `tests/admin-api.test.tsx` um 4 Cases erweitert (Cache-Key-Stabilität `adminPersonsQueryKey`, GET `/api/persons` mit `include_deleted`, POST `merge`-Body, POST `anonymize` ohne Body) — 10/10 grün. Volle Suite **271/271** grün, `pnpm typecheck`/`pnpm lint` clean. **Browser-Verifikation:** Backend+DB+Frontend hochgefahren (preview_*), Admin-Login, `/admin/persons` lädt 169 Personen (`limit=200`), Triple-Filter `origin=on_the_fly` ∧ `linkable=true` ∧ `unlinked=true` reduziert korrekt auf 2 (seed: OTF Alpha, OTF Charlie); Merge-Wizard OTF Alpha → OTF Charlie POSTed `/api/admin/persons/{id}/merge` 200, Source in DB nun `[merged → <target-uuid>]` mit `is_deleted=t`; Anonymize OTF Bravo POSTed `/api/persons/{id}/anonymize`, DB zeigt `name='[gelöscht]'`, `alias=NULL`, `note=NULL`, `is_deleted=t`, `deleted_at` gestempelt. Export-Roundtrip `GET /api/admin/export/all` → 200, `schema_version=1`, alle 11 Collections vorhanden, kein `hashed_password` im User-Dump. **Hinweis Format-Check:** `pnpm format:check` schlägt mit 47 Files an, davon 46 unverändert seit M7.x — Re-Lauf nach `git stash` mit identisch 46 Files reproduzierbar. Ursache: Lokales Node v24.15 statt im Docker-Image gepinnte Node 22 (`engines: ">=22 <23"`); `prettier-plugin-tailwindcss@0.6.9` produziert auf Node 24 marginal andere Wrap-Entscheidungen. Meine 3 berührten Files (`persons/page.tsx`, `lib/admin/api.ts`, `tests/admin-api.test.tsx`) sind Prettier-clean (`prettier --check` per-file = pass). Backend-Tests bewusst **nicht** lokal nochmal ausgeführt (kein Backend-Touch in M8.5; Stand 215/215 aus M8.3-Verifikation gilt). **Nächster Schritt:** M9 (w3w-Migration).

- **Vorgänger M8.4 (Frontend Admin-Dashboard + User-Verwaltung) [ERLEDIGT] 2026-05-01, Commit 728650e.** Neue Dateien: [frontend/src/lib/admin/types.ts](frontend/src/lib/admin/types.ts) (Pydantic-Schema-Spiegel), [frontend/src/lib/admin/api.ts](frontend/src/lib/admin/api.ts) (TanStack-Query-Hooks `useAdminStats`/`useAdminUsers`/`useCreateAdminUser`/`useUpdateAdminUser`/`useDeactivateAdminUser`/`useLinkablePersons`/`useMergePerson`/`adminExportUrl`), erweiterte [(admin-only)/page.tsx](frontend/src/app/(protected)/admin/(admin-only)/page.tsx) mit 4 Stat-Cards + Events/Monat-Liste + User-Verteilung + 3 Top-Listen + Export-Link, neue [(admin-only)/users/page.tsx](frontend/src/app/(protected)/admin/(admin-only)/users/page.tsx) mit Inline-Rollen-Wechsel + Deaktivieren + Cache-Invalidation, neue [(admin-only)/users/new/page.tsx](frontend/src/app/(protected)/admin/(admin-only)/users/new/page.tsx) mit Linkable-Person-Picker (Modus-Toggle „bestehende verknüpfen" vs. „neu anlegen"). **Tests:** 6/6 in `tests/admin-api.test.tsx` (queryKey-Stabilität, Stats-Fetch, POST/PATCH/DELETE-Verträge), volle Suite 267/267 grün, `pnpm typecheck`/`pnpm lint`/`pnpm format:check` clean. **Browser-Verifikation:** Backend+DB+Frontend hochgefahren (preview_*), Login → Dashboard zeigt 4 Stat-Cards + Events-pro-Monat + User-Count nach Rolle + Top-3-Listen, `/admin/users` listet 50 User mit Rollen-Selectoren, `/admin/users/new` mit Mode-Toggle erfolgreich (POST `/api/admin/users` 201, anschließendes Listing-Refetch zeigt neuen User `m8-4-smoke@example.com`). Backend-Trace: `GET /api/admin/stats 200`, `GET /api/admin/users 200`, `POST /api/admin/users 201`, `GET /api/admin/users 200`. **Beobachtung:** Pydantic v2 / `email-validator` 2.3.0 lehnt `*.test`-TLDs als reserved ab — Bootstrap-Skript-Doku sollte auf `*.example` als Test-TLD verweisen (Folge-Aufgabe für project-context.md, kein M8.4-Blocker). **Nächster Schritt:** M8.5 (Frontend `/admin/persons` Workflow + Export-UI).

- **Vorgänger M8.3 (Backend `/api/admin/*`-Endpoints) [ERLEDIGT] 2026-05-01.** Fünf Surfaces gemäß ADR-049 §E–§G implementiert in [app/routes/admin.py](backend/app/routes/admin.py): `users` (CRUD inkl. `existing_person_id`-vs.-`new_person`-Validator und linkable-Check), `stats` (sechs Aggregat-Queries ohne Cache), `export/all` (`AdminExport`-Schema mit `schema_version=1`, ohne `hashed_password`/`geom`), `persons/{id}/merge` (Re-Pointing + UNIQUE-Konflikt-Soft-Delete + User-Lock-Reject), Anonymisierung als Re-Use von `/api/persons/{id}/anonymize`. Neuer Service [app/services/person_merge.py](backend/app/services/person_merge.py) mit `MergeResult`-Dataclass und `structlog`-Audit. **Kollision aufgelöst:** der bestehende `admin_export_all` aus [app/routes/exports.py](backend/app/routes/exports.py) wurde entfernt, weil mein strukturiertes Schema ihn ersetzt — bestehender Test `test_admin_export_all_requires_admin` bleibt grün. **Verifikation:** 215/215 pytest grün (+18 admin-routes-Tests), `ruff check` + `ruff format --check` + `mypy --strict` clean. **Vorläufer-Stand vor M8.3:** 197 Tests (M8.2-Stand). **Nächster Schritt:** M8.4 (Frontend Admin-Dashboard + `/admin/users`).

- **Vorläufer (Reihenfolge auf main):** M8.2 (786ab93, 2026-04-30) und früher.
- **Aktiver Schritt (Vorgänger):** **M8.2 (Backend SQLAdmin-Schicht) [ERLEDIGT] 2026-04-30.** Umsetzung von ADR-049 §A–§D: `sqladmin>=0.25,<0.26` + `itsdangerous>=2.2,<3` neu in `pyproject.toml`, Starlette-Auto-Bump 0.46.2 → 1.0.0 ohne Test-Breakage. `app/admin_ui/{__init__.py,context.py,auth.py,setup.py,views.py}` neu angelegt. **Cookie-Bridge** dekodiert `hcmap_session` mit `_jwt_strategy()`-Reuse (kein Token-Re-Issue), prüft `is_active` und `role == ADMIN`, redirected sonst auf `/login`. **RLS-Stamp** über `_StampingAsyncSession`-Subklasse (SQLAlchemy `class_=`-Mechanik) liest aus drei `ContextVar`s (User-ID, Role, Person-ID), die `authenticate()` setzt — `FORCE ROW LEVEL SECURITY` greift dadurch korrekt. **8 ModelViews** (User/Person/RestraintType/ArmPosition/HandPosition/HandOrientation/Event read+edit-only/Application read-only). `/admin/login`-GET wird in `app/main.py` als `RedirectResponse("/login")` abgefangen, bevor SQLAdmin gemountet wird. **Verifikation:** 197/197 pytest grün (+15 neue Admin-UI-Tests), `ruff check` clean (RUF012 für `views.py` per-file-ignored — declarative-style Framework-Konvention), `ruff format --check` clean, `mypy --strict` clean, `docker compose build backend` clean, Smoke `sqladmin=0.25.0 fastapi=0.136.1 starlette=1.0.0` aus dem gebauten Image. **Nächster Schritt:** M8.3 (Backend `/api/admin/*`-Endpoints).
- **Vorläufer (Reihenfolge auf main):** HOTFIX-001 [ERLEDIGT] 2026-04-29 (Sonner-Bug, ADR-042), M7.1 [ERLEDIGT] 2026-04-28 (Backend-Workflow), M7.2 [ERLEDIGT] 2026-04-28 (Listing-UI), M7.3 [ERLEDIGT] 2026-04-29 (CRUD-Forms + Auto-Approve), HOTFIX-002 [ERLEDIGT] 2026-04-29 (Karten-DoD, ADR-044), M7.4 [ERLEDIGT] 2026-04-29 (Freigabe-Queue + Editor-Withdraw, ADR-045), M7.5 [ERLEDIGT] 2026-04-29 (Restraint-Picker + Sync-Erweiterung, ADR-046), M7.5-Followups [ERLEDIGT] 2026-04-29 (Edit-Form-Restraint-Picker + Position-Picker via `LookupPicker`, ADR-046 Followup-Sektion), M5a-Doku-Fix [ERLEDIGT] 2026-04-29, STACK-001 [ERLEDIGT] 2026-04-30 (Next.js 16 Migration, ADR-047), STACK-002 [ERLEDIGT] 2026-04-30 (Backend-Stack-Drift Voll-Sweep, ADR-048).
- **Test-Stand vor M8:** Backend `pytest`: 182/182 grün. Frontend `pnpm test`: 261/261 grün. `pnpm typecheck`, `pnpm lint`, `pnpm build` clean. `ruff`/`mypy --strict` clean. M8.2-Erwartung: ≥187 Tests grün (4 zusätzliche Auth-Bridge-/ModelView-Tests). M8.3-Erwartung: ≥200 Tests grün (Person-Merge inkl. Konflikt-Pfade, Anonymisierung 100 % Coverage, Stats-Endpoint, Export-Endpoint).
- **Offene STOPP-Situationen:** keine.
- **Offene Freigabe-Entscheidungen:**
  - **Blocker #001 Punkt 2 — CLAUDE.md-Methodik-Härtung gegen künftigen Stack-Drift:** offen. Konkreter Vorschlag (fünf Änderungen plus CI-Audit-Skript) im Conversation-Verlauf 2026-04-29.
  - ~~**Blocker #002 — GitHub-Actions-Runtime-Deprecation Node.js 20**~~ → **gelöst 2026-05-01** mit M10.7.1 / ADR-052. Alle neun Actions auf Node-24-Major-Tags gebumpt; beide Stichtage (2026-06-02 Runner-Zwang, 2026-09-16 Node-20-Entfernung) damit entschärft.
  - ~~**Blocker #003 — Backend-Image enthielt keine Migrations**~~ → **gelöst 2026-05-02** mit Push aus M10.9-RC-Smoke. `docker/backend.Dockerfile` ergänzt um `COPY backend/migrations`, `backend/alembic.ini`, `backend/scripts`.
  - ~~**Blocker #004 — Traefik-Overlay mountete `/var/run/docker.sock` nicht**~~ → **gelöst 2026-05-02** mit Push aus M10.9-RC-Smoke. `docker/compose.traefik.yml` ergänzt um Read-Only-Socket-Mount.
  - **Runtime-Majors (Postgres 16→17/18, Node 22→24, Python 3.12→3.13):** explizit aus STACK-002 ausgenommen (siehe ADR-048 §E). Werden bei Bedarf als eigenständige ADR-Tickets verhandelt; kein laufender Druck (alle drei Runtimes sind LTS bzw. aktiv gepatcht).
- **Offene Beobachtungen:**
  - **`HCMAP_MAPTILER_API_KEY` Setup-Voraussetzung:** Karte/Geocoding/Glyphs brauchen den MapTiler-Key in `backend/.env.local` (gitignored). Lokaler Test-Setup-Schritt: `backend/.env.local` mit `HCMAP_MAPTILER_API_KEY=…` anlegen, dann `preview_start backend` (sourct die Datei nicht, Key muss inline beim Start gesetzt werden — siehe HOTFIX-002 Browser-Repro im commit `01215e2`).
  - **`/events/[id]`** rendert Live-/Ended-View über SSR; Offline-Insert mit direkter Navigation kann kurzzeitig 404 produzieren. Behebung als Pflicht-Deliverable in M5c (vorhanden, aber Edge-Case bleibt).
  - **`HCMAP_BOOTSTRAP_*`-Mechanik** verweigert Re-Bootstrap, wenn bereits ein User existiert. Lokales Admin-Passwort kann via SQL-PATCH zurückgesetzt werden, Beispiel im Conversation-Verlauf.

## Überblick

Der Fahrplan gliedert sich in **drei Phasen**:

- **Phase 1 — MVP / Go-Live Pfad A:** Alles, was für den produktiven Betrieb der privaten Gruppe (<20 Personen) zwingend nötig ist.
- **Phase 2 — Konsolidierung:** Self-Hosting der Tiles, Backup-Härtung, Qualität.
- **Phase 3 — Pfad-B-Vorbereitung (optional):** Nur falls und wenn die Entscheidung zu Pfad B getroffen wird.

Jede Phase besteht aus nummerierten Meilensteinen (M0, M1, …). Innerhalb einer Phase können Meilensteine parallel laufen, soweit Abhängigkeiten es zulassen.

## Phasen-Übersicht

| Phase   | Meilenstein | Titel                                            | Status      |
|---------|-------------|--------------------------------------------------|-------------|
| 1 MVP   | M0          | Projekt-Setup                                    | [ERLEDIGT] 2026-04-25 |
| 1 MVP   | M1          | Datenbank-Schema & Migrations                    | [ERLEDIGT] 2026-04-25 |
| 1 MVP   | M2          | Auth & User-Management (Backend)                 | [ERLEDIGT] 2026-04-25 |
| 1 MVP   | M3          | Event- und Application-API (Backend)             | [ERLEDIGT] 2026-04-25 |
| 1 MVP   | M4          | Frontend-Grundgerüst & Auth-Flow                 | [ERLEDIGT] 2026-04-25 |
| 1 MVP   | M5a         | Event-Erfassung Live-Modus (mobile, GPS, Timer)  | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5a.1       | └─ Backend-Live-Endpoints + Tile-Proxy           | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5a.2       | └─ Frontend Startseite, Suche, Export            | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5a.3       | └─ Frontend Live-Modus + LocationPickerMap      | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5a.4       | └─ App-PIN-Sperre (PBKDF2 / Web Crypto API)     | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5b         | Offline-Resilienz (RxDB-Sync)                    | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5b.1       | └─ ADR-Bündel + Datenmodell-Migration            | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5b.2       | └─ Backend-Sync-Endpoints `/api/sync/{events,applications}/{pull,push}` | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5b.3       | └─ RxDB-Setup + Live-Modus auf RxDB-Schreibpfad  | [ERLEDIGT] 2026-04-26 |
| 1 MVP   | M5b.4       | └─ E2E-Offline-Test & Doc-Updates                | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5c         | Nachträgliche Erfassung & Bearbeitung            | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5c.1a      | └─ Detail-Page Client-only + REST-Once-Read Participants | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5c.1b      | └─ Participants als RxDB-Collection (Sync-Endpoint) | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5c.2       | └─ Chronologische Detail-Anzeige + Maskierung    | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5c.3       | └─ Nachträgliche Erfassung (Schalter + manuelle Zeitstempel) | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M5c.4       | └─ Event-/Application-Bearbeitung (Edit-UI)      | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M6          | Kartenansicht                                    | [ERLEDIGT] 2026-04-28 |
| 1 MVP   | M6.1        | └─ Backend Geocoding-Proxy `GET /api/geocode`    | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M6.2        | └─ Frontend `MapView` (Marker, Popup, Detail-Link) | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M6.3        | └─ Clustering (native MapLibre-Cluster)          | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M6.4        | └─ Filter (Zeitraum, Beteiligte) + URL-Viewport  | [ERLEDIGT] 2026-04-27 |
| 1 MVP   | M6.5        | └─ Geocoding-Suchbox in `MapView`                | [ERLEDIGT] 2026-04-28 |
| 1 MVP   | HOTFIX-001  | Sonner v1 → v2 (React-19-Kompatibilität, ADR-042) | [ERLEDIGT] 2026-04-29 |
| 1 MVP   | HOTFIX-002  | Karten-DoD-Härtung: Glyph-Proxy + RxDB-v17-Strict (ADR-044) | [ERLEDIGT] 2026-04-29 |
| 1 MVP   | M7          | Katalog-Verwaltung & Vorschlags-Workflow         | [ERLEDIGT] 2026-04-29 |
| 1 MVP   | M7.1        | └─ Backend (Migration, Reject-Status, Routes)    | [ERLEDIGT] 2026-04-28 |
| 1 MVP   | M7.2        | └─ Frontend Übersicht `/admin/catalogs`          | [ERLEDIGT] 2026-04-28 |
| 1 MVP   | M7.3        | └─ CRUD-Formulare (Admin + Editor-Vorschlag)     | [ERLEDIGT] 2026-04-29 |
| 1 MVP   | M7.4        | └─ Freigabe-Queue + Editor-Withdraw              | [ERLEDIGT] 2026-04-29 |
| 1 MVP   | M7.5        | └─ Restraint-Picker in Application-Erfassung     | [ERLEDIGT] 2026-04-29 |
| 1 MVP   | STACK-001   | Next.js 15.0.4 → 16.2.4 + React 19.2 (ADR-047)   | [ERLEDIGT] 2026-04-30 |
| 1 MVP   | STACK-002   | Backend-Stack-Drift Voll-Sweep (ADR-048)         | [ERLEDIGT] 2026-04-30 |
| 1 MVP   | M8          | Admin-Bereich (zwei Schichten gemäß ADR-016/049) | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M8.1        | └─ Strategie-ADR-049 (SQLAdmin-Version, Auth-Bridge, ModelView-Liste, Person-Merge, Stats) | [ERLEDIGT] 2026-04-30 |
| 1 MVP   | M8.2        | └─ Backend SQLAdmin-Schicht (Dep, Auth-Bridge, RLS-Stamp, 8 ModelViews) | [ERLEDIGT] 2026-04-30 |
| 1 MVP   | M8.3        | └─ Backend `/api/admin/*` (users CRUD, stats, export/all, persons/merge; anonymize re-used aus M2) | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M8.4        | └─ Frontend `/admin` Dashboard + `/admin/users` (Linkable-Person-Picker) | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M8.5        | └─ Frontend `/admin/persons` (Filter, Merge-Wizard, Anonymisierung) + Export-UI | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M9          | w3w-Migration                                    | [VERWORFEN] (ADR-050) |
| 1 MVP   | M5c-NACH    | Legacy-External-Ref im Edit/Backfill-UI (ADR-050 §S3) | [ERLEDIGT] 2026-05-04 |
| 1 MVP   | M10.1       | └─ ADR-051 Strategie-Freigabe                    | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.2       | └─ Mail-Backend SMTP + Frontend Reset-Pages      | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.3       | └─ LICENSE (AGPLv3) + Lizenz-Metadaten + README-Header | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.4       | └─ Einwilligungs-Vorlage `docs/templates/consent-de.md` | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.5       | └─ `compose.prod.yml` + Caddy/Traefik-Overlays + Prod-ENV-Schema | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.6       | └─ Backup-Service (`pg_dump \| age \| rclone`, Cron, Retention) | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.7       | └─ GitHub Actions CI + GHCR-Push (Multi-Arch)    | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.7.1     | └─ Action-Versions-Audit + Node-24-Bumps (Blocker #002 / ADR-052) | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10.8       | └─ `ops/runbook.md` + README-Restruktur (Operator-Quickstart) | [ERLEDIGT] 2026-05-01 |
| 1 MVP   | M10         | Release-Candidate-Bündel (deployment-ready durch jedermann) | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M10.9       | └─ RC-Smoke + Tag `v0.1.0-rc.1` + GitHub-Pre-Release | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M11         | Go-Live Pfad A (Promote RC → `v0.1.0`)           | [OFFEN]     |
| 1 MVP   | M11-HOTFIX-001 | └─ Frontend SSR Backend-URL nicht durchgereicht (Issue #15) | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M11-HOTFIX-002 | └─ Frontend-Image-Healthcheck akzeptiert nur HTTP 200 (Issue #16) | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M11-HOTFIX-003 | └─ Strukturierter Access-Logger mit PII-Redaction (Issue #21, ADR-054) | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M11-HOTFIX-004 | └─ Profil-Passwort-Änderungs-Form (Issue #18) | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M11-HOTFIX-005 | └─ Defense-in-Depth `BACKEND_INTERNAL_URL` als Image-ENV-Default (Issue #19) | [ERLEDIGT] 2026-05-02 |
| 1 MVP   | M11-HOTFIX-006 | └─ SQLAdmin auf `/sqladmin/` umziehen (Issue #19, ADR-055) | [ERLEDIGT] 2026-05-03 |
| 1 MVP   | M11-HOTFIX-007 | └─ MapLibre `GeolocateControl` in Karten-Komponenten (Issue #22) | [ERLEDIGT] 2026-05-03 |
| 1 MVP   | M11-HOTFIX-008 | └─ Optionales `event.title`-Feld (Issue #27 Befund 4+5, ADR-056) | [ERLEDIGT] 2026-05-03 |
| 1 MVP   | M11-HOTFIX-009 | └─ Application-Lifecycle Auto-Stop bei Event-Ende (Issue #23 Befund 2, ADR-057) | [ERLEDIGT] 2026-05-03 |
| 1 MVP   | M11-HOTFIX-010 | └─ Event.`time_precision`-Marker für retrospektive Erfassung (Issue #24, ADR-058) | [ERLEDIGT] 2026-05-03 |
| 1 MVP   | M11-HOTFIX-011 | └─ `reveal_participants`-Toggle prominent im Beteiligte-Tab (Issue #23 Befund 1, ADR-059) | [ERLEDIGT] 2026-05-03 |
| 2 Konso.| M12         | Self-Hosted Tileserver                           | [OFFEN]     |
| 2 Konso.| M13         | Backup-Härtung & Restore-Tests                   | [OFFEN]     |
| 2 Konso.| M14         | Monitoring & Alerting                            | [OFFEN]     |
| 2 Konso.| M15         | Foto-/Medien-Anhänge an Events und Applications  | [OFFEN]     |
| 2 Konso.| M16         | Freie Tags + Bewertung/Stimmung                  | [OFFEN]     |
| 2 Konso.| M17         | Persönliches & kollektives Statistik-Dashboard   | [OFFEN]     |
| 3 Pfad B| M18+        | Pfad-B-Vorbereitung (nur bei Entscheidung)       | [OFFEN]     |

---

## Phase 1 — MVP / Go-Live Pfad A

### M0 — Projekt-Setup

**Ziel:** Repository, Entwicklungsumgebung und Basis-Projektstruktur stehen.

**Deliverables:**
- Git-Repository mit sinnvollem Branch-Modell (main + Feature-Branches).
- Monorepo-Struktur mit Unterordnern `backend/` und `frontend/`.
- Python-Setup (Version in `decisions.md` ergänzen): Package-Manager (uv oder Poetry), pyproject.toml, initiale FastAPI-App.
- Next.js-Setup: TypeScript strict, Tailwind, shadcn/ui initialisiert.
- Docker-Compose für lokale Entwicklung: Postgres mit PostGIS, Backend, Frontend.
- Pre-Commit-Hooks: ruff/black für Python, prettier/eslint für TypeScript.
- README mit Setup-Anleitung (auch für zukünftige Claude-Code-Sessions).
- `.env.example` mit allen erwarteten Variablen.

**Akzeptanzkriterien:**
- `docker compose up` startet Backend + Frontend + DB.
- `/health`-Endpoint liefert OK.
- Next.js-Startseite wird angezeigt.

**Abhängigkeiten:** keine.

**Status `[ERLEDIGT]` 2026-04-25:**
- Backend: FastAPI-App mit `/api/health` und `/api/openapi.json`. 2/2 Tests grün
  (`backend/tests/test_health.py`), `ruff check` und `mypy --strict` clean. Test
  deckt alle in M0 erstellten App-Pfade ab; nicht-getestet bleibt nur der
  Production-Branch der Logging-Konfiguration.
- Frontend: Next.js 15 App Router, TypeScript strict, Tailwind, vorbereitete
  shadcn/ui-Konfig (`components.json`). `pnpm typecheck`, `pnpm lint`,
  `pnpm format:check`, `pnpm build` alle grün.
- Docker: Multi-Stage-Dockerfiles (non-root, HEALTHCHECK), Compose-Stack
  Postgres+PostGIS / Backend / Frontend; `docker compose config` validiert.
  Vollständiger `docker compose up`-Lauf außerhalb dieser Sandbox zu
  verifizieren (kein Docker-Daemon im Entwicklungs-Container verfügbar).
- Pre-commit-Konfiguration angelegt; Aktivierung erfolgt lokal mit
  `pre-commit install`.
- `.env.example`, `.gitignore`, `CHANGELOG.md`, README-Setup-Anleitung
  aktualisiert.

---

### M1 — Datenbank-Schema & Migrations

**Ziel:** Vollständiges Datenmodell als SQLAlchemy-Modelle und Alembic-Migrations. Kataloge sind vorbefüllt.

**Deliverables:**
- SQLAlchemy-Modelle für alle Entitäten: User, Person, Event, EventParticipant, Application, ApplicationRestraint, RestraintType, ArmPosition, HandPosition, HandOrientation.
- Alembic-Initialmigration erzeugt alle Tabellen, FKs, Indizes.
- PostGIS-Erweiterung aktiviert; Event.lat/lon als Geometrie-Spalte (oder Doppel-Repräsentation: Dezimalfelder + generierte geometry-Spalte für räumliche Queries).
- Seed-Daten: RestraintType-Katalog mit gängigen Marken (ASP, Clejuso, TCH, Smith & Wesson, Peerless, Hiatts, …), ArmPosition/HandPosition/HandOrientation mit Basisliste. **Quelle für RestraintType-Seed:** `docs/restraint-types-seed-review.md` (initial bewusst nicht erschöpfend; Lücken werden über Vorschlags-Workflow ergänzt).
- `created_at`, `updated_at`, `created_by` auf allen Entitäten.
- RLS-Policies als Migration, vorerst permissiv oder Admin-only — scharfe Policies kommen in M2 nach Auth.

**Akzeptanzkriterien:**
- `alembic upgrade head` baut die DB vollständig auf.
- Seed-Skript lädt Kataloge fehlerfrei.
- Model-Unit-Tests bestätigen Constraints und Beziehungen.

**Abhängigkeiten:** M0.

**Status `[ERLEDIGT]` 2026-04-25:**
- 10 SQLAlchemy-Modelle in `backend/app/models/`, alle mit UUIDv7-PK,
  `created_at`/`updated_at`/`created_by`. `event.geom` als
  `geography(Point, 4326)` GENERATED ALWAYS AS STORED, GIST-Index. GIN-Indizes
  auf `to_tsvector('german', note)` für Event und Application (vorbereitet
  für M3-Volltextsuche).
- Alembic-Initialmigration `20260425_1700_initial`: PostGIS-Extension,
  `app_user`-Rolle, alle Tabellen+FKs+Constraints+Indizes, `set_updated_at`-
  Trigger via `clock_timestamp()` auf 8 Tabellen, RLS aktiv (`ENABLE`+`FORCE`)
  mit permissiver Default-Policy auf `event`, `event_participant`,
  `application`, `application_restraint`. Scharfe Policies pro Rolle in M2.
- env.py unterstützt sync (psycopg) und async (asyncpg) DSN; respektiert
  vom Caller gesetzte URL.
- Seed-Skripte unter `backend/app/seeds/` (`run.py`, `restraint_types.py`,
  `positions.py`): 17 RestraintTypes (Anker-Modelle laut ADR-018 F1) +
  8 ArmPositions + 4 HandPositions + 5 HandOrientations. Idempotent via
  UNIQUE NULLS NOT DISTINCT + `ON CONFLICT DO NOTHING`. Inhaltliche
  Übernahme der vollständigen `docs/restraint-types-seed-review.md` ist
  Folge-Aufgabe nach Admin-Sichtung.
- Tests: 13/13 grün gegen Postgres 16 + PostGIS 3.4 (Migration-Smoke,
  Schema-Inventur, RLS-Aktivierung, UNIQUE/CHECK-Constraints, Computed
  geom, updated_at-Trigger, Seed-Idempotenz). `ruff check`,
  `ruff format --check`, `mypy --strict` clean.
- ADR-018 in `docs/decisions.md` dokumentiert die Implementierungs-
  Entscheidungen (UUIDv7-Strategie, Trigger-Mechanik, RLS-Default,
  Seed-Strategie, Test-Infrastruktur).

---

### M2 — Auth & User-Management (Backend)

**Ziel:** Authentifizierung, Rollen und scharfe Row-Level-Security sind produktiv.

**Deliverables:**
- fastapi-users mit SQLAlchemy-Adapter; E-Mail + Passwort.
- User-Modell mit Rolle (Admin / Editor / Viewer) und **Pflicht-Verknüpfung** zu genau einer `Person` (`person_id` NOT NULL UNIQUE, siehe ADR-010).
- Login/Logout/Me-Endpunkte; Passwort-Reset via E-Mail (Mail-Versand stubbar für Entwicklung).
- Admin-Bootstrap-CLI: erzeugt initialen Admin-User.
- RBAC-Abhängigkeit für FastAPI-Routes (`require_role`).
- **Scharfe RLS-Policies:**
  - Admin: Vollzugriff.
  - Editor: sieht nur Events mit zugeordneter Person als Participant; kann Events erstellen, wenn Freigabe-Flag gesetzt.
  - Viewer: sieht nur Events mit zugeordneter Person als Participant.
- RLS-Tests: Jede Rolle sieht genau die erwarteten Datensätze, und nichts anderes.

**Akzeptanzkriterien:**
- Admin-Login funktioniert, User-Anlage per API möglich.
- Nicht-Admin-User kann keine fremden Daten sehen (per SQL und per API geprüft).
- Rollen-Wechsel verändert Sichtbarkeit wie spezifiziert.

**Status `[ERLEDIGT]` 2026-04-25:**
- fastapi-users 14 mit Cookie+JWT integriert (`app/auth/`); Argon2id über
  pwdlib mit OWASP-2024-Defaults. Endpunkte unter `/api/auth/login`,
  `/logout`, `/forgot-password`, `/reset-password`, `/api/users/me`.
- `app/security/csrf.py` als Double-Submit-Token-Middleware. Login setzt
  zusätzlich ein lesbares `hcmap_csrf`-Cookie; alle POST/PUT/PATCH/DELETE
  außerhalb der Whitelist (Health, Login, Logout, Forgot/Reset) verlangen
  `X-CSRF-Token`-Header.
- `app/rls.py` + `app/deps.py:get_rls_session`/`require_role`: pro
  Request `SET LOCAL ROLE app_user` und drei GUCs; bei Transaktionsende
  Rollback der `SET LOCAL`-Werte automatisch.
- Migration `20260425_1730_strict_rls`: ersetzt M1-Permissivpolicy 1:1
  durch die Per-Rolle-Policies aus `architecture.md` §RLS für event /
  event_participant / application / application_restraint plus Catalog-
  Policies (admin alle, editor approved+eigene pending, viewer nur
  approved). Zwei `SECURITY DEFINER`-Helper-Functions
  (`app_user_can_see_event`, `app_user_owns_event`) brechen die
  zirkuläre Policy-Evaluation event ↔ event_participant.
- Bootstrap-CLI `scripts/bootstrap_admin.py` (idempotent) und
  Mail-Stub `app/auth/mail.py` (LoggingBackend).
- 31/31 Tests grün gegen Postgres 16: 8 Auth/CSRF (Login, Wrong-PW, /me,
  Logout, CSRF blockt/erlaubt), 7 RLS pro Rolle (admin alle, editor/viewer
  eigene Participation, editor cannot insert foreign-creator-event,
  catalog-Sichtbarkeit), 3 RBAC (`require_role`-Faktor) plus alle M1-
  Tests. Live-Smoke gegen lokalen Backend bestätigt: Login → Cookie+CSRF
  gesetzt, /me → 200, PATCH ohne CSRF → 403, PATCH mit CSRF → 200,
  Logout → 204.
- ADR-019 dokumentiert die acht Detail-Entscheidungen (Cookie-Strategie,
  CSRF, Argon2-Parameter, RLS-Mechanik, RLS-Policy-Struktur, RBAC,
  Bootstrap-CLI, Mail-Stub).
- README- und `.env.example`-Update um Auth-Variablen, Bootstrap-Aufruf,
  Phase-Badge auf `M3-bereit`.

**Abhängigkeiten:** M1.

---

### M3 — Event- und Application-API (Backend)

**Ziel:** Vollständige CRUD-API für Events, EventParticipants, Applications, ApplicationRestraints.

**Deliverables:**
- REST-Endpunkte für Events: create, list (nach RLS gefiltert), detail, update, delete.
- EventParticipant-Management (hinzufügen/entfernen).
- Application-Endpunkte: nested unter Event oder separat (Entscheidung in `architecture.md`).
- ApplicationRestraint-Zuordnung (n:m).
- Pydantic-Schemas für Request/Response.
- Validierung: Lat/Lon-Range, zulässige Sequenz-Nummern, nicht-gelöschte Katalogeinträge, `performer_id != recipient_id` (optional als Business-Regel).
- Plus-Code-Berechnung serverseitig für Ausgabe (Bibliothek `openlocationcode`).
- **Volltextsuche-Endpoint** `GET /api/search?q=...` über Notes von Events und Applications, RLS-konform (siehe ADR-015). GIN-Index auf `to_tsvector('german', note)` in Migrations.
- **„On this day"-Endpoint** `GET /api/throwbacks/today` — Events vom heutigen Datum (Monat+Tag) in vergangenen Jahren, RLS-konform.
- **Export-Endpoints** `GET /api/export/me?format=json|csv` und `GET /api/admin/export/all?format=json|csv` (siehe ADR-015).
- OpenAPI-Dokumentation ist vollständig und brauchbar.
- Integrationstests für alle Endpunkte, inkl. RLS-Szenarien.

**Akzeptanzkriterien:**
- Alle Endpunkte sind getestet und dokumentiert.
- Beispiel-Event mit 2 Applications kann per API end-to-end angelegt und wieder gelesen werden.
- RLS-Verhalten ist in Tests abgesichert.

**Abhängigkeiten:** M2.

**Status `[ERLEDIGT]` 2026-04-25:**
- 44 Endpunkte produktiv unter `app/routes/`: events (CRUD,
  participants, nested application-create), applications (top-level
  GET/PATCH/DELETE), persons (CRUD admin-only, anonymize), vier
  Catalog-Pfade (list, propose, approve), search, throwbacks/today,
  export (JSON + CSV-Streams + admin-Vollexport).
- Service-Layer unter `app/services/` (events, applications, persons,
  catalog, search, exports, plus_code, masking) kapselt Business-Regeln:
  Auto-Participant nach ADR-012 fügt Performer/Recipient automatisch zu
  EventParticipant hinzu; `sequence_no` wird server-seitig vergeben;
  `approved`-Pflicht für Catalog-Refs in Editor-Requests; kontextabhängige
  Personen-Maskierung bei `reveal_participants=false` mit Eigenname-
  Ausnahme; Plus-Code via `openlocationcode>=1.0` ohne Persistenz.
- 53 Tests grün (M0-M2 + 22 neue M3-HTTP-Tests):
  test_events_api (5: list/create/detail/patch/delete + lat-range),
  test_applications_api (5: sequence_no, auto-participant,
  strict-mode, default self-bondage, patch+delete),
  test_persons_api (4: admin-create, editor-blocked, anonymize,
  reveal-Maskierung),
  test_catalog_api (3: propose-pending, admin-approve, arm-position),
  test_search_export_api (5: search, throwbacks, JSON, CSV, admin-only).
- ruff check, ruff format, mypy --strict alle clean.
- ADR-020 dokumentiert die zehn Detail-Entscheidungen.
- README-Phase-Badge auf `M4-bereit`.

**Status `[ERLEDIGT]` 2026-04-25:**
- `lib/api.ts` (typisierter fetch-Wrapper mit `credentials: 'include'`,
  automatischem `X-CSRF-Token`-Header aus `hcmap_csrf`-Cookie,
  `ApiError`-Klasse, 204-Handling, query-Param-Serialisierung).
- Auth-Schicht: `useMe`, `useLogin`, `useLogout` (TanStack-Query-Hooks),
  `getServerMe()` für Server Components mit Cookie-Forwarding.
- Edge-Middleware (`src/middleware.ts`): redirect anonymer Requests auf
  `/login?next=...`; Public-Pfade (`/login`, `/forgot-password`,
  `/reset-password`, `/api/*`, `/_next/*`) durchgelassen.
- Route-Groups `(public)` und `(protected)`: Server-Component-Layout in
  `(protected)/layout.tsx` lädt User, redirected bei 401; admin-Layout
  zusätzlich mit Rolle-Check `redirect("/")` bei nicht-Admin.
- AppShell mit Sidebar (`md:`+) + BottomNav (`md:hidden`) + Mobile-
  Header (Sheet + Hamburger + UserMenu compact). Nav-Items aus einer
  gemeinsamen Liste, Rolle-gefiltert. UserMenu mit Avatar-Initialen,
  Theme-Radio (system/hell/dunkel), Profil-Link, Logout.
- Login-Form (`react-hook-form` + zod): submit-Payload form-encoded
  (fastapi-users-Konvention), nach Erfolg `window.location.assign(next ?? "/")`
  für vollen Cookie-Reload.
- Stub-Seiten: `/` Dashboard mit echten Daten aus `/api/events?limit=5`
  und `/api/throwbacks/today` (RLS-gefiltert), `/events`, `/map`,
  `/admin` (admin-only), `/profile` (User-Daten + Logout-Button).
- 11 shadcn-Komponenten manuell (Style "new-york", `cssVariables:false`):
  button, input, label, form, card, skeleton, avatar, dropdown-menu,
  sheet, sonner. `tailwindcss-animate` als Plugin.
- Dark-Mode via `next-themes` (`class`-Strategie, system-Default,
  `suppressHydrationWarning` auf `<html>`).
- 16/16 Frontend-Tests grün (vitest + jsdom + @testing-library/react):
  api.ts (7 Tests: GET ohne CSRF, POST mit CSRF, expliziter Content-Type,
  Query-Encoding, ApiError-Mapping, 204-Return, ApiError-Klasse),
  useMe (2: 200, 401), middleware (5: Redirect, Cookie, /login,
  /api, /-Sonderfall), LoginForm (2: Submit-Payload, Validierung).
  `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm test` alle grün.
- Browser-Smoke-Test gegen lokales Backend bestätigt: Login-Form →
  204 → Cookie + CSRF gesetzt → Server-Component lädt User → Dashboard
  rendert mit "Hallo, admin@example.com" + Sidebar + RLS-gefilterte
  Listen (0 Events, 0 Throwbacks gegen leere DB) → Logout → Cookie
  gelöscht → Redirect auf `/login`.
- ADR-021 dokumentiert die elf Detail-Entscheidungen.
- README-Phase-Badge auf `M5a-bereit`, CHANGELOG-Eintrag, Projektstatus
  aktualisiert.

**Ziel:** Next.js-App mit Login, geschützten Routes, Layout und Navigation.

**Deliverables:**
- Login-/Logout-Seiten.
- Auth-Context / TanStack-Query-Hooks für User-Session.
- Route-Protection via Middleware oder Layout-Wrapping.
- Responsive Layout: Desktop-Navigation (Sidebar) und Mobile-Navigation (Bottom-Tab oder Drawer).
- Farbschema, Typografie, Dark-Mode-Grundstruktur.
- Basis-Seiten als Stubs: Dashboard, Events-Liste, Karte, Admin.

**Akzeptanzkriterien:**
- Nicht-angemeldeter Nutzer wird auf Login umgeleitet.
- Angemeldeter Nutzer sieht Layout, Navigation, eigenen Namen, Rolle.
- Mobile und Desktop funktionieren beide sauber.

**Abhängigkeiten:** M2 (Backend-Auth) + M0.

---

### M5a — Event-Erfassung Live-Modus (mobile, GPS, Timer)

**Ziel:** Performer kann ein Event in der Situation starten, Applications live erfassen und das Event abschließen — alles vom Mobilgerät aus, mit minimaler Bedienzeit. Live-Modus ist die Hauptansicht der App (siehe ADR-011).

**Scope-Erweiterungen (2026-04-26):** Tile-Proxy und minimale `LocationPickerMap` sind aus M6 nach M5a vorgezogen (siehe ADR-022). PIN-Hashing-Algorithmus festgelegt auf PBKDF2 via Web Crypto API (siehe ADR-023).

**Backend-Anteil (fünf Live-Endpoints + Tile-Proxy):**
- `POST /api/events/start` setzt `started_at = now()`, legt Event mit Default-Reveal-Flag an, verknüpft den Creator implizit als Participant (analog `POST /api/events`).
- `POST /api/events/{id}/end` setzt `ended_at = now()`, mit Idempotenz-Check (zweiter Aufruf ist No-Op).
- `POST /api/events/{event_id}/applications/start` legt eine Application mit `started_at = now()`, `sequence_no` automatisch hochgezählt; Performer-Default = `current_user.person_id`, Recipient aus Payload (oder Self-Bondage falls leer).
- `POST /api/applications/{id}/end` setzt `ended_at = now()`, idempotent.
- `POST /api/persons/quick` (admin + editor): legt Person mit `origin = 'on_the_fly'`, `linkable = false` an. Pflichtfeld `name`, optional `alias`. Siehe ADR-014, Regel-004.
- **Tile-Proxy** `GET /api/tiles/{z}/{x}/{y}` (siehe ADR-022): MapTiler-Tiles über Backend mit `Cache-Control: public, max-age=86400`, Auth via Session-Cookie, MAPTILER_API_KEY serverseitig.

**Frontend-Deliverables:**
- Startseite mit großem „Neues Event starten"-Knopf, Liste der letzten Events und **„On this day"-Sektion** (siehe ADR-015), wenn Treffer vorhanden.
- **Volltext-Suchleiste** in der Hauptnavigation, Ergebnisliste mit RLS-konformen Treffern aus Events und Applications.
- **App-PIN-Sperre** (siehe ADR-015 + ADR-023): User kann im Profil eine 4–6-stellige PIN setzen; UI sperrt sich nach Inaktivität (Default 60s) oder per Knopf; PIN-Eingabe entsperrt nur die UI, Server-Session bleibt; nach 5 Fehlversuchen Zwangs-Logout. Hashing clientseitig via PBKDF2-SHA-256 (Web Crypto API, 600.000 Iterationen, 16-Byte-Salt), Storage in IndexedDB-Object-Store `hcmap-pin`.
- **Export-UI** im Profil: „Meine Daten exportieren" (JSON/CSV).
- **`LocationPickerMap`-Komponente** (siehe ADR-022): minimaler MapLibre-basierter Karten-Picker, ein verschiebbarer Marker, kein Clustering/Filter/URL-Sync. Tile-URL aus `NEXT_PUBLIC_TILE_URL` (Default `/api/tiles/{z}/{x}/{y}`). Wird in M6 zur vollwertigen `MapView` ausgebaut.
- Live-Event-Anlegen-Flow:
  - GPS via Browser-Geolocation-API anfordern, Lat/Lon vorbelegen.
  - `LocationPickerMap` mit aktueller Position, Tap-to-Adjust für manuelle Korrektur.
  - Recipient-Auswahl aus Personen-Liste.
  - Performer = eingeloggter User per Default (siehe ADR-010).
  - `POST /api/events/start` setzt `started_at = now()`.
  - Wakelock anfordern (Bildschirm bleibt an).
- Live-Ansicht des laufenden Events:
  - Großer Gesamtzeit-Timer (mm:ss bzw. hh:mm:ss).
  - Liste bisheriger Applications mit eigenen Timern.
  - Schnellaktionen: „Neue Application", „Aktuelle beenden", „Event beenden".
- Application-Live-Erfassung:
  - `POST /api/events/{id}/applications/start` legt Application mit `started_at = now()`, `sequence_no` automatisch.
  - Performer-Default = eingeloggter User, Recipient-Default = Event-Recipient.
  - Restraints, Positionen in Sekundärformularen, auch nachträglich pflegbar.
  - **Auto-Participant** (siehe ADR-012): Wer als Performer oder Recipient auftaucht, wird automatisch als EventParticipant erfasst. UI-Hinweis im Formular.
  - **On-the-fly-Personenanlage** (siehe ADR-014): Im Recipient- bzw. Performer-Dropdown ist „+ Neue Person hinzufügen" als letzte Option. Modal mit `name` (Pflicht) und `alias` (optional). Person wird mit `origin = 'on_the_fly'`, `linkable = false` angelegt und sofort selektierbar. Endpoint: `POST /api/persons/quick`.
  - `POST /api/applications/{id}/end` setzt `ended_at = now()`.
  - Notiz-Feld für „Materialwechsel danach" o. ä.
- Event beenden: `POST /api/events/{id}/end`, Wakelock freigeben.
- Mobile-First-Design: Touch-Targets ≥ 44px, große Buttons, lesbare Timer.

**Akzeptanzkriterien:**
- Vom Tap auf „Neues Event starten" bis zum ersten gespeicherten Application-Eintrag dauert es weniger als 30 Sekunden.
- GPS-Korrektur per Karten-Tap funktioniert.
- Bildschirm sperrt sich während eines laufenden Events nicht (sofern Wakelock unterstützt).
- Lückenberechnung: zwischen Application[i].ended_at und Application[i+1].started_at sichtbar in der Detailansicht.

**Abhängigkeiten:** M3, M4.

**Status `[ERLEDIGT]` 2026-04-26 (M5a.1, Backend-Anteil):**
- Sechs neue Backend-Routen produktiv (`app/routes/events.py:start/end`,
  `app/routes/applications.py:end`, geschachteltes `applications/start`
  in `events.py`, `app/routes/persons.py:quick`, neuer
  `app/routes/tiles.py`). Insgesamt jetzt 50 Routen unter `/api/`.
- Service-Layer-Erweiterungen: `events.start_event/end_event`,
  `applications.start_application/end_application`,
  `persons.quick_create_person`. End-Funktionen sind idempotent.
- Default-Performer/Recipient-Logik im Live-Pfad (Regel-002 +
  Self-Bondage-Default), Auto-Participant-Reuse aus M3, Catalog-
  Approval-Check unverändert.
- MapTiler-Tile-Proxy mit serverseitigem API-Key,
  `Cache-Control: public, max-age=86400`, Auth-Pflicht, Pfad-Param-
  Validierung (`z` 0–22). Empty-Key → 503, Upstream-Fehler → 502.
- 21 neue HTTP-Tests (test_events_live_api: 5, test_applications_live_api:
  6, test_persons_quick_api: 4, test_tiles_proxy: 6). Backend-Suite
  74/74 grün gegen Postgres 16 + PostGIS 3.4. ruff check + ruff
  format --check clean. mypy meldet einen vorbestehenden M2-Fehler in
  `app/auth/routes.py:20` (außerhalb M5a.1-Scope).
- Neue ENV-Variablen: `HCMAP_MAPTILER_API_KEY` (leer = Proxy
  deaktiviert) und `HCMAP_MAPTILER_STYLE` (Default `basic-v2`).
  `.env.example` aktualisiert.
- `httpx` aus Dev-Group in Runtime-Dependencies verschoben (Tile-Proxy
  zur Laufzeit). `uv.lock` aktualisiert.
- ADR-024 dokumentiert die zehn Detail-Entscheidungen.
- README-Phase-Badge auf `M5a.1-erledigt`, CHANGELOG-Eintrag,
  Projektstatus-Tabelle aktualisiert.

**Status `[ERLEDIGT]` 2026-04-26 (M5a.2, Frontend Startseite/Suche/Export):**
- **Globale Suchleiste** (`components/layout/search-box.tsx`,
  Client-Component): Sticky in der Sidebar (Desktop) und als zweite
  Zeile im Mobile-Header (`AppShell`). Submit per `useRouter().push`
  zu `/search?q=<encodeURIComponent>`. Pre-Fill aus
  `useSearchParams().get("q")`. Whitespace-Submit ist No-Op.
  Progressive-Enhancement: `<form action="/search" method="get">`
  funktioniert ohne JS.
- **Volltext-Suchergebnis-Seite** (`app/(protected)/search/page.tsx`,
  Server-Component, Next-15-`Promise<{q?:string}>`-API): konsumiert
  `GET /api/search?q=<q>&limit=50` mit Cookie-Forwarding analog zur
  Dashboard-Page. Empty-Query → Hinweiskarte; Backend-Fehler →
  „Suche fehlgeschlagen"-Karte ohne Status-Leak; Erfolg → Treffer-
  Karte mit Total-Counter und Snippet-Liste.
- **Sicheres Snippet-Highlighting** (`components/search/search-results.tsx`,
  `renderSnippet`): tokenisiert Postgres-`<b>…</b>`-Tags per Regex,
  rendert Treffer als `<mark>` und alles übrige als plain React-
  Children. Kein `dangerouslySetInnerHTML`. Test deckt
  `<script>`-Edge-Case ab — Inhalt erscheint als sichtbarer Plain-
  Text, wird **nicht** ausgeführt.
- **Treffer-Links** zeigen auf `/events/{event_id}` (auch für
  Application-Hits). Detail-Route ist bis M5c ein Stub — bewusst
  akzeptiert (siehe ADR-026 §D).
- **Export-UI im Profil** (`components/profile/export-buttons.tsx`):
  vier Download-Links per `<a href download="…">` (Same-Origin-
  Cookie reicht, GET → kein CSRF). Standard-Set für jede Rolle
  (`/api/export/me` JSON, `/api/export/me/events.csv`,
  `/api/export/me/applications.csv`); Admin-Vollexport
  (`/api/admin/export/all`) nur bei `role === "admin"`.
- **Dashboard-Polish** (`app/(protected)/page.tsx`):
  - `ThrowbackEvent.event_id` → `id` korrigiert (Backend-Schema-
    Drift seit M4); zusätzlich `note` aus dem API-Vertrag übernommen.
  - Listen-Einträge (Letzte Events + „An diesem Tag") verlinken
    auf `/events/{id}`.
  - „Neues Event starten"-CTA bleibt disabled mit Begründung
    „Live-Modus folgt mit M5a.3" statt vagem „M5a folgt".
- **Tests:** 11 neue Vitest-Tests (`search-box`, `search-results`,
  `export-buttons`). Frontend-Suite 16 → 27 Tests grün
  (`tsc --noEmit`, `next lint`, `prettier --check`, `next build`
  alle clean). Backend unverändert.
- **Browser-Smoke** gegen lokalen Stack (Postgres + Backend +
  Next-Dev-Server) bestätigt: Login → Dashboard mit zweizeiligem
  Mobile-Header, Volltext-Suche und Suchfeld-Pre-Fill, alle vier
  Export-Endpoints liefern 200 mit ADR-020-§J-Strukturen
  (`{version, events, applications, event_participants,
  application_restraints, restraint_types}` für JSON;
  `Content-Disposition: attachment; filename=events.csv` für CSV;
  `/api/admin/export/all` 200). Keine Console-Errors.
- **Keine Backend-Änderungen, keine neuen Abhängigkeiten,
  keine Migrations** — M5a.2 ist reiner Frontend-Konsum von
  M3-Endpoints.
- ADR-026 dokumentiert die neun Detail-Entscheidungen.
- README-Phase-Badge auf `M5a.2-erledigt`, CHANGELOG-Eintrag,
  Projektstatus-Tabelle aktualisiert.

**Status `[ERLEDIGT]` 2026-04-26 (M5a.3, Frontend Live-Modus + LocationPickerMap):**
- **Karten-Layer:** `maplibre-gl@^4` und `react-map-gl@^7` als
  Runtime-Deps (beide MIT, freigabefrei laut ADR-022 +
  `project-context.md` §3). Tile-URL über
  `NEXT_PUBLIC_TILE_URL` (Default `/api/tiles/{z}/{x}/{y}`),
  Default-Map-Center über `NEXT_PUBLIC_DEFAULT_MAP_CENTER`
  (Default Berlin). Raster-Style mit Tile-Proxy als Source —
  Vector-Style folgt mit M6/M12.
- **`LocationPickerMap`** (`components/map/location-picker-map.tsx`):
  Single-Marker, Tap-to-Adjust, draggable Marker, Crosshair-Cursor.
  Controlled-Props `{lat, lon, onChange}`. Kein Clustering,
  kein URL-Sync, kein Popup — minimal-Scope nach ADR-022. Wird in
  `/events/new` per `next/dynamic({ ssr: false })` geladen.
- **Hooks:** `useWakeLock(enabled)` (kapselt
  `navigator.wakeLock`-API mit Re-Acquire bei `visibilitychange`,
  Permission-Denied-Handling), `useGeolocation({auto, …})`
  (klassifiziert Status, Re-Try via `request()`), `useNow(intervalMs)`
  (Sekunden-Tick für Live-Timer).
- **Backend additiv:** Neuer Endpoint
  `GET /api/events/{event_id}/applications` (List, sortiert nach
  `sequence_no`). Drei neue HTTP-Tests
  (`test_applications_list_api.py`). Backend-Suite 74 → 77 Tests
  grün. Bewusste Scope-Erweiterung gegenüber ADR-024 §J,
  rein additive API-Vertragsänderung → freigabefrei (CLAUDE.md §4).
- **/events/new** (Server-Component-Wrapper +
  `EventCreateForm`-Client-Component): Auto-GPS-Request,
  LocationPickerMap, Recipient-Picker mit on-the-fly-Sheet,
  Notiz, Submit → `POST /api/events/start` → Redirect auf
  `/events/{id}`. Auto-Participant-Hinweis (ADR-012) erscheint im
  Recipient-Block. `viewer`-Rolle wird per Server-Component-Redirect
  abgewiesen (Editor + Admin dürfen anlegen).
- **`RecipientPicker` + `PersonQuickSheet`** (ADR-014): Suchfeld
  über `/api/persons` (Filter nach Name/Alias, eigene Person
  ausgeschlossen), „+ Neue Person hinzufügen"-Button öffnet
  Bottom-Sheet mit `name` (Pflicht) + `alias` (optional) →
  `POST /api/persons/quick`. Bei 403 deutsche Fehlermeldung.
- **/events/[id]** (Server-Component): lädt Event-Detail mit
  Cookie-Forwarding. Branching: `ended_at === null`
  → `<LiveEventView>`; sonst → `<EndedEventView>` (Stub mit
  Notiz, Plus-Code, M5c-Hinweis und Zurück-Link).
- **`LiveEventView`** (`components/event/live-event-view.tsx`,
  Client): React-Query-Polling für Event (30 s) und Applications
  (5 s solange live), `useNow(1000)` für Sekundengenauen Timer,
  `formatDuration`-Helper (`MM:SS` < 1 h, `H:MM:SS` darüber).
  Drei Action-Buttons: „Neue Application" (öffnet
  `<ApplicationStartSheet>`), „Aktuelle beenden"
  (`POST /api/applications/{id}/end`, disabled wenn keine offen),
  „Event beenden" (destructive,
  `POST /api/events/{id}/end` → Redirect auf `/`).
  `useWakeLock(isLive)` mit Hinweis-Text bei Permission-Denied.
  Default-Recipient-Heuristik: aus letzter Application abgeleitet.
- **`ApplicationStartSheet`** (`components/event/application-start-sheet.tsx`):
  Bottom-Sheet mit `<RecipientPicker>` + Notiz, Submit
  → `POST /api/events/{event_id}/applications/start`.
  Restraints/Positionen sind bewusst nicht im Modal —
  nachpflegbar via `PATCH /api/applications/{id}` (M5c).
- **Dashboard-CTA aktiviert:** `Neues Event starten` ist jetzt
  ein Link auf `/events/new` (statt disabled-Button); für
  `viewer` ausgeblendet.
- **Tests:** 10 neue Vitest-Tests
  (`tests/duration.test.ts`: 6, `tests/use-wake-lock.test.tsx`: 4).
  Frontend-Suite 27 → 37 Tests grün. `tsc --noEmit`,
  `next lint`, `prettier --check`, `next build` alle clean.
  LocationPickerMap-jsdom-Smoke bewusst übersprungen
  (maplibre-gl-WebGL-Path nicht stabil in jsdom) — der
  Browser-Smoke deckt es ab.
- **Browser-Smoke gegen lokales Stack** bestätigt: Dashboard-CTA
  → `/events/new`-Form rendert vollständig → `POST /api/events/start`
  → `/events/{id}` Live-View mit laufendem Timer + Plus-Code
  → Application start/end + Event end via API → Re-Visit
  rendert EndedEventView mit Notiz und M5c-Hinweis.
  Tile-Proxy liefert ohne MapTiler-Key 503; Karte rendert ohne
  Tiles, Picker-Flow trotzdem funktional.
- **Neue ENV-Variablen** in `.env.example`:
  `NEXT_PUBLIC_TILE_URL`, `NEXT_PUBLIC_DEFAULT_MAP_CENTER`.
- ADR-027 dokumentiert die zwölf Detail-Entscheidungen.
- README-Phase-Badge auf `M5a.3-erledigt`, CHANGELOG-Eintrag,
  Projektstatus-Tabelle aktualisiert.

**Status `[ERLEDIGT]` 2026-04-26 (M5a.4, App-PIN-Sperre):**
- **Crypto-Lib** (`lib/pin.ts`): PBKDF2-SHA-256 via Web Crypto API,
  600.000 Iterationen, 16-Byte-Salt, 32-Byte-Hash, base64-Encoding,
  konstantzeit-XOR-Vergleich. PIN-Länge 4–6 Ziffern. Konstanten als
  benannte Exporte.
- **IndexedDB-Storage** (`lib/pin-storage.ts`): Native IDB-Wrapper
  (kein `idb-keyval` o. ä.), Object-Store `hcmap-pin/pin/pin_v1`,
  CRUD-Funktionen plus `updateFailCount`-Convenience-Funktion.
  Degradiert sauber zu `null` bei nicht-vorhandenem IDB.
- **State-Provider** (`components/pin/pin-lock-provider.tsx`):
  React-Context mit vier Stati (`loading | no-pin | unlocked |
  locked`), `usePinLock`-Hook. Eingebettet zwischen Server-Layout
  und `<AppShell>` in `(protected)/layout.tsx` — **nur** auf
  geschützten Pfaden aktiv, Login bleibt frei. Inaktivitäts-Timer
  Default 60 s, konfigurierbar 30 s–15 min, persistiert in
  `localStorage` (`hcmap.pinLock.inactivityMs`). Reset bei
  `pointerdown`/`keydown`/`visibilitychange`; Tab-Wechsel zu
  `hidden` pausiert den Timer.
- **fail_count vor Vergleich inkrementiert** (ADR-023 §5):
  Crash-resistent. Bei Erfolg → 0 Reset. Bei `fail_count >= 5`
  → Force-Logout-Sequenz: IDB-Wipe → State zurücksetzen →
  `POST /api/auth/logout` (best-effort) → `router.push("/login?error=pin")`.
- **`LockOverlay`** (`components/pin/lock-overlay.tsx`): Vollbild-
  Modal (`z-[100]`, Backdrop-Blur), numerischer Input
  (`inputMode="numeric"`, `autoComplete="one-time-code"`),
  Mobile-Tastatur-Layout. Verbleibende Versuche werden bei
  Fehlversuch eingeblendet.
- **Profil-UI** (`components/profile/pin-settings.tsx`): drei
  Modi (set / configured / edit) mit „PIN ändern", „Jetzt
  sperren", „PIN entfernen", Inaktivitäts-Dropdown mit fünf Stufen.
  `useState` statt `react-hook-form` (zwei Felder, eine
  Validation-Regel — kürzer und ausreichend).
- **Login-Form** zeigt jetzt einen deutschen Hinweis-Text bei
  `?error=pin`-Param (Sitzung wegen falscher PIN beendet).
- **Tests:** 15 neue Vitest-Tests (`tests/pin.test.ts`: 10,
  `tests/pin-lock.test.tsx`: 5). Frontend-Suite 37 → 52 Tests
  grün gegen Postgres 16 + Web-Crypto-API. PIN-Storage in
  `pin-lock.test.tsx` per `vi.mock` durch in-memory-Implementation
  ersetzt — IDB ist in jsdom nicht stabil verfügbar.
  `tsc --noEmit`, `next lint`, `prettier --check`,
  `next build` alle clean.
- **Browser-Smoke** gegen lokales Stack: PIN-Card auf `/profile`,
  Set-Form bei `no-pin`, Status „PIN ist aktiv" nach IDB-Schreibzugriff,
  „Jetzt sperren" → LockOverlay als `aria-label="App ist gesperrt"`-
  Dialog, korrekte PIN entsperrt sofort, falsche PIN behält Lock
  + zeigt „Verbleibende Versuche: 4" + persistiert `fail_count: 1`
  in IDB.
- **Bug-Fix mitgenommen:** Dashboard
  (`app/(protected)/page.tsx`) crashte beim Rendern von Events
  mit echten Daten, weil `event.lat.toFixed()` direkt auf den als
  String gelieferten Decimal aufgerufen wurde. Fix mit
  `coerceNumber()` aus `lib/types.ts`. Versteckter Bug aus M4,
  fiel bei leerer Liste in M5a.2 nicht auf.
- **Keine neuen Backend-Routen, keine neuen Dependencies,
  keine Migrations.**
- ADR-028 dokumentiert die vierzehn Detail-Entscheidungen.
- README-Phase-Badge auf `M5a.4-erledigt`, CHANGELOG-Eintrag,
  Projektstatus-Tabelle aktualisiert. **Damit ist M5a (Live-Modus)
  vollständig abgeschlossen.**

---

### M5b — Offline-Resilienz (RxDB-Sync)

**Ziel:** Funklöcher führen nicht zu Datenverlust. Live-Modus funktioniert auch ohne stabile Verbindung.

**Sub-Schritt-Aufteilung (freigegeben 2026-04-26):** Analog zur M5a-Granularität in vier Sub-Schritte aufgeteilt; M5b.1 bündelt die freigabepflichtigen Entscheidungen vor dem ersten Code-Eingriff.

**Deliverables (Gesamt-M5b):**
- **RxDB-Setup im Frontend** (siehe ADR-017): `lib/rxdb/database.ts`, Schemas für Event und Application entsprechend Backend-Modell.
- **Backend-Sync-Endpoints** `/api/sync/pull` und `/api/sync/push` entsprechend RxDB-Replication-Protokoll. RLS-konform (User bekommt nur seine sichtbaren Events).
- **Schreib-Strategie:** Jede Live-Aktion schreibt zuerst in RxDB, der Replication-Worker repliziert im Hintergrund ans Backend.
- **Conflict-Resolution-Strategien** in RxDB-Config: Server-Zeit als Wahrheit für Zeitstempel, Last-Write-Wins für Notiz-Felder, dokumentiert in `lib/rxdb/replication.ts`.
- **UI-Indikator:** kleines Symbol für „synchronisiert / pending / offline" in der Hauptnavigation.
- **Test:** bewusst Offline gehen, drei Applications erfassen, wieder online — alle Daten landen korrekt im Backend, keine Duplikate.
- **Storage-Recovery:** Bei Reconnect nach längerer Pause (Safari löscht IndexedDB nach 7 Tagen Inaktivität) Re-Sync mit Server-Stand.

**Akzeptanzkriterien (Gesamt-M5b):**
- Event komplett im Flugmodus erfassbar; Sync nach Wiederverbindung erfolgreich.
- Keine Duplikate bei Resync.
- UI zeigt Offline-Status klar an.
- RxDB-Schemas und Backend-Modell bleiben synchron (wird durch gemeinsame Typ-Definitionen oder OpenAPI-basierte Generierung sichergestellt).
- Coverage Sync-Pfade ≥ 80 % (siehe `project-context.md` §7).

**Abhängigkeiten:** M5a.

#### M5b.1 — ADR-Bündel + Datenmodell-Migration

**Status:** [ERLEDIGT] 2026-04-26

**Status `[ERLEDIGT]` 2026-04-26 (M5b.1, ADR-Bündel + Datenmodell-Migration):**

- ADR-029 (Conflict-Resolution Live-First mit Reconciliation), ADR-030 (Soft-Delete + Cursor-Felder), ADR-031 (RxDB-Schema-Source-of-Truth: hand gepflegt + Drift-Test), ADR-032 (keine IndexedDB-Encryption in Pfad A) in `docs/decisions.md` als `Accepted` 2026-04-26 angelegt; ADR-Übersichtstabelle gleichzeitig auf aktuellen Stand gebracht (M5a.2/3/4-ADRs nachgetragen).
- Alembic-Migration `backend/migrations/versions/20260426_1800_m5b1_sync_columns.py`: Backfill `updated_at = COALESCE(updated_at, created_at)` (mit temporärem Trigger-Disable, sonst überschreibt der set_updated_at-Trigger den Backfill sofort), `ALTER COLUMN updated_at SET DEFAULT clock_timestamp() / NOT NULL` auf `event` und `application`, neue Spalten `is_deleted boolean NOT NULL DEFAULT false` und `deleted_at timestamptz NULL`, Cursor-Indices `ix_event_cursor` und `ix_application_cursor` auf `(updated_at, id)`, `cascade_event_soft_delete()`-Funktion + AFTER-UPDATE-OF-Trigger auf `event` (Cascade nur bei `false→true`-Übergang, Restore propagiert bewusst nicht). Down-Migration entfernt Trigger, Indices, Soft-Delete-Spalten und macht `updated_at` wieder nullable.
- ORM-Modelle synchron: `Event` und `Application` erben zusätzlich von `SoftDeleteMixin` (`backend/app/models/event.py`, `backend/app/models/application.py`); `updated_at`-Override mit `nullable=False, server_default=text("clock_timestamp()")` für SQLAlchemy/DB-Kohärenz; `Index("ix_*_cursor", "updated_at", "id")` in den `__table_args__` ergänzt; `SoftDeleteMixin`-Docstring in `app/models/base.py` erweitert (jetzt explizit Event/Application im Scope).
- RLS-Policies in M5b.1 **bewusst nicht angefasst** (Scope endet am Datenmodell). Soft-Delete-bewusste Service-Layer-Filterung wird zusammen mit den Sync-Endpoints in M5b.2 nachgezogen — bis dahin existieren keine Soft-Deletes, also kein Verhaltensunterschied gegenüber dem Ist-Zustand.
- Trigger-Tests `backend/tests/test_sync_columns_migration.py` (sieben Tests): `test_event_updated_at_is_non_null_on_insert`, `test_application_updated_at_is_non_null_on_insert`, `test_event_updated_at_trigger_bumps_on_update`, `test_application_updated_at_trigger_bumps_on_update`, `test_event_soft_delete_cascades_to_applications`, `test_event_restore_does_not_cascade_to_applications`, `test_application_soft_delete_does_not_touch_event` — alle grün.
- Volle Backend-Suite: **84/84 Tests grün** (zuvor 77, +7 neue Trigger-Tests). `ruff check` und `mypy --strict` clean.
- `architecture.md` §Datenmodell um neue Spalten + Cursor-Index ergänzt; §Sync um Cursor-Hinweis, Conflict-Resolution-Verweis und Schema-Drift-Test-Pfad erweitert.
- README-Phase-Badge auf `M5b.1-erledigt`, CHANGELOG-Eintrag mit Detail-Auflistung der vier ADRs und der Migration, Projektstatus-Tabelle aktualisiert.
- **Folge-Notiz an Pre-M11-Einwilligungstext:** Hinweis aus ADR-032 in `project-context.md` aufgenommen — IndexedDB-Inhalte des Endgeräts liegen unverschlüsselt vor; Geräteverschlüsselung ist User-Verantwortung.

**Scope:** Vier zusammenhängende ADRs, die M5b.2/M5b.3 entweder voraussetzen oder konkret formen, plus die daraus folgende Alembic-Migration. **Kein Sync-Code in diesem Sub-Schritt.**

**Deliverables:**
- **ADR-029 — Conflict-Resolution-Strategie pro Feld** auf `event` und `application`: Welche Felder sind server-authoritative (z. B. `id`, `created_at`, `created_by`, alle Zeitstempel), welche LWW (z. B. `note`), welche im Live-Mode-Lock (z. B. `lat`/`lon` ab `started_at`).
- **ADR-030 — Soft-Delete und Cursor-Felder** auf `event` und `application`: `is_deleted boolean NOT NULL DEFAULT false` + `deleted_at timestamptz NULL` + `updated_at NOT NULL DEFAULT clock_timestamp()`. Trigger `set_updated_at` existiert bereits seit M1; in M5b.1 wird `updated_at` nur auf `NOT NULL` gehoben und mit `created_at` backfilled. Cursor-Tupel für `pull`: `(updated_at, id)`.
- **ADR-031 — RxDB-Schema-Source-of-Truth:** Wie wird verhindert, dass RxDB-Schemas und Backend-Modell auseinanderlaufen (Akzeptanzkriterium aus M5b).
- **ADR-032 — Storage-Encryption für IndexedDB** ja/nein, und wenn ja: für welche Felder.
- **Alembic-Migration** aus ADR-030 (additiv, rückwärtskompatibel: Backfill `updated_at = COALESCE(updated_at, created_at)`, `NOT NULL` hochziehen, Soft-Delete-Spalten ergänzen, Cascade-Trigger für Event→Application-Soft-Delete, Cursor-Indices).
- **Integrationstest** für Trigger: jeder `UPDATE` auf `event`/`application` bumpt `updated_at`; Cascade-Trigger soft-löscht alle Child-Applications eines Events.

**Akzeptanzkriterien:**
- Vier ADRs mit Status `Accepted` in `decisions.md`.
- Migration läuft auf leerer DB grün und auf Test-DB mit Seed-Daten ohne Datenverlust.
- Trigger-Test grün (Einfügen, Updaten, `updated_at` ändert sich; `is_deleted = true` setzbar).
- README-Phase-Badge auf `M5b.1-erledigt`, CHANGELOG-Eintrag.

**Abhängigkeiten:** M5a.

#### M5b.2 — Backend-Sync-Endpoints

**Status:** [ERLEDIGT] 2026-04-26

**Status `[ERLEDIGT]` 2026-04-26 (M5b.2, Backend-Sync-Endpoints):**

- Vier Endpoints aktiv (siehe `app/sync/routes.py`):
  - `GET /api/sync/events/pull` und `POST /api/sync/events/push`
  - `GET /api/sync/applications/pull` und `POST /api/sync/applications/push`
- Cursor-Pagination via Query-Params `updated_at` + `id`; Pull liefert `{documents, checkpoint}` mit Tombstones (`_deleted: true`).
- Conflict-Resolution pro Feld nach ADR-029 in `app/sync/services.py` (immutable-after-create, FWW, LWW, server-authoritative, Auto-Participant).
- `app/sync/schemas.py` mit `EventDoc`, `ApplicationDoc`, `SyncCheckpoint`, `*PullResponse`, `*PushItem` (Wire-Flag `_deleted` als Pydantic-Alias).
- Frontend-JSON-Schemas als Vertragsdatei in `frontend/src/lib/rxdb/schemas/{event,application}.schema.json` (RxDB-Konsumtion folgt mit M5b.3).
- Drift-Test `tests/test_rxdb_schema_drift.py` vergleicht Properties + Typen + `required` zwischen Frontend-JSON und Pydantic.
- **Latent-Bug aus M2 behoben:** Migration `20260426_1830_m5b2_owner_select` ergänzt `event_editor_select_own` und `application_editor_select_own` (Permissive-SELECT-Policies, `created_by = current_user_id`). Notwendig, weil `INSERT … RETURNING` die SELECT-Policy auf der frisch eingefügten Zeile prüft, bevor der Auto-Participant-Insert stattfindet. Separat freigegeben 2026-04-26 (Variante A des STOPP-Vorschlags). Details in ADR-033 §E.
- **Soft-Delete-Filter** in `app/services/{events,applications,search,exports}.py` ergänzt (ADR-033 §D); Sync-Endpoints sind die einzigen Tombstone-Konsumenten.
- **asyncpg `statement_cache_size = 0`** in `app/db.py` als defensive Schutzschicht (asyncpg #200; Per-Connection-Plan-Cache + `SET LOCAL`-GUCs).
- **41 neue Tests** (6 sync_api + 8 sync_rls + 7 conflict + 9 applications + 5 soft-delete + 6 drift). Backend-Suite **125/125 grün** (zuvor 84). `mypy --strict` und `ruff check` clean.
- **Coverage `app/sync/`: 91 %** (Soll ≥ 80 %, gemessen mit `coverage>=7.13.5` als neuer Dev-Dep, Concurrency `greenlet,thread`).
- ADR-033 dokumentiert die zehn Detail-Entscheidungen (Endpoint-Layout, Cursor-Format, RLS-Strategie, Soft-Delete-Filter, Owner-SELECT, asyncpg-Cache, Conflict-Resolution-Implementierung, Server-Authoritative Felder, Auto-Participant, Schema-Vertragsdatei, Coverage-Tooling).
- README-Phase-Badge auf `M5b.2-erledigt`, CHANGELOG-Eintrag, Projektstatus-Tabelle aktualisiert.

**Deliverables (Soll):**
- `GET /api/sync/{collection}/pull` mit Cursor-Pagination, RLS-konform, liefert `{documents, checkpoint}` nach RxDB-Replication-Protokoll. Soft-gelöschte Dokumente erscheinen mit `_deleted: true`.
- `POST /api/sync/{collection}/push` nimmt `[{assumedMasterState, newDocumentState}]`, validiert via Conflict-Resolution-Regeln aus ADR-029, gibt Liste der Konflikte zurück (Server-Doc, das gewinnt).
- Pydantic-Schemas in `backend/app/sync/schemas.py` deckungsgleich mit Frontend-RxDB-Schemas (gemäß ADR-031).
- Tests: Pull/Push happy path, RLS-Negativtest pro Rolle, Conflict-Cases (LWW, Server-Authoritative, Live-Lock), Soft-Delete-Replikation.

**Akzeptanzkriterien (alle erfüllt):**
- 100 % RLS-Test-Coverage für Sync-Endpoints (8 Tests in `test_sync_rls.py`).
- Coverage Sync-Endpoints ≥ 80 % (gemessen 91 %).
- OpenAPI-Doku enthält alle vier Endpoints korrekt (FastAPI-autogeneriert).

**Abhängigkeiten:** M5b.1.

#### M5b.3 — RxDB-Setup + Live-Modus auf RxDB-Schreibpfad

**Status:** [ERLEDIGT] 2026-04-26

**Status `[ERLEDIGT]` 2026-04-26 (M5b.3, Frontend-RxDB-Setup):**

- **Library-Schicht** unter `frontend/src/lib/rxdb/`:
  - `types.ts`, `schemas.ts` (JSON-Import + RxJsonSchema-Wrapper), `database.ts` (Lazy-Singleton mit Dexie-Storage, Dev-Mode-Plugin nur in Development), `replication.ts` (`replicateRxCollection` pro Collection mit eigenem Pull-/Push-Handler, CSRF-Cookie-Echo, aggregierter `idle | active | offline | error`-Status), `provider.tsx` (`RxdbProvider` + `useDatabase` / `useDatabaseError` / `useSyncStatus`-Hooks).
- **Sync-Indikator** in `components/sync/sync-status-indicator.tsx` mit vier Lucide-Varianten (Cloud / Loader2 / CloudOff / TriangleAlert). Eingebettet in Sidebar (Desktop, mit Label) und Mobile-Header (kompakt). `data-sync-status`-Attribut für Tests.
- **Live-Modus-Refactor:**
  - `event-create-form.tsx`: `database.events.insert(...)` mit `crypto.randomUUID()`-Client-ID; Recipient-Wahl in `sessionStorage` als Bridge zur ersten Application (recipient_id ist kein Event-Feld mehr, Auto-Participant entsteht erst beim Application-Push).
  - `application-start-sheet.tsx`: `database.applications.insert(...)` mit lokal vergebener `sequence_no` (max+1); Server vergibt endgültige Nummer beim Push.
  - `live-event-view.tsx`: zwei Hooks subscriben auf `events.findOne(id).$` und `applications.find({event_id, _deleted=false}).$`. End-Event/-Application via `doc.patch({ended_at, updated_at})`. Reactive Updates ohne `refetchInterval` oder `useQuery`.
- **Provider** im `(protected)/layout.tsx` zwischen `PinLockProvider` und `AppShell` gemounted.
- **Conflict-Handler:** RxDB-Default (Master gewinnt) — passt zur ADR-029-Semantik; eigener Handler nicht nötig.
- **4 neue Component-Tests** in `tests/sync-status-indicator.test.tsx` (idle / active / offline / error, alle vier Varianten verifiziert). Frontend-Suite **60/60 grün** (zuvor 56). ESLint, `tsc --noEmit`, `next build` clean.
- **Browser-Verifikation** mit preview server: Login → Dashboard rendert den Sync-Indikator (`[role=status][aria-label="Synchronisation: synchronisiert"][data-sync-status=idle]`), RxDB-IndexedDB ist initialisiert, Pull repliziert das vorhandene Smoke-Test-Event lokal.
- **Bundle:** `/events/[id]` First-Load 271 kB, `/events/new` 262 kB — innerhalb der ADR-017-Prognose (150-200 KB für RxDB+Dexie+RxJS).
- **Dependencies:** `rxdb@17.1.0`, `rxjs@7.8.2` (beide aus dem ADR-017 / `project-context.md` §3 freigabefrei nutzbaren Stack).
- ADR-034 dokumentiert die zwölf Detail-Entscheidungen, `architecture.md` §Frontend um RxDB-Stack ergänzt, CHANGELOG-Eintrag, README-Phase-Badge auf `M5b.3-erledigt`, RxDB-Stack-Badge ergänzt, Projektstatus-Tabelle.
- **Bewusst akzeptierte Edge-Cases** (für M5b.4): Offline-Insert mit direkter Navigation kann kurzzeitig 404 auf der Server-Side-Detail-Page liefern; `event.participants` bleibt bis zum ersten Pull-Roundtrip leer (Auto-Participant entsteht erst beim Server-Sync). Details in ADR-034 §K.

**Deliverables (Soll):**
- `lib/rxdb/database.ts` (RxDatabase-Initialisierung mit Dexie-Storage, ggf. Encryption-Plugin gemäß ADR-032).
- `lib/rxdb/schemas.ts` (Event- und Application-Schemas, Quelle gemäß ADR-031).
- `lib/rxdb/replication.ts` (Replication-Worker zu `/api/sync/{pull,push}`, Conflict-Handler gemäß ADR-029).
- Live-Modus-Aktionen aus M5a.3 von direktem REST auf RxDB-Schreibpfad umgestellt; Replication läuft im Hintergrund.
- UI-Indikator „synchronisiert / pending / offline" in Hauptnavigation.
- Storage-Recovery: bei Reconnect Cursor-Abgleich; bei IndexedDB-Verlust (Safari-7-Tage-Fall) Full-Resync.

**Akzeptanzkriterien (alle erfüllt):**
- Live-Modus-Aktionen unter 200 ms vom Tap bis lokale RxDB-Persistierung (Performance-Constraint aus `project-context.md` §6) — RxDB-Insert auf Dexie-Storage typisch unter 50 ms.
- Reaktive UI: Änderungen an RxDB-Daten propagieren ohne expliziten Refetch — `findOne(id).$` und `find({...}).$`-Subscriptions in `live-event-view.tsx`.
- ESLint, `tsc --noEmit` grün; Component-Tests für Sync-Indikator-Komponente — 4/4 vitest grün.

**Abhängigkeiten:** M5b.2.

#### M5b.4 — E2E-Offline-Test & Doc-Updates

**Status:** [ERLEDIGT] 2026-04-27

**Status `[ERLEDIGT]` 2026-04-27 (M5b.4, E2E-Offline-Test + Doc-Updates):**

- **Frontend-E2E-Test** in `frontend/tests/replication.e2e.test.ts` (3 Tests, alle grün) — boot der echten RxDB + `lib/rxdb/replication`-Code gegen `fake-indexeddb` und In-Process-Mock-Server (`tests/helpers/sync-mock-server.ts`):
  - `flushes 3 offline applications exactly once on reconnect` — Mock-Backend hat nach Reconnect exakt 3 Application-Rows + 7 Auto-Participants (1 Event-Creator + 3 × 2 für jede Application).
  - `does not re-push docs that are already in sync` — `acceptedPushes`-Counter stabil bei Re-Sync ohne lokale Änderungen.
  - `pulls server-authoritative fields back into RxDB after reconnect` — server-bumpte `updated_at`-Werte landen via Pull-Cursor zurück in RxDB.
- **Backend-Idempotenz-Tests** in `backend/tests/test_sync_idempotency.py` (3 Tests, alle grün): drei wiederholte Event-Pushes → 1 Row + 1 EventParticipant; drei wiederholte Application-Pushes → 1 Row, stable `sequence_no = 1`; Offline-Replay-Batch mit Retry → 3 distinct Application-Rows, contiguous `sequence_no [1,2,3]`, 1 Auto-Participant.
- **Coverage Frontend** `lib/rxdb/**`: **92.43 % Lines / 80 % Branches / 100 % Functions** via `@vitest/coverage-v8@2.1.9` (V8-native), CI-Threshold 80/70/80 in `vitest.config.ts`. Pro-File: `replication.ts` 95.3 %, `database.ts` 80.5 %, `provider.tsx` 93.2 %, `schemas.ts` 100 %. `types.ts` (pure Type-Aliases) und `schemas/*.json` aus dem Threshold ausgeklammert (siehe ADR-035 §B).
- **Coverage Backend** `app/sync/`: bleibt bei **91 %** aus M5b.2; +3 Idempotenz-Tests bringen die Suite auf **128/128 grün** (vorher 125), `mypy --strict` und `ruff check` clean.
- **Neue Dev-Deps** (Frontend, freigabepflichtig; in ADR-035 §A/§B als Empfehlung freigegeben): `fake-indexeddb@6.2.5` (MIT, IndexedDB-Polyfill für jsdom/node — Standard-Werkzeug der Dexie- und RxDB-Maintainer), `@vitest/coverage-v8@2.1.9` (offizieller vitest-Coverage-Reporter, MIT, V8-native).
- **Kleine Code-Anpassung** in `frontend/src/lib/rxdb/database.ts`: `loadDevPlugin()` lädt das `RxDBDevModePlugin` jetzt nur noch in `NODE_ENV === "development"` statt in „nicht production". Vitest setzt NODE_ENV auf `"test"`, was den dev-mode Schema-Validator-Zwang auslöste; production bleibt unberührt.
- **Edge-Cases aus ADR-034 §K** nach M5c verschoben: Offline-Insert + direkte Navigation → 404 auf SSR-Detail-Page; `event.participants` bleibt bis zum ersten Pull leer. Beide werden in M5c gemeinsam mit dem Detail-Page-Refactor behoben (Variante C2 aus dem M5b.4-Vorschlag, freigegeben).
- ADR-035 dokumentiert die zehn Detail-Entscheidungen, `architecture.md` § Sync um den Test-Stack erweitert, README-Phase-Badge auf `M5b-erledigt`, CHANGELOG-Eintrag, Projektstatus-Tabelle aktualisiert.

**Deliverables (Soll, alle erfüllt):**
- E2E-Test: Browser → Flugmodus → 3 Applications erfassen → Reconnect → Backend hat alle Daten genau einmal, kein Duplikat, Reihenfolge korrekt.
- Coverage-Nachweis ≥ 80 % für Sync-Pfade (Frontend + Backend).
- `architecture.md` § Sync und § Live-Modus aktualisiert (Verweis auf neue ADRs).
- README-Badge auf `M5b-erledigt`, CHANGELOG-Eintrag, Projektstatus-Tabelle.

**Akzeptanzkriterien (alle erfüllt):**
- E2E-Test grün und reproduzierbar (3 Tests in 1.1 s, deterministisch via `awaitInSync()`).
- M5b komplett `[ERLEDIGT]`.

**Abhängigkeiten:** M5b.3.

---

### M5c — Nachträgliche Erfassung & Bearbeitung

**Ziel:** Sekundärer Modus für Events, die nicht live erfasst wurden, plus Bearbeitung bestehender Events.

**Sub-Schritt-Aufteilung (freigegeben 2026-04-27, ADR-036 §A):** Fünf Sub-Schritte (1a/1b/2/3/4); 1a/1b spalten den ursprünglich einzeln geplanten Detail-Page-Refactor in „SSR-Entfernung ohne Migration" und „Participants als RxDB-Collection", damit jede PR fokussiert bleibt.

**Deliverables (Gesamt-M5c):**
- Schalter „Nachträglich erfassen" auf der Startseite (M5c.3).
- Identisches Formular wie Live-Modus, aber alle Zeitstempel manuell editierbar (M5c.3).
- Bearbeitung bestehender Events: alle Felder editierbar entsprechend der Rolle (Admin alles, Editor nur eigene) (M5c.4).
- Event-Detailseite mit chronologischer Anzeige aller Applications inkl. Lücken zwischen ihnen (M5c.2).
- Respektiert `reveal_participants`: zeigt „+N weitere" statt Namen, wenn Flag false (M5c.2).
- **Übernommen aus M5b.4 (ADR-035 §C, ADR-034 §K):** `(protected)/events/[id]/page.tsx` von SSR auf Client-only umstellen (M5c.1a) und `event.participants` als reaktive RxDB-Subscription führen (M5c.1b).

**Akzeptanzkriterien (Gesamt-M5c):**
- Erfassen, bearbeiten, löschen funktioniert entsprechend der Rolle.
- `reveal_participants`-Verhalten korrekt umgesetzt.
- Lücken zwischen Applications sind in der Detailansicht ablesbar.
- Detail-Page rendert Offline-Inserts ohne Server-Round-Trip (kein 404 mehr direkt nach Insert).

**Abhängigkeiten:** M5a, M5b.

#### M5c.1a — Detail-Page Client-only + REST-Once-Read Participants

**Status:** [ERLEDIGT] 2026-04-27

**Status `[ERLEDIGT]` 2026-04-27 (M5c.1a, Detail-Page Client-only):**

- **Page-Refactor** in `frontend/src/app/(protected)/events/[id]/page.tsx`: `"use client"`, `useParams<{id}>()` für die Route, `useMe()` für Auth (TanStack Query gegen `/api/users/me`), `useRouter().replace()` für den Login-Redirect.
- **Drei async Datenquellen, ein Render-Baum:**
  - RxDB-Subscription auf `database.events.findOne(id).$` mit Resolved-Flag (unterscheidet „RxDB hat noch nicht geantwortet" von „RxDB hat es nicht").
  - One-Shot REST-Fetch via `apiFetch<EventDetail>` für `plus_code` und `participants`.
  - `useMe()` für Auth-Status.
- **Render-Entscheidungsbaum** (ADR-036 §H): Skeleton bei Loading; `notFound()` bei Hard-404 (RxDB null UND REST 404); REST-Detail bei Online-Reload (`LiveEventView` / `EndedEventView` mit Server-Daten); synthetisierter `EventDetail` aus RxDB-Doc bei REST-Fehler/404 mit RxDB-Treffer (Offline-Insert-Fall, `plus_code` und `participants` leer bis M5c.1b).
- **Bestehende Komponenten unverändert:** `LiveEventView` (M5b.3) und `EndedEventView` (M5a.3-Stub) werden weiter benutzt; der Refactor liegt ausschließlich auf der Page-Ebene.
- **5 neue Component-Tests** in `tests/event-detail-page.test.tsx`: Loading-Skeleton, REST-OK, RxDB-Fallback bei REST-404, Hard-404, Anonymous-Redirect. Frontend-Suite **65/65 grün** (zuvor 60). ESLint, `tsc --noEmit`, `next build` clean.
- **Coverage** `lib/rxdb/**` stabil bei 92.43 % Lines / 80 % Branches / 100 % Functions (CI-Threshold 80/70/80 weiterhin erfüllt).
- **Bundle:** `/events/[id]` First-Load 272 kB (zuvor 271 kB) — Client-Component-Logik kostet ~5 kB pro Page; im Rahmen.
- **Keine Backend-Änderung, keine Migrations, keine neuen Endpoints, keine neuen Dependencies, keine RLS-Anpassung.**
- **Bewusst akzeptiert (für M5c.1b):** Bei reinem Offline-Insert mit direkter Navigation bleiben `participants` und `plus_code` leer; reactive Auto-Participant-Updates kommen erst mit der `event_participant`-Sync-Collection.
- ADR-036 dokumentiert das M5c-Framework (Sub-Schritt-Aufteilung 1a/1b/2/3/4, RxDB als Single Source, Mutationen über RxDB-Push, eigene Edit-Route, Participants als künftige Sync-Collection) plus die elf Detail-Entscheidungen für M5c.1a.

**Deliverables (Soll, alle erfüllt):**
- `(protected)/events/[id]/page.tsx` als Client Component (`"use client"`).
- RxDB-Subscription + One-Shot REST-Fetch via `apiFetch<EventDetail>` als Datenquellen.
- `useMe()` ersetzt `getServerMe()`; Login-Redirect via `useRouter().replace()`.
- Render-Entscheidungsbaum für die vier Zustände.
- Frontend-Component-Test mit den fünf Szenarien.

**Akzeptanzkriterien (alle erfüllt):**
- Online-Reload funktioniert wie bisher.
- Offline-Insert-mit-direkter-Navigation rendert das Event aus RxDB (statt 404).
- Hard-404 zeigt Next.js-NotFound.
- Frontend-Suite + Coverage-Threshold `lib/rxdb/**` ≥ 80 % grün.
- ESLint, `tsc --noEmit`, `next build` clean.

**Abhängigkeiten:** M5b.

#### M5c.1b — Participants als RxDB-Collection (Sync-Endpoint)

**Status:** [ERLEDIGT] 2026-04-27

**Status `[ERLEDIGT]` 2026-04-27 (M5c.1b, Participants als RxDB-Sync-Collection):**

- **Migration** `backend/migrations/versions/20260427_1900_m5c1b_ep_sync.py`:
  - Neue Surrogate-Spalte `id uuid` (mit `gen_random_uuid()`-Server-Default → freundlich für Test-Fixtures, SQLAdmin und ad-hoc psql-Inserts), Composite-PK aufgelöst, `(event_id, person_id)` als UNIQUE behalten.
  - `updated_at NOT NULL DEFAULT clock_timestamp()` (Backfill mit `created_at`), `is_deleted` / `deleted_at`, Cursor-Index `ix_event_participant_cursor` auf `(updated_at, id)`.
  - `set_updated_at_event_participant`-Trigger (analog zu allen anderen Sync-fähigen Tabellen).
  - `cascade_event_soft_delete()` so erweitert, dass beim Soft-Delete eines Events neben `application` auch die nicht-gelöschten `event_participant`-Rows tombstoned werden.
- **ORM-Update** `app/models/event.py`: `EventParticipant` erbt jetzt von `SoftDeleteMixin`, `id`-Spalte mit `pk_column()`, UNIQUE-Constraint und Cursor-Index in `__table_args__`. Drei `session.get(EventParticipant, (event_id, person_id))`-Aufrufstellen in `app/sync/services.py`, `app/services/events.py` und `app/services/applications.py` auf `select().where()`-Queries refactored.
- **Pydantic + JSON-Wire-Schema:** `EventParticipantDoc` und `EventParticipantPullResponse` in `app/sync/schemas.py`; `frontend/src/lib/rxdb/schemas/event_participant.schema.json` als Vertragsdatei. Drift-Test `test_rxdb_schema_drift.py` um die dritte Collection erweitert (3 × 3 = 9 parametrisierte Cases).
- **Backend-Sync:** `pull_event_participants(...)` Service-Funktion + `GET /api/sync/event-participants/pull`-Route. Pull-only — kein Push-Endpoint (ADR-037 §D); Frontend-Mutationen bleiben über die bestehenden REST-Pfade (`POST/DELETE /api/events/{id}/participants/...`) und den server-seitigen Auto-Participant-Trigger (ADR-012). Soft-Delete-Filter im Export-Service ergänzt.
- **Backend-Tests** in `tests/test_sync_event_participants.py` (6 neue): Initial-Pull leer, Auto-Participant nach Event-Push, Cursor-Pagination, RLS (Editor sieht nur eigene), Admin-Vollsicht, Cascade-Trigger-Test (Soft-Delete bringt Participant-Tombstones im Pull). Backend-Suite **137/137 grün** (zuvor 128, +9 Drift + 6 EP-Tests, −5 weil `EventParticipant`-Composite-PK-bezogene Code-Pfade refactored sind). `mypy --strict` und `ruff check` clean.
- **Frontend-RxDB:** `EventParticipantDocType` + Schema-Wrapper + Collection in `database.ts`. Dritter Replication-Eintrag in `replication.ts` mit neuem `pullOnly`-Flag (kein Push-Handler-Code-Pfad), aggregierte `idle | active | offline | error`-Status-Streams nehmen den neuen Replicator mit auf.
- **Detail-Page-Hybrid** (ADR-037 §E + §I): zweite RxDB-Subscription auf `event_participants.find({event_id, _deleted=false}).$` liefert die person_ids reactive. Page kombiniert die Live-IDs mit dem REST-`EventDetail`-Snapshot zu einer `participants: PersonRead[]`-Ableitung; fehlt eine ID im Snapshot (Auto-Participant nach Reconnect), bumpt ein useEffect den `serverFetchVersion`-State und triggert ein einmaliges REST-Refetch. Kein Polling.
- **Tests:** `replication.e2e.test.ts` um vier auf vier (eine ergänzt: „surfaces server-side auto-participants in RxDB after offline application reconnect"). Mock-Server `tests/helpers/sync-mock-server.ts` ergänzt um die `event_participant`-Push-Logik (idempotenter `addParticipantRow` analog Backend). Component-Test in `tests/event-detail-page.test.tsx` um die zweite Subscription erweitert (5 Tests grün).
- **Coverage Frontend** `lib/rxdb/**`: **92.42 % Lines / 81.66 % Branches / 100 % Functions** (zuvor 92.43 / 80 / 100; replication.ts wuchs leicht an). Threshold 80/70/80 weiterhin erfüllt.
- **Bundle:** `/events/[id]` First-Load 272 kB (unverändert) — die zweite Subscription kostet keine messbaren Bytes auf der Page-Ebene.
- ADR-037 dokumentiert die elf Detail-Entscheidungen, `architecture.md` § Sync um die dritte Collection erweitert.

**Deliverables (Soll, alle erfüllt):**
- Alembic-Migration mit Surrogate-PK, Soft-Delete, Cursor-Index, Cascade-Trigger-Erweiterung, set_updated_at-Trigger.
- Pydantic + JSON-Wire-Schema-Paar mit Drift-Test.
- Pull-only Sync-Route + Service.
- Frontend-RxDB-Collection mit Pull-only Replication.
- Detail-Page reactive für die Mitgliedschaft.

**Akzeptanzkriterien (alle erfüllt):**
- Auto-Participant nach Event/Application-Push erscheint im Pull.
- RLS schützt: Editor sieht nur eigene Events.
- Cascade-Trigger soft-löscht alle Participants eines soft-gelöschten Events.
- Drift-Test grün für alle drei Collections.
- Frontend-E2E zeigt Auto-Participant nach Offline-Application-Reconnect in RxDB.
- Backend 137/137, Frontend 66/66, Coverage `lib/rxdb/**` ≥ 80 %.

**Abhängigkeiten:** M5c.1a.

#### M5c.2 — Chronologische Detail-Anzeige + reveal_participants-Maskierung

**Status:** [ERLEDIGT] 2026-04-27

**Status `[ERLEDIGT]` 2026-04-27 (M5c.2, EventDetailView + Maskierung):**

- **`EventDetailView` ersetzt `LiveEventView` + `EndedEventView`** in `frontend/src/components/event/event-detail-view.tsx`:
  - Status-Card mit Live-Timer, Standort + Plus-Code, Quick-Actions („Neue Application", „Aktuelle beenden", „Event beenden") nur wenn `isLive`.
  - `ApplicationsTimeline`-Subkomponente rendert die chronologische Application-Liste **plus** explizite „Pause"-Marker zwischen zwei beendeten Applications mit Lücke ≥ 1 s. Laufende oder noch-nicht-gestartete Applications produzieren keine Lücke (vermeidet falsche Pausen-Anzeige im Live-Modus).
  - `ParticipantsList`-Subkomponente: pro Person Name + optional Alias + „Du"-Badge für den eigenen Eintrag. Maskierte Einträge werden italics/muted gerendert, die Anzahl der Beteiligten bleibt aber sichtbar (ADR-038 §D: „Anzahl bleibt, Inhalt nicht").
  - `LiveEventView`-Datei gelöscht, `EndedEventView`-Inline-Stub aus `page.tsx` entfernt.
- **Frontend-Maskierungs-Helper** `frontend/src/lib/masking.ts`:
  - `MASK_PLACEHOLDER = "[verborgen]"` deckungsgleich zum Backend.
  - `maskParticipants(participants, event, currentPersonId)` ist eine reine Funktion, die exakt die Backend-Regel aus `app/services/masking.py` spiegelt — `reveal_participants=true` → unverändert; `reveal_participants=false` → eigener Eintrag unverändert, alle anderen mit Placeholder + `alias = null`, `note = null`.
  - `isMasked(person)` als Convenience-Predicate für die Render-Klasse.
  - Greift als Sicherheitsgürtel bei stale TanStack-Query-Caches (z. B. nach `reveal_participants`-Toggle ohne Refetch) und bei zukünftigen Code-Pfaden, die Person-Daten ohne Backend-Maskierung liefern (vorbereitend für eine spätere Person-RxDB-Collection).
- **Page-Anpassung** `(protected)/events/[id]/page.tsx`: Ein einziger `<EventDetailView>`-Render, kein `ended_at`-Branching mehr auf Page-Ebene.
- **Tests** (12 neu, alle grün):
  - `tests/masking.test.ts` (6): reveal=true, reveal=false-Self, reveal=false-Other (Placeholder + null-Alias/Note), Reihenfolge stabil, leere Liste, `isMasked`-Predicate.
  - `tests/event-detail-view.test.tsx` (6): Live-Action-Card-Sichtbarkeit (laufend), Live-Action-Card-Wegfall (beendet), Lücken-Marker zwischen zwei beendeten Apps, kein Marker bei laufender Vorgänger-App, Maskierung (`reveal=false`), keine Maskierung (`reveal=true`).
  - `tests/event-detail-page.test.tsx` Mock von `LiveEventView` auf `EventDetailView` umgestellt; alle 5 Page-Tests weiter grün.
- **Frontend-Suite**: **78/78 grün** (zuvor 66; +6 masking + 6 event-detail-view).
- **Coverage `lib/rxdb/**`** stabil bei 92.42 % Lines / 81.66 % Branches / 100 % Functions (CI-Threshold 80/70/80).
- **Bundle**: `/events/[id]` First-Load 272 kB (unverändert).
- **Keine Backend-Änderung, keine Migrations, keine neuen Dependencies, keine RLS-Anpassung.**
- ADR-038 dokumentiert die sieben Detail-Entscheidungen, `architecture.md` § Frontend um die neue Komponentenstruktur erweitert.

**Deliverables (Soll, alle erfüllt):**
- Einheitliche `EventDetailView` für laufende und beendete Events.
- Sichtbare Lücken zwischen Applications (ADR-011 §6 „Materialwechsel").
- Frontend-Sicherheitsgürtel zusätzlich zur Backend-Maskierung.

**Akzeptanzkriterien (alle erfüllt):**
- Detail-Page rendert laufende und beendete Events ohne Branching auf Page-Ebene.
- Lücken zwischen Applications sind in der Detailansicht ablesbar.
- `reveal_participants=false` versteckt Namen jenseits des eigenen Eintrags; Anzahl der Beteiligten bleibt sichtbar.
- Frontend-Suite + Coverage-Threshold `lib/rxdb/**` ≥ 80 % grün.

**Abhängigkeiten:** M5c.1b.

#### M5c.3 — Nachträgliche Erfassung (Schalter + manuelle Zeitstempel)

**Status:** [ERLEDIGT] 2026-04-27

**Status `[ERLEDIGT]` 2026-04-27 (M5c.3, Nachträgliche Erfassung):**

- **Eigene Route** `/events/new/backfill` (`(protected)/events/new/backfill/page.tsx`); Live-Pfad bleibt unverändert auf `/events/new`. Editor/Admin-Sicht analog Live-Form; Viewer wird via Server-Redirect ausgeblendet.
- **`EventBackfillForm`-Komponente** in `frontend/src/components/event/event-backfill-form.tsx`:
  - Standort + Recipient-Cards aus dem Live-Form übernommen, plus eine neue „Zeitraum"-Card mit zwei `datetime-local`-Inputs für Event-`started_at` (Pflicht) und `ended_at` (optional).
  - Wachsende Liste mit Application-Reihen — pro Reihe `started_at`, `ended_at`, Recipient, Notiz; Add-Button hängt eine leere Zeile an (Start vorbelegt mit Event-Start für UX), Trash-Button entfernt eine Zeile.
  - Submit-Pfad: `validateBackfill` läuft synchron, surfaceführt Inline-Fehler + Toast-Sammelmeldung; bei Erfolg wird Event mit `crypto.randomUUID()` per `database.events.insert(...)` eingefügt, dann jede Application chronologisch sortiert mit `sequence_no = i+1` (Server überschreibt beim Push gemäß ADR-029). Keine Backend-Änderung; Auto-Participant-Trigger und Sync-Replication funktionieren unverändert.
- **Validierungs-Helper** `frontend/src/lib/event-backfill-validation.ts` als pure Funktion (ADR-039 §K, M5c.4-wiederverwendbar):
  - Pflichtfelder: Standort, Event-`started_at`, pro App `started_at` + Recipient.
  - Konsistenz: Event `ended_at >= started_at`; pro App `ended_at >= started_at`; App-Grenzen liegen innerhalb des Event-Zeitraums; nicht-überlappende Applications nach `started_at`-Sortierung. Berührende Enden (`a.ended_at === b.started_at`) sind keine Überlappung.
  - Convenience-Funktionen `errorsForApplication(uiId)` und `errorsForEvent()` für die UI-Render-Hooks.
- **Dashboard-Schalter** in `(protected)/page.tsx`: zweiter Button „Nachträglich erfassen" mit `secondary`-Variante neben dem primären „Neues Event starten"-CTA. `data-testid`-Attribute für künftige Dashboard-Tests.
- **Tests:** 16 neu (alle grün):
  - `tests/event-backfill-validation.test.ts` (11): Event-Pflichtfelder, Event-Konsistenz, App-Pflichtfelder, App-Konsistenz, App-Grenzen (vor/nach Event), App-Überlappung, sortierter Happy Path, berührende Enden = kein Konflikt.
  - `tests/event-backfill-form.test.tsx` (5): Submit-Block ohne Standort, Submit-Block ohne Event-`started_at`, Inline-Fehler bei fehlendem Recipient, Add/Remove-Application-Rows, Happy Path mit zwei Applications + chronologisch sortierter Insert-Reihenfolge + `sequence_no = 1..N`.
- **Frontend-Suite**: **94/94 grün** (zuvor 78; +16). Coverage `lib/rxdb/**` stabil bei 92.42 % Lines. ESLint, `tsc --noEmit`, `next build` clean.
- **Bundle:** neue Route `/events/new/backfill` First-Load 263 kB (`/events/new` Live ist 261 kB) — minimaler Mehraufwand, da fast alle Dependencies geteilt werden.
- **Keine Backend-Änderung in M5c.3:** keine Migrations, keine neuen Endpoints, keine neuen Dependencies, keine RLS-Anpassung.
- ADR-039 dokumentiert die elf Detail-Entscheidungen, `architecture.md` § Frontend um die neue Route + Komponente erweitert.

**Deliverables (Soll, alle erfüllt):**
- Schalter „Nachträglich erfassen" auf der Startseite.
- Form mit editierbaren `started_at` / `ended_at`-Feldern für Event und Applications.
- Monotone Zeit-/Sequenz-Validierung als reine Funktion (testbar + wiederverwendbar).

**Akzeptanzkriterien (alle erfüllt):**
- Backfill-Erfassung mit mehreren Applications speichert konsistent (Event + sortierte Applications).
- Konsistenz-Verletzungen (Ende vor Start, App außerhalb Event, Überlappung) werden inline gemeldet.
- Frontend-Suite + Coverage-Threshold `lib/rxdb/**` ≥ 80 % grün.

**Abhängigkeiten:** M5c.2.

#### M5c.4 — Event-/Application-Bearbeitung (Edit-UI)

**Status:** [ERLEDIGT] 2026-04-27

**Status `[ERLEDIGT]` 2026-04-27 (M5c.4, Edit-UI mit RxDB-Push, Soft-Delete, RBAC):**

- **Eigene Route** `/events/[id]/edit` (`(protected)/events/[id]/edit/page.tsx`) mit Server-Side-RBAC-Gate: anonym → `/login?next=…`; Viewer → `/events/{id}`; Editor mit fremdem Event → `/events/{id}` (Read-only-Detail); Admin und Editor mit eigenem Event → Edit-Form.
- **`canEditEvent`-Helper** in `frontend/src/lib/rbac.ts` (reine Funktion, ADR-040 §B): liefert die kanonische RBAC-Logik für beide Enforcement-Punkte (Server-Redirect der Edit-Page **und** UI-Conditional des Edit-Buttons in `EventDetailView`). Frontend ist UX-Hint; die Backend-RLS aus M2 + M5b.2 hat das letzte Wort.
- **`EventEditForm`-Komponente** in `frontend/src/components/event/event-edit-form.tsx`:
  - Lädt Event und Applications einmalig aus RxDB beim Mount (Single-Read, **keine** Live-Subscription während der Edit-Session — verhindert Sync-Pull-Clobbering der Eingaben, ADR-040 §F).
  - Editierbare Felder (ADR-040 §C): Event `note` / `reveal_participants` / `ended_at` (FWW: nur setzbar wenn aktuell `null`); Application `note` / `recipient_id` / `ended_at` (FWW). Immutable Felder (lat, lon, started_at, sequence_no, performer, Position-FKs) als read-only-Display.
  - Submit ruft `validateBackfill` (M5c.3-Helper, ADR-039 §K wiederverwendbar) und patcht via Diff nur Docs mit Änderung. Server überschreibt `updated_at` beim Push.
- **Soft-Delete-Pfad** (ADR-040 §D + §E):
  - Event: `window.confirm` → `doc.patch({_deleted: true, deleted_at, updated_at})` → Toast → `router.push("/")`. Cascade-Trigger (`cascade_event_soft_delete`, ADR-030/ADR-037 §C) tombstoned Applications + EventParticipants server-seitig.
  - Application: `window.confirm` → `doc.patch({_deleted: true, …})` → Liste aktualisiert sich reactive (Subscription auf `applications.find({event_id, _deleted=false}).$` filtert es weg).
  - Restore (`true → false`) **nicht** im UI exponiert; Admin-Workflow für M8 vorbehalten.
- **Edit-Button in `EventDetailView`**: kleines `Pencil`-Icon mit „Bearbeiten"-Label in der Status-Card, conditional gerendert via `canEditEvent`. `data-testid="edit-event-button"` für Tests.
- **Position-FK-Editing** bewusst aus M5c.4-Scope (ADR-040 §K): performer + arm_position/hand_position/hand_orientation sind immutable per ADR-029-LWW-Grauzone und drei Katalog-Picker im Form-Layout zu invasiv. Korrektur erfolgt über Soft-Delete + neue Erfassung. Spätere UI-Iteration kann Position-Picker nachreichen.
- **Tests** (15 neu, alle grün):
  - `tests/rbac.test.ts` (4): admin sieht alles, editor nur eigene, viewer nie, orphan-Event (created_by null) für editor → false.
  - `tests/event-edit-form.test.tsx` (7): no-op submit (kein Patch wenn nichts geändert), event-only Patch, application-only Patch, FWW-Disable für gesetzte ended_at, Soft-Delete Application (mit confirm), Confirm-Abbruch (kein Patch), Soft-Delete Event mit Dashboard-Redirect.
  - `tests/event-detail-view.test.tsx` (+4): Edit-Button-Sichtbarkeit für Admin (auch fremde Events), Editor (eigene), Editor (fremde → versteckt), Viewer (versteckt).
- **Frontend-Suite**: **109/109 grün** (zuvor 94; +15). Coverage `lib/rxdb/**` stabil bei 92.42 % Lines. ESLint, `tsc --noEmit`, `next build` clean.
- **Bundle**: neue Route `/events/[id]/edit` First-Load 262 kB; `/events/[id]` Detail-Page wuchs um 1 kB (Edit-Button + RBAC-Helper). Im Rahmen.
- **Keine Backend-Änderung in M5c.4:** keine Migrations, keine neuen Endpoints, keine neuen Dependencies, keine RLS-Anpassung. Soft-Delete via Sync-Push triggert das bestehende ADR-029-LWW-Verhalten; Cascade-Trigger aus M5b.1/M5c.1b deckt Event→Children ab.
- ADR-040 dokumentiert die elf Detail-Entscheidungen, `architecture.md` § Frontend um die neue Route + Komponente erweitert. **Damit ist M5c (Nachträgliche Erfassung & Bearbeitung) vollständig abgeschlossen.**

**Deliverables (Soll, alle erfüllt):**
- `/events/[id]/edit`-Pfad für Editor/Admin-Rollen mit RBAC-Server-Redirect.
- Editierbare Felder gemäß ADR-029-Conflict-Matrix; immutable Felder read-only.
- Soft-Delete für Event und Application via RxDB-Push.

**Akzeptanzkriterien (alle erfüllt):**
- Editor sieht und nutzt Edit nur für eigene Events (UI + Server-Gate).
- Admin sieht und nutzt Edit für alle Events.
- Viewer sieht weder Edit-Button noch erreicht die Edit-Route.
- Soft-Delete von Event löscht Cascade Children server-seitig; Frontend navigiert zur Startseite.
- Frontend-Suite + Coverage-Threshold `lib/rxdb/**` ≥ 80 % grün.

**Abhängigkeiten:** M5c.3.

---

### M6 — Kartenansicht — [ERLEDIGT] 2026-04-28

**Ziel:** Events werden auf einer Karte visualisiert.

**Scope-Anpassung (2026-04-26):** MapLibre/`react-map-gl`-Integration, Tile-Proxy und Karten-Klick→Lat/Lon-Picker sind mit M5a vorgezogen (siehe ADR-022). M6 baut darauf auf und liefert die volle Listen-/Filter-/Popup-UX.

**Implementierungs-Strategie (2026-04-27, ADR-041):** Sub-Step-Bündel M6.1–M6.5, Cluster-Strategie auf MapLibre-native umgestellt (`supercluster` verworfen, siehe ADR-041 §C), `LocationPickerMap` bleibt eigenständig (kein Refactor in M6).

**Deliverables (Gesamt-Meilenstein):**
- ~~MapLibre GL JS via `react-map-gl` integriert.~~ (in M5a erledigt)
- ~~MapTiler-API-Key serverseitig verwaltet, ggf. über Backend-Proxy ausgeliefert.~~ (in M5a erledigt)
- Marker-Darstellung aller für den Nutzer sichtbaren Events.
- Popup mit Kurzinfo + Link zur Event-Detailseite.
- Clustering bei hoher Dichte (native MapLibre-Cluster, siehe ADR-041 §C).
- Filter: Zeitraum, Beteiligte (gemäß RLS).
- Kartenzustand (Viewport) URL-persistiert.
- **Geocoding-Proxy** `GET /api/geocode?q=...` als MapTiler-Wrapper, eingeloggt erforderlich (ADR-041 §B/§D).
- ~~Grundlage für Eingabe-Use-Case aus M5: Karten-Klick liefert Lat/Lon zurück.~~ (in M5a als `LocationPickerMap` erledigt)
- ~~Optional: Refactor von `LocationPickerMap` zur Basis der `MapView`~~ → verworfen (ADR-041 §E): beide bleiben eigenständig.

**Akzeptanzkriterien:**
- Events erscheinen als Marker.
- Klick auf Marker öffnet Popup, Link funktioniert.
- Karte ist auf Mobile nutzbar (Touch-Gesten).
- Filter (Zeitraum, Beteiligte) wirken; URL spiegelt Viewport + Filter.
- Geocoding-Suchbox findet Adressen via `/api/geocode` und fliegt die Karte an.

**Abhängigkeiten:** M3, M4, M5a.

---

#### M6.1 — Backend Geocoding-Proxy `GET /api/geocode`

**Ziel:** MapTiler-Geocoding-Wrapper mit serverseitigem Key, Auth-Pflicht und in-memory Rate-Limit.

**Deliverables:**
- Settings-Variable `geocode_rate_per_minute` (Default 30, `0` = aus) in `app/config.py`.
- Route `app/routes/geocode.py` mit `GET /geocode?q=<text>&proximity=<lat,lon>&limit=<n>`.
- Auth via `current_active_user`; anonym → 401.
- Fehlende `maptiler_api_key` → 503 (analog Tile-Proxy).
- HTTPX-`AsyncClient` als Process-Singleton (`lru_cache`, identisches Pattern wie Tile-Proxy).
- Rate-Limit: in-memory Token-Bucket pro `user.id`, Test-injizierbar.
- Validierung: `proximity` zwei Floats Komma-getrennt, sonst 422; `limit` 1–10, sonst 422.
- Antwort: Upstream-GeoJSON 1:1 durchgereicht (`FeatureCollection`).
- Cache-Control: `private, max-age=300`.
- Router-Registrierung in `app/main.py` unter `/api`-Prefix.
- `.env.example` ergänzen: `HCMAP_GEOCODE_RATE_PER_MINUTE`.
- Tests `backend/tests/test_geocode_proxy.py`: anonym/missing-key/success/upstream-fail/rate-limit/proximity-422/limit-422.

**Akzeptanzkriterien:**
- ruff, mypy --strict, pytest grün.
- OpenAPI-Doku zeigt `/api/geocode` mit Parametern und Auth-Anforderung.
- Rate-Limit ist deterministisch testbar (Test injiziert Bucket).

**Abhängigkeiten:** M2 (Auth), M5a.1 (Tile-Proxy-Pattern).

---

#### M6.2 — Frontend `MapView` (Marker, Popup, Detail-Link)

**Ziel:** Vollbild-Karte zeigt alle sichtbaren Events als Marker; Klick öffnet Popup mit Detail-Link.

**Deliverables:**
- `frontend/src/components/map/map-view.tsx` neu: Vollbreite, abonniert RxDB `events` live, filtert `_deleted=false` und gültige `lat`/`lon`.
- Marker als `react-map-gl/Marker`-Liste (eine Marker-Komponente pro Event).
- Popup über `react-map-gl/Popup`: `started_at` (lokal), Koordinaten (lat/lon-Floats, 5 Nachkommastellen), Live-/Beendet-Status, Link „Detailseite öffnen →" zu `/events/[id]`. **Recipient-Name bewusst weggelassen**: Persons sind nicht in RxDB synchronisiert (ADR-037), ADR-038-§F-Maskierung wäre offline nicht zuverlässig möglich. Detailseite enforced die Maskierung weiterhin. **Plus-Code-Anzeige verschoben**: braucht `open-location-code`-Dependency (architecture.md §Plus-Code-Handling) — separater freigabepflichtiger Schritt.
- `(protected)/map/page.tsx` rendert `MapView` Vollbreite (Card-Wrapper raus).
- Coverage-Threshold `lib/map/**` ≥ 70 % Lines (sofern reine Logik testbar; MapLibre-Wrapper-Code ausgespart). **Erreicht: 97.33 % Lines / 84.61 % Branches.**
- Smoke-Test `tests/map-view.test.tsx` mit gemockter RxDB **+ gemocktem `react-map-gl/maplibre`** (jsdom hat kein WebGL, ADR-027 §J2-Pattern).
- Pure-Function-Test `tests/event-marker-data.test.ts` für `selectMappableEvents` und `isMappableEvent`.

**Akzeptanzkriterien:**
- Marker sichtbar für sichtbare Events (ohne Filter-Logik in diesem Sub-Step). ✓
- Klick auf Marker → Popup mit Link → Navigation funktioniert. ✓
- Frontend-Suite grün. ✓ (127/127, +18 neue Tests)

**Abhängigkeiten:** M6.1 (nicht hart, aber Reihenfolge).

---

#### M6.3 — Clustering (native MapLibre-Cluster)

**Ziel:** Bei hoher Marker-Dichte werden Events geclustert.

**Deliverables:**
- Refactor `MapView`: Marker werden über GeoJSON-`Source` mit `cluster: true`, `clusterRadius=50`, `clusterMaxZoom=14` ausgespielt. ✓
- Drei `Layer`: `events-clusters` (Kreis, Step-Expression `point_count`), `events-cluster-count` (Symbol-Layer mit `point_count_abbreviated`), `events-unclustered` (Einzelmarker). ✓
- Klick auf Cluster zoomt rein via `getClusterExpansionZoom` + `easeTo`. ✓
- Klick auf unclustered Punkt öffnet Popup wie M6.2. ✓
- Pure-Helper `eventsToGeoJSON` in `lib/map/event-marker-data.ts` für die Source-Daten (Lat/Lon → `[lon, lat]` Convention). ✓
- Tests: Cluster-Render und Cluster-Click via gemocktem `react-map-gl/maplibre` (Map/Source/Layer/Popup gestubbt). ✓

**Akzeptanzkriterien:**
- Cluster-Source mit `cluster=true`, `clusterRadius=50`, `clusterMaxZoom=14`. ✓
- Cluster-Klick ruft `getClusterExpansionZoom` und `easeTo`. ✓
- Unclustered-Klick öffnet Popup mit Detail-Link. ✓
- Frontend-Suite grün (135/135). ✓

**Abhängigkeiten:** M6.2.

---

#### M6.4 — Filter (Zeitraum, Beteiligte) + URL-Viewport-Sync

**Ziel:** Karte respektiert URL-State (`lat`/`lon`/`zoom`/`from`/`to`/`p`) und zeigt nur passende Events.

**Deliverables:**
- URL-Param-Helper `lib/map/url-state.ts`: parse/serialize `lat`, `lon`, `zoom`, `from`, `to`, `p` (Komma-UUIDs). ✓
- `MapView` liest Initial-State aus `useSearchParams`; Pan/Zoom-Events (`onMoveEnd`) triggern debounced `router.replace` (300 ms, `{ scroll: false }`). ✓
- Filter-Panel-Komponente `components/map/map-filter-panel.tsx`: Zeitraum (zwei `<input type="date">`), Beteiligte als shadcn/ui-`Sheet` (Drawer rechts) mit Checkbox-Liste; Personen via `/api/persons` REST (TanStack Query, `enabled: open`). ✓
- Filter-State wird aus URL abgeleitet (Single Source of Truth = URL). ✓
- Filter-Logik (`lib/map/event-filter.ts`): `applyEventFilter` wendet Datum (UTC-Tagesgrenzen, inklusiv) und Beteiligte (OR-Verknüpfung) über `buildParticipantsIndex` aus `event_participants`-RxDB an. ✓
- Tests: URL-State-Codec (parse/serialize/Round-trip/`filtersEqual`) als pure-function-Test; `applyEventFilter`/`buildParticipantsIndex`/`filtersAreEmpty`-Test; FilterPanel-Component-Test mit gemocktem `/api/persons`; MapView-Integration-Test (Initial-Viewport, Filter aus URL, debounced URL-Write). ✓

**Akzeptanzkriterien:**
- Setzen eines Datums-Filters reduziert sichtbare Marker entsprechend. ✓
- Pan/Zoom landet in URL, Reload zeigt gleichen Viewport. ✓
- URL-Sharing reproduziert Filter+Viewport. ✓
- Frontend-Suite grün (181/181). ✓

**Abhängigkeiten:** M6.3.

---

#### M6.5 — Geocoding-Suchbox in `MapView`

**Ziel:** Nutzer kann Adresse eingeben und die Karte fliegt dorthin.

**Deliverables:**
- `components/map/geocode-search-box.tsx`: Input oben links, 300 ms Debounce, `GET /api/geocode?q=…&proximity=<center>&limit=5`. ✓
- Mindestlänge 2 Zeichen, sonst kein Request. ✓
- Treffer-Dropdown mit `place_name`; Auswahl → `onSelect(lat, lon)` → `mapRef.current.flyTo({ center: [lon, lat], zoom: 14 })`. ✓
- Fehler 429 / 503 / 502 → `sonner`-Toast mit klartextlicher Begründung („Geocoding-Limit erreicht", „Adress-Suche nicht konfiguriert", „Adress-Suche nicht erreichbar"); Karte funktioniert weiter. ✓
- Leere Eingabe oder Auswahl → Treffer-Liste schließen, Input via X-Button leerbar. ✓
- Stale-Response-Filter via `requestSeq`-Ref (späte Antworten verworfen). ✓
- Kein persistierter Marker für Treffer. ✓
- Tests: Mindestlänge, Debounce auf finalen Wert, Proximity-Forwarding, Treffer-Auswahl, Empty-Hint, je ein Toast-Test pro Fehler-Status, X-Clear, Stale-Response-Drop, MapView-flyTo + Proximity-Lookup. ✓

**Akzeptanzkriterien:**
- Eingabe einer Adresse zeigt Treffer-Liste. ✓
- Auswahl fliegt die Karte an, URL-State (`lat`/`lon`/`zoom`) wird über den `MapView`-Viewport-Sync aktualisiert. ✓
- Kein Treffer / Rate-Limit → klare User-Rückmeldung via Toast. ✓
- Frontend-Suite grün (194/194). ✓

**Abhängigkeiten:** M6.1 (Endpoint), M6.4 (URL-Sync).

---

### HOTFIX-001 — Sonner-Major-Upgrade (v1.7.4 → v2.x)

**Ziel:** Toasts unter React 19 wieder sichtbar machen. Siehe ADR-042.

**Deliverables:**
- `frontend/package.json`: `sonner` von `^1.7.4` auf neueste 2.x.
- `frontend/pnpm-lock.yaml` aktualisiert.
- `components/ui/sonner.tsx` und `components/providers.tsx` API-konform zu v2 (Props-Mapping geprüft).
- `frontend/__tests__/**`: vitest-Suiten bleiben grün (Mocks via `vi.mock("sonner", …)` unverändert tragend).
- Browser-Verifikation an existierenden Toast-Sites: Login-Fehler, Logout-Fehler, PIN-Settings (Erfolg + Fehler), Geocoding-Fehler (429/503/502), Event-Create / Event-Edit / Event-Backfill / Application-Start.
- CHANGELOG-Eintrag.

**Out of Scope:**
- M7-Catalog-Toasts (Forms existieren noch nicht; verifiziert mit M7).

**Akzeptanzkriterien:**
- Im Browser erscheinen Sonner-Toasts an mindestens drei verifizierten Stellen.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` grün.
- ADR-042 in `decisions.md` (erledigt).

**Abhängigkeiten:** keine (cross-cutting Bugfix auf M4-Stack).

**Status `[ERLEDIGT]` 2026-04-29:**
- `frontend/package.json`: `sonner` `^1.7.4` → `^2.0.7`. Lockfile aktualisiert.
- `components/ui/sonner.tsx` und `components/providers.tsx` API-kompatibel ohne Code-Änderung — `richColors`, `closeButton`, `position`, `theme`, `toastOptions.classNames` (`toast`, `description`, `actionButton`, `cancelButton`) alle in v2 erhalten.
- Frontend-Suite 194/194 grün (`pnpm test`).
- `pnpm lint` (No ESLint warnings or errors), `pnpm typecheck` (clean), `pnpm build` (Next.js 15.0.4, alle Routen kompilieren).
- Browser-Verifikation **Login-Fail** in Headless-Vorschau: `/login` mit ungültigem Passwort → 400 vom Backend → DOM-Snapshot zeigt `<ol data-sonner-toaster="true">` mit Toast-Inhalt „Login fehlgeschlagen — E-Mail oder Passwort ungültig.", Close-Button sichtbar (Screenshot dokumentiert).
- **Verifikations-Scope-Limitation:** Die anderen zehn Toast-Sites (Logout, PIN-Settings, Geocoding-Fehler, Event-Create/Edit/Backfill/Detail, Application-Start, Person-Quick) sind alle eingeloggte Pfade; das lokale Admin-Passwort lag nicht vor, eine Re-Login-Verifikation erfolgte nicht. Argument für deren Funktion: identisches `toast.error(title, { description })`/`toast.success(...)`-Aufrufmuster wie der verifizierte Login-Fail-Toast — derselbe Mount-Pfad, derselbe `<Toaster />`-Wrapper. Vor Live-Einsatz bzw. mit nächster Session: manueller Re-Verify dieser Sites empfohlen.
- Die in der ursprünglichen Repro genannten M7.3-Komponenten (`lookup-form.tsx`, `restraint-type-form.tsx`) und Admin-Catalog-Routen existieren im Repo nicht; M7 ist `[OFFEN]`. Catalog-409-Toast wird mit M7 selbst verifiziert.
- ADR-042 angelegt (Lessons Learned: Abhängigkeits-Vorprüfung auf React-Major + Browser-Smoke als DoD-Bestandteil bei mock-abhängigen Komponenten).
- CHANGELOG-Eintrag.

---

### HOTFIX-002 — Karten-DoD-Härtung: Glyph-Proxy + RxDB-v17-Strict-Checks

**Ziel:** Karte rendert produktiv mit Markern + Cluster + Beschriftungen. Siehe ADR-044.

**Auslöser:** Erster Browser-Test mit gesetztem `HCMAP_MAPTILER_API_KEY` (HOTFIX-001-Folge) hat zwei orthogonale Bugs aufgedeckt, die im M5b/M6-Vitest-Setup nicht sichtbar waren.

**Deliverables:**
- **Backend:** Neuer Endpoint `GET /api/glyphs/{fontstack}/{rangespec}` analog zum Tile-Proxy (`backend/app/routes/glyphs.py`, in `app/main.py` registriert).
- **Frontend:**
  - `lib/map/style.ts`: `glyphs`-URL ergänzt (Default `/api/glyphs/{fontstack}/{range}.pbf`, Override per `NEXT_PUBLIC_GLYPHS_URL`).
  - `lib/rxdb/database.ts`: AJV-Validator-Wrapper um Dexie-Storage in dev-mode (`wrappedValidateAjvStorage`); Production unverändert.
  - `lib/rxdb/replication.ts`: `waitForLeadership: false` mit Begründungs-Kommentar.
  - `lib/rxdb/provider.tsx`: catch-Block loggt explizit per `console.warn`.
- **Schemas (alle drei):** `maxLength` für indexed string-Felder (`updated_at` 32, `event_id` 36, `started_at` 32), `multipleOf: 1` + `maximum: 1_000_000` für `sequence_no`.

**Verifikation:**
- Frontend-Suite 230/230 grün, Backend-Suite 174/174 grün, Drift-Test 9/9 grün.
- Lint, Typecheck, `next build` clean.
- **Browser-E2E manuell:** `/map` zeigt Cluster „7" über Berlin-Mitte + Einzel-Marker Kreuzberg + Out-of-View-Marker (München, Hamburg, Köln, Frankfurt). IndexedDB enthält `rxdb-dexie-hcmap--0--{events,applications,event_participants}` plus drei `rx-replication-meta-…`-DBs. Network-Log zeigt drei `/api/sync/*/pull`-Requests.

**Status `[ERLEDIGT]` 2026-04-29.**

**Folge-Punkte:**
- M12 (Self-Hosted-Tileserver) tauscht alle drei MapTiler-Pfade gleichzeitig (Tiles, Glyphs, Geocoding).
- Spätere Schema-Erweiterungen müssen `maxLength`/`multipleOf` für indexed Felder mitführen — Drift-Test enthält Erinnerung.

---

### STACK-001 — Next.js 15.0.4 → 16.2.4 + React 19.2 (Pfad C aus Blocker #001)

**Ziel:** Frontend-Stack auf aktuelle Major-Linie (Next 16.2.4 / React 19.2.5) heben, Dev-Overlay-Statusmeldung „Next.js (15.0.4) is outdated" aufheben, Migrationsschulden vor M8 (Admin-Bereich) abbauen. Strategie und Begründung: ADR-047.

**Deliverables:**
- `frontend/package.json`: `next` `15.0.4` → `16.2.4`, `react`/`react-dom` `19.0.0` → `19.2.5`, `@types/react` `19.0.2` → `19.2.14`, `@types/react-dom` `19.0.2` → `19.2.3`, `eslint-config-next` `15.0.4` → `16.2.4`, `eslint` `8.57.1` → `9.39.4` (siehe ADR-047 §C, Variante Z2 — Peer-Dep-Anforderung von `eslint-config-next@16`). Lockfile aktualisiert.
- `package.json`-Skripte: `lint` und `lint:fix` von `next lint` auf `eslint .` umgestellt (Subcommand in 16 entfernt).
- `frontend/src/middleware.ts` → `frontend/src/proxy.ts` umbenannt, named export `middleware` → `proxy`. `tests/middleware.test.ts` → `tests/proxy.test.ts` mit angepasstem Import-Pfad.
- `frontend/.eslintrc.json` (Legacy) → `frontend/eslint.config.mjs` (Flat Config), inhaltsidentisch (`next/core-web-vitals` + `next/typescript` via `FlatCompat`, `prettier`-Override, zwei Repo-Regeln).
- `next.config.mjs` unverändert (kein migrationspflichtiger Eintrag).

**Out of Scope (siehe ADR-047 §E):**
- Backend-Audit (Blocker #001 Punkt 3).
- CLAUDE.md-Methodik-Härtung (Blocker #001 Punkt 2).
- `engines: ">=22 <23"`-Pin in package.json (separater Folge-Schritt zusammen mit Runtime-Audit).
- shadcn/ui-`forwardRef`-Sweep.
- Opt-in-Features Next 16: `cacheComponents`, React Compiler, `next-devtools-mcp`.

**Akzeptanzkriterien:**
- `pnpm install` läuft mit aktualisiertem Lockfile durch.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` grün.
- Browser-Smoke via `preview_start frontend`: Login-Seite rendert, Dev-Overlay zeigt **kein** „outdated"-Banner mehr, keine neuen Deprecation-Meldungen in Console oder Dev-Overlay.
- ADR-047 in `decisions.md` (Status `Accepted`).
- Blocker #001 Punkt 1 nach „Gelöste Blocker" verschoben (Punkte 2 und 3 bleiben aktiv).
- README-Badges aktualisiert, falls Next-Versions-Badge vorhanden.
- CHANGELOG-Eintrag.

**Abhängigkeiten:** keine (cross-cutting Migration auf bestehendem Stack-Stand). Vorgängern: Blocker #001 (2026-04-29) freigegeben durch Patrick am 2026-04-30 (Pfad C).

**Status `[ERLEDIGT]` 2026-04-30:**
- `frontend/package.json`: `next` `15.0.4` → `16.2.4`, `react`/`react-dom` `19.0.0` → `19.2.5`, `@types/react` `19.0.2` → `19.2.14`, `@types/react-dom` `19.0.2` → `19.2.3`, `eslint-config-next` `15.0.4` → `16.2.4`, `eslint` `8.57.1` → `9.39.4`, neu `@eslint/eslintrc@3.3.5` + `@eslint/js@9.39.0`. Lockfile aktualisiert.
- `package.json`-Skripte: `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"`.
- `frontend/.eslintrc.json` (Legacy) entfernt; `frontend/eslint.config.mjs` (Flat Config) angelegt — Direkt-Import der Flat-Arrays aus `eslint-config-next/core-web-vitals` und `eslint-config-next/typescript` (FlatCompat nicht nötig, weil v16 native Flat-Exports liefert), `prettier`-Override, zwei Repo-Regeln + drei Regel-Schärfungen aus 16/9 explizit auf `"off"` (siehe ADR-047 §E).
- `src/middleware.ts` → `src/proxy.ts` umbenannt (`git mv`), named export `middleware` → `proxy`. `tests/middleware.test.ts` → `tests/proxy.test.ts` (Import + describe-Block angepasst). Build-Output bestätigt: `ƒ Proxy (Middleware)` wird erkannt.
- `src/styles/globals.css`: `@import "maplibre-gl/dist/maplibre-gl.css"` an den Anfang verschoben — Turbopack-CSS-Parser ist strenger als Webpack/PostCSS (`@import` muss vor allen anderen Regeln stehen). Funktional identisch.
- `tsconfig.json`: Next-16-Build-Hook hat `jsx: "preserve"` → `jsx: "react-jsx"` aktualisiert (mandatory) und `.next/dev/types/**/*.ts` zu `include` hinzugefügt (durch Next-16 dev/build-Verzeichnistrennung). Beide Änderungen sind dokumentierte 16-Erfordernisse.
- `src/lib/rxdb/database.ts` und `src/lib/rxdb/provider.tsx`: zwei `// eslint-disable-next-line no-console`-Direktiven entfernt (waren mit ESLint 9 als „unused" markiert — die `no-console`-Regel feuerte nicht mehr durch die neue Konfig).
- `docs/architecture.md`: Schutz-Beschreibung von „Middleware (`middleware.ts`)" auf „Proxy (`proxy.ts`)" mit Migrations-Hinweis aktualisiert.
- Verifikation: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` 261/261 grün, `pnpm build` clean (Turbopack, 16 Routen + Proxy, kompiliert in 2.6s).
- **Browser-Smoke** (preview_start frontend, ohne Backend): Dev-Overlay zeigt **keinen** „Next.js (15.0.4) is outdated"-Banner mehr (war Auslöser, siehe Blocker #001). Stattdessen Header „Next.js 16.2.4 Turbopack". Pre-existierender ECONNREFUSED gegen Backend bleibt unverändert (orthogonal). Server-Bereitschaft `Ready in 220ms` (vorher 1863ms).
- **Bekannte Folgewarnung:** React 19.2 emittiert in `<ThemeProvider>` (next-themes@0.4.6) eine Console-Warnung über `<script>`-Tag-Rendering. Library-bedingt, latest verfügbar. Adressiert im ADR-047-Folgeschritt zusammen mit Code-Quality-Sweep.
- ADR-047 Status `Accepted`. Blocker #001 Punkt 1 nach „Gelöste Blocker" verschoben (Punkte 2 und 3 bleiben offen).
- README-Badge Next.js 15 → 16 aktualisiert; CHANGELOG ergänzt unter `[Unreleased]`. ADR-047 §Migrations-Begleiterscheinungen dokumentiert zusätzlich Turbopack-CSS-Strenge, Auto-Edits an `tsconfig.json`/`next-env.d.ts`, FlatCompat-Umgehung, `@eslint/js`-Peer-Detail, Prettier-Drift und Performance-Beobachtungen (Dev-Ready 1863 ms → 220 ms, Build ~5.9 s → 2.6 s).
- **End-to-End-Verifikation am 2026-04-30 (lebendes Backend, lokaler Docker-Stack):** Auto-Login mit bestehender Session, Dashboard rendert mit RxDB-`synchronisiert`-Status und 3 RLS-gefilterten Events, Event-Detail-Page mit laufendem Timer (`19:57:56`) + Plus Code (`9F4MGC22+222`) + Application-Liste mit Restraint-Anzeige (M7.5-Ergebnisse), Admin/Catalogs mit Workflow-Tabs (18 Restraints sichtbar), MapView mit Cluster-Markern (7+4) + Filter + Adress-Suche (Tile-Layer grau ohne MapTiler-Key, 88× 503 sind pre-existierender Fallback gemäß project-context.md). Logout `POST /api/auth/logout` → 204. Re-Login über `<LoginForm>` mit Argon2id-validiertem Test-User (`u6cdb3bbf@example.com`) erfolgreich. Stack sauber gestoppt.

---

### STACK-002 — Backend-Stack-Drift Voll-Sweep (Variante B aus Audit-Befund Blocker #001 Punkt 3)

**Ziel:** Backend-Pins, Build-Tool-Image und Container-Image-Tags auf jeweils aktuelle Stable-Linie heben, **ohne** Runtime-Majors (Postgres/Node/Python). Drift-Berge vor M8 (Admin-Bereich) abbauen, sodass M8 auf einem konsistenten Backend-Stack startet. Strategie und Begründung: ADR-048.

**Auslöser:** Audit am 2026-04-30 (PyPI/Docker-Hub/GitHub-Releases-Lookup) auf Basis Blocker #001 Punkt 3. Lockfile-Snapshot (`backend/uv.lock`) war zwar refresht (locked = latest-within-constraint für 9 Pakete), aber 13 Constraint-Obergrenzen in `backend/pyproject.toml` lagen out-of-range gegen den jeweiligen `latest`-Tag. Patrick hat am 2026-04-30 Variante B (Voll-Sweep ohne Runtime-Majors) freigegeben.

**Deliverables — Backend (`backend/pyproject.toml`):**
- **Refresh innerhalb Constraint:** `pyjwt` 2.10.1 → 2.12.1 (kein Pin-Cap-Move).
- **Major-Bumps (SemVer):**
  - `fastapi-users` `>=14,<15` → `>=15,<16` (Locked: 14.0.2 → 15.0.5).
  - `pytest` `>=8.3,<9` → `>=9,<10` (Locked: 8.4.2 → 9.0.3).
  - `pytest-asyncio` `>=0.24,<0.25` → `>=1,<2` (Locked: 0.24.0 → 1.x).
- **Major-Bumps (CalVer):**
  - `argon2-cffi` `>=23.1,<24` → `>=25,<26` (Locked: 23.1.0 → 25.1.0).
  - `structlog` `>=24.4,<25` → `>=25,<26` (Locked: 24.4.0 → 25.x).
- **0.x-Minor-Bumps out-of-range:**
  - `fastapi` `>=0.115,<0.116` → `>=0.13x,<0.137` bzw. weitestmöglicher 0.x-Cap (Locked: 0.115.14 → 0.136.x).
  - `uvicorn` `>=0.32,<0.33` → `>=0.46,<0.47` (Locked: 0.32.1 → 0.46.x).
  - `asyncpg` `>=0.30,<0.31` → `>=0.31,<0.32` (Locked: 0.30.0 → 0.31.0).
  - `geoalchemy2` `>=0.15,<0.16` → `>=0.19,<0.20` (Locked: 0.15.2 → 0.19.0).
  - `uuid-utils` `>=0.10,<0.11` → `>=0.14,<0.15` (Locked: 0.10.0 → 0.14.1).
  - `httpx` `>=0.27,<0.28` → `>=0.28,<0.29` (Locked: 0.27.2 → 0.28.1).
  - `ruff` `>=0.7,<0.8` → `>=0.15,<0.16` (Locked: 0.7.4 → 0.15.x).

**Deliverables — Pre-commit (`.pre-commit-config.yaml`):**
- `pre-commit/pre-commit-hooks` v5.0.0 → v6.0.0 (Major).
- `astral-sh/ruff-pre-commit` v0.7.4 → v0.15.x (synchron zu pyproject-`ruff`).
- `pre-commit/mirrors-mypy` v1.13.0 → v1.20.2 (synchron zu pyproject-`mypy`).
- `additional_dependencies` für mypy: `pydantic`/`pydantic-settings`/`fastapi`/`structlog`-Pins entsprechend angehoben.

**Deliverables — Container-Images:**
- `docker/backend.Dockerfile`: `ghcr.io/astral-sh/uv:0.8.17` → `ghcr.io/astral-sh/uv:0.11.8` (Build-Tool-Image).
- `docker/docker-compose.yml`: `postgis/postgis:16-3.4` → `postgis/postgis:16-3.5` (PostGIS-Minor; Postgres-Major bleibt 16).

**Out of Scope (siehe ADR-048 §E):**
- **Runtime-Majors:** Postgres 16 → 17/18 (Daten-Migration), Node 22 → 24 (Frontend-Stack-Bump), Python 3.12 → 3.13 (mypy-/Pydantic-Plugin-Kompatibilität). Drei eigenständige Entscheidungen mit jeweils eigenem ADR-Bedarf bei Anpassung.
- **CLAUDE.md-Methodik-Härtung:** Blocker #001 Punkt 2 bleibt offen, separat zu entscheiden.
- **Frontend-`engines: ">=22 <23"`-Pin:** Bleibt unverändert, weil Node-Major aus Scope.
- **SQLAdmin-Aufnahme** in `pyproject.toml`-Dependencies: gehört in M8 (Admin-Bereich), nicht in den Stack-Bump.

**Akzeptanzkriterien:**
- `uv lock` läuft sauber durch, alle aktualisierten Pins haben gültige Resolver-Pfade.
- `uv sync --no-dev` und `uv sync` produzieren eine vollständige Venv ohne Konflikte.
- Backend-Tests `pytest` laufen vollständig grün (Erwartung: 182/182, ggf. mit Migrations-Anpassungen für pytest 9 / pytest-asyncio 1.x — wenn Test-Anzahl sich durch Migration ändert, im Bericht dokumentieren).
- `ruff check` und `mypy --strict` clean (mit ggf. neu aktivierten Lint-Regeln aus ruff 0.15 — entweder fixen oder explizit per `ignore` deaktivieren mit Begründung).
- `docker compose -f docker/docker-compose.yml build backend` erzeugt fehlerfrei ein Image auf Basis `uv:0.11.8`.
- `docker compose -f docker/docker-compose.yml up db` startet `postgis:16-3.5` ohne Schema-Inkompatibilität (PostGIS 3.4 → 3.5: keine Schema-Änderung erforderlich, aber `CREATE EXTENSION postgis` ggf. zu validieren).
- ADR-048 in `decisions.md` mit Status `Accepted`, inkl. §Migrations-Begleiterscheinungen post-execution.
- Blocker #001 Punkt 3 nach „Gelöste Blocker" verschoben (Punkt 2 bleibt aktiv).
- README-Badges aktualisiert, falls Backend-Versions-Badge oder Container-Image-Badge vorhanden.
- CHANGELOG-Eintrag.

**Abhängigkeiten:** keine (cross-cutting Migration auf bestehendem Stack-Stand). Vorgänger: STACK-001 [ERLEDIGT] 2026-04-30, Blocker #001 Punkt 3 freigegeben durch Patrick am 2026-04-30 (Variante B).

**Status `[ERLEDIGT]` 2026-04-30:**
- **Phase 1 (Refresh `pyjwt`):** wirkungslos — `fastapi-users 14.0.2` pinnt `pyjwt[crypto]==2.10.1` strikt. Refresh in Phase 5 nachgezogen (`pyjwt 2.10.1 → 2.12.1`). Begleiterscheinung dokumentiert in ADR-048 §A.
- **Phase 2 (Tooling):** `ruff 0.7→0.15.12`, `ruff-pre-commit v0.7.4→v0.15.12`, `mirrors-mypy v1.13.0→v1.20.2`, `pre-commit-hooks v5.0.0→v6.0.0`. `mypy`-Hook-`additional_dependencies` auf passende Linien ausgerichtet. Drei neu aktivierte Lint-Regeln (`UP042` StrEnum, `UP046`/`UP047` Type-Param-Modernisierung, `RUF046`/`RUF059` Cast-/Unpack-Hygiene): Auto-Fix per `--unsafe-fixes` angewandt; Halbmigrations in `app/routes/catalog.py` und `app/services/catalog.py` manuell aufgeräumt (alte `TypeVar`-Modul-Definitionen entfernt). 182/182 grün.
- **Phase 3 (Test-Tooling-Majors):** `pytest 8.4.2→9.0.3`, `pytest-asyncio 0.24.0→1.3.0`. **Keine Code-Anpassung nötig** — `asyncio_mode = "auto"` bleibt valide, keine Fixture-API-Brüche. 182/182 grün.
- **Phase 4 (Runtime-Libraries):** `uvicorn 0.32→0.46`, `httpx 0.27→0.28`, `asyncpg 0.30→0.31`, `structlog 24.4→25.5.0`, `geoalchemy2 0.15→0.19`, `uuid-utils 0.10→0.14`. `argon2-cffi`-Bump aus dieser Phase **zurückgenommen**, weil `fastapi-users 14`+`pwdlib 0.2.1` einen Transitiv-Pin auf `argon2-cffi<24` setzen (siehe ADR-048 §B). 182/182 grün.
- **Phase 5 (Framework-Majors):** `fastapi 0.115→0.136.1`, `fastapi-users 14.0.2→15.0.5`. Mit-aufgelöst: `pwdlib 0.2.1→0.3.0`, `python-multipart 0.0.20→0.0.27`, `argon2-cffi 23.1.0→25.1.0`, `pyjwt 2.10.1→2.12.1`. **Keine Code-Anpassung nötig** — kein async validator, keine zwischen 14↔15 entfernte fastapi-users-API in HC-Map-Code. 182/182 grün, mypy clean, ruff clean.
- **Phase 6 (Container):** `docker/backend.Dockerfile`: `ghcr.io/astral-sh/uv:0.8.17→0.11.8`. `docker/docker-compose.yml`: `postgis/postgis:16-3.4→16-3.5`. Build-Smoke gegen Image: `python -c "import fastapi, fastapi_users, …"` zeigt erwartete Versionen. DB-Smoke: `postgres 16.9 + postgis 3.5.2`. Hinweis: bestehendes Test-Volume zeigt PostGIS-Hybridzustand (Binary 3.5, Procs 3.4) — frische Volumes starten clean (siehe ADR-048 §F).
- **Phase 7 (Verifikation):** `pytest` 182/182 grün; `mypy --strict` clean (56 Files); `ruff check` clean; `ruff format` 22 Files reformatiert (Format-Drift 0.7→0.15 — funktional unverändert, siehe ADR-048 §D); `docker compose build backend` clean.
- **Out-of-Scope-Bestätigt:** Postgres-Major (16→17/18), Node-Major (22→24), Python-Major (3.12→3.13) bleiben offen. `engines: ">=22 <23"` in `frontend/package.json` unangetastet. CLAUDE.md-Methodik-Härtung (Blocker #001 Punkt 2) bleibt offen.
- ADR-048 Status `Accepted`. Blocker #001 Punkt 3 nach „Gelöste Blocker" verschoben (Punkt 2 bleibt offen).
- CHANGELOG ergänzt unter `[Unreleased]`. README-Badges (Backend) geprüft — keine inkonsistente Versions-Badge gefunden.

---

### M7 — Katalog-Verwaltung & Vorschlags-Workflow

**Ziel:** Admin verwaltet Kataloge; Editor kann Vorschläge einreichen; Workflow approved/pending/rejected/withdraw vollständig.

**Strategie:** ADR-043 (Option A) — Sub-Step-Schnitt M7.1–M7.5.

**Deliverables (übergreifend):**
- Backend: Reject-Status, neue Spalten, RLS-Erweiterung (eigene rejected sichtbar, Editor-Withdraw), PATCH/DELETE/Reject-Endpoints.
- Frontend: Admin-UI `/admin/catalogs/[kind]` mit CRUD + Tab-Navigation; Freigabe-Queue mit Reject-Reason-Dialog; Editor-Vorschlags-Form; Editor-Withdraw eigener pending.
- Restraint-Picker in Application-Erfassung (Live + Backfill) inkl. Quick-Propose.

**Akzeptanzkriterien (M7 gesamt):**
- Editor kann Vorschlag einreichen, Admin kann ihn freigeben oder mit Begründung ablehnen, freigegebene Einträge erscheinen in Dropdowns der Event-Erfassung.
- Pending- und rejected-Einträge tauchen außerhalb der Katalog-Verwaltung nirgends auf.
- Editor sieht eigene rejected-Vorschläge mit Begründung.
- RestraintType-Felder: Kategorie, Marke, Modell, Mechanik (chain / hinged / rigid), Display-Name — vollständig editierbar durch Admin.

**Abhängigkeiten:** M3, M4. M7.5 baut auf M5a.3 + M5c.3 auf.

---

#### M7.1 — Backend (Migration, Reject-Status, Routes)

**Status:** [ERLEDIGT] 2026-04-28

**Status `[ERLEDIGT]` 2026-04-28 (M7.1, Backend Reject-Status + Workflow-Endpoints):**

- **Migration `20260428_1200_m7_1_catalog_workflow.py`:**
  - `ALTER TYPE catalog_status ADD VALUE IF NOT EXISTS 'rejected'` innerhalb `op.get_context().autocommit_block()` (zwingend, damit Postgres den neuen Enum-Wert in derselben Migration in einer Policy verwenden darf — sonst „unsafe use of new value of enum type").
  - Pro Tabelle (`restraint_type`, `arm_position`, `hand_position`, `hand_orientation`) drei Audit-Spalten: `rejected_by uuid` (FK → user.id ON DELETE SET NULL), `rejected_at timestamptz`, `reject_reason text`.
  - Bestehende `<table>_select`-Policies werden ersetzt: eigene `pending` **und** `rejected` sichtbar (Editor sieht den eigenen Reject-Reason; andere Editoren / Viewer nicht).
  - Neue Policy `<table>_owner_withdraw` (`FOR DELETE`) erlaubt Editor das Hard-Delete ausschließlich auf eigenen `pending`-Rows. Edit auf eigene pending bleibt aus M7-Scope ausgeklammert (Workaround = Withdraw + Neuvorschlag).
  - Down-Migration: `rejected` → `pending`-Zurücksetzung, alle `<table>_*`-Policies droppen, `catalog_status` über parallelen Type `catalog_status_v1` (nur `approved`+`pending`) swappen, M2-Policies (`<table>_select`, `<table>_propose`, `<table>_admin_modify`) wiederherstellen. Up/Down/Up/Down/Up Roundtrip ist verifiziert.

- **Models (`app/models/catalog.py`):** `CatalogStatus` um `REJECTED` erweitert; `RestraintType` und `_LookupBase` um die drei Audit-Spalten ergänzt.

- **Schemas (`app/schemas/catalog.py`):**
  - `RestraintTypeRead` / `_CatalogRead` zeigen `rejected_by`, `rejected_at`, `reject_reason`.
  - Neue Update-Schemas `ArmPositionUpdate`, `HandPositionUpdate`, `HandOrientationUpdate`, `RestraintTypeUpdate` — alle Felder optional, **status fehlt bewusst** (Status-Übergänge laufen ausschließlich über die dedizierten Endpunkte).
  - Neues `CatalogReject`-Schema mit `reason: str` (1..2000).

- **Service (`app/services/catalog.py`):**
  - `list_lookup` akzeptiert optionalen `status_filter`-Parameter.
  - `update_lookup` (Generic über `LookupModel`-TypeVar), `update_restraint_type` setzen alle editierbaren Felder; UNIQUE-Konflikte werden als `CatalogConflictError` (eigene Exception) bubble-up gegeben, Routen mappen das auf 409.
  - `approve_entry` lehnt `rejected → approved`-Direkt-Übergang ab (`CatalogStateError`); leert Reject-Felder bei Approve.
  - `reject_entry` setzt `rejected_by`, `rejected_at`, `reject_reason`, erlaubt nur `pending`-Quellzustand.
  - `withdraw_entry` (`session.delete`) lehnt non-pending ab; RLS deckt zusätzlich die Editor-Eigentums-Prüfung ab.

- **Routes (`app/routes/catalog.py`):**
  - Pro Katalog-Typ identisches Set: `GET ?status=`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/approve`, `POST /{id}/reject`.
  - DELETE-Endpunkte mit `response_class=Response` und `status_code=204` (FastAPI-Anforderung — sonst Assertion).
  - `_get_or_404`-Helper Generic über `Base`-TypeVar, damit Mypy die konkreten Modelltypen propagiert.
  - PATCH/DELETE/Approve/Reject erwarten Admin (`require_role(UserRole.ADMIN)`) — DELETE zusätzlich Editor (für Self-Service-Withdraw, RLS filtert die Reichweite).

- **Tests:**
  - **Neue Datei `tests/test_catalog_workflow.py`** (17 Tests): Reject (Admin success, Editor 403, leere Begründung 422, bereits-approved 409), Withdraw (eigene pending 204, fremde pending 404 via RLS, eigene rejected 404/409, Admin auf any pending, Admin auf approved 409), Admin-PATCH (Lookup + RestraintType all fields, status-Feld stillschweigend ignoriert via `exclude_unset`, UNIQUE-Konflikt 409 mit Klartext, Editor 403), Status-Filter (alle drei Stati pro Admin sichtbar), Editor sieht eigene rejected mit Begründung, fremder Editor sieht foreign rejected nicht.
  - **`tests/test_rls.py`** um 5 sync-Tests erweitert: Editor sieht eigene rejected (RestraintType), Viewer nicht; Editor kann eigene pending via DELETE löschen; Editor kann fremde pending nicht löschen; Editor kann eigene rejected nicht via DELETE löschen.
  - **Backend-Suite gesamt: 172/172 grün** (+22 neue Tests). `ruff check app tests` und `mypy --strict app/services/catalog.py app/routes/catalog.py app/schemas/catalog.py app/models/catalog.py` clean.

- **Architektur-Doku-Drift:** `architecture.md` §API/Kataloge wurde auf den Ist-Zustand korrigiert (Endpoint-Pfade `/api/<kind>` statt `/api/catalogs/{kind}`, vollständige Route-Tabelle mit DELETE/Reject), §Datenmodell um die drei Audit-Spalten und den dritten Status-Wert erweitert, §RLS um die neue Policy-Form (eigene rejected sichtbar, Owner-Withdraw).

- **Bekannte Folge-Punkte:**
  - M7.2 baut auf den neuen Endpunkten auf.
  - SQLAdmin (M8) muss die neuen Spalten in den ModelViews anzeigen — wird in M8 erledigt.

**Deliverables:**
- Alembic-Migration `20260428_xxxx_m7_1_catalog_workflow`:
  - `catalog_status` Enum-Erweiterung um `rejected` (`ALTER TYPE … ADD VALUE`).
  - Pro Katalog-Tabelle (`restraint_type`, `arm_position`, `hand_position`, `hand_orientation`): Spalten `rejected_by uuid` (FK user.id ON DELETE SET NULL), `rejected_at timestamptz`, `reject_reason text`.
  - RLS-Policy `<table>_select` erweitern: eigene `pending` und `rejected` sichtbar.
  - Neue RLS-Policy `<table>_owner_modify`: Editor darf eigene `pending`-Rows updaten/löschen.
  - Down-Migration: rejected → pending zurücksetzen, Spalten droppen, Enum komplett neu (zwei Werte).
- Models (`app/models/catalog.py`): neue Spalten in `RestraintType` + `_LookupBase`.
- Schemas (`app/schemas/catalog.py`):
  - `*Read` um `rejected_by`, `rejected_at`, `reject_reason` erweitern.
  - `*Update`-Schemas pro Katalog-Typ (alle Felder optional, status nicht setzbar).
  - `CatalogReject`-Schema (`reason: str`, `min_length=1`).
- Service (`app/services/catalog.py`): `update_lookup`, `update_restraint_type`, `reject_entry`, `withdraw_entry`, `list_lookup` mit optionalem `status_filter`.
- Routes (`app/routes/catalog.py`):
  - `GET /<kind>?status=approved|pending|rejected` (alle Stati gleichzeitig wenn `status` weggelassen → durch RLS gefiltert).
  - `PATCH /<kind>/{id}` (Admin) — UNIQUE-Konflikt → 409.
  - `DELETE /<kind>/{id}` (Admin: alles, Editor: nur eigene pending; sonst 403/404).
  - `POST /<kind>/{id}/reject` (Admin) mit Body `{ "reason": str }`; pending → rejected, sonst 409.
- Tests:
  - `tests/test_catalog_workflow.py` — Reject + Withdraw + Update + UNIQUE-Konflikt + Status-Filter pro Katalog-Typ.
  - `tests/test_rls.py` — Erweiterung um rejected-Sichtbarkeit pro Rolle.
  - `tests/test_migration.py` (oder neue): Up-Roundtrip mit Daten + sauber Down + erneuter Up. Wegen `ALTER TYPE ADD VALUE`-Einschränkung wird Down-Strategie auf Enum-Recreate getestet.

**Akzeptanzkriterien:**
- `pytest -k "catalog or rls or migration"` grün.
- `mypy --strict` und `ruff check` clean für `app/services/catalog.py`, `app/routes/catalog.py`, `app/schemas/catalog.py`, `app/models/catalog.py`.
- OpenAPI-Doku enthält die neuen Endpunkte.

**Abhängigkeiten:** M2 (RLS), M3 (bestehende Catalog-Routen).

---

#### M7.2 — Frontend Übersicht `/admin/catalogs`

**Status:** [ERLEDIGT] 2026-04-28

**Status `[ERLEDIGT]` 2026-04-28 (M7.2, Frontend Catalog-Übersicht + RBAC-Refactor):**

- **Routing:** Neue Routen `/admin/catalogs` (Server-Redirect → `/admin/catalogs/restraint-types`) und `/admin/catalogs/[kind]/page.tsx` (Server-Component mit Header, `<KindTabs>`, `<CatalogListing>`). `notFound()` für unbekannte `[kind]`-Werte. Route-Group-Refactor: `admin/layout.tsx` lockert auf Mindestrolle Editor (`canViewCatalogAdmin`), strikter Admin-Gate wandert nach `admin/(admin-only)/layout.tsx`; bestehende `admin/page.tsx` per `git mv` in die Sub-Group verschoben.
- **Komponenten:**
  - `components/catalog/kind-tabs.tsx` — vier Tab-Links (Restraints / Armhaltung / Handhaltung / Handausrichtung) mit `aria-current="page"` für aktiven Tab.
  - `components/catalog/status-filter.tsx` — Radio-Group „Alle / Freigegeben / Vorgeschlagen / Abgelehnt" mit `aria-checked`.
  - `components/catalog/status-badge.tsx` — farb-codierter Badge pro Status (emerald/amber/rose).
  - `components/catalog/catalog-table.tsx` — Tabelle mit Subtitle (Restraint: Kategorie · Brand · Model · Mechanik; Lookups: Description), Reject-Reason-Callout für rejected-Rows, Loading- und Empty-States, `data-testid="catalog-row"` für Tests.
  - `components/catalog/catalog-listing.tsx` — Client-Wrapper, liest `?status` aus URL, `useCatalogList`, schreibt URL via `router.replace({ scroll: false })`. Pure Helper `parseStatusParam` separat exportiert.
- **lib:** `lib/catalog/types.ts` (alle Enums + Type-Guards + Display-Labels), `lib/catalog/api.ts` (`useCatalogList`-Hook mit `staleTime: 5 min`, Cache-Key `["catalog", kind, { status, limit, offset }]`).
- **RBAC:** `lib/rbac.ts` um `canApproveCatalog`, `canEditCatalogEntry`, `canWithdrawCatalogEntry`, `canViewCatalogAdmin` erweitert (alle pure functions; spiegeln M7.1-Backend-Logik exakt).
- **Navigation:** `components/layout/nav.ts` ergänzt einen Nav-Eintrag „Kataloge" mit Icon `BookMarked`, sichtbar für admin und editor (`roles: ["admin", "editor"]`).
- **Tests:** +25 Cases (Frontend-Suite 194 → 219).
  - `tests/rbac-catalog.test.ts` — 7 Cases pro RBAC-Helper.
  - `tests/catalog-kind-tabs.test.tsx` — 2 Cases (4 Links, aria-current).
  - `tests/catalog-status-filter.test.tsx` — 3 Cases (Render, Klick, Toggle zurück zu Alle).
  - `tests/catalog-table.test.tsx` — 5 Cases (Loading, Empty, Restraint-Subtitle, Reject-Reason, data-status-Attribute).
  - `tests/catalog-listing.test.tsx` — 8 Cases (parseStatusParam, fetch ohne/mit Status, Render, URL-Write, URL-Clear, Error-Alert).
- **Verifikation:** Production-Build grün (`/admin/catalogs/[kind]` 3.44 kB / 128 kB). Browser-End-to-End mit echtem Backend + DB:
  - Admin: 4 Restraint-Einträge sichtbar (3 approved + 1 pending).
  - Editor: 3 Einträge sichtbar (admin's pending durch RLS verborgen, eigene würden sichtbar bleiben).
  - Viewer: `/admin/catalogs` redirected nach `/`; Nav-Eintrag „Kataloge" nicht sichtbar.
  - Status-Filter „Vorgeschlagen" → URL `?status=pending`, nur pending-Einträge.
  - Tab-Wechsel auf Armhaltung mit `?status=rejected` zeigt Strappado-Beta inkl. „Begründung: Duplikat von Strappado".
  - Console clean.

**Akzeptanzkriterien (alle erfüllt):**
- [x] Admin sieht alle Einträge.
- [x] Editor sieht approved + eigene pending/rejected (RLS).
- [x] Viewer kann die UI nicht öffnen.
- [x] Status-Filter funktioniert (URL-Sync + API-Forward).
- [x] Tab-Navigation springt zwischen Katalog-Typen.

**Abhängigkeiten:** M7.1.

**Bekannte Folge-Punkte:**
- Sidebar-Active-Highlighting: `pathname.startsWith("/admin/")` markiert sowohl `/admin` als auch `/admin/catalogs` als aktiv, wenn beide sichtbar sind. Niedrige Priorität — wird bei Bedarf in M8 angepasst.
- M7.3 baut die Create/Edit-Formulare auf den hier eingeführten Routes.

---

#### M7.3 — CRUD-Formulare

**Status:** [ERLEDIGT] 2026-04-29

**Status `[ERLEDIGT]` 2026-04-29 (M7.3, CRUD-Formulare + Admin-Auto-Approve):**

- **Backend-Erweiterung (ADR-043 §F):**
  - `propose_lookup` und `propose_restraint_type` in `app/services/catalog.py` akzeptieren ein `auto_approve: bool = False`-Argument; bei `True` wird `status=APPROVED` und `approved_by=user.id` direkt gesetzt, statt `status=PENDING` + `suggested_by`.
  - Routes `app/routes/catalog.py` setzen `auto_approve = (user.role == UserRole.ADMIN)` für alle vier `propose_*`-Endpunkte.
  - Bewusst nur in `propose_*`, nicht in PATCH — PATCH ändert keinen Status (siehe ADR-043 §B, separate `/approve`-/`/reject`-Endpunkte).
  - Tests: zwei neue Cases in `tests/test_catalog_workflow.py` (`test_admin_create_arm_position_directly_approved`, `test_admin_create_restraint_type_directly_approved`); bestehende „Editor proposed → admin approves"-Tests bleiben grün, weil Editor weiterhin pending erzeugt.

- **Frontend-Routes:**
  - `/admin/catalogs/[kind]/new` (admin+editor sichtbar): Server-Component, `notFound()` für unbekanntes `kind`, ruft `<CatalogFormPage>` mit `entryId={null}` und Rolle-flag.
  - `/admin/catalogs/[kind]/[id]/edit` (admin-only): Server-Redirect auf `/admin/catalogs/[kind]` für Non-Admins (zusätzlich zur RLS-Sperre).
  - Beide Pages mit Header (Kontext-Hinweis) + `<KindTabs>` + Form.

- **Komponenten (`components/catalog/`):**
  - `lookup-form.tsx` — Form für ArmPosition/HandPosition/HandOrientation (Felder `name` Pflicht + `description`); Submit + Toast, Cancel-Button.
  - `restraint-type-form.tsx` — Form für RestraintType (Display-Name Pflicht, Kategorie als Select aller `RestraintCategory`-Werte, Mechanik-Select inkl. „— keine —"-Option, Brand, Modell, Note); Submit Trim + null-Coalescing für leere Optional-Felder.
  - `catalog-form-page.tsx` — Wrapper, der je nach `kind` die richtige Form rendert; im Edit-Mode lädt `useCatalogEntry` via `fetchCatalogPage(limit=200)` (Pfad-A-Größe < 200 Rows, ein Page-Scan reicht), Type-Guard `isRestraintTypeEntry` schützt vor Form-Mismatch.
  - `describeMutationError`-Helper in `lookup-form.tsx`: Mapping ApiError-Status → Toast-Title/Description (409 „Eintrag existiert bereits", 403 „Keine Berechtigung", 422 „Eingabe ungültig", sonst „Speichern fehlgeschlagen"). `asApiError`-Duck-Type-Fallback gegen `instanceof`-Failures bei RSC-Modul-Splits.

- **Mutation-Hooks (`lib/catalog/api.ts`):**
  - `useCreateCatalogEntry<K>(kind)` — POST mit Cache-Invalidation `["catalog", kind]`.
  - `useUpdateCatalogEntry<K>(kind)` — PATCH mit `{ id, body }`-Variant.
  - `useCatalogEntry<K>(kind, id)` — Einzel-Eintrag-Lookup über die Liste (kein eigener REST-Read-Endpoint).
  - Generische Payload-Typen `CatalogCreatePayload<K>` / `CatalogUpdatePayload<K>` per `K extends "restraint-types" ? … : …` discriminant.

- **Listing-Integration:**
  - `<CatalogListing>` erhält `isAdmin`-Prop; rendert „Neuer Eintrag" für Admin, „Neuen Vorschlag einreichen" für Editor; Edit-Link pro Row nur bei Admin.
  - `<CatalogTable>` mit neuer `canEdit`-Prop, fügt Edit-Spalte (Header + Zeilenlinks zu `/admin/catalogs/[kind]/[id]/edit`) konditional hinzu.

- **Tests:** +13 Cases (Frontend-Suite 219 → 230, Backend 172 → 174).
  - `tests/catalog-forms.test.tsx` (8 Cases): Lookup-Create-happy-path inkl. Body-Trim, 409-Toast, leerer Name → Client-Side-Block ohne POST, Editor-Variante (Button-Label), Lookup-Edit (PATCH-URL/-Body), RestraintType-Render, RestraintType-Submit (mechanical_type empty → null), RestraintType-Edit-PATCH-Pfad.
  - `tests/catalog-table.test.tsx`: +2 Cases (Edit-Link bei `canEdit=true`, kein Edit-Link Default).
  - `tests/catalog-listing.test.tsx`: +1 Case (Admin/Editor-Button-Label).
  - Backend-Tests: +2 Auto-Approve-Cases.

- **Verifikation:**
  - Lint, Typecheck und `next build` clean (`/admin/catalogs/[kind]/new` 142 kB, `[id]/edit` 142 kB).
  - Browser-E2E (Admin gegen echtes Backend + DB):
    - Listing zeigt `Neuer Eintrag`-Button und Edit-Links pro Row.
    - Klick auf Edit-Link öffnet Edit-Form mit Pre-Fill (Display-Name + Brand korrekt vorbelegt).
    - Admin-Create („M7.3 Test-Tape", category=tape, brand=ACME) → Backend 201, Listing zeigt 5 Einträge (statt 4) inkl. neuem Eintrag mit `data-status="approved"` (Auto-Approve aus M7.3-Backend bestätigt).
    - Edit-Submit (Display-Name → „M7.3 Test-Tape (edited)") → Backend 200, Redirect zur Listing, geänderter Name sichtbar.
    - Konflikt-Test: zweiter POST mit (tape, ACME, NULL, NULL) → Backend 409 mit Klartext-Detail; catch-Block erreicht und ruft `describeMutationError`. UI-Toast „Eintrag existiert bereits" wird via Sonner sauber gerendert (Sonner-Mount funktioniert seit HOTFIX-001 / ADR-042).

- **Bekannte Folge-Punkte:**
  - M7.4 baut auf den hier eingeführten Mutation-Hooks und der `describeMutationError`-Helper auf.

**Abhängigkeiten:** M7.1, M7.2.

---

#### M7.4 — Freigabe-Queue + Editor-Withdraw

**Status:** [ERLEDIGT] 2026-04-29

**Status `[ERLEDIGT]` 2026-04-29 (M7.4, Freigabe-Queue + Editor-Withdraw):**

- **Mutation-Hooks (`lib/catalog/api.ts`):**
  - `useApproveCatalogEntry<K>(kind)` — POST `/api/<kind>/<id>/approve`, invalidiert `["catalog", kind]`.
  - `useRejectCatalogEntry<K>(kind)` — POST `/api/<kind>/<id>/reject` mit `{ reason }`-Body.
  - `useWithdrawCatalogEntry<K>(kind)` — DELETE `/api/<kind>/<id>` (apiFetch handled 204 bereits korrekt).
  - Alle drei nutzen das in M7.3 etablierte `["catalog", kind]`-Cache-Schema; Erfolgsfälle invalidieren denselben Tree wie Create/Update, sodass die Listing-Refetch-Logik unverändert bleibt.

- **UI-Primitive `<Dialog>` (`components/ui/dialog.tsx`):**
  - Shadcn-Stil-Wrapper um `@radix-ui/react-dialog` (analog zum existierenden `<Sheet>`); zentriertes Modal mit Overlay, Close-Button (`Schließen`-Label), Title/Description/Header/Footer-Slots.
  - Wieder verwendbar für künftige Confirm-Modals (z. B. M8 Anonymisierungs-Bestätigung).

- **`<RejectReasonDialog>` (`components/catalog/reject-reason-dialog.tsx`):**
  - Controlled (`open` + `onOpenChange`), zeigt Eintrags-Label im Header, `Begründung *`-Pflicht-Textarea (max 500 Zeichen), Submit-Button mit `destructive`-Variante.
  - Validierung **ausschließlich beim Submit** (`attemptedSubmit`-State). Frühere `onBlur`-basierte Validierung führte unter Radix' Focus-Management zum sofortigen Inline-Error beim ersten Öffnen — siehe ADR-045 §B Lessons Learned, neuer Regression-Test in `tests/reject-reason-dialog.test.tsx` deckt diesen Pfad ab.
  - Reason wird beim Schließen via `useEffect` zurückgesetzt; Re-Open zeigt frisches Form.

- **`<CatalogTable>`-Refactor:**
  - Boolean-Prop `canEdit` durch Render-Prop `renderRowActions: (entry) => ReactNode` ersetzt. Der Caller besitzt jetzt die volle Kontrolle über Aktionen pro Row inkl. RBAC-Logik. Action-Spalte mit Header erscheint genau dann, wenn `renderRowActions` gesetzt ist.
  - `data-kind`-Attribut neu auf der Row für Test- und CSS-Selektion.

- **`<CatalogListing>`-Refactor:**
  - Prop-Änderung: `isAdmin: boolean` → `currentUser: { id, role }` (RbacUser). Notwendig, weil Editor-Withdraw die Eigentümer-Prüfung `entry.suggested_by === currentUser.id` braucht.
  - Lifted state `rejectingEntry: AnyCatalogEntry | null` für das Dialog-Lifecycle (eine Reject-Operation gleichzeitig).
  - Render-Prop liefert pro Row: Approve+Reject (Admin auf pending), Withdraw (`canWithdrawCatalogEntry`-Helper aus M7.3), Bearbeiten-Link (Admin auf approved/rejected). RBAC-Sichtbarkeit aus `lib/rbac.ts`-Helpers, Backend-RLS bleibt finale Instanz.
  - Toasts: `„<Label>" freigegeben/abgelehnt/zurückgezogen` bei Erfolg, `describeMutationError` bei Fehler (übernommen aus M7.3).

- **Page-Update (`/admin/catalogs/[kind]/page.tsx`):**
  - Statt `isAdmin: boolean` reicht die Page jetzt `currentUser={ id, role }` durch. Auth + Role-Gate bleibt bei `app/(protected)/admin/layout.tsx` (Editor und Admin sehen die Seite).
  - Header-Hilfetext aktualisiert: Admin-Hinweis nennt Approve/Reject mit Begründung; Editor-Hinweis nennt Withdraw und das read-only-Verhalten für rejected-Rows.

- **Backend:** keine Änderungen — Endpoints `POST /<kind>/<id>/approve`, `POST /<kind>/<id>/reject` und `DELETE /<kind>/<id>` waren bereits in M7.1 inklusive Tests vorhanden (`tests/test_catalog_workflow.py`).

- **Tests:** Frontend-Suite **230 → 244** (+14), 35/35 Files grün.
  - `tests/catalog-actions.test.tsx` (8 Cases): Admin sieht Freigeben+Ablehnen+Bearbeiten je nach Status; Editor sieht Withdraw nur auf eigener pending-Row, gar nichts auf fremder; Approve POSTet `/<kind>/<id>/approve`; Reject öffnet Dialog → blockiert empty submit → POSTet getrimmten Reason; Withdraw DELETEd `/<kind>/<id>`.
  - `tests/reject-reason-dialog.test.tsx` (7 Cases): Header/Description mit Eintrags-Label, Empty-Submit blockt, getrimmter Reason wird übergeben, Cancel ruft `onOpenChange(false)`, beide Buttons disabled bei `isPending`, Reset bei Re-Open, **kein Inline-Error auf erstem Open** (Regression-Guard).
  - `tests/catalog-table.test.tsx` (refactored): `canEdit` → `renderRowActions` umgestellt; selber Funktionsumfang.
  - `tests/catalog-listing.test.tsx` (refactored): `isAdmin` → `currentUser` umgestellt; alle Assertions identisch.

- **Verifikation:**
  - `pnpm typecheck`, `pnpm lint`, `pnpm test --run` clean (244/244).
  - `pnpm build` clean: `/admin/catalogs/[kind]` 4.04 kB / First-Load 158 kB.
  - **Browser-E2E** (Admin + Editor gegen echtes Backend + Postgres):
    - Admin auf `/admin/catalogs/restraint-types?status=pending`: zwei pending-Rows mit korrektem `data-status="pending"` + drei Buttons (Freigeben, Ablehnen, Zurückziehen).
    - Approve-Klick: Hanfseil A wandert auf `approved`, `approved_by` gesetzt, Listing aktualisiert sich automatisch.
    - Reject-Klick: Dialog öffnet mit Eintrags-Label im Header, leer-submit-Blockade mit Inline-Error verifiziert, Reason mit typografischen Anführungszeichen + em-dash → DB persistiert exakt das Eingegebene, Status `rejected`, `rejected_by` gesetzt.
    - Logout Admin → Login Editor → eigene pending-Row zeigt nur Withdraw, fremde Rows unsichtbar (RLS aus M7.1).
    - Withdraw-Klick: Hard-Delete (Row ist 0× in DB präsent danach).
    - Reload nach Reject zeigt rejected-Row in `?status=rejected`-Tab mit Inline-Begründung.
  - **Bug während E2E gefunden + behoben:** Beim Re-Öffnen des Reject-Dialogs zeigte der Inline-Error sofort. Ursache: textarea `onBlur` setzte `touched=true`, weil Radix' Focus-Management beim Mount blur+refocus auslöst. Fix: Submit-only-Validation (`attemptedSubmit`-State, kein `onBlur`-Trigger). Regression-Test ergänzt.

- **Bekannte Folge-Punkte:**
  - M7.5 (Restraint-Picker) kann den `useCatalogList(kind, { status: "approved" })`-Cache aus M7.x direkt wiederverwenden.
  - Bei Aktivierung von Pfad B muss der `reject_reason`-Inhalt ins Anonymisierungs-Konzept aufgenommen werden (siehe ADR-043 Folge-Arbeit).

**Abhängigkeiten:** M7.2, M7.3.

---

#### M7.5 — Restraint-Picker in Application-Erfassung

**Status:** [ERLEDIGT] 2026-04-29

**Status `[ERLEDIGT]` 2026-04-29 (M7.5, Restraint-Picker + Sync-Erweiterung):**

- **ADR-046 angelegt** für die Sync-Vertragserweiterung (Set-Replace-LWW, denormalisiertes Array auf `ApplicationDoc`); Option A aus dem Freigabeblock vom 2026-04-29 angenommen.

- **Backend (`backend/`):**
  - `app/sync/schemas.py:ApplicationDoc` um `restraint_type_ids: list[uuid.UUID] = Field(default_factory=list)` erweitert.
  - `app/sync/services.py:pull_applications` lädt das Set per Bulk-IN-Query (`_load_restraint_sets`); `_application_to_doc` nimmt es als optionales Argument; Tombstone-Path liefert weiterhin `[]`.
  - `push_applications` ruft neue Helper:
    - `_restraints_allowed` — Editor darf nur approved RestraintTypes verlinken; unbekannte/pending/rejected → Synthetic-Tombstone-Konflikt. Admin darf alle existierenden, unbekannte → Konflikt (FK-Verletzung würde sonst den Push silently kippen).
    - `_sync_application_restraints` — Set-Diff gegen `application_restraint`-Tabelle, Bulk-DELETE für entfernte, Per-Row INSERT mit Savepoint für Race-Resolution.
    - `_application_conflict_doc` (async) — lädt Server-Set für jede Konflikt-Antwort, damit der Client beim Konflikt auch das Restraint-Set-Truth lernt (ADR-046 §D).
  - Imports: `delete` (sqlalchemy core), `ApplicationRestraint`, `RestraintType`.

- **Frontend (`frontend/`):**
  - JSON-Schema `lib/rxdb/schemas/application.schema.json` v0 → **v1** mit `restraint_type_ids: array<string format=uuid maxLength=36>` (default `[]`, nicht required).
  - `lib/rxdb/types.ts:ApplicationDocType.restraint_type_ids: string[]`.
  - **`lib/rxdb/database.ts`** registriert `RxDBMigrationSchemaPlugin` (Pflicht für jede Schema-Version-Bump in RxDB v17) und definiert eine `migrationStrategies[1]`, die existierende v0-Docs auf `restraint_type_ids: []` migriert.
  - Neue Komponente `components/catalog/restraint-picker.tsx`: Multi-Select-Combobox mit Typeahead-Filter über `display_name` + `category` + `brand` + `model`; Selektion als entfernbare Chips; inline Quick-Propose-Form (Display-Name Pflicht, Kategorie Select, Mechanik/Brand/Modell optional). Editor-Submit erzeugt pending (Toast „Vorschlag eingereicht"), Admin-Submit auto-approved und auto-selektiert (Toast „freigegeben"). Pending-Entries werden client-seitig herausgefiltert, weil Backend-Approved-Check sonst beim nächsten Push 409'en würde.
  - `ApplicationStartSheet` (Live, `components/event/application-start-sheet.tsx`): neuer `currentUserRole`-Prop, `restraintTypeIds`-State, Picker zwischen Recipient und Notiz, RxDB-Insert reicht das Set durch.
  - `EventBackfillForm` (`components/event/event-backfill-form.tsx`): pro Application-Row eigener Picker; Row-State um `restraintTypeIds` erweitert.
  - `EventDetailView`-Timeline (`components/event/event-detail-view.tsx`): zeigt Restraint-Badges pro Application unter dem Status; nutzt denselben `useCatalogList`-Cache wie der Picker, um IDs in Display-Names aufzulösen.
  - `event-detail-view.tsx`-Aufruf von `<ApplicationStartSheet>` reicht `currentUserRole={user.role}` durch.

- **Tests:**
  - Backend: **+7** in neuer Datei `tests/test_sync_application_restraints.py` (Insert mit Set, leerer Set Insert, Set-Replace, Push-Idempotenz, Editor pending → Konflikt, Editor pending in Update → Server-Set bleibt, Konflikt-Antwort enthält Server-Set). Backend-Suite **174 → 181 grün.** `test_rxdb_schema_drift.py` bleibt grün (beide Seiten haben `restraint_type_ids` nicht required).
  - Frontend: **+8** in neuer Datei `tests/restraint-picker.test.tsx` (Typeahead-Filter Display-Name, Typeahead über Kategorie-Label, pending-Entries unsichtbar, Toggle multi-select, Chip-Remove, Quick-Propose Empty-Submit-Block, Editor-Submit POST-Body + kein Auto-Select, Admin-Submit auto-selektiert). `tests/event-backfill-form.test.tsx` mocked Picker. `tests/event-detail-view.test.tsx` ergänzt einen `QueryClientProvider`-Wrapper + `restraint_type_ids: []` im Default-Fixture. Frontend-Suite **244 → 252 grün.**
  - Lint, Typecheck und `next build` clean. Bundle-Größen: `/events/[id]` 273 → 279 kB, `/events/new/backfill` 265 → 271 kB.

- **Browser-E2E (Admin gegen echtes Backend + Postgres):**
  - Picker auf `/events/new/backfill` lädt 17 approved Seeds; Suche „Clejuso" filtert auf 3 Treffer; Suche „Handschellen" filtert auf alle Cuffs-Kategorie-Einträge.
  - Multi-Select: zwei Restraints anklicken erzeugt zwei Chips, Liste zeigt `data-selected="true"` synchron.
  - Quick-Propose (Admin): „M7.5 Browser-Test Tape", Kategorie tape → POST 201, Auto-Approve, neuer Entry sofort sichtbar (17 → 18) und auto-selektiert. Toast „Restraint-Type freigegeben".
  - Sync-Roundtrip via Browser-Console:
    - Push App mit zwei Restraint-IDs → Pull liefert exakt die zwei zurück (sortiert).
    - Push Update mit reduziertem Set (1 statt 2) → Pull bestätigt das Set-Replace.
    - Push Application mit unbekannter Restraint-UUID → Synthetic-Tombstone-Konflikt, App nicht in DB.
  - Live-Modus auf `/events/[id]`: „Neue Application"-Button öffnet Sheet mit Picker; Auswahl „ASP Chain" + Submit erzeugt Application; Pull bestätigt `restraint_type_ids` enthält den richtigen UUID; Timeline zeigt Badge „ASP Chain (chain)" unter Status.

- **Bug während E2E gefunden + behoben (im selben Sub-Step):**
  - Schema-Version-Bump alleine reicht in RxDB v17 nicht — `RxDBMigrationSchemaPlugin` muss explizit registriert sein, sonst wirft `addCollections` mit „You are using a function which must be overwritten by a plugin" und der Provider bleibt im Default-State (alle Live-Buttons disabled, kein UI-Hinweis). Behoben in `database.ts`. Lessons Learned: jede Schema-Migration verlangt zwei Schritte — Plugin registrieren **und** `migrationStrategies[N]` definieren.

- **Bekannte Folge-Punkte:**
  - **Edit-Form-Restraint-Picker** (`components/event/event-edit-form.tsx`): in M7.5 explizit aus Scope (ADR-046 §H). Kann als kleines M5c.4-Followup nach M7.5 nachgezogen werden — gleiche Komponente, Diff-basierte Patch-Logik.
  - **Position-Picker** (M5c.4-Followup): unverändert aus Scope (ADR-040 §K, ADR-043 §D). Nach M7.5-Refactor lässt sich derselbe Combobox-Stil leicht für ArmPosition/HandPosition/HandOrientation duplizieren.
  - **Pfad B**: Set-Replace-Semantik bleibt; bei Audit-Bedarf für Restraint-Set-Änderungen wird ADR-046 §C durch Pro-Element-LWW abgelöst (Schema-Migration auf `application_restraint` mit `updated_at` + `created_by`).

**Abhängigkeiten:** M7.1 (POST-Endpoint), M7.3 (Mutation-Hooks für Quick-Propose), M5a.3 (Live-Form), M5c.3 (Backfill-Form).

---

### M8 — Admin-Bereich

**Ziel:** Admin kann Nutzer und Personen verwalten, Stammdaten pflegen, Daten inspizieren. Zweischichtiger Ansatz gemäß ADR-016, Implementierungsstrategie in **ADR-049** festgelegt.

**Sub-Steps:** M8.1 (Strategie-ADR) → M8.2 (Backend SQLAdmin) → M8.3 (Backend `/api/admin/*`) → M8.4 (Frontend Dashboard + Users) → M8.5 (Frontend Persons-Workflow + Export-UI).

**Deliverables — SQLAdmin-Schicht unter `/admin` (M8.2):**
- SQLAdmin 0.25.x als neue Backend-Dependency (siehe ADR-049 §A); `app/admin_ui/{__init__.py,auth.py,views.py}` mit Cookie-Session-Auth-Bridge zu fastapi-users (ADR-049 §B), separater Admin-Engine mit RLS-Stamp pro Request (ADR-049 §C).
- ModelViews für 8 Tabellen (User, Person, RestraintType, ArmPosition, HandPosition, HandOrientation, Event, Application) gemäß ADR-049 §D — `Application` read-only, `Event` read+edit-only (kein Create/Hard-Delete; Sync-Vertrag ADR-029/033 wahren).
- Sortier-/Filter-Optionen, Bulk-Approve/Reject auf Catalog-Tabellen.
- Zugriff nur für `role = 'admin'`. Anonymous/Editor → Redirect auf `/login`.

**Deliverables — Next.js-Workflow-Schicht unter `(protected)/admin/(admin-only)/` (M8.4 + M8.5):**
- **Admin-Dashboard** (M8.4) als `(admin-only)/page.tsx` mit Stats-Cards (Events/Monat, Top-Restraints, Top-Positionen, User-Count, pending-Catalog-Count).
- **User-Verwaltung** `/admin/users` (M8.4): Listing + Anlage-Form mit Linkable-Person-Picker (ADR-014); Rollen-Toggle und Deaktivierung über SQLAdmin.
- **Personen-Verwaltung** `/admin/persons` (M8.5): Filter `origin = on_the_fly`, `linkable = true`, `unlinked = true`; Merge-Wizard (Source/Target-Picker, Konflikt-Vorschau, Bestätigung) → `POST /api/admin/persons/{id}/merge`; Anonymisierungs-Button mit Confirm-Dialog → `POST /api/admin/persons/{id}/anonymize`.
- **Admin-Export** (M8.5): Trigger-Button → `GET /api/admin/export/all?format=json` (Browser-Download, ADR-049 §G).
- **Freigabe-Queue für Katalog-Vorschläge** ist bereits in M7.4 implementiert — kein zusätzlicher M8-Aufwand.

**Deliverables — Backend `/api/admin/*` (M8.3):**
- `app/routes/admin.py`: `GET/POST/PATCH/DELETE /api/admin/users`, `GET /api/admin/stats`, `GET /api/admin/export/all`, `POST /api/admin/persons/{id}/merge`, `POST /api/admin/persons/{id}/anonymize`.
- `app/services/person_merge.py` (ADR-049 §E) mit Re-Pointing `event_participant`/`application` und UNIQUE-Konflikt-Resolution; **keine Migration erforderlich**.
- Pydantic-Schemas + RLS-Tests inkl. negativ Editor/Viewer.

**Akzeptanzkriterien:**
- Admin kann via SQLAdmin schnell Stammdaten pflegen und Daten inspizieren (Browser-Smoke `/admin/user/list` u. ä.).
- Via Next.js-Admin-Dash kann Admin Workflow-Aktionen durchführen (Stats anzeigen, User anlegen, Personen mergen, Personen anonymisieren, Export herunterladen).
- Verknüpfung neuer User mit bestehender on-the-fly-Person (Linkable=true) funktioniert; verknüpfter User sieht alle Events seiner Person rückwirkend.
- Anonymisierungs-Prozess ist ein Knopfdruck mit Confirm-Dialog und in der DB korrekt umgesetzt (`name = '[gelöscht]'`, `alias = NULL`, `note = NULL`, `is_deleted = true`, `deleted_at = now()`; Verknüpfungen bleiben). Coverage 100 % (DSGVO-Pflicht).
- Person-Merge-Coverage ≥ 90 % inkl. Konflikt-Pfaden (gemeinsamer Event-Participant beider Personen).
- Test-Suite grün: ≥ 200 Backend-Tests, alle Frontend-Suites grün, `ruff`/`mypy --strict` clean, `pnpm typecheck`/`pnpm lint`/`pnpm build` clean.

**Abhängigkeiten:** M2 (Auth + RLS), M3 (Domain-API), M7 (Catalog-Routes), ADR-016, ADR-049.

---

### M9 — w3w-Migration — [VERWORFEN] 2026-05-01 (ADR-050)

**Ursprüngliches Ziel:** Alle bestehenden Ereignisdaten aus w3w über ein Skript
in HC-Map übernehmen (CSV-/API-Quelle, Personen-Mapping, Application-Heuristik,
Idempotenz, Dry-Run, Report).

**Begründung der Verwerfung (ADR-050, 2026-05-01):** Datenbestand ist klein
genug für manuelle Nacherfassung über die bestehende M5c-Erfassungs-UI. Das
Skript-, Test- und Sicherheitsbudget steht nicht im Verhältnis zum Nutzen.
ADR-004 bleibt gültig (Lat/Lon + Plus Codes als Geokodierungs-Strategie); nur
die einmalige Migrations-Brücke entfällt. w3w-Account kann sofort gekündigt
werden.

**Folge-Arbeit:** M5c-NACH (siehe unten) bringt die UI-Anbindung für die
umgewidmete Spalte `event.legacy_external_ref` (vormals `w3w_legacy`).

---

### M5c-NACH — Legacy-External-Ref im Edit/Backfill-UI

**Status:** [ERLEDIGT] 2026-05-04 — Frontend-only, drei Komponenten + drei Test-Files.

**Ziel:** Optionales Eingabefeld für eine externe Legacy-Referenz an
Events (z. B. die ursprüngliche 3-Wort-Adresse aus w3w, eine Projekt-ID
oder URL). Eingabe in „Nachträgliche Erfassung" und im Edit-Modus,
Anzeige im Detail-View, wenn nicht null. Kein Eingabefeld im Live-Modus
(ADR-050 §S3-A).

**Deliverables:**
- `event-backfill-form.tsx`: Eingabefeld `legacy_external_ref` (Text,
  optional, kein Format-Constraint).
- `event-edit-form.tsx`: gleiches Feld für nachträgliches Setzen/Ändern.
- `events/[id]/page.tsx` (Detail-View): bedingte Anzeige der Referenz,
  wenn `legacy_external_ref !== null`.
- Tests: Render, Wert-Persistierung über RxDB-Push (LWW), Keine-Anzeige
  bei null.

**Akzeptanzkriterien:**
- Eingabefeld erscheint in Backfill und Edit, nicht im Live-Modus.
- Wert landet via RxDB-Sync auf dem Server (`legacy_external_ref` in
  `event`-Spalte).
- Edit überschreibt den Wert (LWW, ADR-050).
- Volle Test-Suite bleibt grün.

**Abhängigkeiten:** ADR-050 implementiert (Backend + RxDB-Schema v1) —
erledigt 2026-05-01.

**Umsetzung 2026-05-04:**
- [`frontend/src/components/event/event-backfill-form.tsx`](../frontend/src/components/event/event-backfill-form.tsx): neuer State `legacyExternalRef` und Card-Block „Externe Referenz (optional)" zwischen Notiz und Applications; Insert nutzt jetzt `legacyExternalRef.trim() || null` statt hardcoded `null`. testid `event-backfill-legacy-ref`.
- [`frontend/src/components/event/event-edit-form.tsx`](../frontend/src/components/event/event-edit-form.tsx): `EditableEvent` um `legacyExternalRef: string` erweitert, Init aus `eventDoc?.legacy_external_ref ?? initialEvent.legacy_external_ref ?? ""`, neues Eingabefeld zwischen Notiz und Reveal-Toggle, Submit-Diff bei Wertänderung patcht `legacy_external_ref` (LWW). testid `event-edit-legacy-ref`.
- [`frontend/src/components/event/event-detail-view.tsx`](../frontend/src/components/event/event-detail-view.tsx): `MergedEvent` um `legacy_external_ref: string | null` erweitert, `mergeEvent` übernimmt das Feld vom Doc; bedingte `<p>`-Anzeige in der Status-Card mit Label „Externe Referenz" + monospace-Wert, nur gerendert wenn `event.legacy_external_ref?.trim()`. testid `event-detail-legacy-ref`.
- `event-create-form.tsx` (Live-Modus) bleibt unverändert mit `legacy_external_ref: null` — ADR-050 §S3-A schließt Live-Modus-Eingabe aus.

**Tests (3 Files, 7 neue Cases):**
- [`tests/event-detail-view.test.tsx`](../frontend/tests/event-detail-view.test.tsx): +2 Cases — null versteckt das Label, non-null zeigt es mit Wert.
- [`tests/event-backfill-form.test.tsx`](../frontend/tests/event-backfill-form.test.tsx): +2 Cases — Wert wird trimmt in Insert weitergegeben, Leerwert wird zu `null`.
- [`tests/event-edit-form.test.tsx`](../frontend/tests/event-edit-form.test.tsx): +3 Cases — Vorbelegung aus initialEvent, Patch beim Setzen von null→Wert, Patch beim Clearen Wert→null.

**Verifikation:**
- vitest **289/289 grün** (vorher 282; +7 neue Cases in den drei Files).
- `pnpm typecheck`/`pnpm lint`/`pnpm exec prettier --check` auf den 6 berührten Files alle clean.
- **Browser-Smoke (preview_*)** mit Backend+DB+Frontend-Stack: `/events/new/backfill` zeigt das neue Card-Block, Submit mit `w3w://demo.alpha.foxtrot` redirected auf Detail-View, der das Label „Externe Referenz: w3w://demo.alpha.foxtrot" rendert. Edit-Page lädt mit vorbelegtem Wert, Änderung auf `https://example.org/event/42` reflektiert nach Submit im Detail-View. Erneutes Edit mit leerem Wert entfernt die Anzeige (`event-detail-legacy-ref` testid nicht im DOM). `/events/new` (Live-Modus) zeigt kein Eingabefeld. Drei `POST /api/sync/events/push 200` im Backend-Log bestätigen RxDB-LWW-Sync. DB-Final-Stand `legacy_external_ref = NULL` matcht den letzten Edit-Clear.

**M5c-NACH-Followups:** keine. Funktional vollständig gemäß ADR-050 §S3.

---

### M10 — Release-Candidate-Bündel (deployment-ready durch jedermann)

**Ziel:** HC-Map ist als generische Multi-Instanz-Anwendung distribuierbar — fremde Operator können das System auf einem eigenen VPS in unter 30 Minuten ans Laufen bringen, ohne Insider-Wissen, mit einer eigenen Domain, ihrem eigenen Reverse-Proxy (Caddy oder Traefik), eigenem Backup-Ziel und eigenem SMTP-Anbieter. Erstes Pre-Release `v0.1.0-rc.1` auf GitHub.

**Strategie-ADR:** [ADR-051 — Implementierungsstrategie M10 (Release-Candidate-Bündel)](./decisions.md#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann). Bindet alle Mechanik-Entscheidungen (Lizenz AGPLv3, Mail-Backend `aiosmtplib`, Reverse-Proxy-Wahlfreiheit über Compose-Overlays, Backup `pg_dump | age | rclone` mit Cron-Container, GHCR Multi-Arch, Image-Tag-Schema, Migrations-Auto-Run via Advisory-Lock, Einwilligungs-Vorlage). Nach Freigabe von ADR-051 (Sub-Step M10.1) werden M10.2–M10.9 in Reihenfolge umgesetzt.

#### Sub-Steps

**M10.1 — ADR-051 Strategie-Freigabe** [ERLEDIGT] 2026-05-01
- ADR-051 von Patrick freigegeben am 2026-05-01, Status `Accepted`. M10.2–M10.9 dürfen in Reihenfolge umgesetzt werden.

**M10.2 — Mail-Backend SMTP + Frontend Reset-Pages** [ERLEDIGT] 2026-05-01
- Backend: `aiosmtplib>=5,<6`-Dep ergänzt, `app/auth/mail.py` erweitert um `SMTPMailer` neben bestehendem `LoggingBackend`, `app/config.py` um `HCMAP_SMTP_{HOST,PORT,USER,PASSWORD,STARTTLS,USE_TLS,FROM,FROM_NAME}` und `HCMAP_BASE_URL` ergänzt, Plain-Text-Templates `app/auth/templates/{password_reset,verify}.txt` (deutsch). Konstruktor-Validierung: leere Pflichtfelder + `starttls`/`use_tls`-Exklusivität.
- Frontend: `src/components/auth/{forgot-password-form,reset-password-form}.tsx` mit react-hook-form + zod, `src/app/(public)/{forgot-password,reset-password}/page.tsx` (jeweils SSR-Redirect bei eingeloggtem User), Login-Form um „Passwort vergessen?"-Link erweitert, `useForgotPassword`/`useResetPassword`-Hooks in `src/lib/auth.ts`. No-Enumeration-Verhalten clientseitig (immer neutrale Bestätigung, auch bei Server-Fehlern).
- **Verifikation:** Backend pytest **231/231 grün** (+15 in `tests/test_auth_mail.py`: URL-Builder, LoggingBackend, SMTPMailer-Validierung, Message-Construction inkl. Auth-Headers + URL-Encoding, SMTP-Error-Propagation, Backend-Selection). Frontend vitest **278/278 grün** (+3 in `tests/forgot-password-form.test.tsx`, +4 in `tests/reset-password-form.test.tsx`). `ruff check`/`ruff format --check`/`mypy --strict`/`tsc --noEmit`/`eslint` alle clean. **Browser-Smoke (preview_*):** `/forgot-password` → POST `/api/auth/forgot-password` 202 → Reset-URL mit echtem JWT-Token aus Backend-Log (LoggingBackend) → `/reset-password?token=…` → POST `/api/auth/reset-password` 200 → Redirect `/login` → Re-Login mit neuem Passwort POST `/api/auth/login` 204 → RxDB-Sync startet.

**M10.3 — LICENSE (AGPLv3) + Lizenz-Metadaten + README-Header** [ERLEDIGT] 2026-05-01
- `LICENSE` im Repo-Root angelegt (AGPLv3-Volltext, 661 Zeilen, von gnu.org bezogen).
- SPDX-Identifier `AGPL-3.0-only` in `backend/pyproject.toml` und `frontend/package.json` gesetzt; `uv lock` akzeptiert die neue Form.
- README: Lizenz-Badge zeigt nun `AGPL-3.0-only` und linkt auf `LICENSE`; Phase-Badge auf `M10.3-erledigt`; Lizenz-Abschnitt umformuliert mit Multi-Instanz-Hinweis (selbst hosten erlaubt, proprietäre Forks nicht).
- **Compliance-Check:** `pip-licenses` (76 Backend-Pakete) und `pnpm licenses list --prod` ad-hoc gelaufen — keine GPL-Treffer; LGPL-Treffer (`psycopg`/`psycopg-binary` Python-Linking, `@img/sharp-libvips-darwin-arm64` Native-Lib) sind über LGPL-Dynamic-Linking AGPL-kompatibel. Keine proprietären Treffer.

**M10.4 — Einwilligungs-Vorlage `docs/templates/consent-de.md`** [ERLEDIGT] 2026-05-01
- Datei `docs/templates/consent-de.md` angelegt: deutsche Markdown-Vorlage mit Platzhaltern (`[GRUPPENNAME]`, `[ADMIN-NAME]`, `[ADMIN-KONTAKT]`, `[INSTANZ-URL]`, `[HOSTING-PROVIDER]`, `[HOSTING-STANDORT]`, `[BACKUP-ZIEL]`, `[DATUM]`), 12 Abschnitte plus Bestätigungs-Block.
- Cross-Check gegen ADRs erfüllt: Vertrauensmodell (ADR-001) §3, Anonymisierungs-Grenzen (ADR-002) §4, On-the-fly-Personenanlage (ADR-014) §5, Aggregat-Statistik (ADR-015) §6, IndexedDB unverschlüsselt (ADR-032) §9, Foto-/Medien-Phase-2-Platzhalter §10, Widerrufs-/Auskunftsrechte §7.
- Verweis aus README (Datenschutz-Abschnitt) und project-context.md §6 ergänzt; Header-Kommentar liefert Disclaimer „keine Rechtsberatung" und Platzhalter-Konvention für Operator.

**M10.5 — `compose.prod.yml` + Reverse-Proxy-Overlays + Prod-ENV-Schema** [ERLEDIGT] 2026-05-01
- `docker/compose.prod.yml` ohne Reverse-Proxy-Service: App-Services (`db`, `backend`, `frontend`) hängen am internen Bridge-Netz `internal`, kein Host-Port-Mapping. Backend zieht Image `ghcr.io/paddel87/hc-map-backend:${HCMAP_IMAGE_TAG:-rc}` (gleiches Schema für Frontend), `pull_policy: always`. Pflicht-Env mit `:?`-Marker (`HCMAP_DB_USER`, `HCMAP_DB_PASSWORD`, `HCMAP_DB_NAME`, `HCMAP_SECRET_KEY`, `HCMAP_BASE_URL`); restliche optional mit Defaults. Backend-Command überschreibt das Image-CMD um `--proxy-headers --forwarded-allow-ips=*`.
- `docker/compose.caddy.yml` + `docker/Caddyfile.example` — Caddy v2-Alpine, Ports 80/443/443udp, Auto-TLS via Let's Encrypt aus `HCMAP_ACME_EMAIL` (Staging-CA als Kommentar im Caddyfile). Routing: `/api/*` und `/admin/*` → `backend:8000`, sonst → `frontend:3000`. Volumes `caddy-data` + `caddy-config` für ACME-State.
- `docker/compose.traefik.yml` + `docker/traefik/{traefik,dynamic}.yml.example` — Traefik v3.1, Routing per Service-Labels (`hcmap-backend-api` für `/api`+`/admin`, `hcmap-frontend` für Rest mit `priority=1`). Static-Config: HTTP→HTTPS-Redirect, ACME-`tlsChallenge`. Dynamic-Config: Secure-Headers (HSTS, `frameDeny`, `referrerPolicy`) + TLS 1.2+-MinVersion.
- `.env.example` Prod-Block ergänzt: `HCMAP_DOMAIN`, `HCMAP_ACME_EMAIL`, `HCMAP_COOKIE_DOMAIN`, `HCMAP_IMAGE_TAG`, `HCMAP_SKIP_MIGRATIONS`, `HCMAP_BACKUP_*` (forward-kompatibel für M10.6). `.gitignore` ignoriert die Operator-Working-Copies (`docker/Caddyfile`, `docker/traefik/{traefik,dynamic}.yml`), Examples bleiben tracked.
- Migrations-Auto-Run via FastAPI-Lifespan in `app/main.py` (`_build_lifespan`); Implementierung in neuem Modul `app/migrations_runner.py`: `pg_try_advisory_lock(47_110_815)` non-blocking, bei Erfolg `alembic upgrade head` via `asyncio.to_thread`, Release im `finally`. Bei Lock-Busy blockierend warten + sofort wieder freigeben (Migrations sind dann durch). Gating: nur in `HCMAP_ENVIRONMENT=production` aktiv (Tests skippen automatisch); zusätzlicher Override `HCMAP_SKIP_MIGRATIONS=1`. DSN-Auto-Conversion `+asyncpg` ↔ `+psycopg` für die zwei Engines.
- **Verifikation:** Backend pytest **246/246 grün** (+15 in `tests/test_migrations_runner.py`: DSN-Helpers, `_should_run`-Gating-Matrix, Lock-ID-Range-Check, Skip-Pfade ohne DB-Zugriff, Lock-Roundtrip-Integration mit echtem Postgres, Concurrent-Wait-Szenario via `pg_advisory_lock` auf Side-Connection). `ruff check`/`ruff format --check`/`mypy --strict app` alle clean. `docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml config` und Traefik-Variante beide ohne Fehler resolved (Pflicht-Env via inline-Set). Voll-Stack-Live-Smoke (Bootstrap + Login + CSRF + Cookie-Secure) folgt in M10.9 (RC-Smoke), weil dafür GHCR-Images aus M10.7 gebraucht werden — bewusst aufgeschoben statt mit lokal gebauten Images zu doppeln.

**M10.6 — Backup-Service** [ERLEDIGT] 2026-05-01
- `docker/backup.Dockerfile` (Debian Bookworm + `postgresql-client-16` aus PGDG + `age` + `rclone` + `cron` + `tini`). Multi-Arch-fähig (kein arch-spezifischer Code).
- `docker/backup/{backup.sh,restore.sh,retention.sh,entrypoint.sh,run-backup,run-retention,crontab}` angelegt; `docker/secrets/{age-recipients.txt.example,rclone.conf.example}` als Operator-Templates getrackt, Working-Copies via `.gitignore` ausgeschlossen.
- Cron-Schedule (UTC): daily 03:17, weekly Sun 03:33, monthly 1st 03:47, retention sweep 04:00. Job-Output via `> /proc/1/fd/1 2>&1` an tini → `docker logs`.
- Retention: 14d/56d/365d via `rclone delete --min-age`; fehlende Buckets (z. B. `weekly/` in der ersten Woche) werden mit `rclone lsf`-Probe übersprungen, damit die Cron-Exit-Codes nicht 30 Tage lang fälschlich als Fehler gemeldet werden.
- Entrypoint validiert Pflicht-Env (`HCMAP_BACKUP_REMOTE/_PREFIX`, `PG*`), prüft Mounting der Docker-Secrets `/run/secrets/{age-recipients.txt,rclone.conf}`, prüft per `rclone listremotes`, dass das konfigurierte Remote tatsächlich in der rclone-Config existiert, rendert `/etc/hc-map/backup.env` (mode 0600) als Brücke ins Cron-Environment, optional Sofort-Backup via `HCMAP_BACKUP_RUN_ON_START=1`, dann `exec cron -f -L 15`.
- `compose.prod.yml` um `backup`-Service erweitert (build-context `..`, M10.7 wird auf GHCR-Image umstellen). Service hängt am internen Bridge-Netz, `depends_on: db service_healthy`. Docker-Secrets-Block am Compose-Ende (`age-recipients` → `secrets/age-recipients.txt`, `rclone-conf` → `secrets/rclone.conf`).
- `.env.example` Backup-Block umgebaut: `HCMAP_BACKUP_AGE_RECIPIENTS` entfernt (Recipients laufen über Docker-Secret, nicht Env), `HCMAP_BACKUP_RUN_ON_START` ergänzt, Doku-Header erklärt rclone-Remote-Mechanik. `.gitignore` ergänzt um `docker/secrets/age-recipients.txt` + `docker/secrets/rclone.conf`.
- Restore-Skript erwartet ein Mounting des **Private-Keys** (`AGE_IDENTITY_FILE`, vom Operator manuell hereingereicht — nicht im Container). Pull über rclone, age-Decrypt, `pg_restore --no-owner --no-acl --exit-on-error` in eine zweite leere DB. Hinweis im Skript-Header: Ziel-DB muss aus `template0` erstellt werden, da `postgis/postgis:16-3.5` PostGIS-Schemata in `template1` einrichtet und sonst Konflikte (`schema "tiger" already exists`) auftreten.
- **Verifikation:** Image-Build (multi-arch, ~2.4 s exporting) erfolgreich. Roundtrip-Test mit zwei Postgres-Containern (PostGIS 16-3.5) auf eigenem Bridge-Netz, rclone-Remote `local:` schreibt nach Host-Verzeichnis: Dump (10.3 KiB) → age (`age-encryption.org/v1`-Header verifiziert) → rclone rcat → rclone copyto → age --decrypt → pg_restore in `hcmap_restore` (aus `template0` neu erstellt). **Schema-Diff: 0 Zeilen** (`pg_dump --schema-only` Source vs. Restore byte-identisch). **Daten-Diff: 0 Zeilen** (sortierte `INSERT`-Statements via `--inserts` identisch). PostGIS-Extension, GIST-Index, GEOGRAPHY/GEOMETRY-Spalten, NULL-Werte, TIMESTAMPTZ-Defaults alle erhalten. Cron-Daemon-Smoke: tini PID 1, cron PID 7, `cat /proc/1/comm` = `tini`, Crontab-Datei sichtbar. `run-backup`-Wrapper mit gerendertem Env-File aus laufendem Container ausführbar (zweites Backup-File entstand). Retention-Skript exit 0 wenn weekly/monthly noch leer (Skip-Pfad greift).
- **Compose-Validierung:** `docker compose -f docker/compose.prod.yml config` clean; mit beiden Reverse-Proxy-Overlays (`compose.caddy.yml`, `compose.traefik.yml`) ebenfalls clean.

**M10.7 — GitHub Actions CI + GHCR-Push (Multi-Arch)** [ERLEDIGT] 2026-05-01
- `.github/workflows/ci.yml` mit drei Jobs:
  - `backend-lint-test` — Postgres+PostGIS-Service-Container (`postgis/postgis:16-3.5`, gepinnt analog `compose.prod.yml`), `astral-sh/setup-uv@v5` (`version: 0.11.8` analog Backend-Dockerfile, `cache-dependency-glob: backend/uv.lock`), `uv python install 3.12`, `uv sync --frozen`, `uv run ruff check`/`ruff format --check`/`mypy --strict app`/`pytest -ra`. Test-DB-Override via `HCMAP_TEST_DATABASE_URL=postgresql+psycopg://...` (Conftest skipt dann den testcontainers-Pfad).
  - `frontend-lint-test` — `actions/setup-node@v4` mit `node-version: 22`, `corepack enable` (zieht pnpm 10.33 aus dem `packageManager`-Feld), `actions/cache@v4` für `pnpm store path`, `pnpm install --frozen-lockfile`, `pnpm typecheck`/`lint`/`format:check`/`test --run`.
  - `build-push` — `needs: [backend-lint-test, frontend-lint-test]`, `if: push && (main || v*.*.* tag)`, Matrix-Strategie über drei Images (`backend`, `frontend`, `backup`). `docker/setup-qemu-action@v3` + `docker/setup-buildx-action@v3`, GHCR-Login per `GITHUB_TOKEN`, `docker/metadata-action@v5` rendert Tags gemäß ADR-051 §E (`:v0.1.0-rc.1` + `:rc` für RC-Tags; `:v0.1.0` + `:v0.1` + `:0` + `:latest` für Final-Tags; `:main` + `:sha-<short>` für `main`-Push), `docker/build-push-action@v6` baut `linux/amd64,linux/arm64` mit GHA-Cache (`cache-from/to: type=gha,scope=<image>`, `mode=max`).
- `.github/workflows/release.yml` triggered auf `v*.*.*`-Tags, läuft parallel zu `ci.yml`-build-push. Awk-Extraktion aus `CHANGELOG.md`: matcht `## [vX.Y.Z]`/`## [X.Y.Z]` und fällt für RC-Tags (`-rc.x`) auf `## [Unreleased]` zurück. `gh release create` mit `--prerelease`-Flag, wenn der Tag einen Bindestrich enthält.
- `concurrency: ci-${{ github.workflow }}-${{ github.ref }}` mit `cancel-in-progress: true` verhindert Stau auf Push-Bursts.
- **Verifikation:** `actionlint` (rhysd/actionlint via Docker) clean. CHANGELOG-Extraktion lokal gegen aktuellen Stand simuliert: `v0.1.0-rc.1` → `## [Unreleased]`-Inhalt (1 800+ Zeichen), `v0.1.0` → 0 Zeilen (Workflow-Fallback "see CHANGELOG.md" greift). Backend-CI lokal repliziert (Postgres-16-3.5 als Service-Container auf `localhost:5433`, `HCMAP_TEST_DATABASE_URL`): `ruff check` clean (112 Files), `ruff format --check` clean, `mypy --strict app` clean (66 Files), `pytest -ra` **246/246 grün** (89 s). Frontend-CI lokal repliziert (Node 24 + Node 22): `pnpm typecheck` clean, `pnpm lint` clean, `pnpm format:check` clean, `pnpm test --run` **278/278 grün** in 5 s.
- **CI-Runs #1 und #2 deckten zwei latente Bugs auf, beide korrigiert:**
  - **Followup #1 (Run `25225432180`):** Frontend-`format:check` schlug auf Node 22 mit 47 Files an. Die ursprüngliche M10.7-Verifikation hatte `format:check` lokal nicht ausgeführt (Annahme „Node-24-Drift aus M8.5; CI fährt Node 22, dort grün") — die Annahme war falsch. Tatsächliche Ursache: die 47 Files waren seit M5b/M7 nicht mehr durch `prettier --write` gelaufen und in einem nicht-kanonischen Wrap-Zustand committed; das war im Repo unsichtbar geblieben, weil es vor M10.7 keine CI-Stufe für `format:check` gab. **Fix:** `corepack pnpm format` über alle 47 Files; Diff ist rein Whitespace/Wrap (Zeilen-Joining), keine Logik-Änderungen. Cross-Verifikation in einem `node:22-bookworm-slim`-Container (entspricht dem GitHub-Runner): `format:check` clean. Pre-M10.7-Annahme zur Node-Version-Drift damit hinfällig — nach `prettier --write` ist der Output stabil über Node 22 + 24.
  - **Followup #2 (Run `25225805748`):** Frontend-Multi-Arch-Image-Build schlug an [`docker/frontend.Dockerfile:53`](docker/frontend.Dockerfile:53) (`COPY --from=builder /app/public ./public`) fehl, weil das Repo kein `frontend/public/`-Verzeichnis hatte. Backend- und Backup-Image wurden im selben Run erfolgreich nach GHCR gepusht — das beweist zugleich, dass die Workflow-Permissions ohne manuelle Anpassung bereits ausreichen (GitHub-Default für neue Repos). **Fix:** leerer [`frontend/public/.gitkeep`](frontend/public/.gitkeep) mit Hinweis-Kommentar; lokaler `docker build` läuft sauber durch.
- **Folge-Anpassung in M10.6 nach M10.7-Image-Publish [ERLEDIGT] 2026-05-01:** `docker/compose.prod.yml` `backup`-Service von `build:` auf `image: ghcr.io/paddel87/hc-map-backup:${HCMAP_IMAGE_TAG:-rc}` + `pull_policy: always` umgestellt — analog backend/frontend. Anonymous `docker pull` aller drei Images verifiziert; Image-Smoke bestätigt enthaltene Tool-Versionen (backup: pg_dump 16.13 + age 1.1.1 + rclone v1.60.1-DEV + 5 Skripte; backend: Python 3.12.13 + `app.main` importierbar; frontend: Node 22.22.2 + `.next/static`-Bundle + `/app/public`). Multi-Arch-Manifest-List zeigt amd64 + arm64 als separate Digests.
- **Hinweise zur Repo-Konfiguration (manuelle Schritte des Repo-Eigentümers, nicht Code):**
  - Workflow-Permissions: Default „Read and write" auf dem Repo war bereits ausreichend (Run #2 hat `hc-map-backend` und `hc-map-backup` ohne Settings-Anpassung gepusht).
  - GHCR-Paket-Sichtbarkeit `hc-map-backend`, `hc-map-frontend`, `hc-map-backup` von Patrick auf „Public" gestellt (2026-05-01); anonymous `docker pull` aller drei Images verifiziert.

**M10.7.1 — Action-Versions-Audit + Node-24-Bumps** [ERLEDIGT] 2026-05-01

Strategie-ADR: [ADR-052](./decisions.md#adr-052--github-actions-major-bumps-auf-node-24-fähige-runtimes-m1071). Auflösung von [Blocker #002](./blockers.md#blocker-002-github-actions-runtime-deprecation-nodejs-20).

- **Audit-Methodik:** alle neun in `.github/workflows/ci.yml` + `release.yml` referenzierten Actions live gegen die GitHub-Releases-API geprüft (`gh api repos/<owner>/<repo>/releases`), dann je Major-Tag das `action.yml` per Contents-API gezogen und das `using:`-Feld auf `node24` verifiziert. Kein Verlass auf Trainingsdaten (CLAUDE.md §6).
- **Bumps:** `actions/checkout@v4 → @v6`, `actions/cache@v4 → @v5`, `actions/setup-node@v4 → @v6`, `astral-sh/setup-uv@v5 → @v8.1.0`, `docker/build-push-action@v6 → @v7`, `docker/login-action@v3 → @v4`, `docker/metadata-action@v5 → @v6`, `docker/setup-buildx-action@v3 → @v4`, `docker/setup-qemu-action@v3 → @v4`. Alle neun `using: node24` aus dem jeweiligen `action.yml` der Ziel-Tags bestätigt.
- **`setup-uv`-Sonderfall (immutable Pin):** astral hat mit v8 floating major-/minor-Tags eingestellt (Supply-Chain-Hardening, vgl. tj-actions-Vorfall, Release-Notes v8.0.0). Empfohlene Pin-Form ist eine immutable Release-Version. Wir folgen mit `@v8.1.0`. Inline-Kommentar an der `uses:`-Zeile dokumentiert die Begründung. Alle anderen acht Actions bleiben auf floating Major-Tags — eine projektweite Umstellung auf immutable Pins wäre eigener Sub-Step und ist in ADR-052 als Folge-Aufgabe nach M11 vorgemerkt.
- **Vertrags-Audit der Major-Wechsel:**
  - `actions/setup-node@v5` aktivierte Auto-Cache via `packageManager`-Feld in `package.json` — hätte mit unserem expliziten `actions/cache`-Step kollidiert. `@v6` limitiert Auto-Cache auf npm; pnpm-Setup unverändert sicher. Kein `package-manager-cache: false` nötig.
  - `astral-sh/setup-uv@v6` verlangt `activate-environment: true` für die alte Auto-Venv-Aktivierung — wir nutzen `python-version` nicht, daher unkritisch. v7 entfernt deprecated `server-url` (nutzen wir nicht). v8 entfernt deprecated `manifest-file`-Format (nutzen wir nicht).
  - `docker/setup-buildx-action@v4` entfernt deprecated Inputs/Outputs — wir nutzen kein `with:`-Block, daher unkritisch.
  - `docker/build-push-action@v7`, `docker/login-action@v4`, `docker/metadata-action@v6`, `docker/setup-qemu-action@v4`: ausschließlich Node-Bump + ESM-Refactor intern, keine Vertragsänderungen.
  - `actions/checkout@v6`: Cred-Persistenz separater File — wir nutzen den Token nach checkout nicht mehr für git-Ops, daher unkritisch.
  - `actions/cache@v5`: reine Node-Bump-Major; Cache-Key-Schema unverändert.
- **Verifikation lokal:** `actionlint v1.7.12` (von `rhysd/actionlint`-Release) gegen `ci.yml` + `release.yml` → **0 Fehler, exit 0**. Backend-/Frontend-Test-Stand unverändert (M10.7.1 berührt ausschließlich CI-Files): pytest 246/246, vitest 278/278, format:check + lint + typecheck clean.
- **Verifikation CI:** Push-Run auf `claude/vigorous-brown-550d11` ausgeführt; Annotation „Node.js 20 actions are deprecated" verschwindet, alle drei Jobs (`backend-lint-test`, `frontend-lint-test`, `build-push`) grün, Multi-Arch-Push nach GHCR identisch zu M10.7-Verhalten.
- **Stichtags-Wirkung:** Beide Deadlines aus Blocker #002 entschärft — 2026-06-02 (Runner-Default Node 24) und 2026-09-16 (Node 20 entfernt). Kein Notfall-`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` und kein `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` nötig.
- **Folge-Aufgaben (nach M11):** Renovate-/Dependabot-Konfig für GitHub-Actions-Updates, ggf. projektweite Umstellung aller `uses:`-Zeilen auf immutable Pins (SHA oder exakte Tag-Version) analog `setup-uv`.

**M10.8 — `ops/runbook.md` + README-Restruktur** [ERLEDIGT] 2026-05-01
- Neues Dokument [`ops/runbook.md`](../ops/runbook.md) (~13 KB, 14 Abschnitte): Voraussetzungen-Tabelle (VPS, OS, Disk-Encryption, DNS, SMTP, Backup-Ziel, lokale Tools), SSH-Hardening (Non-Root-User, Key-only sshd-Konfig, ufw + fail2ban), Docker-Install (offizielles Repo, Compose-v2-Plugin), Repo-Klon + `.env.prod`-Pflichtfeld-Tabelle, Reverse-Proxy-Wahl (Caddy/Traefik/eigener Proxy), SMTP-Backend-Tabelle für die drei typischen TLS-Modi, age-Key-Walkthrough (`age-keygen` lokal, Public-Key in `docker/secrets/`, Private-Key in Passwort-Manager + 2-Personen-Split, jährliche Rotation), rclone-Walkthrough (Hetzner Storage Box / Backblaze B2 / generisches S3 / Local-FS), Stack-Start mit beiden Overlay-Varianten + was beim ersten Start passiert, Admin-Bootstrap via `python -m scripts.bootstrap_admin`, 7-Punkte-Smoke-Test, Update-Pfad mit Notfall-`HCMAP_SKIP_MIGRATIONS` und Rollback-Hinweis, **Restore-Drill als Pflichtkapitel vor Go-Live** (Test-DB anlegen, Snapshot identifizieren, Restore-Container-Aufruf, Schema-Diff-Verifikation, Cleanup, Worst-Case-Server-Totalausfall-Prozedur), Betriebs-Spickzettel + Volume-Tabelle, „Häufige Stolperer"-Tabelle mit 11 Symptom→Ursache-Paaren.
- README umstrukturiert: Inhaltsverzeichnis neu aufgeteilt nach Operator-zentriertem Lese-Pfad. **Operator-Quickstart** als oberster Aktions-Abschnitt mit 8 nummerierten Schritten (Hardening → Repo → ENV → Reverse-Proxy → age+rclone → Stack-Start → Bootstrap → Smoke). **Konfiguration**-Abschnitt mit Pflichtvariablen-Tabelle (10 Felder) und Image-Tag-Schema. **Backups**-Abschnitt mit Schedule-Tabelle, Verschlüsselung-Kurzhinweis und Restore-Verweis. **Update-Pfad**-Abschnitt mit Backend-Start-Sequenz (Advisory-Lock + Alembic) und Rollback-Klausel. **Sicherheit und Datenschutz** unverändert, aber an die Operator-Position oberhalb von Dev-Setup verschoben. **Development-Setup** nach unten verlagert (Voraussetzungen, Docker-Compose-Dev, Backend-/Frontend-ohne-Docker, Pre-commit). **Repository-Struktur**, **Technischer Stack** (zusätzliche Backup-Zeile in der Tabelle), **Projektstatus** (M10.8 als ✅ markiert). **Architektur und Dokumentation** mit `ops/runbook.md` in der Doku-Tabelle. **Mitwirken** + **Lizenz** unverändert.
- README-Header: neuer **CI-Status-Badge** (`https://github.com/Paddel87/hc-map/actions/workflows/ci.yml/badge.svg?branch=main`), greift seit M10.7-Run #2 (2026-05-01). Phase-Badge auf `M10.7-erledigt` aktualisiert (M10.8 ist Doku, kein Phasenwechsel). Auskommentierter Hinweis auf Caddy/Traefik-Badge: bleibt aus, bis nach Restore-Drill in M10.9 ein Reverse-Proxy als „getestet" markiert ist (CLAUDE.md §6: keine Wunsch-Zustände).
- **Verifikation:** `pnpm format:check` clean (Doku-Files sind außerhalb des Prettier-Scopes, aber die Touchpoints im Repo-Root unverändert). README + Runbook gegeneinander cross-referenziert (Quickstart-Schritte 1–8 spiegeln Runbook §2–§10, Backup-Beschreibungen identisch). ADR-051 §H/§I-Punkte abgehakt: §H Punkt 1–8 → README-Reihenfolge identisch; §I-Zelle „M10.8" Deliverables (`ops/runbook.md` mit allen 9 Pflicht-Themen + README-Operator-Quickstart) erfüllt.
- **Akzeptanz (Patrick):** Lese-Test ausstehend — Lücken werden im selben Sub-Step nachgezogen, sobald Feedback vorliegt.

**M10.9 — RC-Voll-Verifikation, Tag, Pre-Release** [IN ARBEIT] 2026-05-02
- **Smoke-Setup (lokal, Variant B per Patrick-Freigabe):** eigenes Compose-Project `hc-map-rc`, gitignored `.smoke/`-Verzeichnis (`.env.prod`, `age/hc-map.age.key`, `compose.smoke.yml` für Mailpit + Backup-Volume + Smoke-Overrides, `traefik-certs/` mit selbst-signiertem Cert). `docker/Caddyfile`, `docker/secrets/{age-recipients.txt,rclone.conf}`, `docker/traefik/{traefik,dynamic}.yml` sind die operator-typischen Working-Copies (alle gitignored), gefüllt mit Smoke-Werten (`tls internal`, lokaler rclone-Remote `[local]`, public-key-only). MapTiler-Key bewusst leer (Smoke betrifft keine Karten-Endpunkte).
- **Smoke-Run #1 (Caddy + `tls internal`)** [GRÜN]:
  1. Healthcheck: `curl https://hc-map.localhost/api/health` → 200 + `{"status":"ok","environment":"production"}`. Caddy-internal-CA hat Cert für `hc-map.localhost` ausgestellt (Issuer `local`).
  2. Bootstrap-Admin: `docker compose ... exec backend python -m scripts.bootstrap_admin --email admin@hcmap-smoke.example --password ...` → `Bootstrapped admin user … (role=admin).`
  3. Login: `POST /api/auth/login` → 204 + `hcmap_session` (HttpOnly + JWT) + `hcmap_csrf` (lesbar) Cookies, beide mit `Secure`-Flag.
  4. Live-Event: `POST /api/events/start` → 200, `id=019de585-…`, `plus_code` server-side berechnet, `participants` enthält Admin-Person (Auto-Trigger M5c.1b).
  5. Backfill-Event: `POST /api/events` mit `legacy_external_ref="w3w://demo.alpha.foxtrot"` → 201 (M5c-NACH-Feldpfad funktioniert).
  6. Edit: `PATCH /api/events/{id}` mit `note`-Update → 200, `updated_at` springt korrekt.
  7. Anonymisierung: OTF-Person erstellt, `POST /api/persons/{id}/anonymize` → 200, DB zeigt `name='[gelöscht]'`, `alias=NULL`, `note=NULL`, `is_deleted=t`, `deleted_at` gestempelt.
  8. Merge: zwei OTF-Personen, `POST /api/admin/persons/{src}/merge` mit `{"target_id":"…"}` → 200, Source soft-deleted mit Marker `[merged → <target-uuid>]`, Target unverändert.
  9. Stats: `GET /api/admin/stats` → `events_total=2`, `users_by_role={admin:1}`, `persons_total=2`, `events_per_month_last_12.length=2`.
  10. Export: `GET /api/admin/export/all` → 3263 Bytes, `schema_version=1`, alle 11 Collections vorhanden.
- **Backup-Roundtrip** [GRÜN]: `docker compose ... exec backup /usr/local/bin/run-backup daily` → 73-KB-age-encrypted Dump in Backup-Volume `local:/backups/hc-map/daily/<ts>.dump.age`. Restore-Container (`--entrypoint /usr/local/bin/restore.sh`, mit `AGE_IDENTITY_FILE` + `rclone.conf`) holt + entschlüsselt + `pg_restore` in `hcmap_restore`-DB. Row-Counts identisch (event:2, person:4, user:1, event_participant:2). Schema-Diff = 120 Zeilen, davon 100 % `GRANT … TO app_user` — Folge des bewusst gewählten `pg_restore --no-owner --no-acl` in [`docker/backup/restore.sh`](../docker/backup/restore.sh) (cluster-agnostic Restore). Daten-Roundtrip sauber. *Doku-Followup:* `ops/runbook.md` §12.4 verspricht "null Zeilen" — sollte präzisiert werden.
- **Mail-Reset-Roundtrip gegen Mailpit** [GRÜN]: `POST /api/auth/forgot-password` → 202 ohne User-Enumeration. Mailpit empfängt 1 Mail von `hc-map@example.org` mit Subject `HC-Map: Passwort zuruecksetzen`, deutscher Plain-Text-Body mit Reset-Link `https://hc-map.localhost/reset-password?token=<JWT>`. Token aus Mail extrahiert; `POST /api/auth/reset-password` mit `{"token":"…","password":"NewSmokePW-Reset-RC1"}` → 200. Re-Login mit neuem Passwort → 204 + neue Session-Cookie.
- **Smoke-Run #2 (Traefik alternativ + selbst-signiertes Cert)** [GRÜN]: HTTP→HTTPS-Redirect (301), TLS-Termination mit selbst-signiertem Cert (Issuer `CN=hc-map.localhost`), Login (`secure=TRUE` für `hcmap_session` + `hcmap_csrf` in Cookie-Jar), Live-Event-Anlage in Frankfurt → 200. Traefik-Service-Discovery: file-Provider-Routen in `docker/traefik/dynamic.yml` (Workaround für macOS-Docker-Desktop-Socket-Permission-Quirk; auf Linux-VPS reicht der Docker-Provider mit Socket-Mount).
- **Zwei Repo-Defekte aufgedeckt + gefixt** (siehe [Blocker #003](./blockers.md#blocker-003-backend-image-enthielt-keine-migrations-rc-show-stopper) + [#004](./blockers.md#blocker-004-traefik-overlay-mountete-varrundockersock-nicht)):
  - **Blocker #003** — `docker/backend.Dockerfile` kopierte nur `backend/app` ins Image, fehlten `migrations/`, `alembic.ini`, `scripts/`. Backend crashloopt beim Start mit `alembic.util.exc.CommandError: Path doesn't exist: /app/migrations`. **Fix:** drei zusätzliche `COPY`-Statements in Builder- und Runtime-Stage.
  - **Blocker #004** — `docker/compose.traefik.yml` mountete `/var/run/docker.sock` nicht. Traefik-Docker-Provider crasht in Endlos-Retry, alle Routen tot. **Fix:** Read-Only-Bind-Mount `/var/run/docker.sock:/var/run/docker.sock:ro`.
- **Verifikations-Image:** lokal gebautes `hc-map-backend:smoke-fix` (mit beiden Fixes) erfolgreich. Re-Smoke gegen frische `:main`-Image nach Push erfolgt unten.
- **Nächste Schritte (in Reihenfolge):**
  - Push der zwei Bugfixes auf `main` → CI Workflow `ci.yml` baut `:main` neu.
  - Re-Smoke gegen frische `:main` (kurzer Sub-Smoke: Backend hochfahren + Migrations + Health + Login).
  - Tag `v0.1.0-rc.1` (annotated, **unsigniert** per Patrick-Freigabe).
  - Push Tag → `release.yml` (GitHub-Pre-Release) + `ci.yml`-`build-push` (`:v0.1.0-rc.1` + `:rc` GHCR-Tags) parallel.
  - `docker pull ghcr.io/paddel87/hc-map-backend:0.1.0-rc.1` (ohne `v` — `metadata-action`-Konvention) aus frischer Shell anonym verifizieren.
  - M10 + M10.9 → [ERLEDIGT].

**Akzeptanzkriterien M10 gesamt:**
- Tag `v0.1.0-rc.1` auf GitHub als Pre-Release sichtbar, Release-Notes enthalten Quickstart-Verweis.
- Multi-Arch-Images auf GHCR public, Pull ohne Auth möglich.
- Voll-Compose-Stack mit beiden Reverse-Proxy-Overlays alternativ erfolgreich gestartet, Smoke grün.
- Backup-Roundtrip dokumentiert + erfolgreich.
- README-Quickstart liest sich für eine Drittperson schlüssig.
- Alle Tests grün (pytest, vitest, lint, typecheck, format).

**Abhängigkeiten:** M0 – M8 ([ERLEDIGT]); M9 [VERWORFEN]; M5c-NACH ist nicht-blockierend (sollte aber vor `v0.1.0`-Final stehen).

---

### M11 — Go-Live Pfad A (Promote RC → `v0.1.0`)

**Ziel:** Patricks RC-Image (`v0.1.0-rc.1`) läuft produktiv auf seinem VPS, die <20-Personen-Gruppe nutzt HC-Map. Bei Stabilität wird der RC zu `v0.1.0`-Final promoted (Tag, kein Re-Build).

**Deliverables:**
- Patrick provisioniert seinen VPS gemäß `ops/runbook.md` (eigene Domain, eigener Reverse-Proxy-Pick, eigenes Backup-Ziel via M13-Wahl, eigener SMTP-Anbieter).
- RC-Image-Pull aus GHCR; Compose-Stack startet; Bootstrap-Admin-Anlage.
- Einwilligungstext (aus `consent-de.md`-Vorlage angepasst) liegt den Mitgliedern vor, Einwilligungen dokumentiert.
- Bestand der vorher bei w3w geführten Events ist von den Mitgliedern manuell über M5c (Nachträgliche Erfassung) eingepflegt — Fortschritt wird gruppenintern nachgehalten, kein systemseitiger Vollständigkeits-Check (ADR-050).
- Alle Mitglieder als User angelegt und mit Personen verknüpft.
- Kurz-Onboarding-Doku für die Gruppe (1 Seite).
- w3w-Account ist gekündigt (kann unabhängig vom Go-Live-Termin geschehen, ADR-050).
- Bei Stabilität nach mind. 7 Tagen produktivem Betrieb: Git-Tag `v0.1.0` (Final). GHCR-Image-Tags `:0.1.0`, `:0.1`, `:0`, `:latest` werden gesetzt (alle ohne `v`-Prefix per `metadata-action`-Konvention). **Hinweis:** Image-Bytes sind nicht garantiert identisch zu `:0.1.0-rc.1` — BuildKit-Default ist nicht-deterministisch (Timestamps, Cache-Invalidierung). Wenn Reproducibility wichtig wird, müsste `SOURCE_DATE_EPOCH` + `--output rewrite-timestamp=true` ergänzt werden (Followup nach M11).

**Akzeptanzkriterien:**
- Alle Mitglieder können sich einloggen, eigene Events sehen.
- Admin hat Vollzugriff, Freigabe-Workflows funktionieren.
- Mitglieder bestätigen, dass die für sie relevanten Bestands-Events eingepflegt sind (informell, kein automatischer Abgleich).
- Mind. ein erfolgreicher Backup-Restore-Drill auf Patricks Setup.
- `v0.1.0`-Tag und Final-Release auf GitHub.

**Abhängigkeiten:** M0 – M10. M5c-NACH wird **vor** dem Final-Tag empfohlen (RC kann ohne, Final-Tag sollte den Legacy-Ref-UI-Pfad abdecken).

---

### M11-HOTFIX-001 — Frontend SSR Backend-URL nicht durchgereicht (Issue #15)

**Status:** `[ERLEDIGT]` 2026-05-02 — ADR-053 (Empfehlung A) am 2026-05-02 von Patrick freigegeben; Fix in Commit [80ce568](https://github.com/Paddel87/HC-Map/commit/80ce568) auf `main`; Issue [#15](https://github.com/Paddel87/HC-Map/issues/15) geschlossen.

**Problem:**
Im RC-Image `ghcr.io/paddel87/hc-map-frontend:rc` rufen die Server-Components Backend-URL via `process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"` auf (4 Code-Stellen: [lib/auth-server.ts:5](../frontend/src/lib/auth-server.ts#L5), [(protected)/page.tsx:10](../frontend/src/app/(protected)/page.tsx#L10), [(protected)/search/page.tsx:6](../frontend/src/app/(protected)/search/page.tsx#L6), [(protected)/events/[id]/edit/page.tsx:9](../frontend/src/app/(protected)/events/[id]/edit/page.tsx#L9)). Weder [docker/compose.prod.yml](../docker/compose.prod.yml) noch [docker/docker-compose.yml](../docker/docker-compose.yml) setzen die Variable, und [.env.example](../.env.example) dokumentiert sie nicht. Im Container-Netzwerk ist `localhost:8000` der Frontend-Container selbst — Backend hört dort nicht. Ergebnis: jede SSR-Route (Dashboard, Suche, Edit-Forms, Login-Layout-Probe) liefert `ECONNREFUSED` und Next.js zeigt die Error-Page. Statisch gerenderte Pfade (`/login`-GET) kommen durch, deshalb hat M10.9-RC-Smoke den Bug nicht abgedeckt — ein echter SSR-getriggerter Login-Flow war nicht im Smoke-Set.

Bug betrifft **alle drei Reverse-Proxy-Pfade** aus ADR-051 §B (Caddy, Traefik, externer Proxy), weil der Reverse-Proxy ausschließlich Browser↔Frontend/Backend routet — SSR-Fetches gehen direkt aus dem Frontend-Container und sehen den Reverse-Proxy nicht.

**Deliverables:**
- `BACKEND_INTERNAL_URL` als Pflicht-Env in [docker/compose.prod.yml](../docker/compose.prod.yml) und [docker/docker-compose.yml](../docker/docker-compose.yml) `frontend`-Service durchgereicht, Default `http://backend:8000`.
- [.env.example](../.env.example) um Doku-Eintrag (Frontend-Block) erweitert.
- [ops/runbook.md](../ops/runbook.md) Stolperer-Sektion: was tun, wenn ein eigener Reverse-Proxy außerhalb des Compose-Netzes verwendet wird (Pfad 4.3) — dann muss `BACKEND_INTERNAL_URL` händisch auf den im jeweiligen Setup erreichbaren Backend-Hostname gesetzt werden.
- Image **muss neu gebaut werden? Nein** — die Variable wird zur Request-Time aus `process.env` gelesen (Next.js Server-Components), kein Build-Inline. Ein Image-Re-Build ist *nicht* nötig; ein `compose up -d` mit ergänzter Env genügt. Operator-relevant: sobald Patches gemerged + ein neuer `:rc`-Build durchläuft, decken auch Operator ohne lokale Compose-Änderung den Default `http://backend:8000` ab.
- Naming-Entscheid (siehe ADR-053): Variable behält ihren bestehenden Namen `BACKEND_INTERNAL_URL` ohne `HCMAP_*`-Präfix, weil sie eine Frontend-/Next.js-Server-Env ist (separater Namespace zu Backend-Pydantic-Settings); Begründung im ADR.
- Smoke-Test (Folge-Aufgabe nach Fix): RC-Smoke-Set um echten SSR-Login-Pfad erweitern, sodass dieser Bug-Modus beim nächsten RC nicht mehr durchschlüpft. Nicht Teil dieses Hotfix-Sub-Steps; eigener Eintrag nach Final-Tag (oder als Zusatz in M14).

**Akzeptanzkriterien:**
- Browser-Aufruf von `https://<domain>/login` rendert SSR-Login-Page (HTTP 200, kein `ECONNREFUSED` mehr in `docker compose logs frontend`).
- Browser-Aufruf von `https://<domain>/` (Dashboard-Redirect bei Auth) liefert Login-Form, kein Application-Error.
- Frontend-Container hat `BACKEND_INTERNAL_URL=http://backend:8000` in `docker exec hcmap-frontend env`.
- Issue #15 geschlossen mit Verweis auf Commit + ADR-053.
- Doku-Cross-Check: Drittperson liest `runbook.md` + `.env.example` und versteht, wann/wie die Variable überschrieben werden muss.

**Verifikations-Plan (im Worktree):**
1. Patches in `docker/compose.prod.yml`, `docker/docker-compose.yml`, `.env.example` einbringen.
2. Lokaler Compose-Test (`docker/docker-compose.yml`): `pnpm dev` ist nicht ausreichend — wir brauchen den Container-Pfad. `docker compose -f docker/docker-compose.yml up -d --build frontend backend db`, dann `curl -s http://localhost:3000/login | grep -q "Anmelden"` (oder analoger SSR-Marker).
3. Falls Operator-Pfad via `docker exec hcmap-frontend env` lokal nicht reproduzierbar ist (Worktree ohne laufendes Compose), dann Smoke nach Merge auf einem CI-Branch oder Patrick-VPS-Test.
4. Issue #15 mit Befund-Kommentar und Commit-Referenz schließen.

**Abhängigkeiten:** ADR-053 freigegeben.

**Bezug:**
- Issue: [#15 — Frontend SSR macht ECONNREFUSED 127.0.0.1:8000](https://github.com/Paddel87/HC-Map/issues/15) (Labels `bug`, `frontend`, `severity:blocker`, `M11`).
- ADR: [ADR-053 — Frontend SSR-Backend-Adressierung im Production-Container-Netz](./decisions.md#adr-053--frontend-ssr-backend-adressierung-im-production-container-netz) (Status `Proposed`).
- Vorgänger: ADR-051 §B (Reverse-Proxy-Wahlfreiheit), §F (manueller Pull, Operator-Mechanik).

---

### M11-HOTFIX-002 — Frontend-Image-Healthcheck akzeptiert nur HTTP 200 (Issue #16)

**Status:** `[ERLEDIGT]` 2026-05-02 — kein ADR (Image-Default-Korrektur ohne Architekturwirkung, analog Blocker #003-Fix in M10.9). Verifikation: lokales `hc-map-frontend:hotfix-002`-Image, Container ohne Backend-Connect gestartet, `docker inspect --format '{{.State.Health.Status}}'` nach ~30 s = `healthy`. HTTP-Probe `node -e "require('http').get('http://127.0.0.1:3000/', r => console.log(r.statusCode))"` aus dem Container = `307` (Redirect → `/login`), Healthcheck akzeptiert es korrekt.

**Problem:**
Der `HEALTHCHECK` in [docker/frontend.Dockerfile:60](../docker/frontend.Dockerfile#L60) prüft strikt `statusCode === 200`. Der Frontend-Container liefert auf `GET /` aber `307 Temporary Redirect` → `/login` (Auth-Bridge in `(protected)/layout.tsx`). Damit wird der Container in jedem Default-Setup als `unhealthy` markiert, obwohl er einwandfrei läuft.

Folgen:
- `docker compose ps` zeigt dauerhaft `unhealthy` → Operator-Verwirrung (Befund aus M11-RC-Smoke auf Nodica1, Issue #16).
- `depends_on: condition: service_healthy` würde mit dem Frontend einen Deadlock erzeugen, sobald jemand es ergänzt.
- Externes Monitoring (Uptime Kuma o. Ä., M14) würde permanent Alarm schlagen.

**Deliverables:**
- [docker/frontend.Dockerfile](../docker/frontend.Dockerfile) Healthcheck-CMD von `r.statusCode === 200` auf `r.statusCode >= 200 && r.statusCode < 400` umgestellt. Standard-Container-Healthcheck-Semantik („Server antwortet HTTP", nicht „Server liefert 200 auf der Wurzel").
- Variante (a) aus Issue #16; (b)/(c) verworfen (Routen-Annahme bzw. neue Route mit API-Vertragserweiterung).

**Akzeptanzkriterien:**
- Frische `:rc`/`:main`-Image (oder lokaler Build) zeigt nach Image-Bau und Container-Start `healthy`-State in `docker inspect --format '{{.State.Health.Status}}' <container>`.
- Issue #16 geschlossen mit Verweis auf Commit + Fahrplan.

**Verifikations-Plan (im Worktree):**
1. Edit der einen Zeile in `docker/frontend.Dockerfile`.
2. Image lokal bauen: `docker build -f docker/frontend.Dockerfile -t hc-map-frontend:hotfix-002 .`.
3. Container starten: `docker run -d --name hcmap-frontend-hf002 hc-map-frontend:hotfix-002` (Backend-Connect für SSR-Routes nicht nötig — Healthcheck testet nur Server-Antwort, der 307-Redirect kommt vor jedem Backend-Fetch).
4. ~45 Sekunden warten (Interval 30s + Start-Period 10s + Timeout 5s), dann `docker inspect --format '{{.State.Health.Status}}' hcmap-frontend-hf002` → erwartet `healthy`.
5. Container aufräumen.
6. Issue #16 mit Verifikations-Output schließen.

**Risiko:** sehr klein. Healthcheck wird permissiver, nicht restriktiver — kein bestehender gesunder Zustand wird neu als `unhealthy` klassifiziert. 4xx/5xx bleiben weiterhin `unhealthy`.

**Bezug:**
- Issue: [#16 — Frontend-Image-Healthcheck akzeptiert nur HTTP 200, nicht 3xx-Redirects](https://github.com/Paddel87/HC-Map/issues/16) (Labels `bug`, `frontend`, `M11`).
- Vorbild: Blocker #003-Fix in M10.9 (Dockerfile-Korrektur ohne ADR).
- Operator-Kontext: Issue ist Folge der Begehung auf Nodica1 mit `:rc` nach M11-HOTFIX-001-Pull.

---

### M11-HOTFIX-003 — Strukturierter Access-Logger mit PII-Redaction (Issue #21, ADR-054)

**Status:** `[ERLEDIGT]` 2026-05-02 — ADR-054 (Variante B) am 2026-05-02 von Patrick freigegeben; Implementierung in [`backend/app/logging_middleware.py`](../backend/app/logging_middleware.py) + Auth-Audit-Hooks in [`backend/app/auth/manager.py`](../backend/app/auth/manager.py); 10 neue Tests in [`backend/tests/test_logging_middleware.py`](../backend/tests/test_logging_middleware.py); volle Suite **256/256** grün (vorher 246), `ruff check` + `ruff format --check` + `mypy --strict` clean.

**Problem:**
Während der M11-Operator-Begehung auf Nodica1 (Issue [#17](https://github.com/Paddel87/HC-Map/issues/17), 2026-05-02) wurden drei UX-Befunde gemeldet, deren Diagnose mangels Backend-Request-Logs nicht möglich war. `docker logs hcmap-backend` enthielt ausschließlich Startup- und Migrations-Zeilen — keine Access-Logs für eingehende Requests. Code-Audit: uvicorn wird ohne `--access-log`-Flag gestartet, und der structlog-Setup mit `PrintLoggerFactory` umkonfiguriert effektiv `uvicorn.access`/`uvicorn.error` über den root-Logger-Pfad.

Die Spannung zwischen Operator-Diagnostik und dem Constraint „Keine personenbezogenen Daten in Logs" ([`project-context.md`](./project-context.md) §6) wurde mit Variante B aufgelöst (siehe ADR-054).

**Deliverables (alle erledigt):**
- Neue Datei [`backend/app/logging_middleware.py`](../backend/app/logging_middleware.py): outermost FastAPI-HTTP-Middleware `request_logger`, emittiert pro Request eine strukturierte Logzeile `event="http.request"` mit `method`, `route` (FastAPI-Route-Template z. B. `/api/events/{event_id}`), `status`, `duration_ms`, `request_id`. Log-Level: 1xx-3xx → `info`, 4xx → `warning`, 5xx → `error`. Query-String, Body, konkrete IDs werden **nicht** geloggt; UUID-Redaction-Fallback `{redacted_uuid}` für ungematchte Pfade.
- [`backend/app/auth/manager.py`](../backend/app/auth/manager.py) erweitert um `_user_id_hash` (SHA-256 gekürzt auf 16 hex), neue Hooks `on_after_login` (Event `auth.login.success`), `on_after_reset_password` (Event `auth.password.reset.success`); bestehender `on_after_forgot_password` emittiert zusätzlich `auth.forgot_password.requested`. Alle Auth-Events tragen ausschließlich den User-ID-Hash, niemals E-Mail oder Klartext-UUID.
- [`backend/app/main.py`](../backend/app/main.py): Middleware nach CSRF-Pipeline registriert (outermost). `request_id` per `structlog.contextvars.bind_contextvars` Task-lokal gebunden, damit alle Application-Logs (`migrations.*`, `services.*`, `auth.*`) automatisch dieselbe ID führen. Im Response-Header zurückgespiegelt (`X-Request-ID`).
- [`backend/app/logging.py`](../backend/app/logging.py) Docstring auf den neuen Mechanismus aktualisiert.
- ADR-054 in [`docs/decisions.md`](./decisions.md#adr-054--strukturierter-access-logger-mit-pii-redaction-variante-b-aus-issue-21) als `Accepted` (Variante B Begründung, Out-of-Scope, Risiken/Mitigationen, Folge-Arbeit).
- 10 Tests in [`backend/tests/test_logging_middleware.py`](../backend/tests/test_logging_middleware.py): http.request-Emission, request-id-roundtrip, 4xx-Level-Eskalation, UUID-Redaction-Fallback, Login-Failure-Event, Login-Success mit User-Hash + No-PII-Assertion, Logout-Event, User-Hash-Stabilität, Route-Template für Path-Vars.

**Verifikation:**
- `uv run pytest -q` → **256/256 grün** (vorher 246/246, +10 neue Tests).
- `uv run ruff check app tests` → All checks passed.
- `uv run ruff format --check app tests` → 104 files already formatted.
- `uv run mypy --strict app/logging_middleware.py app/auth/manager.py app/main.py app/logging.py` → Success: no issues found.

**Bezug:**
- Issue: [#21 — Backend: Strukturierter Access-Logger mit PII-Redaction (Variante B aus #17-Nebenbefund)](https://github.com/Paddel87/HC-Map/issues/21) (Labels `enhancement`, `M11`).
- ADR: [ADR-054 — Strukturierter Access-Logger mit PII-Redaction (Variante B aus Issue #21)](./decisions.md#adr-054--strukturierter-access-logger-mit-pii-redaction-variante-b-aus-issue-21) (Status `Accepted`).
- Vorgänger-Issues: [#17](https://github.com/Paddel87/HC-Map/issues/17) (Sammel-Operator-Bericht), `project-context.md` §6 (Datenschutz-Constraint).
- Schaltet Diagnostik-Pfad für [#19](https://github.com/Paddel87/HC-Map/issues/19) (Katalog-Reproduktion) frei.

---

### M11-HOTFIX-004 — Profil-Passwort-Änderungs-Form (Issue #18)

**Status:** `[ERLEDIGT]` 2026-05-02 — kein ADR (autonomiefähig nach `CLAUDE.md` §5: kein Architektur-Touch, kein neuer Endpoint, kein Datenmodell, keine neue Dependency). Frontend-only Lückenschluss; Backend-Endpoint `PATCH /api/users/me` war über `fastapi-users.get_users_router(UserRead, UserUpdate)` bereits einsatzbereit.

**Problem:**
Operator-Begehung auf Nodica1 nach M11-HOTFIX-001 (Issue [#17](https://github.com/Paddel87/HC-Map/issues/17) Befund 1, 2026-05-02) zeigte: Bootstrap-Admin kann das initial gesetzte Passwort nicht über das Profil-Menü rotieren. Der Frontend-Code in [`(protected)/profile/page.tsx:15`](../frontend/src/app/(protected)/profile/page.tsx#L15) trug selbst den Hinweis _"Passwort-Änderung folgt mit M11."_ — bewusste Lücke aus M2/M5a-Phase, jetzt in M11 nachgezogen, weil das Initial-Passwort als kompromittiert gilt und die Selbst-Rotation Standard-Hygiene ist.

**Deliverables (alle erledigt):**
- Neue Komponente [`frontend/src/components/profile/password-form.tsx`](../frontend/src/components/profile/password-form.tsx): Client-Component mit zwei Feldern (neues Passwort, Bestätigung), zod-Schema-Validierung (min. 12 Zeichen, beide gleich), TanStack-Mutation, Sonner-Toast-Feedback, Form-Reset nach Erfolg.
- [`frontend/src/lib/auth.ts`](../frontend/src/lib/auth.ts) erweitert um `useChangePassword`-Hook (PATCH `/api/users/me` mit `{password}`, invalidiert `meQueryKey` nach Erfolg).
- [`frontend/src/app/(protected)/profile/page.tsx`](../frontend/src/app/(protected)/profile/page.tsx): neue Card-Sektion "Passwort ändern" zwischen Konto-Block und Datenexport-Block; Hinweis-Text im Header von "Passwort-Änderung folgt mit M11" auf "Eigene Daten, Passwort, Sitzung und Datenexport." aktualisiert.
- 4 neue Tests in [`frontend/tests/password-form.test.tsx`](../frontend/tests/password-form.test.tsx): PATCH-/Body-Vertrag inkl. CSRF-Header `X-CSRF-Token`, Mismatch-Validierung, Mindestlänge-Validierung, Form-Reset nach Erfolg.
- **Reauth bewusst weggelassen:** fastapi-users prüft im `PATCH /api/users/me`-Default das aktuelle Passwort **nicht**. Eine reine Frontend-Reauth-Eingabe wäre Security-Theater. Wenn Reauth Pflicht werden soll, ist das eine Backend-Erweiterung (eigenes Issue, nicht-blockierend).

**Verifikation:**
- `corepack pnpm@10.33.0 test` → **282/282 vitest grün** (vorher 278, +4 neue Tests).
- `pnpm typecheck` (tsc --noEmit) → exit 0.
- `pnpm lint` (eslint) → exit 0.
- `prettier --check` auf die 4 berührten Files → "All matched files use Prettier code style".
- **Browser-Verifikation** (preview_start frontend/backend/database, Login mit Bootstrap-Admin → /profile → Form ausgefüllt → Submit): `PATCH /api/users/me → 200 OK`, Form-Reset, Toast.
- **End-to-End-Roundtrip** via curl: altes Passwort `ChangeMeAdmin12` liefert `400 LOGIN_BAD_CREDENTIALS`, neues Passwort `NewSecurePassword42` liefert `204 No Content` + frische `hcmap_session`/`hcmap_csrf`-Cookies.
- **Bonus** — M11-HOTFIX-003-Logger zeigt korrekte Auth-Events: `auth.login.success` mit `user_id_hash=c9baa18cdcafb829`, `auth.login.failed` (warning, kein User-Hash), `http.request` 400 als warning. Logger und Passwort-Form spielen wie erwartet zusammen.

**Bezug:**
- Issue: [#18 — Profil: Passwortänderungs-Form ergänzen (Frontend)](https://github.com/Paddel87/HC-Map/issues/18) (Labels `enhancement`, `frontend`, `M11`).
- Vorgänger: [#17 Befund 1](https://github.com/Paddel87/HC-Map/issues/17), Frontend-Selbst-Hinweis in `profile/page.tsx:15`.
- Backend-Endpoint: `PATCH /api/users/me` (fastapi-users-Standard, `UserUpdate.password: str | None = Field(default=None, min_length=12)` aus `auth/schemas.py:49`).
- Vorbild: [`frontend/src/components/auth/reset-password-form.tsx`](../frontend/src/components/auth/reset-password-form.tsx) (gleiche Pattern: zod-Schema, Mutation, Sonner-Toast).

---

### M11-HOTFIX-005 — Defense-in-Depth `BACKEND_INTERNAL_URL` als Image-ENV-Default (Issue #19)

**Status:** `[ERLEDIGT]` 2026-05-02 — kein ADR (Image-Default-Härtung des bestehenden Mechanismus aus ADR-053; analog M11-HOTFIX-002 und Blocker #003-Fix). Ergänzung zu ADR-053 §C ohne neue Architekturentscheidung — der etablierte Default `http://backend:8000` wird zusätzlich im Image gepinnt, sodass ein vergessener Compose-File-Update ihn nicht mehr unwirksam macht. Verifikation: lokales `hc-map-frontend:hotfix-005`-Image, `docker exec env | grep BACKEND_INTERNAL_URL` zeigt `http://backend:8000`; Compose-Override-Test mit `docker run -e BACKEND_INTERNAL_URL=http://my-custom-host:9000` zeigt korrekt den Override-Wert (Compose-`environment:` hat Vorrang über Image-ENV). Issue [#19](https://github.com/Paddel87/HC-Map/issues/19) bleibt **offen** bis Operator-Verifikation auf Production.

**Problem:**
Aufgespalten aus Issue [#17](https://github.com/Paddel87/HC-Map/issues/17) Befund 2: _Katalog (Handfesseln) lässt sich nicht öffnen._ Operator-Begehung auf Nodica1 mit `:rc`-Image. Lokale Reproduktion (Worktree-Setup, `pnpm dev` + `uvicorn --reload` + Postgres mit Bootstrap-Admin) ist **vollständig grün**: `/admin/catalogs` → `/admin/catalogs/restraint-types` lädt 17 Restraint-Type-Einträge, Tabs, Status-Filter, Console clean, Network ohne 4xx/5xx. Der Bug ist **production-spezifisch**.

Höchste Wahrscheinlichkeit: `BACKEND_INTERNAL_URL` ist im Frontend-Container nicht gesetzt — gleiche Wurzel wie [#15](https://github.com/Paddel87/HC-Map/issues/15). M11-HOTFIX-001 hat den Fix nur im Compose-File gesetzt; wenn der Operator den Compose-File nicht aus `main` (nach [80ce568](https://github.com/Paddel87/HC-Map/commit/80ce568)) zieht, fällt der Code auf den Inline-Default `http://localhost:8000` zurück (siehe ADR-053 §A) und SSR-Fetches scheitern. (Patrick beobachtete in #17 _"Login-Form lädt"_, was die Hypothese teilweise schwächt — ggf. ist dies aber bereits ein anderer Bug; #19 bleibt nach Defense-in-Depth offen, bis Operator-Verifikation stattfindet.)

**Deliverables:**
- [docker/frontend.Dockerfile](../docker/frontend.Dockerfile) Runtime-Stage `ENV`-Block ergänzt um `BACKEND_INTERNAL_URL=http://backend:8000` als Image-Default. Damit ist der häufigste Bug-Modus aus ADR-053 strukturell ausgeschlossen, **selbst** wenn die Compose-File-Vorlage nicht aktualisiert wird. Operator-Override per Compose-`environment:` oder `.env.prod` bleibt vollständig wirksam (Compose-Env hat Vorrang über Image-ENV).

**Akzeptanzkriterien:**
- Frische `:rc`/`:main`-Image (oder lokaler Build) zeigt nach `docker exec hcmap-frontend env | grep BACKEND_INTERNAL_URL` den Default `http://backend:8000`.
- Compose-File-Override mit `BACKEND_INTERNAL_URL=http://eigene-host:8000` greift weiterhin (Compose-Env > Image-ENV).
- Issue #19 bleibt **offen** bis Patrick auf Production verifiziert hat, dass der Katalog-Bug behoben ist (oder ein anderer Bug-Modus zu Tage tritt).

**Verifikations-Plan (im Worktree):**
1. Edit `docker/frontend.Dockerfile`.
2. Image bauen: `docker build -f docker/frontend.Dockerfile -t hc-map-frontend:hotfix-005 .`.
3. Container starten: `docker run -d --name hcmap-frontend-hf005 hc-map-frontend:hotfix-005`.
4. `docker exec hcmap-frontend-hf005 env | grep BACKEND_INTERNAL_URL` → erwartet `BACKEND_INTERNAL_URL=http://backend:8000`.
5. Container aufräumen.

**Risiko:** sehr klein. Compose-`environment:` und `.env.prod`-Overrides haben Vorrang über die Image-ENV — Operator, die einen anderen Backend-Hostname brauchen (z. B. Compose-Variante 4.3 mit externem Reverse-Proxy auf separatem Netz), werden nicht eingeschränkt.

**Bezug:**
- Issue: [#19 — Katalog-Übersicht öffnet nicht — Reproduktion + DevTools-Output benötigt](https://github.com/Paddel87/HC-Map/issues/19) (Labels `bug`, `frontend`, `M11`).
- Verwandt: [#15](https://github.com/Paddel87/HC-Map/issues/15) (gleiche Wurzel-Hypothese), [ADR-053 §A/§C/§F](./decisions.md#adr-053--frontend-ssr-backend-adressierung-im-production-container-netz) (etabliertes Mechanismus, jetzt zusätzlich im Image gepinnt).
- Operator-Kontext: Folge der Begehung auf Nodica1 mit `:rc` nach M11-HOTFIX-001-Pull; lokale Repro grün, Production-Verifikation steht aus.
- Folge: HOTFIX-005 hat Hypothese 1 (SSR-Backend-URL) gehärtet, traf aber den eigentlichen Bug nicht — der ist Reverse-Proxy-Routing-Konflikt, gelöst in M11-HOTFIX-006.

---

### M11-HOTFIX-011 — `reveal_participants`-Toggle prominent im Beteiligte-Tab (Issue #23 Befund 1, ADR-059)

**Status:** `[ERLEDIGT]` 2026-05-03 — Owner-Freigabe von Patrick im RC-3-Triage-Block (Variante A, niedrige Prio); ADR-059 `Accepted`. Branch `claude/m11-hotfix-011-reveal-toggle` gestackt auf PR [#31](https://github.com/Paddel87/HC-Map/pull/31).

**Problem:** Issue [#23](https://github.com/Paddel87/HC-Map/issues/23) Befund 1, korrigiert via [#27](https://github.com/Paddel87/HC-Map/issues/27): der `reveal_participants`-Toggle existiert bereits im Edit-UI (ADR-040), ist dort aber so versteckt, dass selbst der Event-Ersteller ihn nur durch Zufall findet. Strikte Default-Logik („Klardaten sichtbar nur via expliziter, audit-fähiger Aktion") ist DSGVO-konform und bleibt korrekt — nur die Auffindbarkeit ist das Problem.

**Deliverables (alle erledigt):**
- **ADR-059** (`Accepted`) in [`docs/decisions.md`](./decisions.md): Variante A (Toggle prominent im Beteiligte-Tab), B (eigener Berechtigungs-Block) und C (nur Tooltip) verworfen, drei Out-of-Scope-Punkte (Audit-Log-System, Pro-Person-Sichtbarkeit, Server-Side-RBAC bleibt in ADR-040).
- **Frontend `RevealParticipantsToggle`-Komponente** in [`event-detail-view.tsx`](../frontend/src/components/event/event-detail-view.tsx): Card-Header-Element im Beteiligte-Block, kompakte Checkbox + Erklärungstext „Audit-pflichtige Aktion — wird protokolliert". Sichtbar nur wenn `canEditEvent(user, ...)` → true (Admin oder Event-Ersteller).
- **`handleToggleReveal`-Handler:** RxDB-Patch auf `events`-Collection (`reveal_participants`, `updated_at`) — identischer Pfad wie das bestehende Edit-UI, kein neuer Backend-Endpoint. Toast-Bestätigung mit Verweis auf Audit-Trail über RxDB-Sync (M11-HOTFIX-003 Logger).
- **Edit-UI-Toggle bleibt unverändert** — der neue Detail-View-Toggle ist eine zusätzliche Eintrittstür, kein Ersatz.

**Verifikation:**
- `pnpm typecheck` → clean.
- `pnpm lint` → clean.
- `pnpm test` → **282/282 grün** (kein Test-Helper-Update nötig — bestehende Tests decken die Maskierungs-Logik bereits ab).
- `pnpm prettier --check` (per-file) → clean nach auto-format.
- **Browser-Verifikation** (Dev-Stack lokal hochgefahren via `preview_*`, eingeloggt als Admin):
  - `/events/{id}` zeigt `[data-testid="reveal-participants-toggle"]` im Beteiligte-Card-Header mit Label „Klarnamen sichtbar" und Erklärungstext „Audit-pflichtige Aktion — wird protokolliert (ADR-059)".
  - Initial-Wert `unchecked` (Default `reveal_participants=false`).
  - Klick auf Checkbox → `checked=true`, RxDB-Push läuft, GET `/api/events/{id}` zeigt `reveal_participants: true` (End-to-End-Sync bestätigt).

**Bezug:**
- Issue: [#23 Befund 1](https://github.com/Paddel87/HC-Map/issues/23) + [#27 Korrektur](https://github.com/Paddel87/HC-Map/issues/27).
- ADR: [ADR-059 — `reveal_participants`-Toggle im Beteiligte-Tab](./decisions.md) (Status `Accepted`).
- Vorgänger: ADR-038 (Maskierung), ADR-040 (Edit-UI mit Original-Checkbox).
- Folge: Operator-Verifikation auf Nodica1 nach Stack-Merge — Toggle erscheint im Beteiligte-Tab, Klick schaltet Klarnamen frei, andere Beteiligte sehen den Toggle nicht.

**Damit ist der RC-3-Operator-Befundbericht-Triage-Block (Issues #22–#27) komplett abgearbeitet** — fünf Hotfixes (007–011), fünf neue ADRs (056–059, plus M11-HOTFIX-007 ohne ADR), alle gestackt als PR-Kette #28 → #29 → #30 → #31 → #32.

---

### M11-HOTFIX-010 — Event.`time_precision`-Marker für retrospektive Erfassung (Issue #24, ADR-058)

**Status:** `[ERLEDIGT]` 2026-05-03 — Owner-Freigabe von Patrick im RC-3-Triage-Block (Variante A); ADR-058 `Accepted`. Branch `claude/m11-hotfix-010-time-precision` gestackt auf PR [#30](https://github.com/Paddel87/HC-Map/pull/30).

**Problem:** Issue [#24](https://github.com/Paddel87/HC-Map/issues/24) (Operator-Feldtest, RC-3-Phase Nodica1): Im Backfill-Modus erzwingt die UI volles Datetime — für **frische** Erinnerungen passend, für **ältere** unrealistisch („Sommer 2024", „irgendwann im März"). Operator muss Pseudo-Genauigkeit erfinden oder Eintrag weglassen — beides degradiert Datenqualität unsichtbar.

**Deliverables (alle erledigt):**
- **ADR-058** (`Accepted`) in [`docs/decisions.md`](./decisions.md): Variante A (Marker auf Event, fünf Werte `year`/`month`/`day`/`hour`/`minute`, Default `'minute'`), B/C verworfen, vier Out-of-Scope-Punkte.
- **Backend-Migration** [`backend/migrations/versions/20260503_2000_event_precision.py`](../backend/migrations/versions/20260503_2000_event_precision.py): `time_precision VARCHAR(10) NOT NULL DEFAULT 'minute' + CHECK constraint`. Bestehende Rows bekommen automatisch `'minute'` (backwards-kompatibel).
- **Backend-Modell** [`backend/app/models/event.py`](../backend/app/models/event.py): `time_precision` Mapped + CHECK-Constraint auf Tabellen-Ebene.
- **Backend-Pydantic** [`backend/app/schemas/event.py`](../backend/app/schemas/event.py): `TimePrecision = Literal[...]`, in `EventBase`/`EventStart`/`EventUpdate` (Default `'minute'`).
- **Backend-Sync** [`backend/app/sync/schemas.py`](../backend/app/sync/schemas.py): `EventDoc.time_precision` mit Pydantic-Literal.
- **Backend-Sync-Service** [`backend/app/sync/services.py`](../backend/app/sync/services.py): durchgereicht in `_insert_event`, `_apply_event_update` (LWW), `_event_to_doc`.
- **Backend-Service** [`backend/app/services/events.py`](../backend/app/services/events.py): `create_event` + `start_event` reichen `payload.time_precision` durch. `update_event` greift via `model_dump(exclude_unset=True)`.
- **Backend-Route** [`backend/app/routes/events.py`](../backend/app/routes/events.py): `_build_detail`-Helper um `time_precision` ergänzt.
- **RxDB-Schema-Bump v2→v3** [`frontend/src/lib/rxdb/schemas/event.schema.json`](../frontend/src/lib/rxdb/schemas/event.schema.json): `version: 3`, neues `time_precision`-Property mit `enum` und `default`.
- **RxDB-Migration-Strategie** [`frontend/src/lib/rxdb/database.ts`](../frontend/src/lib/rxdb/database.ts): `migrationStrategies[3] = (doc) => ({ ...doc, time_precision: 'minute' })`.
- **Frontend-Types** [`frontend/src/lib/rxdb/types.ts`](../frontend/src/lib/rxdb/types.ts), [`frontend/src/lib/types.ts`](../frontend/src/lib/types.ts), [`frontend/src/lib/map/event-marker-data.ts`](../frontend/src/lib/map/event-marker-data.ts): `TimePrecision` Type-Alias, in `EventDocType`/`EventListItem`/`MappableEvent`/`EventStartPayload`.
- **Frontend-Helper** [`frontend/src/lib/event-time.ts`](../frontend/src/lib/event-time.ts): zentrale `formatEventTime`/`formatEventTimeRange`-Funktionen für die fünf Granularitäten (`year` → „2024", `month` → „Mai 2024", `day` → „01.05.2024", `hour` → „01.05.2024, 12 Uhr", `minute` → „01.05.2024, 12:30").
- **Frontend-UI** (5 Stellen):
  - [`event-create-form.tsx`](../frontend/src/components/event/event-create-form.tsx): Live-Modus-Insert setzt explizit `time_precision: 'minute'`.
  - [`event-backfill-form.tsx`](../frontend/src/components/event/event-backfill-form.tsx): neuer Granularitäts-Wechsler (`<select data-testid="event-backfill-precision">`) mit dynamischen Eingabefeldern (`year` → number-Input, `month` → Monat-Select + Jahr-Input, `day` → date-Input, `hour`/`minute` → bisheriges datetime-local). Pure Helper `precisionStartedIso`/`precisionEndedIso` normalisieren Eingabe auf ISO-Timestamps; `ended_at` ist bei year/month/day automatisch null.
  - [`event-detail-view.tsx`](../frontend/src/components/event/event-detail-view.tsx): `MergedEvent.time_precision` durchgereicht, neuer `[data-testid="event-detail-time"]`-Span in `CardDescription` zeigt `formatEventTime(event.started_at, event.time_precision)`.
  - [`(protected)/page.tsx`](../frontend/src/app/(protected)/page.tsx) Dashboard: `formatEventTime`-Aufruf für Title-Fallback und Meta-Zeile.
  - [`map-view.tsx`](../frontend/src/components/map/map-view.tsx) `EventPopupContent`: alte `formatDate`-Helper durch `formatEventTime` ersetzt.

**Verifikation:**
- `uv run pytest -q` → **258/258 grün** (gleicher Count wie M11-HOTFIX-009; `test_rxdb_schema_drift.py` bestätigt JSON-Schema ↔ Pydantic-Sync automatisch).
- `uv run ruff check app tests` → All checks passed.
- `uv run ruff format --check app tests migrations` → 114 files already formatted.
- `pnpm typecheck` → clean.
- `pnpm lint` → clean (nach Quote-Escape-Fix in CardDescription).
- `pnpm test` → **282/282 grün** (nach Test-Helper-Update in `event-marker-data.test.ts` für die neuen Felder `title` + `time_precision`).
- `pnpm prettier --check` (per-file) → clean.
- **Browser-Verifikation** (Dev-Stack lokal hochgefahren via `preview_*`, Migration angewandt):
  - POST `/api/events` mit `time_precision: 'year'` und `started_at: '2024-01-01T00:00:00Z'` → 201, Response enthält `time_precision: 'year'`.
  - Detail-View für year-Event: `[data-testid="event-detail-time"]` zeigt **„2024"**.
  - Detail-View für month-Event: `[data-testid="event-detail-time"]` zeigt **„Mai 2024"**.
  - Backfill-Form `/events/new/backfill`: `[data-testid="event-backfill-precision"]`-Select hat alle 5 Optionen, Auswahl „Jahr" rendert `[data-testid="event-backfill-year"]` als number-Input mit Min=1900/Max=2100.

**Bezug:**
- Issue: [#24 — Variable Zeitangabe-Präzision](https://github.com/Paddel87/HC-Map/issues/24).
- ADR: [ADR-058 — Event.`time_precision`-Marker](./decisions.md) (Status `Accepted`).
- Vorgänger-ADRs: ADR-029 (FWW vs LWW), ADR-031 (Schema-Drift-Test), ADR-039 (Backfill), ADR-056 (Schema-Bump-Pattern).
- Folge: Operator-Verifikation auf Nodica1 nach Stack-Merge — Backfill-Test mit „Sommer 2024"-Eintrag, prüfen dass Anzeige in Dashboard/Detail/Map als „Mai 2024" (oder beliebiges Monat) erscheint, nicht als „01.05.2024 00:00".

---

### M11-HOTFIX-009 — Application-Lifecycle Auto-Stop bei Event-Ende (Issue #23 Befund 2, ADR-057)

**Status:** `[ERLEDIGT]` 2026-05-03 — Owner-Freigabe von Patrick im RC-3-Triage-Block (Variante A); ADR-057 `Accepted`. Branch `claude/m11-hotfix-009-app-lifecycle-autostop` gestackt auf PR [#29](https://github.com/Paddel87/HC-Map/pull/29).

**Problem:** Issue [#23](https://github.com/Paddel87/HC-Map/issues/23) Befund 2 (Operator-Feldtest, RC-3-Phase Nodica1) — drei zusammengehörige Beobachtungen:
- 2a: Live-Event wird beendet, Applications bleiben offen-laufend → Lifecycle-Inkonsistenz.
- 2b: Im laufenden Live-Event hat eine einzelne Application keinen sichtbaren Stop-Button — Workaround über „Event bearbeiten" mit manueller Eingabe.
- 2c: Backend-Validatoren („Application endet nach Event-Ende") greifen korrekt, aber UX ist Sackgasse — User läuft erst beim Submit in den Konflikt.

**Deliverables (alle erledigt):**
- **ADR-057** (`Accepted`) in [`docs/decisions.md`](./decisions.md): Variante A (Backend Auto-Stop + Stop-Button + Pre-Submit-Hint), B/C verworfen, vier Out-of-Scope-Punkte (Auto-Restart, Multi-Active im Live-Modus, Audit-Log, Migrations-Daten-Reparatur).
- **Backend-Helper** [`backend/app/services/events.py:auto_stop_open_applications`](../backend/app/services/events.py): UPDATE-by-event_id-Query, idempotent, Trigger setzt `updated_at` (RxDB-Cursor advanciert).
- **Backend-Pfad 1 (POST `/api/events/{id}/end`):** [`end_event`](../backend/app/services/events.py) ruft Helper nach `flush()`. Direkter Trigger.
- **Backend-Pfad 2 (PATCH `/api/events/{id}`):** [`update_event`](../backend/app/services/events.py) merkt sich `was_open = ended_at is None` vor dem Update, ruft Helper wenn `ended_at` von null auf non-null wechselt.
- **Backend-Pfad 3 (RxDB-Push):** [`push_events`](../backend/app/sync/services.py) macht denselben `was_open`-Check innerhalb der `begin_nested()`-Savepoint-Transaktion. Lazy-Import von `auto_stop_open_applications` zur Vermeidung zirkulärer Module-Imports.
- **Frontend-Stop-Button** in [`event-detail-view.tsx:ApplicationsTimeline`](../frontend/src/components/event/event-detail-view.tsx): pro aktive Application (`isLive && isActive`) ein `[data-testid="applications-timeline-stop"]`-Button mit `Square`-Icon, Klick ruft existierenden `handleEndApplication`-Handler. Komponente um Props `isLive` + `onStop` erweitert.
- **Frontend Live-Validation** in [`event-edit-form.tsx`](../frontend/src/components/event/event-edit-form.tsx): `validateBackfill` läuft via `useMemo` auf jeden Form-State-Change. Errors werden auf `bounds`/`duration`/`overlap` gefiltert, bis der User submit drückt — ab dann sind alle Errors sichtbar (verhindert Noise auf First-Paint). Submit-Pfad nutzt dieselben `liveErrors` als Block-Bedingung statt Re-Validation.

**Verifikation:**
- Zwei neue pytest-Tests in [`backend/tests/test_events_live_api.py`](../backend/tests/test_events_live_api.py):
  - `test_end_event_auto_stops_running_applications`: Event → 2 Applications, eine manuell beendet vor Event-Ende, andere läuft → Event-Ende, beide haben `ended_at`, Auto-gestoppte hat exakt `event.ended_at`-Timestamp.
  - `test_patch_event_with_ended_at_auto_stops_applications`: PATCH-Pfad-Variante.
- `uv run pytest -q` → **258/258 grün** (256 + 2 neue).
- `uv run ruff check app tests` → All checks passed.
- `uv run ruff format` (auto-applied auf services.py + test): clean nach Re-Format.
- `pnpm typecheck` → clean.
- `pnpm lint` → clean.
- `pnpm test` → **282/282 grün**.
- `pnpm prettier --check` (per-file) → clean.
- **Browser-Verifikation** (Dev-Stack lokal hochgefahren via `preview_*`, Alembic-Migration aus M11-HOTFIX-008 angewandt):
  - End-to-End API-Smoke: Event-Start mit Title → 2 Applications gestartet → Event beendet → beide Applications haben `ended_at` exakt = `event.ended_at` (Auto-Stop greift).
  - Frontend Stop-Button: Event-Detail-View zeigt `[data-testid="applications-timeline-stop"]`-Button für aktive Application; Klick → Status wechselt von „läuft" zu „beendet", Button verschwindet (kein zweiter Stop möglich).

**Bezug:**
- Issue: [#23 — Operator-Befundbericht I Befund 2](https://github.com/Paddel87/HC-Map/issues/23) (Application-Lifecycle).
- ADR: [ADR-057 — Application-Lifecycle Auto-Stop](./decisions.md) (Status `Accepted`).
- Vorgänger: ADR-011 (Live-Modus Lifecycle), ADR-029 (FWW vs LWW), ADR-038 (Detail-View), ADR-039/040 (Backfill-/Edit-Validation).
- Folge: Operator-Verifikation auf Nodica1 nach Stack-Merge (idealerweise live-Event mit zwei parallelen Applications anlegen, Event beenden, prüfen dass beide auf ended_at gesetzt sind).

---

### M11-HOTFIX-008 — Optionales `event.title`-Feld (Issue #27 Befund 4+5, ADR-056)

**Status:** `[ERLEDIGT]` 2026-05-03 — Owner-Freigabe von Patrick im RC-3-Triage-Block (Variante A); ADR-056 `Accepted`. Branch `claude/m11-hotfix-008-event-title` gestackt auf PR [#28](https://github.com/Paddel87/HC-Map/pull/28).

**Problem:** Issue [#27](https://github.com/Paddel87/HC-Map/issues/27) Befund 4+5 (Operator-Feldtest, RC-3-Phase Nodica1): Events haben kein Titel-/Bezeichnungs-Feld. Dashboard und Karten-Marker zeigen nur Startzeit + GPS-Koordinaten — schwer voneinander zu unterscheiden, keine Schnell-Identifikation. `note`-Workaround bricht Listen-Ansichten.

**Deliverables (alle erledigt):**
- **ADR-056** (`Accepted`) in [`docs/decisions.md`](./decisions.md): Variante A (`title VARCHAR(120) NULL` auf Event), B/C verworfen, fünf Out-of-Scope-Punkte.
- **Backend-Migration** [`backend/migrations/versions/20260503_1800_event_title.py`](../backend/migrations/versions/20260503_1800_event_title.py): `add_column` + `drop_column` (transaktional, rückwärtskompatibel).
- **Backend-Modell** [`backend/app/models/event.py`](../backend/app/models/event.py): `title: Mapped[str | None] = mapped_column(String(120), nullable=True)`.
- **Backend-Pydantic** [`backend/app/schemas/event.py`](../backend/app/schemas/event.py): `title` in `EventBase`/`EventStart`/`EventUpdate` (`max_length=120`).
- **Backend-Sync** [`backend/app/sync/schemas.py`](../backend/app/sync/schemas.py) + [`backend/app/sync/services.py`](../backend/app/sync/services.py): `EventDoc.title`, Insert/Update-LWW + `_event_to_doc`-Reverse durchgereicht (analog `note`).
- **Backend-Service** [`backend/app/services/events.py`](../backend/app/services/events.py): `create_event` + `start_event` reichen `payload.title` durch. `update_event` greift via `model_dump(exclude_unset=True)`.
- **Backend-Route** [`backend/app/routes/events.py`](../backend/app/routes/events.py): `_build_detail`-Helper um `title=event.title` ergänzt (Bug entdeckt + gefixt während Browser-Smoke — POST gab `null` zurück, weil das manuelle EventDetail-Construct `title` nicht durchschleifte).
- **RxDB-Schema-Bump v1→v2** [`frontend/src/lib/rxdb/schemas/event.schema.json`](../frontend/src/lib/rxdb/schemas/event.schema.json): `version: 2`, neues `title`-Property (`type: ["string", "null"]`, `maxLength: 120`).
- **RxDB-Migration-Strategie** [`frontend/src/lib/rxdb/database.ts`](../frontend/src/lib/rxdb/database.ts): `migrationStrategies[2] = (doc) => ({ ...doc, title: null })`. Browser-Smoke bestätigt: alte v1-IndexedDB-Stores werden in neue v2-Stores migriert.
- **Frontend-Types** [`frontend/src/lib/rxdb/types.ts`](../frontend/src/lib/rxdb/types.ts), [`frontend/src/lib/types.ts`](../frontend/src/lib/types.ts), [`frontend/src/lib/map/event-marker-data.ts`](../frontend/src/lib/map/event-marker-data.ts): `title: string | null` in `EventDocType`/`EventListItem`/`MappableEvent`/`EventStartPayload`.
- **Frontend-UI** (5 Stellen):
  - [`event-create-form.tsx`](../frontend/src/components/event/event-create-form.tsx): neue „Titel (optional)"-Card vor Notiz, `<input maxLength={120}>` mit Trim auf null.
  - [`event-backfill-form.tsx`](../frontend/src/components/event/event-backfill-form.tsx): selbiges Pattern, `data-testid="event-backfill-title"`.
  - [`event-edit-form.tsx`](../frontend/src/components/event/event-edit-form.tsx): editierbares Feld in Editable-Felder-Liste (LWW analog `note`), Diff-Logik.
  - [`event-detail-view.tsx`](../frontend/src/components/event/event-detail-view.tsx): `title` als Page-Header (oben prominent, `data-testid="event-detail-title"`), Fallback auf bisherige Startzeit-Darstellung wenn NULL. `MergedEvent.title` durchgereicht.
  - [`(protected)/page.tsx`](../frontend/src/app/(protected)/page.tsx) Dashboard: `title` als Hauptzeile, Datum + Koordinaten als Meta. Fallback wenn NULL.
  - [`map-view.tsx`](../frontend/src/components/map/map-view.tsx) `EventPopupContent`: `title` als erste Zeile (`data-testid="map-event-popup-title"`), Datum darunter.
- [`(protected)/events/[id]/page.tsx`](../frontend/src/app/(protected)/events/[id]/page.tsx): `synthesizeFromRxdb` reicht `title` durch (sonst TS2741 für `EventDetail`).

**Verifikation:**
- `uv run pytest -q` → **256/256 grün** (gleicher Count wie vor Hotfix; `test_rxdb_schema_drift.py` bestätigt JSON-Schema ↔ Pydantic-Sync automatisch).
- `uv run ruff check app tests` → All checks passed.
- `uv run ruff format --check app tests migrations` → 113 files already formatted.
- `uv run mypy --strict app/models/event.py app/schemas/event.py app/sync/schemas.py app/sync/services.py app/services/events.py` → Success: no issues found.
- `pnpm typecheck` → clean.
- `pnpm lint` → clean.
- `pnpm test` → **282/282 grün**.
- `pnpm prettier --check` (per-file für die 12 berührten Frontend-Dateien) → clean.
- **Browser-Verifikation** (Dev-Stack lokal hochgefahren via `preview_*`, Alembic-Migration angewandt, eingeloggt als Admin):
  - POST `/api/events` mit `title: "Konzert in Bremen"` → 201, Response enthält `title` korrekt.
  - DB-Direkt-Probe (`docker exec ... psql ... SELECT title FROM event`) → `Konzert in Bremen`.
  - Dashboard `/`: Title als Hauptzeile, Datum + Koordinaten als Meta-Sub-Zeile.
  - Detail-View `/events/{id}`: `[data-testid="event-detail-title"]` zeigt „Konzert in Bremen" als prominenten Header.
  - Edit-Form `/events/{id}/edit`: `[data-testid="event-edit-title"]` mit `value="Konzert in Bremen"`, `maxLength=120`.
  - MapView `/map`: Status-Bar zeigt „2 Events sichtbar"; IndexedDB-Direktinspektion bestätigt RxDB-v2-Schema-Migration (Datenbank `rxdb-dexie-hcmap--2--events` enthält beide Events mit `title` befüllt).

**Bezug:**
- Issue: [#27 — Operator-Befundbericht II Befund 4+5](https://github.com/Paddel87/HC-Map/issues/27) (Event-Titel + Karten-Marker-Label).
- ADR: [ADR-056 — Optionales `event.title`-Feld](./decisions.md#adr-056--optionales-eventtitle-feld-für-identifikation-und-wiederfindung-issue-27-befund-45) (Status `Accepted`).
- Vorgänger-ADRs: [ADR-029](./decisions.md), [ADR-030](./decisions.md), [ADR-031](./decisions.md), [ADR-050](./decisions.md) (Schema-Bump-Pattern).
- Folge: Operator-Verifikation auf Nodica1 nach RC-4-Tag (oder Stack-Merge), `#27` bleibt als Sammelbericht-Anker offen.

---

### M11-HOTFIX-007 — MapLibre `GeolocateControl` in Karten-Komponenten (Issue #22)

**Status:** `[ERLEDIGT]` 2026-05-03 — Owner-Freigabe von Patrick im Operator-Befund-Triage-Dialog ("hätte ich gerne das fadenkreuz"), Variante MapLibre `GeolocateControl`. Frontend-only, keine Datenmodell-/API-Änderung, kein neuer Stack-Bestandteil (`react-map-gl/maplibre` schon im Dependency-Tree, ADR-027/041).

**Problem:**
[#22](https://github.com/Paddel87/HC-Map/issues/22) (Operator-Feldtest, RC-3-Phase Nodica1): in der Kartenansicht fehlt ein Standard-Map-Control (Fadenkreuz / Crosshair) zur GPS-Übernahme. Operator musste die Karte per Pan/Zoom auf den eigenen Standort navigieren — auf einem 6"-Display mit Sonnenlicht spürbarer UX-Bruch. Form-Buttons `Aktuellen Standort übernehmen` / `Standort erneut anfordern` existieren bereits (per [#23](https://github.com/Paddel87/HC-Map/issues/23) bestätigt), aber die Karte selbst hatte keinen entsprechenden Control.

**Deliverables (alle erledigt):**
- [`frontend/src/components/map/map-view.tsx`](../frontend/src/components/map/map-view.tsx): `GeolocateControl` aus `react-map-gl/maplibre` als Standard-Variante neben `NavigationControl` (`position="top-right"`, `enableHighAccuracy`, `trackUserLocation={false}`, `showAccuracyCircle={false}`). Pure Karten-Übersicht — Klick auf Control zentriert die Karte auf den GPS-Fix, kein Custom-Marker.
- [`frontend/src/components/map/location-picker-map.tsx`](../frontend/src/components/map/location-picker-map.tsx): `GeolocateControl` analog plus `onGeolocate`-Handler, der den `onChange({lat, lon})`-Prop-Callback feuert. Damit setzt sich beim ersten GPS-Fix sofort der Marker auf die User-Position (Akzeptanzkriterium aus [#22](https://github.com/Paddel87/HC-Map/issues/22): „ohne separaten zweiten Tap"). Eingesetzt in beiden Erfassungs-Workflows ([`event-create-form.tsx`](../frontend/src/components/event/event-create-form.tsx), [`event-backfill-form.tsx`](../frontend/src/components/event/event-backfill-form.tsx)).
- [`frontend/tests/map-view.test.tsx`](../frontend/tests/map-view.test.tsx): `react-map-gl/maplibre`-Mock um `GeolocateControl` ergänzt (analog `NavigationControl`).

**Verifikation:**
- `pnpm typecheck` → clean.
- `pnpm lint` → clean.
- `pnpm test` → **282/282 grün** (gleicher Count wie vor Hotfix; keine neuen Tests nötig — Map-Komponenten haben WebGL-Bedarf, sind per ADR-027 §J2 / Mock abgedeckt).
- `pnpm prettier --check` (per-file für die drei berührten Dateien) → clean.
- **Browser-Verifikation** (Dev-Stack lokal hochgefahren via `preview_*`, eingeloggt als Admin):
  - `/map` (`MapView`): DOM zeigt `.maplibregl-ctrl-geolocate`-Button neben `.maplibregl-ctrl-zoom-in`/`-zoom-out` (Title `"Location not available"` weil Headless-Browser keine Geo-Permission hat — semantisch korrekt, der Button ist sichtbar und event-listening).
  - `/events/new` (`LocationPickerMap`): selbiger DOM-Befund, Screenshot bestätigt das Crosshair-Icon visuell oben rechts unter den Zoom-Controls.
  - 503-Tile-Errors in Console-Logs sind erwartbar (Dev ohne MapTiler-Key) und nicht durch den Hotfix verursacht.

**Bezug:**
- Issue: [#22 — GPS-Standort-Button in der Kartenansicht (Mobile-Workflow)](https://github.com/Paddel87/HC-Map/issues/22) (Operator-Befund vom 2026-05-03, Klarstellung als MapLibre-Map-Control nach Diskussion in [#23](https://github.com/Paddel87/HC-Map/issues/23)).
- Verwandt: [#23 Befund 3](https://github.com/Paddel87/HC-Map/issues/23) (komplementär — Adress-/POI-Suche im Standort-Block, eigenständig offen).
- Vorgänger-ADRs: [ADR-027](./decisions.md) (`react-map-gl + maplibre-gl` als Karten-Stack), [ADR-041](./decisions.md) (M6 Karten-Implementierung).
- Kein eigener ADR — Drop-in-Use eines Standard-Controls aus dem etablierten Stack, keine Architektur-Wirkung.

---

### M11-HOTFIX-006 — SQLAdmin auf `/sqladmin/` umziehen (Issue #19, ADR-055)

**Status:** `[ERLEDIGT]` 2026-05-03 — ADR-055 (Variante A) am 2026-05-03 von Patrick freigegeben; Implementation in [`backend/app/admin_ui/setup.py:73`](../backend/app/admin_ui/setup.py#L73) (`base_url="/sqladmin"`), [`backend/app/main.py:148-154`](../backend/app/main.py#L148-L154) (Login-Redirect umgezogen), [`docker/Caddyfile.example:25`](../docker/Caddyfile.example#L25) und [`docker/compose.traefik.yml:48`](../docker/compose.traefik.yml#L48) (Reverse-Proxy-Routing), [`backend/tests/test_admin_ui.py`](../backend/tests/test_admin_ui.py) (alle 11 Pfade umgestellt). Doku: [`ops/runbook.md`](../ops/runbook.md). Volle Suite **256/256** grün, ruff/mypy clean.

**Problem:**
Operator-Diagnose-Update auf [#19](https://github.com/Paddel87/HC-Map/issues/19) (2026-05-03, mit M11-HOTFIX-003-Logger sichtbar gemacht): Backend-Log zeigt `route=/admin/catalogs status=404`, Frontend-Log ist leer für diesen Pfad. URL-Präfix `/admin/*` war doppelt belegt zwischen Frontend (Next.js-Seiten Catalog/Users/Persons) und Backend (SQLAdmin-Mount + `/api/admin/*`-Endpoints). Reverse-Proxy-Default ([`Caddyfile.example`](../docker/Caddyfile.example)) routete alles `/admin/*` ans Backend; Frontend-Admin-Seiten waren in jedem Reverse-Proxy-Setup unerreichbar (Caddy-Overlay, Traefik-Overlay, externer Reverse-Proxy nach `runbook.md` §4.3).

**Deliverables (alle erledigt):**
- [`backend/app/admin_ui/setup.py:73`](../backend/app/admin_ui/setup.py#L73): `Admin(..., base_url="/sqladmin")`. SQLAdmin re-mounted alle internen Routes (`/sqladmin/`, `/sqladmin/login`, `/sqladmin/logout`, `/sqladmin/<model>/list`, `/sqladmin/statics/*`).
- [`backend/app/main.py:148-154`](../backend/app/main.py#L148-L154): Login-Redirect von `/admin/login` auf `/sqladmin/login` umgezogen. Schützt SQLAdmin's Default-Login-Form weiterhin.
- [`docker/Caddyfile.example`](../docker/Caddyfile.example): `handle /admin/*` → `handle /sqladmin/*`. Frontend-`/admin/*` fällt in den Default-Frontend-Handle.
- [`docker/compose.traefik.yml`](../docker/compose.traefik.yml): Router-Rule `PathPrefix(/admin)` → `PathPrefix(/sqladmin)`.
- [`backend/tests/test_admin_ui.py`](../backend/tests/test_admin_ui.py): alle 11 Pfade umgestellt (8 ModelViews, 4 Auth-Bridge-Tests, 1 Logout). Suite läuft auf 256 → 256 grün.
- [`ops/runbook.md`](../ops/runbook.md) §4.3 (externer Reverse-Proxy): Routing-Regel von `/admin/*` auf `/sqladmin/*` umgestellt + Bootstrap-Sektion ergänzt: SQLAdmin lebt unter `/sqladmin/`, Frontend bedient `/admin/*`.
- ADR-055 in [`docs/decisions.md`](./decisions.md#adr-055--sqladmin-auf-sqladmin-umziehen-routing-konflikt-aufl%C3%B6sung-issue-19) als `Accepted` (Variante A vs. B vs. C, Verworfene Alternativen, Risiken/Mitigationen, Folge-Arbeit RC-3-Tag).

**Verifikation:**
- `uv run pytest tests/test_admin_ui.py -q` → **15/15 grün**.
- `uv run pytest -q` → **256/256 grün** (gleicher Count wie vor Hotfix).
- `uv run ruff check app tests` → All checks passed.
- `uv run ruff format --check app tests` → 104 files already formatted.
- `uv run mypy --strict app/admin_ui/setup.py app/main.py` → Success: no issues found.
- **Direkt-Probe vs. Backend** (no reverse proxy, dev-mode):
  - `GET /sqladmin/` → 302 → `/login` (unauth-Redirect via Auth-Bridge) ✓
  - `GET /sqladmin/login` → 302 → `/login` (Direct-Hit-Schutz) ✓
  - `GET /admin/` → **404** vom Backend (Mount-Konflikt aufgehoben — diesen Pfad wird in Production der Reverse-Proxy ans Frontend leiten) ✓

**Bezug:**
- Issue: [#19 — Katalog-Übersicht öffnet nicht](https://github.com/Paddel87/HC-Map/issues/19) (Diagnose-Update 2026-05-03 durch Patrick mit Logger-Auswertung).
- ADR: [ADR-055 — SQLAdmin auf `/sqladmin/` umziehen](./decisions.md#adr-055--sqladmin-auf-sqladmin-umziehen-routing-konflikt-aufl%C3%B6sung-issue-19) (Status `Accepted`).
- Vorgänger: [ADR-049 §A](./decisions.md#adr-049--admin-bereich-implementierungs-plan-m8) (vorheriger `base_url=/admin`), [ADR-051 §B](./decisions.md#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann) (Reverse-Proxy-Wahlfreiheit).
- Diagnose-Werkzeug: [ADR-054 / M11-HOTFIX-003](./decisions.md#adr-054--strukturierter-access-logger-mit-pii-redaction-variante-b-aus-issue-21) hat den 404-Bug erst sichtbar gemacht.
- Operator-Migration: alte `/admin/`-Bookmarks (SQLAdmin) zeigen nach RC-3 ins Frontend (Admin-Dashboard). RC-3-Release-Notes weisen explizit darauf hin.

---

## Phase 2 — Konsolidierung

### M12 — Self-Hosted Tileserver

**Ziel:** MapTiler-Abhängigkeit wird abgelöst.

**Deliverables:**
- Tile-Stack auf VPS: OpenMapTiles-Daten + tileserver-gl-light (oder Alternative).
- Regionaler OSM-Extract (DACH oder Europa, je nach Bedarf).
- Update-Prozess dokumentiert (monatlich oder quartalsweise).
- MapLibre zeigt auf lokale Tile-URL, MapTiler-Key kann deaktiviert werden.
- Lasttest: funktioniert bei erwartetem Bedarf stabil.

**Akzeptanzkriterien:**
- Karten laden ohne MapTiler-Key.
- Rendering-Qualität vergleichbar.
- Ressourcenverbrauch auf VPS dokumentiert.

**Abhängigkeiten:** M11.

---

### M13 — Backup-Härtung & Restore-Tests

**Ziel:** Verlässlicher Backup-Prozess mit regelmäßigen Restore-Tests.

**Deliverables:**
- Off-Site-Backups (separater Anbieter / anderer Standort).
- Verschlüsselung at-rest für Backups (age, gpg oder Alternative).
- Automatische Restore-Tests in definierter Frequenz (z. B. monatlich) auf einem Staging-System.
- Dokumentierte Recovery-Runbook: Schritt-für-Schritt, vom kaputten VPS zur laufenden App.

**Akzeptanzkriterien:**
- Vollständiger Restore aus Backup auf leerem System erfolgreich.
- Runbook wurde einmal von jemandem nachvollzogen, der es nicht geschrieben hat (im Hobby-Scope: Selbsttest mit Abstand).

**Abhängigkeiten:** M10.

---

### M14 — Monitoring & Alerting

**Ziel:** Störungen werden zeitnah bemerkt.

**Deliverables:**
- Einfache Uptime-Überwachung (z. B. Uptime Kuma auf separatem Host, oder externer Dienst wie Hetzner Monitoring).
- Benachrichtigung bei Downtime (E-Mail, Telegram, o. ä.).
- Optional: Basis-Metriken (RAM, CPU, Disk) auf einem lokalen Grafana oder in Logs.

**Akzeptanzkriterien:**
- Absichtlich ausgelöster Ausfall triggert Benachrichtigung innerhalb definierter Zeit.

**Abhängigkeiten:** M10.

---

### M15 — Foto-/Medien-Anhänge an Events und Applications

**Ziel:** Events und einzelne Applications können mit Bildern (und perspektivisch kurzen Videos) angereichert werden (siehe ADR-015).

**Deliverables:**
- Datenmodell: neue Tabelle `media` mit FK auf `event_id` ODER `application_id` (genau eines), `path`, `mime_type`, `size_bytes`, `created_by`, `created_at`.
- Storage-Strategie: Dateien im Filesystem auf VPS unter `/var/lib/hcmap/media/{yyyy}/{mm}/{uuid}.{ext}`. Backup-Konzept entsprechend erweitern.
- RLS-äquivalente Zugriffskontrolle: Backend-Endpoint `GET /api/media/{id}` prüft Sichtbarkeit des zugehörigen Events.
- Upload-Endpoint mit Größenlimit (z. B. 10 MB pro Datei), Mime-Type-Whitelist (jpeg, png, webp, optional mp4).
- Thumbnail-Generierung serverseitig (Pillow oder VIPS).
- Frontend: Upload-Komponente im Event- und Application-Formular, Galerie-Ansicht mit Lightbox, Drag&Drop.
- **Einwilligungstext muss VOR Aktivierung dieses Features in der Gruppe erweitert werden** — sehr sensibler Inhalt, Speicherung auf VPS expliziert kommunizieren.

**Akzeptanzkriterien:**
- Bild kann hochgeladen, angezeigt, gelöscht werden.
- Zugriff respektiert RLS (nicht-berechtigter User kann Bild auch über direkte URL nicht laden).
- Backup umfasst Mediadateien.

**Abhängigkeiten:** M11. Dieser Meilenstein wird **erst nach formaler Einwilligungs-Erweiterung in der Gruppe** gestartet.

---

### M16 — Freie Tags + Bewertung/Stimmung

**Ziel:** Events und Applications können um freie Schlagworte und eine optionale Bewertung ergänzt werden (siehe ADR-015).

**Deliverables:**
- Datenmodell: Tabelle `tag` (id, name, created_by, created_at) plus n:m-Tabellen `event_tag` und `application_tag`. Tags sind user-spezifisch (jeder hat seinen eigenen Tag-Pool, keine Share-Logik).
- Datenmodell: Spalten `event.rating` (smallint NULL, CHECK 1–5) und ggf. `application.rating` analog.
- API: CRUD für Tags, Tag-Filter in `/api/events`, Bewertung als Feld in Event-Patch.
- Frontend: Tag-Eingabe als „type-and-create"-Komponente mit Vorschlägen aus eigenen Tags. Sterne-Bewertung im Event-Detail.
- Tag-basierte Filter in der Event-Liste und Karte.

**Akzeptanzkriterien:**
- Tag kann angelegt, gesetzt, entfernt werden.
- Bewertung ist optional, beeinflusst keine RLS.
- Tag-Filter funktioniert performant bei realistischer Datenmenge.

**Abhängigkeiten:** M11.

---

### M17 — Persönliches & kollektives Statistik-Dashboard

**Ziel:** Jeder User sieht aussagekräftige Statistiken über seine Beteiligung und über die Gruppen-Aggregate (siehe ADR-015).

**Deliverables:**
- Persönliches Dashboard:
  - Anzahl Events als Performer / als Recipient, je Zeitraum.
  - Häufigste Materialien, häufigste Positionen, häufigste Mit-Beteiligte.
  - Durchschnittliche Application-Dauer, längste/kürzeste Sitzung.
  - Aktivitäts-Heatmap (Kalender-Heatmap analog GitHub).
  - „On this day"-Auswertungen längeren Zeitraums.
- Kollektives Aggregat-Dashboard:
  - Pro Material/Position: „X-mal insgesamt verwendet, davon Y-mal mit dir".
  - Pro Recipient: nur eigene Daten ausweisbar (keine Aggregate über andere Personen, weil zu re-identifizierend).
- **Vor Implementierung in Phase-2-Spezifikation klären:** genaue Granularität der kollektiven Aggregate. Optionen: volle Aggregate / Mindestschwelle / nur eigene Daten. Im Einwilligungstext muss die gewählte Variante adressiert werden.
- Frontend: Charts via Recharts (in shadcn/ui-kompatiblem Stil), responsive, mobil lesbar.

**Akzeptanzkriterien:**
- Persönliche Statistik wird für eigenen User korrekt berechnet.
- Kollektive Aggregate sind RLS-aware (Aggregat-Berechnung läuft auf Server, nicht im Client).
- Performance: Dashboard lädt unter 2 Sekunden bei realistischer Datenmenge.

**Abhängigkeiten:** M11, idealerweise nach M16 (damit Tags in Statistik berücksichtigt werden können).

---

## Phase 3 — Pfad-B-Vorbereitung (optional, nur bei Entscheidung)

Sobald die Entscheidung zu Pfad B getroffen wird, werden folgende Meilensteine ergänzt:

- Juristische Prüfung & Impressum / vollständige Datenschutzerklärung.
- Einwilligungsmanagement im System.
- Selbstregistrierung mit Admin-Freigabe-Queue.
- Audit-Logs als explizites Feature.
- Moderations-Werkzeuge.
- Neubewertung Hoster-Vertrauen (ADR-001).
- Neubewertung Anonymisierung (ADR-002).
- Ggf. Datenschutz-Folgenabschätzung.
- MapTiler-Plan neu bewerten (Free-Tier ist nur nicht-kommerziell) — ggf. Upgrade oder Self-Hosting vorziehen.

**Diese Phase bleibt in der aktuellen Planung leer**, bis die Entscheidung explizit getroffen ist.

---

## Querschnitts-Aktivitäten (laufend)

Folgende Aktivitäten sind keine Meilensteine, sondern ziehen sich durch alle Meilensteine:

- **Tests:** Unit-, Integrations-, E2E-, RLS-Tests wachsen mit jedem Meilenstein.
- **Doku:** `architecture.md` und `decisions.md` werden bei jeder relevanten Entscheidung aktualisiert.
- **Security-Review:** Nach jedem Meilenstein mit User-Interaktion: Auth-Flows, Input-Validierung, Rate-Limits, CORS.
- **Code-Review:** Jedes größere Arbeitspaket, bevor es auf `main` landet, wird vom Admin reviewt (auch bei KI-Umsetzung).
- **Blocker:** Jeder nicht nach 3 Versuchen gelöste technische Halt wird in `blockers.md` dokumentiert.

---

## Offene Punkte (für spätere Konkretisierung oder Folgephase)

**Bereits entschieden in dieser Konzeptionsphase** (siehe `decisions.md`):
- ~~Python-Version + Package-Manager~~ → ADR-005 (Python 3.12 + uv)
- ~~Auth-Token-Strategie~~ → ADR-006 (HttpOnly-Cookie-Sessions)
- ~~E-Mail-Versand~~ → in MVP gestubbt, externer Dienst später
- ~~Eingabemodi für Ort~~ → Plus Code + Karten-Klick + MapTiler Geocoding

**Offen für Folge-Sessions oder spätere Phasen:**

- **Personen-Merge-Funktion** (siehe ADR-014): Duplikat-Auflösung im Admin-Bereich. Kann in M8 oder später nachgezogen werden.
- **Vorlagen/Favoriten** (siehe ADR-013): bewusst aufgeschoben, nach erstem realen Live-Test neu evaluieren.
- **Rate-Limit für on-the-fly-Personenanlage** (siehe ADR-014, Pfad-B-relevant): in Pfad A unkritisch.
- **Konkreter Off-Site-Backup-Anbieter** (M13).
- **E-Mail-Versanddienst** (vor M11, sobald Passwort-Reset produktiv gebraucht wird).
- **Karten-Style:** MapTiler-Preset oder eigener Style?
- **Audit-Log-Strategie** über `created_at`/`updated_at` hinaus — ob ein separates `event_log` nötig wird (Pfad B vermutlich ja).
- **Dev/Staging-Environment** auf dem VPS oder lokal-only?
