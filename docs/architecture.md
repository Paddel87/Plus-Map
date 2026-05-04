<!--
Zweck: Technische Spezifikation für Plus-Map.
       Wird mit konkreten Modul- und Schnittstellen-Beschreibungen befüllt,
       sobald die jeweiligen Bereiche aktiv ausgebaut werden.
-->

# Architektur — Plus-Map

## Überblick

Modularer Monolith, deployt als Docker-Compose-Stack:

- **Backend** — FastAPI (Python 3.12), PostgreSQL 16 / PostGIS 3
- **Frontend** — Next.js App Router (TypeScript strict), MapLibre GL, RxDB für Offline-Sync
- **Reverse Proxy** — Caddy oder Traefik, automatisches TLS via Let's Encrypt

## Module

- **Auth** — fastapi-users, Cookie-Sessions, RBAC (Admin/Editor/Viewer), CSRF.
- **Domain** — Touren, Stopps, Personen. Auto-Begleitungs-Trigger, Anonymisierung.
- **Catalog** — Ausrüstungs-Typen mit Vorschlags-Workflow.
- **Sync** — RxDB-Replication-Endpoints (`/api/sync/pull`, `/api/sync/push`).
- **Search & Export** — Postgres-Volltextsuche, JSON/CSV-Export.
- **Geocoding** — Plus-Code-Berechnung serverseitig, MapTiler-Geocoding-Proxy.
- **Admin-UI** — SQLAdmin unter `/sqladmin/`.
- **Frontend** — Live-Modus als Hauptansicht, Karte, Suche, Statistik.

## Kommunikationsmuster

- Synchron REST zwischen Frontend und Backend.
- RxDB-Replication asynchron im Hintergrund.
- Postgres direkt vom Backend, Row-Level-Security auf DB-Ebene.

## Detaillierte Spezifikation

Detaillierte Modul-, Schnittstellen- und Datenfluss-Beschreibungen werden hier ergänzt, sobald die jeweilige Komponente aktiv ausgebaut wird. Bis dahin gilt der Code als Quelle der Wahrheit.
