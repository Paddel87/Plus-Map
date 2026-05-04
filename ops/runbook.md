# HC-Map Operator-Runbook

Schritt-für-Schritt-Anleitung, um eine eigene HC-Map-Instanz auf einem
Linux-VPS in Betrieb zu nehmen, sicher zu betreiben, zu aktualisieren und
nach einem Datenverlust wiederherzustellen.

Dieses Runbook gehört zum Release Candidate `v0.1.0-rc.1` und setzt
[ADR-051](../docs/decisions.md#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann)
als Entscheidungsgrundlage voraus. Wenn etwas hier widersprüchlich zur
ADR ist, gilt die ADR — bitte einen Issue öffnen.

> **Zielgruppe:** technisch versierter Admin einer kleinen, einander
> persönlich bekannten Gruppe (Pfad A, <20 Personen). Du brauchst Linux-
> CLI-Sicherheit, einen DNS-Eintrag, ein Mail-Gateway und ein
> Off-Site-Backup-Ziel.

---

## Inhalt

1. [Voraussetzungen](#1-voraussetzungen)
2. [Server vorbereiten](#2-server-vorbereiten-ssh-hardening--docker)
3. [Repository und Konfigurations-Files](#3-repository-und-konfigurations-files)
4. [Reverse-Proxy wählen](#4-reverse-proxy-wählen)
5. [Mail-Backend (SMTP)](#5-mail-backend-smtp)
6. [Backup-Verschlüsselung — age-Key](#6-backup-verschlüsselung--age-key)
7. [Backup-Ziel — rclone-Remote](#7-backup-ziel--rclone-remote)
8. [Stack starten](#8-stack-starten)
9. [Admin-Bootstrap](#9-admin-bootstrap)
10. [Smoke-Test](#10-smoke-test)
11. [Update-Pfad](#11-update-pfad)
12. [Restore-Drill](#12-restore-drill-pflicht-vor-go-live)
13. [Betriebs-Spickzettel](#13-betriebs-spickzettel)
14. [Häufige Stolperer](#14-häufige-stolperer)

---

## 1. Voraussetzungen

| Bereich | Mindestanforderung | Empfehlung |
|---|---|---|
| VPS | x86_64 oder arm64, 2 vCPU, 2 GB RAM, 20 GB SSD | Hetzner CX22 (EU), 4 GB RAM, 40 GB |
| OS | Debian 12 oder Ubuntu 22.04+ (LTS) | Debian 12 stable |
| Disk-Encryption | Full-Disk-Encryption oder LUKS-Datenpartition | LUKS auf `/var/lib/docker` |
| Domain | A- (und idealerweise AAAA-) Record auf die VPS-IP | eigener (Sub-)Domain wie `hc-map.example.org` |
| Inbound | TCP 22 (SSH, gefiltert), TCP 80/443 (HTTP/HTTPS) | UFW oder `nftables` mit Whitelist |
| Mail-Gateway | SMTP-Submission (587 STARTTLS oder 465 implicit-TLS) mit User+Passwort | Mailgun EU, Brevo, SES, eigener Postfix-Submit |
| Backup-Ziel | rclone-kompatibel: SFTP (Hetzner Storage Box), B2, S3, Wasabi, … | mind. 5× geschätzte Datenbankgröße als Quote |
| Lokale Tools (auf deinem Arbeitsplatz) | `age`, `rclone`, `ssh`, `git`, optional `gpg` für signierte Tags | aktuelle Stable |

**Daten-Sensitivität:** HC-Map verarbeitet Daten der Kategorie Art. 9 DSGVO
(Sexualleben). Du übernimmst als Admin dieselbe Vertrauensrolle wie der
VPS-Hoster (siehe
[ADR-001](../docs/decisions.md#adr-001--hoster-vertrauensmodell)). Vor
produktivem Go-Live müssen alle Mitglieder die Einwilligung unterschrieben
haben — Vorlage:
[`docs/templates/consent-de.md`](../docs/templates/consent-de.md).

---

## 2. Server vorbereiten (SSH-Hardening + Docker)

### 2.1 SSH-Hardening

Vom Arbeitsplatz aus:

```bash
ssh-copy-id root@<vps-ip>          # falls noch nicht geschehen
ssh root@<vps-ip>
```

Auf dem Server:

```bash
adduser hcmap
usermod -aG sudo hcmap

# Key des Operator-Accounts hinterlegen
install -d -m 700 /home/hcmap/.ssh
cp /root/.ssh/authorized_keys /home/hcmap/.ssh/authorized_keys
chown -R hcmap:hcmap /home/hcmap/.ssh
chmod 600 /home/hcmap/.ssh/authorized_keys

# sshd härten
sed -i \
    -e 's/^#\?PermitRootLogin.*/PermitRootLogin no/' \
    -e 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' \
    -e 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' \
    /etc/ssh/sshd_config
systemctl restart ssh

# Firewall (Beispiel: ufw)
apt-get update && apt-get install -y ufw fail2ban
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
systemctl enable --now fail2ban
```

Ab jetzt Login als `hcmap`, alles weitere mit `sudo`.

### 2.2 Docker Engine + Compose v2

```bash
# Offizielles Docker-Repo (Debian-Beispiel)
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg \
     -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
     | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
                        docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker hcmap
newgrp docker

docker version
docker compose version    # v2.x erwartet
```

### 2.3 DNS

Stelle sicher, dass dein A- (und AAAA-) Record für `HCMAP_DOMAIN` auf die
VPS-IP zeigt **bevor** du den Stack startest. Andernfalls scheitern die
Let's-Encrypt-Challenges mit `403 unauthorized` und Rate-Limit-Strafen.

```bash
dig +short A   hc-map.example.org
dig +short AAAA hc-map.example.org
```

---

## 3. Repository und Konfigurations-Files

```bash
sudo install -d -o hcmap -g hcmap /srv/hc-map
cd /srv/hc-map
git clone https://github.com/Paddel87/hc-map.git .
git checkout v0.1.0-rc.1     # oder den aktuellen RC-Tag
```

> **Hinweis:** Der Repo-Klon dient nur als Quelle für Compose-Files,
> Beispiele und Skripte. Die Anwendungs-Container kommen aus GHCR — du
> baust nichts selbst.

### 3.1 Production-Env

```bash
cp .env.example .env.prod
chmod 600 .env.prod
$EDITOR .env.prod
```

Pflichtfelder im Production-Block (Datei sucht nach `?` in der
[`compose.prod.yml`](../docker/compose.prod.yml) — fehlt eines, weigert
sich Compose zu starten):

| Variable | Beispiel | Bedeutung |
|---|---|---|
| `HCMAP_DB_USER` / `_PASSWORD` / `_NAME` | `hcmap` / `<langes Random-PW>` / `hcmap` | Postgres-Anmeldedaten — beim ersten Start wird die DB damit angelegt, danach **nicht mehr ändern** |
| `HCMAP_SECRET_KEY` | `openssl rand -hex 32` | Mind. 32 Zeichen, Wechsel invalidiert alle Sessions |
| `HCMAP_DOMAIN` | `hc-map.example.org` | Identisch zu deinem DNS-Eintrag |
| `HCMAP_ACME_EMAIL` | `admin@example.org` | Let's-Encrypt-Kontakt; nur der Reverse-Proxy nutzt ihn |
| `HCMAP_BASE_URL` | `https://hc-map.example.org` | Wird in Reset-Mails als Link-Origin eingesetzt |
| `HCMAP_BACKUP_REMOTE` | `hetzner` | Name des rclone-Remotes (siehe Abschnitt 7) |
| `HCMAP_BACKUP_PREFIX` | `hc-map` | Pfadpräfix auf dem Remote |
| `HCMAP_IMAGE_TAG` | `0.1.0-rc.1` | Pinne den genauen RC-Image-Tag (ohne `v`-Prefix — `metadata-action`-Konvention) — `:rc` bewegt sich rolling |
| `HCMAP_MAPTILER_API_KEY` | `<MapTiler-Cloud-Key>` | Pflicht für Karte und Geocoding (Free-Tier reicht) |
| `HCMAP_SMTP_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_FROM` | s. Abschnitt 5 | Pflicht in Produktion, sonst Reset-Mails landen nur im Log |

Optional, aber prüfen:

- `HCMAP_COOKIE_DOMAIN` leer lassen, außer du brauchst Cross-Subdomain-
  Sessions — Default `host-only` ist sicherer.
- `HCMAP_LOG_LEVEL=INFO` (Default). `DEBUG` nur kurzzeitig — die
  Redaction-Regeln (siehe `project-context.md` §6) gelten unabhängig
  davon, aber DEBUG zieht Performance-Logs hoch.
- `HCMAP_GEOCODE_RATE_PER_MINUTE=30` reicht für <20 Nutzer; höher nur,
  wenn du legitime 429er beobachtest.

Für eine reibungslose Erstinbetriebnahme empfiehlt sich, in
`.env.prod` den Wert `HCMAP_BACKUP_RUN_ON_START=1` zunächst auf `1` zu
setzen, damit der erste Backup sofort beim Stack-Start läuft. Nach dem
Restore-Drill (Abschnitt 12) wieder auf `0` zurückstellen — sonst
schreibt jeder Container-Restart einen zusätzlichen Daily-Snapshot.

---

## 4. Reverse-Proxy wählen

HC-Map liefert zwei Overlays. Wähle eines, kopiere die Beispiel-
Konfigurationsdatei in die nicht-getrackte Working-Copy und passe nur an,
wenn du eine Sonderanforderung hast.

### 4.1 Caddy (empfohlen für die schlanke Erstinbetriebnahme)

```bash
cp docker/Caddyfile.example docker/Caddyfile
# Default ist meistens passend — wer extra Routes oder Headers braucht,
# editiert hier.
```

Stack-Start (siehe Abschnitt 8) verwendet dann
`-f docker/compose.prod.yml -f docker/compose.caddy.yml`.

### 4.2 Traefik (empfohlen, wenn du schon einen Traefik-Stack betreibst)

```bash
cp docker/traefik/traefik.yml.example docker/traefik/traefik.yml
cp docker/traefik/dynamic.yml.example docker/traefik/dynamic.yml
```

Stack-Start (siehe Abschnitt 8) verwendet dann
`-f docker/compose.prod.yml -f docker/compose.traefik.yml`.

### 4.3 Eigener vorhandener Reverse-Proxy

Wenn du schon einen Reverse-Proxy auf dem Host fährst (nginx, HAProxy,
externer LB), startest du den Stack **ohne** Overlay und mappst die
internen Ports an Loopback:

```yaml
# docker/compose.prod.override.yml — nicht im Repo, lege es selbst an
services:
  backend:
    ports:
      - "127.0.0.1:8000:8000"
  frontend:
    ports:
      - "127.0.0.1:3000:3000"
```

Der externe Reverse-Proxy muss dann:

- alle `/api/*`- und `/sqladmin/*`-Routes an `127.0.0.1:8000` weiterreichen,
- alles andere (inkl. `/admin/*` für die Frontend-Admin-Seiten) an `127.0.0.1:3000`,
- `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For` setzen,
- TLS terminieren und HTTP→HTTPS-Redirect erzwingen.

Ein Beispiel für nginx ist nicht Teil des RC-Scopes (siehe ADR-051 §B);
Caddy/Traefik decken die typischen Fälle ab.

> **Stolperer SSR↔Backend (Issue #15, ADR-053):** Das Frontend-Server-Side-
> Rendering ruft das Backend **direkt** aus dem Container heraus auf — der
> Reverse-Proxy sieht diesen Verkehr nicht. Default ist `BACKEND_INTERNAL_URL=
> http://backend:8000` und funktioniert, solange der Frontend-Container den
> Backend-Container über den Compose-internen Hostname `backend` erreicht.
> Wenn dein externer Reverse-Proxy auf einem **anderen Compose-Netz** sitzt
> oder du Backend/Frontend in **getrennte Compose-Stacks** trennst, ist der
> Hostname `backend` aus Frontend-Sicht nicht mehr auflösbar — dann musst du
> `BACKEND_INTERNAL_URL` in deiner `.env.prod` explizit auf den im jeweiligen
> Setup erreichbaren Backend-Hostname setzen (z. B. den Container-Namen
> `hcmap-backend` oder einen vom Operator vergebenen DNS-Eintrag im
> Reverse-Proxy-Netz). Symptom bei falschem Wert: jede SSR-Seite liefert
> eine Next.js-Application-Error-Page, in `docker compose logs frontend`
> steht `connect ECONNREFUSED <hostname>:8000`.

> **Migration ab RC-3 (Issue #19, ADR-055):** SQLAdmin ist von `/admin/`
> auf `/sqladmin/` umgezogen. Der Repo-Patch greift in `Caddyfile.example`
> und `compose.traefik.yml`-Overlay automatisch — bei einem **eigenen**
> Reverse-Proxy außerhalb der Compose-Overlays (Variante 4.3) musst du
> die Routing-Regel **manuell** umstellen, sonst landet `/admin/catalogs`
> (Frontend-Admin-Seite) weiter beim Backend und liefert 404. Konkret:
> die alte Regel `/admin/*` → backend in zwei Regeln aufsplitten —
> `/sqladmin/*` → backend, alles andere unter `/admin/*` ans Frontend
> (gemäß der Liste oben in §4.3 mit `/api/*` + `/sqladmin/*` ans Backend,
> Rest ans Frontend). Verifikation per `curl`: `GET /admin/catalogs`
> liefert nach Patch ein `307 → /login?next=…` (Frontend-Auth-Guard),
> nicht mehr ein `404` aus dem Backend-Log mit `route=/admin/catalogs`.

---

## 5. Mail-Backend (SMTP)

HC-Map versendet aktuell zwei Mails: **Passwort-Reset** und (Phase 2)
E-Mail-Verify. Ohne SMTP-Konfiguration läuft das Backend mit dem
`LoggingBackend`-Stub — Reset-Links landen dann nur im strukturierten
Log und Mitglieder können sich nicht selbst zurücksetzen.

| SMTP-Setup | Empfohlene Settings |
|---|---|
| Submission Port 587 (STARTTLS, Standard) | `HCMAP_SMTP_PORT=587`, `HCMAP_SMTP_STARTTLS=true`, `HCMAP_SMTP_USE_TLS=false` |
| Implicit-TLS Port 465 | `HCMAP_SMTP_PORT=465`, `HCMAP_SMTP_STARTTLS=false`, `HCMAP_SMTP_USE_TLS=true` |
| Lokaler Postfix ohne Auth (Port 25) | `HCMAP_SMTP_PORT=25`, `HCMAP_SMTP_STARTTLS=false`, `HCMAP_SMTP_USE_TLS=false`, `HCMAP_SMTP_USER`/`_PASSWORD` leer lassen |

Pflichtfelder bei produktivem SMTP-Versand:

- `HCMAP_SMTP_HOST` (z. B. `smtp.eu.mailgun.org`)
- `HCMAP_SMTP_FROM` (z. B. `hc-map@example.org`) — muss dem
  SPF/DKIM-Setup deines Anbieters entsprechen, sonst wird die Mail
  zurückgewiesen oder als Spam einsortiert.
- `HCMAP_BASE_URL` muss die öffentliche Frontend-URL sein, da die
  Reset-Links daraus generiert werden.

Ein Smoketest gegen MailHog (lokal) reicht nicht für Produktion — der
echte Anbieter wird im Restore-Drill (Abschnitt 12) und beim
RC-Voll-Smoke (M10.9) noch einmal explizit angefragt.

---

## 6. Backup-Verschlüsselung — age-Key

Der Backup-Container fährt das Pipeline-Trio
`pg_dump | age | rclone rcat` und kennt **nur den Public-Key**. Die
Private-Key-Datei darf niemals in den Container gelangen — sonst kann
der Hoster (oder ein Angreifer mit Container-Zugriff) Backups
entschlüsseln.

### 6.1 Schlüsselpaar erzeugen (auf deinem Arbeitsplatz, nicht auf dem VPS)

```bash
brew install age          # macOS — oder: apt-get install -y age (Debian)
age-keygen -o hc-map.age.key
chmod 600 hc-map.age.key
```

Output:

```
Public key: age1xy...                 ← in age-recipients.txt
# created: 2026-05-01T...
# public key: age1xy...
AGE-SECRET-KEY-...                   ← bleibt lokal, NIEMALS verteilen
```

### 6.2 Public-Key auf dem Server hinterlegen

```bash
cd /srv/hc-map
cp docker/secrets/age-recipients.txt.example docker/secrets/age-recipients.txt
chmod 640 docker/secrets/age-recipients.txt
$EDITOR docker/secrets/age-recipients.txt
```

Die einzige Pflichtzeile ist die Public-Key-Zeile aus Schritt 6.1
(`age1...`). Kommentare beginnen mit `#` und werden ignoriert.

### 6.3 Private-Key sichern

**Pflicht:** Mindestens **zwei** unabhängige Kopien des Private-Keys
(z. B. Passwort-Manager + verschlüsselter USB-Stick im Bankschließfach).
**Verlust = unwiederbringlicher Datenverlust** — Backups sind dann
mathematisch nicht mehr lesbar.

**Optional, aber sinnvoll:** Zwei-Personen-Split. Lege ein zweites
Schlüsselpaar an, hänge dessen Public-Key in
`docker/secrets/age-recipients.txt` ein zweite Zeile, gib den zweiten
Private-Key an eine Vertrauensperson außerhalb der Gruppe (z. B.
juristisch beratende Person) zur Verwahrung. Beide Schlüssel können
unabhängig restoren.

### 6.4 Schlüssel-Rotation (jährlich empfohlen)

1. Neues Schlüsselpaar erzeugen.
2. Public-Key zusätzlich in `age-recipients.txt` eintragen
   (nicht ersetzen!) und Stack neu starten.
3. Mindestens 14 Tage warten, damit beide alten Daily-Backups durch
   neue Mehr-Recipient-Backups ersetzt werden.
4. Alte Public-Key-Zeile aus `age-recipients.txt` entfernen.
5. Alten Private-Key archivieren (nicht löschen — alte Backups bleiben
   sonst unentschlüsselbar).

---

## 7. Backup-Ziel — rclone-Remote

HC-Map gibt keinen Anbieter vor. Die Datei
[`docker/secrets/rclone.conf.example`](../docker/secrets/rclone.conf.example)
listet vier Templates. Wähle eines, fülle die Werte ein, speichere als
`docker/secrets/rclone.conf` (gitignored). Der Sektionsname (z. B.
`[hetzner]`) muss zu deinem `HCMAP_BACKUP_REMOTE` aus `.env.prod`
passen.

```bash
cp docker/secrets/rclone.conf.example docker/secrets/rclone.conf
chmod 640 docker/secrets/rclone.conf
$EDITOR docker/secrets/rclone.conf
```

### 7.1 Hetzner Storage Box (SFTP)

In der Hetzner-Robot-UI eine Storage Box anlegen, Sub-Account mit
SSH-Zugriff erzeugen. Dann:

```ini
[hetzner]
type = sftp
host = u123456.your-storagebox.de
user = u123456
pass = OBSCURED
```

`pass` wird mit `rclone obscure '<dein-Passwort>'` erzeugt (lokal, nicht
auf dem VPS — sonst landet das Klartextpasswort in der Shell-History).

### 7.2 Backblaze B2

Bucket erstellen (Lifecycle: keep all versions; HC-Map managed
Retention selbst). Application-Key mit `Read and Write` auf genau
diesen Bucket erzeugen.

```ini
[b2]
type    = b2
account = 0014a1b2c3d4e5f6
key     = K001abcdefghijklmnopqrstuvwxyz0123456789
```

### 7.3 Generisches S3 (AWS, MinIO, Wasabi, …)

```ini
[s3]
type              = s3
provider          = AWS              # oder Minio, Wasabi, Other, …
access_key_id     = AKIA...
secret_access_key = wJalrXUtn...
region            = eu-central-1
endpoint          =                  # leer für AWS, sonst MinIO/Wasabi-URL
```

### 7.4 Lokal (nur für den Restore-Drill)

```ini
[local]
type = local
```

Mit `HCMAP_BACKUP_PREFIX=/var/backups/hc-map`. Das ist **kein
Off-Site-Backup** und nur für den ersten Restore-Drill geeignet — danach
auf einen echten Remote umstellen.

### 7.5 Remote testen

```bash
rclone --config docker/secrets/rclone.conf listremotes
rclone --config docker/secrets/rclone.conf lsd hetzner:
echo hello | rclone --config docker/secrets/rclone.conf rcat hetzner:hc-map/test.txt
rclone --config docker/secrets/rclone.conf cat hetzner:hc-map/test.txt
rclone --config docker/secrets/rclone.conf delete hetzner:hc-map/test.txt
```

---

## 8. Stack starten

```bash
cd /srv/hc-map

# Caddy-Variante:
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod pull
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod up -d

# Traefik-Variante:
docker compose -f docker/compose.prod.yml -f docker/compose.traefik.yml \
    --env-file .env.prod pull
docker compose -f docker/compose.prod.yml -f docker/compose.traefik.yml \
    --env-file .env.prod up -d
```

Was beim ersten Start passiert:

1. `db` (Postgres+PostGIS) initialisiert das Datenverzeichnis
   (Volume `hc-map_db-data`).
2. `backend` startet, holt sich einen Postgres-Advisory-Lock
   (`pg_try_advisory_lock(47_110_815)`), führt `alembic upgrade head`
   einmalig aus, gibt den Lock wieder frei und beginnt die HTTP-Schleife.
3. `frontend` startet das Next.js-Standalone-Image und horcht intern auf
   `:3000`.
4. `caddy` (oder `traefik`) holt das Let's-Encrypt-Zertifikat über die
   ALPN-Challenge auf `:443` und routet die Requests durch.
5. `backup` validiert beim Entrypoint, dass beide Secrets vorhanden sind
   und das konfigurierte rclone-Remote in der Config existiert; danach
   wartet `cron` auf den nächsten Schedule (oder läuft sofort, wenn
   `HCMAP_BACKUP_RUN_ON_START=1`).

Kontrolle:

```bash
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod ps
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod logs -f backend caddy backup
```

Healthchecks:

```bash
curl -fsS https://hc-map.example.org/api/health
# → {"status":"ok",...}
```

---

## 9. Admin-Bootstrap

Solange noch kein Benutzer existiert, kann (nur dann) der erste Admin
über den Bootstrap-Befehl angelegt werden. Wiederholte Aufrufe sind
idempotent: existiert bereits ein User, weigert sich das Skript.

```bash
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod exec backend \
    python -m scripts.bootstrap_admin \
        --email admin@example.org \
        --password 'mind-12-zeichen-bitte' \
        --name 'Admin Person'
```

Output bei Erfolg: `Bootstrapped admin user admin@example.org (role=admin).`

Anschließend einloggen unter `https://hc-map.example.org/login`. Über den
Admin-Bereich (`/admin`) legst du die übrigen Mitglieder als User an und
verknüpfst sie mit ihren Personen-Datensätzen. Für direkten Tabellen-
Zugriff steht SQLAdmin unter `/sqladmin/` zur Verfügung (ADR-055; das
Frontend bedient `/admin/*`).

> **Sicherheitshinweis:** Das Bootstrap-Passwort steht für ein paar
> Sekunden in der Shell-History des Hosts. Auf einem Mehrbenutzer-VPS
> stattdessen die Env-Variante nutzen (`HCMAP_BOOTSTRAP_EMAIL` /
> `_PASSWORD` / `_NAME` im Container-Env, dann ohne CLI-Flags), oder
> direkt nach Bootstrap das Passwort über die UI ändern.

---

## 10. Smoke-Test

Nach dem ersten Start mindestens diese sieben Punkte durchprobieren —
bei jedem Fehlschlag stoppen und in den Logs nachsehen, bevor du
Mitglieder einlädst:

| # | Aktion | Erfolgskriterium |
|---|---|---|
| 1 | `https://hc-map.example.org/` lädt | Karte/Login sichtbar, gültiges TLS |
| 2 | Login mit Bootstrap-User | Sidebar sichtbar, kein 401 |
| 3 | „Passwort vergessen?"-Roundtrip | Mail kommt an, Reset-Link funktioniert, Login mit neuem Passwort möglich |
| 4 | Event in Live-Modus anlegen | Event taucht in der Karte auf |
| 5 | Event nachträglich bearbeiten | Änderung persistiert |
| 6 | Anonymisierung einer Person | Name auf `[gelöscht]`, Verknüpfungen erhalten |
| 7 | `docker logs hc-map-backup-1` | Container ist gestartet, Validierung clean, Schedule-Zeile geloggt |

Wenn `HCMAP_BACKUP_RUN_ON_START=1` gesetzt war: zusätzlich prüfen, ob
ein Daily-Snapshot bereits auf dem Remote liegt:

```bash
rclone --config docker/secrets/rclone.conf ls hetzner:hc-map/daily/
```

---

## 11. Update-Pfad

HC-Map veröffentlicht neue RC-/Final-Tags auf GHCR. Du entscheidest
selbst, wann du pullst.

```bash
cd /srv/hc-map
git fetch --tags
git checkout v0.1.0-rc.2          # neuen RC-Tag holen
$EDITOR .env.prod                  # HCMAP_IMAGE_TAG entsprechend setzen

docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod pull
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod up -d
```

Was unter der Haube passiert:

- `docker compose pull` zieht die drei Images (backend, frontend,
  backup) für den neuen Tag neu.
- `up -d` rolliert die Container nacheinander aus.
- Backend führt beim Start `alembic upgrade head` einmalig aus
  (Advisory-Lock verhindert Race bei zwei parallelen Backend-
  Containern; Single-Backend ist Standard).
- Bei Migrations-Fehler beendet das Backend mit Exit-Code 1 — Compose
  startet im `restart: unless-stopped`-Loop neu, sodass das Problem in
  `docker logs` sichtbar wird, aber die Sessions weiter unter dem alten
  Frontend laufen.
- Frontend-Container ist zustandslos und startet sofort durch.

### 11.1 Notfall: Migration überspringen

Wenn die neue Migration fehlerhaft ist und du den Backend-Container
zwingend hochbekommen musst (um z. B. Daten zu retten), setze in
`.env.prod` `HCMAP_SKIP_MIGRATIONS=1`, recyclere `backend`, mache deine
Untersuchung, setze die Variable danach wieder zurück und pulle die
Korrektur. Die Variable existiert ausdrücklich nur für Notfälle —
Datenkonsistenz ist hier nicht garantiert.

### 11.2 Rollback

Da du den Tag in `HCMAP_IMAGE_TAG` selbst setzt:

```bash
$EDITOR .env.prod                  # zurück auf v0.1.0-rc.1
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod up -d
```

Achtung: ein Rollback rollt Migrationen **nicht** automatisch zurück.
Wenn die neue Version DB-Migrationen mit
`down_revision`-Kompatibilität gebrochen hat, ist Rollback nur per
Restore (Abschnitt 12) auf einen pre-Update-Snapshot möglich.

---

## 12. Restore-Drill (Pflicht vor Go-Live)

Ein Backup, dessen Restore noch nie getestet wurde, ist kein Backup.
Vor dem ersten Go-Live (M11) musst du den vollen Roundtrip mindestens
einmal durchgespielt haben.

### 12.1 Test-Datenbank in der laufenden Compose-Instanz anlegen

```bash
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod exec db \
    psql -U "$HCMAP_DB_USER" -d postgres \
         -c "CREATE DATABASE hcmap_restore;"
```

### 12.2 Latesten Daily-Snapshot identifizieren

```bash
rclone --config docker/secrets/rclone.conf lsf hetzner:hc-map/daily/ | sort | tail -1
# z. B. 20260501T031700Z.dump.age
```

### 12.3 Restore in die Test-DB

Auf dem Server, mit deinem age-Private-Key (vom Arbeitsplatz hochkopiert
nach `~/secret/hc-map.age.key` mit `chmod 600`):

```bash
docker run --rm -it \
    --network hc-map_internal \
    -e HCMAP_BACKUP_REMOTE=hetzner \
    -e HCMAP_BACKUP_PREFIX=hc-map \
    -e AGE_IDENTITY_FILE=/run/secrets/age-identity.txt \
    -v /srv/hc-map/docker/secrets/rclone.conf:/run/secrets/rclone.conf:ro \
    -v ~/secret/hc-map.age.key:/run/secrets/age-identity.txt:ro \
    ghcr.io/paddel87/hc-map-backup:0.1.0-rc.1 \
    /usr/local/bin/restore.sh \
        daily/20260501T031700Z.dump.age \
        "postgresql://${HCMAP_DB_USER}:${HCMAP_DB_PASSWORD}@db:5432/hcmap_restore"
```

(`HCMAP_DB_USER`/`_PASSWORD` aus `.env.prod` entweder von Hand
einsetzen oder `docker compose ... exec backend env | grep HCMAP_DB`
nutzen.)

### 12.4 Roundtrip verifizieren

```bash
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod exec db \
    psql -U "$HCMAP_DB_USER" -d hcmap_restore \
         -c "SELECT COUNT(*) FROM event;"
```

Die Zahl muss zur Live-DB passen (oder, wenn der Snapshot aus der Nacht
ist, leicht darunter liegen). Ein Schema-Diff `pg_dump --schema-only`
zwischen `hcmap` und `hcmap_restore` darf null Zeilen produzieren.

### 12.5 Test-DB aufräumen

```bash
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod exec db \
    psql -U "$HCMAP_DB_USER" -d postgres \
         -c "DROP DATABASE hcmap_restore;"
```

> **Goldene Regel:** der Restore-Drill ist niemals „in einem halben Jahr
> mal wieder". Plane ihn quartalsweise als Kalender-Termin ein.

### 12.6 Worst-Case: Server-Totalausfall

1. Neuen VPS provisionieren (Schritt 2).
2. `git clone` (Schritt 3) bis einschließlich `.env.prod`-Wiederherstellung
   aus deinem Passwort-Manager.
3. Stack starten **ohne** `up -d` für die Backend-Migrationen — DB ist
   leer, also Migrationen werden gleich beim Start ausgeführt.
4. Restore-Container (Abschnitt 12.3) gegen die `hcmap`-DB selbst
   laufen lassen (statt `hcmap_restore`) — vorher `DROP DATABASE hcmap`
   + `CREATE DATABASE hcmap` mit denselben Credentials.
5. Backend erneut starten — jetzt mit Daten.

---

## 13. Betriebs-Spickzettel

```bash
# Logs eines Service folgen
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod logs -f --tail 200 backend

# Backup-Container manuell zu einem sofortigen Daily-Run zwingen
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod exec backup /usr/local/bin/run-backup daily

# Stack komplett stoppen (Daten bleiben)
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod down

# Stack komplett zerstören (DB-Volume löschen — NICHT unbedacht ausführen)
docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml \
    --env-file .env.prod down -v

# Plattenplatz prüfen
df -h /var/lib/docker
docker system df
```

Wichtige Volumes:

| Name | Zweck | Persistenz |
|---|---|---|
| `hc-map_db-data` | PostgreSQL-Datenverzeichnis | **kritisch** — Restore-Quelle ist nur das Backup |
| `hc-map_caddy-data` | Caddy-Zertifikate | unkritisch (regenerierbar, aber Rate-Limits beachten) |
| `hc-map_caddy-config` | Caddy-Runtime-Config | unkritisch |
| `hc-map_traefik-acme` | Traefik-Zertifikate | unkritisch (regenerierbar, Rate-Limits) |

---

## 14. Häufige Stolperer

| Symptom | Ursache & Behebung |
|---|---|
| Caddy/Traefik bekommt kein Cert, `unauthorized` von Let's Encrypt | DNS zeigt nicht (mehr) auf den VPS, oder Port 80 ist gefiltert. `dig` checken, `ufw allow 80/tcp`. Wiederholt fehlgeschlagene Versuche → in den Beispiel-Configs ist eine `acme-staging`-Zeile als Kommentar — temporär einkommentieren, sonst trifft dich der Production-Rate-Limit. |
| Login bricht mit `403 CSRF token mismatch` | `HCMAP_DOMAIN` und `HCMAP_BASE_URL` widersprechen sich, oder du rufst die Seite über eine andere Domain auf als in `HCMAP_BASE_URL`. Beide auf denselben Origin setzen. |
| Karte und Geocoding zeigen 503 | `HCMAP_MAPTILER_API_KEY` ist leer oder ungültig. MapTiler-Cloud-Konto öffnen, Free-Tier-Key kopieren, Backend recyclen (`docker compose ... up -d backend`). |
| Reset-Mail kommt nicht an | (a) `HCMAP_SMTP_HOST` ist leer → LoggingBackend; in den Backend-Logs nach `password reset url` greppen. (b) Provider weist die Mail mit `550 5.7.1` ab → SPF/DKIM für `HCMAP_SMTP_FROM` fehlt; im Mail-Provider-Dashboard nachziehen. |
| Backup-Container `exit 78` mit `rclone remote not found` | `HCMAP_BACKUP_REMOTE` in `.env.prod` passt nicht zum Sektionsnamen in `docker/secrets/rclone.conf`. Beides angleichen. |
| Backup-Container `exit 78` mit `age recipients secret missing` | `docker/secrets/age-recipients.txt` wurde nicht angelegt oder ist leer. Schritt 6.2 nachholen. |
| `docker compose pull` schlägt mit `denied` fehl | GHCR-Paket-Sichtbarkeit ist privat; öffentliche RC-Pakete erwartet — `docker pull ghcr.io/paddel87/hc-map-backend:0.1.0-rc.1` aus frischer Shell muss anonym funktionieren. Falls nicht, Issue auf GitHub eröffnen. |
| `docker compose pull` meldet `manifest unknown` | Wahrscheinlich `HCMAP_IMAGE_TAG=v0.1.0-rc.1` mit `v`-Prefix gesetzt — der GHCR-Tag heißt aber `0.1.0-rc.1` (ohne `v`, `metadata-action`-Default). Das führende `v` aus `.env.prod` entfernen. Der `:rc`-Tag funktioniert immer und ist die robusteste Wahl für die Erstinbetriebnahme. |
| Migrations-Fehler beim Update | Logs auf `alembic upgrade head` lesen. Nicht panisch deinstallieren — meist hilft, die Tag-Pin zurückzudrehen (Abschnitt 11.2). Wenn das nicht reicht: Restore aus letztem Pre-Update-Snapshot (Abschnitt 12.6). |
| Neuer Admin-Bootstrap weigert sich (`Refusing to bootstrap`) | Es existiert bereits ein User. Über die Login-UI mit dem ursprünglichen Bootstrap-Account anmelden und dort weiteren Admin anlegen. |
| `docker logs caddy` zeigt `permission denied: /etc/caddy/Caddyfile` | Die Datei `docker/Caddyfile` fehlt — nur das `.example` ist im Repo. Schritt 4.1 wiederholen. |
| Statistik-Aggregate wirken niedriger als erwartet | Anonymisierte Personen werden in Aggregaten weiterhin gezählt, aber nicht namentlich aufgelöst (siehe ADR-002 / ADR-015). Das ist Designentscheidung, kein Bug. |
| Login-Seite zeigt „Application error" / `connect ECONNREFUSED 127.0.0.1:8000` in den Frontend-Logs | RC-1 (`v0.1.0-rc.1`) shipt mit einer `compose.prod.yml`, die `BACKEND_INTERNAL_URL` nicht durchreicht — siehe Issue #15 / ADR-053. Auf RC-1: das Compose-File aus `main` ziehen oder die Zeile `BACKEND_INTERNAL_URL: ${BACKEND_INTERNAL_URL:-http://backend:8000}` im `frontend`-Service händisch ergänzen, dann `docker compose ... up -d frontend`. Ab RC-2 / Final ist der Default eingebaut; Override nur nötig bei externem Reverse-Proxy außerhalb des Compose-Netzes (siehe §4.3). |

---

## Verweise

- [`docs/decisions.md` — ADR-051 (Strategie M10)](../docs/decisions.md#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann)
- [`docs/architecture.md` — Modulgrenzen, Datenflüsse, Reverse-Proxy-Skizze](../docs/architecture.md)
- [`docs/templates/consent-de.md` — Einwilligungs-Vorlage für Mitglieder](../docs/templates/consent-de.md)
- [`docs/project-context.md` — Constraints (DSGVO, Lizenz, Performance)](../docs/project-context.md)
- [`README.md` — Operator-Quickstart (Kurzfassung dieses Runbooks)](../README.md)

> **Lese-Test (Patrick, M10.8 Akzeptanz):** Wenn beim Durchlesen Lücken
> auffallen, nicht hier ad-hoc patchen — Issue eröffnen oder im
> Fahrplan einen Folge-Eintrag mit `[OFFEN]` notieren. Das Runbook
> entwickelt sich mit jedem realen Deployment weiter.
