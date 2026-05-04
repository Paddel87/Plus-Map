# Plus-Map Operator-Runbook

Schritt-für-Schritt-Anleitung für den Betrieb einer Plus-Map-Instanz.

## Status

Stub. Detaillierte Schritte (Provisionierung, Reverse-Proxy-Wahl, Backup-Drill, Restore-Test, Rotations-Pläne) werden ergänzt, sobald die Stack-Provisionierung aktiv ansteht.

## Mindest-Voraussetzungen

- Docker Engine + Docker Compose Plugin
- Reverse Proxy (Caddy oder Traefik) mit Let's Encrypt
- DNS-Eintrag für die gewählte Subdomain
- Gesetzte Pflicht-Env-Variablen aus [`.env.example`](../.env.example)

## Erst-Bootstrap (Kurzform)

1. `cp .env.example .env` und Werte für die Zielumgebung setzen.
2. `docker compose -f docker/docker-compose.yml up -d`
3. Bootstrap-Admin via Backend-CLI anlegen (Details werden hier ergänzt).
4. Login-Test über die konfigurierte Subdomain.
