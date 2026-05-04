# Project Context — Plus-Map

<!-- Projektspezifischer Kontext. Wird zu Sessionbeginn als erste Datei gelesen.
     Dient als Entscheidungsgrundlage für alle autonomen Schritte der KI. -->

## 1. Kerndaten

- **Projektname:** Plus-Map
- **Kurzbeschreibung:** Selbst gehostetes, geo-referenziertes Logbuch für Outdoor-Touren mit Plus-Code-Verortung. Erfasst Touren mit Begleitpersonen, sequenzierten Stopps und kartografischer Darstellung.
- **Status:** Aktiver Test-Aufbau.
- **Version (SemVer):** v0.0.0 (vor Go-Live keine offizielle Version).
- **Dokumentationssprache:** Deutsch
- **Codesprache (Kommentare, Variablennamen):** Englisch
- **Projekttyp:** Full-Stack (Web-Backend + Web-Frontend, Mobile-First-PWA)

## 2. Zielgruppe und Nutzungskontext

- **Primäre Nutzer:** kleine, dem Betreiber persönlich bekannte Gruppe.
- **Sekundäre Nutzer / Betreiber:** ein Admin (zugleich Repository-Eigentümer).
- **Erwartete Last:** sehr gering — Größenordnung wenige Touren pro Tag.
- **Nutzungsumgebung:** Browser auf Mobilgerät (Hauptmodus, Live-Erfassung) und Desktop (Sekundärmodus, Auswertung).

## 3. Technischer Stack

### Fixiert

- **Sprachen und Versionen:** Python 3.12 (Backend), TypeScript strict (Frontend)
- **Frameworks:** FastAPI (Backend), Next.js App Router (Frontend)
- **Datenbank:** PostgreSQL 16 + PostGIS 3
- **Laufzeitumgebung:** Docker Compose
- **Package Manager:** uv (Python), pnpm (Node)

### Empfohlen (freigabefrei nutzbar)

- SQLAlchemy 2.0 + Alembic
- Pydantic v2
- fastapi-users
- SQLAdmin (Admin-UI parallel zu Next.js)
- openlocationcode (Plus-Code-Berechnung)
- structlog
- pytest, pytest-asyncio, httpx, testcontainers
- ruff, black, mypy
- Tailwind CSS, shadcn/ui
- TanStack Query
- react-map-gl + maplibre-gl
- RxDB + Dexie-Storage
- lucide-react

### Explizit nicht erlaubt

- Externe Cloud-Services für Datenhaltung (Self-Hosting-Prinzip; Ausnahme: MapTiler in Phase 1 für Tile-Auslieferung).
- Proprietäre 3-Wort-Adress-APIs.
- Google Maps, Mapbox GL ab v2 — Vendor-Lock-in.
- GPL-lizenzierte Abhängigkeiten ohne explizite Freigabe.
- localStorage/sessionStorage für Anwendungsdaten.

## 4. Architektur-Grobstruktur

Modularer Monolith: ein FastAPI-Backend, ein Next.js-Frontend, eine PostgreSQL-Datenbank. RxDB im Browser für Offline-Sync der Live-Erfassung.

**Module:**

- **Auth** — fastapi-users, Cookie-Sessions, RBAC, CSRF
- **Domain** (Touren, Stopps, Personen) — Kerngeschäftslogik
- **Catalog** — Ausrüstungs-Typen mit Vorschlags-Workflow
- **Sync** — RxDB-Replication-Endpoints
- **Search & Export** — Volltextsuche (Postgres `tsvector`), JSON/CSV-Export
- **Geocoding** — Plus-Code-Berechnung serverseitig, MapTiler-Geocoding-Proxy
- **Admin-UI** — SQLAdmin
- **Frontend** — Next.js mit Live-Modus als Hauptansicht

## 5. Constraints

### Datenschutz

- Keine personenbezogenen Daten in Logs (structlog mit Redaction-Liste).
- Anonymisierungsfunktion für Personen.

### Sicherheit

- Alle Endpoints erfordern Authentifizierung außer Health-Check und Auth-Endpoints.
- Passwörter mit Argon2id, minimum 12 Zeichen.
- CSRF-Schutz für State-Changing-Requests.
- App-PIN clientseitig.
- Row-Level-Security auf allen daten-führenden Tabellen.

### Performance

- Live-Modus-Aktionen unter 200 ms vom Tap bis lokale Persistierung.
- „On this day"-Endpoint unter 100 ms Antwortzeit.

## 6. Compliance und Lizenz

- **Projektlizenz:** AGPL-3.0-only.
- **Erlaubte Abhängigkeitslizenzen:** MIT, BSD-2/3, Apache-2.0, MPL-2.0, ISC, LGPL (dynamisch), GPL/AGPL.
- **Ausgeschlossen:** kommerzielle proprietäre Lizenzen, „source-available"-Lizenzen mit Nutzungsbeschränkungen (BSL, SSPL, Commons Clause).

## 7. Repository-Regeln

- **Hauptbranch:** `main`
- **Push-Regel:** Direkter Push auf `main` durch Admin erlaubt während früher Entwicklung.
- **Schutzregeln:** Keine Force-Pushes auf `main`. Tags ab erstem Go-Live mit SemVer-Schema (`v0.x.y`).

## 8. Entscheidungsbefugnisse

- **Freigabe-Entscheidungen trifft:** Repository-Eigentümer.
- **Reaktionszeit-Erwartung:** asynchron.
