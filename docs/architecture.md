<!--
Zweck: Technische Spezifikation für HC-Map. Beschreibt das System so detailliert,
dass Claude Code daraus konkreten Code generieren kann. Referenz für alle
Umsetzungs-Sessions.

Update-Trigger:
- Schema-Änderung (Tabelle, Spalte, Index, Constraint, RLS-Policy)
- Neue API-Route oder Endpoint-Vertragsänderung
- Repo-Struktur, Deployment-Topologie oder Toolchain ändert sich
- Neue Konvention wird eingeführt oder geändert

NICHT hierher: Grundsatzentscheidungen (→ `decisions.md`), Arbeitsstand (→ `fahrplan.md`),
Projektkontext (→ `project-context.md`), Blocker (→ `blockers.md`).

Konvention: Wenn ein ADR die Grundlage für einen Architekturpunkt ist, im Text
mit "(→ ADR-XXX)" referenzieren.
-->

# HC-Map — Architektur

## Stack-Überblick

| Schicht           | Komponente                                                            | Quelle      |
|-------------------|-----------------------------------------------------------------------|-------------|
| Sprache Backend   | Python 3.12                                                           | ADR-005     |
| Package-Manager   | uv                                                                    | ADR-005     |
| Web-Framework     | FastAPI (aktuell)                                                     | ADR-005     |
| ORM / Migrations  | SQLAlchemy 2.0 / Alembic                                              | ADR-005     |
| Validierung       | Pydantic v2                                                           | ADR-005     |
| Admin-UI          | SQLAdmin 0.25 (unter /admin, parallel zu Next.js)                     | ADR-016, ADR-049 |
| Auth              | fastapi-users + HttpOnly-Cookie-Sessions                              | ADR-006     |
| Datenbank         | PostgreSQL 16 + PostGIS 3                                             | ADR-005     |
| Offline-Sync      | RxDB + Dexie-Storage-Adapter                                          | ADR-017     |
| Geokodierung      | Lat/Lon intern, Plus Codes (`openlocationcode`) im UI                 | ADR-004     |
| Adress-Suche      | MapTiler Geocoding API                                                | ADR-008     |
| Frontend          | Next.js (App Router) + TypeScript strict                              | ADR-007     |
| Styling           | Tailwind CSS + shadcn/ui                                              | ADR-007     |
| Server-State      | TanStack Query                                                        | ADR-007     |
| Karten-Lib        | MapLibre GL JS via `react-map-gl`                                     | ADR-008     |
| Karten-Tiles      | MapTiler Cloud (Phase 1) → Self-Hosted (Phase 2)                      | ADR-008     |
| Reverse Proxy     | Caddy (TLS automatisch)                                               | dieses Doc  |
| Container         | Docker + Docker Compose                                               | dieses Doc  |
| E-Mail            | Stub in Dev (Konsole), später externer Dienst                         | dieses Doc  |

---

## Repository-Struktur

Monorepo mit zwei Hauptbereichen. Trennung scharf, kein direkter Code-Import zwischen Backend und Frontend.

```
hc-map/
├── README.md
├── CLAUDE.md
├── docs/
│   ├── project-context.md
│   ├── fahrplan.md
│   ├── architecture.md
│   ├── decisions.md
│   └── blockers.md
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── alembic.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI-Einstieg
│   │   ├── config.py                # Pydantic-Settings, .env-Lesen
│   │   ├── db.py                    # Engine, Session, Dependency
│   │   ├── auth/                    # fastapi-users-Integration
│   │   │   ├── __init__.py
│   │   │   ├── backend.py           # Cookie-Backend
│   │   │   ├── manager.py           # User-Manager
│   │   │   ├── models.py            # User-SQLAlchemy-Modell
│   │   │   ├── schemas.py           # Pydantic-Schemas
│   │   │   └── routes.py            # Login/Logout/Me/Reset
│   │   ├── models/                  # SQLAlchemy-Modelle (außer User)
│   │   │   ├── __init__.py
│   │   │   ├── person.py
│   │   │   ├── event.py
│   │   │   ├── application.py
│   │   │   ├── catalog.py           # RestraintType, ArmPosition, …
│   │   │   └── mixins.py            # Timestamp-Mixin, etc.
│   │   ├── schemas/                 # Pydantic-Schemas pro Domäne
│   │   ├── routes/                  # FastAPI-Router pro Domäne
│   │   │   ├── events.py
│   │   │   ├── applications.py
│   │   │   ├── catalogs.py
│   │   │   ├── persons.py
│   │   │   └── admin.py
│   │   ├── services/                # Business-Logik abseits Routen
│   │   │   ├── plus_code.py
│   │   │   ├── geocoding.py         # MapTiler-Geocoding-Wrapper
│   │   │   └── anonymize.py
│   │   ├── deps.py                  # FastAPI-Dependencies (Auth, DB, RBAC)
│   │   ├── rls.py                   # RLS-Helper: GUC setzen pro Request
│   │   ├── admin_ui/                # SQLAdmin-Integration (siehe ADR-016, ADR-049)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # AdminAuthBackend (JWT-Cookie-Reuse)
│   │   │   ├── context.py           # ContextVars für RLS-Stamp
│   │   │   ├── setup.py             # _StampingAsyncSession + register_admin
│   │   │   └── views.py             # 8 ModelView-Definitionen
│   │   └── sync/                    # RxDB-Replication-Endpoints (siehe ADR-017)
│   │       ├── __init__.py
│   │       ├── routes.py            # /api/sync/pull, /api/sync/push
│   │       └── schema.py            # Replication-Schema-Definition
│   ├── migrations/                  # Alembic-Versions
│   │   └── versions/
│   ├── seeds/                       # Katalog-Seeds (Python-Skripte)
│   │   ├── restraint_types.py
│   │   ├── arm_positions.py
│   │   ├── hand_positions.py
│   │   └── hand_orientations.py
│   ├── scripts/
│   │   └── bootstrap_admin.py       # Initialer Admin-User
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_events.py
│       ├── test_rls.py              # RLS-Szenarien pro Rolle
│       └── ...
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.mjs
│   ├── public/
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Dashboard
│   │   │   ├── login/
│   │   │   ├── events/
│   │   │   │   ├── page.tsx         # Liste
│   │   │   │   ├── new/
│   │   │   │   └── [id]/            # Detail / Edit
│   │   │   ├── map/
│   │   │   ├── admin/
│   │   │   └── api/                 # nur Proxies (z. B. Tile-Proxy)
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui-Komponenten
│   │   │   ├── map/                 # MapLibre-Wrapper
│   │   │   ├── event/               # Event-Formulare, -Listen
│   │   │   └── admin/
│   │   ├── lib/
│   │   │   ├── api.ts               # fetch-Wrapper, BaseURL
│   │   │   ├── auth.ts              # Session-Hooks
│   │   │   ├── plus-code.ts         # Plus-Code-Util (clientseitig)
│   │   │   ├── query.ts             # TanStack-Query-Setup
│   │   │   └── rxdb/                # RxDB-Setup (siehe ADR-017)
│   │   │       ├── database.ts      # RxDatabase-Initialisierung
│   │   │       ├── schemas.ts       # Event- und Application-Schemas
│   │   │       └── replication.ts   # Sync mit Backend
│   │   ├── hooks/
│   │   ├── types/                   # TypeScript-Typen, ggf. aus OpenAPI
│   │   └── styles/
│   └── tests/
├── docker/
│   ├── docker-compose.yml           # Lokale Entwicklung
│   ├── docker-compose.prod.yml      # Produktion
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── caddy/
│       └── Caddyfile
├── ops/
│   ├── backup.sh
│   ├── restore.sh
│   └── runbook.md
├── .env.example
├── .gitignore
└── .pre-commit-config.yaml
```

---

## Datenmodell

### Konventionen

- **Primärschlüssel:** UUID v7 (zeitbasiert, sortierbar) — alle Tabellen.
- **Zeitstempel:** `created_at` (NOT NULL DEFAULT now()), `updated_at` (NULL, via Trigger).
- **Soft Delete:** Nur User und Person erhalten `is_deleted` + `deleted_at` (für Anonymisierung gemäß ADR-002). Andere Entitäten werden hart gelöscht.
- **Audit-Felder:** `created_by` (FK auf User) auf allen vom User schreibbaren Tabellen.
- **Naming:** snake_case, Tabellen im Singular (`event`, nicht `events`).
- **Timezone:** Alle `timestamptz`, kein naives Datum/Uhrzeit.
- **Geometrie:** PostGIS-Spalte `geom` (geography(Point, 4326)) parallel zu `lat`/`lon` als generierte Spalte für räumliche Queries.

### Entitäten

#### `user` (fastapi-users-kompatibel)

| Spalte               | Typ                  | Constraints / Notizen                                            |
|----------------------|----------------------|------------------------------------------------------------------|
| id                   | uuid                 | PK                                                               |
| email                | text                 | UNIQUE, NOT NULL, lowercased                                     |
| hashed_password      | text                 | NOT NULL                                                         |
| is_active            | boolean              | NOT NULL DEFAULT true                                            |
| is_verified          | boolean              | NOT NULL DEFAULT false                                           |
| is_superuser         | boolean              | NOT NULL DEFAULT false (fastapi-users-Konvention; nicht für RBAC nutzen) |
| role                 | enum                 | NOT NULL: 'admin' \| 'editor' \| 'viewer'                        |
| person_id            | uuid                 | FK → person.id, NOT NULL, UNIQUE — jeder User hat genau eine Person (siehe ADR-010) |
| display_name         | text                 | NULL                                                             |
| is_deleted           | boolean              | NOT NULL DEFAULT false                                           |
| deleted_at           | timestamptz          | NULL                                                             |
| created_at           | timestamptz          | NOT NULL DEFAULT now()                                           |
| updated_at           | timestamptz          | NULL                                                             |

Indizes: `email` (unique), `role`, `person_id`.

#### `person`

| Spalte         | Typ          | Constraints / Notizen                                       |
|----------------|--------------|-------------------------------------------------------------|
| id             | uuid         | PK                                                          |
| name           | text         | NOT NULL                                                    |
| alias          | text         | NULL                                                        |
| note           | text         | NULL                                                        |
| origin         | enum         | NOT NULL: 'managed' \| 'on_the_fly' DEFAULT 'managed'       |
| linkable       | boolean      | NOT NULL DEFAULT false — Admin gibt frei, dass Person mit einem zukünftigen User verknüpft werden darf |
| is_deleted     | boolean      | NOT NULL DEFAULT false (Anonymisierung gemäß ADR-002)       |
| deleted_at     | timestamptz  | NULL                                                        |
| created_by     | uuid         | FK → user.id                                                |
| created_at     | timestamptz  | NOT NULL DEFAULT now()                                      |
| updated_at     | timestamptz  | NULL                                                        |

Indizes: `name`, `is_deleted`, `origin` (Filter für Admin-UI), `linkable` (Filter für User-Anlage-Dropdown).

`origin = 'on_the_fly'` markiert Personen, die spontan im Live-Modus angelegt wurden (siehe ADR-014). Diese landen in einer Admin-Queue zur weiteren Bearbeitung.

`linkable` wird vom Admin manuell auf `true` gesetzt, wenn eine Person mit einem zukünftigen User verknüpft werden soll. Default `false` schützt davor, dass jede Person versehentlich beim User-Anlegen als verknüpfbar erscheint.

Bei Anonymisierung: `name = '[gelöscht]'`, `alias = NULL`, `note = NULL`, `is_deleted = true`, `deleted_at = now()`. Der Datensatz bleibt physisch erhalten, damit FKs in `event_participant` und `application` intakt bleiben.

#### `event`

| Spalte                | Typ                          | Constraints / Notizen                                          |
|-----------------------|------------------------------|----------------------------------------------------------------|
| id                    | uuid                         | PK                                                             |
| started_at            | timestamptz                  | NOT NULL — Beginn des Events (im Live-Modus: Tap auf Start)    |
| ended_at              | timestamptz                  | NULL bis Event beendet — danach NOT NULL                       |
| lat                   | numeric(9,6)                 | NOT NULL, CHECK -90 ≤ lat ≤ 90                                 |
| lon                   | numeric(9,6)                 | NOT NULL, CHECK -180 ≤ lon ≤ 180                               |
| geom                  | geography(Point, 4326)       | GENERATED ALWAYS AS (ST_MakePoint(lon, lat)::geography) STORED |
| legacy_external_ref   | text                         | NULL — optionale Selbstreferenz zu externer Quelle (vormals `w3w_legacy`, ADR-050) |
| reveal_participants   | boolean                      | NOT NULL DEFAULT false                                         |
| note                  | text                         | NULL                                                           |
| created_by            | uuid                         | FK → user.id                                                   |
| created_at            | timestamptz                  | NOT NULL DEFAULT now()                                         |
| updated_at            | timestamptz                  | NOT NULL DEFAULT clock_timestamp() — RxDB-Pull-Cursor (siehe ADR-030) |
| is_deleted            | boolean                      | NOT NULL DEFAULT false — Tombstone für RxDB (siehe ADR-030)    |
| deleted_at            | timestamptz                  | NULL                                                           |

Indizes:
- `started_at` (BTREE)
- `ended_at` (BTREE)
- `geom` (GiST)
- `created_by`
- `note` (GIN auf `to_tsvector('german', note)` für Volltextsuche, siehe ADR-015)
- `(updated_at, id)` (BTREE) — Cursor-Index für `/api/sync/pull` (siehe ADR-030)

#### `event_participant`

| Spalte      | Typ   | Constraints                                              |
|-------------|-------|----------------------------------------------------------|
| event_id    | uuid  | FK → event.id ON DELETE CASCADE                          |
| person_id   | uuid  | FK → person.id ON DELETE RESTRICT                        |
| created_at  | timestamptz | NOT NULL DEFAULT now()                            |

PK: composite (event_id, person_id).
Indizes: `person_id`, `event_id`.

#### `application`

| Spalte                | Typ          | Constraints / Notizen                                       |
|-----------------------|--------------|-------------------------------------------------------------|
| id                    | uuid         | PK                                                          |
| event_id              | uuid         | FK → event.id ON DELETE CASCADE, NOT NULL                   |
| performer_id          | uuid         | FK → person.id ON DELETE RESTRICT, NOT NULL                 |
| recipient_id          | uuid         | FK → person.id ON DELETE RESTRICT, NOT NULL                 |
| arm_position_id       | uuid         | FK → arm_position.id, NULLABLE                              |
| hand_position_id      | uuid         | FK → hand_position.id, NULLABLE                             |
| hand_orientation_id   | uuid         | FK → hand_orientation.id, NULLABLE                          |
| sequence_no           | int          | NOT NULL — Reihenfolge innerhalb des Events                 |
| started_at            | timestamptz  | NULL — Beginn der Application (im Live-Modus automatisch beim Anlegen) |
| ended_at              | timestamptz  | NULL — Ende der Application (im Live-Modus auf Tap "Beenden") |
| note                  | text         | NULL — auch für "Materialwechsel danach" o. ä. nutzbar      |
| created_by            | uuid         | FK → user.id                                                |
| created_at            | timestamptz  | NOT NULL DEFAULT now()                                      |
| updated_at            | timestamptz  | NOT NULL DEFAULT clock_timestamp() — RxDB-Pull-Cursor (siehe ADR-030) |
| is_deleted            | boolean      | NOT NULL DEFAULT false — Tombstone für RxDB (siehe ADR-030) |
| deleted_at            | timestamptz  | NULL                                                        |

Indizes: `event_id`, `performer_id`, `recipient_id`, composite (event_id, sequence_no), GIN auf `to_tsvector('german', note)` (siehe ADR-015), `(updated_at, id)` (Cursor-Index für `/api/sync/pull`, siehe ADR-030).
Constraint: UNIQUE(event_id, sequence_no).
Cascade: `AFTER UPDATE OF is_deleted`-Trigger `cascade_event_soft_delete` propagiert `is_deleted = true` auf einem Event auf alle nicht-gelöschten Child-Applications (siehe ADR-030).

`performer_id != recipient_id` ist als Business-Regel im Service/Schema, nicht als DB-Constraint (zu strikt für mögliche Self-Bondage-Fälle).

#### `application_restraint`

| Spalte            | Typ   | Constraints                                              |
|-------------------|-------|----------------------------------------------------------|
| application_id    | uuid  | FK → application.id ON DELETE CASCADE                    |
| restraint_type_id | uuid  | FK → restraint_type.id ON DELETE RESTRICT                |
| created_at        | timestamptz | NOT NULL DEFAULT now()                            |

PK: composite (application_id, restraint_type_id).

#### `restraint_type`

| Spalte            | Typ          | Constraints / Notizen                                                |
|-------------------|--------------|----------------------------------------------------------------------|
| id                | uuid         | PK                                                                   |
| category          | enum         | NOT NULL: 'handcuffs' \| 'thumbcuffs' \| 'legcuffs' \| 'cuffs_leather' \| 'rope' \| 'tape' \| 'cable_tie' \| 'cloth' \| 'strap' \| 'other' |
| brand             | text         | NULL                                                                 |
| model             | text         | NULL                                                                 |
| mechanical_type   | enum         | NULL: 'chain' \| 'hinged' \| 'rigid' (nur bei Schellen-Kategorien)   |
| display_name      | text         | NOT NULL                                                             |
| status            | enum         | NOT NULL: 'approved' \| 'pending' \| 'rejected' DEFAULT 'pending'    |
| suggested_by      | uuid         | FK → user.id, NULL                                                   |
| approved_by       | uuid         | FK → user.id, NULL                                                   |
| rejected_by       | uuid         | FK → user.id, NULL (M7.1)                                            |
| rejected_at       | timestamptz  | NULL (M7.1)                                                          |
| reject_reason     | text         | NULL (M7.1)                                                          |
| note              | text         | NULL                                                                 |
| created_at        | timestamptz  | NOT NULL DEFAULT now()                                               |
| updated_at        | timestamptz  | NULL                                                                 |

Indizes: `status`, `category`, `brand`. Eindeutigkeit: UNIQUE(category, brand, model, mechanical_type) wo alle nicht-NULL.

#### `arm_position`, `hand_position`, `hand_orientation`

Identische Struktur (Lookup-Tabellen mit Vorschlags-Workflow):

| Spalte        | Typ          | Constraints                                                    |
|---------------|--------------|----------------------------------------------------------------|
| id            | uuid         | PK                                                             |
| name          | text         | NOT NULL                                                       |
| description   | text         | NULL                                                           |
| status        | enum         | NOT NULL: 'approved' \| 'pending' \| 'rejected' DEFAULT 'pending' |
| suggested_by  | uuid         | FK → user.id, NULL                                             |
| approved_by   | uuid         | FK → user.id, NULL                                             |
| rejected_by   | uuid         | FK → user.id, NULL (M7.1)                                      |
| rejected_at   | timestamptz  | NULL (M7.1)                                                    |
| reject_reason | text         | NULL (M7.1)                                                    |
| created_at    | timestamptz  | NOT NULL DEFAULT now()                                         |
| updated_at    | timestamptz  | NULL                                                           |

Indizes: `name` (unique unter approved), `status`.

### Katalog-Seed (M1)

**RestraintType-Initialeinträge** (alle status='approved'):

- Handschellen Chain: ASP Chain, S&W Model 100, Peerless Model 700
- Handschellen Hinged: ASP Ultra Cuffs, TCH 840, Peerless Model 730
- Handschellen Rigid: Clejuso Model 13, Clejuso Model 15 Heavy, ASP Rigid Ultra
- Daumenschellen: Clejuso (Standard)
- Fußschellen: Peerless Model 703
- Sonstige: Seil, Bondage-Tape, Klebeband, Schal, Lederriemen, Kabelbinder

**ArmPosition** (approved): hinter dem Rücken, vor dem Körper, über dem Kopf, hinter dem Kopf, seitlich, gespreizt, am Körper anliegend, Strappado.

**HandPosition** (approved): Handgelenke, Daumen, Unterarme, Handgelenk-an-Ellbogen.

**HandOrientation** (approved): Handrücken zueinander, Handflächen zueinander, parallel, überkreuzt, Daumen-zu-Daumen.

---

## Row-Level-Security (RLS)

### Grundansatz

RLS ist auf allen daten-führenden Tabellen aktiv: `event`, `event_participant`, `application`, `application_restraint`. Auf Katalog-Tabellen separates Modell (siehe unten).

Die aktuelle Identität des Requests wird per Postgres-Session-Variable (GUC) gesetzt:

- `app.current_user_id` (uuid)
- `app.current_role` (text: 'admin' | 'editor' | 'viewer')
- `app.current_person_id` (uuid, optional)

In `app/rls.py` setzt die Request-Dependency diese Variablen pro Connection (oder pro Transaktion, je nach Pool-Strategie). Connection-Pool ist so konfiguriert, dass GUCs am Transaktionsende zurückgesetzt werden (`RESET ALL` oder `SET LOCAL`).

### Policies

#### Event

```sql
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE event FORCE ROW LEVEL SECURITY;

-- Admin: Vollzugriff
CREATE POLICY event_admin_all ON event
  FOR ALL TO app_user
  USING (current_setting('app.current_role') = 'admin')
  WITH CHECK (current_setting('app.current_role') = 'admin');

-- Editor + Viewer: SELECT nur, wenn current_person_id Participant ist
CREATE POLICY event_member_select ON event
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_role') IN ('editor', 'viewer')
    AND EXISTS (
      SELECT 1 FROM event_participant ep
      WHERE ep.event_id = event.id
        AND ep.person_id = current_setting('app.current_person_id')::uuid
    )
  );

-- Editor: INSERT erlaubt, created_by muss current_user_id sein
CREATE POLICY event_editor_insert ON event
  FOR INSERT TO app_user
  WITH CHECK (
    current_setting('app.current_role') = 'editor'
    AND created_by = current_setting('app.current_user_id')::uuid
  );

-- Editor: UPDATE/DELETE nur eigene Events
CREATE POLICY event_editor_modify ON event
  FOR UPDATE TO app_user
  USING (
    current_setting('app.current_role') = 'editor'
    AND created_by = current_setting('app.current_user_id')::uuid
  )
  WITH CHECK (
    created_by = current_setting('app.current_user_id')::uuid
  );

CREATE POLICY event_editor_delete ON event
  FOR DELETE TO app_user
  USING (
    current_setting('app.current_role') = 'editor'
    AND created_by = current_setting('app.current_user_id')::uuid
  );
```

#### EventParticipant

Sichtbar/änderbar, sobald das zugehörige Event sichtbar/änderbar ist:

```sql
ALTER TABLE event_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participant FORCE ROW LEVEL SECURITY;

CREATE POLICY ep_admin_all ON event_participant
  FOR ALL TO app_user
  USING (current_setting('app.current_role') = 'admin')
  WITH CHECK (current_setting('app.current_role') = 'admin');

CREATE POLICY ep_member_via_event ON event_participant
  FOR SELECT TO app_user
  USING (
    EXISTS (
      SELECT 1 FROM event e
      WHERE e.id = event_participant.event_id
      -- impliziter RLS-Check auf event greift hier ebenfalls
    )
  );

-- Schreibzugriff Editor: nur in eigenen Events
CREATE POLICY ep_editor_modify ON event_participant
  FOR ALL TO app_user
  USING (
    current_setting('app.current_role') = 'editor'
    AND EXISTS (
      SELECT 1 FROM event e
      WHERE e.id = event_participant.event_id
        AND e.created_by = current_setting('app.current_user_id')::uuid
    )
  );
```

#### Application & ApplicationRestraint

Spiegeln das Event-RLS: sichtbar/änderbar wenn Event sichtbar/änderbar.

#### Person

Lesbar für alle eingeloggten Nutzer (Personen-Auswahl in Formularen). Schreibrecht nur Admin. Kein RLS auf Lesen, aber **`name` wird auf API-Ebene maskiert** wenn:
- die Person in einem Event mit `reveal_participants = false` auftaucht **und**
- die anfragende Person nicht selbst als Participant in diesem Event steht.

Dieses Verhalten ist Service-Logik, nicht DB-Policy — weil es kontextabhängig ist (gleiche Person, anderes Event ⇒ andere Sichtbarkeit).

#### Kataloge (RestraintType, ArmPosition, HandPosition, HandOrientation)

- Admin: alle (über `<table>_admin_modify` mit `FOR ALL`).
- Editor: alle approved + eigene `pending` + eigene `rejected` (M7.1 / ADR-043 §A — proposing editor sieht die Begründung der Ablehnung).
- Viewer: nur approved.

**Schreib-/Löschpfade:**
- Admin: voller Zugriff (Insert/Update/Delete) via `<table>_admin_modify`.
- Editor INSERT: nur `status='pending'` mit `suggested_by = current_user_id` (Policy `<table>_propose`).
- Editor DELETE: nur eigene `status='pending'` (Policy `<table>_owner_withdraw`, M7.1). Edit auf eigene pending ist kein Pfad-A-Feature — Workaround = withdraw + neuer Vorschlag.

```sql
-- M2 + M7.1 effektive SELECT-Policy (vereinfacht für restraint_type):
CREATE POLICY restraint_type_select ON restraint_type
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_role', true) = 'admin'
    OR status = 'approved'
    OR (
      status IN ('pending', 'rejected')
      AND suggested_by = current_setting('app.current_user_id', true)::uuid
    )
  );

-- INSERT: editor darf nur eigene pending einlegen, admin frei.
CREATE POLICY restraint_type_propose ON restraint_type
  FOR INSERT TO app_user
  WITH CHECK (
    current_setting('app.current_role', true) IN ('editor', 'admin')
    AND (
      current_setting('app.current_role', true) = 'admin'
      OR (status = 'pending'
          AND suggested_by = current_setting('app.current_user_id', true)::uuid)
    )
  );

-- DELETE eigene pending (M7.1, ADR-043 §C):
CREATE POLICY restraint_type_owner_withdraw ON restraint_type
  FOR DELETE TO app_user
  USING (
    current_setting('app.current_role', true) = 'editor'
    AND status = 'pending'
    AND suggested_by = current_setting('app.current_user_id', true)::uuid
  );
```

(Analog für die anderen drei Katalog-Tabellen.)

### RLS-Tests (zwingend, M2)

Pytest-Suite mit Fixtures pro Rolle:
- `test_admin_sees_all`
- `test_editor_sees_only_own_participation`
- `test_viewer_cannot_modify`
- `test_pending_catalog_invisible_to_others`
- `test_reveal_participants_false_masks_names`
- `test_reveal_participants_true_shows_names`

---

## Person-Workflow

### Auto-Participant-Regel (siehe ADR-012)

Jede Person, die in einer Application als `performer_id` oder `recipient_id` eingetragen wird, wird **automatisch** als `EventParticipant` zum übergeordneten Event hinzugefügt — sofern noch nicht vorhanden. Diese Regel ist serverseitig in der Application-Erstellung verankert (Trigger oder Service-Logik), nicht im Client.

Konsequenz: Wer in einer Application steht, ist automatisch Beteiligter des Events und sieht es via RLS, sobald er einen User-Account hat. Das UI weist beim Anlegen darauf hin: „Daniela wird als Participant des Events erfasst und kann es später einsehen."

Manuelles Entfernen aus EventParticipant ist nur möglich, wenn die Person in **keiner** Application des Events mehr auftaucht. Sonst Constraint-Violation.

### On-the-fly-Personenanlage (siehe ADR-014)

Performer (Admin oder Editor) können im Live-Modus eine neue Person spontan anlegen, ohne dafür den Admin-Bereich zu verlassen.

**UI-Flow:**

1. Im Recipient-Dropdown (oder Performer-Dropdown bei Bedarf) ist die letzte Option „+ Neue Person hinzufügen".
2. Modal öffnet sich mit einem einzigen Pflichtfeld: `name`. Optional: `alias`.
3. Beim Speichern: `Person` wird mit `origin = 'on_the_fly'`, `linkable = false`, `created_by = current_user_id` angelegt.
4. Person ist sofort im Dropdown verfügbar und wird gewählt.
5. Application wird mit dieser Person als Recipient/Performer fortgesetzt.

Die so angelegte Person hat **keinen User-Account**. Sie taucht in Events auf, sieht aber selbst nichts. Sie erscheint im Admin-Bereich unter „Neue Personen aus Live-Erfassung" zur Nachbearbeitung.

### Spätere User-Verknüpfung

Im Admin-User-Anlage-Dialog gibt es zwei Modi:

- **Standardmodus:** Neuer User mit neuer Person — Name und User-Daten werden zusammen erfasst.
- **Verknüpfungsmodus:** Neuer User wird mit einer **bestehenden** Person verknüpft. Im Dropdown erscheinen nur Personen mit `linkable = true`.

Damit eine Person verknüpfungsbereit wird, setzt der Admin manuell `linkable = true` über die Admin-UI „Personen → Bearbeiten". Das verhindert, dass beim User-Anlegen alle ~50 bisher dokumentierten Personen als „verknüpfbar" erscheinen.

Sobald die Verknüpfung hergestellt ist, sieht der neue User via RLS automatisch alle Events, in denen die verknüpfte Person bereits Participant war — auch rückwirkend, ohne Datenänderung an den Events.

---

## Auth-Flow

### Mechanik

- **fastapi-users** mit Cookie-Backend (HttpOnly, Secure, SameSite=Lax).
- Session-Strategy: serverseitige Sessions in Postgres (Tabelle `auth_session` mit `id`, `user_id`, `expires_at`, `created_at`, `last_used_at`).
- Cookie-Name: `hcmap_session`, Pfad `/`, Domain = Hauptdomain.
- TTL: 30 Tage Sliding (bei jeder Anfrage erneuert), absolutes Maximum 90 Tage.
- Same-Domain-Setup: Frontend und Backend laufen unter derselben Domain (z. B. `app.hc-map.example` für Frontend, `/api/*` reverse-proxied auf Backend) → Cookie-Setup unkompliziert, kein CORS für Auth nötig.

### Endpunkte (fastapi-users-Standard, leicht angepasst)

- `POST /api/auth/login` — E-Mail + Passwort, setzt Session-Cookie.
- `POST /api/auth/logout` — invalidiert Session in DB, löscht Cookie.
- `GET  /api/auth/me` — aktueller User mit Rolle + verknüpfter Person.
- `POST /api/auth/forgot-password` — Token erzeugen, Mail-Stub triggert.
- `POST /api/auth/reset-password` — Token + neues Passwort.
- `POST /api/auth/change-password` — eingeloggt, altes + neues Passwort.

Selbstregistrierung in Pfad A **deaktiviert** (Endpunkte nicht registriert oder mit `403` blockiert).

### Bootstrap

`scripts/bootstrap_admin.py`:
- Liest `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` und `ADMIN_DISPLAY_NAME` aus ENV.
- Legt zuerst eine `Person` mit dem Display-Namen an.
- Legt User mit `role='admin'`, `is_active=true`, `is_verified=true`, verknüpft mit der eben angelegten Person.
- Verweigert Ausführung, wenn bereits ein Admin existiert.
- Wird einmal nach erstem `alembic upgrade head` ausgeführt.

### CSRF-Schutz

Cookie-Sessions brauchen CSRF-Schutz für State-Changing-Requests (POST/PUT/DELETE):
- Double-Submit-Token: Backend setzt `hcmap_csrf` als nicht-HttpOnly-Cookie (lesbar für JS), Frontend liest und schickt im `X-CSRF-Token`-Header mit.
- Backend-Middleware vergleicht beide.
- GET-Requests sind csrf-frei.

---

## API-Vertrag (Übersicht)

Vollständige OpenAPI-Doku ist generiert (`/api/docs`). Hier die wichtigsten Routen:

### Auth (siehe oben)

### Events

| Methode | Pfad                              | Rolle                  | Zweck                                  |
|---------|-----------------------------------|------------------------|----------------------------------------|
| GET     | `/api/events`                     | alle (RLS)             | Liste, Filter: from, to, person_id, bbox |
| POST    | `/api/events`                     | admin, editor          | Event anlegen                          |
| POST    | `/api/events/start`               | admin, editor          | Live-Modus: Event mit `started_at = now()` starten |
| POST    | `/api/events/{id}/end`            | admin / Eigentümer     | Live-Modus: `ended_at = now()` setzen  |
| GET     | `/api/events/{id}`                | alle (RLS)             | Detail inkl. Applications              |
| PATCH   | `/api/events/{id}`                | admin / Eigentümer     | Update                                 |
| DELETE  | `/api/events/{id}`                | admin / Eigentümer     | Löschen                                |
| POST    | `/api/events/{id}/participants`   | admin / Eigentümer     | Person hinzufügen                      |
| DELETE  | `/api/events/{id}/participants/{person_id}` | admin / Eigentümer | Person entfernen              |

### Applications

| Methode | Pfad                                           | Rolle              | Zweck                       |
|---------|------------------------------------------------|--------------------|-----------------------------|
| POST    | `/api/events/{event_id}/applications`          | admin / Eigentümer | Application anlegen         |
| POST    | `/api/events/{event_id}/applications/start`    | admin / Eigentümer | Live: Application starten (`started_at = now()`) |
| POST    | `/api/applications/{id}/end`                   | admin / Eigentümer | Live: Application beenden (`ended_at = now()`)   |
| PATCH   | `/api/applications/{id}`                       | admin / Eigentümer | Update                      |
| DELETE  | `/api/applications/{id}`                       | admin / Eigentümer | Löschen                     |
| PUT     | `/api/applications/{id}/restraints`            | admin / Eigentümer | n:m-Set ersetzen (Legacy-REST; Live + Backfill nutzen seit M7.5 stattdessen das Sync-Push mit `restraint_type_ids[]` auf der Application-Doc, siehe ADR-046) |

### Personen

| Methode | Pfad                          | Rolle             | Zweck                              |
|---------|-------------------------------|-------------------|------------------------------------|
| GET     | `/api/persons`                | alle              | Auswahl-Liste, name maskiert wenn nötig |
| GET     | `/api/persons?linkable=true`  | admin             | Personen, die mit einem User verknüpft werden können |
| POST    | `/api/persons`                | admin             | Person verwaltet anlegen           |
| POST    | `/api/persons/quick`          | admin, editor     | On-the-fly im Live-Modus (siehe ADR-014), setzt `origin = 'on_the_fly'` |
| PATCH   | `/api/persons/{id}`           | admin             | Update inkl. `linkable`-Toggle     |
| POST    | `/api/persons/{id}/anonymize` | admin             | Anonymisierung gemäß ADR-002       |

### Kataloge

Pro Katalog-Typ ein eigener Router-Prefix: `/api/restraint-types`, `/api/arm-positions`, `/api/hand-positions`, `/api/hand-orientations`. Die Spalte `{kind}` in der folgenden Tabelle steht stellvertretend für alle vier Pfade.

| Methode | Pfad                                    | Rolle              | Zweck                               |
|---------|-----------------------------------------|--------------------|-------------------------------------|
| GET     | `/api/{kind}?status=...`                | alle (RLS)         | Liste der sichtbaren Einträge; optionaler `status`-Filter (`approved`, `pending`, `rejected`). Pagination via `limit`/`offset`. |
| POST    | `/api/{kind}`                           | admin, editor      | Vorschlag (`status='pending'`) oder Admin-Anlage; UNIQUE-Konflikt → 409 |
| PATCH   | `/api/{kind}/{id}`                      | admin              | Update aller editierbaren Felder. **Status-Feld wird nicht akzeptiert** (ADR-043 §B); UNIQUE-Konflikt → 409 |
| DELETE  | `/api/{kind}/{id}`                      | admin, editor      | Hard-Delete eines pending-Vorschlags. Editor: nur eigene pending (RLS-Policy `<table>_owner_withdraw`). Admin: jeden pending. Andere Stati → 409 |
| POST    | `/api/{kind}/{id}/approve`              | admin              | pending → approved; setzt `approved_by`, leert Reject-Felder. Idempotent auf approved → no-op (außer rejected → 409) |
| POST    | `/api/{kind}/{id}/reject`               | admin              | pending → rejected; Body `{ "reason": str (1..2000) }` Pflicht; setzt `rejected_by`, `rejected_at`, `reject_reason`. Andere Stati → 409 |

**Sichtbarkeit (RLS, ADR-043 §A):**
- Admin sieht alle Einträge.
- Editor sieht alle approved + eigene pending + eigene rejected (mit `reject_reason`).
- Viewer sieht nur approved.

**RxDB:** Katalog-Daten werden bewusst **nicht** in RxDB synchronisiert (ADR-043 §E). Frontend lädt sie via TanStack-Query mit `staleTime: 5 min` und Cache-Key `['catalog', kind, { status }]`. Mutations invalidieren `['catalog', kind]`.

### Geocoding-Proxy

| Methode | Pfad                       | Rolle | Zweck                                |
|---------|----------------------------|-------|--------------------------------------|
| GET     | `/api/geocode?q=...`       | alle  | Proxy zu MapTiler-Geocoding (Key serverseitig, In-Memory-Token-Bucket pro User: 30 req/min, ADR-041 §B/§D). Optionale Parameter: `proximity=lat,lon`, `limit=<1..10>`. Antwort = MapTiler-GeoJSON-FeatureCollection 1:1. |

### Tile-Proxy (optional)

`/api/tiles/{z}/{x}/{y}` → MapTiler. Vorteil: API-Key bleibt serverseitig, einfacher Wechsel zu Self-Hosted in Phase 2 ohne Frontend-Änderung.

### Admin (M8.3, ADR-049)

| Methode | Pfad                                          | Rolle | Zweck |
|---------|-----------------------------------------------|-------|-------|
| GET     | `/api/admin/users`                            | admin | User-Liste mit optionalen Filtern `role`/`is_active`. |
| POST    | `/api/admin/users`                            | admin | User anlegen — entweder mit `new_person` (PersonCreate-Body) oder mit `existing_person_id` (muss `linkable=true` und nicht deleted sein, ADR-014). Genau eines von beiden. |
| PATCH   | `/api/admin/users/{id}`                       | admin | Rolle/Status/`display_name` ändern. |
| DELETE  | `/api/admin/users/{id}`                       | admin | Deaktivieren (`is_active=false`). Self-Deaktivierung wird mit 409 abgelehnt. |
| GET     | `/api/admin/stats`                            | admin | Aggregat: `events_total`, `events_per_month_last_12`, `top_restraints` (10), `top_arm_positions` (5), `top_hand_positions` (5), `users_by_role`, `persons_total`, `persons_on_the_fly_unlinked`, `pending_catalog_proposals`. Kein Caching (ADR-049 §F). |
| GET     | `/api/admin/export/all`                       | admin | Strukturierter JSON-Dump aller Tabellen mit `exported_at`/`schema_version=1` (ADR-049 §G). `hashed_password` und PostGIS-`geom` werden bewusst entfernt. |
| POST    | `/api/admin/persons/{source_id}/merge`        | admin | Re-pointet `event_participant`/`application` von `source_id` auf `target_id` (Body-Feld). Konflikt-Resolution für `(event_id, person_id)`-UNIQUE per Soft-Delete der überlappenden Source-Rows. Source wird soft-deleted mit Marker `[merged → <uuid>]`. Refused mit 409, wenn Source oder Target an einen User gebunden ist (ADR-049 §E). |

**Anonymisierung** (`POST /api/persons/{id}/anonymize`) bleibt unter `/api/persons` (admin-only, ADR-002, M2). Kein Duplikat unter `/api/admin/`.

### Health

| Methode | Pfad             | Rolle  | Zweck                  |
|---------|------------------|--------|------------------------|
| GET     | `/api/health`    | öffentlich | Liveness/Readiness  |

### Sync (RxDB Replication-Protokoll, siehe ADR-017, ADR-029, ADR-030, ADR-031, ADR-033)

Pro Collection ein eigener Endpoint-Pfad (RxDB-Replication arbeitet pro Collection):

| Methode | Pfad                              | Rolle      | Zweck                                                |
|---------|-----------------------------------|------------|------------------------------------------------------|
| GET     | `/api/sync/events/pull`           | alle (RLS) | Query `updated_at` + `id` als Cursor; liefert Events seit Cursor inkl. Tombstones (`_deleted: true`). Cursor-Index `(updated_at, id)` (ADR-030). |
| POST    | `/api/sync/events/push`           | alle (RLS) | Akzeptiert `[{assumedMasterState, newDocumentState}]` und validiert pro Feld nach ADR-029. Gibt Konflikte als Server-Master-Docs zurück. |
| GET     | `/api/sync/applications/pull`     | alle (RLS) | wie events/pull, für `application`. |
| POST    | `/api/sync/applications/push`     | alle (RLS) | wie events/push; `sequence_no` ist server-vergeben (ADR-029); Auto-Participant für Performer/Recipient (ADR-012). |

Schema-Source-of-Truth: Frontend-RxDB-Schemas (`frontend/src/lib/rxdb/schemas/{event,application}.schema.json`) und Backend-Pydantic-Schemas (`backend/app/sync/schemas.py`) werden manuell parallel gepflegt; Drift-Test in `backend/tests/test_rxdb_schema_drift.py` schlägt bei Abweichungen fehl (ADR-031).

**Application n:m-Restraints (M7.5, ADR-046):** `ApplicationDoc.restraint_type_ids: uuid[]` ist ein denormalisiertes Set auf der Application-Sync-Doc; Schema-Version wurde dafür auf v1 bewegt mit einer Migration-Strategy `restraint_type_ids = []` für vorhandene v0-Docs (`frontend/src/lib/rxdb/database.ts`). `RxDBMigrationSchemaPlugin` ist zwingend registriert. Pull-Pfad lädt `application_restraint`-Rows in einer Bulk-IN-Query und materialisiert das Array; Push-Pfad diff't das eingehende Array gegen die DB-Tabelle (Set-Replace LWW), inkl. Approved-Catalog-Check für Editor (analog Position-FKs). Konflikt-Antworten enthalten das aktuelle Server-Set.

**RLS-Erweiterung in M5b.2:** `event_editor_select_own` und `application_editor_select_own` (Migration `20260426_1830_m5b2_owner_select`) lassen einen Editor seine eigenen Rows sehen, unabhängig von Participant-Mitgliedschaft. Notwendig, weil `INSERT … RETURNING` die SELECT-Policy auf der frisch eingefügten Zeile auswertet, bevor der Auto-Participant-Insert stattfindet (siehe ADR-033 §E).

**Soft-Delete-Filter:** Bestehende CRUD-/Search-/Export-Routes filtern `is_deleted = false` im Service-Layer (`app/services/events.py`, `applications.py`, `search.py`, `exports.py`). Sync-Endpoints sind die einzigen Konsumenten, die Tombstones noch zurückliefern (ADR-033 §D).

**Frontend-RxDB-Stack (M5b.3, ADR-034):** `frontend/src/lib/rxdb/` enthält Database (Lazy-Singleton mit Dexie-Storage-Adapter), Replication-Worker (`replicateRxCollection` pro Collection mit eigenem Pull-/Push-Handler), Provider (mountet im `(protected)/layout.tsx` zwischen `PinLockProvider` und `AppShell`). Live-Modus-Komponenten schreiben ausschließlich in RxDB (`events.insert`, `applications.insert`, `doc.patch({ended_at, updated_at})`); reactive Subscriptions auf `events.findOne(id).$` und `applications.find({event_id, _deleted=false}).$` ersetzen das vorherige TanStack-Query-Polling. Sync-Status (`idle | active | offline | error`) zeigt eine kleine Pill in Sidebar und Mobile-Header an.

**E2E-Offline-Test-Stack (M5b.4, ADR-035):** `frontend/tests/replication.e2e.test.ts` boot der echten `lib/rxdb/{database,replication}` gegen `fake-indexeddb` (Polyfill für jsdom) und einen In-Process-Mock-Server (`tests/helpers/sync-mock-server.ts`), der die vier Sync-Endpoints deterministisch in-memory implementiert. Drei Szenarien decken den Akzeptanz-Pfad: Offline-Insert → Reconnect → Exact-Once-Push, Re-Sync-Idempotenz, Pull-Round-Trip server-bumpter Felder. Async-Stabilisierung über `replication.{events,applications}.awaitInSync()` statt fester Timeouts (kein Flakiness-Risiko). Coverage `lib/rxdb/**` via `@vitest/coverage-v8` mit Threshold 80/70/80 (Lines/Branches/Functions); Stand 92.43 % Lines / 80 % Branches / 100 % Functions. Backend-seitig sichern drei Idempotenz-Tests in `backend/tests/test_sync_idempotency.py` die „genau einmal"-Eigenschaft auf Protokoll-Ebene (drei wiederholte Pushes → 1 Row, stabile `sequence_no`, kein Duplikat-Auto-Participant).

**Detail-Page Client-only (M5c.1a, ADR-036):** `(protected)/events/[id]/page.tsx` ist seit M5c.1a eine Client Component (`"use client"`). Auth läuft über `useMe()` (TanStack Query gegen `/api/users/me`); der Page-Renderer kombiniert drei async Signale — RxDB-Subscription auf `events.findOne(id).$` (mit Resolved-Flag zur Unterscheidung „noch nicht geantwortet" vs. „RxDB hat es nicht"), One-Shot-REST-Fetch auf `/api/events/{id}` für `plus_code` und `participants`, und den Auth-Hook. Der Render-Entscheidungsbaum (ADR-036 §H) liefert vier Zustände: Skeleton bei Loading, Hard-404 via `notFound()` wenn beide Quellen das Event nicht kennen, REST-Daten bei Online-Reload, oder ein synthetisierter `EventDetail` aus dem RxDB-Doc (mit leerem `plus_code` / `participants`) im Offline-Insert-mit-direkter-Navigation-Fall.

**Participants als RxDB-Sync-Collection (M5c.1b, ADR-037):** `event_participant` ist seit M5c.1b sync-fähig — Migration ergänzt eine Surrogate `id uuid` PK (RxDB-Anforderung) zusätzlich zur `(event_id, person_id)`-UNIQUE, plus `updated_at` / `is_deleted` / `deleted_at` / Cursor-Index analog ADR-030 und einen `set_updated_at`-Trigger. Die `cascade_event_soft_delete()`-Funktion bringt beim Event-Soft-Delete jetzt `application` **und** `event_participant` mit. Backend liefert `GET /api/sync/event-participants/pull` (Pull-only — Mutationen laufen weiter über REST `POST/DELETE /api/events/{id}/participants/...` und den serverseitigen Auto-Participant-Trigger aus ADR-012); RLS lehnt sich an die bestehende `event_participant_member_select`-Policy via `app_user_can_see_event` an. Frontend führt eine dritte RxDB-Collection `event_participants` mit Pull-only-Replication. Die Detail-Page kombiniert die reactive Mitgliedschaft (RxDB) mit dem REST-`EventDetail`-Snapshot für Person-Details und triggert ein REST-Refetch, sobald die Subscription eine person_id liefert, die der Snapshot nicht kennt — der typische Auto-Participant-nach-Offline-Reconnect-Roundtrip ist damit reactive geschlossen, ohne `Person` selbst in RxDB zu promoten.

**Edit-Pfad (M5c.4, ADR-040):** Eigene Route `/events/[id]/edit` mit Server-Side-RBAC-Gate (anonym → Login; Viewer → Detail-Read-only; Editor mit fremdem Event → Detail-Read-only; Admin und Editor mit eigenem Event → Edit-Form). Der `canEditEvent`-Helper in `frontend/src/lib/rbac.ts` ist die kanonische RBAC-Logik für beide Enforcement-Punkte (Server-Redirect + Edit-Button-Conditional in `EventDetailView`). `EventEditForm` lädt Event und Applications einmal aus RxDB und patcht beim Submit nur die geänderten Docs (Diff-basiert, ADR-040 §F). Editierbare Felder folgen ADR-029 (note, recipient, ended_at-FWW); immutable Felder sind read-only oder bewusst aus dem Scope (Performer + Position-FKs, ADR-040 §K). Soft-Delete via `doc.patch({_deleted: true})` mit `window.confirm`-Bestätigung — der bestehende `cascade_event_soft_delete`-Trigger (M5b.1 + M5c.1b) tombstoned Applications und EventParticipants server-seitig. Restore (`true → false`) bleibt Admin-Workflow für M8.

**Nachträgliche Erfassung (M5c.3, ADR-039):** Neuer Pfad `/events/new/backfill` mit `EventBackfillForm`-Komponente parallel zum Live-Pfad `/events/new`. Editierbare `datetime-local`-Inputs für Event-`started_at` (Pflicht) und `ended_at` (optional), wachsende Application-Liste mit eigenen Zeitstempeln/Recipient/Notiz pro Zeile. Validierung läuft über `lib/event-backfill-validation.ts` (pure Funktion: Pflichtfelder, Ende ≥ Start, App-Grenzen innerhalb Event, keine Überlappung; berührende Enden sind kein Konflikt) und liefert Inline-Fehler plus Toast-Sammelmeldung. Submit sortiert Applications nach `started_at` und schreibt Event + Applications mit `sequence_no = i+1` über den unveränderten RxDB-Insert-Pfad — Auto-Participant-Trigger, Sync-Replication und Backend-RLS funktionieren wie im Live-Modus. Dashboard zeigt einen sekundären „Nachträglich erfassen"-Button neben dem primären Live-Start für Editor und Admin (Viewer wird per Server-Redirect ausgeblendet).

**Unified EventDetailView (M5c.2, ADR-038):** Die ursprünglich getrennten `LiveEventView` (laufend) und `EndedEventView` (Stub) sind seit M5c.2 zu einer einzigen `EventDetailView` in `frontend/src/components/event/event-detail-view.tsx` zusammengeführt. Drei Abschnitte: Status-Card mit Live-Timer und konditional gerenderten Quick-Actions („Neue Application", „Aktuelle beenden", „Event beenden") nur wenn `isLive`; `ApplicationsTimeline` mit chronologischer Application-Liste und expliziten „Pause"-Markern für Lücken ≥ 1 s zwischen zwei beendeten Applications (laufende Vorgänger erzeugen keine Lücke); `ParticipantsList` mit Frontend-Maskierung über `lib/masking.ts`. Die Maskierungs-Funktion `maskParticipants(participants, event, currentPersonId)` ist eine reine Funktion, die die Backend-Regel aus `app/services/masking.py` exakt spiegelt (`reveal_participants=true` → unverändert; sonst eigener Eintrag unverändert, alle anderen mit Placeholder `[verborgen]` + null-Alias/Note). Sie ergänzt die Backend-Schicht als Defense-in-Depth gegen stale TanStack-Query-Caches und zukünftige Code-Pfade, die Person-Daten ohne Server-Roundtrip liefern.

### Admin-UI (SQLAdmin, siehe ADR-016)

| Methode | Pfad            | Rolle  | Zweck                                        |
|---------|-----------------|--------|----------------------------------------------|
| ALL     | `/admin/*`      | admin  | SQLAdmin-Oberfläche für CRUD auf allen Tabellen, mit Cookie-Session-Auth-Bridge zu fastapi-users |

### Suche, Export und Throwbacks (siehe ADR-015)

| Methode | Pfad                        | Rolle  | Zweck                                                |
|---------|-----------------------------|--------|------------------------------------------------------|
| GET     | `/api/search?q=...`         | alle (RLS) | Volltextsuche über Notizen aller sichtbaren Events und Applications |
| GET     | `/api/throwbacks/today`     | alle (RLS) | Events vom heutigen Datum in vergangenen Jahren („On this day") |
| GET     | `/api/export/me`            | alle   | Eigene Events als JSON oder CSV (Query: `?format=json\|csv`) |
| GET     | `/api/admin/export/all`     | admin  | Vollständiger Export aller Events                    |

---

## Frontend-Architektur

### Routing (App Router)

```
/                          → Dashboard (auth required)
/login                     → Login
/events                    → Liste
/events/new                → Erfassen
/events/[id]               → Detail
/events/[id]/edit          → Bearbeiten
/map                       → Kartenansicht
/admin                     → Admin-Übersicht (admin-only, in Route-Group `(admin-only)`)
/admin/users               → User-Verwaltung (admin-only, M8)
/admin/catalogs            → Katalog-Verwaltung — sichtbar für admin und editor (M7.2 ff.).
                             Server-Redirect → /admin/catalogs/restraint-types.
/admin/catalogs/[kind]     → Listing pro Katalog-Typ mit Status-Filter (URL `?status=`).
/admin/persons             → Personen-Verwaltung (admin-only, M8)
/profile                   → Eigenes Profil, Passwort ändern
```

Schutz via Proxy (Next.js `proxy.ts`, vor Next 16 als `middleware.ts` bekannt — Umbenennung in STACK-001 / ADR-047): prüft Session-Cookie. RBAC-Gates pro Route im jeweiligen Server-Layout:

- `(protected)/admin/layout.tsx` lockert auf Mindestrolle Editor (`canViewCatalogAdmin`); damit erreichen Editoren `/admin/catalogs/...`.
- `(protected)/admin/(admin-only)/layout.tsx` strafft auf admin (für Admin-Übersicht und alles, was M8 hier ergänzt).
- `(protected)/events/[id]/edit/page.tsx` nutzt den `canEditEvent`-Helper (M5c.4, ADR-040).

### Daten-Fetching

- **TanStack Query** mit zentralem `QueryClient`.
- `lib/api.ts` als typisierter `fetch`-Wrapper (Credentials: `include`, CSRF-Header automatisch).
- Cache-Keys hierarchisch (`['events']`, `['events', id]`, `['catalogs', kind]`).
- Optimistic Updates für UX-kritische Aktionen (Event-Update, Sequenz-Verschiebung).

### Karten-Komponente

- `components/map/MapView.tsx` als Wrapper um `react-map-gl`.
- Tile-URL aus ENV (`NEXT_PUBLIC_TILE_URL`), in Phase 1 `/api/tiles/{z}/{x}/{y}` (Backend-Proxy), in Phase 2 lokaler Tileserver.
- Marker als React-Komponenten via `react-map-gl/Marker`.
- Clustering nativ über MapLibre-`cluster: true`-Source (siehe ADR-041 §C). `supercluster` wurde verworfen — bei Pfad-A-Datenmenge < 5.000 Events bringt es keinen Mehrwert gegenüber MapLibre-nativem Cluster.
- State (Viewport) mit URL-Sync (next/navigation `useSearchParams`).

### Plus-Code-Handling

- `lib/plus-code.ts`: Wrapper um `open-location-code`-NPM-Package.
- Eingabe akzeptiert: vollen Global-Code, Short-Code mit Ortsreferenz, Lat/Lon (Komma-getrennt).
- Karten-Klick liefert Lat/Lon → Plus Code wird erzeugt und im Formular-Feld angezeigt.

### Mobile First

- Tailwind-Breakpoints: Default = mobile, `md:` ab 768px, `lg:` ab 1024px.
- Bottom-Navigation auf mobile, Sidebar auf Desktop.
- Touch-Targets ≥ 44px.
- Karte: Pinch-Zoom, Double-Tap-Zoom aktiviert.

### Visuelle Gestaltung — Standard zuerst

Die konkrete visuelle Gestaltung (Farbpalette, Typografie-Wahl, Ikonografie, Layout-Details) wird im MVP **bewusst nicht spezifiziert**. Claude Code baut einen funktionalen, generischen Stand mit:

- Tailwind-Default-Farbpalette (neutral: Slate für Hintergründe, ein einzelner Akzent für interaktive Elemente — Wahl liegt bei Claude Code, klassisch z. B. Blue-600 oder Emerald-600).
- shadcn/ui-Default-Komponenten ohne starke visuelle Anpassung.
- System-Sans-Serif (Tailwind-Default `font-sans`).
- lucide-react als Icon-Set (Default in shadcn/ui).
- Dark-Mode-Variante automatisch via Tailwind, system-präferenz-gesteuert.

**Begründung:** Ohne ein lauffähiges Skelett vor Augen ist Farb- und Typografie-Diskussion abstrakter Aufwand. Sobald der erste Stand existiert, werden gezielte Anpassungen am realen UI vorgenommen — das ist effizienter und führt zu besseren Entscheidungen.

**Was Claude Code TUN soll:** sauberes, lesbares, konsistentes UI auf Tailwind/shadcn-Default-Niveau. Ausreichende Kontraste (WCAG AA mindestens). Mobile- und Desktop-Layouts entsprechend Mobile-First-Regeln.

**Was Claude Code NICHT tun soll:** keine eigene Designsprache erfinden, keine ungewöhnlichen Farbschemata wählen, keine Custom-Fonts einbinden, keine animierten Übergänge oder visuellen Spielereien jenseits sinnvoller Mikro-Interaktionen (Hover, Focus, Loading-Spinner).

**Spätere UI-Iteration:** Sobald M5a–M5c lauffähig sind, kommt eine eigene UI/UX-Reviewphase. Das ist kein Meilenstein im Fahrplan, sondern Teil der Konsolidierung.

### Live-Modus (siehe ADR-011)

Der Live-Modus ist die **Hauptansicht der App**. Performer erfassen Events
während sie geschehen, nicht nachträglich.

**UI-Fluss:**

1. **Startseite** zeigt einen großen Knopf „Neues Event starten" plus Liste der letzten Events.
2. **Tap auf „Neues Event starten":**
   - GPS wird angefragt (Browser-Geolocation-API), Lat/Lon vorbelegt.
   - Karte zeigt aktuelle Position, Performer kann durch Karten-Tap korrigieren.
   - Recipient wird ausgewählt (Personen-Liste).
   - `Event.started_at = now()`, Event-Datensatz angelegt.
   - Wakelock wird angefordert (Bildschirm bleibt an).
3. **Live-Ansicht des laufenden Events:**
   - Großer Timer für Gesamtdauer.
   - Liste bisheriger Applications mit eigenem Timer.
   - Schnellaktionen: „Neue Application starten", „Aktuelle Application beenden", „Event beenden".
4. **Application starten:**
   - `Application.started_at = now()`, `sequence_no` automatisch hochzählen.
   - Performer ist per Default der eingeloggte User, Recipient ist der Event-Recipient — beides überschreibbar.
   - Restraints, Positionen werden in Sekundärformularen gewählt; können auch nach „Application starten" noch nachgepflegt werden.
5. **Application beenden:** `ended_at = now()`. Die nächste Application kann sofort beginnen — die Lücke (Materialwechsel) ergibt sich automatisch aus `application[i].ended_at` < `application[i+1].started_at`. Der Notiz-Text der vorherigen Application kann optional die Lücke beschreiben.
6. **Event beenden:** `Event.ended_at = now()`. Wakelock freigeben. Zurück zur Startseite mit Bestätigung.

**Technische Anforderungen:**

- **Geolocation-API:** `navigator.geolocation.getCurrentPosition`. Funktioniert nur über HTTPS. Berechtigungsabfrage beim ersten Mal.
- **Wakelock-API:** `navigator.wakeLock.request('screen')` während eines laufenden Events. Browser-Support breit, aber nicht universell — Fallback: Hinweis an User „Bildschirm bitte nicht sperren".
- **Offline-Resilienz (siehe Meilenstein M5b, ADR-017):** Events und Applications werden clientseitig in RxDB (IndexedDB-Backend via Dexie) persistiert. Der Sync mit dem Backend läuft über das RxDB-Replication-Protokoll (`/api/sync/pull` und `/api/sync/push`). Bei Netzausfall bleibt die UI funktionsfähig; bei Reconnect wird automatisch nachsynchronisiert. Verhindert Datenverlust im Funkloch.
- **Optimistic Updates:** Application-Aktionen erscheinen sofort in der UI, Backend-Bestätigung im Hintergrund.
- **Server-Zeit als Wahrheit:** Lokale Zeitstempel werden mit Server-Zeit abgeglichen (Drift-Korrektur), bei Sync schreibt der Server seine Zeit als Wahrheit.

**Nachträgliche Erfassung:** sekundärer Modus, derselbe Datenpfad. Der Unterschied liegt nur darin, dass Zeitstempel manuell gesetzt werden statt aus `now()` zu kommen. Ein Schalter „Nachträglich erfassen" auf der Startseite ruft das gleiche Formular auf, mit editierbaren Zeitstempel-Feldern.

### App-PIN-Sperre (siehe ADR-015)

Clientseitige Schnellsperre der UI, unabhängig vom Auth-System.

**Funktionsweise:**
- User setzt im Profil eine 4–6-stellige PIN. Wird gehasht (Argon2 oder bcrypt, clientseitig via Web Crypto API) in IndexedDB abgelegt.
- App sperrt sich automatisch nach konfigurierbarer Inaktivität (Default: 60 Sekunden) oder per expliziter Aktion „Sperren".
- Sperrzustand zeigt PIN-Eingabe als Vollbild-Overlay, blockiert Navigation und alle UI-Aktionen.
- PIN-Eingabe entsperrt nur die UI — die Server-Session bleibt unberührt.
- Nach mehreren falschen Eingaben (z. B. 5×) wird die Server-Session zwangsbeendet (Logout), und ein vollständiges Re-Login ist nötig.

**Begrenzung:** Schützt vor Schulterblick und kurzer fremder Übernahme des Geräts. Nicht gegen einen Angreifer, der das Gerät entsperrt im Zugriff hat — das ist der Job von Geräte-Sperre und Auth-System.

### „On this day" auf Startseite (siehe ADR-015)

Auf der Startseite, unterhalb des „Neues Event starten"-Knopfs, eine Sektion „Vor X Jahren": zeigt Events vom heutigen Datum (Monat + Tag) in vergangenen Jahren. Nutzt `/api/throwbacks/today`, gefiltert nach RLS. Wenn keine Treffer: Sektion wird ausgeblendet.

---

## Deployment-Topologie (VPS)

### Komponenten

```
                      Internet
                          │
                       :443/:80
                          │
                       ┌──┴──┐
                       │Caddy│  (TLS, Reverse Proxy, HTTP/2)
                       └──┬──┘
              ┌───────────┼───────────┐
              │           │           │
        ┌─────┴───┐  ┌────┴────┐
        │frontend │  │ backend │
        │(Next.js)│  │(FastAPI)│
        └─────────┘  └────┬────┘
                          │
                     ┌────┴────┐
                     │postgres │
                     │+postgis │
                     └─────────┘
```

### Domains

- `app.hc-map.example` — Frontend (Next.js).
- `app.hc-map.example/api/*` — proxied auf Backend.
- Subdomain-Strategie ist möglich (`api.hc-map.example`), aber Same-Origin ist für Cookie-Auth einfacher.

### docker-compose.prod.yml — Skizze

Services:
- `caddy` — Reverse Proxy, automatisches TLS.
- `frontend` — Next.js (`node server.js` aus `next build`-Output, Mode `standalone`).
- `backend` — uvicorn mit FastAPI, mehrere Worker.
- `db` — Postgres 16 + PostGIS 3.
- `backup` — Cron-Container, der `pg_dump` + Verschlüsselung + Off-Site-Upload macht.

Volumes:
- `db-data` — Postgres-Datenverzeichnis.
- `caddy-data`, `caddy-config` — TLS-Zertifikate.
- `backup-staging` — temporäre Dump-Dateien vor Upload.

Networks:
- Internes Docker-Netz; nur Caddy hat Port-Mapping nach außen.

### Caddyfile — Skizze

```
app.hc-map.example {
    encode gzip zstd
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle /api/tiles/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
```

### Server-Hardening

- Nicht-Root-Benutzer für Container.
- UFW: nur 22 (SSH-Key-only), 80, 443 offen.
- fail2ban auf SSH und Caddy-Logs.
- Automatische Sicherheits-Updates (`unattended-upgrades`).
- Full-Disk-Encryption (LUKS) — bei VPS via Hoster-Konsole bei Setup oder via Init-Script.
- SSH: Key-only, kein Passwort, kein Root-Login.

### Backups

- Täglich `pg_dump` (custom-format), GPG- oder age-verschlüsselt.
- Aufbewahrung: 14 Tage täglich, 8 Wochen wöchentlich, 12 Monate monatlich.
- Off-Site: separater Hoster oder S3-kompatibler Bucket (Hetzner Storage Box, Backblaze B2 — Wahl in M13).
- Restore-Test gemäß Runbook in `ops/runbook.md`.

---

## Konventionen

### Git

- **Branching:** `main` ist deploybar, Feature-Branches `feat/<kurzname>`, Fixes `fix/<kurzname>`.
- **Commit-Messages:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Pull-Requests:** kein Force-Push auf `main`. Squash-Merge bevorzugt.
- **Tags:** Semver `v0.x.y` ab erstem Go-Live, davor unversioniert.

### Code-Style

- **Python:** ruff (linting + formatting), mypy strict für `app/`.
- **TypeScript:** eslint + prettier, `strict: true` in `tsconfig`.
- **Pre-commit:** ruff, prettier, eslint, mypy auf staged files.

### Naming

- Python: `snake_case` Funktionen/Variablen, `PascalCase` Klassen.
- TS: `camelCase` Variablen/Funktionen, `PascalCase` Komponenten/Typen.
- DB: `snake_case` Tabellen und Spalten, Singular für Tabellen.
- API-Pfade: `kebab-case` (`/restraint-types` nicht `/restraintTypes`).

### Tests

- Backend: `pytest`, `pytest-asyncio`, `httpx.AsyncClient` für API-Tests, `testcontainers` für echte Postgres in CI.
- Frontend: `vitest` für Unit, `playwright` für E2E (in Phase 2 sinnvoll, im MVP optional).
- Coverage-Ziel: nicht festgelegt, aber **alle RLS-Policies müssen Tests haben** — ohne Ausnahme.

### Konfiguration

- Alle Config über ENV, geladen via `pydantic-settings` im Backend, via `process.env` im Frontend.
- Server-only Variablen ohne `NEXT_PUBLIC_`-Präfix; client-sichtbare mit Präfix.
- `.env.example` ist gepflegt, jeder neue ENV-Var landet dort sofort.

### Logging

- Backend: strukturiertes JSON-Logging (z. B. `structlog`), Request-ID pro Request.
- Frontend: Konsole im Dev, in Prod nur Errors via einfachem Endpoint nach Backend (kein externes Tracking).
- Keine personenbezogenen Daten in Logs (keine Namen, keine Notizen, keine Lat/Lon).

### Migrations

- Jede DB-Änderung als Alembic-Migration. Keine manuellen Schema-Änderungen in Prod.
- Down-Migrations dort, wo machbar — Pflicht für reversible Schema-Änderungen.
- Seeds NICHT in Migrations (separate Skripte in `seeds/`).

### Secrets

- Niemals im Repo. `.env` gitignored, `.env.example` als Vorlage.
- Prod-Secrets in einer geschützten Datei auf dem VPS oder via Hoster-Secret-Store.

---

## Externe Abhängigkeiten

| Dienst                  | Zweck                              | Risiko / Plan                              |
|-------------------------|------------------------------------|--------------------------------------------|
| MapTiler Cloud (Tiles)  | Karten-Tiles in Phase 1            | Free-Tier 100k req/mo, Self-Host in Phase 2 (M12) |
| MapTiler Geocoding      | Adress-Suche                       | Gleicher Anbieter, gleiches Risiko-Profil  |
| Let's Encrypt (via Caddy)| TLS-Zertifikate                   | Etabliert, Fallback bei Ausfall überschaubar |
| Off-Site Backup-Storage | Backup-Ziel                        | Wahl in M13                                |

---

## Offene Punkte

Werden in Folge-Sessions oder ADRs konkretisiert:

- Konkreter Off-Site-Backup-Anbieter (M13).
- E-Mail-Versanddienst (vor M11, sobald Passwort-Reset produktiv gebraucht wird).
- Karten-Style: MapTiler-Preset oder eigener Style?
- Audit-Log-Strategie über `created_at`/`updated_at` hinaus — ob ein separates `event_log` nötig wird (Pfad B vermutlich ja).
- Dev/Staging-Environment auf dem VPS oder lokal-only?
