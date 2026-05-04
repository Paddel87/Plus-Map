# Blockers

<!-- Ungelöste Probleme und gescheiterte Ansätze.
     Wird befüllt, wenn ein Arbeitsschritt nach drei Versuchen nicht gelöst werden konnte
     (CLAUDE.md Abschnitt 10). Gelöste Einträge wandern in den Archiv-Abschnitt. -->

## Blocker-Erkennung (vor dem Dreifach-Versuch)

Ein Problem ist **sofort** als Blocker zu behandeln, ohne drei Versuche abzuwarten, wenn eines dieser Muster zutrifft:

1. **Informationslücke:** Eine für die Lösung nötige Angabe fehlt in allen Pflicht-Dokumenten.
2. **Widerspruch:** Zwei Dokumente geben unvereinbare Vorgaben und kein ADR löst den Konflikt auf.
3. **Fremde Modulgrenze:** Die Lösung würde Änderungen in einem Modul erfordern, das nicht Teil des aktuellen Fahrplan-Schritts ist.
4. **Freigabebedarf:** Die Lösung fällt in eine Kategorie aus CLAUDE.md Abschnitt 4.
5. **Nicht-deterministisches Verhalten:** Das Problem tritt nicht reproduzierbar auf. Nicht-Reproduzierbarkeit ist selbst ein Blocker, keine akzeptierte Eigenschaft.

In diesen Fällen: direkt Eintrag hier anlegen, ohne Dreifach-Versuch.

Für alle anderen Fälle gilt die Dreifach-Regel aus CLAUDE.md Abschnitt 10.

---

## Aktive Blocker

### Blocker #001: Stack-Drift Frontend-Abhängigkeiten — Setup mit veralteten Versionen

> **Teilauflösung 2026-04-30 (zwei Etappen):**
> - Punkt 1 (Next.js-Update-Pfad) **gelöst** mit STACK-001 / ADR-047 — Pfad C + Variante Z2 (Next.js 15.0.4 → 16.2.4, React 19.0.0 → 19.2.5, ESLint 8.57.1 → 9.39.4 wegen `eslint-config-next@16`-Peer-Dep, Flat Config, `middleware.ts` → `proxy.ts`).
> - Punkt 3 (Backend-/Container-/Runtime-Audit) **gelöst** mit STACK-002 / ADR-048 — Variante B (Voll-Sweep ohne Runtime-Majors). 13 Backend-Pin-Bumps (4 SemVer-/CalVer-Major, 8 0.x-Minors out-of-range, 1 Within-Constraint-Refresh), 1 Tooling-Major (pre-commit-hooks v5→v6), 1 Build-Image-Bump (uv 0.8.17→0.11.8), 1 PostGIS-Minor (16-3.4→16-3.5). Audit explizit **ohne** Runtime-Majors (Postgres/Node/Python) und ohne Anpassung des `engines: ">=22 <23"`-Pins — diese drei werden bei Bedarf eigenständig entschieden.
> - Punkt 2 (CLAUDE.md-Härtung) bleibt **aktiv**. Eintrag bleibt vorerst hier, bis auch Punkt 2 erledigt ist, dann gesamter Eintrag nach „Gelöste Blocker" mit Lösungsverweis auf alle drei.

- **Datum:** 2026-04-29
- **Fahrplan-Referenz:** M0 (Initial-Setup `frontend/package.json` im Commit `3e30a0c` vom 2026-04-25); querschnittlich gegen alle Folge-Meilensteine, die auf demselben Pin-Stand aufbauen.
- **Modul:** Frontend (primär); methodisch projektübergreifend (CLAUDE.md).
- **Blocker-Typ:** Freigabebedarf (CLAUDE.md §4.3 — Major-Update; §4.1 — Methodik-Änderung an CLAUDE.md).
- **Beschreibung:**
  Bei einer Aktualitätsprüfung am 2026-04-29 zeigte sich, dass `frontend/package.json` mit Versionen aus Dezember 2024 gepinnt wurde, obwohl das Setup am 2026-04-25 erfolgte. Konkret: `next` `15.0.4` (Release 2024-12-05), `react`/`react-dom` `19.0.0` (Dezember 2024), `eslint-config-next` `15.0.4`. Aktueller Stand auf npm zum Zeitpunkt der Prüfung: `next` `16.2.4` (Release 2026-04-15), `react` `19.2.5`. Damit liegen ein Major-Release (Next 15 → 16, stable seit 2025-10-22) und ~17 Monate Patch-Lag unbemerkt im Tree.

  ADR-007 (2026-04-22) hatte „Next.js (App Router, **aktuelle stabile Major-Version**)" festgelegt — ohne konkrete Versionsbasis. Die Pins im M0-Setup wurden vermutlich aus KI-Modell-Trainingsdaten übernommen, ohne aktiven Registry-Lookup. CLAUDE.md §6 verbietet stille Annahmen abstrakt, fordert jedoch keinen expliziten Lookup-Schritt beim Pinnen. CLAUDE.md §9 (DoD) listet keinen entsprechenden Check.

  Folge-Hinweis (gleiches Muster): HOTFIX-001 (`sonner` v1.7.4 → v2.0.7) am 2026-04-29 musste nachträglich gefahren werden, weil eine veraltete Toast-Bibliothek unter React 19 nicht mehr funktionierte — ebenfalls Drift-Symptom, ebenfalls erst durch konkretes Symptom entdeckt.
- **Reproduktion:**
  ```
  $ grep '"next":' frontend/package.json
      "next": "15.0.4",
  $ curl -s https://registry.npmjs.org/next | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['dist-tags']['latest'], d['time'][d['dist-tags']['latest']])"
  16.2.4 2026-04-15T22:33:47.905Z
  $ curl -s https://registry.npmjs.org/next | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['time']['15.0.4'])"
  2024-12-05T23:46:32.312Z
  ```
  Lookup-Datum: 2026-04-29. Differenz Setup-Commit ↔ damals aktuelle Stable: ~5 Monate (16.0 stable seit 2025-10-22).
- **Offene Hypothesen:**
  - Backend-Pins (`backend/pyproject.toml`: FastAPI, SQLAlchemy, Pydantic, Alembic, fastapi-users etc.) zeigen vermutlich dasselbe Muster, sind aber **nicht geprüft**. Audit-Bedarf cross-cutting.
  - Container-Image-Tags (`docker-compose.yml`, Dockerfiles) und Sprach-Runtimes (Node 22, Python 3.12) ebenfalls nicht geprüft.
  - Weitere Frontend-Pins (TanStack Query, Tailwind, Radix, MapLibre, RxDB) ebenfalls aus Dezember-2024-Wissensstand, ohne Aktualitätsprüfung.
- **Benötigt zur Auflösung:**
  Drei voneinander trennbare Entscheidungen — alle freigabepflichtig:
  1. **Next.js-Update-Pfad für HC-Map** (Major-Version-Änderung, §4.3).
  2. **CLAUDE.md-Methodik-Härtung gegen künftigen Stack-Drift** (Methodik-Änderung an projektübergreifender Vorlage, §4.1).
  3. **Audit-Ausweitung auf Backend, Container, Runtimes** als eigenständiger Folgeschritt — Freigabe, ob und wann ausgeführt.
- **Vorgeschlagene Entscheidungsfrage:**
  1. *Welcher Update-Pfad für Next.js?*
     - **A —** Patch innerhalb 15.0.x (15.0.4 → 15.0.8). Freigabefrei (Patch). Schließt 15.0-Bugs, lässt 15.1+/16.x Lag bestehen.
     - **B —** Minor-Sprung auf 15.5.15 (LTS-artige 15-Linie, Release 2026-04-08). Bleibt im 15-Major, geringeres Migrationsrisiko, kauft ~12 Monate.
     - **C —** Major-Sprung auf 16.2.4 (`latest`, Release 2026-04-15). Aktuelle Stable-Linie. Erfordert vorab Migrations-Audit (Async-Request-APIs, Caching-Defaults, Turbopack-Verhalten, Codemods). Empfehlung **vor** M8, solange Frontend-Code klein und Test-Suite (261 Tests grün) eng ist.

     Die Optionen sind in der Session vom 2026-04-29 (Conversation-Verlauf) ausführlich begründet. Empfehlung der KI: **C** vor M8.
  2. *Wird die CLAUDE.md-Härtung übernommen — und wenn ja, in welchem Umfang?*
     Konkreter Vorschlag mit fünf Änderungen liegt im Conversation-Verlauf vom 2026-04-29 (§6 Lookup-Pflicht, §4 Versionsbasis im Vorschlag, §9 DoD-Check, neuer §15 „Stack-Aktualität" inkl. CI-Audit-Skript, §2 Audit nach Sessionpause >30 Tage).
     - **Annahme A —** alle fünf Änderungen plus Audit-Skript.
     - **Annahme B —** nur §6+§9 (minimal-invasiv, ohne CI-Logik).
     - **Ablehnung —** Status quo, dann ist die Drift-Erkennung weiter ad-hoc.
  3. *Wird ein eigenständiger Audit-Schritt auf Backend/Container/Runtimes freigegeben?*
     - **Ja** — als Querschnitts-Aufgabe vor M8, Ergebnis ggf. weitere Update-Anträge.
     - **Nein** — auf Symptom-Basis bleiben (heutiges Verhalten).

---

<!-- Bei neuem Blocker: Eintrag nach folgendem Format anlegen.
     Format ist NICHT optional (siehe CLAUDE.md Abschnitt 10). Nummerierung durchgehend.

### Blocker #NNN: [Titel]

- **Datum:** YYYY-MM-DD
- **Fahrplan-Referenz:** [Phase.Schritt-ID]
- **Modul:** [betroffenes Modul]
- **Blocker-Typ:** [Informationslücke | Widerspruch | Fremde Modulgrenze | Freigabebedarf | Nicht-deterministisch | Dreifach-Fehlschlag]
- **Beschreibung:**
  [Was funktioniert nicht, unter welchen Bedingungen tritt das Problem auf.
  Konkret, prüfbar. Keine Spekulation ohne Kennzeichnung.]
- **Reproduktion:**
  ```
  [Exakte Schritte zur Reproduktion, mit Kommandos/Inputs/erwarteter vs. tatsächlicher Ausgabe]
  ```
- **Versuchte Ansätze (bei Dreifach-Fehlschlag):**
  1. [Ansatz 1] – Ergebnis: [...] – Grund des Scheiterns: [...]
  2. [Ansatz 2] – Ergebnis: [...] – Grund des Scheiterns: [...]
  3. [Ansatz 3] – Ergebnis: [...] – Grund des Scheiterns: [...]
- **Offene Hypothesen:**
  - [Was könnte noch versucht werden, braucht aber eine Entscheidung/Information/Freigabe]
- **Benötigt zur Auflösung:**
  - [Konkrete Information, Freigabe, externe Klärung – ohne Auslassungen]
- **Vorgeschlagene Entscheidungsfrage:**
  [Die spezifische Frage, die der Mensch beantworten soll, in einer Form, aus der eine Antwort direkt abgeleitet werden kann]
-->

---

## Gelöste Blocker

### Blocker #003: Backend-Image enthielt keine Migrations (RC-Show-Stopper)

- **Datum:** 2026-05-02
- **Lösungsdatum:** 2026-05-02
- **Fahrplan-Referenz:** M10.9 (entdeckt im RC-Voll-Smoke); ursächlich M10.7
  (`build-push`-Job baut Backend-Image ohne Migrations-Pfad).
- **Modul:** Build / Container-Image (`docker/backend.Dockerfile`).
- **Blocker-Typ:** Direkter Defekt (kein Dreifach-Versuch nötig — Crashloop
  beim ersten Backend-Container-Start mit eindeutigem Trace).
- **Beschreibung (zur Historie):**
  Beim ersten produktiven `docker compose up -d` mit den GHCR-`:main`-Images
  crashloopte das Backend mit:

  > `alembic.util.exc.CommandError: Path doesn't exist: /app/migrations.  Please use the 'init' command to create a new scripts folder.`

  Der Migrations-Auto-Runner aus
  [backend/app/migrations_runner.py](../backend/app/migrations_runner.py)
  (ADR-051 §F) erwartet `<backend>/alembic.ini` und `<backend>/migrations/`
  als absolute Pfade auf dem Container-Filesystem. Die `:main`-Image
  enthielt aber nur `/app/app/...` — `pg_dump`-Output und Verzeichnis-Trace
  bestätigten: weder `/app/alembic.ini` noch `/app/migrations` noch
  `/app/scripts` waren im Image vorhanden.
- **Lösung:** [docker/backend.Dockerfile](../docker/backend.Dockerfile)
  Builder- und Runtime-Stage um drei zusätzliche `COPY`-Statements
  erweitert: `backend/migrations`, `backend/alembic.ini`,
  `backend/scripts`. Verifikation: lokal gebautes
  `hc-map-backend:smoke-fix`-Image fährt alle 7 Migrationen
  (`20260425_1700_initial` … `20260501_1200_legacy_ref`) sauber durch
  und kommt healthy hoch.
- **Abgeleitete Regel:** RC-Smoke (oder eine analoge "Image-Layer-Funktional-
  Probe" in CI) sollte jeden Operator-relevanten Path verifizieren —
  nicht nur den Backend-Health-Probe, der trivialerweise grün geht.

### Blocker #004: Traefik-Overlay mountete `/var/run/docker.sock` nicht

- **Datum:** 2026-05-02
- **Lösungsdatum:** 2026-05-02
- **Fahrplan-Referenz:** M10.9 (entdeckt im Smoke-Run #2 mit Traefik-Overlay);
  ursächlich M10.5 (Compose-Overlay-Definition ohne Provider-Voraussetzung).
- **Modul:** Reverse-Proxy / Compose (`docker/compose.traefik.yml`).
- **Blocker-Typ:** Direkter Defekt (Traefik-Logs zeigen Endlos-Retry mit
  `Cannot connect to the Docker daemon`).
- **Beschreibung (zur Historie):**
  [docker/traefik/traefik.yml.example](../docker/traefik/traefik.yml.example)
  konfiguriert `providers.docker:` für Service-Discovery via Labels (die
  Labels stehen in
  [docker/compose.traefik.yml](../docker/compose.traefik.yml) an
  `backend`/`frontend`). Der Container-Volume-Mount für den Docker-Socket
  fehlte aber. Folge: Provider-Loop crasht alle ~5 s, keine Routes werden
  registriert, jeder Request läuft auf die Default-404 von Traefik.
- **Lösung:** [docker/compose.traefik.yml](../docker/compose.traefik.yml)
  um Read-Only-Mount `/var/run/docker.sock:/var/run/docker.sock:ro`
  ergänzt. Auf Linux-VPS reicht das (Standard-`docker`-Gruppen-Membership);
  beim macOS-Smoke war zusätzlich ein file-Provider-Routing-Snippet in
  [docker/traefik/dynamic.yml.example](../docker/traefik/dynamic.yml.example)
  nötig (Docker-Desktop-Symlink-Permission-Quirk, Linux-VPS unbetroffen).
  Smoke-Verifikation nach Fix: 301 HTTP→HTTPS, TLS via self-signed Cert,
  Login mit `secure=TRUE` auf beiden Cookies, Live-Event-Anlage 200.
- **Abgeleitete Regel:** Wenn ein Compose-Overlay einen
  Provider/Discovery-Mechanismus nutzt, müssen die Voraussetzungen
  (Sockets, Volumes, Capabilities) im selben File geliefert werden —
  nicht in der Hoffnung, der Operator weiß, wie's geht. Folge-Aufgabe:
  prüfen, ob `compose.caddy.yml` ähnliche Voraussetzungen impliziert
  (Caddy braucht keinen Docker-Socket — Routes hartkodiert im Caddyfile,
  unkritisch).

### Blocker #002: GitHub-Actions-Runtime-Deprecation Node.js 20

- **Datum:** 2026-05-01
- **Lösungsdatum:** 2026-05-01
- **Fahrplan-Referenz:** M10.7 → aufgelöst durch M10.7.1.
- **Modul:** CI / GitHub Actions (`.github/workflows/`).
- **Blocker-Typ:** Freigabebedarf (CLAUDE.md §4.7 — Build-/Deploy-Pipeline). War **nicht-blockierend**, mit zwei harten Stichtagen (2026-06-02, 2026-09-16).
- **Beschreibung (zur Historie):**
  Die ersten produktiven CI-Runs (`gh run 25225432180`, `25225805748`, `25226275568`, `25226975480`, alle 2026-05-01) emittierten auf jedem Job dieselbe Annotation:

  > Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: `actions/checkout@v4`, `actions/cache@v4`, `actions/setup-node@v4`, `astral-sh/setup-uv@v5`, `docker/build-push-action@v6`, `docker/login-action@v3`, `docker/metadata-action@v5`, `docker/setup-buildx-action@v3`, `docker/setup-qemu-action@v3`. Actions will be forced to run with Node.js 24 by default starting **June 2nd, 2026**. Node.js 20 will be removed from the runner on **September 16th, 2026**.

  Zwei Stichtage: **2026-06-02** (Runner zwingt Node 24 als Default) und **2026-09-16** (Node 20 vollständig entfernt).
- **Lösung:** Sub-Step **M10.7.1 (Action-Versions-Audit + Node-24-Bumps)** am 2026-05-01 ausgeführt. Live-Audit gegen die GitHub-API (Releases-API + `action.yml`-Contents-API für `using:`-Verifikation), dann mechanische `uses:`-Tag-Bumps in beiden Workflows: `actions/checkout@v6`, `actions/cache@v5`, `actions/setup-node@v6`, `astral-sh/setup-uv@v8.1.0` (immutable Pin per astral-Empfehlung — v8 hat keine floating major-Tags mehr), `docker/build-push-action@v7`, `docker/login-action@v4`, `docker/metadata-action@v6`, `docker/setup-buildx-action@v4`, `docker/setup-qemu-action@v4`. `actionlint v1.7.12` clean. CI-Run nach Push: alle drei Jobs grün, Node-20-Annotation verschwindet.
- **ADR:** [ADR-052 — GitHub-Actions-Major-Bumps auf Node-24-fähige Runtimes (M10.7.1)](./decisions.md#adr-052--github-actions-major-bumps-auf-node-24-fähige-runtimes-m1071).
- **Abgeleitete Regel:** Beim Anlegen eines Workflows immer Live-API-Lookup für Action-Versionen statt Annahme aus Trainingsdaten (analog Lehre aus Blocker #001 für Frontend-Pins). Folge-Aufgabe nach M11: Renovate-/Dependabot-Konfig für GitHub-Actions, ggf. projektweite Umstellung auf immutable SHA-/Tag-Pins.

<!-- Nach Auflösung von oben hierher verschieben mit zusätzlichen Feldern:
- **Lösungsdatum:** YYYY-MM-DD
- **Lösung:** [was hat funktioniert, warum]
- **ADR:** [falls die Auflösung einen ADR erzeugt hat]
- **Abgeleitete Regel:** [falls eine wiederkehrende Lektion entstanden ist]

Bei hoher Anzahl: nach `docs/archiv/blockers-YYYY-MM.md` auslagern. -->

