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

## ADR-003 — RxDB-Schema-Migration für Welle 1+2 Schema-Drift

- **Status:** Accepted
- **Datum:** 2026-05-05
- **Berührt:** §4.4 Datenmodell (Client-seitige RxDB-Schema-Versionierung)

### Kontext

Welle 1 (ADR-001) hat die Felder `arm_position_id`, `hand_position_id`, `hand_orientation_id` aus dem Application-Wire-Format entfernt; Welle 2 (ADR-002) hat `restraint_type_ids` → `equipment_item_ids` umbenannt. Beide Wellen haben die Backend-Pydantic-Schemas und das Frontend-TypeScript konsistent aktualisiert, aber das RxDB-`application.schema.json` blieb auf `version: 1` mit modifiziertem Property-Set. RxDB berechnet beim Open einer Collection den SHA-256 des Schemas und vergleicht ihn mit dem Hash, den die letzte Initialisierung im IndexedDB-Metadata-Bereich abgelegt hat. Bei Mismatch ohne registrierte Migrationsstrategie wirft RxDB `RxError DB6` und die Collection ist unbrauchbar — exakt das im Issue [#6](https://github.com/Paddel87/Plus-Map/issues/6) Finding A reproduzierte Verhalten.

Phase 0 hat keine produktiven Klienten, aber der Eigentümer-Browser (sowie der eines jeden Testers, der Welle 0/1/2 lokal genutzt hat) trägt Pre-Welle-1-State und scheitert beim Open. Ohne Migrationspfad bleibt nur ein manueller IndexedDB-Drop — das ist ein Wartungs-Footgun, sobald M3 (Demo-Daten-Seed) externe Tester einbezieht.

### Entscheidung

**Schema-Version-Bump** mit additiver Migrationsstrategie:

- `application.schema.json`: `version: 1` → `version: 2`. Property-Set unverändert (bleibt: `equipment_item_ids` als einzige Listen-Spalte).
- In [database.ts](frontend/src/lib/rxdb/database.ts) `addCollections.applications.migrationStrategies` wird ein Step `2` ergänzt:
  - Entfernt `arm_position_id`, `hand_position_id`, `hand_orientation_id`, `restraint_type_ids` aus dem Doc-Body, falls vorhanden (verbleibender Welle-0-State).
  - Setzt `equipment_item_ids = []` falls absent (Sicherheitsgurt — sollte durch v0→v1 bereits erledigt sein).
- Bestehender v0→v1 Step bleibt unverändert (für noch ältere Klienten).
- Die Migration ist datenverlust-tolerant: Welle-0/1-State enthält in den Drop-Feldern Lookup-IDs, die in der Welle-2-Domäne semantisch leer sind (kein Mapping zwischen Restraint-Werten und Outdoor-Equipment). Das ist konsistent mit der Backend-Migration `20260505_1300_equipment_rename`, die alle ENUM-Werte auf `'other'` cast.

**Vorgehensregel ab jetzt:** Jede Schema-Änderung in `frontend/src/lib/rxdb/schemas/*.schema.json` bumpt `version` und ergänzt die zugehörige Migrationsstrategie. Schema-Edits ohne Version-Bump sind als Bug zu behandeln.

### Konsequenzen

**Akzeptiert:**

- RxDB-Hash der `applications`-Collection ändert sich (neue version, gleiches Property-Set hat anderen Hash). Das ist gewollt.
- Backend-Test `tests/test_rxdb_schema_drift.py` muss die neue Version akzeptieren — das ist ein Schema-Bump-Test, kein Wire-Format-Test, also Aktualisierung der erwarteten Version.
- Migrationsstrategie ist Phase-0-tauglich (kleines Datenvolumen, kein Concurrent-Write). Für spätere Phasen (≥ M5) sollte die Migrationsplattform um Backfill-Tests ergänzt werden — out of scope hier.

**Vorteil:**

- `/admin` und alle anderen RxDB-nutzenden Seiten öffnen die Collection auch in Browsern mit Welle-0/1-State. Kein manueller IndexedDB-Drop mehr nötig.
- Vorgehensregel etabliert Disziplin für künftige Schema-Änderungen, sodass Welle 3+ nicht erneut zur stillen Drift wird.

**Out of Scope:**

- Backwärts-Replay über mehrere Schema-Versionen wird nicht getestet (nur v0→v1 und v1→v2 separat). Phase 0 hat keinen Operator, der weiter zurückrollen müsste.
- Event-/Event-Participant-Schemas sind unverändert; deren Versionsketten (Event v3, EventParticipant v0) bleiben.

### Verbindung

- Quelle: Issue [#6](https://github.com/Paddel87/Plus-Map/issues/6) Finding A
- Vorgänger: ADR-046 (M7.5, v0→v1 Migration für `equipment_item_ids`)
- Fahrplan: M0.4.2

## ADR-004 — Identity-Rename `hcmap` → `plusmap` (Welle-2-Nachzug)

- **Status:** Accepted
- **Datum:** 2026-05-05
- **Berührt:** §4.1 Architektur (Identitäts-/Naming-Konsistenz), §4.5 API-Vertrag (Cookie-Namen), §4.7 Build-/Deploy-Pipeline (Env-Var-Prefix)

### Kontext

ADR-001 und ADR-002 haben Domäne und UI-Branding auf Plus-Map / Outdoor umgestellt, aber den Identitäts-Slug `hcmap` (aus dem Vorgänger-Projekt HC-Map) durchgängig im technischen Substrat belassen: IndexedDB-Name, Cookie-Namen, Logger-Namen, Pydantic-Settings-Env-Prefix, Storage-Keys, Export-Filenames, Replication-Identifier, Map-Layer-IDs, DB-Connection-Default-Werte. Issue [#6](https://github.com/Paddel87/Plus-Map/issues/6) Finding B benennt die DevTools-sichtbare IndexedDB-Stelle exemplarisch — eine Repo-weite Inspektion zeigt 338 Vorkommen von `hcmap`/`HCMAP`/`HC-Map`/`hc-map` in ~60 Dateien (Test- und Lock-Files exkludiert). Die Inkonsistenz spannt alle drei Beobachter-Stufen aus ADR-002:

- **Stufe 1 (Casual-User):** Export-Filenames im Browser-Download-Dialog, smtp_from_name `"HC-Map"` in jeder ausgehenden Mail.
- **Stufe 2 (DevTools / Sysadmin):** Cookie-Namen `hcmap_session`/`hcmap_csrf`, IndexedDB-Name `hcmap`, PIN-IndexedDB `hcmap-pin`, LocalStorage-Schlüssel mit `hcmap`-Prefix, `.env`-Datei mit `HCMAP_*`-Variablen, Compose-Files, Backup-Pfad-Default `hc-map`.
- **Stufe 3 (DB-Inspektor / Code-Reviewer):** DB-Default-Connection-String mit User/DB `hcmap`, Backend-Logger-Namen, Pydantic-Settings-Env-Prefix.

Phase 0 hat genau einen Operator (Repository-Eigentümer); Breaking Changes für externe Nutzer entstehen nicht.

### Entscheidung

**Vollständiger Hard-Cut**: alle Vorkommen von `hcmap`/`HCMAP`/`HC-Map`/`hc-map` außerhalb historisch-erläuternder Texte (CHANGELOG-Einträge, ADR-Texte, Migration-Filenamen, Fahrplan-Historie) werden auf `plusmap`/`PLUSMAP`/`Plus-Map`/`plus-map` umgestellt.

**Konkret:**

| Kategorie | Stellen | Vor → Nach |
|---|---|---|
| Pydantic-Settings-Prefix | [config.py](backend/app/config.py) `env_prefix` | `HCMAP_` → `PLUSMAP_` |
| Env-Vars | `.env.example`, alle Compose-Files, README | `HCMAP_*` → `PLUSMAP_*` |
| DB-Connection-Default | `config.py` `database_url` Default | `postgresql+asyncpg://hcmap:hcmap@db:5432/hcmap` → `postgresql+asyncpg://plusmap:plusmap@db:5432/plusmap` |
| Backend-Cookies | `csrf.py`, `auth/backend.py`, `admin_ui/auth.py` | `hcmap_session`, `hcmap_csrf` → `plusmap_session`, `plusmap_csrf` |
| Frontend-Cookies | `proxy.ts`, `lib/api.ts`, `rxdb/replication.ts` | gleichlautend angepasst |
| Backend-Logger | `logging_middleware.py`, `auth/manager.py` | `hcmap.http`/`hcmap.auth` → `plusmap.http`/`plusmap.auth` |
| Frontend-IndexedDB | `rxdb/database.ts`, `pin-storage.ts` | `hcmap`/`hcmap-pin` → `plusmap`/`plusmap-pin` |
| Frontend-LocalStorage-Keys | `pin-lock-provider.tsx`, `event-detail-view.tsx`, `event-create-form.tsx` | `hcmap.*`/`hcmap:*` → `plusmap.*`/`plusmap:*` |
| Replication-Identifier | `rxdb/replication.ts` | `hcmap-fastapi-sync-v1` → `plusmap-fastapi-sync-v1` |
| Export-Filenames | `export-buttons.tsx` | `hcmap-export.json`/`hcmap-admin-export.json` → `plusmap-export.json`/`plusmap-admin-export.json` |
| Map-Layer-IDs | `lib/map/style.ts` | `hcmap-raster` → `plusmap-raster` |
| Log-Präfixe | `rxdb/database.ts`, `rxdb/provider.tsx` | `[hcmap-rxdb]` → `[plusmap-rxdb]` |
| TypeScript-Type-Namen | `rxdb/database.ts` | `HCMapDatabase`/`HCMapCollections` → `PlusMapDatabase`/`PlusMapCollections` |
| smtp_from_name-Default | `config.py` | `"HC-Map"` → `"Plus-Map"` |
| Backup-Prefix-Default | `.env.example` `HCMAP_BACKUP_PREFIX` | `hc-map` → `plus-map` |
| Image-Tag-Doku | `.env.example` Kommentare | `ghcr.io/paddel87/hc-map-*` → `ghcr.io/paddel87/plus-map-*` |
| Doku-Strings | README, ops/runbook.md, Code-Docstrings | „HC-Map" → „Plus-Map" |

**Nicht angefasst (historischer Kontext):**

- CHANGELOG-Einträge der Welle 0/1/2 (beschreiben den Übergang HC-Map → Plus-Map)
- ADR-001/002-Text (referenziert das alte Naming als Ausgangslage)
- `docs/archiv/` (eingefroren)
- Alembic-Migration-Dateinamen (immutable history; Migration-Bodys werden nur angefasst, wenn sie aktiv ausgeführt werden müssen — hier nicht der Fall)
- `.claude/launch.json` (lokales Tooling, irrelevant für Tarnung)

### Konsequenzen

**Akzeptiert:**

- Bestehende `.env`-Dateien beim einzigen Operator müssen einmalig per `sed -i 's/^HCMAP_/PLUSMAP_/g' .env.plus-map` oder Neu-Kopie aus `.env.example` aktualisiert werden — README dokumentiert das im Migrations-Hinweis.
- Bestehende Browser-Sessions verlieren Login (Cookie-Namen-Wechsel); IndexedDB wird durch Schema-Migration aus ADR-003 neu aufgebaut, alte `hcmap`-IndexedDB bleibt verwaist (Operator-Cleanup-Hinweis).
- `tests/test_rxdb_schema_drift.py` und alle Test-Helpers (Auth-Helpers in `backend/tests/`, Frontend-Tests mit Cookie-Mocks) müssen mitziehen.
- ~60 Dateien geändert; Diff-Größe vergleichbar mit ADR-001/002.

**Vorteil:**

- Tarnung über alle drei Beobachter-Stufen konsistent. DB-Backup, pgAdmin, DevTools, Network-Tab, `.env`, Compose-Logs, ausgehende Mails — überall „Plus-Map".
- Setzt Disziplin: künftig keine zwei parallelen Identitäts-Slugs.

**Out of Scope:**

- Repo-Name auf GitHub bleibt `Plus-Map` (bereits korrekt). 
- GHCR-Image-Pfade `ghcr.io/paddel87/plus-map-*` werden in der Doku referenziert; tatsächlicher CI-Push-Pfad wird spätestens in M10.7 verifiziert (außerhalb dieser ADR).
- Container- und Volume-Namen sind in Compose-Files bereits `plus-map-*` (durch ADR-001-Vorarbeit) und werden hier nicht erneut angefasst.

### Verbindung

- Quelle: Issue [#6](https://github.com/Paddel87/Plus-Map/issues/6) Finding B (sowie Scope-Erweiterung B1–B4 in der Freigabe-Konversation)
- Vorgänger: ADR-001 (Welle 1, Branding-Cut), ADR-002 (Welle 2, Domain-Rename)
- Fahrplan: M0.4.3
