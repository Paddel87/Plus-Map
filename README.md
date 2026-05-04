# Plus-Map

Selbst gehostetes, geo-referenziertes Logbuch für Outdoor-Touren mit Plus-Code-Verortung. Erfasst Touren mit Begleitpersonen, sequenzierten Stopps und kartografischer Darstellung.

## Konzept

Plus-Map entstand aus einem ursprünglichen Plus-Code-Helfer, der nach und nach um ein Tour-Logbuch erweitert wurde. Eine Tour bündelt mehrere **Stopps** an einem Ort oder einer Route — etwa eine Wanderung mit Aussichtspunkten, eine Foto-Tour mit Motiven, ein Stadtspaziergang mit Sehenswürdigkeiten. Pro Stopp werden Erfasser, Begleitung und verwendete Ausrüstung festgehalten.

Kernmotiv: **Datensouveränität.** Eigene Instanz, eigene Datenbank, keine Cloud-Abhängigkeit (außer Karten-Tiles in der ersten Phase).

## Stack

- Backend: FastAPI (Python 3.12) + PostgreSQL 16 / PostGIS 3
- Frontend: Next.js App Router (TypeScript strict) + MapLibre GL + RxDB für Offline-Sync
- Auth: fastapi-users mit Cookie-Sessions, RBAC (Admin/Editor/Viewer)
- Container: Docker Compose, Caddy oder Traefik als Reverse Proxy
- Plus-Codes: openlocationcode (offene Alternative zu proprietären 3-Wort-Systemen)

## Status

Aktiver Test-Aufbau. Detaillierte Roadmap siehe [`docs/fahrplan.md`](docs/fahrplan.md).

## Lizenz

AGPL-3.0-only. Siehe [`LICENSE`](LICENSE).
