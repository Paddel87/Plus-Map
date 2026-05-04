# Plus-Map Operator-Runbook

Schritt-für-Schritt-Anleitung für den Betrieb einer Plus-Map-Instanz.

## Mindest-Voraussetzungen

- Docker Engine + Docker Compose Plugin
- Reverse Proxy (Caddy oder Traefik) mit Let's Encrypt
- DNS-Eintrag für die gewählte Subdomain
- Gesetzte Pflicht-Env-Variablen aus [`.env.example`](../.env.example)

## Deployment auf einem Server (z. B. Nodica1)

Plus-Map läuft als eigenständiger Stack mit Stack-Name `plus-map`, eigenen Ports (3100 Frontend / 8100 Backend, beide auf `127.0.0.1` gebunden) und eigenen Volumes (`plus-map-db-data`).

### 1. Repo holen

```bash
cd /opt
git clone git@github.com:Paddel87/Plus-Map.git plus-map
cd plus-map
```

### 2. .env anlegen

```bash
cp .env.example .env.plus-map
```

In `.env.plus-map` mindestens setzen:

- `HCMAP_DB_USER=plus_map`
- `HCMAP_DB_PASSWORD=<starkes-passwort>`
- `HCMAP_DB_NAME=plus_map`
- `HCMAP_SECRET_KEY=<32+ Zeichen>`
- `HCMAP_BASE_URL=https://plus-map.<deine-domain>`
- `HCMAP_MAPTILER_API_KEY=<eigener-key>` (für Karten-Tiles)

### 3. Stack starten

```bash
docker compose -f docker/compose.plus-map.yml --env-file .env.plus-map up -d --build
```

Beim ersten Lauf werden die Images aus dem Repo gebaut (5–10 Minuten). Datenbank-Migrationen laufen automatisch beim Backend-Start.

### 4. Reverse-Proxy

Den bestehenden Caddy/Traefik auf dem Host so erweitern, dass die Subdomain `plus-map.<deine-domain>` an `127.0.0.1:3100` weiterleitet. Beispiel-Caddyfile-Eintrag:

```
plus-map.deine-domain.de {
    reverse_proxy 127.0.0.1:3100
    @api path /api/* /sqladmin/*
    reverse_proxy @api 127.0.0.1:8100
}
```

### 5. Demo-Daten + Tester-Account seeden

```bash
docker compose -f docker/compose.plus-map.yml exec backend \
    uv run python -m scripts.seed_plus_map \
    --tester-email testerin@plus-map.example \
    --tester-password '<min-12-chars>' \
    --tester-name 'Testerin'
```

Das Skript ist idempotent (bricht ab, wenn der Tester-User bereits existiert).

### 6. Smoke-Test

- `https://plus-map.<deine-domain>` öffnen → Login-Seite
- Mit den Tester-Credentials einloggen → Dashboard mit ~8 Demo-Touren
- Karte öffnen → Marker in den Demo-Anker-Regionen sichtbar

### 7. Tunnel-Variante (optional, für Test ohne Subdomain)

Wenn keine eigene Subdomain bereitgestellt werden soll, kann der Stack lokal laufen und per Cloudflare Tunnel kurzzeitig veröffentlicht werden:

```bash
cloudflared tunnel --url http://127.0.0.1:3100
```

Tunnel-URL der Testerin pro Session frisch teilen, danach beenden.

## Aufräumen nach dem Test

```bash
docker compose -f docker/compose.plus-map.yml --env-file .env.plus-map down -v
```

`-v` löscht die Volumes (Demo-Daten weg). Ohne `-v` bleibt die DB für eine Folge-Session erhalten.
