# Project Context — HC-Map

<!-- Projektspezifischer Kontext. Wird zu Sessionbeginn als erste Datei gelesen.
     Dient als Entscheidungsgrundlage für alle autonomen Schritte der KI.
     Jede Angabe muss so konkret sein, dass daraus maschinell eindeutig Regeln ableitbar sind. -->

## 1. Kerndaten

- **Projektname:** HC-Map („Handcuff-Map")
- **Kurzbeschreibung:** Selbst gehostetes, geo-referenziertes Logbuch für Fesselungs-Ereignisse einer eingeschworenen Gruppe (<20 Personen). Erfasst Events mit beteiligten Personen, sequenzierten Applications und kartografischer Darstellung.
- **Status:** Konzeption abgeschlossen, Umsetzung steht bevor (M0).
- **Version (SemVer):** v0.0.0 (vor M11 keine offizielle Version)
- **Dokumentationssprache:** Deutsch
- **Codesprache (Kommentare, Variablennamen):** Englisch
- **Projekttyp:** Full-Stack (Web-Backend + Web-Frontend, Mobile-First-PWA)

## 2. Zielgruppe und Nutzungskontext

- **Primäre Nutzer:** Eingeschworene Gruppe mit aktivem Nutzer-Pull, <20 Personen, einander persönlich bekannt. Technisches Level: gemischt, Mehrheit nicht entwickelnd.
- **Sekundäre Nutzer / Betreiber:** Genau ein Admin (zugleich Repository-Eigentümer). Kein anderes Betriebspersonal.
- **Erwartete Last:** Sehr gering — Größenordnung wenige Events pro Tag, vereinzelt mehrere parallele Live-Sessions. Konkrete Werte: <20 concurrent users, <100 Events/Monat, <5.000 Events insgesamt nach mehreren Jahren.
- **Nutzungsumgebung:** Browser auf Mobilgerät (Hauptmodus, Live-Erfassung) und Browser auf Desktop (Sekundärmodus, Auswertung, Pflege).

## 3. Technischer Stack

### Fixiert

- **Sprachen und Versionen:** Python 3.12 (Backend), TypeScript strict (Frontend)
- **Frameworks:** FastAPI (Backend), Next.js App Router (Frontend)
- **Datenbank:** PostgreSQL 16 + PostGIS 3
- **Laufzeitumgebung:** Docker Compose (lokale Entwicklung und Produktion auf VPS)
- **Package Manager:** uv (Python), pnpm (Node)

### Empfohlen (freigabefrei nutzbar)

Diese Bibliotheken sind in den ADRs als Stack-Bestandteile festgelegt und werden bei Bedarf direkt eingesetzt, ohne neue ADR:

- **SQLAlchemy 2.0** (ORM) und **Alembic** (Migrations)
- **Pydantic v2** (Validierung)
- **fastapi-users** (Authentifizierung)
- **SQLAdmin** (Admin-UI parallel zu Next.js)
- **openlocationcode** (Plus-Code-Berechnung)
- **Pillow** oder **VIPS** (Bildverarbeitung in Phase 2)
- **structlog** (strukturiertes Logging)
- **pytest, pytest-asyncio, httpx, testcontainers** (Tests)
- **ruff, black, mypy** (Linting/Formatierung Backend)
- **Tailwind CSS, shadcn/ui** (Frontend-Styling)
- **TanStack Query** (Server-State)
- **react-map-gl + maplibre-gl** (Karte)
- **RxDB + Dexie-Storage** (Offline-Sync)
- **lucide-react** (Icons)
- **eslint, prettier** (Linting/Formatierung Frontend)

### Explizit nicht erlaubt

- **Externe Cloud-Services für Datenhaltung** (Self-Hosting-Prinzip; Ausnahme: MapTiler in Phase 1 für Tile-Auslieferung, anonyme Tile-Requests, kein Daten-Upload; Phase 2 Self-Hosting der Tiles).
- **what3words-API** — proprietär, kollidiert mit Datensouveränitäts-Motiv. Die ursprünglich für M9 vorgesehene einmalige Migrationsabfrage entfällt (ADR-050, manuelle Nacherfassung).
- **Google Maps, Mapbox GL ab v2** — Vendor-Lock-in, Datenschutz-Risiko.
- **GPL-lizenzierte Abhängigkeiten** ohne explizite Freigabe (siehe Abschnitt 6 / Compliance).
- **localStorage/sessionStorage für Anwendungsdaten** — wird durch RxDB/IndexedDB abgelöst, sonst inkonsistent.
- **Externer Identity-Provider (Keycloak, Authentik)** in Pfad A — überdimensioniert.
- **Eigenes 3-Wort-System** als w3w-Reimplementation — rechtlich riskant, siehe ADR-004.

## 4. Architektur-Grobstruktur

Modularer Monolith: ein FastAPI-Backend, ein Next.js-Frontend, eine PostgreSQL-Datenbank. RxDB im Browser für Offline-Sync der Live-Erfassung. Details siehe `architecture.md`.

**Module (Kurzübersicht):**

- **Auth** — fastapi-users-Integration, Cookie-Sessions, RBAC (Admin/Editor/Viewer), CSRF-Schutz
- **Domain** (Events, Applications, Persons) — Kerngeschäftslogik, Auto-Participant-Trigger, Anonymisierung
- **Catalog** — RestraintType, ArmPosition, HandPosition, HandOrientation mit Vorschlags-Workflow
- **Sync** — RxDB-Replication-Endpoints (`/api/sync/pull`, `/api/sync/push`)
- **Search & Export** — Volltextsuche (Postgres `tsvector`), JSON/CSV-Export
- **Geocoding** — Plus-Code-Berechnung serverseitig, MapTiler-Geocoding-Proxy
- **Admin-UI** — SQLAdmin unter `/admin`, Cookie-Bridge zu fastapi-users
- **Frontend** — Next.js mit Live-Modus als Hauptansicht, Karte, Suche, Statistik

**Kommunikationsmuster:** Synchron REST zwischen Frontend und Backend. RxDB-Replication asynchron im Hintergrund. Postgres direkt vom Backend, RLS auf DB-Ebene.

## 5. Externe Abhängigkeiten

### Services

| Service | Zweck | Authentifizierung | Ausfallverhalten |
|---|---|---|---|
| MapTiler Cloud | Karten-Tiles in Phase 1 | API-Key serverseitig | Karte zeigt Fallback-Hinweis; Ablöse durch Self-Hosting in M12 |
| MapTiler Geocoding | Adress-Suche | API-Key serverseitig | Adress-Suche temporär nicht verfügbar; Plus-Code- und Karten-Klick-Eingabe funktionieren weiter |
| Let's Encrypt (via Caddy) | TLS-Zertifikate | ACME | Bestehendes Zertifikat bleibt 90 Tage gültig; Renewal-Fehler = Alarmierung |
| Off-Site Backup-Storage | Backup-Ziel (Wahl in M13) | Anbieter-spezifisch | Backup-Job schlägt fehl, wird im Monitoring sichtbar; lokales Backup bleibt |

### APIs

- **MapTiler Cloud Tiles:** Free-Tier 100.000 Requests/Monat, EU-Hoster, bei Überschreitung pausieren Karten ohne Überraschungsrechnung.
- **MapTiler Geocoding:** Gleiches Tier, auf nicht-kommerzielle Nutzung beschränkt — passt für Hobby; bei Pfad-B-Wechsel neu zu bewerten.

## 6. Constraints (operationalisierbar)

**Regel: Jeder Constraint muss in eine prüfbare Regel übersetzt sein.**

### Datenschutz

- **Keine personenbezogenen Daten in Logs** → Regel: `structlog`-Wrapper mit Redaction-Liste (Namen, Notizen, Lat/Lon werden vor Log-Ausgabe entfernt).
- **DSGVO-Art. 17: Anonymisierungsfunktion** für Personen → Regel: API-Endpunkt `POST /api/persons/{id}/anonymize` setzt `name = '[gelöscht]'`, `alias = NULL`, `note = NULL`, `is_deleted = true`, `deleted_at = now()`. Verknüpfungen bleiben erhalten (siehe ADR-002).
- **Einwilligungspflicht für sensible Daten** → Regel: Vor M11 Go-Live muss schriftlicher Einwilligungstext vorliegen, der Hoster-Vertrauen (ADR-001), Anonymisierungs-Kompromiss (ADR-002), on-the-fly-Personenanlage (ADR-014), Aggregat-Statistik (ADR-015) und IndexedDB-Klartextspeicher (ADR-032) explizit benennt. Mitgelieferte Vorlage: [`docs/templates/consent-de.md`](./templates/consent-de.md) (M10.4, ADR-051 §G) — Operator passt Platzhalter an, ggf. juristisch prüfen lassen.

### Sicherheit

- **Alle Endpoints erfordern Authentifizierung** außer `/api/health` und Auth-Endpoints (`/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`).
- **Passwörter mit Argon2id** gehasht, minimum 12 Zeichen, kein Maximum.
- **CSRF-Schutz** für alle State-Changing-Requests via Double-Submit-Token.
- **App-PIN clientseitig** mit PBKDF2 oder Argon2-WASM, 4–6 Stellen, Sperre nach 60s Inaktivität, Zwangs-Logout nach 5 Fehlversuchen.
- **Row-Level-Security** aktiv auf allen daten-führenden Tabellen, GUC-basierte User-Identität pro Request.
- **Foto-Anhänge in Phase 2:** RLS-äquivalente Zugriffskontrolle, Größenlimit 10 MB, Mime-Type-Whitelist (jpeg, png, webp, mp4).

### Performance

- **Datenbankabfragen verwenden keine `SELECT *`** in produktivem Code → Regel: SQLAlchemy-Selects mit expliziten Spalten oder ORM-Modellen.
- **Live-Modus-Aktionen unter 200 ms** vom Tap bis lokale Persistierung in RxDB.
- **„On this day"-Endpoint unter 100 ms** Antwortzeit.
- **Statistik-Dashboard (M17) lädt unter 2 Sekunden** bei realistischer Datenmenge.

### Plattform und Kompatibilität

- **Backend lauffähig auf x86_64 und arm64** (Docker-Multiarch-Builds).
- **Frontend funktioniert auf Mobile (iOS Safari, Android Chrome) und Desktop (Chromium, Firefox, Safari)**, jeweils aktuelle Stable.
- **Geolocation-API und Wakelock-API** mit Fallback-Hinweis bei nicht-Unterstützung.
- **IndexedDB** für RxDB; Safari-Eigenheit (Löschung nach 7 Tagen Inaktivität) wird durch Re-Sync abgefangen.

### Compliance und Lizenz

- **Projektlizenz:** **AGPL-3.0-only** seit M10.3 / ADR-051 §A (2026-05-01). Konsequenz aus dem Multi-Instanz-Anspruch („deployment-ready durch jedermann"): selbst hosten und forken erlaubt, proprietäre Closed-Source-Forks nicht. `LICENSE`-File im Repo-Root, SPDX-Identifier in `backend/pyproject.toml` und `frontend/package.json`.
- **Erlaubte Abhängigkeitslizenzen:** MIT, BSD-2/3, Apache-2.0, MPL-2.0, ISC, BSD-3-Clause, LGPL (bei dynamischem Linking), GPL/AGPL (mit AGPLv3 als Hauptprojekt kompatibel).
- **Ausgeschlossene Lizenzen:** kommerzielle proprietäre Lizenzen, „source-available"-Lizenzen mit Nutzungsbeschränkungen (BSL, SSPL, Commons Clause), unklare/fehlende Lizenz.

## 7. Qualitätsziele (messbar)

- **Testabdeckung-Mindestwert:** 70 % Zeilen für Domain-Module (Events, Applications, Persons, Catalog), 60 % für Routes und Frontend-Komponenten.
- **Kritische Pfade (höhere Abdeckung):**
  - **RLS-Policies: 100 %** — jede Policy hat mindestens einen positiven und einen negativen Test pro Rolle (siehe Test-Matrix in `tests/test_rls.py`).
  - **Auth-Flows (Login, Logout, Passwort-Reset): 90 %**.
  - **RxDB-Sync (M5b): 80 %** mit Offline-/Reconnect-Szenarien.
  - **Anonymisierungs-Funktion: 100 %** (DSGVO-Pflicht).
- **Statische Analyse:** `ruff check` und `mypy --strict` müssen grün sein für Backend; `eslint` und `tsc --noEmit` für Frontend.
- **Dokumentationspflicht:** Alle öffentlichen Funktionen und API-Endpoints mit Docstring/JSDoc. OpenAPI-Doku wird automatisch generiert und soll vollständig brauchbar sein.

## 8. Betrieb und Deployment

- **Deployment-Ziel:** Eigener VPS (Hetzner oder vergleichbar, EU-Standort), Docker Compose, Caddy als Reverse Proxy mit automatischem TLS.
- **CI/CD:** GitHub Actions, Pipeline-Datei `.github/workflows/ci.yml` (Lint, Tests, Build); Deployment manuell via Skript, später automatisierbar.
- **Umgebungen:** lokal (Docker Compose) → produktion (VPS). Staging-Environment optional, Entscheidung in M10.
- **Monitoring:** In M14 zu spezifizieren — Uptime Kuma oder externer Dienst, Notification via E-Mail oder Telegram.
- **Logging-Level Default:** `INFO` in Produktion, `DEBUG` lokal. Strukturiertes JSON-Logging mit Request-ID.

## 9. Entscheidungsbefugnisse

- **Freigabe-Entscheidungen trifft:** Patrick (Repository-Eigentümer, Admin der Live-Instanz).
- **Kommunikationskanal für Freigaben:** Im Konzeptions-Chat oder direkt im PR-Kommentar; bei Claude-Code-Sessions im laufenden Dialog.
- **Reaktionszeit-Erwartung:** Asynchron, keine harte Antwortzeit. Bei offenen Freigaben in Claude-Code: Session sauber pausieren mit STOPP-Block (siehe CLAUDE.md Abschnitt 8).

## 10. Repository-Regeln

- **Hauptbranch:** `main`
- **Push-Regel:** Direkter Push auf `main` durch Admin erlaubt während früher Entwicklung; ab M11 (Go-Live) nur über PR mit Self-Review.
- **Schutzregeln:** Keine Force-Pushes auf `main`. Feature-Branches werden nach Merge gelöscht. Tags ab erstem Go-Live mit SemVer-Schema (`v0.x.y`).
- **GitHub-Account:** Paddel87 (privat).

## 11. Offene Grundsatzfragen

- **Projektlizenz** (siehe Abschnitt 6): Entscheidung vor M11 — abhängig davon, ob die Multi-Instanz-Variante (siehe Abschnitt „Mögliche Variante") aktiv unterstützt werden soll.
- **Off-Site-Backup-Anbieter:** Konkrete Wahl in M13 (Hetzner Storage Box, Backblaze B2, oder anderer S3-kompatibler Anbieter).
- **E-Mail-Versanddienst:** Vor M11 zu wählen, sobald Passwort-Reset produktiv gebraucht wird (Postmark, Brevo, AWS SES, oder Self-Hosted SMTP).
- **Statistik-Granularität (M17):** Volle Aggregate vs. Mindestschwelle vs. nur eigene Daten — Entscheidung nach erstem Live-Betrieb.

## 12. Glossar (projektspezifische Begriffe)

Diese Begriffe haben in HC-Map eine definierte Bedeutung, die von allgemeiner Lesart abweichen kann:

- **Event:** Ein abgeschlossener oder laufender Gesamt-Vorgang an einem Ort, mit `started_at` und (nach Beendigung) `ended_at`. Hat eine oder mehrere Applications und mindestens einen Participant.
- **Application:** Eine konkrete Fesselungs-Aktion innerhalb eines Events. Hat Performer, Recipient, Restraints, Positionen, Reihenfolge (`sequence_no`), eigene Start- und Endzeit. Begriff bewusst neutral-technisch gewählt (siehe ADR-003); UI darf alternativ „Binding" verwenden.
- **Performer:** Person, die eine Application ausführt (i. d. R. der eingeloggte User).
- **Recipient:** Person, an der eine Application angewendet wird.
- **Participant:** Person, die zu einem Event als Beteiligte erfasst ist. Wird automatisch aus Performer/Recipient-Beziehungen abgeleitet (siehe ADR-012).
- **RestraintType:** Strukturierter Katalog-Eintrag für Fesselutensilien (Kategorie, Marke, Modell, Mechanik chain/hinged/rigid).
- **on-the-fly-Person:** Person, die im Live-Modus spontan ohne User-Account angelegt wurde (`origin = 'on_the_fly'`, siehe ADR-014).
- **linkable:** Flag an einer Person, das vom Admin gesetzt wird, um die Person für eine spätere User-Verknüpfung freizugeben.
- **Live-Modus:** Hauptansicht der App, Erfassung in der Situation mit GPS, Timer und Schnellaktionen (siehe ADR-011). Gegenstück: nachträgliche Erfassung.
- **Pfad A / Pfad B:** Interne Bezeichnungen für die beiden Scope-Stufen — A = aktive private Gruppe <20, B = potenzielle Community 50–500 mit DSGVO-Programm.
- **reveal_participants:** Event-Flag, das steuert, ob Namen weiterer Beteiligter für andere Beteiligte sichtbar sind. Default `false`.

---

## HC-Map-spezifische Ergänzungen

Die folgenden Abschnitte sind nicht Teil der generischen Vorlage, aber für HC-Map relevant:

### Vision

Eine selbst gehostete Plattform zur Erfassung und kartografischen Darstellung von Fesselungs-Ereignissen (Bondage-Kontext, einvernehmlich, Erwachsene) mit detailliertem Bindings-Logbuch pro Ereignis. Kernmotiv: **Datensouveränität** — eigene Kontrolle über Speicherung und Zugriff. Vorläufer: Ereignis-Erfassung bei what3words, abgelöst.

### Bestätigter Nutzer-Pull

Die Gruppe ist nicht potenzieller, sondern aktiver Adressat — Mitglieder wünschen sich die Plattform ausdrücklich und sind bereit, sie zu nutzen. Das Projekt löst ein konkret artikuliertes Bedürfnis.

### Pfad-A vs. Pfad-B (zwei Scope-Stufen)

**Pfad A (aktiv):**
- Private Gruppe, <20 Personen, einander bekannt.
- Admin lädt User ein, keine Selbstregistrierung.
- Einwilligungen aller Mitglieder schriftlich dokumentiert (außerhalb des Systems).
- Mobil und Desktop, Mobil aber nicht-verhandelbar.

**Pfad B (möglich, nicht aktiv):**
- Geschlossene Community 50–500 Personen, Selbstregistrierung mit Admin-Freigabe.
- **Aktivierung nur nach:** juristischer Prüfung, vollständigem DSGVO-Programm (Impressum, Datenschutzerklärung, AV-Vertrag, Löschkonzept, ggf. DSFA), Ausbau Moderations- und Audit-Features, Re-Evaluation Hoster-Vertrauen und Anonymisierung.

### Mögliche Variante: Multi-Instanz statt Multi-Tenant

Falls andere Gruppen das System nutzen wollen, ist der **technisch und rechtlich einfachste Weg keine Erweiterung zu Pfad B**, sondern eine **eigene Instanz pro Gruppe**: gleicher Code, eigener VPS, eigene DB, eigener Admin-Bootstrap. Trägt jeder Gruppen-Admin rechtlich nur für seine eigene Gruppe Verantwortung. Diese Variante wird **nicht aktiv verfolgt**, sondern bleibt als Möglichkeit offen.

### Architekturgrundsatz

Pfad A produktiv starten, Architektur so bauen, dass Pfad B (oder Multi-Instanz) ohne grundlegenden Umbau möglich bleibt:

- Row-Level-Security von Anfang an multi-tenant-fähig.
- Auth-Schicht so gestaltet, dass Self-Registration später zuschaltbar ist.
- Datenmodell sieht Platzhalter für Moderations- und Einwilligungs-Features vor (nicht implementiert, aber nicht verbaut).

### Sicherheits- und Datenschutz-Grundsätze

- **Hosting:** Eigener VPS, EU-Standort.
- **Transport:** TLS Pflicht auf allen Endpunkten (Caddy + Let's Encrypt).
- **At-rest:** Full-Disk-Encryption auf Server-Ebene.
- **Backups:** Verschlüsselt, an separatem Standort, regelmäßig wiederherstellungsgetestet.
- **Keine App-seitige Verschlüsselung** der Nutzdaten (bewusste Entscheidung, ADR-001).
- **Vertrauensmodell:** Admin und VPS-Hoster gelten als vertraut. Mitglieder stimmen dem mit Einwilligung zu. Bei Wechsel in Pfad B neu zu bewerten.

### Bekannte konzeptuelle Kompromisse

- **Anonymisierung ≠ Anonymisierung im DSGVO-Sinn:** Beim Ausscheiden eines Mitglieds wird der Name durch Platzhalter ersetzt; in einer <20-Personen-Gruppe, in der sich alle kennen, ist Re-Identifikation über Kontext praktisch möglich. In Pfad A akzeptiert, für Pfad B unzureichend (siehe ADR-002).
- **Aggregat-Statistik nur scheinbar anonym:** In einer kleinen Gruppe können Aggregate über Vorlieben einzelner Mitglieder re-identifizierend wirken (siehe ADR-015).

### Vor produktivem Go-Live (Pfad A)

- Einwilligungstext für Gruppenmitglieder erarbeiten. Muss explizit benennen:
  - Vertrauensmodell gegenüber dem VPS-Hoster (ADR-001).
  - Anonymisierungs-Kompromiss bei Ausscheiden (ADR-002).
  - On-the-fly-Erfassung externer Personen ohne deren vorherige Einwilligung (ADR-014).
  - Kollektive Aggregat-Statistiken sind in einer kleinen Gruppe nur scheinbar anonym (ADR-015).
  - **IndexedDB-Inhalte des eigenen Endgeräts liegen unverschlüsselt vor (ADR-032).** Geräteverschlüsselung (FileVault, BitLocker, Android FBE, iOS Data Protection) ist User-Verantwortung; App-PIN aus M5a.4 schützt nur die UI, nicht den Storage.
- Interne Mini-Datenschutzerklärung, auch wenn geschlossener Rahmen.

### Vor Aktivierung Phase-2-Features (M15)

- Einwilligungstext um **Foto-/Medien-Speicherung** erweitern, bevor M15 (Foto-Anhänge) gestartet wird (ADR-015).

---

**Pflegehinweis:** Änderungen an Status, Stack oder Constraints sind freigabepflichtig (siehe `CLAUDE.md` Abschnitt 4) und erzeugen einen ADR-Eintrag. Statuswechsel (z. B. `alpha` → `beta`) ziehen außerdem README-Badge- und CHANGELOG-Updates nach sich.
