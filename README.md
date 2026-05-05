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

## Installation

Plus-Map wird **lokal aus dem Repo gebaut** (kein GHCR-Image). Stack-Name `plus-map`, eigene Container `plus-map-{db,backend,frontend}`, eigene Volumes, eigenes internes Netzwerk. Compose-Stack: [`docker/compose.plus-map.yml`](docker/compose.plus-map.yml).

Voraussetzungen auf dem Zielserver: Docker Engine + Docker Compose Plugin, ein Reverse Proxy mit TLS, ein DNS-Eintrag für die gewählte Subdomain.

### 1. Repo holen und Env vorbereiten

```bash
cd /opt
git clone git@github.com:Paddel87/Plus-Map.git plus-map
cd plus-map
cp .env.example .env.plus-map
```

In `.env.plus-map` mindestens setzen:

| Variable | Wert |
|---|---|
| `HCMAP_DB_USER` | `plus_map` |
| `HCMAP_DB_PASSWORD` | starkes Passwort |
| `HCMAP_DB_NAME` | `plus_map` |
| `HCMAP_SECRET_KEY` | mindestens 32 Zeichen Zufall |
| `HCMAP_BASE_URL` | `https://<subdomain>` |
| `HCMAP_MAPTILER_API_KEY` | eigener Key (Karten-Tiles) |

Die `HCMAP_*`-Variablennamen sind beibehalten, weil das Backend sie als Settings-Präfix erwartet — sie sind nur intern und nicht im UI sichtbar.

### 2. Stack starten — drei Varianten je nach Reverse-Proxy-Lage

#### Variante A — Bestehender Traefik auf demselben Host (empfohlen)

Wenn auf dem Server bereits ein Traefik-Container läuft, der ein extern markiertes Docker-Netzwerk bedient (etwa weil dort schon eine andere App hängt), dockt Plus-Map sich an dieses Netzwerk an. Routing über Traefik-Labels, kein zusätzlicher Caddy/Traefik-Container.

Voraussetzungen am bestehenden Traefik:
- Sein Netzwerk muss in dessen Compose-Stack als `external: true` deklariert sein. Den Namen ermitteln mit `docker network ls` (typische Namen: `traefik`, `traefik-public`, `web`).
- Er hat `/var/run/docker.sock` (read-only) gemountet — sonst sieht er die Plus-Map-Labels nicht.
- Er hat einen funktionierenden `certresolver` für Let's Encrypt.

Zusätzliche Env in `.env.plus-map`:

```dotenv
PLUS_MAP_DOMAIN=plus-map.deine-domain.de
TRAEFIK_NETWORK=traefik             # Netzwerk-Name aus `docker network ls`
TRAEFIK_CERTRESOLVER=letsencrypt    # certresolver-Name aus deiner Traefik-Config
TRAEFIK_ENTRYPOINT=websecure        # i. d. R. websecure
```

Stack starten:

```bash
docker compose \
    -f docker/compose.plus-map.yml \
    -f docker/compose.plus-map.traefik.yml \
    --env-file .env.plus-map up -d --build
```

Der erste Start baut die Images aus dem Repo (5–10 Minuten). DB-Migrationen laufen automatisch beim Backend-Start.

DNS-Eintrag für `PLUS_MAP_DOMAIN` muss auf den Server zeigen. Zertifikat zieht Traefik automatisch via Let's Encrypt-Resolver.

#### Variante B — Standalone (eigener Reverse-Proxy beim User)

Ohne Traefik-Andockung läuft der Stack auf den Host-Loopback-Ports `127.0.0.1:3100` (Frontend) und `127.0.0.1:8100` (Backend). Der eigene Reverse-Proxy (Caddy, nginx, manueller Traefik-Eintrag, …) leitet die Subdomain dorthin weiter.

```bash
docker compose -f docker/compose.plus-map.yml --env-file .env.plus-map up -d --build
```

Beispiel-Caddyfile-Eintrag:

```
plus-map.deine-domain.de {
    reverse_proxy 127.0.0.1:3100
    @api path /api/* /sqladmin/*
    reverse_proxy @api 127.0.0.1:8100
}
```

#### Variante C — Cloudflare Tunnel (ohne DNS-Eintrag)

Für temporäre Test-Sessions ohne eigene Subdomain:

```bash
docker compose -f docker/compose.plus-map.yml --env-file .env.plus-map up -d --build
cloudflared tunnel --url http://127.0.0.1:3100
```

Tunnel-URL pro Session frisch teilen, danach beenden. Cloudflare stellt das Zertifikat. Backend-API ist nicht mit dem Default-Tunnel erreichbar (nur Frontend) — für Vollfunktion braucht es einen zweiten Tunnel oder Variante A/B.

### 3. Demo-Daten + Tester-Account anlegen

```bash
docker compose -f docker/compose.plus-map.yml exec backend \
    python -m scripts.seed_plus_map \
    --tester-email testerin@plus-map.example \
    --tester-password '<min-12-zeichen>' \
    --tester-name 'Testerin'
```

Das Skript ist idempotent (bricht ab, wenn der Tester-User bereits existiert). Resultat: 1 Editor-User, 4 Begleitungs-Personen, 10 Equipment-Einträge, 8 Demo-Touren mit insgesamt 16 Stopps.

### 4. Smoke-Test

- `https://<subdomain>` öffnen → Login-Seite
- Mit den Tester-Credentials einloggen → Dashboard mit den 8 Demo-Touren
- Karte öffnen → Marker in den Anker-Regionen sichtbar

### 5. Aufräumen nach dem Test

```bash
docker compose -f docker/compose.plus-map.yml --env-file .env.plus-map down -v
```

`-v` löscht das DB-Volume. Ohne `-v` bleibt die DB für eine Folge-Session erhalten.

Weitere Operator-Hinweise: [`ops/runbook.md`](ops/runbook.md).

## Status

Aktiver Test-Aufbau. Detaillierte Roadmap siehe [`docs/fahrplan.md`](docs/fahrplan.md).

## Lizenz

AGPL-3.0-only. Siehe [`LICENSE`](LICENSE).
