<!--
Zweck: Architektur- und Grundsatzentscheidungen für HC-Map als ADRs
(Architecture Decision Records). Jede Entscheidung ist nachvollziehbar und
bleibt auch nach Monaten/Jahren verständlich – inkl. Kontext, Begründung,
Konsequenzen und verworfenen Alternativen.

Update-Trigger:
- Neue Grundsatzentscheidung wird getroffen → neuer ADR
- Bestehende Entscheidung wird revidiert → alten ADR auf "superseded" setzen,
  neuen ADR anlegen, im neuen ADR auf den alten verweisen
- Kontextänderung macht Entscheidung fragwürdig → ADR-Review in `fahrplan.md` einplanen

NICHT hierher: Arbeitsstand (→ `fahrplan.md`), Code-Details (→ `architecture.md`),
Projektkontext (→ `project-context.md`), Blocker (→ `blockers.md`).

Status-Legende:
- Proposed   – Entwurf, noch nicht endgültig
- Accepted   – Beschlossen und gültig
- Superseded – Durch späteren ADR ersetzt (Referenz angeben)
- Deprecated – Nicht mehr relevant, aber historisch dokumentiert
-->

# HC-Map — Architecture Decisions

## Übersicht

| ID      | Titel                                                         | Status   | Datum       |
|---------|---------------------------------------------------------------|----------|-------------|
| ADR-001 | Hoster-Vertrauen und Verzicht auf App-seitige Verschlüsselung | Accepted | 2026-04-22  |
| ADR-002 | Anonymisierung beim Ausscheiden von Mitgliedern               | Accepted | 2026-04-22  |
| ADR-003 | Entitätsname „Application" statt Binding/Cuffing              | Accepted | 2026-04-22  |
| ADR-004 | Geokodierung: Abschied von what3words, Lat/Lon + Plus Codes   | Accepted | 2026-04-22  |
| ADR-005 | Backend-Stack: FastAPI + SQLAlchemy + Postgres/PostGIS        | Accepted | 2026-04-22  |
| ADR-006 | Authentifizierung: fastapi-users (integriert)                 | Accepted | 2026-04-22  |
| ADR-007 | Frontend-Stack: Next.js + TypeScript + Tailwind + shadcn/ui   | Accepted | 2026-04-22  |
| ADR-008 | Karten-Layer: MapLibre GL JS, MapTiler jetzt, Self-Host später | Accepted | 2026-04-22  |
| ADR-009 | Vorgehensmodell: Vision-driven Scoping vor Code                | Accepted | 2026-04-22  |
| ADR-010 | User ↔ Person als Pflicht-1:1-Verknüpfung                      | Accepted | 2026-04-22  |
| ADR-011 | Live-Modus als primäres Erfassungsparadigma                    | Accepted | 2026-04-22  |
| ADR-012 | Auto-Participant: Performer/Recipient → EventParticipant        | Accepted | 2026-04-22  |
| ADR-013 | Vorlagen/Favoriten bewusst aufgeschoben                         | Accepted | 2026-04-22  |
| ADR-014 | On-the-fly-Personenanlage und nachträgliche User-Verknüpfung   | Accepted | 2026-04-22  |
| ADR-015 | Feature-Set basierend auf Wettbewerbs- und Tagebuch-App-Analyse| Accepted | 2026-04-22  |
| ADR-016 | SQLAdmin als parallele Admin-Schicht                            | Accepted | 2026-04-22  |
| ADR-017 | RxDB für Offline-Sync in Live-Modus                             | Accepted | 2026-04-22  |
| ADR-018 | Implementierungsstrategie M1 (Schema, Migrations, RLS-Default) | Accepted | 2026-04-25  |
| ADR-019 | Implementierungsstrategie M2 (Auth, CSRF, RLS-Mechanik)         | Accepted | 2026-04-25  |
| ADR-020 | Implementierungsstrategie M3 (Domain-API, Search, Export)       | Accepted | 2026-04-25  |
| ADR-021 | Implementierungsstrategie M4 (Frontend-Grundgerüst, Auth-Flow)  | Accepted | 2026-04-25  |
| ADR-022 | LocationPicker und Tile-Proxy in M5a vorgezogen                 | Accepted | 2026-04-26  |
| ADR-023 | App-PIN-Hashing clientseitig via PBKDF2 (Web Crypto API)        | Accepted | 2026-04-26  |
| ADR-024 | Implementierungsstrategie M5a.1 (Live-Endpoints + Tile-Proxy)   | Accepted | 2026-04-26  |
| ADR-025 | User-Modell erbt von SQLAlchemyBaseUserTableUUID (typing-fix)   | Accepted | 2026-04-26  |
| ADR-026 | Implementierungsstrategie M5a.2 (Frontend Startseite, Suche, Export) | Accepted | 2026-04-26 |
| ADR-027 | Implementierungsstrategie M5a.3 (Frontend Live-Modus + LocationPickerMap) | Accepted | 2026-04-26 |
| ADR-028 | Implementierungsstrategie M5a.4 (App-PIN-Sperre)                | Accepted | 2026-04-26  |
| ADR-029 | Conflict-Resolution-Strategie M5b (Live-First mit Reconciliation) | Accepted | 2026-04-26 |
| ADR-030 | Soft-Delete und Cursor-Felder auf event/application (M5b)       | Accepted | 2026-04-26  |
| ADR-031 | RxDB-Schema-Source-of-Truth: hand gepflegt + Drift-Test         | Accepted | 2026-04-26  |
| ADR-032 | IndexedDB-Storage-Encryption: keine Encryption in Pfad A        | Accepted | 2026-04-26  |
| ADR-033 | Implementierungsstrategie M5b.2 (Sync-Endpoints + Owner-SELECT-Policy) | Accepted | 2026-04-26 |
| ADR-034 | Implementierungsstrategie M5b.3 (RxDB-Frontend-Setup + Live-Modus-Refactor) | Accepted | 2026-04-26 |
| ADR-035 | Implementierungsstrategie M5b.4 (E2E-Offline-Test + Coverage-Tooling)   | Accepted | 2026-04-27 |
| ADR-036 | M5c-Framework + Implementierungsstrategie M5c.1a (Detail-Page Client-only) | Accepted | 2026-04-27 |
| ADR-037 | Implementierungsstrategie M5c.1b (Participants als RxDB-Sync-Collection) | Accepted | 2026-04-27 |
| ADR-038 | Implementierungsstrategie M5c.2 (EventDetailView, Lücken-Anzeige, Frontend-Maskierung) | Accepted | 2026-04-27 |
| ADR-039 | Implementierungsstrategie M5c.3 (Nachträgliche Erfassung)                | Accepted | 2026-04-27 |
| ADR-040 | Implementierungsstrategie M5c.4 (Edit-UI mit RxDB-Push, Soft-Delete, RBAC) | Accepted | 2026-04-27 |
| ADR-041 | Implementierungsstrategie M6 (Kartenansicht: MapView, Cluster, Filter, Geocoding) | Accepted | 2026-04-27 |
| ADR-042 | Sonner-Major-Upgrade (v1.7.4 → v2.x) für React-19-Kompatibilität | Accepted | 2026-04-29 |
| ADR-043 | Implementierungsstrategie M7 (Katalog-Verwaltung, Vorschlags-Workflow, Reject-Status) | Accepted | 2026-04-29 |
| ADR-044 | Karten-DoD-Härtung (HOTFIX-002): Glyph-Proxy + RxDB-v17-Strict-Checks | Accepted | 2026-04-29 |
| ADR-045 | Implementierungsstrategie M7.4 (Freigabe-Queue + Editor-Withdraw)        | Accepted | 2026-04-29 |
| ADR-046 | Restraint-IDs als Array auf ApplicationDoc (M7.5 Sync-Erweiterung)       | Accepted | 2026-04-29 |
| ADR-047 | Next.js 15.0.4 → 16.2.4 Migration (Pfad C aus Blocker #001)              | Accepted | 2026-04-30 |
| ADR-048 | Backend-Stack-Drift Voll-Sweep (Variante B aus Audit Blocker #001 Punkt 3) | Accepted | 2026-04-30 |
| ADR-049 | Implementierungsstrategie M8 (Admin-Bereich: SQLAdmin + Next.js-Workflow)   | Accepted | 2026-04-30 |
| ADR-050 | M9 (w3w-Migration) verworfen — `event.w3w_legacy` → `legacy_external_ref` | Accepted | 2026-05-01 |

---

## ADR-001 — Hoster-Vertrauen und Verzicht auf App-seitige Verschlüsselung

**Status:** Accepted
**Datum:** 2026-04-22
**Scope:** Pfad A (siehe `project-context.md`). Bei Wechsel in Pfad B zwingend neu zu bewerten.

### Kontext
HC-Map speichert Ereignisdaten mit besonders sensiblem Inhalt (Kategorie Art. 9 DSGVO:
Sexualleben). Hosting erfolgt auf einem eigenen VPS bei einem externen Hoster.
Technisch hat ein Hoster immer Root-Zugriff auf die Hardware und damit auf alle
Daten, die nicht zusätzlich app-seitig verschlüsselt sind.

Die Frage: Sollen Nutzdaten app-seitig (Ende-zu-Ende bzw. Client-Side) verschlüsselt
werden, sodass der Hoster auch bei Rootzugriff nichts Lesbares findet?

### Entscheidung
Keine app-seitige Verschlüsselung der Nutzdaten. Stattdessen Standard-Sicherheitsmaßnahmen:

- TLS auf allen Endpunkten
- Full-Disk-Encryption auf Server-Ebene
- Verschlüsselte, regelmäßig getestete Backups an separatem Standort
- EU-Hoster (Datenschutzniveau, AV-Vertrag)
- Hardening (Fail2ban, minimale offene Ports, SSH-Key-Only, regelmäßige Updates)

### Begründung
- Pfad A hat <20 Mitglieder, die sich persönlich kennen und dem Admin ausdrücklich
  vertrauen. Die Vertrauensbasis ist real und dokumentiert.
- App-seitige Verschlüsselung schränkt zentrale Features stark ein:
  Server-seitige Filter, Volltextsuche in Notizen, aggregierte Statistiken,
  effiziente Indizes auf verschlüsselten Feldern sind nicht oder nur mit erheblichem
  Aufwand möglich (z. B. per homomorpher Verschlüsselung oder deterministischer
  Verschlüsselung mit eigenen Nachteilen).
- Entwicklungsaufwand und Wartungsrisiko steigen deutlich; Key-Management wird
  zu einem eigenen Dauerproblem (Schlüsselverlust = Datenverlust).
- Das Hobby-Scope rechtfertigt diesen Zusatzaufwand aktuell nicht.

### Konsequenzen
**Positiv:**
- Schlanke Architektur, volle Feature-Freiheit (Suche, Filter, Statistiken server-seitig).
- Einfache Backups und Restores.
- Standardwerkzeuge (Postgres, gängige ORMs, Karten-Libraries) bleiben ohne Umweg nutzbar.

**Negativ (bewusst in Kauf genommen):**
- Der Hoster könnte bei Rootzugriff theoretisch alle Nutzdaten lesen.
- Bei Rechtshilfeersuchen gegen den Hoster wären die Daten zugänglich.
- Mitglieder müssen diesem Vertrauensmodell explizit zustimmen (Einwilligungstext).

**Harte Auflagen:**
- Dieser ADR gilt **nur** für Pfad A. **Vor Wechsel zu Pfad B muss neu entschieden werden**, weil die Einwilligung von dann fremden Mitgliedern auf anderer Grundlage steht.
- Einwilligungstext muss das Vertrauensmodell explizit benennen.

### Verworfene Alternativen
- **Volle Ende-zu-Ende-Verschlüsselung (z. B. Clientseitig mit Gruppen-Key):**
  Zu hoher Aufwand, behindert Features, Schlüsselverlust = Totalausfall.
- **Feldweise Verschlüsselung sensibler Felder (z. B. nur Notizen):**
  Halber Gewinn, aber fast der volle Aufwand; verleitet zu falschem Sicherheitsgefühl, weil Metadaten (Beteiligte, Ort, Zeit) weiterhin offen liegen.
- **Self-Hosting auf Hardware zu Hause:**
  Eliminiert das Hoster-Problem, schafft dafür Verfügbarkeits-, Backup- und Netzwerkprobleme, die ein Hobbyprojekt überfordern.

---

## ADR-002 — Anonymisierung beim Ausscheiden von Mitgliedern

**Status:** Accepted
**Scope:** Pfad A. Bei Wechsel in Pfad B zwingend neu zu bewerten.
**Datum:** 2026-04-22

### Kontext
Scheidet ein Mitglied aus und verlangt Löschung seiner personenbezogenen Daten,
kollidiert das mit Events, an denen es als Participant, Performer oder Recipient
beteiligt war. Vollständige Event-Löschung zerstört Daten der anderen Beteiligten;
Nicht-Löschung verletzt die DSGVO-Rechte des Ausscheidenden.

### Entscheidung
Beim Ausscheiden wird der Personendatensatz **anonymisiert**: Namens- und
Identifikationsfelder werden durch Platzhalter ersetzt (`name = "[gelöscht]"`,
Alias leer, Mailadresse null, User-Account deaktiviert). Verknüpfungen in Events,
Applications (als Performer/Recipient) und EventParticipant bleiben bestehen,
zeigen aber auf den anonymisierten Datensatz.

### Begründung
- Die anderen Beteiligten haben ein legitimes Interesse an ihrer eigenen Historie.
- In einer <20-Personen-Gruppe kennt sich ohnehin jeder; echte DSGVO-konforme
  Anonymisierung (Re-Identifikation praktisch ausgeschlossen) ist in diesem
  Setting unmöglich, weil Kontext, Datum, Ort und Mitbeteiligte identifizierend sind.
- Die Einwilligung der Mitglieder beim Eintritt adressiert diesen Fall ausdrücklich.

### Konsequenzen
**Positiv:**
- Datenhistorie der Gruppe bleibt nutzbar.
- Einfache technische Umsetzung (UPDATE statt komplexe Kaskaden-Löschung).

**Negativ (bewusst in Kauf genommen):**
- **Das ist keine Anonymisierung im DSGVO-Sinn, sondern Pseudonymisierung.** Für
  Außenstehende wirkt sie anonymisierend, für Gruppenmitglieder nicht. Der
  Einwilligungstext muss diesen Punkt klar benennen.
- Für Pfad B reicht dieser Ansatz **nicht** — dort muss entweder eine härtere
  Lösung (z. B. Event-Löschung bei Widerspruch eines Beteiligten, kryptografische
  Tombstones, Gruppenbildung mit echter Fremdheit) gewählt werden oder das
  Zugriffsmodell grundlegend anders gedacht werden.

**Harte Auflagen:**
- Einwilligungstext muss den Kompromiss beschreiben.
- Vor Pfad B ist dieser ADR zwingend zu revidieren.

### Verworfene Alternativen
- **Vollständige Kaskadenlöschung aller Events mit dem Ausscheidenden:**
  Beraubt die verbleibenden Beteiligten ihrer eigenen Historie.
- **Admin entscheidet pro Einzelfall:**
  Nicht skalierbar, intransparent für den Ausscheidenden.
- **Keine Löschung, nur Konto-Deaktivierung:**
  Erfüllt keine DSGVO-Mindestanforderung.

---

## ADR-003 — Entitätsname „Application" statt Binding/Cuffing

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Die zentrale Entität — eine einzelne Fesselaktion innerhalb eines Events — brauchte
einen eindeutigen, technisch sauberen Namen. Diskutiert wurden: `Binding`
(szenenüblich), `Cuffing` (passt zum Projektnamen HC = Handcuff), `Application`
bzw. `Restraint Application` (neutral-technisch).

### Entscheidung
Datenbank, API, Code und interne Dokumentation verwenden durchgehend `Application`.
Das UI darf szenenahe Label verwenden (z. B. „Binding") — diese werden in der
UI-Schicht als Übersetzung/Anzeigetext gepflegt, ohne das technische Modell zu beeinflussen.

### Begründung
- Neutral-technisch: bildet jede Form von Fesselung ab, nicht nur Handschellen oder Seil.
- Sprachlich präzise: beschreibt die Handlung („das Anlegen"), nicht nur das Resultat.
- Trennung Technik/UI ermöglicht spätere Anpassung des Anzeige-Labels ohne Schema-Migration.

### Konsequenzen
**Positiv:**
- Tabellennamen, Klassen, API-Routen bleiben stabil und aussagekräftig.
- UI kann zielgruppenspezifisch beschriftet werden.

**Negativ:**
- Technische Dokumentation und UI-Sprache weichen voneinander ab → muss in Onboarding erklärt werden.

### Verworfene Alternativen
- **`Binding`:** Mehrdeutig (in IT-Kontext = Variablenbindung, Netzwerk-Binding).
- **`Cuffing`:** Zu eng (passt nicht zu Seil, Manschetten, Klebeband).
- **`Restraint`:** Beschreibt eher den Zustand als die Aktion.

---

## ADR-004 — Geokodierung: Abschied von what3words, Lat/Lon + Plus Codes

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Bestehende Ereignisdaten sind bei what3words (w3w) als 3-Wort-Adressen gespeichert.
w3w ist ein proprietäres System: Algorithmus, Wortliste und Zuordnung unterliegen
dem geistigen Eigentum des Anbieters, der in der Vergangenheit rechtlich aggressiv
gegen Open-Source-Reimplementierungen (z. B. WhatFreeWords) vorgegangen ist.
Eine weitere Nutzung ohne w3w-API bedeutet:

- Eigenständige Umrechnung: rechtlich riskant.
- API-Nutzung: Lizenzkosten, laufende Abhängigkeit — kollidiert direkt mit dem
  Kernmotiv des Projekts (Datensouveränität).

### Entscheidung
1. **Bestand wird manuell nacherfasst, kein Migrationsskript** (siehe ADR-050,
   2026-05-01). Ursprünglich vorgesehen war ein einmaliger Skriptlauf gegen die
   w3w-API; die geringe Datenmenge macht das unverhältnismäßig. Die optionale
   Mitführung der alten 3-Wort-Adresse erfolgt über die umgewidmete Spalte
   `event.legacy_external_ref` (vormals `w3w_legacy`).
2. **Interne Primärspeicherung:** Lat/Lon (Dezimalgrad, WGS84).
3. **Primäres UI-Format:** Plus Codes (Open Location Codes). Lokal aus Lat/Lon
   berechnet, keine API-Abhängigkeit, Apache-2.0-lizenziert. Lat/Lon bleibt
   im UI als technische Zusatzanzeige verfügbar (Export, Developer-Tools).
4. **Eingabemodi:** offen für Plus Code, Karten-Klick und Adress-Suche — konkrete
   Umsetzung wird in `architecture.md` / `fahrplan.md` festgelegt.
5. **w3w-Account kann sofort gekündigt werden**, keine laufende Abhängigkeit mehr.
   Mitglieder, die alte 3-Wort-Adressen erhalten möchten, sichern sie vor der
   Kündigung extern (außerhalb des Systems).

### Begründung
- Eliminiert Anbieter-Lock-in und Lizenzkosten.
- Plus Codes bieten die menschenfreundliche Kompaktheit von w3w, ohne dessen
  rechtliche Fallstricke.
- Lat/Lon ist der De-facto-Standard: jede Karten-Library, jedes Geospatial-Tool,
  jede DB (Postgres/PostGIS, SQLite/SpatiaLite) versteht es direkt.
- Plus Codes sind rein rechnerisch aus Lat/Lon ableitbar — keine doppelte
  Wahrheit, keine Konsistenzprobleme.

### Konsequenzen
**Positiv:**
- Datensouveränität ist für Geodaten vollständig gewährleistet.
- Keine laufenden externen Kosten oder API-Abhängigkeiten.
- Karten-Stack bleibt offen (MapLibre + OpenStreetMap-Tiles oder Self-Hosted Tileserver).

**Negativ:**
- Einmaliger Migrationsaufwand: Script, das durch die w3w-Historie läuft und
  Koordinaten abruft. Größe hängt von Datenbestand ab.
- Nutzer müssen sich an Plus Codes gewöhnen — weniger eingängig als 3 Wörter,
  aber kompakter und mit Ortsbezug-Shortcodes gut handhabbar.

### Verworfene Alternativen
- **w3w-API weiter nutzen:** Widerspricht Datensouveränitäts-Motiv, laufende Kosten.
- **Eigene 3-Wort-Implementierung (à la WhatFreeWords):** Rechtlich riskant.
- **Geohash als UI-Primärformat:** Sehr kompakt, aber weniger lesbar; wird ggf.
  trotzdem intern für Indizierung genutzt — das ist eine Architekturfrage, kein Widerspruch.
- **Nur Lat/Lon im UI:** Technisch sauber, aber schlecht für schnelle mündliche oder
  schriftliche Weitergabe zwischen Mitgliedern.

---

## ADR-005 — Backend-Stack: FastAPI + SQLAlchemy + Postgres/PostGIS

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Python wurde als Backend-Sprache gewählt. Innerhalb Python stehen zwei
Hauptkandidaten zur Wahl: Django (Batteries-included mit Django Admin) und
FastAPI (API-first, schlank, modern typisiert). Datenbank-Entscheidung Postgres
mit PostGIS stand bereits fest.

### Entscheidung
- **Framework:** FastAPI (aktuelle Major-Version).
- **ORM:** SQLAlchemy 2.0 (moderne getypte Syntax) + Alembic für Migrations.
- **Validierung/Schemata:** Pydantic v2.
- **Datenbank:** PostgreSQL mit PostGIS-Erweiterung.
- **Row-Level-Security:** Postgres-Native-RLS von Anfang an multi-tenant-fähig
  konfiguriert — auch in Pfad A, damit Pfad B ohne Schema-Umbau möglich bleibt.
- **Package-Manager:** uv oder Poetry (wird in `architecture.md` festgelegt).

### Begründung
- FastAPI ist modern typisiert, async-fähig, generiert OpenAPI-Docs automatisch —
  ideal für KI-unterstützte Entwicklung und Review.
- SQLAlchemy 2.0 hat eine saubere, typisierte API, die sich gut mit Pydantic v2 paart.
- Postgres mit PostGIS ist der De-facto-Standard für Geodaten mit erstklassiger RLS-Unterstützung.
- Die Kombination ist in der Python-Community sehr gut dokumentiert, viele Referenzimplementierungen.

### Konsequenzen
**Positiv:**
- Klare Trennung API ↔ UI (Next.js kann ohne Kompromisse als separates Frontend laufen).
- Automatische API-Dokumentation (Swagger/ReDoc) über OpenAPI.
- RLS auf DB-Ebene ist eine harte Isolationsgrenze — selbst ein Bug im Application-Code kann keine Mandantenisolation brechen.
- Gute Test-Werkzeuge (pytest, pytest-asyncio, testcontainers).

**Negativ (bewusst in Kauf genommen):**
- **Kein Admin-Interface out-of-the-box** — muss komplett selbst gebaut werden
  (im Next.js-Frontend als separater Admin-Bereich mit Rolle `Admin`).
- Mehr Boilerplate-Code als Django für Standardaufgaben (User-Management,
  Passwort-Reset, E-Mail-Verifikation) — fastapi-users deckt das weitgehend ab (→ ADR-006).
- RLS-Policies müssen sorgfältig getestet werden (Policy-Lücke = Daten-Leck).

### Verworfene Alternativen
- **Django + Django Ninja + Django Admin:** Admin-UI geschenkt, aber strengere Konventionen und engere Kopplung zwischen ORM und Framework; langfristig weniger Flexibilität.
- **Flask + SQLAlchemy:** Geringerer Komfort bei Typisierung und API-Docs.
- **Node/TypeScript (NestJS):** Einheitlicher Stack mit Frontend, aber Python wurde bereits als Backend-Sprache entschieden.

---

## ADR-006 — Authentifizierung: fastapi-users (integriert)

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Auth-Lösung für Pfad A (<20 Nutzer, Admin-gesteuerte User-Anlage) mit
Erweiterbarkeit für Pfad B (Selbstregistrierung + Admin-Freigabe). Drei
Kandidaten: integrierte Lösung (fastapi-users), externer Identity-Provider
(Authentik / Keycloak), oder Magic-Link-Only.

### Entscheidung
- **Library:** fastapi-users mit SQLAlchemy-Adapter.
- **Methoden in Pfad A:** E-Mail + Passwort, JWT-Token (mit Refresh) oder
  HttpOnly-Cookie-Sessions — finale Wahl in `architecture.md`.
- **User-Store:** gleiche Postgres-DB wie Anwendungsdaten, eigenes Schema oder Präfix.
- **Rollen (RBAC):** Admin, Editor, Viewer — direkt am User-Modell als Enum/Flag-Feld.
- **Bootstrap:** Der erste Admin wird über ein CLI-Skript oder initiale Migration erzeugt.
- **Self-Registration:** in Pfad A deaktiviert (Admin legt User an). In Pfad B aktivierbar mit Admin-Freigabe-Flag (`status = pending`) im User-Datensatz.

### Begründung
- fastapi-users ist aktiv gepflegt, gut in FastAPI-Ökosystem integriert, typisiert.
- Deckt Standardfeatures ab: Passwort-Reset, E-Mail-Verifikation, Token-Refresh.
- Unterstützt zukünftig auch OAuth-Provider und Magic Links ohne Umbau.
- Keine zusätzliche Server-Komponente (im Gegensatz zu Keycloak/Authentik).

### Konsequenzen
**Positiv:**
- Alles in einer Codebase, einer DB, einem Deployment-Artefakt.
- Schnelle Inbetriebnahme.
- Pfad-B-Erweiterung (Self-Registration + Queue) ist rein Datenmodell-Erweiterung.

**Negativ:**
- Wechsel auf externen Identity-Provider später erfordert Migration (überschaubar bei <20 Nutzern in Pfad A, größer bei Pfad B).
- Passwort-Hashing, Sessions, Rate-Limiting auf Login-Endpunkten müssen sorgfältig konfiguriert werden — kein „geschenkter" Schutz.

### Verworfene Alternativen
- **Keycloak / Authentik (self-hosted IdP):** Überdimensioniert für <20 Nutzer; zusätzlicher Betriebsaufwand und Ressourcenverbrauch auf dem VPS.
- **Magic-Link-Only:** Eleganter Ansatz für kleine Gruppen, schafft aber Abhängigkeit von zuverlässiger Mailzustellung; bei Mail-Problemen sind Nutzer ausgesperrt. Als zusätzliche Methode später dennoch zuschaltbar.

---

## ADR-007 — Frontend-Stack: Next.js + TypeScript + Tailwind + shadcn/ui

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Mobile und Desktop sind gleichwertig wichtig. React wurde als Framework
gewählt; innerhalb React stand Next.js gegen leichtgewichtigere Alternativen.
UI-Komponenten und Styling-Strategie stehen ebenfalls zur Entscheidung.

### Entscheidung
- **Framework:** Next.js (App Router, aktuelle stabile Major-Version).
- **Sprache:** TypeScript (strict mode).
- **Styling:** Tailwind CSS.
- **Komponentenbibliothek:** shadcn/ui (kopierte, selbstgehostete Komponenten, kein NPM-Lock-in).
- **Karten-Integration:** `react-map-gl` mit MapLibre-Adapter (→ ADR-008).
- **State-Management:** TanStack Query für Server-State, React Context/useState für UI-State. Keine globale Store-Library im MVP.
- **Rendering-Strategie:** Default Server Components; Client Components gezielt nur dort, wo nötig (Karte, Formulare mit Live-Validierung).

### Begründung
- Next.js hat das größte React-Ökosystem, viele Referenzen, gute Mobile-First-Patterns.
- Tailwind + shadcn/ui ist aktuell Standard für schnelle, professionell aussehende Oberflächen ohne externe UI-Lib-Abhängigkeit.
- TypeScript ist für KI-unterstützte Entwicklung nahezu Pflicht — ohne Typen läuft Claude Code deutlich öfter auf Halluzinationen.
- TanStack Query löst Caching, Invalidation und Loading-States elegant.

### Konsequenzen
**Positiv:**
- Schnelle Iteration, viele fertige Patterns, große Community.
- Mobile-First-Design mit Tailwind ist geradlinig.
- Bei Pfad-B-Wechsel sind SSR/SEO-Features bereits verfügbar, falls öffentliche Teile nötig werden.

**Negativ:**
- Next.js braucht einen Node-Runtime-Prozess auf dem VPS (nicht reiner Static-Export, sobald Server-Components oder Middleware genutzt werden).
- App Router hat eine steilere Lernkurve als klassisches React-Routing.
- shadcn/ui-Komponenten sind kopiert — Updates nicht automatisch, müssen gezielt eingespielt werden. Das ist gewollt, aber erfordert Disziplin.

### Verworfene Alternativen
- **SvelteKit:** Schlanker und performant, aber kleineres Ökosystem für Karten/UI-Libraries und weniger KI-Trainingsdaten.
- **Vite + React (ohne Next.js):** Einfacher, aber SSR/Routing/API-Proxy müsste selbst konfiguriert werden.
- **Reine Static-Export-Strategie:** würde interaktive Features (Auth-Flows, Live-Daten) ausschließen oder umständlicher machen.

---

## ADR-008 — Karten-Layer: MapLibre GL JS, MapTiler Cloud jetzt, Self-Hosting später

**Status:** Accepted
**Datum:** 2026-04-22
**Scope:** Phase 1 (Go-Live Pfad A) mit geplanter Migration zu Self-Hosting als eigener Meilenstein (→ `fahrplan.md`).

### Kontext
Die Plattform braucht einen Karten-Layer für Eingabe (Event-Ort auswählen) und
Anzeige (Events auf Karte darstellen). Datensouveränität ist Kernmotiv,
Self-Hosting der Tiles ist aber mit spürbarem Setup-Aufwand verbunden.
Kompromiss: schneller Start, saubere Migration später.

### Entscheidung
**Phase 1 (Go-Live Pfad A):**
- **Client-Library:** MapLibre GL JS (BSD-3-lizenzierter Fork von Mapbox GL JS vor v2).
- **Integration in React/Next.js:** `react-map-gl` mit MapLibre-Adapter.
- **Tile-Quelle:** MapTiler Cloud (Free-Tier, 100.000 Requests/Monat, EU-Hoster).
- **API-Key-Handling:** Schlüssel in Server-seitiger Config, Domain-Restriction im MapTiler-Dashboard, ggf. Tile-Proxy über das eigene Backend zur Key-Abschirmung.

**Phase 2 (geplanter Meilenstein in `fahrplan.md`):**
- Umstellung auf Self-Hosted Tileserver auf dem VPS.
- Stack-Kandidat: OpenMapTiles-Daten + tileserver-gl-light oder tegola.
- Regionaler OSM-Extract (z. B. DACH) für geringen Ressourcenverbrauch (~3–6 GB Disk).
- Update-Zyklus: monatlich oder quartalsweise.

### Begründung
- MapLibre ist zukunftssicher, vollständig OSS, kompatibel mit jedem Tile-Format.
- MapTiler: EU-basiert, DSGVO-freundlich, Free-Tier weit oberhalb des Bedarfs einer <20-Personen-Gruppe, keine Kreditkartenpflicht, bei Überschreitung stoppen Karten statt Überraschungsrechnung zu generieren.
- Self-Hosting-Pfad bleibt technisch offen, weil MapLibre nur die Tile-URL wechseln muss — kein Architekturumbau.
- Early-Launch-Vorteil: Karten-Setup blockiert nicht den MVP, Fokus zunächst auf Datenmodell, RLS, Erfassung.

### Konsequenzen
**Positiv:**
- Schneller Start, schöne Karten ohne Setup-Aufwand.
- Klare Migrationsperspektive, im Fahrplan fixiert.
- Kartensouveränität bleibt als explizites Ziel sichtbar und adressierbar.

**Negativ (bewusst in Kauf genommen):**
- Externe Abhängigkeit in Phase 1 — Tile-Requests gehen an MapTiler, inkl. IP-Adressen der Nutzer. Das ist datenminimal (anonyme Tile-Requests ohne App-Daten), aber nicht null.
- MapTiler-Free-Tier ist auf nicht-kommerzielle Nutzung beschränkt — passt für Hobby, muss vor Pfad-B-Wechsel neu bewertet werden (evtl. Upgrade auf Bezahl-Plan oder Self-Hosting vorziehen).
- Der Selbst-Hosting-Meilenstein ist Arbeit, die kommt, aber noch nicht erledigt ist — bewusst in den Fahrplan gestellt, damit sie nicht vergessen wird.

### Verworfene Alternativen
- **Mapbox GL JS (aktuell):** Ab v2 nicht mehr OSS, Lock-in-Risiko.
- **Leaflet:** Älter, kein WebGL-Rendering, schwächer bei Vector-Tiles und Performance auf mobilen Geräten.
- **Google Maps:** Teuer, restriktive ToS, kollidiert massiv mit Datensouveränitäts-Motiv.
- **Self-Hosting sofort:** Würde den MVP um 1–2 Wochen verschieben, ohne in Phase 1 echten Mehrwert zu liefern bei <20 Nutzern.

---

## ADR-009 — Vorgehensmodell: Vision-driven Scoping vor Code

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
HC-Map wurde in einer einzigen Konzeptions-Session vollständig durchgesprochen,
bevor irgendeine Codezeile geschrieben wurde. Vision, Scope, Threat-Model,
Datenmodell, Stack und Architektur sind in vier Dokumenten festgehalten
(`project-context.md`, `decisions.md`, `fahrplan.md`, `architecture.md`),
aus denen die Umsetzung in einer separaten Claude-Code-Session erfolgt.

Diese Dokumentation dieses Vorgehens als ADR ist bewusst — damit später
nachvollziehbar ist, *warum* das Projekt ohne klassische Sprint-Planung
oder iteratives Prototyping auskommt.

### Entscheidung
HC-Map folgt dreistufigem Vorgehen:

1. **Konzeption** in normalem Chat (200K-Kontext): Vision schärfen,
   Scope-Grenzen ziehen, ADRs treffen, Datenmodell ableiten, Fahrplan schneiden,
   Architektur spezifizieren. Ergebnis: vollständiges Dokumentations-Set.
2. **Härtung** als Entwickler-Review durch den Admin: Plausibilitätscheck der
   Dokumente, Schließen offener Punkte, Anreichern mit projektspezifischem
   Wissen.
3. **Umsetzung** in Claude Code (1M-Kontext, Max-Plan, xhigh Effort default)
   mit Repo-Zugriff inkl. Commits. Claude Code arbeitet die Meilensteine aus
   `fahrplan.md` ab, hält sich an `architecture.md` und `decisions.md`,
   eskaliert in `blockers.md` bei Hindernissen.

Der Admin hat als nicht-Entwickler die Vision und das Engineering-Verständnis,
die KI hat die Umsetzungs-Geschwindigkeit und die technische Tiefe in der Breite.

### Begründung
- **Frühe Klärung schlägt späte Korrektur:** Architektur- und Scope-Fehler sind
  in der Konzeptionsphase mit Kommentaren behebbar, später nur mit Refactor.
- **KI-Umsetzung braucht präzise Spezifikation:** Vagheit in der Vorgabe führt
  zu Halluzinationen und falschen Annahmen. Die vier Dokumente reduzieren
  diesen Spielraum drastisch.
- **Trennung Konzeption ↔ Umsetzung:** Im Konzeptions-Chat steht der gesamte
  Diskurs als Kontext bereit (200K reichen). In der Umsetzung braucht Claude
  Code nur die finalen Dokumente plus den Code (1M-Kontext).
- **Nachvollziehbarkeit:** Auch nach Monaten kann jede Entscheidung über die
  ADRs zurückverfolgt werden.

### Konsequenzen
**Positiv:**
- Architektur-Schäden durch unausgesprochene Annahmen werden früh sichtbar
  (z. B. „Community = 50–500" vs. „kleine Gruppe", erkannt in der Konzeption).
- Claude Code kann autonom arbeiten, weil die Spezifikation trägt.
- Das gleiche Vorlagen-Set ist auf Folgeprojekte übertragbar (siehe sechs
  Dokument-Vorlagen aus dem übergeordneten Workflow).

**Negativ (bewusst in Kauf genommen):**
- Hoher Initialaufwand vor erstem Code — eine ganze Konzeptions-Session,
  bevor irgendetwas „läuft". Bei kleineren Projekten wäre das overkill,
  bei HC-Map mit RLS, Rollen, Multi-Tenant-Vorbereitung und sensiblen Daten
  ist es angemessen.
- Dokumente müssen gepflegt werden — Drift zwischen Doku und Code ist eine
  reale Gefahr und wird durch klare Update-Trigger in den Datei-Headern
  gemindert.

### Verworfene Alternativen
- **Direkter Code-Start ohne Spezifikation:** Bewährt sich bei Throwaway-
  Prototypen, nicht bei einem Projekt mit Sicherheits- und Datenschutz-Fokus.
- **Klassisches Backlog mit User Stories:** Für ein Solo-Hobbyprojekt mit
  einem Admin als einzigem Stakeholder zu schwergewichtig.
- **Pure KI-Codegenerierung aus knappen Prompts:** Funktioniert bei isolierten
  Snippets, scheitert an konsistenter Architektur über mehrere Sessions.

---

## ADR-010 — User ↔ Person als Pflicht-1:1-Verknüpfung

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Die ursprüngliche Architektur (Stand `architecture.md` initial) modellierte
`user.person_id` als optionales Feld (`NULLABLE`, `UNIQUE`). Die Annahme dahinter:
„User-Account" und „handelnde Person im Event" sind konzeptuell trennbare
Dinge, manche User könnten reine Zugangs-Accounts ohne Person sein (z. B.
Admin als reiner Verwalter, nicht als Beteiligter).

In der Klärung zur Event-Erfassung wurde deutlich: **Sowohl Admin als auch
Editoren sind in den Events, die sie erfassen, in der Regel selbst Performer.**
Das System wird also nicht von externen Verwaltern bedient, sondern von den
Beteiligten selbst — als Logbuch der eigenen Praxis.

Damit jeder User sich selbst als Performer/Recipient eintragen kann, muss er
zwingend eine zugeordnete Person haben. Die optionale Verknüpfung wäre eine
Quelle für Edge-Cases ohne realen Nutzen in Pfad A.

Auch reine Viewer brauchen die Verknüpfung: Die RLS-Policy für Events filtert
nach `current_person_id` — ohne Person sieht ein Viewer nichts. Eine optionale
Verknüpfung würde also Viewer ohne Person erlauben, die per Definition nichts
sehen können. Das ist kein sinnvoller Zustand.

### Entscheidung
- `user.person_id` ist **`NOT NULL`** und **`UNIQUE`** für alle Rollen
  (Admin, Editor, Viewer). Jeder User hat genau eine Person.
- **Personen können ohne User-Account existieren** (siehe ADR-014: on-the-fly-Anlage). Die Beziehung ist asymmetrisch — der FK geht von User zu Person, nicht umgekehrt. Eine Person kann „verwaist" existieren (sie taucht in Events auf, hat aber niemanden, der sich als sie einloggen könnte).
- Beim Anlegen eines Users wird gleichzeitig eine `Person` erzeugt — **außer** der Admin verknüpft den neuen User mit einer bestehenden Person (Verknüpfungsmodus, siehe ADR-014).
- Das Bootstrap-Skript für den ersten Admin (`scripts/bootstrap_admin.py`)
  legt zuerst die Person an, dann den User mit Verknüpfung.
- Im Application-Erfassungsformular ist `performer_id` per Default mit der
  Person des eingeloggten Users vorbelegt. `recipient_id` bleibt frei wählbar.
  Beide Felder können bei Bedarf überschrieben werden — etwa wenn ein Admin
  nachträglich ein Event ohne eigene Beteiligung erfasst.

### Begründung
- **Konsistenz mit der Realität der Nutzung:** Der typische Workflow ist
  „ich logge mich ein und erfasse, was ich getan habe" — die Person, die das
  System nutzt, ist die Person, die handelt.
- **Vereinfachung der RLS:** Keine Sonderfälle für User ohne Person.
- **Vereinfachung der UX:** Sinnvolle Defaults statt leerer Felder.
- **Kein Verlust von Flexibilität:** Personen ohne User-Zugang bleiben
  weiterhin möglich (z. B. ein gelegentlich Beteiligter, der keinen Zugang
  zum System haben soll). Nur umgekehrt — User ohne Person — wird ausgeschlossen.

### Konsequenzen
**Positiv:**
- Saubereres Datenmodell ohne NULL-Falle in einer zentralen Beziehung.
- Default-belegtes Performer-Feld macht die Erfassung deutlich schneller.
- RLS-Policies bleiben einfach und vorhersehbar.

**Negativ (gering):**
- Das Bootstrap-Skript muss zwei Entitäten in der richtigen Reihenfolge
  anlegen (Person zuerst, dann User).
- User-Anlage über Admin-UI braucht entweder ein zweistufiges Formular
  (Person dann User) oder ein kombiniertes Formular, das beides in einer
  Transaktion erzeugt. Letzteres wird gewählt.

### Verworfene Alternativen
- **`person_id` weiterhin nullable:** Erzeugt Edge-Cases (User sieht via RLS
  nichts, kann sich nicht selbst als Performer wählen) ohne erkennbaren Vorteil.
- **Nur Admin/Editor verknüpft, Viewer optional:** Inkonsistent — Viewer
  brauchen die Verknüpfung für RLS sowieso.
- **Person-Erzeugung als separater Schritt nach User-Anlage:** Erzeugt
  Inkonsistenz-Fenster, in dem ein User existiert, der nichts sehen oder
  tun kann. Wird durch atomare Anlage vermieden.

---

## ADR-011 — Live-Modus als primäres Erfassungsparadigma

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Die ursprüngliche Architektur ging implizit davon aus, dass Events nachträglich
am Schreibtisch (oder am Handy in Ruhe) erfasst werden — als Datenbankeingabe
mit Datum, Ortsangabe und Liste von Applications. Dem entsprach das Datenmodell
(`Event.occurred_at` als einzelner Zeitstempel, `Application.applied_at` optional,
`duration_min` als manuelle Eingabe).

In der Klärung zur Erfassungs-Praxis wurde deutlich: Die Hauptnutzung ist nicht
nachträglich, sondern **in der Situation**. Der Performer hat das Handy in der
Hand, startet ein Event live, dokumentiert Applications während sie geschehen,
beendet das Event am Ende. GPS, Timer, Schnellaktionen sind die zentralen
Bedienelemente. Nachträgliche Erfassung wird zum sekundären Modus.

### Entscheidung

1. **Datenmodell anpassen:**
   - `Event.occurred_at` ersetzt durch `Event.started_at` (NOT NULL) und `Event.ended_at` (NULL bis Event abgeschlossen).
   - `Application.applied_at` und `Application.duration_min` ersetzt durch `Application.started_at` und `Application.ended_at` (beide NULL erlaubt — eine Application gilt als „in progress", solange `ended_at` NULL ist).
   - Dauer wird als `ended_at - started_at` berechnet, nicht gespeichert.
   - Lücken zwischen Applications (Materialwechsel, Pausen) werden aus den Zeitstempeln berechnet, nicht als eigene Entität gespeichert. Eine optionale Notiz an der vorherigen Application kann die Lücke beschreiben.

2. **UI-Hierarchie umstellen:**
   - Startseite ist nicht mehr ein „Dashboard mit Zahlen", sondern ein zentraler „Neues Event starten"-Knopf.
   - Live-Ansicht eines laufenden Events ist die häufigste Bildschirmsituation.
   - Nachträgliche Erfassung ist ein expliziter Zweitweg, kein Default.

3. **Browser-APIs einbinden:**
   - Geolocation für GPS-Vorbelegung (HTTPS-Pflicht — durch Caddy gegeben).
   - Wakelock zur Verhinderung von Bildschirmsperre während laufender Events.
   - IndexedDB für Offline-Resilienz.

4. **Fahrplan umstellen:**
   - M5 wird in M5a (Live-Modus), M5b (Offline-Resilienz), M5c (nachträgliche Erfassung) aufgeteilt.
   - M5a kommt vor M5c — der Hauptmodus zuerst.
   - M5b folgt direkt nach M5a, bevor andere Features draufgesetzt werden, weil ein Live-Modus ohne Offline-Resilienz fragiler ist als nützlich.

5. **Mobile-First wird verbindlich:**
   - „Mobile und Desktop gleichwertig" aus `project-context.md` bleibt gültig, aber **mobil ist nicht-verhandelbar**: Touch-Targets ≥ 44px, große Buttons, lesbare Timer, schneller Bedienfluss.

### Begründung
- **Echte Nutzung schlägt vermutete Nutzung.** Die ursprüngliche Annahme „nachträgliche Erfassung" war nie explizit getroffen, sondern implizit aus üblichen Daten-Apps übernommen. Die echte Praxis sieht anders aus.
- **Datenqualität steigt.** Live-erfasste Zeitstempel sind exakter als nachträglich rekonstruierte. Dauerangaben („so 10 Minuten?") werden durch echte Messung ersetzt.
- **Bedienzeit sinkt.** Wenn die App während der Situation funktionieren muss, müssen Defaults sitzen, Klicks minimal sein, Timer automatisch laufen — das macht die App auch für nachträgliche Erfassung besser.
- **Architektur bleibt schlank.** Beide Modi nutzen denselben Datenpfad, nur die Quelle der Zeitstempel unterscheidet sich (Live: `now()`; Nachträglich: User-Eingabe).

### Konsequenzen
**Positiv:**
- App fühlt sich wie ein Werkzeug an, nicht wie eine Datenbank.
- Datenqualität bei Zeit, Reihenfolge und Ort steigt.
- Spätere Statistiken (z. B. „durchschnittliche Application-Dauer pro Restraint-Typ") werden belastbar.

**Negativ (bewusst in Kauf genommen):**
- **Offline-Resilienz wird Pflicht.** Live-Modus ohne IndexedDB-Sync ist im Funkloch fragil. Das ist ein eigener Meilenstein (M5b) und nicht trivial.
- **Browser-API-Abhängigkeiten:** Geolocation, Wakelock, IndexedDB — alle gut unterstützt, aber nicht universell. Fallbacks und Hinweise nötig.
- **Akku-Verbrauch:** Wakelock + GPS während eines langen Events kosten Akku. Performer muss das wissen oder Power Bank dabei haben.
- **Schema-Migration:** Da M0-M4 noch nicht implementiert sind, ist die Schema-Anpassung ohne Daten-Migration möglich. Hätten wir später umgestellt, wäre es teurer gewesen.

### Verworfene Alternativen
- **Beim ursprünglichen Modell bleiben (nachträgliche Erfassung als Hauptmodus):** Hätte zur tatsächlichen Nutzung nicht gepasst.
- **Lücken als eigene Entität (`Gap` oder `Interlude`):** Wäre saubereres explizites Modell, aber unnötig — die Information steckt bereits in den Zeitstempeln. KISS-Prinzip.
- **Material-/Positionswechsel als eigene Application mit Typ „Wechsel":** Verwischt die Semantik von Application (eine konkrete Fesselungsaktion) und bläht das Datenmodell auf. Eine Notiz an der vorherigen Application reicht.
- **Live-Modus erst in Phase 2:** Hätte den MVP-Wert massiv reduziert. Die Mitglieder würden die App so nicht gerne nutzen wollen.

---

## ADR-012 — Auto-Participant: Performer/Recipient → EventParticipant

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Das Datenmodell unterscheidet drei Rollen einer Person an einem Event:

- `EventParticipant` — Person ist Beteiligte des Events (Sichtbarkeit via RLS).
- `Application.performer_id` — Person hat eine konkrete Application ausgeführt.
- `Application.recipient_id` — Person war Empfängerin einer konkreten Application.

In der ursprünglichen Spezifikation waren diese drei Sätze unabhängig — Performer in einer Application sein bedeutete nicht zwangsläufig Participant am Event sein. Theoretisch konnte jemand also Performer einer Application sein, das Event aber via RLS nicht sehen, weil er nicht als Participant eingetragen war.

Das ist ein Modellfehler: Wer in einer Application steht, ist faktisch beteiligt — punkt.

### Entscheidung
Sobald in einer Application `performer_id` oder `recipient_id` gesetzt wird, wird die jeweilige Person **automatisch** als `EventParticipant` zum übergeordneten Event hinzugefügt — sofern sie dort noch nicht eingetragen ist.

- Implementierung: serverseitig im Application-Service oder als DB-Trigger — Client kann diese Regel nicht umgehen.
- UI-Hinweis: beim Anlegen einer Application erscheint der Hinweis „Daniela wird als Participant des Events erfasst und kann es später einsehen."
- Manuelles Entfernen aus `EventParticipant` ist nur möglich, wenn die Person in **keiner** Application des Events mehr als Performer oder Recipient auftaucht. Sonst Constraint-Violation, klar kommunizierte Fehlermeldung im UI.

### Begründung
- **Konsistenz mit der Realität:** Wer beteiligt war, war beteiligt. Punktum.
- **Verhindert Inkonsistenz-Bug:** „Application existiert, Recipient existiert, Recipient sieht das Event nicht" wäre für Nutzer unverständlich und hätte echten Datenleck-Charakter (die Daten sind da, aber der Betroffene kann sie nicht einsehen).
- **Vereinfacht UX:** Performer muss nicht in zwei Schritten denken („erst Participant hinzufügen, dann Application anlegen") — das passiert automatisch.

### Konsequenzen
**Positiv:**
- Lückenloser Zusammenhang zwischen „in Application erwähnt" und „sieht das Event".
- Auch der Auto-Verknüpfungs-Effekt aus ADR-014 funktioniert sauber: Wird eine Person später mit einem User verknüpft, sieht sie alle Events, in denen sie als Recipient/Performer auftauchte.

**Negativ:**
- UI muss den Auto-Hinweis sauber kommunizieren, sonst überrascht es Nutzer.
- Trigger-/Service-Logik braucht Tests, die alle Edge-Cases abdecken (Performer hinzufügen, ändern, entfernen, Application löschen — Participant darf nicht versehentlich verschwinden, wenn andere Applications die Person noch referenzieren).

### Verworfene Alternativen
- **Manuelle Pflege durch Performer:** Performer vergisst es, Recipient sieht das Event nicht — schlechtes UX und Datenleck-artiger Bug.
- **Auto-Add nur für Recipient, nicht für Performer:** Inkonsistent. Wenn Performer sich selbst als Person eingetragen hat (Standardfall), ist sie sowieso schon Participant. Aber bei Edge-Cases (Admin trägt für andere ein) müsste die Logik dann doch greifen.

---

## ADR-013 — Vorlagen/Favoriten bewusst aufgeschoben

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Im Live-Modus muss die Erfassung schnell gehen. Eine Idee zur Beschleunigung sind Vorlagen („Favoriten"): Performer pflegt für sich Sets aus Restraints, Positionen, Orientierung und ggf. Stamm-Recipient, die er beim Application-Anlegen mit einem Tap einsetzen kann.

Konzeptionell sinnvoll und potenziell sehr nützlich. Im MVP aber bewusst aufgeschoben.

### Entscheidung
Vorlagen/Favoriten werden im MVP **nicht** implementiert. Stattdessen:

- Schema dafür wird nicht angelegt.
- API-Endpoints werden nicht spezifiziert.
- Kein Meilenstein im aktuellen Fahrplan.
- Ein Platzhalter-Hinweis bleibt im `fahrplan.md` (Phase 3 oder eigene Konsolidierungsphase) als „bekannte Folge-Idee".

Sobald das System in Nutzung ist und die Gruppe konkretes Feedback liefert (welche Kombinationen tatsächlich häufig sind, ob ein Stamm-Setup pro User reicht oder mehrere benannte Vorlagen nötig sind), wird das Konzept neu evaluiert und ggf. als ADR-XXX und neuer Meilenstein nachgezogen.

### Begründung
- **Nutzerfeedback schlägt Spekulation:** Welche Vorlagen sich wirklich lohnen, weiß keiner vor dem ersten echten Live-Test. Vorzeitige Implementierung produziert Features, die niemand benutzt.
- **MVP soll laufen, nicht perfekt sein:** Live-Modus ohne Vorlagen ist langsamer, aber funktioniert. Mit Vorlagen wäre es schneller, aber das ist Optimierung, nicht Grundbaustein.
- **Komplexität wächst nicht-linear:** Vorlagen-Modell, UI für Anlage/Pflege/Auswahl, Sync-Verhalten im Offline-Modus — das alles ist nicht trivial. Der Aufwand passt besser in eine spätere Iteration.

### Konsequenzen
**Positiv:**
- MVP-Scope bleibt überschaubar.
- Echte Nutzungs-Daten leiten die spätere Implementierung.

**Negativ:**
- Live-Erfassung ist im MVP langsamer, als sie sein könnte. Performer muss bei jeder Application Restraints und Positionen neu wählen (mit Defaults „letzter Wert", die sich aus der vorigen Application ergeben können — das ist ein kleiner UX-Trick, der ohne Vorlagen-Schema funktioniert).

### Verworfene Alternativen
- **Vorlagen sofort implementieren:** Erhöht MVP-Aufwand spürbar, ohne dass die Feature-Form belastbar ist.
- **Stamm-Recipient als Mini-Vorlage in den User-Stammdaten:** Würde 80 % des Wertes mit 20 % des Aufwands liefern — wird in der späteren Evaluation geprüft, aber erst nach erstem realen Einsatz.

---

## ADR-014 — On-the-fly-Personenanlage und nachträgliche User-Verknüpfung

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Im Live-Modus kommt es vor, dass der Performer als Recipient (oder als weiteren Beteiligten) eine Person einsetzen will, die noch nicht im System ist. Möglichkeiten:

- Den Live-Modus verlassen, in den Admin-Bereich gehen, Person anlegen, zurück zum Live-Modus — unrealistisch in der Situation.
- Person nicht erfassen, später nachtragen — verliert die Live-Daten oder den Bezug.
- Person on-the-fly anlegen — pragmatisch, schnell, behält den Bezug.

Außerdem: Wenn diese Person später dann doch einen User-Account bekommt (z. B. tritt der Gruppe bei oder wird vom Admin eingeladen), sollte sie ihre bisherigen Events rückwirkend einsehen können — ohne Daten-Migration, einfach durch Verknüpfung.

### Entscheidung

1. **Im Live-Modus** (sowohl Admin als auch Editor) gibt es im Recipient- und Performer-Dropdown eine Option „+ Neue Person hinzufügen". Modal mit einem Pflichtfeld `name`, optional `alias`. Beim Speichern: `Person` mit `origin = 'on_the_fly'`, `linkable = false`, `created_by = current_user_id`.

2. **Diese Person hat keinen User-Account** und kann sich nicht einloggen. Sie taucht in Events auf, sieht aber selbst nichts.

3. **Im Admin-Bereich** sieht der Admin alle on-the-fly angelegten Personen in einer eigenen Übersicht („Neue Personen aus Live-Erfassung"). Dort kann er pro Person:
   - Daten ergänzen (Alias, Notizen).
   - `linkable = true` setzen, um die Person für eine spätere User-Verknüpfung freizugeben.
   - Person mit einer anderen verschmelzen (falls Duplikat — siehe „Offene Punkte").
   - Person als „bleibt anonym" markieren (kein Flag-Wechsel, einfach lassen).

4. **Beim User-Anlegen** (Admin-UI) gibt es zwei Modi:
   - Standard: neuer User mit neuer Person.
   - Verknüpfungsmodus: neuer User wird mit einer bestehenden Person verknüpft. Im Dropdown erscheinen nur Personen mit `linkable = true`.

5. **Sobald die Verknüpfung hergestellt ist**, sieht der neue User via RLS automatisch alle Events, in denen die Person bereits Participant war — auch rückwirkend, ohne Datenänderung.

### Begründung
- **Live-Modus bleibt im Live-Modus:** Performer muss nicht aus dem Erfassungsfluss raus.
- **Saubere Trennung Person ↔ User:** Wir nutzen die ohnehin asymmetrische Beziehung aus ADR-010 konsequent — Person kann ohne User existieren.
- **Rückwirkende Verknüpfung kostet nichts:** Weil RLS auf `current_person_id` prüft und nicht auf einen Snapshot-Status, funktioniert die nachträgliche Verknüpfung automatisch.
- **`linkable`-Flag schützt vor Versehen:** Im Admin-User-Dropdown erscheinen nicht alle 50+ Personen, sondern nur die paar, bei denen der Admin bewusst gesagt hat „diese ist verknüpfungsbereit".

### Konsequenzen
**Positiv:**
- Live-Modus bleibt schnell und unterbrechungsfrei.
- Spätere Einladung neuer Mitglieder erfolgt sauber, mit voller Historie.
- Personen, die nie einen User-Account brauchen, können dauerhaft ohne existieren — kein Zwang.

**Negativ:**
- **Datenschutz-Implikation:** Personen werden im System erfasst, ohne dass sie selbst eingewilligt haben. In Pfad A ist das durch die Gruppen-Einwilligung gedeckt (alle Mitglieder wissen, dass auch externe Personen on-the-fly erfasst werden können). Der Einwilligungstext muss diesen Fall explizit benennen.
- **Duplikat-Risiko:** Ohne Pflege werden „Daniela", „daniela" und „Dani" als drei verschiedene Personen angelegt. Admin braucht eine Merge-Funktion (siehe „Offene Punkte" in `architecture.md`).
- **Editor kann unbegrenzt Personen anlegen:** Theoretisch könnte ein Editor das System mit Phantom-Personen fluten. In Pfad A unkritisch (eingeschworene Gruppe), in Pfad B müsste das beschränkt werden (z. B. Rate-Limit oder Admin-Freigabe analog zu Katalog-Vorschlägen).

### Harte Auflagen
- **Einwilligungstext für Pfad A muss explizit erwähnen**, dass auch externe Personen on-the-fly im System erfasst werden können, mit Name und Beteiligung an Events.
- **Vor Pfad-B-Wechsel** muss diese Praxis grundsätzlich neu bewertet werden — vermutlich braucht es dort entweder ein Vorschlags-/Freigabe-Modell oder eine deutlich strengere Person-Anlage-Policy.

### Verworfene Alternativen
- **Personen-Anlage nur durch Admin:** Bricht den Live-Modus auf, der explizit auch von Editoren genutzt werden soll.
- **Sofort verknüpfungsbereit (`linkable = true` als Default):** Verschmutzt das User-Anlage-Dropdown im Admin-UI mit allen Personen, die je angelegt wurden.
- **Person an User koppeln (umgekehrte FK-Richtung):** Würde das Modell komplett umdrehen und ADR-010 brechen. Asymmetrie ist hier ein Feature, kein Bug.

---

## ADR-015 — Feature-Set basierend auf Wettbewerbs- und Tagebuch-App-Analyse

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
Eine gezielte Recherche zu vergleichbaren Apps (BDSM-Tracker wie Bond, Obedience, mysub, xTracker; Tagebuch-Apps wie Day One, Diarium, Momento, StoryPad) zeigte:

- **Direkte Wettbewerber existieren nicht.** Die BDSM-Tracker sind D/s-Habit-Tracker (Regeln, Tasks, Punkte, Belohnungen), nicht Logbücher konkreter Vorgänge.
- **HC-Map ist konzeptionell näher an Tagebuch-Apps**, hat aber eine spezialisierte strukturierte Datendomäne.
- Mehrere Standard-Features moderner Tagebuch-Apps fehlen im bisherigen MVP-Plan.

### Entscheidung

**MVP zusätzlich aufgenommen:**

1. **Volltextsuche** über Notizen aller Events und Applications, unter Beachtung von RLS (User sucht nur in dem, was er sehen darf).
2. **App-PIN-Sperre** (clientseitig, IndexedDB-persistiert) — schnelle Sperre der UI nach Zeitraum-Inaktivität oder explizit per Knopf, unabhängig vom Auth-System. Verhindert Schulterblick-Einsicht ohne komplettes Re-Login.
3. **„On this day"-Anzeige** auf der Startseite — zeigt Events vom gleichen Tag in vergangenen Jahren.
4. **Daten-Export** für jeden User (eigene Events als JSON und CSV, Admin: alle Events).

**Phase 2 fest eingeplant:**

5. **Foto-/Medien-Anhänge** an Events und Applications. Speicherung auf VPS, RLS-äquivalente Zugriffskontrolle, Einwilligungstext muss erweitert werden (sehr sensibles Material in Pfad A grundsätzlich vertretbar, in Pfad B nur unter strengen Auflagen).
6. **Freie Tags** zusätzlich zu strukturierten Katalogen — User können Events mit beliebigen Schlagworten versehen („Geburtstag", „erstes Mal", „besonders gelungen"), Tag-basierte Filter und Suche.
7. **Bewertung/Stimmung** pro Event als optionales Feld — vermutlich Skala (z. B. 1–5 Sterne) oder Smiley-Set. Konkrete Form in Phase-2-Spezifikation.
8. **Persönliches Statistik-Dashboard** mit zwei Ebenen:
   - Eigene Statistik: wie oft als Performer, wie oft als Recipient, häufigste Materialien, durchschnittliche Application-Dauer, Aktivitäts-Trend.
   - **Kollektive Aggregat-Statistik mit persönlicher Gewichtung** — z. B. „TCH 840: 50 Anwendungen gesamt, davon 12 wo du beteiligt warst". Information „38 weitere Anwendungen ohne dich" ist anonym im Sinne, dass sie keine Person nennt.

### Begründung
- **Volltextsuche, App-PIN, „On this day", Export** sind in Tagebuch-Apps so etablierter Standard, dass User sie als selbstverständlich erwarten. Aufwand jeweils gering, Wert hoch.
- **Datensouveränität durch Export ist Pflicht**, nicht Kür — wer ein Logbuch führt, muss es auch wieder mitnehmen können.
- **Foto-Anhänge sind häufig gewünscht** (mysub-Reviewer, allgemeine Tagebuch-Praxis), aber datenschutz-sensibel — gehören in Phase 2 nach erstem Live-Erfahrungssammeln.
- **Tags und Bewertungen** sind klassische Tagebuch-Standards, ergänzen die strukturierten Felder ohne sie zu ersetzen.
- **Aggregat-Statistik** wurde explizit gewünscht und liefert echten Mehrwert für die Gruppe — gemeinsame Erfahrung mit bestimmten Materialien wird sichtbar, ohne Personen offenzulegen.

### Konsequenzen
**Positiv:**
- HC-Map fühlt sich nicht mehr wie eine Datenbankoberfläche an, sondern wie ein vollwertiges Logbuch.
- Standard-Erwartungen erfahrener App-Nutzer werden erfüllt.
- Datensouveränität wird konsequent durchgezogen (Daten rein UND raus).

**Negativ (bewusst in Kauf genommen):**
- **Aggregat-Statistik ist nur scheinbar anonym.** In einer Gruppe von <20 Personen ist Re-Identifikation über Aggregate praktisch möglich (wenn man die Vorlieben einzelner Mitglieder kennt). Der Einwilligungstext muss diesen Punkt explizit benennen, und die genaue Granularität der Statistik (volle Aggregate vs. Mindestschwellen vs. nur eigene Daten) wird in Phase-2-Spezifikation entschieden.
- **App-PIN ist clientseitig** — schützt vor Schulterblick, aber nicht vor jemandem, der das gesamte Gerät übernimmt. Das ist ausreichend für den Einsatzzweck, sollte aber nicht als „Sicherheits-Feature" missverstanden werden.
- **Foto-Anhänge bringen erhebliche neue Komplexität** (Storage, Größenbeschränkung, Formate, Thumbnail-Generierung, Zugriffskontrolle, Backup-Größe). Bewusst auf Phase 2 verschoben.
- **Tags vs. Kataloge:** Es entsteht eine geringe Redundanzgefahr — wenn jemand „Clejuso 13" als Tag tippt statt aus dem Restraint-Katalog zu wählen, geht strukturierte Information verloren. UI muss klar zwischen den beiden Konzepten unterscheiden.

### Bewusst nicht aufgenommen
Aus der Recherche, aber nicht passend für HC-Map:

- Punkte- und Belohnungssysteme (D/s-spezifisch).
- Echtzeit-Chat zwischen Partnern (Recipient nutzt die App während der Sitzung explizit nicht).
- Habit-Tracking, wiederkehrende Tasks (andere App-Klasse).
- Community-Forum / Group-Discussions (sprengt Pfad A).

### Verworfene Alternativen
- **App-PIN serverseitig:** Würde zusätzliche Auth-Schicht bedeuten, ohne klaren Sicherheitsgewinn. Clientseitig reicht für den Schulterblick-Use-Case.
- **Foto-Anhänge im MVP:** Hätte den MVP um Wochen verlängert (Storage-Setup, Backup-Größe, Datenschutz-Re-Evaluation) ohne Kern-Funktion zu ergänzen.
- **Statistik-Dashboard nur für Admin:** Hätte den emotionalen Wert für die Gruppe verfehlt — die Statistik ist gerade für die Beteiligten interessant, nicht für die Verwaltung.
- **Aggregate erst ab Mindestschwelle:** Wäre datenschutz-konservativer, aber bei seltenen Materialien sähe man gar nichts. In Pfad A (eingeschworene Gruppe mit Einwilligung) als bewusste Entscheidung für Vollaggregate.

---

## ADR-016 — SQLAdmin als parallele Admin-Schicht

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
ADR-005 hat FastAPI gewählt und dabei bewusst in Kauf genommen, dass kein Admin-Interface out-of-the-box verfügbar ist. Die Konsequenz war, dass alle Admin-Funktionen (User-Verwaltung, Personen-Verwaltung, Katalog-Pflege, Datenbank-Inspektion) im Next.js-Frontend selbst gebaut werden müssen.

Die Framework-Analyse (siehe `docs/framework-analyse.md`) hat gezeigt: Es gibt mit **SQLAdmin** ein ausgereiftes, BSD-3-lizenziertes Admin-Panel für FastAPI + SQLAlchemy, das CRUD-Oberflächen für alle Tabellen automatisch generiert — sortier- und durchsuchbar, mit Tabler-UI und WTForms-basierter Formular-Erzeugung.

### Entscheidung
SQLAdmin wird als **parallele Admin-Schicht** unter `/admin` in das Backend integriert, zusätzlich zum Next.js-Frontend.

**Aufgabenverteilung:**

- **SQLAdmin übernimmt** (Backend-Routen unter `/admin`):
  - CRUD für User (inkl. Rolle setzen, deaktivieren, Person verknüpfen)
  - CRUD für Person (inkl. `linkable`-Toggle, Anonymisierung)
  - CRUD für Kataloge (RestraintType, ArmPosition, HandPosition, HandOrientation) — inkl. Freigabe von pending-Einträgen
  - Daten-Inspektion: alle Events und Applications admin-weit lesbar
  - Bulk-Aktionen (mehrere Einträge gleichzeitig bearbeiten)

- **Next.js übernimmt weiterhin** (unter `/`):
  - Kompletter User-Workflow (Live-Modus, Erfassung, Karte, Suche, Export)
  - Eigene UI-Designs, die SQLAdmin nicht leisten kann
  - Spezifische Admin-UIs, die über reine CRUD hinausgehen (Statistik-Dashboards, Freigabe-Queues mit Workflow-Charakter)

**Zugangskontrolle:**
- Der `/admin`-Bereich ist nur für User mit `role = 'admin'` erreichbar.
- SQLAdmin-Auth wird mit der bestehenden fastapi-users-Session verknüpft (SQLAdmin unterstützt Custom-Auth-Backends).
- Kein separater Admin-Login.

### Begründung
- **Massive Aufwandsersparnis** in M8 (Admin-Bereich): geschätzt 60–70 % der reinen CRUD-Arbeit entfällt.
- **Robustheit durch bewährte Bibliothek**: SQLAdmin hat ~2.200 GitHub-Stars, wird aktiv gepflegt, ist BSD-3 (keine AGPL-Falle).
- **Keine Kompromisse bei User-Experience**: Die User-orientierten Workflows bleiben in Next.js und können frei gestaltet werden; SQLAdmin ist nur für den Admin, der ohnehin technisch affin genug ist, um mit einer funktionalen Standard-Oberfläche gut arbeiten zu können.
- **Notfall-Tool**: SQLAdmin dient auch als „Notausstieg" zur Daten-Inspektion, falls das Next.js-Frontend Probleme hat — wertvoll für Debugging und Betrieb.

### Konsequenzen
**Positiv:**
- M8 wird deutlich kleiner und damit schneller und weniger fehleranfällig.
- Admin hat sofort funktionierende Stammdaten-Pflege, auch wenn das Next.js-UI noch lückenhaft ist.
- Zwei-Schichten-Architektur (schnelle Stammdaten-Pflege + sorgfältige User-UX) ist ein etabliertes Muster.

**Negativ (bewusst in Kauf genommen):**
- **Zwei visuelle Stile**: SQLAdmin hat Tabler-UI-Look, Next.js hat shadcn/ui-Look. Für den Admin akzeptabel, da er weiß, zwischen welchen Werkzeugen er wechselt.
- **Zwei Auth-Integrationen**: Cookie-Session muss in SQLAdmin-Auth-Backend eingebunden werden. Geringer einmaliger Aufwand.
- **RLS-Verhalten in SQLAdmin**: Admin hat per RLS ohnehin Vollzugriff, daher kein Konflikt. Wichtig ist nur, dass SQLAdmin die GUC-Variablen (`app.current_role = 'admin'`) setzt, bevor DB-Zugriffe erfolgen.

### Verworfene Alternativen
- **Komplettes Admin-UI in Next.js selbst bauen:** Viel mehr Aufwand, ohne UX-Vorteil für Admin-Routineaufgaben.
- **Django statt FastAPI (hätte Django Admin „geschenkt"):** Hätte ADR-005 umgekehrt. SQLAdmin bietet vergleichbare Funktionalität für FastAPI.
- **Externes CMS wie Directus oder NocoDB:** Überdimensioniert, zusätzlicher Service, neue Auth-Domäne.

---

## ADR-017 — RxDB für Offline-Sync in Live-Modus

**Status:** Accepted
**Datum:** 2026-04-22

### Kontext
ADR-011 hat den Live-Modus als primäres Erfassungsparadigma festgelegt. Damit ergibt sich die Anforderung aus M5b: Events und Applications müssen auch bei Netzausfall erfassbar bleiben und nach Wiederverbindung sauber synchronisiert werden.

Die ursprüngliche Skizze sah „IndexedDB-Zwischenspeicherung und Sync-Worker" als Eigenentwicklung vor. Die Framework-Analyse (siehe `docs/framework-analyse.md`) hat die Optionen strukturiert:

- **RxDB** — reaktive Offline-first-Datenbank mit IndexedDB-Storage-Adapter (Dexie), eingebautes Replication-Protokoll, Conflict-Resolution-Strategien.
- **Dexie.js pur** — schlanker IndexedDB-Wrapper, Sync-Logik selbst schreiben.
- **PouchDB** — CouchDB-Replication, würde CouchDB als Backend verlangen (nicht zu Postgres-Stack passend).
- **Eigenbau auf nativem IndexedDB** — sehr hoher Aufwand.

### Entscheidung
**RxDB** mit **Dexie-Storage-Adapter** wird als Offline-Sync-Schicht eingesetzt.

**Architektur:**

- **Clientseitig:** RxDB verwaltet eine lokale Kopie der für den User sichtbaren Events und Applications. Alle Live-Modus-Aktionen schreiben zuerst in RxDB, der Sync-Worker repliziert mit dem FastAPI-Backend.
- **Backend:** FastAPI-Endpoints folgen dem RxDB-Replication-Protokoll:
  - `GET /api/sync/pull?updatedAt={cursor}&limit=100` — liefert geänderte Dokumente seit Cursor.
  - `POST /api/sync/push` — nimmt clientseitige Änderungen entgegen, gibt Konflikte zurück.
- **Conflict-Resolution:** Server-Zeit ist Wahrheit für Zeitstempel; Last-Write-Wins für Notiz-Felder; spezifische Strategien werden in M5b definiert.
- **Scope:** Nur Events und Applications sind offline-fähig. Kataloge, Personen-Auswahl, User-Verwaltung laufen weiter online-only (werden ohnehin selten geändert).
- **RLS-Durchreichung:** Die Sync-Endpoints respektieren RLS — jeder Client bekommt nur seine sichtbaren Events repliziert.

### Begründung
- **Starke Aufwandsersparnis in M5b** (geschätzt 50–60 %): Replication-Protokoll, Conflict-Resolution, Offline-Queue, Resync-Logik sind in RxDB ausgereift vorhanden.
- **Vermeidet die klassischen Offline-First-Bugs**: Duplikate bei Retry, verlorene Offline-Änderungen, Zeitstempel-Drift — das alles ist in RxDB bereits durchdacht.
- **Aktive, gut dokumentierte Library**: Viele produktive Nutzer, breite Storage-Adapter-Palette, saubere TypeScript-Typen.
- **Zukunftsoffen**: Bei Pfad-B-Wechsel könnte Multi-Device-Sync eines Users (gleiche Daten auf Handy + Desktop synchron) fast geschenkt dazukommen.

### Konsequenzen
**Positiv:**
- M5b bleibt umsetzbar und nicht-trivial, aber deutlich robuster als Eigenbau.
- Reaktive Datenströme vereinfachen auch die UI-Logik: UI reagiert automatisch auf Änderungen, egal ob lokal, von Sync oder von Timer.
- Entwicklungsgeschwindigkeit steigt, weil Edge-Cases (parallel getätigte Änderungen, Retry-Logik) nicht neu gelöst werden müssen.

**Negativ (bewusst in Kauf genommen):**
- **Lernkurve**: RxDB ist ein eigenes Framework mit reaktiven Paradigmen (RxJS-Unterbau). Claude Code muss die Konzepte sauber aufnehmen.
- **Bundle-Größe**: RxDB + Dexie + RxJS kosten ca. 150–200 KB gzipped im Frontend-Bundle. Für Mobile-First grenzwertig, aber akzeptabel.
- **Backend-Endpoints müssen zum Replication-Protokoll passen**: Leichte Anpassung der API-Route-Struktur (separates `/api/sync/`-Präfix statt CRUD-Endpoints für die replizierten Tabellen). Kein großer Aufwand, aber muss in der Architektur entsprechend gepflegt werden.
- **Storage-Limits der Browser**: Safari löscht IndexedDB nach 7 Tagen Inaktivität. Bei seltenen Nutzern relevant — Lösung: bei Reconnect prüfen, ob lokale DB noch mit Server-Stand übereinstimmt, sonst Re-Sync.

### Verworfene Alternativen
- **Dexie.js pur**: Weniger Komplexität im Client, aber Sync-Logik wäre Eigenbau mit allen Edge-Cases. Netto schlechterer Deal.
- **PouchDB + CouchDB**: Würde den DB-Stack komplett umbauen. Bricht ADR-005.
- **Eigenbau auf nativem IndexedDB**: Würde M5b zu einem mehrwöchigen Projekt machen. Nicht vertretbar für Hobby-Scope.
- **Nur Online-Modus mit Aufgabe der Offline-Anforderung**: Hätte den Live-Modus im Funkloch praktisch unbrauchbar gemacht. Bricht ADR-011.

---

## Noch zu entscheiden (Platzhalter)

Folgende Punkte werden als ADRs dokumentiert, sobald sie in der Architekturphase oder bei Start der Umsetzung anstehen:

- Deployment-/Hosting-Setup auf dem VPS (Reverse Proxy, Container-Strategie, Prozessmanagement, TLS-Zertifikate, CI/CD).
- Backup- und Restore-Konzept (Frequenz, Off-Site-Speicherort, Restore-Test-Rhythmus).
- Logging, Monitoring und Alerting.
- Test-Strategie (Unit, Integration, E2E, RLS-Tests).
- Session-/Token-Strategie (JWT vs. Cookie-Session) innerhalb ADR-006.
- Package-Manager und Python-Version innerhalb ADR-005.
- Projektlizenz (vor M11).
- Off-Site-Backup-Anbieter (M13).
- E-Mail-Versanddienst (vor M11).
- Statistik-Granularität in M17 (volle Aggregate vs. Mindestschwelle vs. nur eigene Daten).

---

## ADR-018 — Implementierungsstrategie M1 (Datenmodell, Migrations, Seeds, RLS-Default)

**Status:** Akzeptiert (2026-04-25)

**Kontext:** M1 setzt das in `architecture.md` §Datenmodell spezifizierte Schema
um. Architecture-Doku lässt mehrere Implementierungsdetails offen, die für
einen lauffähigen ersten Migrationsstand entschieden sein müssen.

**Entscheidungen:**

1. **Neue Backend-Dependencies** (alle MIT/BSD/Apache, lizenzkonform §6):
   - `sqlalchemy[asyncio]>=2.0` (ADR-005 explizit)
   - `alembic>=1.14` (ADR-005 explizit)
   - `asyncpg>=0.30` — Standard-Async-Treiber für Postgres
   - `geoalchemy2>=0.15` — PostGIS-Spalten in SQLAlchemy
   - `uuid-utils>=0.10` — UUIDv7-Generation client-seitig
   - `testcontainers[postgresql]>=4` — echtes Postgres+PostGIS in Tests
   - `psycopg[binary]>=3.2` — Sync-Treiber für Alembic-Offline-Operationen

2. **UUIDv7-Strategie:** Client-seitig via `uuid_utils.uuid7()` als
   SQLAlchemy-`default`. Postgres 16 hat keine native v7-Funktion; eine
   PL/pgSQL-Implementierung würde Schema-Komplexität ohne Nutzen einführen.

3. **`updated_at`-Mechanik:** Postgres-Trigger `BEFORE UPDATE` pro Tabelle
   (in der Migration). Greift auch bei direkten SQL-Schreibern (Admin,
   data migrations) und bleibt unabhängig vom ORM.

4. **RLS-Default in M1:** RLS auf allen daten-führenden Tabellen aktivieren
   (`ENABLE` + `FORCE ROW LEVEL SECURITY`) und eine permissive Default-
   Policy für die Anwendungs-Rolle anlegen (USING + WITH CHECK = `true`).
   Dadurch sind RLS-Mechanik, Rolle und Connection-Setup ab M1 produktiv,
   während die scharfen Rollen-Policies aus `architecture.md` §RLS
   gemeinsam mit fastapi-users in M2 nachgezogen werden.

5. **Anwendungs-Rolle:** Neue Postgres-Rolle `app_user` (NOLOGIN, NOSUPERUSER),
   Eigentümer aller Anwendungs-Tabellen bleibt der Migrations-User.
   Backend-Connections setzen `SET ROLE app_user` pro Session (genaue
   Verdrahtung in M2 mit fastapi-users). RLS-Policies adressieren `app_user`.

6. **Seed-Strategie:** Separate Skripte unter `backend/seeds/`, idempotent via
   `INSERT ... ON CONFLICT DO NOTHING` auf den jeweiligen UNIQUE-Constraints.
   CLI-Einstieg `uv run python -m app.seeds.run`. Architecture §Migrations
   verbietet Seeds in Alembic explizit.

7. **RestraintType-Seed-Inhalt:** In M1 nur die in `fahrplan.md` Z. 105
   namentlich genannten Anker-Modelle (siehe `architecture.md` §Katalog-Seed),
   plus die Material-Einträge. Die ausführliche
   `restraint-types-seed-review.md` ist explizit als Vor-Sichtungsliste
   markiert; ihre Übernahme passiert nach inhaltlicher Abnahme durch den
   Admin in einem separaten Schritt.

8. **Test-Infrastruktur:** Tests beziehen ihren Postgres-DSN bevorzugt aus
   `HCMAP_TEST_DATABASE_URL`. Wenn nicht gesetzt, fällt eine Pytest-Fixture
   auf `testcontainers` zurück (benötigt Docker). Dadurch lokale Entwicklung
   und CI gleichermaßen möglich, ohne Code-Änderung.

**Konsequenzen:**
- M1-Migrationen sind in M2 nicht zu re-rollen: scharfe Policies werden als
  zusätzliche Migration eingespielt, nicht durch Down-Migration ersetzt.
- `app_user`-Rolle ist Voraussetzung für alle weiteren RLS-Tests in M2.
- UUIDv7-Wechsel auf eine native Postgres-Funktion (z. B. nach Upgrade auf
  Postgres 18) wäre eine reine Default-Substitution ohne Schema-Migration.

**Verworfene Alternativen:**
- B2 (PL/pgSQL-UUIDv7-Function): zu viel DB-Logik für minimalen Gewinn.
- B3 (Vorerst v4): widerspricht `architecture.md` §Konventionen.
- C2 (`onupdate=func.now()` ORM-seitig): greift nicht bei Direkt-SQL.
- D2 (RLS erst in M2): Risiko, dass M1-Migration substantially geändert
  werden muss.
- E2 (Seeds in Alembic): widerspricht `architecture.md` §Migrations.
- F2 (volle Sichtungsliste ohne Abnahme): widerspricht Datei-Kopfnote.

---

## ADR-019 — Implementierungsstrategie M2 (Auth, CSRF, RLS-Mechanik, Bootstrap)

**Status:** Akzeptiert (2026-04-25)

**Kontext:** M2 setzt Authentifizierung, RBAC, scharfe RLS-Policies und
Admin-Bootstrap um. ADR-006 (fastapi-users + Cookie-Sessions) liefert das
Grobgerüst; mehrere Detailentscheidungen sind für M2 zu fixieren.

**Entscheidungen:**

1. **Cookie + Token-Strategie (B1):** `CookieTransport` mit
   `cookie_name="hcmap_session"`, `cookie_secure=True` (in dev abschaltbar
   per Setting), `cookie_httponly=True`, `cookie_samesite="lax"`,
   Lebensdauer 7 Tage. `JWTStrategy` mit serverseitigem
   `HCMAP_SECRET_KEY`. Stateless — kein zusätzlicher Session-Store. DB-
   backed Sessions wären für eine <20-Personen-Gruppe Overkill.

2. **CSRF (C1):** Eigene schmale Middleware in `app/security/csrf.py`.
   Bei erfolgreichem Login wird zusätzlich ein **nicht** HttpOnly-Cookie
   `hcmap_csrf` mit zufälligem Token (32 Bytes URL-safe) gesetzt. Alle
   State-Changing Methoden (`POST`, `PUT`, `PATCH`, `DELETE`) müssen den
   identischen Wert im Header `X-CSRF-Token` mitschicken; sonst 403.
   `GET`/`HEAD`/`OPTIONS` bleiben CSRF-frei. Auth-Login-Endpoint und
   `/api/health` sind whitelisted. Kein zusätzliches Paket.

3. **Argon2id-Parameter (D):** OWASP-Empfehlung 2024 — `time_cost=2`,
   `memory_cost=19456` (≈19 MiB), `parallelism=1`, `hash_len=32`,
   `salt_len=16`. Konfigurierbar über `Settings` (`HCMAP_ARGON2_*`),
   damit Tests schnellere Parameter setzen können. Mindest-
   Passwortlänge 12 Zeichen, kein Maximum (project-context.md §6).

4. **RLS-Mechanik (E1):** Pro Request öffnet das Backend eine neue
   Transaktion (`BEGIN`), setzt `SET LOCAL ROLE app_user` und drei GUCs
   (`app.current_user_id`, `app.current_role`, `app.current_person_id`).
   Bei Ende der Transaktion verfallen alle `SET LOCAL`-Werte automatisch.
   Implementiert in `app/rls.py` als FastAPI-Dependency, die statt
   `get_session` (M1) verwendet wird, sobald Auth aktiv ist. Anonyme
   Endpoints (Health, Auth-Login) nutzen `get_session` ohne RLS-Setup.

5. **Scharfe RLS-Policies (F):** Eine zweite Alembic-Migration ersetzt
   die permissiven Default-Policies aus M1 1:1 mit den per-Rolle-Policies
   aus `architecture.md` §RLS:
   - Event: admin alle, editor/viewer SELECT nur als Participant,
     editor INSERT/UPDATE/DELETE nur eigene.
   - EventParticipant + Application + ApplicationRestraint spiegeln das
     Event-RLS via Sub-Selects.
   - Catalog-Tabellen (RestraintType, ArmPosition, HandPosition,
     HandOrientation): admin alle, editor approved+eigene pending,
     viewer nur approved.
   Person bleibt ohne DB-RLS; Maskierung von `name` läuft als
   Service-Logik, weil sie kontextabhängig ist (siehe architecture.md).

6. **RBAC (`require_role`):** FastAPI-Dependency-Factory in
   `app/deps.py`. Akzeptiert eine oder mehrere Rollen, prüft den per
   `current_user`-Dependency geladenen User und wirft 403 bei
   Mismatch. Liefert den User-Objekt durch.

7. **Bootstrap-CLI (G1):** `backend/scripts/bootstrap_admin.py`,
   ausführbar via `uv run python -m scripts.bootstrap_admin`. Stdlib
   `argparse`. Idempotent: legt eine Person + den ersten Admin-User an,
   wenn noch keiner existiert; sonst Exit 1 mit klarer Meldung. Liest
   E-Mail/Passwort/Name aus Argumenten oder ENV (`HCMAP_BOOTSTRAP_*`).

8. **Mail-Stub (H):** `app/auth/mail.py` mit Interface
   `EmailBackend.send(...)`. Default-Implementation `LoggingBackend`
   schreibt strukturiertes Log mit Reset-Token-URL — kein PII jenseits
   der ohnehin nötigen Adresse. Echter SMTP-Backend wird vor M11
   eingespielt (Querschnittsaufgabe).

**Abgrenzung gegen M2:** Frontend-Auth-Flow (Login-Seite, Hooks) ist
**M4**. RLS-Tests in M2 testen ausschließlich auf API-/SQL-Ebene.

**Konsequenzen:**
- RLS-Policies sind ab M2 produktiv und werden von M3+ vorausgesetzt.
- Connection-Pool-Konfiguration: jede Anfrage öffnet eine eigene
  Transaktion mit `SET LOCAL`. Pool-Mode: kein expliziter
  PgBouncer-Modus nötig, weil Transaktions-Pooling SET LOCAL respektiert.
- HCMAP_SECRET_KEY wird zur Pflichtvariable. `.env.example` ergänzt.
- Alle Tests, die DB schreiben, müssen entweder als Admin agieren oder
  eine Test-Fixture nutzen, die GUCs richtig setzt.

**Verworfene Alternativen:**
- B2 (DB-backed Sessions): Komplexität ohne Mehrwert in Phase 1.
- C2 (`fastapi-csrf-protect`): externe Dependency für ein paar Zeilen
  Logik nicht gerechtfertigt.
- E2 (Pool-weit `SET ROLE`): Risiko von GUC-Leaks zwischen Requests.
- G2 (Click/Typer-CLI): zusätzliche Abhängigkeit für ein einziges Skript.

---

## ADR-020 — Implementierungsstrategie M3 (Domain-API, Service-Layer, Search, Export)

**Status:** Akzeptiert (2026-04-25)

**Kontext:** M3 setzt die Domain-CRUD-API plus Volltextsuche, Throwbacks
und Export um. `architecture.md` §API-Vertrag liefert das Grobgerüst, M3
braucht konkrete Festlegungen zu Scope-Schnitt, Struktur und Hilfsverhalten.

**Entscheidungen:**

1. **Scope-Schnitt M3 ↔ M5a (A1):** M3 deckt nur die generischen
   CRUD-Endpunkte. Live-Modus-Spezialisierungen
   (`POST /api/events/start`, `/end`, `/applications/start`, `/end`,
   `POST /api/persons/quick`) ziehen mit M5a, weil sie an die UI-Mechanik
   koppeln.

2. **Endpunkt-Inventar (B):** `/api/events`, `/api/applications`,
   `/api/persons`, `/api/restraint-types` + drei weitere Catalog-Pfade,
   `/api/search`, `/api/throwbacks/today`, `/api/export/me`,
   `/api/admin/export/all`. Persons-Schreibzugriff admin-only;
   Anonymisierungs-Endpoint `POST /api/persons/{id}/anonymize`.

3. **Pagination (C1):** Offset/Limit mit `?limit=50&offset=0` (Default 50,
   Max 200). Response-Hülle `{items, total, limit, offset}`. Cursor-
   Pagination wäre für <5000 Events Overkill und kann später ohne
   API-Vertragsbruch als zusätzlicher Modus ergänzt werden.

4. **Service-Layer (D1):** Module unter `backend/app/services/`. Routes
   bleiben dünn (Pydantic-Validierung + Auth-Dependency + Service-
   Aufruf). Services kapseln SQL/ORM und Business-Regeln. Erleichtert
   Tests und CLI-Wiederverwendung (Bootstrap-Admin).

5. **Auto-Participant-Regel (E1, ADR-012):** Service-Layer
   (`applications.create`) fügt Performer und Recipient implizit als
   `EventParticipant` ein, wenn nicht schon vorhanden. Reversibel,
   testbar, kein DB-Trigger.

6. **Plus-Code (F):** Neues Paket `openlocationcode>=1.0` (BSD-3,
   in `project-context.md` §3 vorgesehen). Berechnung in der Detail-
   Response (`GET /api/events/{id}.plus_code`); nicht in Listenansicht
   (Performance) und nicht persistiert (kein Schema-Change).

7. **Volltextsuche (G):** Direkter Query gegen die GIN-Indizes aus M1
   mit `to_tsvector('german', note) @@ plainto_tsquery('german', :q)`.
   Liefert gemischte Liste mit `{type, id, snippet, event_id?}`. RLS
   greift automatisch via `app_user_can_see_event`. Pagination wie C1.

8. **Personenmaskierung (H):** Service-Layer ersetzt Person-Felder
   (`name`, `alias`) durch Platzhalter (`"[verborgen]"`) in Events mit
   `reveal_participants=false`, **außer** der anfragende User ist
   selbst Participant in genau diesem Event. Maskierung ist kontext-
   abhängig und gehört nicht in eine DB-Policy.

9. **Validierung (I):** Pydantic-Schemas für Request/Response;
   `performer_id != recipient_id` als **Warning** (HTTP 422 nur, wenn
   `?strict=true` gesetzt — Default akzeptiert Self-Bondage). Katalog-
   Einträge in Application müssen `status='approved'` sein
   (Service-Layer-Check). Lat/Lon zusätzlich als Pydantic-Constraint.

10. **Export (J1):**
    - JSON: `application/json`, ein Top-Level-Objekt mit
      Versionsfeld, Sektionen `events`, `applications`,
      `event_participants`, `application_restraints`,
      `restraint_types` (nur referenzierte). Nicht-streaming.
    - CSV: pro Entität ein eigener Endpoint
      (`/api/export/me/events.csv`, `/applications.csv`).
      `StreamingResponse`, ein Header pro Datei.
    - Admin-Export setzt RLS aus über die Admin-Rolle.

11. **OpenAPI-Doku:** alle Routes mit `summary`, `description`,
    `response_model`, `tags`. Beispiele für die Request-Bodies via
    `examples=` an den Pydantic-Feldern.

**Konsequenzen:**
- Keine Schema-Migration in M3 (Plus-Code wird nicht persistiert,
  Volltextsuche nutzt vorhandene Indizes, RLS-Policies bleiben).
- Service-Layer ist die Stelle, an der Auto-Participant, Maskierung,
  Approved-Catalog-Check und Anonymisierung sitzen — Tests müssen die
  Service-Funktionen direkt prüfen können.
- M3 produziert ~25 Endpunkte; OpenAPI bleibt der primäre Doku-
  Anker.

**Verworfene Alternativen:**
- E2 (DB-Trigger Auto-Participant): koppelt Geschäftslogik an Postgres,
  schwer zu testen.
- Cursor-Pagination: Overengineering für Pfad A.
- Plus-Code als generated column: würde Schema-Migration erfordern und
  bei späterem Plus-Code-Algorithmus-Wechsel weitere Migration.

---

## ADR-021 — Implementierungsstrategie M4 (Frontend-Grundgerüst, Auth-Flow)

**Status:** Akzeptiert (2026-04-25)

**Kontext:** M4 baut das Frontend-Grundgerüst auf einem bereits vorhandenen
Next.js-15-Skelett (TypeScript strict, Tailwind 3.4, shadcn-Konfig). ADR-006
(Cookie-Sessions) und ADR-019 (CSRF-Double-Submit) liefern das Backend-
Verhalten; für die Browser-Seite werden elf Detail-Entscheidungen fixiert.

**Entscheidungen:**

1. **Backend-Anbindung in Dev (A1):** `next.config.mjs` rewrite
   `/api/*` → `http://backend:8000/api/*` (lokal über `BACKEND_INTERNAL_URL`
   parametrisiert, Default `http://localhost:8000`). Damit bleiben Cookies
   Same-Origin, kein CORS-Aufwand. Im Produktiv-Deployment übernimmt Caddy
   diese Aufgabe (siehe `architecture.md` §Caddyfile); der Next.js-Rewrite
   ist Dev-only, gesteuert über `process.env.NODE_ENV !== 'production'`.

2. **fetch-Wrapper (B1):** `src/lib/api.ts` als typisierter Wrapper.
   - `credentials: 'include'` immer.
   - Auf Mutations (`POST/PUT/PATCH/DELETE`) liest der Wrapper das
     `hcmap_csrf`-Cookie via `document.cookie`-Parsing und setzt
     `X-CSRF-Token`-Header.
   - Fehler werden als `ApiError`-Klasse (`status`, `code`, `detail`)
     geworfen, JSON-Body wird best-effort geparst.
   - Auf dem Server (Server Components, Middleware) gibt es eine zweite
     Variante, die mit explizit übergebenen Cookie-Headern arbeitet.

3. **Server-State (C1):** `@tanstack/react-query` mit `QueryClient` in
   `src/components/providers.tsx` (Client-Component, in `RootLayout`
   eingebunden). Cache-Keys hierarchisch: `['auth','me']`, `['events']`,
   `['catalogs', kind]`. Default-Stale-Zeit 30 s, Refetch on Window
   Focus aus.

4. **Route-Protection (D3):** Hybrid.
   - `src/middleware.ts` (Edge): prüft Existenz des `hcmap_session`-
     Cookies. Bei fehlendem Cookie auf `/login` umleiten (außer `/login`
     selbst und Public-Pfade).
   - `src/app/(protected)/layout.tsx` (Server-Component): lädt
     `/api/auth/me` mit weitergereichten Cookies; bei 401 `redirect()`
     auf `/login`; bei `role`-Mismatch (z. B. `/admin/*` ohne Admin)
     auf `/`.

5. **Login-Submission (E1):** Client-Component mit `useMutation` →
   `POST /api/auth/login` über fetch-Wrapper. Nach Erfolg
   `router.push('/')` und `queryClient.invalidateQueries({queryKey:
   ['auth','me']})`. Keine Server Action (Cookie-Weitergabe-Aufwand
   nicht gerechtfertigt).

6. **Layout (F1):** Sidebar ab `md:`, Bottom-Tab-Bar darunter, beide aus
   einer gemeinsamen Nav-Item-Liste in `src/components/layout/nav.ts`
   generiert. Komponenten: `AppShell`, `Sidebar`, `BottomNav`,
   `UserMenu`.

7. **Dark-Mode (G1):** `next-themes` mit `attribute="class"`,
   `defaultTheme="system"`, `enableSystem`. Theme-Toggle im UserMenu.
   `suppressHydrationWarning` auf `<html>`.

8. **shadcn-Initialset (H):** Generiert via `pnpm dlx shadcn@latest add`
   (oder bei fehlendem Netzwerk-Zugriff manuell anhand der offiziellen
   Templates kopiert): `button`, `input`, `label`, `form` (inkl.
   `react-hook-form`+`@hookform/resolvers`+`zod` für Validierung),
   `card`, `dropdown-menu`, `avatar`, `sheet`, `sonner`, `skeleton`.
   Style "new-york", `cssVariables: false` (bestehende `components.json`).

9. **Stub-Seiten (I):** `/` Dashboard, `/events`, `/map`, `/admin`,
   `/profile`, `/login`. M4 zeigt End-to-End: Login → Auth-Cookie →
   `/api/auth/me` → Dashboard mit Display-Name + Rolle. Listen
   befüllen sich aus echten Backend-Routen
   (`/api/events?limit=5`, `/api/throwbacks/today`); leere Antworten
   sind erlaubt. Echte Inhalte folgen mit M5a/M5c/M6/M8.

10. **Tests (J1):** `vitest` + `@testing-library/react` +
    `@testing-library/jest-dom` + `jsdom`. Pflicht-Tests in M4:
    - `lib/api.ts`: setzt `X-CSRF-Token` bei Mutations, lässt GET frei.
    - `useMe`-Hook: 200 → User; 401 → null.
    - `middleware.ts`: redirected ohne Session-Cookie auf `/login`.
    - Login-Form: erfolgreicher Submit ruft Wrapper mit korrekter
      Payload, Fehler zeigt Toast.
    Coverage-Ziel laut `project-context.md` §7 (60 % Frontend) ist
    erst nach M5+ abprüfbar; M4 legt nur die Infrastruktur.

11. **Neue Dependencies (K, alle MIT/ISC, lizenzkonform):**
    Runtime: `@tanstack/react-query`, `@tanstack/react-query-devtools`
    (dev-only), `next-themes`, `lucide-react`, `class-variance-authority`,
    `@radix-ui/react-*` (Slot, Dropdown-Menu, Avatar, Dialog, Label),
    `react-hook-form`, `@hookform/resolvers`, `zod`, `sonner`.
    Test/Dev: `vitest`, `@vitejs/plugin-react`, `jsdom`,
    `@testing-library/react`, `@testing-library/jest-dom`,
    `@testing-library/user-event`.

**Konsequenzen:**
- Browser-Side hat genau einen Auth-Pfad: Cookie + CSRF, keine zusätzlichen
  Tokens. Damit deckt M4 alle Pflicht-Sicherheits-Erwartungen aus
  `project-context.md` §6 ab, ohne Wiederholungslogik.
- `lib/api.ts` ist die alleinige Stelle für Mutations-Header; künftige
  Domains erben CSRF- und Credential-Handling automatisch.
- `(protected)`-Route-Group hält öffentliche (`/login`) und
  geschützte Pfade auseinander, ohne dass jeder Layout-Boilerplate
  schreibt.
- M4 ist ein durchgängiger Auth-Vertical-Slice: Login → Session →
  Dashboard mit `useMe`. Spätere Domains (Events, Map, Admin) bauen
  nur Inhalte hinein.

**Verworfene Alternativen:**
- A2 (CORS + Direkt-Aufruf): zusätzlicher Setup ohne Mehrwert in Dev.
- B2 (OpenAPI-Codegen): lohnt erst nach M5/M7, wenn Endpunkt-Anzahl
  hoch ist.
- D1 (Middleware-Only): Edge-Middleware kann nicht zuverlässig
  `/api/auth/me` aufrufen (Body-Streaming-Beschränkung) — Rolle-
  Check gehört in Server-Component.
- D2 (Layout-Only): Edge-Redirect für Anonyme ist deutlich schneller.
- E2 (Server Action für Login): Set-Cookie-Weitergabe macht den
  Code komplizierter ohne UX-Vorteil.
- F2 (Drawer/Hamburger): kollidiert mit ADR-011 — Live-Modus braucht
  schnellen Tab-Wechsel auf Mobile.
- G2 (eigene Tailwind-Class-Strategie): Hydration-Risiko, mehr Code.

---

## ADR-022 — LocationPicker und Tile-Proxy in M5a vorgezogen

**Status:** Akzeptiert (2026-04-26)

**Kontext:** M5a verlangt im Live-Modus eine GPS-Vorbelegung mit
„Tap-to-Adjust"-Korrektur auf einer Karte (siehe `fahrplan.md` §M5a,
Akzeptanzkriterium „GPS-Korrektur per Karten-Tap funktioniert"). Die
vollständige Kartenansicht (Marker-Liste, Clustering, Filter, URL-State,
Popup-Navigation) ist als eigener Meilenstein **M6** definiert. Ohne
Vorentscheidung würde M5a entweder das M6-Akzeptanzkriterium reißen oder
M5a und M6 müssten zu einem schwer abgrenzbaren Block verschmelzen.

**Entscheidungen:**

1. **Scope-Schnitt M5a ↔ M6 (Option A):** M5a liefert eine eigenständige,
   minimale Komponente `LocationPickerMap`: ein einzelner verschiebbarer
   Marker auf einer MapLibre-Karte, kein Clustering, kein Filter, kein
   URL-Sync, kein Popup. Tap setzt `lat`/`lon` im Form-State. M6 baut
   später die vollständige `MapView` (Marker-Liste, Clustering, Filter,
   URL-State, Popup-Navigation) als eigene Komponente — `LocationPickerMap`
   wird in M6 entweder als Basis ausgebaut oder bleibt eigenständig
   bestehen, je nach Refactor-Aufwand. Verworfen wurden Option B
   (M6 vorziehen / mit M5a verschmelzen — macht M5a unabnehmbar) und
   Option C (Karten-Tap streichen, nur Lat/Lon-Felder + Plus Code —
   verletzt Akzeptanzkriterium und ADR-011-UX).

2. **Tile-Proxy in M5a (Option A-Folge):** Da `LocationPickerMap`
   MapLibre-Tiles braucht, wird der in `architecture.md` §API
   skizzierte Tile-Proxy `GET /api/tiles/{z}/{x}/{y}` aus dem M6-Scope
   nach M5a vorgezogen. MapTiler-API-Key bleibt serverseitig in
   `MAPTILER_API_KEY`-ENV. Implementierung: dünner FastAPI-Router
   `app/routes/tiles.py`, der die Tile-URL bei MapTiler abruft und den
   Body mit `Cache-Control: public, max-age=86400` durchreicht; bei
   Upstream-Fehler 502 ohne Detail-Leak. Auth: eingeloggt erforderlich
   (Session-Cookie); RLS-Setup nicht nötig, weil Tiles
   nutzer-unabhängig sind.

3. **MapLibre-Setup im Frontend:** `react-map-gl` + `maplibre-gl`
   werden als Runtime-Dependencies aufgenommen (beide MIT, lizenz-
   konform). `LocationPickerMap` lädt Tiles über
   `process.env.NEXT_PUBLIC_TILE_URL` mit Default
   `'/api/tiles/{z}/{x}/{y}'` (Same-Origin, Cookies werden mitgesendet).
   Map-Style: das in MapTiler kostenlos verfügbare „basic-v2" oder
   Vergleichbares; finale Style-Wahl erfolgt während der Implementierung,
   ohne ADR.

4. **Geocoding bewusst nicht in M5a:** MapTiler-Geocoding-Proxy
   (`GET /api/geocode?q=...`) bleibt im M6-Scope. Im Live-Modus reicht
   GPS + manueller Tap; Adress-Suche ist sekundär.

5. **M6-Restscope:** M6 deckt weiterhin Marker-Liste aller sichtbaren
   Events, Clustering, Zeitraum- und Personen-Filter, URL-State des
   Viewports, Popup mit Detail-Link sowie den Geocoding-Proxy ab. Die
   Tile-Auslieferung ist mit M5a bereits erledigt.

**Konsequenzen:**

- M5a wird um `LocationPickerMap` (Frontend) und Tile-Proxy (Backend)
  erweitert. Aufwand überschaubar (~1 Komponente + 1 Route +
  Tile-Caching).
- M6 wird kleiner, weil Tile-Auslieferung schon vorhanden ist. M6
  konzentriert sich auf Listen-/Filter-/Popup-UX.
- Frontend bekommt zwei neue Runtime-Dependencies (`react-map-gl`,
  `maplibre-gl`). Beide sind in `project-context.md` §3 als „empfohlen"
  geführt — keine Freigabe nötig.
- Backend bekommt eine neue ENV-Variable `MAPTILER_API_KEY`.
  `.env.example` und README werden in M5a entsprechend ergänzt.
- Falls M6 später entscheidet, `LocationPickerMap` zur Basis der
  `MapView` umzubauen, ist das ein Refactor innerhalb des
  Frontend-Map-Moduls und freigabefrei.

**Verworfene Alternativen:**

- B (M6 vorziehen / verschmelzen): macht M5a unabnehmbar groß, schwer
  testbar, schwerer Review.
- C (kein Karten-Tap, nur Lat/Lon-Felder): verletzt M5a-Akzeptanz-
  kriterium und ADR-11-UX (Live-Modus muss in <30s vom Tap zur ersten
  gespeicherten Application kommen — manuelle Lat/Lon-Eingabe ist auf
  Mobile zu langsam).

---

## ADR-023 — App-PIN-Hashing clientseitig via PBKDF2 (Web Crypto API)

**Status:** Akzeptiert (2026-04-26)

**Kontext:** ADR-015 verlangt eine clientseitige App-PIN-Sperre als
Schutz gegen Schulterblick und kurze fremde Geräteübernahme. PIN ist
4–6 Ziffern, wird gehasht in IndexedDB abgelegt, Inaktivitäts-Sperre
nach 60 s, Zwangs-Logout nach 5 Fehlversuchen.
`project-context.md` §6 lässt „PBKDF2 oder Argon2-WASM" zu. Eine
Festlegung war offen.

**Schutzziel** laut `architecture.md` §App-PIN-Sperre: UI-Sperre gegen
Schulterblick und kurze fremde Übernahme eines **entsperrten** Geräts.
**Nicht** im Schutzziel: forensischer Zugriff auf das entsperrte Gerät
oder die IndexedDB. Letzteres ist Job von Geräte-Sperre und Auth-System
(Cookie wird beim Zwangs-Logout invalidiert).

**Entscheidungen:**

1. **Algorithmus:** PBKDF2-SHA-256 via Web Crypto API
   (`crypto.subtle.deriveBits`). Browser-nativ, keine externe
   Dependency, kein WASM-Bundle.

2. **Parameter:**
   - **Iterationen:** 600.000 (OWASP-Empfehlung 2024 für PBKDF2-SHA-256).
   - **Salt:** 16 Byte zufällig per `crypto.getRandomValues`, einmalig
     pro User beim Setzen der PIN, in IndexedDB neben dem Hash gespeichert.
   - **Output-Länge:** 32 Byte (256 Bit).
   - **Encoding:** Base64 für Storage.

3. **Storage-Layout in IndexedDB** (`hcmap-pin`-Object-Store, Key
   `pin_v1`):
   ```json
   {
     "version": 1,
     "algorithm": "PBKDF2-SHA256",
     "iterations": 600000,
     "salt_b64": "...",
     "hash_b64": "...",
     "fail_count": 0,
     "set_at": "ISO-8601"
   }
   ```
   `version` und `algorithm` sind explizit, damit ein späterer Wechsel
   auf Argon2id ohne Datenverlust möglich ist (alter Hash bleibt
   verifizierbar, neuer wird beim nächsten erfolgreichen Entsperren mit
   neuer Algorithmus-Variante geschrieben).

4. **Vergleich:** Konstantzeit-Vergleich der Base64-Strings, um
   Timing-Side-Channels zu vermeiden — auch wenn das Risiko in einer
   reinen Browser-Umgebung niedrig ist.

5. **Fehlversuch-Zähler:** `fail_count` wird **vor** dem Hash-Vergleich
   inkrementiert und persistiert; bei Erfolg auf 0 zurückgesetzt. Bei
   `fail_count >= 5` wird die App den Server-Logout-Endpoint
   (`POST /api/auth/logout`) aufrufen und IndexedDB
   (Pin-Store + RxDB-Daten in M5b) leeren.

6. **Inaktivitäts-Timer:** Default 60 s, aus User-Profil konfigurierbar
   (in M5a-Profil-UI). Timer-Reset bei `pointerdown`, `keydown`,
   `visibilitychange`. Bei Timer-Ablauf wird ein Vollbild-Overlay
   angezeigt; Navigation und Mutations werden blockiert. Implementierung
   in einer eigenen Component `LockOverlay` plus Hook `usePinLock`.

7. **Web-Worker nicht erforderlich:** PBKDF2 mit 600.000 Iterationen
   dauert auf modernem Mobile ~300–500 ms. Das Vollbild-Overlay zeigt
   während dieser Zeit einen Spinner. Ein Web-Worker wäre nur sinnvoll,
   wenn die Hauptseite während des Hashings interaktiv bleiben müsste —
   sie ist es per Design nicht.

8. **Späterer Algorithmus-Wechsel:** Falls das Schutzziel später um
   „verlorenes Gerät" erweitert wird, kann ein Folge-ADR Argon2id-WASM
   einführen. Das `version`/`algorithm`-Feld erlaubt sanfte Migration
   ohne erzwungenes PIN-Zurücksetzen.

**Konsequenzen:**

- Keine neuen externen Abhängigkeiten — `crypto.subtle` ist im
  Browser-Standard. Kein Bundle-Overhead.
- Konsistenz Backend/Frontend ist **algorithmisch unterschiedlich**
  (Backend nutzt Argon2id für Login-Passwörter via pwdlib, ADR-019).
  Das ist akzeptiert: unterschiedliche Schutzziele, unterschiedliche
  Anforderungen. Login-Passwörter sind im worst case auch offline
  angreifbar (Datenbank-Dump), eine PIN nicht (Server-Logout nach 5
  Versuchen).
- Brute-Force-Resistenz für eine 4-stellige PIN bei Datenbank-Dump-
  Szenario ist gering (10⁴ Versuche × 300 ms = ~50 min auf einer GPU
  noch deutlich kürzer). Das ist explizit kein Schutzziel und durch
  den Server-Logout-Mechanismus für Online-Brute-Force gedeckt.
- IndexedDB-Schema bekommt einen neuen Object-Store `hcmap-pin`. Wird
  beim ersten PIN-Setzen erstellt. Migration in M5b nicht nötig
  (RxDB-Object-Stores sind unabhängig).

**Verworfene Alternativen:**

- **Argon2id-WASM** (`hash-wasm` oder `argon2-browser`): überdimensioniert
  für das dokumentierte Schutzziel; 50–200 KB WASM-Bundle, neue
  Abhängigkeit (freigabepflichtig nach CLAUDE.md §4). Sinnvoll, wenn
  Schutzziel um „verlorenes Gerät, IndexedDB lesbar" erweitert wird —
  dann separater ADR.
- **Bcrypt-JS:** weder speicherhart noch durch Web-Crypto unterstützt;
  zusätzliche JS-Dependency ohne Vorteil.
- **Klartext-PIN in IndexedDB:** trivial, aber bricht das minimale
  Sicherheitsversprechen einer PIN-Sperre vollständig.
- **PIN-Verifikation auf Server:** würde funktionieren, aber bricht
  die Offline-Tauglichkeit (RxDB im Funkloch, ADR-017) und macht aus
  der UI-Sperre einen vollwertigen zweiten Auth-Faktor — größere
  Architekturwirkung als gewünscht.

---

## ADR-024 — Implementierungsstrategie M5a.1 (Live-Endpoints + Tile-Proxy)

**Status:** Akzeptiert (2026-04-26)

**Kontext:** M3 lieferte das generische Domain-CRUD; die fünf Live-Modus-
Endpunkte (`POST /api/events/start`, `POST /api/events/{id}/end`,
`POST /api/events/{event_id}/applications/start`,
`POST /api/applications/{id}/end`, `POST /api/persons/quick`) wurden
laut ADR-020 §A1 bewusst in M5a verschoben. Mit ADR-022 kommt zusätzlich
der Tile-Proxy `GET /api/tiles/{z}/{x}/{y}` in den M5a-Scope. M5a.1 setzt
dieses Backend-Paket um.

**Entscheidungen:**

1. **Endpoint-Inventar (A):** Sechs Routen, alle unter `/api/`:
   - `POST /api/events/start` (Live-Event-Anlage, ADR-011)
   - `POST /api/events/{id}/end` (Live-Event-Beendigung, idempotent)
   - `POST /api/events/{event_id}/applications/start` (Live-Application-
     Anlage, ADR-011 + ADR-012)
   - `POST /api/applications/{id}/end` (Live-Application-Beendigung,
     idempotent)
   - `POST /api/persons/quick` (On-the-fly-Person, ADR-014)
   - `GET /api/tiles/{z}/{x}/{y}` (MapTiler-Proxy, ADR-022)

2. **Idempotenz der End-Endpoints (B):** `end_event` und
   `end_application` setzen `ended_at = now()` nur, wenn das Feld noch
   `NULL` ist. Ein zweiter Aufruf liefert denselben Datensatz mit
   demselben `ended_at` zurück. Damit überlebt der Live-Modus
   doppelte Klicks, Reconnect-Retries und RxDB-Replay (ab M5b) ohne
   Sonderbehandlung. Verworfen wurde 409-Conflict bei zweitem End-Call:
   bricht idempotente HTTP-Semantik und zwingt Frontend zu Status-
   Tracking, das es nicht braucht.

3. **Auto-Participant-Wiederverwendung (C):** `start_event` ruft den in
   M3 etablierten `add_participant` auf, um den Creator und (falls
   gesetzt) den Recipient als `EventParticipant` zu hinterlegen.
   `start_application` nutzt den vorhandenen `_ensure_participant` aus
   `services/applications.py`. Keine neue DB-Logik, kein neuer Trigger.
   Verworfen wurde eine Trigger-basierte Variante (zu schwer testbar,
   Regel-003 hängt an der Service-Schicht).

4. **Default-Performer/Recipient für Live-Applications (D):**
   - `performer_id` fehlt → `requester_person_id` (Regel-002).
   - `recipient_id` fehlt → `requester_person_id` (Self-Bondage als
     Default; UI ist verantwortlich, den gewählten Recipient explizit
     zu schicken).
   Diese Defaults gelten **nur** für `applications/start`, nicht für
   `applications` (M3-Pfad), weil dort beide Felder Pflicht sind.
   Bewusst keine Pflicht-Validierung von `recipient_id ≠ performer_id`
   im Live-Pfad — entspricht ADR-020 §I (Self-Bondage erlaubt).

5. **Recipient-Vermerk auf Event (E):** `EventStart` akzeptiert ein
   optionales `recipient_id`-Feld. Wird es übergeben, fügt `start_event`
   die Person als Participant hinzu. **Das Event-Schema bleibt
   unverändert** — kein neues `recipient_id`-Feld auf `event`. Die UI
   merkt sich den ausgewählten Recipient im Client-State und füllt ihn
   in `applications/start` ein. Verworfen wurde eine `event.recipient_id`-
   Spalte (Schema-Migration für ein UI-Convenience-Feld; widerspricht
   ADR-020 §A1, weil das Datenmodell rein per-Application ist).

6. **Tile-Proxy-Mechanik (F, ADR-022):**
   - Auth: `current_active_user`-Dependency. RLS-Session nicht nötig
     (Tiles sind nutzer-unabhängig).
   - Pfad-Parameter werden auf gültige Tile-Koordinaten validiert:
     `z` ∈ [0, 22], `x`/`y` ≥ 0.
   - Upstream-URL aus `MAPTILER_STYLE` und `MAPTILER_API_KEY`
     aufgebaut: `https://api.maptiler.com/maps/{style}/{z}/{x}/{y}.png?key={key}`.
   - HTTP-Client: `httpx.AsyncClient` als Prozess-Singleton via
     `lru_cache(maxsize=1)`, Timeout 10 s (Connect 5 s).
   - Antwort: `StreamingResponse` mit upstream-Content-Type und
     `Cache-Control: public, max-age=86400` (24 h).
   - Fehler-Mapping: Netzwerk-Exception → 502; Upstream-Status ≥ 400 →
     502 (kein Detail-Leak des Upstream-Statuses); leerer API-Key → 503.

7. **httpx als Runtime-Dependency (G):** `httpx` war bislang nur Dev-
   Abhängigkeit (Tests). Für den Tile-Proxy zur Laufzeit wird es in
   `[project.dependencies]` aufgenommen. Lizenz BSD-3-Clause, kompatibel
   mit der Allow-List in `project-context.md` §6 — keine separate
   Lizenz-Freigabe nötig.

8. **CSRF und Whitelist (H):** Alle fünf Live-Endpunkte sind
   state-changing (POST) und werden vom CSRF-Middleware-Schutz
   abgedeckt. Der Tile-Proxy ist ein GET und durchläuft die
   `_SAFE_METHODS`-Ausnahme automatisch. Kein Whitelist-Eintrag nötig.

9. **Tests (I):** 21 neue HTTP-Tests gegen Postgres 16 + PostGIS 3.4:
   - `test_events_live_api.py` (5): start setzt `started_at` ±2 s,
     start mit Recipient fügt beide als Participant hinzu, end setzt
     `ended_at`, end ist idempotent, end auf unbekannte ID → 404.
   - `test_applications_live_api.py` (6): start setzt `started_at` und
     `sequence_no=1`, Default-Self-Bondage ohne Recipient, sequence_no
     inkrementiert, end setzt `ended_at`, end idempotent,
     Auto-Participant funktioniert.
   - `test_persons_quick_api.py` (4): admin und editor erlaubt, viewer
     blockiert (403), `linkable=true` im Body wird ignoriert.
   - `test_tiles_proxy.py` (6): anonym blockiert (401), kein Key → 503,
     Erfolgsfall mit Cache-Header und Upstream-URL-Verifikation,
     Netzwerk-Fehler → 502, Upstream-4xx → 502, Zoom out of range
     → 422.
   Backend-Suite: 53 → 74 Tests, alles grün. ruff und ruff format clean.

10. **Scope-Abgrenzung gegen M5a.2/.3/.4 (J):**
    - **M5a.1 (dieser ADR):** Backend-Live-Endpoints + Tile-Proxy +
      Tests + ENV.
    - **M5a.2:** Frontend Startseite, Suche, Export-UI — konsumiert
      ausschließlich M3-Endpoints, keine Backend-Änderungen.
    - **M5a.3:** Frontend Live-Modus + LocationPickerMap — konsumiert
      die hier gebauten Endpoints + den Tile-Proxy.
    - **M5a.4:** App-PIN-Sperre nach ADR-023, querliegend zu allen
      Frontend-Routen, kein Backend-Anteil.
    Trennung minimiert PR-Größe und macht Reviews abnehmbar.

**Konsequenzen:**

- Live-Modus-Endpoints sind ab M5a.1 produktiv. Frontend kann ohne
  weitere Backend-Arbeit anbinden.
- Tile-Proxy ist betriebsbereit, **aber inaktiv ohne Key** — leerer
  `HCMAP_MAPTILER_API_KEY` liefert 503. Das ist gewollt: Vor M11 muss
  im Deployment der Key konfiguriert werden, sonst zeigt das Frontend
  „Karte nicht verfügbar".
- mypy meldet weiterhin den vorbestehenden M2-Fehler in
  `app/auth/routes.py:20` (TypeVar `models.UP` vs. eigenes User). Der
  Fehler ist nicht durch M5a.1 verursacht und liegt im M2-Modul; eine
  Korrektur wäre Scope-Erweiterung in fremde Modulgrenze (CLAUDE.md
  §6 + §8). Wird separat aufzulösen sein, sobald jemand am Auth-Modul
  arbeitet.

**Verworfene Alternativen:**

- B2 (409-Conflict bei doppeltem End-Call): bricht HTTP-Idempotenz.
- C2 (DB-Trigger für Auto-Participant): widerspricht ADR-020 §E2.
- E2 (`event.recipient_id`-Spalte): Schema-Migration für UI-Komfort
  ohne Datenmodell-Bedarf.
- F2 (Tile-Proxy ohne lru_cache): jede Anfrage mit neuem
  `httpx.AsyncClient`-Instance — Verbindungs-Pool-Verlust.
- G2 (httpx in dev-Group lassen + Production-Imports): bricht Runtime
  in der Produktion.

---

## ADR-025 — User-Modell erbt von SQLAlchemyBaseUserTableUUID (typing-fix)

**Status:** Akzeptiert (2026-04-26)

**Kontext:** `app/auth/routes.py:20` deklariert
`fastapi_users = FastAPIUsers[User, uuid.UUID](...)`. Der TypeVar `UP`
in `FastAPIUsers[UP, ID]` ist an einen Protokoll-Vertrag gebunden, den
unser User-Modell aus M2 nicht statisch erfüllt — User erbte direkt von
`Base, TimestampMixin, SoftDeleteMixin` und deklarierte alle benötigten
Spalten (`id`, `email`, `hashed_password`, `is_active`, `is_superuser`,
`is_verified`) als `Mapped[...]`. Zur Laufzeit funktioniert das via
Duck-Typing; mypy aber sieht nur die `Mapped[...]`-Descriptor-Typen, nicht
die Plain-Types, die das Protokoll erwartet. Resultat: persistenter
mypy-Fehler `Value of type variable "models.UP" of "FastAPIUsers" cannot
be "User"` plus fünf `# type: ignore[type-var]`-Workarounds in
`app/auth/manager.py`. Die DoD aus `project-context.md` §7 verlangt
`mypy --strict` clean — dieser Befund war die einzige Abweichung.

**Entscheidungen:**

1. **Vererbung erweitern (A):** `User` erbt jetzt von
   `SQLAlchemyBaseUserTableUUID, Base, TimestampMixin, SoftDeleteMixin`.
   `SQLAlchemyBaseUserTableUUID` deklariert die fastapi-users-Pflicht-
   Spalten unter `if TYPE_CHECKING` als Plain-Types (`id: UUID_ID`,
   `email: str`, `hashed_password: str`, `is_active: bool`,
   `is_superuser: bool`, `is_verified: bool`) und unter `else` als
   `Mapped[...]`-Spalten — genau das Muster, das mypy als Protokoll-
   Erfüllung sieht.

2. **Spalten-Overrides per `if not TYPE_CHECKING` (B):** Die geerbten
   Spaltendefinitionen passen nicht 1:1 zu unserem Schema:
   - Parent setzt `id` mit `default=uuid.uuid4`. Wir brauchen UUIDv7
     (ADR-018) → `id: Mapped[uuid.UUID] = pk_column()`.
   - Parent setzt `email` mit `unique=True, index=True` direkt am
     Column. Wir haben einen benannten `UniqueConstraint` in
     `__table_args__` → ohne Override gäbe es einen zusätzlichen
     impliziten Index plus einen anonymen Unique-Constraint.
   - Parent setzt `is_active`/`is_superuser`/`is_verified` ohne
     `server_default`. Unser Schema nutzt `server_default="true"`
     bzw. `"false"` → ohne Override würde der Server-Default
     verschwinden.
   Die Overrides werden in einem `if not TYPE_CHECKING:`-Block
   deklariert. Damit sind sie zur Laufzeit für SQLAlchemy aktiv, aber
   für mypy unsichtbar — die Plain-Type-Sicht der Eltern bleibt
   erhalten und das Protokoll wird erfüllt.

3. **type-ignore-Cleanup (C):** Die fünf `# type: ignore[type-var]`-
   Kommentare in `app/auth/manager.py` (UserManager-Bases, get_user_db,
   get_user_manager-Signaturen) sind nicht mehr nötig und werden
   entfernt. mypy meldet sie als `unused-ignore`, sobald der Hauptfehler
   verschwindet.

4. **Schema-Drift-Verifikation (D):** Mit den Overrides bleibt das
   Datenbank-Schema **bit-für-bit identisch**. Verifiziert über:
   `alembic upgrade head` gegen frische Postgres-DB → `\d "user"` in
   psql → CREATE TABLE-Output aus der SQLAlchemy-Metadata. Beide
   stimmen in Spalten (Typ, Nullable, Default), Indizes (`pk_user`,
   `ix_user_role`, `uq_user_email`, `uq_user_person_id`),
   Foreign-Keys und Triggern überein. Keine Migration erforderlich.

5. **Test-Verifikation (E):** Komplette Backend-Suite 74/74 grün
   gegen Postgres 16 + PostGIS 3.4 (M0–M5a.1). RLS-Tests, Auth-Tests,
   und alle Domain-CRUD-Pfade passieren ohne Anpassungen.

**Konsequenzen:**

- `mypy --strict` ist clean (50 Source-Files, 0 Errors).
- DoD aus `project-context.md` §7 wieder vollständig erfüllt.
- Keine `# type: ignore`-Schulden mehr im Auth-Modul.
- Pattern „Override-Spalten in `if not TYPE_CHECKING`" ist
  dokumentiert und kann als Vorlage dienen, falls weitere
  fastapi-users-Erweiterungen (z. B. ein Pfad-B-Audit-Log-Modell)
  ähnliche Override-Bedürfnisse haben.

**Verworfene Alternativen:**

- B (`# type: ignore[type-var]` an Zeile 20 belassen): hätte den
  Designmismatch versteckt und den vorhandenen Workaround-Cluster in
  `app/auth/manager.py` zementiert.
- C (mypy-per-file-Override für `app/auth/routes.py`): Loch in der
  `mypy --strict`-Garantie, gilt für jede zukünftige Änderung an der
  Datei.
- A ohne Spalten-Overrides: hätte einen impliziten zusätzlichen Index
  auf `email`, einen anonymen Unique-Constraint, fehlende
  `server_default`-Werte auf den Boolean-Flags, und UUIDv4 statt
  UUIDv7 für neue User (Bruch von ADR-018) bedeutet —
  Schema-Migration plus ADR-Konflikt.

---

## ADR-026 — Implementierungsstrategie M5a.2 (Frontend Startseite, Suche, Export)

**Status:** Akzeptiert (2026-04-26)

**Kontext:** ADR-024 §J schneidet M5a.2 als reinen Frontend-Konsum
bestehender M3-Endpoints zu: Volltextsuche (`GET /api/search`),
„On this day" (`GET /api/throwbacks/today`), JSON- und CSV-Export
(`/api/export/me`, `/api/export/me/events.csv`,
`/api/export/me/applications.csv`, `/api/admin/export/all`).
Die Sub-Schritte M5a.3 (Live-Modus + LocationPickerMap) und M5a.4
(App-PIN) bleiben bewusst außen vor. M5a.2 fällt vollständig in den
Autonomiebereich (CLAUDE.md §5) — keine neuen Module, keine
Backend-Änderungen, keine neuen Abhängigkeiten.

**Entscheidungen:**

1. **Globale Suchleiste (A):** `components/layout/search-box.tsx` als
   Client-Component (`"use client"`) mit `<form role="search">` und
   `Input type="search" name="q"`. Submit per `useRouter().push` zu
   `/search?q=<encodeURIComponent(value)>`. Defaultwert wird aus
   `useSearchParams().get("q")` gelesen und über `useEffect` an URL-
   Änderungen synchronisiert. Leerer/whitespace-Submit ist No-Op.
   Form hat zusätzlich `action="/search" method="get"` als
   Progressive-Enhancement-Fallback (funktioniert ohne JS).
   - **Platzierung Desktop:** in der Sidebar oberhalb der Nav-Items
     (`Sidebar`-Component).
   - **Platzierung Mobile:** als zweite Zeile im Sticky-Header der
     `AppShell`. Erste Zeile bleibt `Hamburger | Brand | UserMenu`,
     zweite Zeile volle Breite mit `<SearchBox />`.
   Verworfen wurde eine reine Modal-Suche (zusätzlicher Tap, schwerer
   auffindbar) und eine Submit-only-Variante per `<form action>` ohne
   Router (verliert Vorbelegung des Felds beim Pre-Fill, weil bei
   reload das Default-Value hart in den DOM gehen würde).

2. **Search-Page (B):** Neue Route
   `app/(protected)/search/page.tsx` als Server-Component. `searchParams`
   wird gemäß Next 15 als `Promise<{q?: string}>` ge-awaited.
   Empty-Query → Hinweiskarte „Suchbegriff eingeben". Sonst wird
   `/api/search?q=<q>&limit=50` mit Cookie-Forwarding (analog zur
   Dashboard-Page) ge-fetcht; Fehler werden als Karte „Suche
   fehlgeschlagen" gerendert (ohne Backend-Statuscode-Leak), Erfolg
   als Treffer-Liste. Die Hilfs-Function `loadSearch` ist file-lokal
   (kein neues Service-Modul, weil bisher nur diese eine Stelle so
   ein Pattern braucht).

3. **Snippet-Highlighting sicher (C):** Backend liefert via
   `ts_headline('german', …)` HTML-Schnipsel mit `<b>…</b>` um die
   Treffer. Das Frontend rendert `dangerouslySetInnerHTML` **nicht**.
   Stattdessen tokenisiert `renderSnippet` per Regex
   `/<b>(.*?)<\/b>/gi` in plain Strings und `<mark>`-Elemente; der
   Rest wird als React-Children-Strings gerendert (React escaped
   automatisch). Damit wird ein in Notes eingebettetes
   `<script>...</script>` als sichtbarer Plain-Text dargestellt, nicht
   ausgeführt. Test deckt diesen Edge-Case ab. Verworfen wurde eine
   Backend-Änderung (Snippet ohne HTML, mit Match-Positionen) — das
   wäre eine API-Vertragsänderung außerhalb M5a.2-Scope.

4. **Treffer-Link-Ziel (D):** Jeder Hit verlinkt auf
   `/events/{event_id}` — auch Hits vom Typ `application`, weil die
   Detailseite eines Events ohnehin alle zugehörigen Applications
   chronologisch zeigt (M5c). Die `/events/[id]`-Detail-Route ist
   in M5a.2 noch ein Stub; die Links werden in M5c lebendig und
   bleiben bis dahin als toter Link. Akzeptiert, weil ohne sinnvolles
   Link-Ziel die Suche nicht navigierbar wäre.

5. **Export-UI per `<a download>` (E):** `ExportButtons`-Component
   rendert vier Download-Links: drei für jede Rolle (`/api/export/me`,
   `/api/export/me/events.csv`, `/api/export/me/applications.csv`),
   plus `/api/admin/export/all` nur für `role === "admin"`. Jeder
   Link nutzt das native `<a href download="…">`-Pattern, gestylt
   über `buttonVariants(...)`. Same-Origin-Auth-Cookie wird vom
   Browser automatisch mitgeschickt; CSRF entfällt (GET-Requests).
   `download`-Attribut sorgt dafür, dass der Browser auch
   ohne `Content-Disposition`-Header (JSON-Endpoints) speichert
   statt inline zu rendern. Verworfen wurde fetch-Blob-Object-URL —
   bringt nur Loading-Spinner, der bei <5000 Events kaum sichtbar
   wäre; Komplexität ohne Mehrwert.

6. **Dashboard-Polish (F):** Drei kleinere Korrekturen am bestehenden
   Stub aus M4:
   - **Throwback-Bug fixen:** Backend liefert `ThrowbackEvent.id`
     (siehe `backend/app/schemas/search.py:21`); das Dashboard
     rendert seither `tb.event_id`, was undefined ist. Schema im
     Frontend an Backend angepasst, plus `note`-Feld ergänzt.
   - **Dashboard-Treffer verlinken:** Letzte-Events-Liste und
     Throwback-Liste linken auf `/events/{id}` (siehe D).
   - **CTA-Text klarer:** „Neues Event starten" disabled-Button
     trägt jetzt die Begründung „Live-Modus folgt mit M5a.3" statt
     vagem „M5a folgt".
   Diese Punkte sind Bestandteil von „Startseite mit großem
   ‚Neues Event starten'-Knopf, Liste der letzten Events und
   ‚On this day'-Sektion" aus dem M5a-Deliverable und keine
   Scope-Erweiterung.

7. **Tests (G):** 11 neue Vitest-Tests in `frontend/tests/`:
   - `search-box.test.tsx` (3): Submit navigiert mit URL-encoded
     Query, leerer/whitespace-Submit ist No-Op, Pre-Fill aus
     `?q=`-Param.
   - `search-results.test.tsx` (5): Empty-State, Treffer-Links zeigen
     auf `/events/{event_id}`, `<b>`-Tokens werden zu `<mark>`,
     `<script>` wird **nicht** ausgeführt sondern als Plain-Text
     dargestellt, leerer Snippet-String → leeres Array.
   - `export-buttons.test.tsx` (3): Drei Standard-Links mit
     `download`-Attribut für editor/viewer, Admin-Link nur für
     admin, kein Admin-Link für viewer.
   Frontend-Suite: 16 → 27 Tests, alles grün. `tsc --noEmit`,
   `next lint`, `prettier --check` clean. `next build` erstellt
   `/search` als ƒ (Server-rendered on demand).

8. **Browser-Smoke (H):** Lokales Stack (DB + Backend +
   Next-Dev-Server) bestätigt:
   - Login → Dashboard mit Mobile-Header + zweizeiliger Suchleiste.
   - `/search?q=clejuso` rendert „Keine Treffer für ‚clejuso'"
     gegen leere DB; Suchfeld ist mit dem Query vorbelegt.
   - `/profile` zeigt vier Export-Buttons (admin); per
     `fetch('/api/export/me')` aus Browser-Console → 200 mit den
     ADR-020 §J-Top-Level-Keys (`version`, `events`, `applications`,
     `event_participants`, `application_restraints`,
     `restraint_types`); CSV-Endpoint mit
     `Content-Disposition: attachment; filename=events.csv`;
     `/api/admin/export/all` mit 200.
   - Keine Console-Errors in der Session.

9. **Scope-Abgrenzung gegen M5a.3/.4 (I):**
   - **M5a.2 (dieser ADR):** Frontend-Startseite-Polish, globale
     Suche, Export-UI, plus Stub-Detailseite-Link-Ziele.
   - **M5a.3:** Live-Modus mit Wakelock, GPS, Timer, on-the-fly-
     Personenanlage, `LocationPickerMap`. Wird den disabled-CTA
     auf der Startseite aktivieren.
   - **M5a.4:** App-PIN-Sperre nach ADR-023, querliegend zu allen
     Frontend-Routen.
   Die Trennung minimiert PR-Größe und macht Reviews abnehmbar.

**Konsequenzen:**

- Frontend hat ab M5a.2 eine globale, RLS-konforme Suche und einen
  Export-Pfad für jeden User. Datensouveränitäts-Anforderung aus
  ADR-015 ist Frontend-seitig erfüllt.
- `/events/{id}`-Stub-Route wird in M5c lebendig — bis dahin
  produzieren Suche und Dashboard-Listen tote Links. Bewusst
  akzeptiert (siehe D).
- Snippet-Tokenisierung ist getestet gegen `<script>`-Injection.
  Falls Postgres in einer späteren Version andere Marker verwendet,
  brechen die Tests deterministisch — kein Stille.
- Keine neuen Abhängigkeiten, keine Backend-Änderungen, keine
  Migrations.

**Verworfene Alternativen:**

- A2 (Modal-Suche statt Inline-Searchbox): zusätzlicher Tap,
  schlechter auffindbar, kollidiert mit Mobile-First-Prinzip.
- B2 (Client-Side-fetch in Search-Page): kein SSR-Ergebnis,
  Suchparameter müssten zusätzlich im Browser-Hook geladen werden,
  Auth-Cookie-Forwarding nicht nötig — alles ohne Vorteil.
- C2 (`dangerouslySetInnerHTML` mit DOMPurify): zusätzlicher
  Library-Zugriff (freigabepflichtig); Tokenisierung reicht.
- E2 (fetch-Blob-Download mit Spinner): Komplexität ohne UX-Vorteil
  bei <5000-Events-Datenmenge.
- F2 (Throwback-Bug erst in M5c fixen): das Dashboard ist Bestandteil
  von M5a-Deliverables — Bug innerhalb der eigenen Modulgrenze
  fixen statt verschieben.

---

## ADR-027 — Implementierungsstrategie M5a.3 (Frontend Live-Modus + LocationPickerMap)

**Status:** Akzeptiert (2026-04-26)

**Kontext:** ADR-024 §J definierte M5a.3 als „Frontend Live-Modus +
LocationPickerMap, konsumiert die in M5a.1 gebauten Endpoints + den
Tile-Proxy". Bei der Umsetzung zeigte sich, dass die in
`fahrplan.md` §M5a deliverable verlangte „Liste bisheriger
Applications mit eigenen Timern" einen Endpoint braucht, der weder
in M3 noch in M5a.1 vorhanden ist. M5a.3 setzt deshalb (a) den
vollen Frontend-Live-Modus und (b) eine **rein additive**
Backend-Erweiterung um, die diese Lücke schließt.

**Entscheidungen:**

1. **Karten-Setup (A):** `maplibre-gl@^4` und `react-map-gl@^7` als
   Runtime-Deps (beide MIT, in `project-context.md` §3 als „empfohlen"
   gelistet, freigabefrei). Tile-URL wird via
   `NEXT_PUBLIC_TILE_URL`-ENV gesteuert (Default
   `/api/tiles/{z}/{x}/{y}`). Default-Map-Center via
   `NEXT_PUBLIC_DEFAULT_MAP_CENTER` (Default Berlin
   `52.52,13.405`). MapLibre-CSS wird als `@import` in
   `globals.css` geladen — damit braucht keine Komponente einen
   eigenen CSS-Import. Karten-Style ist eine **Raster-Style** mit
   einer Source `hcmap-raster`, die unseren Tile-Proxy als
   Tile-Quelle nutzt — keine Vector-Style, kein Glyph-Loading. Für
   den Picker reicht das; M6/M12 können auf Vector umstellen.

2. **LocationPickerMap (B):** Einzelne `"use client"`-Komponente mit
   einem verschiebbaren Marker (`anchor="bottom"`, `draggable`),
   Tap-to-Adjust und `cursor="crosshair"`. Props sind
   `{lat: number | null, lon: number | null, onChange}` — controlled
   Pattern. Marker erscheint nur, wenn beide Werte gesetzt sind;
   solange null, zeigt die Karte den Default-Center und reagiert
   ausschließlich auf den ersten Tap. Koordinaten werden auf
   6 Nachkommastellen gerundet (Lat/Lon-Schema-Genauigkeit). Kein
   Clustering, kein URL-Sync, kein Popup — bewusst minimaler
   M5a-Scope (siehe ADR-022). Auf der `/events/new`-Seite wird die
   Komponente per `next/dynamic({ ssr: false })` geladen, weil
   maplibre-gl `window` direkt nutzt und Server-Render bricht.

3. **Hooks (C):**
   - **`useWakeLock(enabled)`:** kapselt
     `navigator.wakeLock.request('screen')`, behandelt Re-Acquire
     bei `visibilitychange`, gibt Sentinel beim Unmount frei. Status:
     `idle | requesting | active | released | unsupported | error`.
     Liefert eine deutsche Hinweismeldung in `message`, wenn die
     API fehlt oder die Anfrage scheitert (Headless/Permission).
   - **`useGeolocation({auto, enableHighAccuracy, timeoutMs})`:**
     `navigator.geolocation.getCurrentPosition` mit Klassifizierung
     `success | denied | unavailable | unsupported`. Bei `auto`
     wird einmal beim Mount angefragt; `request()` macht Retry
     möglich.
   - **`useNow(intervalMs=1000)`:** schlanker Sekunden-Tick für
     Live-Timer.
   Beide Hooks sind in `frontend/src/hooks/` abgelegt — neuer
   Sammel-Ordner, der bislang nicht existierte.

4. **Backend-Lücke geschlossen (D):** Neuer Endpoint
   `GET /api/events/{event_id}/applications` (List, sortiert nach
   `sequence_no`). Implementierung in `app/routes/events.py`,
   Service-Methode `application_svc.list_applications_for_event`
   existierte bereits. RLS greift automatisch via Postgres-Policies.
   Drei neue HTTP-Tests in `test_applications_list_api.py`
   (Empty-Event, Sequenz-Order, 404). Backend-Suite 74 → 77 Tests
   grün. **Bewusste Scope-Erweiterung gegenüber ADR-024 §J** —
   API-Vertragsänderung, aber rein additiv und damit nach
   CLAUDE.md §4 freigabefrei. Verworfen wurde die Alternative,
   `EventDetail.applications` als Embedded-Liste zu liefern: das
   würde den Vertrag von `GET /api/events/{id}` ändern (zusätzliches
   Feld) und das Listing-Pagination-Modell für lange Anwendungs-
   ketten ungeschickt mit dem Detail-Endpoint koppeln.

5. **/events/new (E):** Server-Component-Wrapper, der
   `<EventCreateForm user={user} />` einbettet. `viewer`-Rolle
   wird mit `redirect("/?error=role")` abgewiesen (Editor und Admin
   dürfen Events anlegen). Die Form ist eine Client-Component mit:
   - GPS-Auto-Request beim Mount, Re-Try-Button.
   - LocationPickerMap (controlled `coords`-State).
   - RecipientPicker mit Suche + „+ Neue Person hinzufügen".
   - Notiz-Textarea.
   - Submit → `POST /api/events/start` → `router.push('/events/{id}')`.
   - Sticky-Bottom-Submit-Bar auf Mobile, normale Buttons auf
     Desktop.
   Auto-Participant-Hinweis (ADR-012) erscheint sobald ein
   Recipient gewählt wurde („Daniela wird automatisch als
   Beteiligte:r erfasst…").

6. **RecipientPicker + PersonQuickSheet (F, ADR-014):**
   `RecipientPicker` ist eine simple Combobox-Variante: Suchfeld,
   Liste (gefiltert nach `name`/`alias`, exklusive der eigenen
   `person_id`), `+ Neue Person hinzufügen`-Button am Ende.
   `PersonQuickSheet` ist ein Bottom-Sheet mit Pflichtfeld `name`
   und optional `alias`, sendet
   `POST /api/persons/quick`. Bei 403 wird eine deutsche Fehler-
   meldung gezeigt. Verworfen wurde eine vollwertige Combobox-
   Komponente (`@radix-ui/react-popover` + `cmdk`): zusätzliche
   Dependency, freigabepflichtig — die simple Variante reicht für
   <50 Personen.

7. **/events/[id] (G):** Server-Component mit Cookie-Forwarding
   lädt das Event-Detail. Bei 404 → `notFound()`, bei 401/Backend-
   Fehler → Hinweiskarte. Branching im Render:
   - `ended_at === null` → `<LiveEventView>` (Live-Modus mit Timer,
     Buttons, Application-Liste, Wakelock).
   - `ended_at !== null` → `<EndedEventView>` (Stub mit Notiz,
     Plus-Code, Hinweis „Detailansicht folgt mit M5c").

8. **LiveEventView (H):**
   - `useQuery` für Event-Detail (initialData = SSR-Snapshot,
     Refetch alle 30 s).
   - `useQuery` für Applications-Liste (Refetch alle 5 s, solange
     Event live).
   - `useNow(1000)` als Sekunden-Tick für lokale Timer.
   - Timer-Berechnung lokal (`now - Date.parse(started_at)`) mit
     `formatDuration`-Helper aus `lib/duration.ts` (`MM:SS` unter
     einer Stunde, `H:MM:SS` darüber).
   - Drei Action-Buttons:
     - „Neue Application" → öffnet `<ApplicationStartSheet>`.
     - „Aktuelle beenden" → `POST /api/applications/{id}/end`,
       wird disabled, wenn keine offene Application existiert.
     - „Event beenden" (`destructive`) → `POST /api/events/{id}/end`
       → `router.push('/')`.
   - `useWakeLock(isLive)` hält den Bildschirm an; Hinweis-Text bei
     Permission-Denied.
   - Auto-Recipient-Heuristik: Default-Recipient für die nächste
     Application wird aus dem `recipient_id` der letzten
     Application abgeleitet (häufigster Fall: gleiche Person über
     mehrere Applications). Der User kann jederzeit ändern.

9. **ApplicationStartSheet (I):** Bottom-Sheet mit
   `<RecipientPicker>` + Notiz-Textarea. Submit
   → `POST /api/events/{event_id}/applications/start`.
   Restraints/Positionen sind **bewusst nicht** im Modal — das
   spart einen großen Sekundärformular-Block, und das Backend
   erlaubt explizit `PATCH /api/applications/{id}` zum Nachpflegen
   (Fahrplan §M5a: „auch nachträglich pflegbar"). Nachpflege-UI
   kommt in M5c.

10. **Tests (J):** 10 neue Vitest-Tests:
    - `tests/duration.test.ts` (6): `formatDuration` für Sub-Hour-
      und Hour-Spans, Negativ-Clamp, Float-Rounding;
      `diffSeconds` für ISO-Strings, End-vor-Start-Clamp,
      Unparseable-Start.
    - `tests/use-wake-lock.test.tsx` (4): Sentinel-Acquire bei
      Enable, Unsupported-Path ohne API, Release-on-Unmount,
      Idle-while-Disabled.
    Frontend-Suite 27 → 37 Tests grün. **LocationPickerMap-Smoke-
    Test bewusst übersprungen** — maplibre-gl benötigt
    `HTMLCanvasElement.prototype.getContext('webgl')`, das jsdom
    nicht stabil simuliert. Der End-to-End-Browser-Smoke
    verifiziert die Komponente.

11. **Browser-Smoke (K):** Lokales Stack (Postgres + Backend +
    Next-Dev-Server) bestätigt:
    - Dashboard-CTA-Link führt nach `/events/new`.
    - `/events/new` rendert vollständig (Standort-Card mit
      Karte, Recipient-Card mit Picker, Notiz, Submit-Bar).
    - `POST /api/events/start` mit `{lat, lon, note}` → 201,
      Event-ID + `started_at` zurück.
    - `/events/{id}` rendert Live-View mit Timer „00:08",
      Plus-Code „9F4MGCC4+222", Wakelock-Hinweis-Pfad
      (Headless: „Wake Lock permission request denied").
    - `POST /events/{id}/applications/start` (sequence_no=1) +
      `POST /applications/{id}/end` + `POST /events/{id}/end`
      → 201/200/200.
    - Re-Visit `/events/{id}` rendert EndedEventView mit
      Notiz, M5c-Hinweis und Zurück-Link.
    - Wegen leerem `HCMAP_MAPTILER_API_KEY` liefert der
      Tile-Proxy 503 — die Karte rendert ohne Tiles, der
      Picker-Flow funktioniert weiter (User kann auf graue
      Fläche klicken). Erwartetes Verhalten laut ADR-022.

12. **Scope-Abgrenzung gegen M5a.4 (L):**
    - **M5a.3 (dieser ADR):** Frontend Live-Modus + Backend-
      List-Endpoint.
    - **M5a.4:** App-PIN-Sperre nach ADR-023, querliegend zu
      allen Frontend-Routen, kein Backend-Anteil.
    - **M5b:** RxDB-Offline-Resilienz für Live-Modus.
    - **M5c:** Detailseite `/events/{id}` mit chronologischer
      Application-Liste, Lücken-Anzeige, nachträgliche
      Bearbeitung. Stub-EndedEventView aus M5a.3 wird dort durch
      die volle Detailansicht ersetzt.

**Konsequenzen:**

- Live-Modus-Vertical-Slice ist produktiv: Anlegen → Live →
  Application-Erfassung → Beenden — alles ohne Verlassen der App.
- 50 → 51 Backend-Routen (`GET /api/events/{event_id}/applications`).
  Backend-Suite 74 → 77 Tests grün.
- 27 → 37 Frontend-Vitest-Tests grün.
- Zwei neue Frontend-Runtime-Dependencies (`maplibre-gl`,
  `react-map-gl`). Beide MIT, freigabefrei (ADR-022 + project-
  context.md §3).
- Zwei neue ENV-Variablen (`NEXT_PUBLIC_TILE_URL`,
  `NEXT_PUBLIC_DEFAULT_MAP_CENTER`).
- Wakelock-Permission im Headless verweigert — `useWakeLock`
  zeigt deshalb robust eine deutsche Hinweismeldung. Auf echten
  Mobile-Browsern wird der Lock akzeptiert.
- Ohne MapTiler-API-Key (`HCMAP_MAPTILER_API_KEY` leer) zeigt die
  Karte keine Tiles; der Picker-Flow funktioniert per
  Tap-to-Adjust trotzdem. Vor M11 muss der Key konfiguriert sein.

**Verworfene Alternativen:**

- D2 (`EventDetail.applications` als Embedded-Liste statt
  separatem Endpoint): koppelt Detail-Response an Anwendungs-
  Pagination, schlecht skalierbar.
- F2 (Combobox via `cmdk` + Popover): zusätzliche Dependencies,
  freigabepflichtig — der simple Filter-Picker reicht für
  <50 Personen.
- I2 (Restraints/Positions im Application-Start-Modal): macht
  das Modal groß, langsam und kollidiert mit dem 30-Sekunden-
  Akzeptanz­kriterium aus M5a. Nachpflege via PATCH ist
  ausdrücklich vorgesehen.
- J2 (LocationPickerMap-jsdom-Mock-Test): maplibre-gl-WebGL-
  Path ist in jsdom nicht stabil simulierbar; Browser-Smoke
  verifiziert die Komponente realistischer.

---

## ADR-028 — Implementierungsstrategie M5a.4 (App-PIN-Sperre)

**Status:** Akzeptiert (2026-04-26)

**Kontext:** ADR-023 hat das PIN-Verfahren festgelegt (PBKDF2-SHA-256
via Web Crypto API, 600.000 Iterationen, 16-Byte-Salt, IndexedDB-
Storage `hcmap-pin/pin_v1`, Inaktivitäts-Timer 60 s, Zwangs-Logout
nach 5 Fehlversuchen). M5a.4 setzt diese Spezifikation als
Frontend-Modul um — kein Backend-Anteil, keine neuen Dependencies,
querliegend zu allen `(protected)`-Routen.

**Entscheidungen:**

1. **Modul-Aufteilung (A):** Vier Dateien als saubere Schichten:
   - `lib/pin.ts` (Crypto): PBKDF2-Wrapper, base64-Helper,
     `constantTimeEqual`. Reine Funktionen, ohne State, ohne
     IndexedDB. Direkt mit Vitest testbar gegen Node-Crypto.
   - `lib/pin-storage.ts` (Persistence): IndexedDB-CRUD für den
     `hcmap-pin/pin/pin_v1`-Eintrag. Mockable per `vi.mock`.
   - `components/pin/pin-lock-provider.tsx` (State): React-Context
     mit `usePinLock`-Hook, Inaktivitäts-Timer, fail-counter,
     Force-Logout.
   - `components/pin/lock-overlay.tsx` (UI): Vollbild-PIN-Eingabe,
     wird vom Provider gerendert, sobald `status === "locked"`.
   Trennung erlaubt unabhängige Tests und macht den späteren
   Algorithmus-Wechsel auf Argon2id (ADR-023 §8) auf einen
   Crypto-File begrenzt.

2. **Crypto-Parameter (B):** Wie ADR-023 §2 festgelegt
   (`PIN_VERSION=1`, `PIN_ALGORITHM="PBKDF2-SHA256"`,
   `PIN_ITERATIONS=600_000`, `PIN_SALT_BYTES=16`,
   `PIN_HASH_BYTES=32`, `PIN_FAIL_LIMIT=5`). Konstanten als
   benannte Exporte, damit Tests sie referenzieren und nicht
   duplizieren. PIN-Länge wird auf 4–6 Ziffern validiert
   (`hashPin` wirft sonst). `constantTimeEqual` vergleicht die
   abgeleiteten Bytes XOR-akkumuliert — kein early-exit. Der
   Vergleich auf base64-Strings wäre ebenfalls möglich, aber die
   Byte-Variante ist robuster gegen Padding-Edge-Cases.

3. **IndexedDB-Wrapper (C):** `pin-storage.ts` nutzt das native
   `indexedDB`-API ohne Fremd-Library. Helper-Function `withStore`
   öffnet die DB, startet eine Transaktion, ruft die übergebene
   Operation auf und schließt die DB nach `oncomplete`.
   `loadPinRecord` gibt `null` zurück, wenn IDB nicht verfügbar
   ist (z. B. Server-Side oder in jsdom) — der Provider
   degradiert dann sauber zum `no-pin`-Zustand. Verworfen wurde
   `idb-keyval` als Convenience-Lib: zusätzliche Dependency,
   freigabepflichtig nach CLAUDE.md §4, sparte ~30 Zeilen Code.

4. **Provider-Pattern (D):** `PinLockProvider` ist eine
   Client-Component, die in `app/(protected)/layout.tsx` zwischen
   die Server-Layout-Logik und `<AppShell>` gewickelt wird. Damit
   ist `usePinLock()` in jedem geschützten Pfad verfügbar — auch
   in der Sidebar/UserMenu, falls dort später ein „Sperren"-Knopf
   eingebaut wird. Auf `(public)`-Routen (Login, Forgot-Password)
   ist der Provider absichtlich nicht aktiv: sperren ohne Session
   ergibt keinen Sinn, und das Login-Form muss frei zugänglich
   bleiben.

5. **State-Maschine (E):** Vier Status-Werte, klar voneinander
   abgegrenzt:
   - `loading` (Initial-Load aus IDB läuft).
   - `no-pin` (kein Record vorhanden — UI-Sperre deaktiviert).
   - `unlocked` (Record vorhanden, App ist nutzbar).
   - `locked` (Record vorhanden, LockOverlay rendert).
   Übergänge:
   - `loading → no-pin | unlocked` nach erstem IDB-Read.
   - `no-pin → unlocked` durch `setPin()`.
   - `unlocked → locked` durch `lock()` oder Inaktivitäts-Timer.
   - `locked → unlocked` durch `tryUnlock()` mit korrekter PIN.
   - `unlocked|locked → no-pin` durch `clearPin()`.
   - `locked → no-pin` durch Force-Logout (5× falsch).

6. **fail_count vor Vergleich inkrementiert (F):** ADR-023 §5
   verlangt, dass `fail_count` **vor** dem Hash-Vergleich erhöht
   und persistiert wird. Damit überlebt ein Crash mitten im
   Vergleich (z. B. Tab schließen) den Anti-Brute-Force-Schutz.
   Bei Erfolg wird `fail_count` auf 0 zurückgesetzt; bei
   Erreichen von `PIN_FAIL_LIMIT=5` triggert `forceLogout` den
   Zwangs-Logout.

7. **Force-Logout-Sequenz (G):** Reihenfolge:
   1. `clearPinRecord()` (best-effort) — entfernt den
      IndexedDB-Eintrag, damit der Angreifer nicht durch
      Reload weiter probieren kann.
   2. Provider-State auf `no-pin` setzen — UI-Sperre löst sich,
      bevor der Logout-Roundtrip zurückkehrt.
   3. `POST /api/auth/logout` (best-effort, Fehler ignoriert).
   4. `router.push("/login?error=pin")` + `router.refresh()` —
      die LoginForm zeigt einen deutschen Hinweis, dass die
      Sitzung wegen falscher PINs beendet wurde.

8. **Inaktivitäts-Timer (H):** Default 60.000 ms, konfigurierbar
   im Profil aus einem Dropdown mit fünf Stufen (30 s, 1 min,
   2 min, 5 min, 15 min). Der Wert wird in `localStorage` unter
   `hcmap.pinLock.inactivityMs` persistiert (geräte-, nicht
   user-spezifisch — der nächste User auf demselben Gerät erbt
   die Einstellung). Server-seitiges Persistieren wäre eine
   API-Vertragsänderung außerhalb M5a.4-Scope.
   Timer-Reset bei `pointerdown`, `keydown`, `visibilitychange`.
   `visibilitychange` mit `document.visibilityState === "visible"`
   resettet, mit `"hidden"` clearet — d. h. ein Tab-Wechsel
   pausiert den Timer (sonst würde ein langer Tab-Wechsel zur
   instant-Sperre nach Rückkehr führen). Werte werden auf das
   Intervall [15 s, 15 min] geclamped — kürzer macht die App
   unnutzbar, länger entspricht keinem realistischen
   Schutzziel mehr.

9. **LockOverlay-UI (I):** Fixed-position Vollbild-Modal mit
   `z-[100]`, Backdrop-Blur, dunklem Card und numerischem Input
   (`inputMode="numeric"`, `pattern="[0-9]*"`,
   `autoComplete="one-time-code"`). Auf Mobile öffnet sich
   automatisch das Zahlentastatur-Layout. Konstantzeit-Render
   auch im Wrong-PIN-Fall (kein „Versuch X von Y"-Spinner-Flackern).
   Verbleibende Versuche werden nach dem ersten Fehlschlag
   eingeblendet. Eingabe wird beim Submit auf reine Ziffern
   gefiltert (`replace(/[^0-9]/g, "")`).

10. **Profil-UI (J):** `PinSettings`-Component zeigt drei
    Modi:
    - **no-pin:** Form mit „neue PIN" + „PIN bestätigen", Submit
      → `setPin`. Bei Mismatch deutsche Toast-Meldung.
    - **configured:** drei Buttons („PIN ändern" → Edit-Mode,
      „Jetzt sperren" → `lock()`, „PIN entfernen" → `clearPin()`)
      plus Inaktivitäts-Dropdown.
    - **edit:** wie no-pin, plus „Abbrechen"-Button.
    react-hook-form wird hier bewusst nicht verwendet — die Form
    hat nur zwei Felder mit einfacher Validation, ein direkter
    `useState`-Pfad ist kürzer und vermeidet eine doppelte
    Validation-Schicht.

11. **Tests (K):** 15 neue Vitest-Tests:
    - `tests/pin.test.ts` (10): hashPin produziert dokumentierte
      Parameter; verifyPin korrekt für richtige/falsche PIN;
      zwei hashPin-Calls für gleiche PIN haben verschiedene
      Salts/Hashes; verifyPin lehnt unbekannten Algorithmus
      ab; hashPin lehnt zu kurze/lange PINs ab; base64-
      Round-Trip; constantTimeEqual für gleiche/verschiedene/
      unterschiedlich-lange Arrays.
    - `tests/pin-lock.test.tsx` (5): Initial-no-pin,
      `setPin`-Transition, korrekte PIN unlocks + reset
      fail_count, falsche PIN inkrementiert + bleibt locked,
      5× falsch triggert Force-Logout mit
      `/login?error=pin`-Push und IDB-Wipe.
    Frontend-Suite 37 → 52 Tests grün. PIN-Storage wird per
    `vi.mock` durch in-memory-Implementation ersetzt — IDB ist
    in jsdom nicht stabil verfügbar. LockOverlay-UI-Tests
    werden im Browser-Smoke verifiziert.

12. **Browser-Smoke (L):** Lokales Stack (Postgres + Backend +
    Next-Dev-Server) bestätigt:
    - `/profile` rendert App-PIN-Card mit Set-Form, wenn keine
      PIN existiert.
    - PIN-Record direkt in IDB schreiben (PBKDF2 mit korrekten
      Parametern) → Reload → Provider lädt Record → Card zeigt
      „PIN ist aktiv" mit drei Action-Buttons + Timeout-
      Dropdown („1 Minute (Default)").
    - „Jetzt sperren" → LockOverlay rendert über allem als
      Dialog `aria-label="App ist gesperrt"`.
    - Korrekte PIN „1234" → Dialog verschwindet, App entsperrt.
    - Falsche PIN „9999" → Dialog bleibt, Fehler-Hinweis
      „PIN ist falsch. Verbleibende Versuche: 4.", IDB
      `fail_count: 1`.
    Force-Logout-Pfad ist im Vitest-Test abgedeckt — kein
    weiterer Browser-Smoke nötig.

13. **Dashboard-Bug aus M4 mitgefixt (M):** Beim Browser-Smoke
    crashte `/` mit `event.lat.toFixed is not a function`. Das
    Backend serialisiert Decimals als String (Pydantic v2
    Default), das Dashboard rief aber `.toFixed()` direkt auf —
    ein versteckter Bug aus M4, der bei leerer Liste in M5a.2
    nicht auffiel und in M5a.3 nur live war, weil das Smoke-
    Event auf `/dashboard` nicht aufgerufen wurde. Fix mit
    `coerceNumber()`-Helper aus M5a.3 (`lib/types.ts`). Das ist
    keine Scope-Erweiterung, sondern ein offensichtlicher Bug
    in einer Komponente, deren Hinweis-Text ich in M5a.4
    ohnehin überschritten hätte.

14. **Scope-Abgrenzung (N):**
    - **M5a.4 (dieser ADR):** App-PIN-Sperre, Frontend-only.
    - **M5b:** Offline-Sync via RxDB. Wird beim Force-Logout
      ebenfalls IDB-leeren müssen — der `forceLogout`-Pfad
      bekommt dann einen weiteren `await rxdb.removeDatabase()`-
      Aufruf. M5a.4 nimmt das nicht vorweg, weil RxDB noch nicht
      eingerichtet ist.
    - **M11:** Vor Go-Live wird die PIN-Doku Teil der
      Onboarding-Anleitung („PIN setzen empfohlen, schützt
      vor Schulterblick").

**Konsequenzen:**

- App-PIN-Schicht ist produktiv und über alle geschützten Routen
  aktiv. Schutzziel aus ADR-023 (Schulterblick + kurze fremde
  Übernahme) ist erreicht.
- Keine neuen Backend-Routen, keine neuen Dependencies, keine
  Migrations.
- Frontend-Suite 37 → 52 Tests grün; tsc/eslint/prettier/build
  alle clean.
- Dashboard-Bug aus M4 ist im Vorbeigehen behoben — Listen mit
  echten Lat/Lon-Werten rendern wieder.
- `forceLogout` setzt UI-State **vor** dem Server-Logout-Roundtrip
  zurück. Auch bei Backend-Ausfall ist die UI nach dem 5. Versuch
  unverzüglich entsperrt (auf `/login` redirectet) — der
  Server-Cookie wird durch die Middleware oder beim nächsten
  authenticated Request invalidiert.
- LocalStorage-basierte Inaktivitäts-Konfiguration ist
  geräte-, nicht user-gebunden. Bei mehreren Usern auf einem
  Gerät teilen sie die Einstellung. Akzeptiert für Pfad A
  (Hobby-Setup); für Pfad B müsste das in den User-Profil-
  Endpoint gehen.

**Verworfene Alternativen:**

- C2 (`idb-keyval` als Convenience-Library): zusätzliche
  Dependency, freigabepflichtig — der native IDB-Wrapper sind
  ~70 Zeilen, die ich verstehe und teste.
- D2 (Provider in `RootLayout` statt `(protected)/layout`):
  würde den Login-Pfad ebenfalls einbinden, der aber kein PIN
  haben darf.
- E2 (zwei States `lockState`/`hasPin` statt Single-Status):
  unnötig, weil ein gültiger Status `locked` ohne `hasPin`
  semantisch unmöglich ist und durch das Type-System schöner
  ausgeschlossen wird.
- I2 (Web-Worker für PBKDF2): laut ADR-023 §7 nicht
  erforderlich, weil die UI während des Hash-Vergleichs ohnehin
  unbenutzbar ist (LockOverlay).
- J2 (react-hook-form für PIN-Setting): zwei Felder, eine
  Validation-Regel — overengineering für den Use Case.

---

# Teil B — Entscheidungsregeln

<!-- Wiederkehrende Muster, die aus ADRs hervorgehen.
     Jede Regel verweist auf den ADR, aus dem sie entstanden ist. Damit kann
     Claude in ähnlichen Situationen konsistent und ohne Rückfrage handeln.

     Format pro Regel:
     ### Regel-NNN: [Kurztitel]
     - **Herkunft:** ADR-[Nr.]
     - **Gilt für:** [wann anzuwenden]
     - **Regel:** [was ist zu tun]
     - **Ausnahmen:** [wann gilt sie nicht; leer wenn keine]
     - **Gegenbeispiel:** [was wäre falsch]
-->

## Regeln

### Regel-001: Personenbezogene Daten niemals in Logs

- **Herkunft:** ADR-001 (Hoster-Vertrauen) und Constraint-Abschnitt in `project-context.md`.
- **Gilt für:** Alle Logging-Aufrufe in Backend und Frontend, einschließlich Error-Logs, Debug-Ausgaben, Request-Logs.
- **Regel:** Personennamen, Notizfelder, Lat/Lon, Mailadressen, Plus Codes mit Personenbezug werden vor Log-Ausgabe entweder weggelassen oder durch Platzhalter ersetzt (`<redacted>`). Logger-Wrapper in `app/logging.py` mit Redaction-Liste verwenden.
- **Ausnahmen:** Keine.
- **Gegenbeispiel:** `logger.info(f"Event {event.id} created by {user.email} at {event.lat}/{event.lon}")` — verletzt Regel mehrfach. Korrekt: `logger.info("event_created", event_id=event.id, user_id=user.id)`.

### Regel-002: Application-Default-Performer = eingeloggter User

- **Herkunft:** ADR-010 (User ↔ Person Pflicht-Verknüpfung).
- **Gilt für:** Application-Erfassungsformular im Frontend, sowohl Live-Modus als auch nachträglich.
- **Regel:** `performer_id` wird beim Anlegen einer neuen Application per Default mit der `person_id` des eingeloggten Users vorbelegt. Das Feld bleibt überschreibbar.
- **Ausnahmen:** Wenn der Admin nachträglich für eine Gruppe ein Event erfasst, in dem er nicht beteiligt war — Performer wird dann manuell gewählt.
- **Gegenbeispiel:** Performer-Feld leer lassen und User explizit klicken lassen — bricht den Komfort-Default und macht Live-Modus unnötig langsam.

### Regel-003: Auto-Participant bei Performer/Recipient-Zuordnung

- **Herkunft:** ADR-012 (Auto-Participant).
- **Gilt für:** Backend-Service, der Applications erstellt oder aktualisiert.
- **Regel:** Wird `performer_id` oder `recipient_id` in einer Application gesetzt, wird die jeweilige Person automatisch als `EventParticipant` zum übergeordneten Event hinzugefügt — sofern noch nicht vorhanden. UI-Hinweis: „[Name] wird als Participant des Events erfasst und kann es später einsehen."
- **Ausnahmen:** Keine. Manuelles Entfernen aus EventParticipant nur möglich, wenn Person in keiner Application mehr referenziert wird.
- **Gegenbeispiel:** Application mit Recipient X anlegen, ohne X automatisch als Participant zu erfassen → X sieht das Event via RLS nicht, obwohl er Recipient war. Bug, kein Feature.

### Regel-004: On-the-fly-Personen sind nicht automatisch verknüpfungsbereit

- **Herkunft:** ADR-014 (On-the-fly-Personenanlage).
- **Gilt für:** Person-Anlage über `POST /api/persons/quick` (Live-Modus).
- **Regel:** Person wird mit `origin = 'on_the_fly'` und `linkable = false` angelegt. `linkable = true` setzt ausschließlich der Admin manuell über die Admin-UI, wenn die Person für eine zukünftige User-Verknüpfung freigegeben werden soll.
- **Ausnahmen:** Keine.
- **Gegenbeispiel:** `linkable = true` als Default → Admin-User-Anlage-Dropdown wäre nach kurzer Zeit mit Dutzenden Personen verschmutzt.

### Regel-005: Datums- und Zeit-Felder sind immer `timestamptz`

- **Herkunft:** Konvention im Datenmodell (`architecture.md`).
- **Gilt für:** Alle SQLAlchemy-Modelle, Pydantic-Schemas, API-Verträge.
- **Regel:** Datums- und Zeit-Felder verwenden ausschließlich `timestamptz` (Postgres) bzw. `datetime` mit Timezone (Python) bzw. ISO-8601-Strings mit Timezone (JSON). Keine naiven Datetime-Werte.
- **Ausnahmen:** Keine.
- **Gegenbeispiel:** `Event.started_at = datetime.now()` ohne Timezone → führt zu Zeitzonen-Bugs.

### Regel-006: RLS-Policies haben Pflicht-Tests

- **Herkunft:** Quality-Goals in `project-context.md` und ADR-005 (RLS-Strategie).
- **Gilt für:** Jede neue oder geänderte RLS-Policy auf Tabellen mit Nutzerdaten.
- **Regel:** Pro Policy mindestens ein positiver Test (Rolle X sieht Datensatz Y) und ein negativer Test (Rolle X sieht Datensatz Z nicht). Tests in `tests/test_rls.py`. RLS-Coverage 100 %, sonst kein Merge.
- **Ausnahmen:** Keine.
- **Gegenbeispiel:** Policy hinzufügen ohne Test → Bug bleibt unentdeckt, mögliches Daten-Leck.

---

## ADR-029 — Conflict-Resolution-Strategie M5b (Live-First mit Reconciliation)

**Status:** Accepted
**Datum:** 2026-04-26

### Kontext
ADR-017 hat RxDB als Sync-Schicht festgelegt und Conflict-Resolution mit zwei Stichworten umrissen („Server-Zeit als Wahrheit für Zeitstempel, Last-Write-Wins für Notiz-Felder"). M5b verlangt eine Pro-Feld-Festlegung für `event` und `application`, weil sich daraus die Validierungs-Logik der `POST /api/sync/push`-Route ergibt.

### Entscheidung
Pro-Feld-Strategie nach **Variante B (Live-First mit Reconciliation)** aus dem M5b.1-Vorschlagspaket.

**Strategie-Klassen:**
- **server-authoritative:** Server ignoriert Client-Wert, schreibt eigenen.
- **immutable-after-create:** Nach erstem Push fix; Server lehnt Änderungen mit Konflikt ab.
- **first-write-wins (FWW):** Erster Nicht-NULL-Push gewinnt; Folge-Push mit anderem Wert ist Konflikt.
- **last-write-wins (LWW):** Bei Konflikt entscheidet höheres `updated_at`; bei Gleichstand Server. Server überschreibt `updated_at` immer mit eigener Uhr beim Schreiben.

**Pro-Feld-Tabelle `event`:**

| Feld | Strategie |
|---|---|
| `id` | immutable-after-create |
| `started_at` | immutable-after-create |
| `lat`, `lon` | immutable-after-create |
| `geom` | server-authoritative (generiert aus `lat`/`lon`) |
| `legacy_external_ref` | LWW (optionale Selbstreferenz, vom User editierbar; vormals `w3w_legacy`, vgl. ADR-050) |
| `ended_at` | first-write-wins |
| `reveal_participants` | LWW |
| `note` | LWW |
| `created_by`, `created_at` | immutable-after-create |
| `updated_at` | server-authoritative |
| `is_deleted`, `deleted_at` | server-authoritative auf `false→true`-Übergang per dedizierter Operation; `true→false` nur durch Admin-Route, **nicht** über Sync. |

**Pro-Feld-Tabelle `application`:**

| Feld | Strategie |
|---|---|
| `id` | immutable-after-create |
| `event_id` | immutable-after-create |
| `sequence_no` | immutable-after-create + UNIQUE-Konflikt-Handling: Bei `UNIQUE(event_id, sequence_no)`-Verletzung im `push` antwortet der Server mit Konflikt + nächster freier `sequence_no`; Client schreibt lokal um. |
| `started_at` | immutable-after-create |
| `ended_at` | first-write-wins |
| `performer_id`, `recipient_id` | LWW |
| `arm_position_id`, `hand_position_id`, `hand_orientation_id` | LWW |
| `note` | LWW |
| `created_by`, `created_at` | immutable-after-create |
| `updated_at` | server-authoritative |
| `is_deleted`, `deleted_at` | siehe `event` |

### Konsequenzen für die Sync-Endpoint-Implementierung (M5b.2)
- `push` erwartet pro Dokument `{assumedMasterState, newDocumentState}`. Vergleich gegen aktuellen DB-Zustand entscheidet pro Feld nach obiger Tabelle.
- Bei jedem Konflikt antwortet der Server mit dem aktuellen Server-Zustand des betroffenen Dokuments; der Client merged lokal und re-pushed beim nächsten Zyklus.
- Server überschreibt `updated_at` und `created_at` und `id` immer mit eigenem Wert; `geom` wird generiert.
- Live-Lock-Felder (alle als `immutable-after-create` markierten) werden nach erstem erfolgreichen Push als unveränderbar betrachtet — gilt insbesondere für `lat`/`lon`/`started_at`. Nachträgliche Korrekturen sind nur über die Admin-Route in M5c möglich.
- Seq-No-Konflikt ist im Solo-Live-Modus extrem selten (pro Client zur Zeit eine Application). Er kann theoretisch eintreten, wenn ein Editor parallel auf zwei Geräten Applications erfasst — sauberes Re-Numbering durch den Server löst das deterministisch.

### Begründung
- Passt zum Live-Modus-Vertrag aus ADR-011: Event-Start (`started_at`, `lat`, `lon`) ist ein einmaliger Akt, sollte nicht versehentlich über LWW überschrieben werden.
- LWW dort, wo Bearbeitung legitim ist (Notizen, Beteiligte, Positionen). Verlust durch parallele Edits ist tolerabel und durch Konflikt-Antwort sichtbar.
- Server bleibt Single Source of Truth für alle Zeitstempel (`updated_at`, `created_at`, `geom`).

### Verworfene Alternativen
- **Variante A (strikt):** Hätte den Live-Modus-Schreibpfad „Client schreibt zuerst" gebrochen — jeder Geo-Punkt müsste vom Server bestätigt werden, bevor er stabil ist.
- **Variante C (vollständig LWW):** Risiko versehentlich überschriebener Geo-Daten und sequence_no-Kollisionen ohne Schutz.

---

## ADR-030 — Soft-Delete und Cursor-Felder auf event/application (M5b)

**Status:** Accepted
**Datum:** 2026-04-26

### Kontext
Das RxDB-Replication-Protokoll braucht zwei Bausteine, die das aktuelle Schema (Initial-Migration `20260425_1700_initial`) nicht in der nötigen Form bietet:

1. **Monoton wachsender Cursor pro Dokument** für `GET /api/sync/pull`. `event.updated_at` und `application.updated_at` sind aktuell `NULL`-fähig — der bestehende Trigger `set_updated_at` setzt zwar bei jedem `UPDATE` `clock_timestamp()`, aber bei `INSERT` bleibt der Wert `NULL`. Damit ist kein verlässlicher Cursor möglich.
2. **Soft-Delete-Tombstones**, damit gelöschte Dokumente repliziert werden können. Aktuell gibt es weder `is_deleted` noch `deleted_at` auf `event`/`application` (nur auf `user`/`person`).

### Entscheidung

**Datenmodell-Änderungen** auf `event` und `application` (rückwärtskompatibel-additiv):

1. **`updated_at`:** Default auf `clock_timestamp()` setzen, Backfill `UPDATE … SET updated_at = COALESCE(updated_at, created_at)`, dann `SET NOT NULL`.
2. **Soft-Delete:** Neue Spalten `is_deleted boolean NOT NULL DEFAULT false` und `deleted_at timestamptz NULL`.
3. **Cursor-Index:** Composite-Index `(updated_at, id)` für Pull-Cursor-Performance.

**Cascade-Regel** (Variante A des M5b.1-Vorschlags):
- Trigger `cascade_event_soft_delete` (BEFORE UPDATE OF is_deleted ON event): bei Übergang `is_deleted false→true` werden alle nicht-gelöschten Child-Applications dieses Events ebenfalls auf `is_deleted = true`, `deleted_at = NEW.deleted_at` gesetzt. Restore (`true→false`) propagiert **nicht** automatisch — manuelles Restore pro Application bleibt bewusst Admin-Aufgabe.

**Cursor-Tupel für `pull`:** `(updated_at ASC, id ASC)`. `id` als deterministischer Tiebreaker bei mehreren Updates in derselben Mikrosekunde.

**RLS-Policies:** In M5b.1 **nicht angefasst**. Die bestehenden Policies aus `20260425_1730_strict_rls` filtern `is_deleted` nicht, aber solange keine Soft-Deletes existieren, ist das Verhalten identisch zum Ist-Zustand. Soft-Delete-bewusste Filterung der CRUD-Routen wird zusammen mit den Sync-Endpoints in M5b.2 nachgezogen (Service-Layer-Filter `WHERE is_deleted = false` für Member-Sicht; Sync-Endpoints liefern Tombstones bewusst auch an Member, damit RxDB Lokal-Stand abgleichen kann).

### Konsequenzen
- Bestehende Daten bleiben sichtbar und unverändert (Backfill setzt `updated_at = created_at` für Altdatensätze).
- Die initial-Migration legt `set_updated_at` mit `clock_timestamp()` an (deterministisch über Multi-Statement-Transaktionen). Das wird in M5b.1 nicht angefasst.
- Cursor-Pagination performant via `idx_event_cursor` und `idx_application_cursor`.
- Cascade-Trigger sorgt für vollständige Tombstone-Replikation: RxDB sieht jedes gelöschte Application-Dokument als eigenständigen `_deleted: true`-Eintrag.
- Restore eines Events erfordert separaten Admin-Workflow (M5c-Scope), der pro Application explizit entscheidet — bewusste Vorsicht gegen versehentliches Massen-Restore.

### Verworfene Alternativen
- **Cascade via JOIN-Filter (Variante B des Vorschlags):** Hätte RxDB-Replikation gebrochen, weil Applications „verschwinden" ohne dokumenteneigenen Tombstone — Datenleichen im Frontend wären die Folge.
- **Hard-Delete:** Inkompatibel mit RxDB-Replication-Protokoll, das Tombstones erwartet.
- **`updated_at` weiter `NULL`-fähig:** Cursor-Pagination wäre brüchig, NULL-Sortier-Reihenfolge unterscheidet sich zwischen DB-Engines.

### Migration
Datei: `backend/migrations/versions/20260426_1800_m5b1_sync_columns.py`. Down-Migration entfernt Spalten, Indices und Cascade-Trigger; lässt `updated_at` auf `NOT NULL` (kein Datenverlust durch Downgrade).

---

## ADR-031 — RxDB-Schema-Source-of-Truth: hand gepflegt + Drift-Test

**Status:** Accepted
**Datum:** 2026-04-26

### Kontext
Akzeptanzkriterium aus M5b ([fahrplan.md M5b](../docs/fahrplan.md)) verlangt: „RxDB-Schemas und Backend-Modell bleiben synchron." Drift = Live-Modus-Bruch im Funkloch (Client pusht, Backend lehnt mit 422 ab — User merkt es nach Wiederverbindung, Daten gehen ggf. verloren).

### Entscheidung
RxDB-Schemas im Frontend und Pydantic-Schemas im Backend werden **manuell parallel gepflegt**. Drift wird durch einen automatisierten Test in der Backend-Suite verhindert.

**Konkret:**
- **Frontend:** `frontend/src/lib/rxdb/schemas/event.schema.json` und `application.schema.json` (RxDB-natives JSON-Schema-Format). `frontend/src/lib/rxdb/schemas.ts` importiert die JSON-Files und übergibt sie an die RxCollection.
- **Backend:** Pydantic-Schemas der Sync-Endpoints in `backend/app/sync/schema.py`.
- **Drift-Test:** `backend/tests/test_rxdb_schema_drift.py` lädt das Frontend-JSON-Schema (relativer Pfad), extrahiert `properties` + `required` und vergleicht Felder + JSON-Schema-Typen mit den Pydantic-Schemas. Schlägt fehl, sobald ein Feld auf einer Seite fehlt oder einen abweichenden Typ hat. Test gehört zur Standard-CI-Suite.

### Begründung
- **Pragmatisch und M5b-Scope-passend:** Setup-Aufwand ist ein einziger Test; kein Codegen-Tool, kein Build-Step.
- **Test schützt vor stiller Drift:** PR mit Schema-Änderung in nur einer Hälfte schlägt fehl.
- **Migration auf vollautomatischen Codegen bleibt offen** (etwa wenn weitere Entitäten offline-fähig werden).

### Konsequenzen
- Jede Änderung am `event`/`application`-Modell muss synchron in Backend-Pydantic + Frontend-JSON-Schema landen, sonst CI-Fehler.
- Test muss Edge-Cases abdecken: optionale Felder (`required`-Liste), Enums, geschachtelte Objekte. Wird im Test mit konkreten Assertions belegt.
- Bei späterem Schema-Wachstum kann auf Codegen migriert werden, der Drift-Test bleibt parallel als Sicherheitsnetz.

### Verworfene Alternativen
- **OpenAPI-Codegen + `openapi-typescript`:** Setup-Komplexität (Build-Step, generierte Files in Git, CI-Drift-Check) für M5b nicht gerechtfertigt. Bleibt offene Option für später.
- **Geteiltes JSON-Schema in `shared/`:** Würde Pydantic-Schemas auf JSON-Schema-First umbauen — größerer Refactor, bricht Type-First-Stil aus ADR-005.

---

## ADR-032 — IndexedDB-Storage-Encryption: keine Encryption in Pfad A

**Status:** Accepted
**Datum:** 2026-04-26

### Kontext
RxDB persistiert Events und Applications im Browser-IndexedDB. Sensitiv sind insbesondere Plus-Code (Geo-Lokation), Notizen und Personen-IDs. `project-context.md` §6/Sicherheit nennt App-PIN clientseitig (M5a.4), aber keine Storage-Encryption. Vertrauensmodell ([project-context.md:238](../docs/project-context.md)) deckt Hoster und Admin als vertraut, sagt aber nichts zum Endgeräte-Storage.

**Bedrohungsmodell:**
- Schulterblick / kurzer fremder Zugriff bei entsperrtem Gerät → durch App-PIN abgedeckt (M5a.4).
- Devtools/Forensik bei beschlagnahmtem entsperrtem Gerät → Klartext-IndexedDB lesbar.
- Forensik bei beschlagnahmtem gesperrtem Gerät → durch Geräte-FDE (FileVault / BitLocker / Android FBE / iOS Data Protection) abgedeckt, sofern aktiviert.

### Entscheidung
**Keine Storage-Encryption** in Pfad A (Variante C des M5b.1-Vorschlags).

### Begründung
- **Geräteverschlüsselung ist Standard und User-Verantwortung** — analog zu localStorage in jeder Web-App. Pfad-A-Mitglieder werden im Einwilligungstext explizit auf diese Verantwortung hingewiesen.
- **Bundle-Größen-Constraint:** ADR-017 nennt 150–200 KB für RxDB+Dexie+RxJS. Encryption-Plugin würde ~20–40 KB draufsetzen. Mobile-First-Bundle ist bereits grenzwertig.
- **Performance-Constraint:** `project-context.md` §6 fordert Live-Modus-Aktionen unter 200 ms. RxDB-Encryption kostet 10–30 ms pro Schreib-/Lesevorgang — komfortabler Headroom geht verloren.
- **Praktischer Mehrwert in Pfad A gering:**
  - **Login-Token-Schlüssel (Variante A):** Schützt nur bis Logout. Realistisch loggen sich Mitglieder selten aus — Mehrwert minimal.
  - **PIN-abgeleiteter Schlüssel (Variante B):** 4–6-stelliger PIN bietet schwachen lokalen Brute-Force-Schutz. Bei 5-Fehlversuche-Reset (M5a.4) muss IndexedDB komplett verworfen werden — Resync der Live-Modus-Daten als Folge.
- **App-PIN deckt das primäre Bedrohungsmodell** („Schulterblick / kurzer fremder Zugriff") bereits ab.

### Konsequenzen
- **Einwilligungstext (Pre-M11 Go-Live, [project-context.md:247](../docs/project-context.md))** muss explizit ergänzt werden:
  - Hinweis: „IndexedDB-Inhalte des eigenen Endgeräts liegen unverschlüsselt vor; Geräteverschlüsselung wird vom User selbst sichergestellt."
- **Bei Wechsel zu Pfad B neu zu bewerten** (DSFA-Kontext, größere Nutzerzahl, höheres Risiko von beschlagnahmten Geräten ohne Geräte-FDE).
- **Phase-2-Foto-Anhänge (M15):** Bilder landen vermutlich nicht in IndexedDB, sondern als Server-URL-Referenzen. Sollte beim M15-Design noch einmal geprüft werden.

### Verworfene Alternativen
- **Variante A (Login-Token-Schlüssel):** Mehrwert nur bis zum nächsten Logout, reale Logout-Disziplin ist gering.
- **Variante B (PIN-abgeleiteter Schlüssel):** PIN ist zu kurz für robusten lokalen Schutz; PIN-Reset-Flow wird komplex.

---

## ADR-033 — Implementierungsstrategie M5b.2 (Sync-Endpoints + Owner-SELECT-Policy)

**Status:** Accepted
**Datum:** 2026-04-26

### Kontext
M5b.1 hat das Datenmodell für die RxDB-Replication vorbereitet (ADR-029…ADR-032). M5b.2 setzt die Backend-Endpoints `GET /api/sync/{collection}/pull` und `POST /api/sync/{collection}/push` für `event` und `application` um. Während der Implementierung sind sechs Detail-Entscheidungen getroffen worden, die in dieser ADR gebündelt dokumentiert sind.

### Entscheidungen

**A. Endpoint-Layout: pro Collection ein eigener Endpoint.**
Architecture.md hatte „/api/sync/pull" und „/api/sync/push" generisch beschrieben. RxDB-Replication arbeitet pro Collection — daher gibt es vier Endpoints:
- `GET /api/sync/events/pull`, `POST /api/sync/events/push`
- `GET /api/sync/applications/pull`, `POST /api/sync/applications/push`

**B. Cursor-Format: Query-Parameter `updated_at` und `id`.**
Pull-Cursor wird als zwei separate Query-Params übergeben (`updated_at` als ISO-Timestamp, `id` als UUID, beide optional). Composite-Vergleich `(updated_at, id) > (cp.updated_at, cp.id)` ist im Service-Layer als `OR(updated_at > x, AND(updated_at == x, id > y))` ausgeschrieben (statt SQLAlchemy `tuple_()`), weil Letzteres mit mypy-Strict + datetime/UUID-Argumenten nicht typeable war. Funktional identisch.

**C. Sync-Endpoints respektieren bestehende RLS, Tombstones inklusive.**
Kein BYPASSRLS-User. Tombstones (`is_deleted = true`) bleiben für jeden User sichtbar, der den Datensatz vorher schon gesehen hat (via `event_participant`-Verknüpfung — die Verknüpfung bleibt beim Soft-Delete bestehen). Soft-gelöschte Events des Editors sind zusätzlich über die neue `event_editor_select_own`-Policy sichtbar (siehe E).

**D. Soft-Delete-Filter im Service-Layer der bestehenden Routes.**
ADR-030 hatte angekündigt, die Soft-Delete-bewusste Filterung in M5b.2 nachzuziehen. Konkret umgesetzt:
- `app/services/events.py`: `list_events` und `get_event` filtern `is_deleted = false`.
- `app/services/applications.py`: `get_application` und `list_applications_for_event` analog.
- `app/services/search.py`: Volltextsuche und Throwbacks filtern beide Collections.
- `app/services/exports.py`: JSON- und CSV-Export filtern.
- **RLS-Policies bleiben unverändert** — der Filter ist zusätzlicher Service-Layer-Filter; Defense-in-Depth-Erweiterung der RLS würde Sync-Pulls brechen, weil die Endpoints Tombstones explizit zurückliefern müssen.

**E. Owner-SELECT-Policy für Editor (freigegeben separate Anfrage 2026-04-26).**
Während der Test-Implementierung trat ein latent-Bug aus M2 zutage: `INSERT … RETURNING` triggert die SELECT-Policy auf der frisch eingefügten Zeile, und die `event_member_select`-Policy verlangt `event_participant`-Mitgliedschaft, die der Auto-Participant-Insert erst nach dem Event-Insert anlegt. Im bisherigen Code-Stand war kein HTTP-Test als Editor-INSERT auf `event` betroffen — daher unentdeckt. Sync-Endpoints sind die ersten Editor-Inserts via HTTP.

Lösung in Migration `20260426_1830_m5b2_owner_select`: zwei additive Permissive-SELECT-Policies, die einem Editor erlauben, seine eigenen Events/Applications zu sehen (gleiches Predicate wie die bestehenden `_editor_update`/`_editor_delete`-Policies):
```sql
CREATE POLICY event_editor_select_own ON event
    FOR SELECT TO app_user
    USING (
        current_setting('app.current_role', true) = 'editor'
        AND created_by = current_setting('app.current_user_id', true)::uuid
    );
-- analog application_editor_select_own
```
Verworfen: (B) Auto-Participant via DB-Trigger — Trigger müsste sich mit Application-Auto-Participant koordinieren, deutlich invasiver. (C) ORM-Insert ohne RETURNING — Service-Layer-Refactor erforderlich, plus zwei Roundtrips pro Insert; Bug bliebe latent für andere Stellen.

**F. asyncpg `statement_cache_size = 0`.**
Während der Diagnose des E-Befunds wurde sicherheitshalber der asyncpg-Statement-Cache deaktiviert (siehe `app/db.py`-Docstring). Per-Connection-Plan-Cache von asyncpg kann mit Per-Request-`SET LOCAL`-GUCs interagieren — Hintergrund: asyncpg #200, SQLAlchemy-Doku. Cost ist niedrig (Mikrosekunden pro Query) und der Workaround ist dokumentiert. Bleibt als Schutzschicht erhalten, auch nachdem das eigentliche Problem über (E) gelöst wurde.

**G. Conflict-Resolution-Implementierung.**
Pro Push-Item:
1. `session.get(Model, id)` — RLS-gefiltert.
2. Wenn Server-Doc existiert, Client-`assumedMasterState` ist `None` → Konflikt: server master returned.
3. Wenn Server-Doc nicht existiert, Client-`assumedMasterState` ist gesetzt → synthetischer Tombstone returned.
4. Wenn Server-Doc nicht existiert, Client-`assumedMasterState` ist `None` → Insert-Pfad. Insert in `begin_nested()`-Savepoint; bei `IntegrityError`/`ProgrammingError` (RLS, FK, UNIQUE): synthetischer Tombstone.
5. Wenn Server-Doc existiert, Client-`assumedMasterState` gesetzt → Update-Pfad mit Pro-Feld-Validation aus ADR-029. Konflikt: server master returned. OK: ORM-Apply + Flush.

`(IntegrityError, ProgrammingError)` als Catch-Tupel — ProgrammingError fängt asyncpg's `InsufficientPrivilegeError` (RLS-Verletzung), IntegrityError fängt FK/UNIQUE.

**H. Server-authoritative Felder beim Insert.**
- `created_by = user.id` (RLS-Policy verlangt das ohnehin; Client-Wert wird ignoriert; Test `test_editor_cannot_push_event_owned_by_someone_else` belegt das).
- `created_at`, `updated_at`, `geom`: DB-Defaults / generated.
- `Application.sequence_no`: server-vergeben über `_next_sequence_no(event_id)`; Client-Wert wird ignoriert (Test belegt das).
- `id`: vom Client gesetzt (UUIDv7 im Frontend), Server akzeptiert wenn frei.

**I. Auto-Participant beim Sync-Insert.**
- Event-Insert: Creator's person_id wird `event_participant`.
- Application-Insert: performer_id und recipient_id (sofern unterschiedlich) werden `event_participant`. Idempotent über PK-Konflikt-Catch (Race-Safety).
Spiegelt die Logik aus `app/services/events.py:start_event` und `app/services/applications.py:start_application`. Konsistent mit ADR-012.

**J. Frontend-JSON-Schemas als Vertragsdatei in `frontend/src/lib/rxdb/schemas/`.**
ADR-031 sah vor, dass die Schemas im Frontend liegen. Da der Drift-Test sie braucht, sind die JSON-Files in M5b.2 angelegt — als reine Daten/Vertragsdatei, ohne Code-Verbindung zu RxDB selbst. Die RxDB-Konsumtion (`schemas.ts`) erfolgt erst in M5b.3. Diese Vorabanlage ist keine Modulgrenz-Verletzung, weil JSON-Schema die Schnittstelle zwischen Backend und Frontend definiert.

**K. Coverage-Tooling.**
`coverage>=7.13.5` als Dev-Abhängigkeit hinzugefügt — Test-Infrastruktur, vergleichbar mit dem schon existierenden `pytest`/`pytest-asyncio`/`testcontainers`-Set in der `[dependency-groups.dev]`-Section. project-context.md §3 listet Test-Bibliotheken als „freigabefrei nutzbar". Verwendet mit `--concurrency=greenlet,thread` (SQLAlchemy 2.x Async nutzt greenlet intern).

### Ergebnis
- Alle vier Sync-Endpoints lauffähig, OpenAPI-Doku automatisch generiert.
- 116 → 125 Backend-Tests (+ 41 für M5b.2: 6 sync_api + 8 sync_rls + 7 conflict + 9 applications + 5 soft-delete + 6 drift). 100 % grün.
- Coverage `app/sync/`: 91 % (Soll ≥ 80 %).
- Latent M2-Bug bei Editor-INSERT-via-HTTP behoben.
- `mypy --strict` und `ruff` clean.

### Verworfene Alternativen
Siehe Punkte E (Owner-SELECT) für die kompletten Optionen.

### Folge-Arbeit (M5b.3+)
- M5b.3: RxDB-Setup im Frontend nutzt die hier angelegten JSON-Schemas.
- M5b.4: E2E-Offline-Test verifiziert die End-to-End-Replikation.

---

## ADR-034 — Implementierungsstrategie M5b.3 (RxDB-Frontend-Setup + Live-Modus-Refactor)

**Status:** Accepted
**Datum:** 2026-04-26

### Kontext
M5b.1 hat das Datenmodell für die RxDB-Replication vorbereitet, M5b.2 die Backend-Endpoints geliefert. M5b.3 schließt die Sync-Schicht im Frontend: lokale RxDB-Datenbank, Replication-Worker gegen die Sync-Endpoints, Live-Modus-Refactor von REST auf RxDB-Schreibpfad, UI-Indikator für den Sync-Status.

### Entscheidungen

**A. RxDB-Version 17 + Dexie-Storage.**
Aktuell stable (Apache 2.0). Free-Tier-Storage-Adapter `dexie` (IndexedDB-basiert) wie ADR-017 vorgibt. Keine Premium-Plugins, keine Encryption (ADR-032). Bundle-Größe nach Build: First-Load-JS für `/events/[id]` 271 kB, für `/events/new` 262 kB — innerhalb des in ADR-017 prognostizierten Rahmens (150-200 KB für RxDB+Dexie+RxJS gzipped).

**B. Schema-Konsumtion via JSON-Import.**
Die Frontend-JSON-Schemas aus M5b.2 (`frontend/src/lib/rxdb/schemas/{event,application}.schema.json`) werden direkt importiert, durch `unknown`-Cast als `RxJsonSchema<T>` typisiert, an `addCollections` übergeben. TypeScript-Document-Types in `lib/rxdb/types.ts` manuell deckungsgleich; Drift fängt der Backend-Drift-Test aus M5b.2 ab.

**C. Lazy DB-Singleton.**
`getDatabase()` in `lib/rxdb/database.ts` gibt eine memoisierte `Promise<RxDatabase>` zurück. Server-side Aufrufe werden mit `Error("RxDB is browser-only")` abgewiesen. `RxDBDevModePlugin` wird nur in Development geladen (dynamic import), spart Bundle-Größe in Production.

**D. Replication via `replicateRxCollection` mit eigenem `pullHandler` / `pushHandler`.**
Standardweg für Custom-REST-Backends. Zwei separate Replikationen (events, applications), jede mit eigenem `replicationIdentifier`. `waitForLeadership: true` verhindert, dass mehrere Browser-Tabs parallel pushen. `retryTime: 5_000` für graceful Reconnect-Verhalten.

**E. CSRF-Cookie-Echo im Push-Handler.**
Die Sync-Endpoints sind durch die globale CSRF-Middleware geschützt (ADR-019). Der Push-Handler liest das `hcmap_csrf`-Cookie via `document.cookie` und setzt es als `X-CSRF-Token`-Header. Fehlt das Cookie (z. B. nach Logout), wirft der Handler — RxDB schiebt den Push automatisch in die Retry-Queue.

**F. Conflict-Handler: RxDB-Default (Master gewinnt).**
ADR-029 verlangt „Server gewinnt bei Konflikt". RxDB's Default-Conflict-Handler liefert exakt diese Semantik: Der Server-`master`-Doc gewinnt gegen den lokalen `newDocumentState`, wenn beide non-equal sind. Backend gibt seine Master-Doc als Konflikt-Antwort zurück (siehe ADR-029, ADR-033 §G); RxDB übernimmt sie, schreibt sie in IndexedDB und feuert die Reactive-Subscriptions. Kein eigener `conflictHandler` nötig.

**G. Globaler Sync-Status `idle | active | error | offline`.**
`startReplication(database)` in `lib/rxdb/replication.ts` aggregiert die `active$`/`error$`-Streams beider Replikationen plus `navigator.onLine`. Lokale Snapshots (statt `getValue()`, weil RxDB `active$`/`error$` als plain Observables exponiert, nicht als BehaviorSubject) werden in `BehaviorSubject<SyncStatus>` gemappt. `online`/`offline`-Window-Events triggern Recompute.

**H. React-Provider in `(protected)/layout.tsx`.**
`RxdbProvider` mountet zwischen `PinLockProvider` (M5a.4) und `AppShell`. Provider initialisiert die DB einmalig, startet die Replication, liefert `useDatabase()`, `useDatabaseError()`, `useSyncStatus()`-Hooks. Cleanup auf Unmount cancelt die Replication, lässt aber die DB-Singleton bestehen (Modul-Level).

**I. Sync-Indikator als kleine Pill in der App-Shell.**
`SyncStatusIndicator`-Komponente mit vier Lucide-Icons (Cloud / Loader2 / CloudOff / TriangleAlert) und Tailwind-Farben (emerald / sky / amber / red). Sidebar (Desktop): mit Label, am unteren Rand neben `UserMenu`. Mobile-Header: kompakt (nur Icon), neben dem `UserMenu compact`-Avatar. `data-sync-status`-Attribut hilft Tests.

**J. Live-Modus-Refactor: alle Mutations + Reads via RxDB.**
- `event-create-form.tsx`: `database.events.insert({...})` mit `crypto.randomUUID()` als Client-ID. Server überschreibt `created_by` (ADR-029). Recipient-Wahl wird in `sessionStorage` als Hint für die erste Application gespeichert (Bridge, weil `recipient_id` kein Event-Feld mehr ist — Auto-Participant ergibt sich erst aus der Application).
- `application-start-sheet.tsx`: `database.applications.insert({...})` mit lokal vergebener `sequence_no` (max+1 aus RxDB-Query). Server vergibt eine endgültige Nummer beim Push und liefert sie über den nächsten Pull zurück.
- `live-event-view.tsx`: zwei Hooks `useEventDoc(id)` / `useApplications(eventId)` subscriben auf `events.findOne(id).$` und `applications.find({event_id, _deleted=false}).$`. End-Event/End-Application via `doc.patch({ ended_at, updated_at })`. Reactive Updates ohne `refetchInterval`.
- TanStack-Query-Mutations (`useMutation` / `useQuery` / `useQueryClient`) entfernt für die Live-Modus-Pfade. Server-Reads für `plus_code` und `participants` bleiben (initial-event vom Server-Side-Render der Detail-Page).

**K. Edge-Cases bewusst akzeptiert.**
- **Offline-Insert mit direkter Navigation:** Aktuell macht `(protected)/events/[id]/page.tsx` einen Server-Side-Fetch; im Offline-Fall liefert der 404. Real auftretendes Risiko gering, weil der Push direkt nach Insert ausgelöst wird (`waitForLeadership` + `autoStart: true`). Saubere Lösung verlangt Client-only-Detail-Page — Scope für M5b.4 oder M5c.
- **Participants-Anzeige bis erster Pull:** `event.participants` bleibt leer, bis das Event vom Backend zurückgesynct wird (Backend macht Auto-Participant beim Push). Der Live-Modus toleriert das — `pickRecipientPerson` greift auf `sessionStorage`-Draft zurück, wenn applications/participants leer sind.
- **`crypto.randomUUID()` statt UUIDv7:** Backend nutzt UUIDv7-Defaults (`uuid_utils.uuid7()`, ADR-018), aber das ist nur intern wichtig (Sortierbarkeit beim Insert). Wenn der Client eine UUIDv4 liefert, übernimmt der Server sie. `(updated_at, id)`-Cursor sortiert nach `updated_at`, nicht nach `id` — ID-Form irrelevant.

**L. Component-Test mit gemocktem `useSyncStatus`-Hook.**
`tests/sync-status-indicator.test.tsx` mockt `@/lib/rxdb/provider` direkt und prüft alle vier Status-Varianten (idle / active / offline / error). 4/4 grün. Die echte Replication-Logik wird nicht getestet (würde Backend + IndexedDB-Mock benötigen) — der E2E-Offline-Test in M5b.4 schließt diese Lücke.

### Ergebnis
- 56 → 60 Frontend-Tests grün (+ 4 für SyncStatusIndicator).
- ESLint, `tsc --noEmit`, `next build` clean.
- **Browser-Verifikation:** Login → Dashboard rendert Sync-Indikator (DOM `[role=status][aria-label="Synchronisation: synchronisiert"][data-sync-status=idle]`), RxDB-IndexedDB ist initialisiert (`indexedDB.databases()` enthält `hcmap`), Pull replizierte das vorhandene Smoke-Test-Event lokal.
- Bundle: `/events/[id]` 271 kB First-Load (RxDB ~150 KB gzipped) — innerhalb der ADR-017-Grenze.

### Verworfene Alternativen
- **Premium-Replication-Plugins (`replication-rest`):** Wären für Custom-Backends einfacher, aber kostenpflichtig. Selbst-implementierte Pull/Push-Handler reichen vollständig aus.
- **Custom `conflictHandler`:** Würde redundante Logik zum Server-Konflikt-Resolver duplizieren. ADR-029 wird im Backend autoritativ entschieden; Frontend nimmt das Ergebnis als Master.
- **Codegen aus JSON-Schemas:** Hätte den Drift-Test überflüssig gemacht, aber Tooling-Setup für M5b.3 nicht gerechtfertigt. Manuelle Synchronisation bleibt schmerzfrei dank des Backend-Drift-Tests aus M5b.2.
- **Client-only Detail-Page:** Hätte den Offline-Insert-Edge-Case behoben, aber den Server-Side-Render-Vorteil (SEO, schneller Initial-Load) für eine seltene Race-Condition aufgegeben. Bleibt offen für M5b.4 oder M5c.

### Folge-Arbeit (M5b.4)
- E2E-Offline-Test: Browser → Flugmodus → 3 Applications erfassen → Reconnect → Backend hat alle Daten genau einmal, kein Duplikat, Reihenfolge korrekt.
- Coverage-Nachweis Frontend ≥ 80 % für Sync-Pfade.

---

## ADR-035 — Implementierungsstrategie M5b.4 (E2E-Offline-Test + Coverage-Tooling)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
M5b.1–M5b.3 haben das Datenmodell, die Backend-Sync-Endpoints und den Frontend-RxDB-Stack geliefert. M5b.4 schließt den Sub-Schritt-Block mit dem End-to-End-Beweis: „Browser → Flugmodus → 3 Applications erfassen → Reconnect → Backend hat alle Daten genau einmal" plus Coverage-Nachweis ≥ 80 % für die Sync-Pfade. Backend-Coverage `app/sync/` lag aus M5b.2 schon bei 91 %; der eigentliche Engpass ist `frontend/src/lib/rxdb/replication.ts`, das bisher nur indirekt über das Component-Sync-Indicator-Test getestet war. Der Frontend-Test-Stack hatte weder Coverage-Reporter noch eine IndexedDB-fähige Umgebung.

### Entscheidungen

**A. Test-Stack: Vitest + `fake-indexeddb` + In-Process-Mock-Server (Hybrid A4 aus dem M5b.4-Vorschlag).**
Statt Playwright (architecture.md sagt explizit „Phase 2 sinnvoll, MVP optional") wird der Replication-Roundtrip in jsdom/Vitest gefahren. `fake-indexeddb@6.x` (MIT, ~80 KB, Standard-IndexedDB-Polyfill der Dexie- und RxDB-CIs) ersetzt den fehlenden Browser-IndexedDB; ein in-Process-Mock-Server in `frontend/tests/helpers/sync-mock-server.ts` reimplementiert die vier Sync-Endpoints deterministisch in-memory. Die Tests verwenden den **echten** Replication-Code aus `lib/rxdb/replication.ts` und die echte Database aus `lib/rxdb/database.ts` — kein Code-Pfad-Bypass.

**B. Coverage-Tooling: `@vitest/coverage-v8`.**
Offizieller Coverage-Reporter im vitest-Ökosystem (MIT, V8-native). Konfiguration in `vitest.config.ts`: `coverage.provider = 'v8'`, `coverage.include = ['src/lib/rxdb/**']` für den M5b.4-Nachweis, plus `coverage.thresholds.lines = 80` als CI-Gate auf den Sync-Pfaden. `pnpm test -- --coverage` erzeugt einen JSON-Summary, gegen den der Akzeptanz-Wert gemessen wird.

**C. Edge-Cases ADR-034 §K nach M5c verschoben.**
Die zwei in M5b.3 bewusst akzeptierten Edge-Cases (Server-Side-Detail-Page liefert 404 bei Offline-Insert mit direkter Navigation; `event.participants` bleibt bis zum ersten Pull leer) werden **nicht** in M5b.4 behoben. Die saubere Lösung verlangt eine Architekturänderung (`/events/[id]` auf Client-only umstellen), die dieselbe Detail-Page in M5c (Nachträgliche Erfassung & Bearbeitung) ohnehin anfasst. Eine kombinierte Refactor-Runde ist sauberer als zwei aufeinanderfolgende. Eintrag in `fahrplan.md` § M5c als Pflicht-Deliverable hinzugefügt.

**D. Backend-Idempotenz-Test als Ergänzung zu Frontend-E2E.**
`backend/tests/test_sync_idempotency.py` deckt die zweite Hälfte des Akzeptanzkriteriums „genau einmal" ab: drei Pushes desselben Application-Documents (assumedMasterState wird zwischen den Pushes mitgeführt) → exakt eine Row in der DB, `sequence_no` stabil, kein zweites `EventParticipant`-Insert. Kein neuer Dep, ergänzt `test_sync_conflict_resolution.py`.

**E. Mock-Server-Scope.**
Der Mock-Server bildet das Replication-Protokoll ab, nicht die volle Backend-Logik:
- **Pull:** Filter `(updated_at, id) > checkpoint`, ASC-Sortierung, Limit, Tombstone-Reflection.
- **Push (events):** Insert wenn nicht vorhanden; bei Re-Push mit gleichem `assumedMasterState` (idempotent) keine zweite Row, keine Konflikt-Antwort.
- **Push (applications):** wie events, plus Auto-Bump der `sequence_no` analog zum Server.
- **CSRF:** Wird gegen das in `document.cookie` gesetzte Test-Token verglichen, fehlt der Header, antwortet der Mock mit 403 (analog Backend-Verhalten).
Der Mock implementiert **nicht** die volle Pro-Feld-Konfliktauflösung aus ADR-029 — die ist Backend-Pflicht und im pytest-Suite vollständig gecovert.

**F. Offline-Simulation via globaler `fetch`-Stub + `navigator.onLine`-Toggle.**
Der Test ersetzt `globalThis.fetch` mit einem Stub, der bei `online === false` `TypeError("Network request failed")` wirft (entspricht dem Browser-Verhalten bei deaktiviertem Netz). Zusätzlich wird `Object.defineProperty(navigator, 'onLine', ...)` und `window.dispatchEvent(new Event('offline'/'online'))` getoggelt, damit `replication.ts`-`recompute()` den Status korrekt aufnimmt.

**G. Kein BroadcastChannel-Workaround nötig.**
Node 22 (per `package.json` engines) liefert `BroadcastChannel` global, RxDB's `waitForLeadership: true` erkennt im Single-Tab-Test sofort den Leader. Kein Test-spezifischer Override des Replication-Configs.

**H. Test-Isolation: Datenbank-Reset zwischen Tests.**
`afterEach`: `database.remove()` löscht die RxDB-Instanz inkl. IndexedDB-State; `_resetDatabaseForTests()` aus `database.ts` setzt das Modul-Singleton zurück. `globalThis.fetch` wird auf den Original-Wert zurückgesetzt, damit andere Tests nicht beeinflusst werden.

**I. Verlässliche Async-Stabilisierung statt blinder Sleeps.**
Der Test wartet auf `replication.events.awaitInSync()` (RxDB-Standard) statt fester Timeouts. Damit ist der Test deterministisch reproduzierbar und vermeidet die in CLAUDE.md §6 verbotene Flakiness.

**J. Doc-Updates.**
`architecture.md` § Sync wird um den Test-Stack ergänzt; `README.md` Phase-Badge wechselt auf `M5b-erledigt` (M5b komplett); `CHANGELOG.md` erhält den Sub-Schritt-Eintrag mit den vier ADR-Detailpunkten; `docs/fahrplan.md` setzt M5b.4 auf `[ERLEDIGT]` und propagiert den Edge-Case-Übertrag in M5c.

### Ergebnis
- **Frontend-Replication-E2E-Test** in `frontend/tests/replication.e2e.test.ts` mit drei Szenarien: (1) `offline → 3 application inserts → reconnect → mock backend hat genau drei rows`, (2) `re-trigger replication → keine Doppelten`, (3) `pull-after-reconnect repliziert Server-Master-Werte zurück in RxDB`.
- **Backend-Idempotenz-Test** in `backend/tests/test_sync_idempotency.py`: drei wiederholte Pushes → 1 Row, 1 EventParticipant, stable `sequence_no`.
- **Coverage Frontend** für `lib/rxdb/**`: Ziel ≥ 80 %, gemessen via `pnpm test -- --coverage`.
- **Backend-Suite** weiterhin grün (125 + neue Idempotenz-Tests).
- **Edge-Cases ADR-034 §K** explizit nach M5c überstellt, dort als Pflicht-Deliverable hinterlegt.

### Verworfene Alternativen
- **A1 — Playwright + headless Chromium:** Würde Browser-Binary (~150 MB), CI-Job-Erweiterung und ~30 s/Test in den MVP zwingen, ohne dass eine M5b.4-spezifische Lücke bliebe. architecture.md hatte Playwright bewusst auf Phase 2 verschoben.
- **A3 — Backend-Only-Test ohne Frontend-Coverage:** Verfehlt das Akzeptanzkriterium „Coverage Sync-Pfade ≥ 80 % (Frontend + Backend)" und lässt `replication.ts` ungetestet — der Test würde genau das nicht prüfen, wofür er da ist.
- **B2 — `@vitest/coverage-istanbul`:** Robuster bei Source-Map-Edge-Cases, aber ~50 % langsamer und liefert für reine TS-Files keinen Mehrwert gegenüber V8-Native. Bei späteren Tooling-Problemen jederzeit wechselbar.
- **B3 — Verzicht auf Coverage-Reporter, manuelle Test-Mapping-Tabelle:** Verfehlt CLAUDE.md §9 („konkrete Zahl, nicht ‚ausreichend'") und gibt CI keinen Schutz gegen Coverage-Regression.
- **C1 — Offline-Insert-Edge-Case in M5b.4 mitnehmen:** Architekturänderung (Detail-Page Client-only) wäre freigabepflichtig (CLAUDE.md §4.1) und überschreibt den Test-/Doku-Scope von M5b.4 deutlich.

### Folge-Arbeit (M5c)
- `(protected)/events/[id]/page.tsx` von Server-Side-Render auf Client-only umstellen, damit Offline-Inserts ohne 404-Race direkt navigierbar sind.
- `event.participants` als reaktive RxDB-Subscription statt Server-Side-Snapshot, sodass Auto-Participants vom ersten Pull-Roundtrip on-the-fly sichtbar werden.

---

## ADR-036 — M5c-Framework + Implementierungsstrategie M5c.1a (Detail-Page Client-only)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
M5c (Nachträgliche Erfassung & Bearbeitung) ist als Gesamtmilestone zu groß für einen Sub-Schritt: sieben Deliverables aus dem Fahrplan plus die zwei aus M5b.4 übernommenen Edge-Cases (ADR-035 §C / ADR-034 §K) berühren Architektur, API-Vertrag und Sicherheit zugleich. Diese ADR legt den **Framework-Rahmen für M5c** fest (Sub-Schritt-Aufteilung, Datenpfad-Architektur, Edit-UX) und konkretisiert die **Implementierungsstrategie M5c.1a** als ersten Sub-Schritt — den reinen SSR-Refactor der Detail-Page ohne neue Sync-Collection.

### Framework-Entscheidungen (gelten für M5c.1a–4)

**A. Sub-Schritt-Aufteilung (analog M5a/M5b).**
M5c zerfällt in fünf Sub-Schritte (M5c.1 wurde nach Risikoanalyse in 1a/1b geteilt):

- **M5c.1a — Detail-Page Client-only + REST-Once-Read Participants** (dieser Sub-Schritt). Beendet die SSR-Detail-Page; Participants und `plus_code` kommen weiter über REST `/api/events/{id}`, aber nur als One-Shot-Fetch beim Mount, nicht via SSR. Behebt den 404-Race aus ADR-035 §C im häufigen Fall (Online-Reload nach Offline-Insert), nicht im seltenen Fall (echte Offline-Navigation auf direkt eingefügte Events).
- **M5c.1b — Participants als RxDB-Collection (eigener Sync-Endpoint).** Beendet den 404-Race vollständig: `event_participant` wird sync-fähig (Migration mit `updated_at`/`is_deleted`/Cursor-Index/Cascade), eigene Pull/Push-Endpoints, Frontend-RxDB-Collection, Drift-Test-Erweiterung. M5c.1a setzt damit die Vorbereitung in einem reviewbaren Schritt ohne Migration.
- **M5c.2 — Chronologische Detail-Anzeige + reveal_participants-Maskierung.** Einheitliche `EventDetailView` für laufende und beendete Events, Lücken-Anzeige zwischen Applications, Frontend-Sicherheitsgürtel zusätzlich zur Backend-Maskierung in `app/services/masking.py`.
- **M5c.3 — Nachträgliche Erfassung (Schalter + manuelle Zeitstempel).** Startseiten-Schalter, editierbare `started_at`/`ended_at`-Felder, monotone Zeitvalidierung ohne Sequenz-Überlappung.
- **M5c.4 — Event-/Application-Bearbeitung (Edit-UI).** `/events/[id]/edit`-Pfad, Inline-Application-Edit via Sheet, Soft-Delete via RxDB-Push (gemäß ADR-029 LWW).

**B. Datenpfad: RxDB als Single Source of Truth (Variante B1 aus dem M5c-Vorschlag).**
Detail-Page liest ausschließlich aus RxDB für die in `EventDocType` und `ApplicationDocType` enthaltenen Felder. `plus_code` und `participants` (M5c.1a) werden über einen einmaligen REST-Fetch geholt und nicht reactive — bis M5c.1b die Participants-Sync-Collection einführt. Hybrid-Lesepfade (B2) und REST-Only (B3) verworfen; sie würden die Single-Source-Eigenschaft der M5b-Sync-Architektur aufbrechen.

**C. Mutations-Datenpfad: RxDB-Push (Variante C1).**
Edits gehen ausschließlich über RxDB-Push, mit den ADR-029-LWW-Regeln. Die in M3 erstellten REST-PATCH-Endpoints (`PATCH /api/events/{id}`, `PATCH /api/applications/{id}`) bleiben für SQLAdmin/Admin-UI erhalten, werden aber vom Frontend nicht mehr genutzt. Dadurch ist Offline-Bearbeitung „kostenlos" und der Schreibpfad bleibt einheitlich.

**D. Edit-UX: dedizierte Route `/events/[id]/edit` (Variante D1).**
`architecture.md` § Routing sieht den Pfad bereits vor. Detail-Page bleibt read-only-View, Edit-Variante ist eine eigene Route mit eigenem Form-State. Vermeidet doppelte Komponentenlogik und macht den State testbarer als ein Inline-Toggle.

**E. Backend-Anpassungen: Participants als RxDB-Collection (Variante E3, nur in M5c.1b).**
Die saubere Lösung für reactive Participants ist eine eigene Sync-Collection — identisches Muster wie `events`/`applications` aus M5b.2. M5c.1b adressiert die Migration (`event_participant` bekommt `id` (surrogate UUID), `updated_at`, `is_deleted`, `deleted_at`, Cursor-Index, Cascade-Trigger Event→Participants), das Pydantic/JSON-Schema-Paar, Pull/Push-Routen, RLS-Policy, Drift-Test. Das ist freigegeben, aber nicht Teil von M5c.1a.

### M5c.1a — Konkrete Implementierungsstrategie

**F. Page als Client Component.**
`(protected)/events/[id]/page.tsx` wird `"use client"`. Kein `getServerMe()` mehr — stattdessen `useMe()` aus `lib/auth.ts` (TanStack-Query-Hook, der `/api/users/me` befragt). Loading-State bis User aufgelöst ist, dann je nach Auth-Zustand entweder Skeleton, Login-Redirect oder echter Render.

**G. Drei Datenquellen, ein Render-Baum.**
- `useEventDoc(id)` — RxDB-Subscription auf `database.events.findOne(id).$`. Gibt `EventDocType | null` plus `resolved`-Flag zurück (so können wir „RxDB hat ja noch nicht angetwortet" von „RxDB hat nichts gefunden" unterscheiden).
- `useEventDetailFetch(id)` — One-Shot REST-Fetch via `apiFetch<EventDetail>` mit Status `"loading" | "ok" | "not-found" | "error"`.
- `useMe()` — bestehender Auth-Hook.

**H. Render-Entscheidungsbaum.**
1. `me.isPending` → Skeleton.
2. `me.data === null` → Login-Redirect via `window.location.replace`.
3. RxDB nicht resolved UND REST loading → Skeleton.
4. RxDB null UND REST 404 → `notFound()`.
5. REST ok → übergibt `EventDetail` an `LiveEventView` / `EndedEventView` (existierende Komponenten, unverändert).
6. REST not-found ODER REST error UND RxDB hat doc → synthetisiert `EventDetail` aus dem RxDB-Doc mit `plus_code = ""` und `participants = []`. Damit ist der Offline-Insert-Fall gerendert; Participants und Plus-Code holt M5c.1b nach.

**I. Keine Architektur- oder Datenmodell-Änderung in M5c.1a.**
- Keine neuen Routen.
- Keine Schema-Migrationen.
- Keine neuen Dependencies.
- Keine neuen Sync-Collections.
- Bestehender Backend-Code bleibt unberührt.
- Live-Modus-Verhalten unverändert (LiveEventView und EndedEventView werden weiter benutzt).

**J. Tests.**
- Frontend-Component-Test (`tests/event-detail-page.test.tsx`): vier Szenarien — Loading, REST-OK, RxDB-Fallback nach REST-404, Hard-404.
- Bestehende Test-Suite bleibt grün; Coverage `lib/rxdb/**` aus M5b.4 bleibt aktiv (≥ 80 % CI-Threshold).
- E2E-Erweiterung in `replication.e2e.test.ts` ist bewusst nicht Teil von M5c.1a — sie macht erst mit M5c.1b (Participants in RxDB) wirklich Sinn.

**K. Edge-Cases bewusst akzeptiert (für M5c.1b):**
- Bei Offline-Insert + direkter Navigation **ohne** Server-Roundtrip dauerhaft: Participants bleiben leer (keine reaktive Update-Quelle bis M5c.1b), Plus-Code bleibt leer (Backend-generiert). Acceptable, weil der Offline-Insert-Pfad bisher 404 lieferte; jetzt rendert er das Event.
- Reactive Participants-Update bei Backend-Auto-Participant-Trigger ist bis M5c.1b nicht möglich — dafür braucht es die Sync-Collection.

### Begründung der Aufteilung 1a/1b
Die Risiko-Note in der M5c-Empfehlung („Nicht-trivialer Refactor in M5c.1: Server→Client + neue Sync-Collection in einem Sub-Schritt") wurde durch die Codebase-Inspektion bestätigt: Die SSR-Entfernung allein hat zwölf bis fünfzehn Render-Pfad-Konsequenzen (Skeleton, Auth-Loading, REST-Failure-Handling, Hard-404). Eine Sync-Collection mit eigener Migration und neuer RLS dazu zu legen, würde die PR-Größe verdoppeln und den Review erschweren. M5c.1a liefert den Architektur-Refactor isoliert; M5c.1b folgt mit der Migration als zweiter Schritt.

### Verworfene Alternativen
- **B2 / B3:** würden den Live-Modus-Reactive-Pfad aus M5b.3 brechen oder eine zweite Datenquelle in einer Komponente einführen.
- **C2:** würde Offline-Bearbeitung verbieten und zwei Mutation-Quellen schaffen.
- **D2 (Inline-Edit):** verdoppelt die Komponentenlogik der Detail-Page.
- **E1 (gar keine Backend-Änderung):** Participants blieben dauerhaft nicht reactive, der Auto-Participant-Trigger würde nie sichtbar.
- **E2 (Soft-Delete-REST-Endpoint statt Sync-Push):** zweigleisige Mutation-Quelle, widerspricht ADR-029.
- **Denormalisierte `participant_ids: list[uuid]` auf `EventDoc`:** kürzere Migration, aber mischt Concerns und macht künftige Participant-Properties (z. B. Beitrittszeit, geladen_durch) zu Event-Schema-Änderungen. Bleibt als „letzte Reserve", falls E3 in M5c.1b zu sperrig wird.

### Folge-Arbeit (M5c.1b)
- Migration `event_participant`: surrogate `id uuid` PK, `updated_at`, `is_deleted`, `deleted_at`, `(updated_at, id)`-Cursor-Index, Cascade-Trigger Event→Participants beim Soft-Delete.
- Pydantic `EventParticipantDoc` + JSON-Schema, Pull/Push-Routen `/api/sync/event-participants/{pull,push}`.
- RLS-Policy für `event_participant`-Sync (Member sieht eigene Participants des Events).
- Frontend-RxDB-Collection `event_participants`, Replication-Eintrag in `lib/rxdb/replication.ts`.
- Detail-Page von REST-One-Shot auf RxDB-Subscription für Participants umstellen.
- Drift-Test um die neue Collection erweitern.

---

## ADR-037 — Implementierungsstrategie M5c.1b (Participants als RxDB-Sync-Collection)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
M5c.1a hat die Detail-Page client-only gemacht; `participants` und `plus_code` werden weiter über einen REST-One-Shot geholt, sind also nicht reactive. Das ADR-035-§C-Akzeptanzkriterium („`event.participants` als reaktive RxDB-Subscription, sodass Auto-Participants vom ersten Pull-Roundtrip on-the-fly sichtbar werden") wird in M5c.1b erfüllt: Die Junction-Tabelle `event_participant` wird sync-fähig.

### Entscheidungen

**A. Surrogate UUID-PK auf `event_participant`.**
RxDB-Collections brauchen einen einzigen String-PK. Die bestehende Composite-PK `(event_id, person_id)` wird durch eine neue Spalte `id uuid` ersetzt; die Eindeutigkeit bleibt über einen UNIQUE-Constraint auf `(event_id, person_id)`. ORM-Code, der bisher `session.get(EventParticipant, (event_id, person_id))` nutzt, wird auf `select(EventParticipant).where(event_id=…, person_id=…)` umgestellt (drei Aufrufstellen: `app/sync/services.py`, `app/services/events.py`, `app/services/applications.py`).

**B. Soft-Delete + Cursor-Felder analog ADR-030.**
`updated_at timestamptz NOT NULL DEFAULT clock_timestamp()`, `is_deleted boolean NOT NULL DEFAULT false`, `deleted_at timestamptz NULL`. Cursor-Index `(updated_at, id)` für `GET /api/sync/event-participants/pull`. Backfill `updated_at = COALESCE(updated_at, created_at)` für bestehende Rows. Der bestehende `set_updated_at()`-Trigger (M1) wird auf `event_participant` ausgedehnt, damit jede Modifikation den Cursor bumpt.

**C. Cascade-Trigger erweitert.**
`cascade_event_soft_delete()` aus M5b.1 hat bisher nur `application` mitgenommen. Die Funktion wird so erweitert, dass beim Soft-Delete eines Events auch die nicht-gelöschten `event_participant`-Rows desselben Events auf `is_deleted = true` gesetzt werden. Restore (true→false) propagiert weiterhin nicht.

**D. Pull-only Replication.**
`event_participant` ist eine derived Junction-Tabelle: Inserts entstehen serverseitig durch den Auto-Participant-Trigger (ADR-012, beim Application-Push), Deletes laufen entweder über das bestehende REST-Endpoint `DELETE /api/events/{id}/participants/{person_id}` oder den Cascade beim Event-Soft-Delete. Es gibt keinen sinnvollen Frontend-Push-Pfad in M5c.1b. Daher: **Pull-only**, kein `/push`-Endpoint. RxDB-`replicateRxCollection` lässt das `push`-Feld weg. Falls M5c.4 (Bearbeitung) Frontend-getriebenes Hinzufügen/Entfernen will, wird Push dort nachgezogen — die Server-RLS lässt das zu, wir würden nur Wire-Schema und Service ergänzen.

**E. Hybrid-Name-Resolution: RxDB für Mitgliedschaft, REST für Person-Details.**
Die `EventParticipantDoc`-Wire-Form trägt nur `id`, `event_id`, `person_id`, plus die Sync-Standardfelder (`created_at`, `updated_at`, `deleted_at`, `_deleted`). Person-Details (`name`, `alias`) werden weiter über den bestehenden `EventDetail`-REST-Aufruf geholt, weil `Person` in M5c.1b **nicht** in eine RxDB-Collection promotet wird (das wäre eigener Sub-Schritt mit eigener RLS-Diskussion).

Konsequenz: Die Detail-Page subscribet auf `event_participants.find({event_id, _deleted=false}).$` als Quelle der Wahrheit für die **Mitgliedschaft** und nutzt den REST-Snapshot als Lookup-Tabelle für **Namen**. Sobald die RxDB-Subscription eine person_id liefert, die der REST-Snapshot nicht kennt (Auto-Participant nach Reconnect), triggert ein useEffect ein einmaliges REST-Refetch von `EventDetail`.

Damit ist der Akzeptanz-Pfad „Offline-Application-Insert → Reconnect → Auto-Participant erscheint reactive in der Detail-Page" geschlossen, ohne `Person` in die Sync-Schicht zu ziehen.

**F. RLS-Policies bleiben unverändert.**
Die in M2 (Migration `20260425_1730_strict_rls`) angelegten Policies — `event_participant_admin_all`, `event_participant_member_select` (über `app_user_can_see_event`), `event_participant_editor_modify` — passen unverändert. Der Pull-Endpoint nutzt `get_rls_session`, sodass Member nur ihre sichtbaren Participants bekommen.

**G. JSON-Schema + Pydantic parallel zu ADR-031.**
`backend/app/sync/schemas.py` bekommt `EventParticipantDoc` und `EventParticipantPullResponse`. Die Wire-Form-Datei liegt unter `frontend/src/lib/rxdb/schemas/event_participant.schema.json`. Der bestehende Drift-Test (`backend/tests/test_rxdb_schema_drift.py`) wird um die dritte Collection erweitert.

**H. Frontend-RxDB-Collection ohne Push-Handler.**
`lib/rxdb/types.ts` bekommt `EventParticipantDocType`, `lib/rxdb/schemas.ts` den neuen Schema-Wrapper, `lib/rxdb/database.ts` die Collection. `lib/rxdb/replication.ts` ergänzt einen dritten Replication-Eintrag mit nur `pull`-Konfiguration; die aggregierten `idle | active | offline | error`-Status-Streams nehmen den neuen Replicator mit auf.

**I. Detail-Page-Anpassung.**
`useEventParticipantIds(eventId)` (RxDB-Subscription) ersetzt die statische `participants`-Liste auf der Page. Aus dem RxDB-Result wird ein `Set<string>` von person_ids gebaut. Die Page kombiniert die Live-IDs mit dem REST-Snapshot zu einer `participants: PersonRead[]`-Ableitung; fehlt eine ID im Snapshot, wird ein REST-Refetch angestoßen.

**J. Bundle- und Performance-Annahmen.**
Die neue Collection ist klein (drei Feld-Properties + Sync-Standard); Bundle-Auswirkung erwartet < 1 KB. Cursor-Pull ist O(log N) durch den neuen Index.

**K. Tests.**
- Backend: Migration-Test für die neuen Trigger (Cascade-Trigger-Erweiterung, set_updated_at), Pull-Endpoint-Tests (Cursor, Tombstones), RLS-Test (Member sieht nur eigene Events), Drift-Test-Erweiterung.
- Frontend: Component-Test der RxDB-Subscription, Erweiterung der `replication.e2e.test.ts` um den Auto-Participant-Roundtrip (Application offline → Reconnect → EventParticipant erscheint).
- Coverage-Threshold `lib/rxdb/**` bleibt aktiv (≥ 80 %).

### Verworfene Alternativen

- **Push-Endpoint mit `_deleted`-Toggle:** Würde M5c.4-Funktionalität vorziehen, ohne klare RLS-Validierung der Insert-Branch (dort ginge es nicht über den Auto-Participant-Trigger). Bewusst auf M5c.4 verschoben.
- **Person als RxDB-Collection in M5c.1b mitnehmen:** Hätte vollständig reaktive Names ermöglicht, aber öffnet eine eigene RLS-Diskussion (Person ist global sichtbar, Maskierungs-Logik aus `app/services/masking.py` müsste abgebildet werden) und sprengt den Sub-Schritt. Verlagert nach M5c.2 oder einen späteren Zeitpunkt.
- **`participant_ids: list[uuid]` direkt auf `EventDoc` denormalisieren:** Hätte ohne neue Collection auskommen, mischt aber Concerns und macht künftige EventParticipant-Properties (Beitrittszeit, geladen_durch, Linkable-Status) zu Event-Schema-Änderungen — die RxDB-Replication-Architektur ist explizit row-orientiert (ADR-030).
- **Composite-PK behalten + RxDB-Schlüssel synthetisieren (z. B. `${event_id}__${person_id}`):** Funktional, aber gegen die Konventionen von M5b und schwer mit `id`-Indizes/-Joins zu kombinieren. Surrogate-PK ist die saubere Lösung.

### Folge-Arbeit

- M5c.2: Detail-Page-Refresh als unified `EventDetailView` (laufend + beendet), `reveal_participants`-Maskierung im Frontend.
- M5c.4: bei Bedarf Push-Endpoint für `event_participant` (ADR-036 §E2-Variante), wenn Editor/Admin die Teilnehmer-Liste manuell editieren sollen.
- Mittelfristig (kein eigener Sub-Schritt geplant): Person als RxDB-Collection, sobald die Maskierungs-Logik vom Backend-Service in einen Wire-Format-äquivalenten Pfad übersetzt ist.

---

## ADR-038 — Implementierungsstrategie M5c.2 (EventDetailView, Lücken-Anzeige, Frontend-Maskierung)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
M5c.1a/1b haben die Detail-Page client-only und reactive gemacht; die eigentliche Detail-Anzeige hängt aber noch an der M5a.3-Aufteilung in `LiveEventView` (laufend) und `EndedEventView` (Stub). M5c.2 liefert das Fahrplan-Akzeptanzkriterium „Event-Detailseite mit chronologischer Anzeige aller Applications inkl. Lücken zwischen ihnen" und „Respektiert `reveal_participants`: zeigt ‚+N weitere‘ statt Namen, wenn Flag false".

### Entscheidungen

**A. Eine einheitliche `EventDetailView` ersetzt `LiveEventView` + `EndedEventView`.**
Datei `frontend/src/components/event/event-detail-view.tsx` (neu); `live-event-view.tsx` wird gelöscht. Die neue Komponente orchestriert dieselben drei Abschnitte für laufende **und** beendete Events:
1. Status-Card (Standort, Plus-Code, Live-Timer wenn laufend, Quick-Actions nur wenn `isLive`).
2. Applications-Timeline (chronologische Liste, Lücken-Visualisierung).
3. Beteiligte (Participants-Liste mit Frontend-Maskierung).

**B. Lücken-Anzeige zwischen Applications.**
Zwischen `app[i].ended_at` und `app[i+1].started_at` wird ein dünnes „Lücke" -Element gerendert, wenn die Lücke ≥ 1 Sekunde beträgt. Die Lücke trägt die Dauer (gleicher `formatDuration`-Helper wie sonst) und einen leichten visuellen Trenner, sodass „Materialwechsel"-Phasen erkennbar werden. Lücken erscheinen nur zwischen vollständig beendeten Applications — laufende oder noch nicht-gestartete Applications produzieren keine Lücke.

**C. Frontend-Maskierungs-Helper als Sicherheitsgürtel.**
Neue Datei `lib/masking.ts` mit `maskParticipants(participants, event, currentPersonId)`. Die Logik spiegelt `backend/app/services/masking.py`:
- `event.reveal_participants === true` → unverändert.
- Person mit `id === currentPersonId` → unverändert.
- Sonst → `name = "[verborgen]"`, `alias = null`, `note = null`.
Der Backend-Pfad maskiert weiterhin als primäre Schicht; der Frontend-Helper läuft beim Render und greift auch dann, wenn:
- Eine veraltete REST-Snapshot-Antwort im TanStack-Query-Cache liegt, die noch nicht das aktualisierte `reveal_participants=false` reflektiert.
- Künftige Code-Pfade (z. B. Person-RxDB-Collection in einem späteren Sub-Schritt) Person-Daten ohne Backend-Maskierung liefern.
Konstante `PLACEHOLDER = "[verborgen]"` deckungsgleich zum Backend.

**D. Maskierte Anzeige in der ParticipantsList.**
Die Teilnehmer-Liste rendert pro Person: Name (oder Placeholder), Alias-Zeile (nur wenn vorhanden), und ein „Du"-Badge für den eigenen Eintrag. Maskierte Einträge werden visuell zurückgenommen (italics + muted color) und nicht klickbar. Die Frage „+N weitere statt Namen" aus dem Fahrplan ist damit implizit erfüllt: Wenn drei Beteiligte alle bis auf den Anwender maskiert sind, sieht man drei Einträge mit `[verborgen]` als Label — die Anzahl bleibt sichtbar, die Namen nicht.

**E. Keine Backend-Änderungen, keine neuen Endpoints.**
Backend-Maskierung in `app/services/masking.py` bleibt unverändert; sie ist die primäre Sicherheitsschicht. Auch der `mask_event_view`-Helper im REST-Detail-Endpoint bleibt wie er ist.

**F. Tests.**
- `tests/masking.test.ts` für die neue Pure-Funktion (vier Fälle: reveal=true, reveal=false-Self, reveal=false-Other, leere Liste).
- `tests/event-detail-view.test.tsx` für die neue Komponente: Status-Card-Rendering, Live-Action-Card-Sichtbarkeit (laufend vs. beendet), Lücken-Visualisierung, Participants-Maskierung.
- `tests/event-detail-page.test.tsx` Mock-Update auf den neuen Komponenten-Namen.
- `replication.e2e.test.ts` und `tests/sync-status-indicator.test.tsx` bleiben unverändert.
- Coverage `lib/rxdb/**` bleibt aktiv; neuer Coverage-Block für `lib/masking.ts` wird nicht eingeführt — der Threshold-Block deckt Sync-Pfade, nicht alle Lib-Dateien.

**G. Migration der Hooks.**
`useEventDoc`, `useApplications` und `pickRecipientPerson` ziehen mit in `event-detail-view.tsx`. `LiveEventViewProps` wird zu `EventDetailViewProps`. `page.tsx` ändert nur den Import + die JSX-Verwendung; der bisherige `EndedEventView`-Inline-Stub wird entfernt.

### Verworfene Alternativen

- **`LiveEventView` parallel behalten und nur `EndedEventView` auf die neue Detail-View umlenken:** Doppelte Quelle der Wahrheit für die Application-Liste — bei späterem Drift unweigerlich Inkonsistenz.
- **„+N weitere"-Aggregat statt einzelner Maskierungen:** Spart einen Listeneintrag pro Verborgenem, verschleiert aber die tatsächliche Beteiligten-Anzahl. Die per-Eintrag-Maskierung ist transparenter und passt zum Backend-Verhalten („Anzahl bleibt, Inhalt nicht").
- **Frontend-Maskierung in der Komponente statt in `lib/masking.ts`:** Erschwert Tests und macht das Wiederverwenden in M5c.4 (Edit-UI) und M6 (Map-Popup) später aufwändiger.

### Folge-Arbeit

- M5c.3 (Nachträgliche Erfassung) nutzt dieselbe `EventDetailView` als Read-Pfad nach dem Speichern.
- M5c.4 (Edit-UI) ergänzt einen separaten Edit-Pfad `/events/[id]/edit`; `EventDetailView` bleibt Read-only.
- M6 (Karte) kann den `maskParticipants`-Helper im Popup-Renderer wiederverwenden.

---

## ADR-039 — Implementierungsstrategie M5c.3 (Nachträgliche Erfassung)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
Der Live-Modus (M5a.3) ist die primäre Erfassungsansicht; nachträgliche Erfassung wurde von Anfang an als sekundärer Modus gescoped (ADR-011, Fahrplan §M5c). M5c.3 schließt diese Lücke: Events ohne GPS-now-Workflow erfassen können, mit selbst gesetzten Zeitstempeln für Event und Applications.

### Entscheidungen

**A. Eigene Route `/events/new/backfill` statt Query-Param.**
Der Live-Pfad bleibt unverändert auf `/events/new`. Die nachträgliche Erfassung bekommt einen eigenen Pfad, weil das Form-Verhalten (editierbare Zeitstempel, mehrere Applications direkt im Submit) deutlich abweicht. Sauberer Test-Anker (`event-backfill-form.test.tsx`), klare Navigation, kein konditionaler Render-Pfad in einer Datei.

**B. Eigene Komponente `EventBackfillForm`.**
Datei `frontend/src/components/event/event-backfill-form.tsx` (neu); `EventCreateForm` bleibt als Live-Form unangetastet. Doppelter Code für die Cards (Standort, Recipient) ist akzeptabel — beide Formulare könnten in M5c.4 oder später zu einem gemeinsamen Form-Skelett zusammengeführt werden, falls die Pflege der zwei Formulare lästig wird. Aktuell überwiegt die Klarheit pro Form.

**C. Zeitstempel-Inputs als HTML5 `datetime-local`.**
Standard-Browser-Widget, keine zusätzliche Dependency. Kommt mit Mobile-Datepickern auf iOS/Android gratis. Konvertierung zu/von ISO-8601 in der Form-Logik. Edge-Case: Browsern, die `datetime-local` nicht unterstützen, fällt das Widget auf ein Text-Feld zurück — akzeptabel für die kleine Pfad-A-Gruppe.

**D. Application-Erfassung als wachsende Liste.**
Innerhalb des Backfill-Forms ist eine Liste von Applications, jede mit `started_at`, `ended_at`, `recipient`, `note`. Ein „+ Application hinzufügen"-Button hängt eine leere Zeile an; ein „Entfernen"-Button (Trash-Icon) löscht eine Zeile. Mindestens null Applications erlaubt (manche Events sind nur Marker ohne Sequenz).

**E. Submit-seitige Validierung mit inline-Fehlermeldungen + Toast-Zusammenfassung.**
Zwei Ebenen:
1. **Pflichtfelder:** Standort gesetzt, Event-`started_at` gesetzt; pro Application: `started_at` + Recipient.
2. **Konsistenz:**
   - Event: `ended_at >= started_at`, falls beide gesetzt.
   - Applications: `ended_at >= started_at`, falls beide gesetzt.
   - Applications: `started_at >= event.started_at` und `ended_at <= event.ended_at`, falls beide Event-Grenzen gesetzt.
   - Applications: nicht-überlappend in Reihenfolge ihrer `started_at`. `app[i].ended_at <= app[i+1].started_at`. Bei Verletzung: präzise Zeile + Lücke benannt.
Validierung läuft synchron im Submit-Handler, nicht reactive — ergibt klare Toast-Sammelmeldung („3 Probleme: …") plus per-Zeile-Markierung.

**F. Server-vergebene `sequence_no`.**
Der Client sortiert die Applications beim Submit nach `started_at` und sendet sie mit lokaler `sequence_no = index+1`. Backend überschreibt die Nummer wie immer (ADR-029 §sequence_no). Heißt: die UI zeigt ein „Nr."-Label nicht — die Reihenfolge ergibt sich beim Speichern aus der `started_at`-Sortierung.

**G. Schreibpfad: dieselbe RxDB-Insertion wie Live.**
`database.events.insert(...)` mit den editierten Zeitstempeln, dann sequenziell `database.applications.insert(...)` pro Anwendung. Auto-Participant-Trigger und Sync-Replication funktionieren unverändert. Offline-Fähigkeit kommt damit kostenlos: Backfill-Inserts landen erst in IndexedDB, dann beim nächsten Push auf dem Server.

**H. Dashboard-Schalter.**
Auf der Startseite (`(protected)/page.tsx`) wird der bestehende „Neues Event starten"-Button als primärer Call-to-Action belassen; daneben kommt ein sekundärer Button „Nachträglich erfassen" mit ghost/secondary-Variante. Roll-out-Sichtbarkeit für Editor und Admin (analog Live-Form); Viewer sehen den Schalter nicht.

**I. Bestehende Routen unverändert.**
Keine Backend-Änderung, keine API-Vertragsänderung. Backend RLS und Sync-Push akzeptieren Events mit beliebigen Zeitstempeln (ADR-029 §immutable-after-create — der erste Push fixiert; spätere Edits sind M5c.4-Territorium).

**J. Tests.**
- `tests/event-backfill-form.test.tsx`: Pflichtfeld-Validierung (Standort fehlt, started_at fehlt), Konsistenz-Validierung (`ended_at < started_at`, App-Überlappung), erfolgreicher Submit-Flow mit zwei Applications (verifiziert RxDB-Insertion und sortierte sequence_no), Recipient-Default (Self-Bondage wenn Recipient leer).
- Dashboard-Test (`tests/dashboard-buttons.test.tsx` — neu): die zwei Buttons existieren für Editor/Admin, fehlen für Viewer. Falls die Snapshot-Pflege zu sperrig wird, kann dieser Test auch entfallen — der Live-Button-Pfad ist bereits implizit getestet.

**K. Validierungs-Helper als reine Funktion.**
`lib/event-backfill-validation.ts`: `validateBackfill(input): { valid: true } | { valid: false; errors: BackfillError[] }`. Trennt Validierung von der Komponente — testbarer und in M5c.4 (Edit-UI) wiederverwendbar.

### Verworfene Alternativen

- **Mode-Prop auf `EventCreateForm`:** Hätte einen Toggle in einer Komponente erfordert, mit konditionalen Inputs und Submit-Pfaden. Schnell unübersichtlich. Eigene Komponente bleibt schlanker.
- **react-hook-form + zod:** Beide Bibliotheken sind bereits Deps, würden aber das bestehende `EventCreateForm`-Pattern (raw `useState` + Submit-Validierung) brechen. Konsistenz schlägt Eleganz hier.
- **Custom Calendar-Picker-Lib:** Neuer Dev-Dep nicht gerechtfertigt für eine niedrigfrequente Erfassung. Browser-natives `datetime-local` reicht.
- **Sequenz-Editor mit Drag-and-Drop:** Über-engineered. Beim Submit nach `started_at` sortieren ist deterministisch und scheidet Anwender-Fehlbedienung aus.

### Folge-Arbeit

- M5c.4 (Bearbeitung) kann den `validateBackfill`-Helper für die Edit-UI wiederverwenden.
- Spätere UI-Iteration kann `EventCreateForm` und `EventBackfillForm` zu einem gemeinsamen Skelett zusammenfassen, sobald die Anforderungen stabilisiert sind.

---

## ADR-040 — Implementierungsstrategie M5c.4 (Edit-UI mit RxDB-Push, Soft-Delete, RBAC)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
M5c.1–M5c.3 haben Read-Pfad und Backfill-Anlage abgedeckt; M5c.4 schließt M5c mit der Bearbeitung bestehender Events und Applications. Mutationen laufen gemäß ADR-036 §C ausschließlich über RxDB-Push; die in M3 erstellten REST-PATCH-Endpoints bleiben für SQLAdmin/Admin-Workflows erhalten, werden aber vom Frontend nicht mehr genutzt.

### Entscheidungen

**A. Eigene Route `/events/[id]/edit` (ADR-036 §D bestätigt).**
`(protected)/events/[id]/edit/page.tsx` neu; Detail-Page bleibt read-only. Der Edit-Pfad spiegelt das Routing aus `architecture.md` § Routing („/events/[id]/edit — Bearbeiten"). RBAC-Gate via Server-Redirect: anonyme User → `/login?next=…`; Viewer → `/?error=role`; Editor mit fremdem Event → `/events/{id}` (Read-only-Detail).

**B. RBAC-Helper `canEditEvent(user, event)` als reine Funktion.**
`frontend/src/lib/rbac.ts` (neu) liefert `canEditEvent({ role, id }, { created_by })`:
- `role === "admin"` → `true`.
- `role === "editor"` und `created_by === user.id` → `true`.
- sonst → `false`.
Gleiche Logik landet im Edit-Button-Conditional auf der Detail-Page **und** im Server-Redirect der Edit-Page. Eine reine Funktion macht beide Pfade testbar und konsistent.

**C. Editierbare Felder folgen ADR-029 (Conflict-Resolution).**
Nicht alle Felder sind editierbar — die in ADR-029 als `immutable-after-create` markierten bleiben read-only:
- **Event editierbar:** `note` (LWW), `reveal_participants` (LWW), `ended_at` (FWW — nur setzbar, wenn aktuell `null`).
- **Event read-only:** `lat`, `lon`, `started_at`, `created_by`, `created_at`, `updated_at`.
- **Application editierbar:** `note` (LWW), `recipient_id` (LWW), `ended_at` (FWW — nur setzbar, wenn aktuell `null`).
- **Application read-only:** `started_at`, `event_id`, `sequence_no`, `performer_id` (Performer-Wechsel ändert Semantik „wer hat es gemacht" zu stark; bewusst nicht in M5c.4), Position-FKs (`arm_position_id`, `hand_position_id`, `hand_orientation_id`) — UI-Komplexität bei drei Katalog-Pickern; Schritt für M6/M7 oder einen späteren Sub-Schritt.
Die Position-FKs sind technisch LWW per ADR-029, werden aber **nicht** im Edit-UI exponiert — `_deleted` und neu setzen ist der Pfad, falls Korrektur nötig wird. Dokumentiert in §C, sodass der Scope explizit ist.

**D. Soft-Delete via `doc.patch({ _deleted: true })`.**
Sowohl Event- als auch Application-Soft-Delete erfolgen direkt über die RxDB-Mutation (nicht über REST DELETE). Cascade-Trigger (`cascade_event_soft_delete`, ADR-030/ADR-037 §C) sorgt server-seitig dafür, dass Applications und EventParticipants automatisch tombstoned werden, sobald das Event-Tombstone synchronisiert ist. Restore (`true → false`) ist Admin-only per ADR-029 und in M5c.4 **nicht** im UI exponiert — der Pfad ist absichtlich asymmetrisch (Löschen einfach, Wiederherstellen bewusst Hürde).

**E. Confirmation via `window.confirm`.**
Bewusste Reduktion: Pfad-A-Gruppe ist <20 User, native Browser-Bestätigung ist barrierefrei und kostet keine neue UI-Library. Eine schicke Custom-Dialog-Komponente kann später in einer UI-Iteration nachgelegt werden, ohne die Edit-Logik zu ändern. Im Code: `if (!window.confirm("Event endgültig löschen?")) return;`. Umgehbarer Edge-Case (User dismisst): klar dokumentiert, keine Datenverluste.

**F. Submit-Pfad: Diff-basiertes Patchen.**
`EventEditForm` lädt Event und Applications einmal aus RxDB beim Mount in lokalen State (Single-Read, **keine** Subscription während der Edit-Session, damit gleichzeitige Sync-Pull-Updates die Eingabe nicht clobbern). Beim Submit:
1. Vergleicht lokalen State mit RxDB-Initialwerten.
2. Patch-Calls nur für Docs mit Änderung.
3. Soft-Delete-Aktionen sind separat und sofort (nicht im Submit-Pfad gebündelt) — Click → confirm → `doc.patch({ _deleted: true })` → Liste aktualisiert sich reactive (Application) bzw. Page navigiert weg (Event).

**G. Validierung: `validateBackfill`-Wiederverwendung.**
ADR-039 §K hat das vorausgesehen. Der Edit-Form ruft `validateBackfill` mit den aktuellen Werten auf — `started_at` der Apps und des Events ist immutable, also identisch zu den RxDB-Originalwerten; nur `ended_at` und Recipient ändern sich. Konsistenz-Verstöße (z. B. neuer `ended_at` vor `started_at`, oder ended_at überlappt mit nächster App) werden inline gemeldet. Kein zweiter Validator nötig.

**H. Edit-Button in `EventDetailView`.**
Sichtbar wenn `canEditEvent(user, event)`. Kleines Icon-Button-Trio in der Status-Card-Header-Zeile (oder unter der CardDescription). Routing per `Link` zu `/events/[id]/edit`. `data-testid="edit-event-button"` für Tests.

**I. Tests.**
- `tests/rbac.test.ts` (neu): `canEditEvent` für die drei Rollen + Edge-Case (admin sieht eigene und fremde, editor nur eigene, viewer nie).
- `tests/event-edit-form.test.tsx`: Render mit pre-filled values aus RxDB-Mock; Submit ruft `doc.patch` nur für geänderte Felder; Soft-Delete-Button (mit gemocktem `window.confirm`) ruft `doc.patch({_deleted: true})`; immutable Felder sind read-only oder nicht im DOM.
- `tests/event-detail-view.test.tsx`: Erweiterung um Edit-Button-Sichtbarkeit (Editor own / Editor fremd / Admin / Viewer).
- Coverage `lib/rxdb/**` bleibt aktiv.

**J. Backend bleibt unangetastet.**
Keine neuen Endpoints, keine Migrations, keine RLS-Anpassung. Soft-Delete der Application via Sync-Push triggert das bestehende ADR-029-Verhalten („`_deleted` true ist LWW-Übergang"). Das Cascade-Trigger-Verhalten von M5b.1/M5c.1b deckt Event-Soft-Delete ab.

**K. Position-FK-Editing als bewusste Lücke.**
Wenn ein Editor bemerkt, dass die Position falsch ist, ist der dokumentierte Workaround: Application soft-deleten, neue erfassen. Im Live-Modus ist das zumutbar; im Backfill ohnehin. Eine spätere UI-Iteration kann Position-Picker im Edit-Form nachreichen, sobald die Kategorie-Auswahl-Komponente aus M7 (Katalog-Verwaltung) ausgereift ist.

### Verworfene Alternativen
- **Inline-Edit-Modus auf der Detail-Page** statt eigene Route: doppelt der UI-Komplexität, harder zu testen — ADR-036 §D-Begründung gilt unverändert.
- **Custom-Confirm-Dialog mit shadcn/ui-`Dialog`**: würde eine neue UI-Komponente ergänzen. Für M5c.4-Scope übertrieben; `window.confirm` reicht.
- **Restore-UI für Admin im Edit-Form**: erweitert die Komplexität um eine asymmetrische Operation, die nur einmal im Admin-Workflow gebraucht wird. Bleibt M8 (Admin-Bereich) vorbehalten.
- **Live-Subscription während der Edit-Session**: bringt Race-Condition-Komplexität (gleichzeitige Pulls clobbern Eingaben). Single-Read beim Mount ist robuster.

### Folge-Arbeit
- M8 (Admin-Bereich) bringt Restore-UI für soft-gelöschte Events/Applications.
- Spätere UI-Iteration kann Position-FK-Picker im Edit-Form nachreichen (siehe §K).

---

## ADR-041 — Implementierungsstrategie M6 (Kartenansicht: MapView, Cluster, Filter, Geocoding)

**Status:** Accepted
**Datum:** 2026-04-27

### Kontext
M5c ist abgeschlossen. M6 liefert die volle Kartenansicht: Marker aller sichtbaren Events, Popup mit Link zur Detail-Seite, Clustering bei hoher Dichte, Filter nach Zeitraum und Beteiligten, URL-persistierter Viewport, Geocoding-Suche. MapLibre/`react-map-gl`/Tile-Proxy sind über ADR-022 in M5a vorgezogen; `LocationPickerMap` existiert. Der Geocoding-Proxy ist in `architecture.md` §API-Vertrag spezifiziert, aber noch nicht implementiert. Diese ADR legt Sub-Step-Reihenfolge, Cluster-Mechanik, Rate-Limit-Strategie und Komponenten-Aufteilung fest.

### Entscheidungen

**A. Sub-Step-Bündel M6.1 … M6.5.**
M6 wird in fünf eigenständige Schritte zerlegt, jeder mit eigener DoD und eigenem Commit.
- **M6.1** Backend Geocoding-Proxy (`GET /api/geocode`).
- **M6.2** Frontend `MapView`-Komponente (Marker aus RxDB, Popup, Detail-Link).
- **M6.3** Clustering (native MapLibre-Cluster, siehe §C).
- **M6.4** Filter (Zeitraum, Beteiligte) + URL-persistierter Viewport.
- **M6.5** Geocoding-Suchbox in `MapView` (konsumiert M6.1).

**B. Geocoding-Proxy: Signatur und Verhalten.**
- Pfad: `GET /api/geocode?q=<text>&proximity=<lat>,<lon>&limit=<n>`.
- Auth: `current_active_user` (analog Tile-Proxy, ADR-024 §C). Anonyme Anfragen → 401.
- Upstream: `https://api.maptiler.com/geocoding/{quote(q)}.json?key=<key>&proximity=<lon,lat>&limit=<n>&language=de`.
- `proximity` optional; Validierung: zwei Floats, durch Komma getrennt, sonst 422.
- `limit` optional, Default 5, Range 1–10.
- Fehlende API-Key-Konfiguration → 503 (analog Tile-Proxy).
- Upstream-Fehler / Timeout → 502.
- Antwort: 1:1 durchgereichtes MapTiler-GeoJSON (FeatureCollection); kein Re-Mapping, weil das Frontend die `features[].center` und `place_name` direkt nutzt. Der Schritt gilt als reiner Proxy.
- Cache-Control: `private, max-age=300` (5 min) — Adressen sind nicht so flüchtig, Eingaben werden client-seitig debounced.
- HTTPX-`AsyncClient` als Process-Singleton via `lru_cache`, identisches Pattern wie Tile-Proxy.

**C. Clustering: native MapLibre-Cluster statt `supercluster` (Architektur-Update).**
`architecture.md` listet bisher `supercluster` als Cluster-Library. Die Entscheidung in M6 ist, **nativ über MapLibre-`cluster: true`-Source** zu clustern statt eine zusätzliche Dependency aufzunehmen.
- MapLibre rendert Cluster über GeoJSON-Source mit `cluster: true`, `clusterRadius`, `clusterMaxZoom`.
- Pfad-A-Datenmenge < 5.000 Events → MapLibre-Cluster reicht klar aus.
- Eine Dependency weniger → kleineres Frontend-Bundle, weniger Lizenz-Audit-Aufwand, kein zusätzlicher Test-Setup für `supercluster`.
- Gleicher visueller Effekt: Kreis mit Anzahl, Klick zoomt rein.
- `architecture.md` §Karten-Komponente wird in derselben Änderung auf „MapLibre-native Cluster" angepasst.
- Falls in Phase 2 oder Pfad B serverseitiges Clustern nötig wird, kann `supercluster` zu dem Zeitpunkt nachgezogen werden — keine vorzeitige Investition.

**D. Rate-Limit Geocoding: in-memory Token-Bucket pro User-ID.**
- Default: 30 Anfragen / 60 s pro `user.id`.
- Konfigurierbar über `HCMAP_GEOCODE_RATE_PER_MINUTE` (Default 30), `0` = aus.
- In-memory `dict[user_id, deque[timestamp]]`, Worker-lokal, Test-injizierbar (analog `_http_client`).
- Bei Überschreitung: 429 Too Many Requests + `Retry-After`-Header in Sekunden.
- Bewusst kein Redis: <20 User, Single-Worker-Deployment, in-memory reicht. Bei Wechsel auf Multi-Worker / Pfad B wird ein Backend-Store nachgezogen — als bekannte Limitation in `architecture.md` §Externe Abhängigkeiten dokumentiert.

**E. `MapView` als neue Komponente, `LocationPickerMap` bleibt eigenständig.**
- `components/map/map-view.tsx` neu (Vollbild-Karte mit Markern, Popups, Clustering, Filter-Panel, Geocoding-Box).
- `LocationPickerMap` bleibt unverändert (Single-Marker-Picker für Live-Modus / Edit-UI). Kein Refactor, kein Wrapper.
- Gemeinsame Helper (Tile-Style, Default-Center) bleiben in `lib/map`. Falls beim Bauen von `MapView` ein weiterer Helper offensichtlich wiederverwendbar wird, wandert er ebenfalls dorthin — kleiner, lokaler Refactor (autonomiebereich).

**F. Marker-Datenquelle: RxDB-Subscription auf `events`-Collection.**
- `MapView` abonniert `events` live (analog Dashboard-Liste).
- Filter (`_deleted=false`, gültige `lat`/`lon`) clientseitig.
- Bei <5.000 Events ist eine clientseitige Filterung pro Re-Render unproblematisch (memoisiert via `useMemo` über die Filter-Inputs).
- Keine REST-Round-Trips für Marker → Karte funktioniert offline (Geocoding und Tiles bleiben online-only, Toast-Hinweis).

**G. Popup-Inhalt.**
- `started_at` (lokales Format, dateutil-Pattern aus `lib/format-date`).
- Adressen-Stub: keine Reverse-Geocoding-Anfrage (Kosten / Privacy); Plus-Code aus `lat`/`lon` lokal berechnet.
- Recipient-Name nur, wenn `event.reveal_participants === true` ODER aktueller User ist beteiligt — gleiche Logik wie `EventDetailView` (ADR-038 §F). Sonst „Beteiligte: ausgeblendet".
- Link „Detailseite öffnen →" zu `/events/[id]` (Next.js `<Link>`).

**H. URL-State-Schema.**
- Viewport: `?lat=<n>&lon=<n>&zoom=<n>` (drei Floats).
- Zeitraum-Filter: `&from=<ISO-Date>&to=<ISO-Date>` (jeweils optional, beide unabhängig).
- Beteiligte-Filter: `&p=<id>,<id>,...` (komma-separierte UUIDs).
- Sync via `useSearchParams` + `router.replace` (debounced 300 ms, kein Push, damit Browser-Back nicht jeden Pan/Zoom-Schritt aufzeichnet).
- Beim Laden ohne Parameter: `DEFAULT_MAP_CENTER` aus `lib/map`, Zoom 11.

**I. Filter-UI.**
- Zeitraum: zwei Datepicker (HTML `<input type="date">`, kein zusätzliches UI-Lib).
- Beteiligte: Multi-Select aus `event_participant`-Collection (RxDB), gruppiert nach Person. Implementierung als shadcn/ui-`Popover` mit Checkbox-Liste (UI bleibt stack-konform).
- Filter-State leitet sich aus URL-Params ab (Single Source of Truth = URL); UI-Inputs sind controlled gegen URL.

**J. Geocoding-Suchbox.**
- Eingabefeld oben links, Debounce 300 ms.
- API-Call: `GET /api/geocode?q=<text>&proximity=<viewport-center>&limit=5`.
- Treffer-Liste als Dropdown; Auswahl ruft `map.flyTo({ center, zoom: 14 })` auf.
- Kein Persistieren des Treffer-Markers; reine Navigations-Hilfe.
- 429 / 503 / 502 → `sonner`-Toast mit klartextlicher Begründung; Karte funktioniert weiter.
- Leere Eingabe → keine Anfrage.

**K. Tests.**
- **Backend M6.1:** `tests/test_geocode_proxy.py` mit (1) anonym → 401, (2) fehlender Key → 503, (3) erfolgreicher Treffer → 200 + GeoJSON, (4) Upstream-Fehler → 502, (5) Rate-Limit → 429 + `Retry-After`, (6) `proximity`-Format-Validierung → 422, (7) `limit`-Range → 422.
- **Frontend M6.2 ff.:** Smoke-Test `MapView` mit gemockter RxDB (analog `EventDetailView`); Filter-Reducer als pure-function-Test; URL-Sync-Test mit gemocktem `useSearchParams`/`router.replace`; Geocoding-Suchbox-Test (Debounce, Toast bei 429, flyTo bei Treffer-Klick).
- WebGL-Render-Tests in jsdom bleiben ausgespart (siehe ADR-027 §J2-Begründung).
- Coverage `lib/rxdb/**` ≥ 80 % bleibt aktiv; Coverage-Schwelle für `lib/map/**` neu: ≥ 70 % Lines (sofern reine Logik-Helper getestbar sind, MapLibre-Wrapper-Code bleibt davon ausgenommen).

**L. RxDB-Schemas / Backend-Datenmodell unverändert.**
M6 nutzt nur bestehende Collections (`events`, `event_participant`, `applications`, `restraint_types`, `arm_positions`, `hand_positions`, `hand_orientations`). Keine Migrations, keine Schema-Änderungen, keine RLS-Anpassung. Geocoding-Treffer landen nicht in der DB.

**M. ENV-Variablen.**
- `HCMAP_MAPTILER_API_KEY` (existiert): wird auch für Geocoding wiederverwendet.
- `HCMAP_GEOCODE_RATE_PER_MINUTE` (neu, Default 30, `0` deaktiviert): Token-Bucket-Limit.
- `.env.example` wird in M6.1 entsprechend ergänzt.

### Verworfene Alternativen
- **`supercluster` als Frontend-Dependency** (laut bestehender architecture.md §Karten-Komponente): bringt für Pfad-A-Datenmenge keinen Mehrwert gegenüber MapLibre-nativem Cluster, kostet Bundle-Größe und Audit-Aufwand. Architektur wird angepasst.
- **Geocoding-Treffer in DB cachen**: Datenschutz-Risiko (Suchanfragen sind sensibel) ohne klaren Performance-Vorteil bei <20 Usern. Verworfen.
- **Reverse-Geocoding für Popup-Adresse**: zusätzliche MapTiler-Anfragen pro Marker-Klick → Kosten / Privacy. Plus-Code reicht.
- **Filter-State als RxDB-Collection**: über-engineered. URL-State ist serverlos, teilbar, browser-historie-kompatibel.
- **Zwei separate Pages für Karte und Liste**: Liste existiert bereits am Dashboard (M5a.2); Karte fokussiert sich auf den Karten-Use-Case.
- **Marker via REST statt RxDB**: Karte verlöre Offline-Fähigkeit. RxDB ist die etablierte Quelle.
- **Redis-basiertes Rate-Limit**: nicht nötig in Single-Worker-Pfad-A; Aufwand > Nutzen.

### Folge-Arbeit
- M12 (Self-Hosted Tileserver): `MapView`-Tile-URL bleibt unverändert (`/api/tiles/...`), Backend-Proxy-Ziel ändert sich → kein Frontend-Refactor.
- M7 (Katalog-Verwaltung) ist orthogonal; M6 nutzt keine Katalog-Editor-UI.
- M17 (Statistik-Dashboard) kann später aggregierte Heatmap-Layer auf `MapView` aufsetzen — nicht in M6-Scope.

---

## ADR-042 — Sonner-Major-Upgrade (v1.7.4 → v2.x) für React-19-Kompatibilität

**Status:** Accepted
**Datum:** 2026-04-29
**Kategorie:** Externe Abhängigkeit, Major-Version-Update mit Breaking Changes (CLAUDE.md §4.3)

### Kontext
Im laufenden Betrieb wurde festgestellt, dass keiner der `toast.error` / `toast.success`-Aufrufe im Browser sichtbar wird. Reproduktion: `/login` mit falschem Passwort → kein Toast trotz `toast.error(...)`-Aufruf in `login-form.tsx:51`. DOM-Inspektion zeigt, dass der `<Toaster />`-Container in `frontend/src/components/providers.tsx` nur das nackte Wrapper-Element `<section aria-label="Notifications alt+T">` rendert, ohne den `<ol data-sonner-toaster>`-Child. Der `useLayoutEffect(() => setMounted(true))`-Branch von Sonner v1 mountet unter React 19 nicht zuverlässig.

`sonner@^1.7.4` ist im `frontend/package.json` festgelegt (M4-Setup, ADR-021). React steht auf 19.0.0 (Next.js 15). Sonner v1 wurde vor React 19 veröffentlicht; v2 (Januar 2025) ist die offizielle React-19-kompatible Version.

### Entscheidungen

**A. Sonner auf neueste 2.x upgraden.**
- `sonner` von `^1.7.4` auf `^2.x` heben.
- Aufrufmuster im Repo sind ausschließlich `toast.error(title, { description })` und `toast.success(title, { description })` (zwölf Komponenten, alle mit `grep "toast\."` inventarisiert). Diese Signatur ist in v2 unverändert.
- `<Toaster richColors closeButton position="top-right" />`-Props bleiben in v2 erhalten.
- `toastOptions.classNames`-Mapping (siehe `components/ui/sonner.tsx`) bleibt erhalten; nur ein Style-Smoke-Check beim Browser-Verify.
- Kein Aufruf von `toast.promise()` im Repo — die in v2 angepasste Signatur trifft uns nicht.

**B. Verifikations-Scope.**
Verifiziert wird an den existierenden Toast-Aufrufstellen:
- `login-form.tsx` (Auth-Fehler).
- `logout-button.tsx` und `user-menu.tsx` (Logout-Fehler).
- `pin-settings.tsx` (PIN-Validierung, Erfolg, Fehler).
- `geocode-search-box.tsx` (429 / 503 / 502).
- `event-create-form.tsx`, `event-edit-form.tsx`, `event-backfill-form.tsx`, `event-detail-view.tsx`, `application-start-sheet.tsx`, `person-quick-sheet.tsx`.

Die in der ursprünglichen Repro genannten M7.3-Komponenten (`lookup-form.tsx`, `restraint-type-form.tsx`) und die Admin-Catalog-Routen existieren im aktuellen Repo-Stand noch nicht (M7 ist `[OFFEN]`). Verifikation der Catalog-409-Toasts erfolgt mit M7 selbst.

**C. Tests.**
Alle Vitest-Suites mocken `sonner` per `vi.mock("sonner", ...)`. Das Major-Update am realen Modul ändert die Mocks nicht. Erwartung: alle bestehenden Tests bleiben grün.

**D. ADR-021-Konsistenz.**
ADR-021 nennt Sonner als gewählte Toast-Lib (M4-Frontend-Grundgerüst). Die Wahl bleibt; nur die Major-Version wird gehoben. Kein neuer ADR-Konflikt.

### Verworfene Alternativen
- **Eigene Toast-Implementierung auf Radix-Toast aufbauen:** zu viel Code für ein Versions-Inkompatibilitätsproblem.
- **React 18 Downgrade:** verstößt gegen `project-context.md` (Next.js 15 + React 19 fixiert).
- **Bei Sonner 1.x bleiben:** Toasts würden weiterhin nicht angezeigt — Symptom unverändert.

### Lessons Learned

**Beobachtung:** Die Sonner-/React-19-Inkompatibilität wurde erst beim manuellen UI-Test im Browser entdeckt — nicht bei der ursprünglichen Auswahl in M4 (ADR-021). Tests konnten den Defekt nicht aufzeigen, weil Sonner in allen Vitest-Suites per `vi.mock("sonner", …)` gemockt ist; die reale `<Toaster />`-Mount-Pipeline lief deshalb in keinem automatisierten Lauf durch.

**Ableitung:**
1. Bei der initialen Auswahl externer Abhängigkeiten in M4 wurde die React-19-Kompatibilität von `sonner` nicht explizit gegen die Stable-Version geprüft. Die zum Zeitpunkt aktuelle 1.7.4 deckte React 19 nicht ab.
2. Frontend-Komponenten, die auf clientseitige Effekte angewiesen sind und im Test-Setup gemockt werden, brauchen mindestens einen End-to-End-Smoke (Browser-Run) als DoD-Bestandteil. Ein „grünes" Vitest-Ergebnis ist für diese Komponenten kein hinreichender Funktionsnachweis.

**Abgeleitete Regeln (gelten ab dieser ADR):**
- **Regel 1 — Abhängigkeits-Vorprüfung:** Bei der Aufnahme einer Frontend-Library, die ein React-Mount-Verhalten implementiert (Toast-, Modal-, Tooltip-, Animation-Libs), wird in der zugehörigen ADR explizit die Kompatibilität zur fixierten React-Major-Version festgehalten. Quelle: README / Changelog der Library, nicht Annahme.
- **Regel 2 — Browser-Smoke als DoD-Eintrag:** Komponenten mit gemocktem Mount-Verhalten (Toaster, Drawer, Map, RxDB) bekommen in der Implementierungs-ADR einen Browser-Verify-Schritt als DoD-Punkt — analog wie ADR-021 §M (Browser-Smoke-Test) für die Login-Flow-Verifikation, aber auch für UX-Feedback-Pfade.

### Folge-Arbeit
- README-Badges: keine Änderung notwendig (Sonner taucht in README nicht als Badge auf).
- M7 (`[OFFEN]`) verifiziert die Catalog-409-Toasts beim Bauen der Forms.
- ADR-021 und ADR-026 bleiben inhaltlich gültig; das ergänzte Lessons-Learned-Regelwerk gilt für künftige ADRs (M7 ff.).

---

## ADR-043 — Implementierungsstrategie M7 (Katalog-Verwaltung, Vorschlags-Workflow, Reject-Status)

**Status:** Accepted
**Datum:** 2026-04-28
**Vorgänger:** ADR-018 (RLS-Default), ADR-020 (Domain-API).
**Bezug:** Fahrplan M7.

### Kontext

M7 schließt den seit M3 vorbereiteten Vorschlags-Workflow für die vier Katalog-Tabellen ab und liefert die zugehörige UI. Backend hat bereits Models (`app/models/catalog.py`), Routes (`POST /<kind>`, `POST /<kind>/{id}/approve`, `GET /<kind>`), Service (`app/services/catalog.py`) und RLS-Policies aus M2-Migration `20260425_1730_strict_rls_policies`. Was fehlt: Admin-Update, Reject-Pfad, Editor-Withdraw, sowie das komplette Frontend (`/admin/catalogs`).

Die Entscheidungspunkte, die der semi-autonome Modus blockiert hat, wurden im Komplettfreigabe-Block am 2026-04-28 als **Option A** angenommen.

### Entscheidung

**A. Reject-Workflow via Status-Erweiterung.**
- Postgres-Enum `catalog_status` wird um den Wert `rejected` erweitert (ALTER TYPE … ADD VALUE).
- Drei neue Spalten pro Katalog-Tabelle: `rejected_by uuid` (FK → user.id, ON DELETE SET NULL), `rejected_at timestamptz`, `reject_reason text`.
- Reject ist ein Status-Übergang `pending → rejected` durch Admin via `POST /<kind>/{id}/reject` (Body `{ "reason": "<text>" }`); kein Hard-Delete.
- Vorschlagender Editor sieht eigene rejected-Rows weiterhin (Lerneffekt mit Begründung), Viewer/andere Editoren nicht.
- Rejected → Pending oder Rejected → Approved sind aus M7-Scope ausgeklammert (keine UI; per SQLAdmin im M8 erreichbar).

**B. Admin-Update via PATCH `/<kind>/{id}` (alle Felder).**
- Admin-only.
- Editierbar: alle Identitäts- und Display-Felder. Konkret RestraintType: `category`, `brand`, `model`, `mechanical_type`, `display_name`, `note`. Lookup-Tabellen: `name`, `description`.
- Status-Feld kann via PATCH **nicht** gesetzt werden — Status-Übergänge laufen ausschließlich über die dedizierten `/approve` und `/reject`-Endpoints, damit Audit-Felder (`approved_by` / `rejected_by` / `reject_reason`) konsistent gesetzt werden.
- UNIQUE-Konflikt (RestraintType: `(category, brand, model, mechanical_type)`; Lookups: `name`) → 409 mit Klartext-Body.
- `updated_at` wird gesetzt.

**C. Editor-Self-Service: Withdraw eigener pending-Vorschläge.**
- `DELETE /<kind>/{id}` ist erlaubt für Admin (jeder Status) und Editor (nur eigene `status='pending'`-Rows). Hard-Delete, kein Soft-Delete — Tombstone-Replikation gibt es für Katalog nicht.
- RLS-Policy `<table>_owner_modify` ergänzt UPDATE/DELETE auf eigene pending-Rows; PATCH durch Editor auf eigene pending-Rows ist **nicht** Teil von M7 (Workaround: Withdraw + Neuvorschlag).
- Editor sieht eigene rejected-Rows weiter (Reichweite der bestehenden `<table>_select`-Policy auf `suggested_by = current_user_id` wird erweitert: `status IN ('pending','rejected')`).

**D. Sub-Step-Schnitt.**

| Sub-Step | Inhalt | Abschluss-Kriterium |
|---|---|---|
| M7.1 | Migration (`catalog_status` += rejected, neue Spalten, RLS-Policy-Erweiterung), Models/Schemas, Service-Funktionen für reject/withdraw/update, Routes (PATCH/DELETE/reject), Backend-Tests | `pytest -k "catalog or rls"` grün, Migration up/down sauber, Drift-Test grün |
| M7.2 | Frontend `/admin/catalogs` Übersichtsseite mit Tab-Navigation für die vier Katalog-Typen, Listing-Tabelle pro Typ mit Status-Filter (approved/pending/rejected), Sortierung, Paging | Admin sieht alle Einträge; Filter funktioniert; Editor sieht approved + eigene pending/rejected |
| M7.3 | CRUD-Formulare: Admin-Create, Admin-Edit (mit UNIQUE-Konflikt-Toast), Editor-Vorschlags-Form (mit Vorbelegung von `status=pending`); Routing `/admin/catalogs/<kind>/new` und `/admin/catalogs/<kind>/<id>/edit` | Admin und Editor können erfolgreich anlegen und ggf. updaten |
| M7.4 | Freigabe-Queue auf `/admin/catalogs` (oder separater Tab „Pending"): Approve-Button, Reject-Button mit reject_reason-Dialog; Editor-Self-Service: Withdraw-Button auf eigenen pending-Rows | Admin kann pendings durchklicken und reject_reason erfassen; Editor kann eigene zurückziehen |
| M7.5 | Restraint-Picker (Multi-Select mit Typeahead, Quick-Propose) im Application-Erfassen-Pfad (Live + Backfill); approved-RestraintTypes erscheinen, Editor-Quick-Propose öffnet Mini-Form. Position-Picker ist explizit aus dem Scope (M5c.4-Followup) | Anwender kann in Live/Backfill RestraintTypes pro Application zuordnen, neue spontan vorschlagen |

**E. Frontend-Datenfluss.**
- Katalog-Daten **nicht in RxDB** — Read-Path: TanStack-Query gegen `GET /api/<kind>?status=...` mit hierarchischen Cache-Keys `['catalog', kind, { status }]`. Begründung: Katalog ist nahezu statisch, klein (<200 Rows), Offline-Bedarf ist gering — Live-Modus braucht nur die approved-Liste, die einmal beim Mount geladen und cached wird.
- Für M7.5 (Restraint-Picker im Live-Modus) gilt: Beim ersten Laden des Picker-Sheets wird die RestraintType-Liste mit `staleTime: 5 min` gecached. Offline funktioniert der Picker mit der zuletzt geladenen Liste; bei vollständigem Cold-Start ohne Netz ist der Picker leer (akzeptiert in Pfad A — wird im Einwilligungstext als bekannte Einschränkung benannt).
- Mutation-Flow nach POST/PATCH/Approve/Reject/Delete: `queryClient.invalidateQueries(['catalog', kind])`.

**F. Routes-Layout (`/admin/catalogs`).**
- `/admin/catalogs` — Redirect zu `/admin/catalogs/restraint-types` (erste Tab-Spalte).
- `/admin/catalogs/[kind]` — Listing + Filter; Tab-Navigation oben (4 Typen), Status-Filter rechts. „Neuen Eintrag vorschlagen"-Button.
- `/admin/catalogs/[kind]/new` — Form (Admin: kann `status=approved` direkt setzen via `directly_approve`-Toggle? **Nein in M7 — Admin-Create geht erst über pending oder über separaten Approve-Schritt**. Vereinfachung: Admin-Create erzeugt `status=approved` automatisch (RLS erlaubt das). Editor-Create erzeugt `status=pending`).
- `/admin/catalogs/[kind]/[id]/edit` — Form für Admin-Edit; Editor sieht read-only (eigene pending mit „Withdraw"-Button, fremde gar nicht erreichbar).
- Server-Side-RBAC-Gate: `/admin/catalogs/**` setzt Mindestrolle Editor; Admin-Only-Routes (`new` + `edit` + `approve`/`reject`-Buttons) prüfen on-demand.

**G. RBAC-Gate-Helper.**
- Wir erweitern `frontend/src/lib/rbac.ts` um `canApproveCatalog(role)`, `canEditCatalogEntry(role, entry, currentUserId)`, `canWithdrawCatalogEntry(role, entry, currentUserId)`. Damit hat das Frontend eine eindeutige Quelle für die Sichtbarkeit der Aktionen, parallel zu `canEditEvent` aus M5c.4.

**H. Tests.**

Backend:
- `tests/test_catalog_workflow.py` — Reject-Endpoint pro Katalog-Tabelle (Admin success, Editor 403, kein-Reason-Body 422); Withdraw (Editor success bei eigenem pending, Editor 403 bei fremdem pending, Editor 403 bei eigenem rejected/approved, Admin success); Admin-PATCH inkl. UNIQUE-409-Test; Admin-PATCH erlaubt Statusfeld nicht.
- `tests/test_rls.py` Erweiterung: rejected-Sichtbarkeit (Vorschlagender sieht eigene rejected; andere Editor sehen nicht; Viewer sehen nicht; Admin sieht alle).
- `tests/test_migration.py` (oder neue Datei): Up/Down-Roundtrip für M7.1-Migration. Da die Enum-Erweiterung `ADD VALUE` ist und Postgres-Enums kein `DROP VALUE` kennen, ist die Down-Strategie: Tabellen auf `pending`/`approved` zurücksetzen (rejected → pending), Spalten droppen, Enum komplett dropen und neu mit den ursprünglichen zwei Werten erstellen. Tests verifizieren die round-trippable Schema-Form, nicht die Daten-Konsistenz nach Down.

Frontend:
- `lib/rbac.ts` Unit-Tests für die drei neuen Helper.
- Page-Smoke-Tests für `/admin/catalogs/[kind]` (Mock TanStack-Query + Mock-Auth) — Listing, Filter, Approve-Klick.
- Form-Tests für Create/Edit mit Mock-API.
- Reject-Dialog-Test (reason-Pflichtfeld).
- M7.5: Restraint-Picker-Komponente Unit-Test (Suche, Auswahl, Quick-Propose-Submit).
- Coverage-Schwellen: `lib/rbac.ts` ≥ 90 %, neue Komponenten ≥ 70 % Lines.

**I. ENV-Variablen / Konfig.**
Keine. M7 ist reines Schema- und UI-Update.

**J. Architektur-/Doc-Updates.**
- `docs/architecture.md` §API/Kataloge: PATCH/DELETE/reject-Endpoints ergänzen. Hinweis: Live-Endpoint-Pfade sind `/api/restraint-types`, `/api/arm-positions`, `/api/hand-positions`, `/api/hand-orientations` — nicht `/api/catalogs/{kind}` wie früher skizziert. Doku wird auf Ist-Stand korrigiert (Drift-Fix nebenbei).
- `docs/architecture.md` §Frontend-Routing: `/admin/catalogs/[kind]` und Sub-Routen.
- `docs/architecture.md` §RLS: rejected-Sichtbarkeit, Owner-Modify-Policy.
- `CHANGELOG.md`: Eintrag pro Sub-Step.

### Konsequenzen

- Keine RxDB-Erweiterung — bewusste Asymmetrie zu Events/Applications/Participants. Vereinfacht Sync-Story.
- Migration ist nicht-destruktiv: bestehende Rows behalten ihren Status, neue Spalten sind nullable.
- `catalog_status`-Enum wächst von 2 auf 3 Werte; alle bestehenden Code-Pfade, die nur `'approved'`/`'pending'` prüfen, bleiben korrekt — neue Werte fallen automatisch in den „weder approved noch eigene pending"-Default und sind unsichtbar für Nicht-Vorschlagende.
- M7.5 schließt das letzte Live-Modus-Loch (RestraintType-Auswahl), das seit M5a.3 mit Notiz-Workaround offen war.
- M8 (Admin-Bereich) erbt einen kompletten Workflow für Catalogs; SQLAdmin kann reject- und withdraw-Aktionen ergänzend bedienen, ist aber nicht der primäre Pfad.

### Verworfene Alternativen

- **Reject = Hard-Delete (Option B aus Freigabeblock):** Vorschlagender erfährt nicht *warum* abgelehnt → Frust, Wiedervorschlag derselben Idee wahrscheinlich. Verworfen.
- **Reject = Soft-Delete (Option C):** unnötig komplex (zwei Booleans für „Status"), Kollision mit zukünftigem Rejected-zu-Pending-Reset.
- **Position-Picker im Edit-Form (M5c.4-Followup) in M7.5 mit aufnehmen:** dehnt Sub-Step zu sehr; M5c.4-ADR-040 §K hält die Beschränkung explizit fest. M7.5 fokussiert auf Restraint-Picker, der Position-Picker bleibt eigenes Sub-Step nach M7.
- **Katalog in RxDB promoten:** Sync-Schemas wachsen, Drift-Test wird teurer, Konflikt-Resolution für Katalog-Edits muss spezifiziert werden — Aufwand übersteigt Nutzen für <200 Rows mit nicht-Live-kritischem Edit-Pfad.
- **Status-Übergänge per generischem PATCH `/<id>` mit `status`-Feld:** Audit-Felder müssen in jedem Fall serverseitig gesetzt werden — dedizierte Endpunkte sind klarer, geben präzisere Fehler und ermöglichen Body-Validierung (reject_reason als Pflichtfeld).
- **`/api/catalogs/{kind}`-Sammelroute statt vier separater Router (wie in architecture.md skizziert):** existierender Code ist auf vier Router aufgeteilt und stabil; eine späte Vereinheitlichung würde nur Drift-Aufwand erzeugen.

### Folge-Arbeit

- **M8** (Admin-Bereich): SQLAdmin-Catalog-ModelViews bekommen die neuen Spalten; Workflow-spezifische UI auf `/admin-dash` kann auf den hier eingeführten Routen aufsetzen oder eigene Workflow-Aktionen ergänzen.
- **Position-Picker im Edit-Form** (M5c.4-Followup): kann nach Abschluss von M7.5 als kleiner Folge-Sub-Step nachgezogen werden, baut auf der Picker-Logik aus M7.5 auf.
- **Multi-Instanz-Deployments / Pfad B**: rejected-Vorschläge enthalten potenziell sensible Begründungen ("nicht für unseren Kontext geeignet"). Bei Aktivierung von Pfad B muss das Reject-Reason-Feld in das Anonymisierungs-Konzept aufgenommen werden (Kommentar im DSFA).

---

## ADR-044 — Karten-DoD-Härtung (HOTFIX-002): Glyph-Proxy + RxDB-v17-Strict-Checks

**Status:** Accepted
**Datum:** 2026-04-29
**Bezug:** Folge-Bugs aus dem ersten Live-Karten-Test (mit funktionierendem MapTiler-Key) und dem dabei aufgedeckten RxDB-Init-Defekt.

### Kontext

Erst beim Browser-Test mit gesetztem `HCMAP_MAPTILER_API_KEY` traten zwei orthogonale Bugs zutage, die im M5b/M6-Vitest-Setup nicht sichtbar waren:

**1. Glyph-Bug (M6.3 Cluster-Count-Layer):**
`MapView`'s Cluster-Layer rendert eine Zahl per `text-field` — das verlangt eine `glyphs`-URL im MapLibre-Style. `lib/map/style.ts` setzte `glyphs` nicht. Folge: `addLayer` wirft im DEV-Modus, der gesamte React-Subtree der Karte (Source + Cluster-Layer + Marker-Layer) wird nicht angehängt → keine Marker. Im jsdom-Test passiert das nicht, weil MapLibre dort gemockt ist.

**2. RxDB-v17-Strict-Checks (M5b.3):**
RxDB v17 prüft im DEV-Modus zwingend mehrere Schema-/Storage-Vorgaben:
- **DVM1:** Storage muss mit einem AJV-Validator gewrappt sein (`wrappedValidateAjvStorage`).
- **SC34:** Indexed string-Fields brauchen `maxLength`.
- **SC35:** Indexed integer-Fields brauchen `multipleOf` (und `maximum`).

Unsere Setup aus M5b.3 erfüllt keine der drei Vorgaben. `createRxDatabase` resp. `addCollections` werfen jeweils, der Provider catched still und `useDatabase()` bleibt `null`. Die Sync-Pill bleibt grün (Default-State `idle`), Marker werden nie gerendert, und es gibt keinen Hinweis im UI. Der M5b.4 E2E-Vitest fängt das nicht ab, weil dort `fake-indexeddb` + manuelle Init laufen, die andere Code-Pfade nehmen.

### Entscheidung

**A. Backend-Glyph-Proxy.**
- Neuer Endpoint `GET /api/glyphs/{fontstack}/{rangespec}` in `app/routes/glyphs.py` analog zum bestehenden Tile-Proxy. Auth-Pflicht, gleicher MapTiler-Key, 7-Tage-Cache-Header, 503/502-Fallback bei fehlendem Key bzw. Upstream-Fehler.
- Frontend setzt `glyphs: "/api/glyphs/{fontstack}/{range}.pbf"` in `lib/map/style.ts`. Override per `NEXT_PUBLIC_GLYPHS_URL` möglich.

**B. RxDB-Storage mit AJV-Validator wrappen (DEV-only).**
- `lib/rxdb/database.ts:buildStorage()` wickelt den Dexie-Storage in `wrappedValidateAjvStorage` aus `rxdb/plugins/validate-ajv` — aber **nur wenn `NODE_ENV === "development"`**. Production behält den nackten Storage (kein zusätzlicher Bundle-Aufschlag, RxDB-Prüfungen sind dev-only).

**C. Schema-Härtung (alle drei Sync-Collections).**
- `event.schema.json`: `started_at` und `updated_at` bekommen `maxLength: 32` (deckt ISO-8601 mit Mikrosekunden + UTC-Offset).
- `application.schema.json`: `event_id` `maxLength: 36`, `updated_at` `maxLength: 32`, `sequence_no` `multipleOf: 1` + `maximum: 1_000_000`.
- `event_participant.schema.json`: `event_id` `maxLength: 36`, `updated_at` `maxLength: 32`.
- Backend-Drift-Test (`tests/test_rxdb_schema_drift.py`) bleibt grün — die neuen Felder berühren weder Property-Liste noch Required-Liste noch Top-Level-Type.

**D. Replication-Leadership.**
- `waitForLeadership: true` blockierte den ersten Pull bei HMR-Cycles und in einzelnen Browser-Sessions; setzen auf `false`. Pfad-A-Datenmenge (< 5 000 Events, < 20 User) verträgt parallele Pulls problemlos. Trade-off (zusätzliche Pull-Last bei Multi-Tab-Use) ist akzeptiert.

**E. Provider-Logging.**
- `provider.tsx`'s catch-Block loggt jetzt explizit per `console.warn("[hcmap-rxdb] provider init failed:", caught)`. `database.ts:getDatabase()` ebenfalls bei Init-Fehlern. Silent failure (vorher) hatte den Bug für Tage maskiert; ein sichtbarer Browser-Warn ist die billigste Defense-in-Depth.

### Tests

- **Frontend-Suite:** 230/230 grün, keine Test-Anpassungen nötig (Mocks decken die Branches nicht).
- **Backend-Suite:** 174/174 grün, **Drift-Test 9/9** verifiziert die Schema-Erweiterungen. Glyph-Endpoint ist analog zum Tile-Proxy aufgebaut; eigene Tests werden mit M12 (Self-Hosted-Tile-Layer) eingeführt, weil dort die Endpoint-Parität explizit geprüft wird.
- **Browser-E2E (manuell):** `/map` mit gesetztem Key:
  - 12 seed events → 1 Cluster ("7" über Berlin-Mitte) + 1 Einzel-Marker (Kreuzberg) + Marker für München/Hamburg/Köln/Frankfurt im Out-of-View-Bereich.
  - IndexedDB enthält `rxdb-dexie-hcmap--0--{events,applications,event_participants}` plus drei Replication-Meta-DBs.
  - Drei Sync-Pull-Requests im Network-Log, Datenfluss Backend → RxDB → MapLibre-Source → Cluster-Render funktioniert end-to-end.

### Konsequenzen

- **Karten-DoD vollständig**: Tiles + Glyphs + Marker + Cluster + Geocoding + LocationPickerMap rendern produktiv. M6 ist *jetzt erst* in dem Zustand, wie er als ERLEDIGT markiert war.
- **Defense-in-Depth-Lesson** (analog ADR-042 Lessons Learned, Regel 2): Browser-Smoke-Verify als Pflicht-DoD-Bestandteil bei mock-abhängigen Komponenten ist hier erneut belegt. Beide Bugs hätten in der M6/M5b-Verifikation aufschlagen müssen, taten es aber nicht — weil ohne MapTiler-Key auch keine Karte rendert (Tiles fehlen → kein addLayer-Pfad), und im Vitest die Storage-Initialisierung gemockt wird.
- **RxDB v17 Compatibility-Note**: jede zukünftige Erweiterung der RxDB-Schemas (`schemas/*.schema.json`) muss `maxLength`/`multipleOf` für indexed Felder mitführen. Wird in `tests/test_rxdb_schema_drift.py` kommentiert; eine zusätzliche maschinelle Prüfung folgt bei Bedarf.

### Verworfene Alternativen

- **Glyph-URL direkt zu MapTiler mit Key im Browser:** verstößt gegen das Self-Hosting-Prinzip (ADR-001), Key wäre über DevTools sichtbar. Backend-Proxy ist der einheitliche Pfad.
- **`text-field` aus dem Cluster-Count-Layer entfernen:** Cluster ohne Zahl ist UX-Rückschritt. Kostet keinen Cluster-Code, aber den Zahlen-Hint pro Gruppe.
- **`multiInstance: false` statt `waitForLeadership: false`:** würde die BroadcastChannel-Cross-Tab-Synchronisierung deaktivieren; Tab-Wechsel könnte stale Daten zeigen. Leadership-Skip ist die punktuellere Lösung.
- **AJV-Validator auch in Production:** RxDB-Bundle wächst um ~50 KB für Validator+AJV. In Pfad A nicht nötig — Schema-Drift wird via Drift-Test verhindert, bevor er in Production landet.

### Folge-Arbeit

- M12 (Self-Hosted-Tileserver) erbt das Glyph-Proxy-Pattern; bei Migration werden alle drei MapTiler-Pfade (Tiles, Glyphs, Geocoding) gleichzeitig getauscht.
- ADR-031 (RxDB-Schema-Source-of-Truth) bleibt unverändert — die Schema-Erweiterungen sind reine Storage-Hints, keine semantische Änderung.

---

## ADR-045 — Implementierungsstrategie M7.4 (Freigabe-Queue + Editor-Withdraw)

**Status:** Accepted
**Datum:** 2026-04-29
**Vorgänger:** ADR-043 (M7-Strategie, §A/§B/§C/§G).
**Bezug:** Fahrplan M7.4. Reine Frontend-Erweiterung — Backend-Endpoints (`POST /<kind>/<id>/approve`, `POST /<kind>/<id>/reject`, `DELETE /<kind>/<id>`) waren bereits in M7.1 inklusive Tests vorhanden.

### Kontext

ADR-043 §A/§C hat den Reject-Workflow (Status-Erweiterung mit `reject_reason`) und den Editor-Withdraw (eigene pending hard-delete) als Backend-Mechanik definiert; M7.4 zieht das ins Frontend nach. Die offenen Designfragen waren: (1) wo lebt der Reject-Reason-Dialog, (2) wie modelliert die `<CatalogTable>` mehrere unterschiedliche Aktionen pro Row sauber, (3) wie kommt die `currentUser.id` für die Editor-Eigentümer-Prüfung in das Client-Component, (4) welche UX-Validierung greift im Reason-Dialog.

### Entscheidung

**A. `<CatalogTable>` von Boolean auf Render-Prop umgebaut.**
- Statt `canEdit: boolean` führt der Caller jetzt `renderRowActions: (entry) => ReactNode | undefined`. Action-Spalte mit Header rendert genau dann, wenn die Prop gesetzt ist.
- Begründung: M7.4 mischt vier verschiedene Aktionen abhängig von Status × Rolle × Eigentümer. Eine Erweiterung der bestehenden `canEdit`-Logik um drei weitere Boolean-Props (`canApprove`, `canReject`, `canWithdraw`) hätte zu kombinatorischer Prop-Inflation geführt. Die Render-Prop verschiebt die RBAC-Logik einmalig in den Caller (`<CatalogListing>`) und hält die Tabelle UI-neutral.
- Folgekosten: `tests/catalog-table.test.tsx` testet nicht mehr Edit-Sichtbarkeit pro Boolean, sondern dass die Render-Prop pro Row einmal aufgerufen wird; das ist ohnehin die robustere Schnittstelle.

**B. `<RejectReasonDialog>` als eigenständige Komponente, Submit-only-Validation.**
- `<Dialog>` als shadcn-Stil-Wrapper um `@radix-ui/react-dialog` neu in `components/ui/` (analog zum existierenden `<Sheet>`); zentriertes Modal mit Overlay, Close-Button.
- `<RejectReasonDialog>` als spezialisierter Use-Case darüber: controlled (`open` + `onOpenChange`), Reason-State + reset-on-close (via `useEffect`).
- **Validierungs-Trigger ausschließlich beim Submit** (`attemptedSubmit`-State, kein `onBlur`-Handler). Erstversion mit `onBlur`-`touched`-State produzierte unter Radix' Focus-Management einen sofortigen Inline-Error-Flash beim ersten Öffnen — beim Mount des Dialogs verschiebt Radix den Focus, der `onBlur`-Handler des autofokussierten Textareas feuert, `touched=true`, der Trimm leer → Alert sofort sichtbar. Submit-only beseitigt diesen Pfad und ist UX-seitig die quietere Variante (keine Error-Anzeige, bevor der User es überhaupt versucht hat).
- **Bug wurde nur im Browser-E2E sichtbar**, nicht im jsdom-Test (Radix' Focus-Manipulation läuft in jsdom anders). Lessons Learned: Bei Modal-Komponenten, die Radix-Focus-Management nutzen, sind die jsdom-Tests blind für Focus-Reihenfolge-Effekte; Browser-E2E pro Sub-Step bleibt obligatorisch. Regression-Test (`tests/reject-reason-dialog.test.tsx`: „does not show inline error on first open") schließt das ab.

**C. `<CatalogListing>`-Prop von `isAdmin` auf `currentUser` erweitert.**
- Editor-Withdraw braucht `entry.suggested_by === currentUser.id` als Eigentümer-Prüfung (Mirror der `<table>_owner_modify`-RLS-Policy aus M7.1). Eine Boolean-Prop reicht dafür nicht; `currentUser: { id, role }` kommt aus der Server-Component (`getServerMe()` in `page.tsx`) und wird als Prop durchgereicht.
- Damit fällt auch die `useMe()`-Client-Side-Race weg, die bei einer Hydratation-basierten Lösung möglich gewesen wäre. Page reicht den vom Server bereits geladenen User durch.
- `lib/rbac.ts`-Helpers aus M7.3 (`canApproveCatalog`, `canEditCatalogEntry`, `canWithdrawCatalogEntry`) bleiben unverändert; sie nehmen jetzt direkt `currentUser` entgegen, nicht mehr nur einen abgeleiteten `isAdmin`-Boolean.

**D. Reject-Dialog-State im Listing geliftet, nicht in der Table-Row.**
- `const [rejectingEntry, setRejectingEntry] = useState<AnyCatalogEntry | null>(null)` lebt im `<CatalogListing>`. Reject-Button auf einer Row setzt `rejectingEntry`, das Dialog beobachtet `rejectingEntry !== null` als `open`.
- Begründung: Eine Reject-Operation gleichzeitig ist genug; ein einzelner Dialog-Mount ist günstiger als pro-Row-Dialog-Instanzen (besonders bei 100+ pending-Rows). `<RejectReasonDialog>` ist damit always-mounted in `<CatalogListing>`, sein Reset-Effekt läuft beim Schließen.

**E. Toast-Pfad reused.**
- Erfolgs-Toasts: `„<Label>" freigegeben/abgelehnt/zurückgezogen` (Sonner).
- Fehler-Pfad nutzt den `describeMutationError`-Helper aus M7.3 (`lookup-form.tsx` exportiert ihn). Damit gleiche Status-Behandlung wie bei Create/Update: 409 → „Eintrag existiert bereits", 403 → „Keine Berechtigung", 422 → „Eingabe ungültig", default → „Speichern fehlgeschlagen". Der Helper bleibt in `lookup-form.tsx`; eine Extraktion nach `lib/catalog/errors.ts` wäre Scope-Creep für M7.4.

**F. Cache-Invalidation ungeändert.**
- Alle drei neuen Mutation-Hooks invalidieren `["catalog", kind]`, identisch zu M7.3-Hooks. Damit re-fetched die Listing nach jedem Workflow-Schritt automatisch und der StatusFilter-Tab spiegelt den neuen Status korrekt.

### Tests

- `tests/catalog-actions.test.tsx` — 8 Cases (Admin Approve+Reject+Edit-Sichtbarkeit; Editor own/foreign-Sichtbarkeit; Approve POST-URL; Reject Dialog-Open + Empty-Block + getrimmter Reason POST; Withdraw DELETE).
- `tests/reject-reason-dialog.test.tsx` — 7 Cases (Header/Description, kein Inline-Error auf erstem Open [Regression], Empty-Block, getrimmter Reason, Cancel, isPending-Disable, State-Reset auf Re-Open).
- `tests/catalog-table.test.tsx`, `tests/catalog-listing.test.tsx` — Refactor-Anpassungen, kein Verlust an Coverage.
- Backend: keine neuen Tests, weil keine Backend-Änderungen — `tests/test_catalog_workflow.py` aus M7.1 deckt die Endpoints bereits ab.

### Konsequenzen

- **`<CatalogTable>` ist UI-neutraler**, was M8 (Admin-Bereich) vereinfacht: dort kommen weitere Workflow-Aktionen (z. B. Re-Pend rejected → pending) ohne neue Boolean-Props oben drauf.
- **`<Dialog>`-Primitive ist jetzt verfügbar** für künftige Confirm-Modals (Anonymisierungs-Bestätigung in M8, Hard-Delete-Bestätigung im Catalog-Edit, etc.).
- **Lessons Learned (Defense-in-Depth):** jsdom-Tests sind für Radix-Focus-/Portal-Effekte blind. Pro Sub-Step mit Modal- oder Focus-relevanter UI bleibt Browser-E2E Pflicht-Bestandteil der DoD (siehe HOTFIX-002 / ADR-044 Konsequenzen, identische Lektion in einem anderen Kontext).
- **`<CatalogListing>`'s neue Prop-Form** ist Breaking gegenüber M7.3, aber alle Aufrufer in der App sind die Server-Page; eine externer Konsument existiert nicht.
- **Editor-PATCH auf eigene pending** bleibt explizit aus dem Scope (siehe ADR-043 §C). Editor mit Tippfehler im eigenen Vorschlag muss Withdraw + Neuvorschlag wählen — wenn das im realen Pfad-A-Betrieb stört, kann es als M7-Followup nachgezogen werden.

### Verworfene Alternativen

- **Reject-Dialog als pro-Row-Komponente:** dupliziert Modal-Mounts unnötig; bei einer Operation gleichzeitig ist ein einzelnes Dialog-Modal richtig.
- **`canEdit: boolean` plus weitere Boolean-Props (`canApprove`, …):** kombinatorische Prop-Inflation; Render-Prop ist die saubere Lösung.
- **`useMe()` im Client-Component statt `currentUser` per Prop:** zusätzliche Hydration-Race + zweiter API-Roundtrip pro Page-View — die Server-Page hat den User bereits geladen, durchreichen ist der direkte Pfad.
- **`onBlur`-getriebene `touched`-Validierung mit Workaround (z. B. `requestAnimationFrame`-Verzögerung):** Bug-Symptom-Therapie statt Ursache; Submit-only ist die einfachere und korrektere Lösung.
- **Approve/Reject-Status-Übergänge per generischem PATCH `/<id>` mit `status`-Feld:** war bereits in ADR-043 §B verworfen — Audit-Felder müssen serverseitig konsistent gesetzt werden, dedizierte Endpunkte sind hier präzise (Body-Validierung des Pflicht-Reason-Felds).

### Folge-Arbeit

- **M7.5** kann den `useCatalogList(kind, { status: "approved" })`-Cache aus M7.x direkt wiederverwenden; die approved-RestraintTypes sind dann nur ein zweiter Subscriber auf demselben Query-Key.
- **M8 SQLAdmin-Modelview** für Catalog kann ergänzend dieselben Endpoints nutzen, ist aber nicht der primäre Pfad (siehe ADR-043 Konsequenzen).
- **Reject-Reason-Inhalte bei Pfad-B-Aktivierung**: ADR-043 Folge-Arbeit hatte das bereits notiert; ADR-045 ändert daran nichts.

---

## ADR-046 — Restraint-IDs als Array auf ApplicationDoc (M7.5 Sync-Erweiterung)

**Status:** Accepted
**Datum:** 2026-04-29
**Vorgänger:** ADR-029 (Conflict-Resolution), ADR-030 (Soft-Delete + Cursor), ADR-031 (Schema-Source-of-Truth + Drift-Test), ADR-037 (Participants als Sync-Collection), ADR-043 (M7-Strategie).
**Bezug:** Fahrplan M7.5.

### Kontext

ADR-043 §D sieht für M7.5 einen Restraint-Picker (Multi-Select mit Typeahead, Quick-Propose) im Application-Erfassen-Pfad (Live + Backfill) vor. Beide Pfade schreiben Applications seit M5b/M5c ausschließlich über RxDB (`application-start-sheet.tsx`, `event-backfill-form.tsx`). Die heutige Sync-Pipeline transportiert aber **keine** Restraint-Verknüpfungen: weder das RxDB-`Application`-Schema (`frontend/src/lib/rxdb/schemas/application.schema.json`) noch der Backend-`ApplicationDoc` (`backend/app/sync/schemas.py`) noch `app/sync/services.py` kennt `application_restraint`-Rows. Die alten REST-Pfade (`POST /api/events/{id}/applications`, `PUT /api/applications/{id}/restraints`) werden vom Frontend seit M5b/M5c nicht mehr genutzt (ADR-029, ADR-040 §B). RLS auf `application_restraint` existiert seit M2 (`application_restraint_member_select`, `application_restraint_editor_modify`) — dort ist nichts zu erweitern.

ADR-043 §E entscheidet nur den **Read-Path** des Picker-Dropdowns (TanStack-Query-Cache der RestraintType-Liste). Der **Write-Path** für die n:m-Verknüpfung war offen.

### Entscheidung

**A. `restraint_type_ids: uuid[]` als denormalisiertes Array auf `ApplicationDoc`.**
- Sowohl `frontend/src/lib/rxdb/schemas/application.schema.json` als auch `backend/app/sync/schemas.py:ApplicationDoc` bekommen ein neues Feld `restraint_type_ids` vom Typ `array<string format=uuid>`. Default `[]`. Nicht in `required` — pre-existing Documents ohne das Feld bleiben gültig (RxDB-v17-strict-Verhalten beachtet: kein `maxLength`-Bedarf für UUID-Arrays, aber Item-`maxLength: 36` wird gesetzt, um SC34 nicht zu triggern, falls das Feld später indexiert würde).
- Drift-Test (`backend/tests/test_rxdb_schema_drift.py`) bleibt grün, weil beide Schemas synchron wachsen. Test-Helper, der Property-Listen vergleicht, sieht das Feld auf beiden Seiten und akzeptiert es.

**B. Pull: lädt `application_restraint`-Set pro Application und materialisiert es ins Array.**
- `pull_applications` macht **eine** zusätzliche Abfrage nach den Cursor-Walks: `SELECT application_id, restraint_type_id FROM application_restraint WHERE application_id IN (:ids)` (RLS filtert weiterhin pro Application, weil `application_restraint_member_select` an die Sichtbarkeit der Application gekoppelt ist).
- Ergebnis wird in eine `dict[application_id, list[uuid]]` gruppiert; `_application_to_doc` nimmt das Set als optionalen Parameter und schreibt es ins Doc. Helper-Aufrufer ohne Set (z. B. Push-Conflict-Antworten) liefern leeres Array — Konflikt-Master-Doc darf das alte Set explizit überschreiben, das ist die LWW-Semantik.

**C. Push: diff't das eingehende Array gegen die DB-Tabelle, INSERT/DELETE pro Element.**
- `_apply_application_update` und `_insert_application_or_conflict` rufen einen neuen Helper `_sync_application_restraints(session, application_id, target_ids)`, der die aktuelle Set per `SELECT` lädt, die Differenzmengen bildet, fehlende Rows einfügt und überflüssige löscht.
- Approved-Catalog-Check für Editor analog zu Position-FKs: Nicht-Admin darf nur approved-RestraintTypes verlinken; pending/rejected → Konflikt (gesamte Application-Push wird mit Server-Master als Konflikt zurückgegeben, Set-Diff wird **nicht** angewendet).
- LWW: bei Konflikt überschreibt das Server-Set das Client-Set komplett (Set-Replace, kein Pro-Element-Merge). Begründung: kein Audit-Bedarf für „wer hat welchen Restraint wann gesetzt", und ein Pro-Element-LWW würde ein zusätzliches `updated_at` auf `application_restraint` erzwingen — Overengineering.

**D. Konflikt-Antworten geben aktuelles Set zurück.**
- `_application_to_doc` für Konflikt-Pfade lädt das Set explizit (eine Abfrage pro Konflikt). Damit lernt der Client beim Konflikt die Server-Wahrheit für Restraints und nicht nur für die Application-Felder.

**E. Auto-Participant-Trigger für Recipient bleibt unverändert.**
- Der Performer/Recipient-Auto-Participant-Pfad (ADR-012, ADR-033 §F) läuft unabhängig vom Restraint-Set; keine Änderung an `_ensure_participant`.

**F. Drift-Test um neues Feld erweitert.**
- Der Test in `backend/tests/test_rxdb_schema_drift.py` vergleicht Property-Listen aus beiden Schemas. Das neue Feld erscheint in beiden, der Test bleibt grün ohne Anpassung — sofern das Mapping symmetrisch ist. Falls der Test eine explizite Allowlist führt, wird sie um `restraint_type_ids` ergänzt.

**G. Frontend-Picker als eigenständige Komponente.**
- `components/catalog/restraint-picker.tsx` (Multi-Select-Combobox mit Typeahead-Filter über `display_name` und `category`/`brand`/`model`).
- Datenquelle: `useCatalogList("restraint-types", { status: "approved" })` aus M7.x. Cache wird mit Catalog-Listing geteilt (Pfad-A-Datenmenge < 200 Rows passt in eine Page).
- Quick-Propose-Mini-Form als inline-Footer-Card im Picker-Sheet: Kategorie + Display-Name (Pflicht), Brand/Modell/Mechanik optional. Submit ruft `useCreateCatalogEntry("restraint-types")` aus M7.3; Editor erzeugt pending, Admin auto-approve. Erfolg → invalidiert den Cache, Picker zeigt automatisch den neuen Eintrag (sofern approved); pending bleibt für Editor in der Liste sichtbar (RLS aus M7.1: eigene pending sehen).
- Picker selbst trägt keine Auswahl von pending/rejected — er filtert client-seitig zusätzlich auf `status='approved'`, weil der Backend-Approved-Check sonst auf einem Editor-Push hart 409'en würde.

**H. Integration in Live + Backfill.**
- `ApplicationStartSheet` (Live): zusätzliches Feld unter Recipient/Notiz, schreibt Auswahl ins RxDB-Insert.
- `EventBackfillForm`: pro Application-Row ein Picker zwischen Recipient und Notiz; Auswahl in der Row-State-Struktur, beim Submit ins RxDB-Insert übergeben.
- Edit-Form (`event-edit-form.tsx`) bleibt **explizit aus dem Scope** — analog zur Position-Picker-Beschränkung in ADR-043 §D / ADR-040 §K. Edit-Restraint-Picker ist ein eigenes M5c.4-Followup nach M7.5.

### Tests

**Backend (zusätzlich zu bestehenden 174 Cases):**
- `tests/test_sync_replication.py` (oder bestehender Sync-Roundtrip-Test): Push-Pull-Roundtrip mit `restraint_type_ids` setzt das Set; nochmaliger Push mit reduziertem Set löscht; Push-Konflikt liefert Server-Set.
- Editor pushed Application mit pending RestraintType → Konflikt (Server-Master zurück, Set bleibt unverändert).
- `test_rxdb_schema_drift.py` bleibt grün (oder wird minimal um Allowlist erweitert).
- `test_sync_idempotency.py` Drei-Push-Test überträgt `restraint_type_ids` korrekt: 3× gleicher Push → 1 Application-Row + N `application_restraint`-Rows, kein Duplikat.

**Frontend (zusätzlich zu bestehenden 244 Cases):**
- `tests/restraint-picker.test.tsx`: Default-State (leerer Picker, leeres Set), Typeahead-Filter (Suche nach „cuff" filtert auf Handcuffs-Kategorie), Auswahl/Deselect, Quick-Propose-Submit (Mini-Form öffnet, leerer Display-Name → Block, gültiger Submit ruft `apiFetch` und re-fetched Cache).
- `tests/application-start-sheet.test.tsx` ergänzt um Picker-Pfad: Auswahl überlebt Submit, RxDB-Insert enthält Set.

### Konsequenzen

- Sync-Wire-Format wächst um **ein** optionales Array-Feld auf `ApplicationDoc`. Kein Schema-Migration auf `application_restraint`-Tabelle nötig (existiert seit M2).
- Pull macht eine zusätzliche Query pro Pull-Batch (n+1 vermeidet das, durch Bulk-`IN`-Query). Bei Pfad-A-Datenmenge irrelevant; bei Pfad B muss bei großen Pulls geprüft werden, ob ein JOIN-Lift effizienter ist.
- Konflikt-Pfad lädt das Set zusätzlich pro Konflikt-Application (selten genug, Performance unkritisch).
- Pfad B: Set-Replace-Semantik bleibt; falls dort Audit-Trail für „wer hat welchen Restraint wann hinzugefügt" gebraucht wird, ist das eine eigene Schema-Migration (`updated_at` + `created_by` auf `application_restraint`) — orthogonal zu M7.5.

### Verworfene Alternativen

- **Eigene Sync-Collection `application_restraints` (analog `event_participants` / ADR-037)**: aufwendiger (Surrogate `id`-PK, eigene Pull-/Push-Endpoints, eigene RxDB-Collection, eigene Drift-Schicht) für eine reine Set-Semantik ohne weitere Felder. Erst sinnvoll, wenn `application_restraint` zusätzliche Spalten bekommt (z. B. „Reihenfolge"). Dann lässt sich von A nach B migrieren, ohne den Wire-Vertrag von Application-Doc selbst zu brechen — das Array bleibt rückwärtskompatibel.
- **Hybrid REST-PUT nach Sync**: bricht Offline-First, Live-Modus mit instabilem Netz verliert die Restraint-Wahl. Widerspricht ADR-029.
- **`restraint_type_ids` mit Pro-Element-LWW** (Element-`updated_at`): Audit-Wert in Pfad A nicht erkennbar, Schema-Erweiterung auf `application_restraint`-Tabelle nötig, Konflikt-Auflösung wird komplex. Set-Replace ist die einfachere und für Pfad A korrekte Semantik.

### Folge-Arbeit

- ~~**Position-Picker im Edit-Form**~~ → erledigt im M7.5-FU2 (2026-04-29).
- ~~**Restraint-Picker im Edit-Form**~~ → erledigt im M7.5-FU1 (2026-04-29).
- **Pfad B**: bei Audit-Bedarf für Restraint-Set-Änderungen wird ADR-046 §C (Set-Replace) durch Pro-Element-LWW ersetzt; Schema-Migration auf `application_restraint` notwendig.

### Followups (2026-04-29)

**M7.5-FU1 — Restraint-Picker im Edit-Form:**
`event-edit-form.tsx` öffnet `<RestraintPicker>` pro Application-Row. `EditableApplication.restraintTypeIds` + `initial.restraintTypeIds` als Snapshot für den Diff; Submit-Loop ergänzt `patch.restraint_type_ids` nur, wenn das Set sich gegenüber dem Initial-Stand unterscheidet (set-equals via Helper). RxDB-`doc.patch({ restraint_type_ids: […] })` triggert Sync-Push, Set-Replace-LWW (ADR-046 §C) im Backend gilt unverändert.

**M7.5-FU2 — Position-Picker (ArmPosition / HandPosition / HandOrientation) in Live + Backfill + Edit:**
Neue generische Komponente `components/catalog/lookup-picker.tsx` (Single-Select mit „— keine —"-Option, Quick-Propose-Inline-Form analog zum Restraint-Picker). Eingehängt in `ApplicationStartSheet` (3-Spalten-Grid unter Restraints), `EventBackfillForm` (pro Row) und `EventEditForm` (pro Row mit Diff-Patch je FK). `EditableApplication.{armPositionId,handPositionId,handOrientationId}` + entsprechende `initial.*`-Snapshots; Patch enthält pro FK genau dann den Eintrag, wenn er sich geändert hat. ADR-040 §K-Beschränkung (Position-FKs aus Edit-Scope) ist damit aufgehoben — die Backend-Mechanik (LWW pro FK in `_apply_application_update`) hat das von Anfang an erlaubt, der Scope-Cut war nur UI-seitig.

**Backend-Sicherheitsfix (FU2):**
`_apply_application_update` (Update-Path) übernahm Position-FKs ohne Approved-Check. Mit dem Edit-Form-Position-Picker wäre das ein Editor-Exposure geworden (Editor sieht via RLS eigene pending; Push hätte sie auf eine bestehende Application setzen können). `_position_fks_allowed`-Helper extrahiert die existierende Insert-Path-Logik und wird jetzt auch im Update-Path aufgerufen (Konflikt-Tombstone-Antwort bei pending/unbekannten FKs). Insert-Path nutzt denselben Helper — kein Verhalten verändert, nur DRY.

**Tests:**
Backend **+1** in `tests/test_sync_application_restraints.py` (`test_editor_update_with_pending_arm_position_returns_conflict`) — 181 → 182. Frontend **+9**: `tests/lookup-picker.test.tsx` (8 Cases: list filtering pending hidden, single-select onChange, "— keine —"-clear, empty-submit-block, editor pending POST + no auto-select, admin auto-approve + auto-select), `tests/event-edit-form.test.tsx` (3 Cases: restraint-set-change patch, no-change skip, position-FK patch). 252 → 261.

**Browser-E2E (Admin gegen echtes Backend + Postgres):**
- Backfill: Application-Row zeigt 1 RestraintPicker + 3 LookupPicker (arm/hand/orientation); Arm-Select listet 8 Seeds + „— keine —".
- Sync-Roundtrip via Console: Push-App mit `arm_position_id` + `hand_position_id` (approved) → Pull liefert beide FKs zurück, `hand_orientation_id` bleibt null.
- Edit-Form für die so erzeugte Application: alle drei Picker pre-populated mit den Sync-pulled Werten (`armSelectValue` matcht den geseedeten Wert, `handSelectValue` ebenso, `orientation` = leer).
- Lint + Typecheck + `next build` clean. Bundle: `/events/[id]/edit` 263 → 274 kB, `/events/new/backfill` 271 → 277 kB, Live-Sheet vom `/events/[id]` Bundle 279 → 285 kB.

---

## ADR-047 — Next.js 15.0.4 → 16.2.4 Migration (Pfad C aus Blocker #001)

**Status:** Accepted
**Datum:** 2026-04-30
**Kategorie:** Externe Abhängigkeit, Major-Version-Update mit Breaking Changes (CLAUDE.md §4.3)

### Kontext

Die am 2026-04-29 dokumentierte Aktualitätsprüfung (Blocker #001) hat ergeben, dass `frontend/package.json` mit Versionen aus Dezember 2024 gepinnt ist (`next@15.0.4`, `react@19.0.0`). Im Live-Preview blendet Next.js direkt das Dev-Overlay-Statusmeldung „Next.js (15.0.4) is outdated" ein — empirisch verifiziert am 2026-04-30 via `preview_start frontend` + Browser-Snapshot.

Drei Update-Pfade standen zur Wahl (A=Patch in 15.0.x, B=Minor auf 15.5.15, C=Major auf 16.2.4). Empfehlung der Recherche: **C**, weil:
- der Frontend-Code 16-ready ist (alle Async-Request-APIs werden bereits awaited; keine 16er-Removal-Trigger im Code wie `next/legacy/image`, `serverRuntimeConfig`, `images.domains`, AMP, `unstable_*`-Imports, `experimental_ppr`, `revalidateTag`/`updateTag`),
- Migrationsaufwand auf zwei kosmetische Codemod-Schritte begrenzt ist (`middleware.ts` → `proxy.ts`, `next lint` → ESLint Flat Config),
- der Zeitpunkt günstig ist: der Frontend-Code ist klein, die Test-Suite eng (261 grün), M8 (Admin-Bereich) als nächste Phase kommt erst danach,
- B nur ~12 Monate kauft, danach eine zweite Migrations-Runde fällig wäre.

Patrick hat am 2026-04-30 Pfad C freigegeben. Diese ADR fixiert den Migrationsumfang und die Verifikationsstrategie.

### Entscheidungen

**A. Versionssprünge.**
- `next` `15.0.4` → `16.2.4` (latest, Release 2026-04-15).
- `react` / `react-dom` `19.0.0` → `19.2.5` (latest, Release 2026-04-08). React 19.2 ist die im Next-16-Upgrade-Guide empfohlene React-Linie; bringt zusätzlich `useEffectEvent`, `Activity`, View Transitions, ohne Code-Migration zu erzwingen.
- `@types/react` / `@types/react-dom` an die jeweils aktuelle 19.2-Linie.
- `eslint-config-next` `15.0.4` → `16.2.4` (folgt Major).

**B. `middleware.ts` → `proxy.ts` umbenennen.**
Der `middleware`-Dateiname und der named export `middleware` sind in 16 deprecated. Umbenennung jetzt, weil:
- der Codemod (`@next/codemod@canary upgrade latest`) die Aktion deckt,
- HC-Map nutzt **kein** edge-runtime in `src/middleware.ts` (reines Cookie-Check + Redirect — kompatibel mit dem in `proxy` festgelegten `nodejs`-Runtime),
- die einzige Test-Datei `tests/middleware.test.ts` ist isoliert und mit umbenanntem Import-Pfad einfach anzupassen.

`config.matcher` bleibt unverändert. `NextResponse.next()` / `NextResponse.redirect(...)` sind in `proxy` identisch zu `middleware` — kein API-Vertragsbruch.

**C. ESLint 8 → 9, Flat Config, Entfernung von `next lint`.**
Die `next lint`-Subcommand-Implementierung ist in 16 entfernt; `package.json` `"lint": "next lint"` würde scheitern. `eslint-config-next@16.x` deklariert zudem `eslint>=9.0.0` als harte Peer-Dependency — ein Festhalten an ESLint 8.57.1 ist mit `eslint-config-next@16` technisch nicht möglich. ESLint 8.57.1 ist zudem offiziell EOL (npm-Hinweis: „This version is no longer supported"). Damit wird ESLint mit-migriert; ein Festhalten an Major-8 würde dasselbe Drift-Symptom in der Lint-Toolchain konservieren, das diese Migration auflöst.

Vorgehen:
- `eslint` `8.57.1` → `9.39.4` (maintenance-Linie; geringeres Plugin-Kompat-Risiko als 10.x bei vergleichbarem Sicherheits- und Feature-Stand).
- `eslint-config-prettier` ist bereits `9.1.0` (ESLint-9-fähig, kein Bump nötig).
- `.eslintrc.json` (Legacy) wird durch `eslint.config.mjs` (Flat) ersetzt.
- Inhalte 1:1 portiert: `next/core-web-vitals` + `next/typescript` (über `FlatCompat` aus `@eslint/eslintrc`, weil `eslint-config-next` v16 noch keinen reinen Flat-Export anbietet — aktueller Stand gemäß Next-Doku-Setup-Beispiel) plus `prettier` als Last-Layer-Override und die zwei Repo-eigenen Regeln (`@typescript-eslint/consistent-type-imports`, `@typescript-eslint/no-unused-vars` mit `argsIgnorePattern: "^_"`).
- `package.json`-Skripte: `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"`.

Diese Erweiterung gegenüber der initialen ADR-Form (ESLint-Major war zunächst out-of-scope) wurde am 2026-04-30 freigegeben (Patrick, Variante Z2), nachdem die Peer-Dep-Anforderung empirisch beim ersten `pnpm add eslint-config-next@16.2.4` aufgetreten war.

**D. `next.config.mjs` Anpassungen.**
Aktueller Stand ist minimal: `output: "standalone"`, `reactStrictMode: true`, `poweredByHeader: false`, dev-only `rewrites()` zum Backend. Keine `experimental.turbopack`-, keine `experimental.ppr`-, keine `images`-, keine custom `webpack`-Optionen. **Keine Anpassung nötig.** Turbopack-Default in Dev und Build ist mit dieser Konfiguration konfliktfrei (kein custom Webpack-Block, der einen Fehlschlag triggern würde).

**E. Out-of-Scope.**
Diese ADR begrenzt Scope explizit:
- **Kein** Backend-Audit (Blocker #001 Punkt 3 bleibt offen).
- **Keine** CLAUDE.md-Methodik-Härtung (Blocker #001 Punkt 2 bleibt offen).
- **Keine** Anpassung des `engines: ">=22 <23"`-Pin in `package.json`. Der Mismatch zur lokalen Node-24-Installation ist ein eigenständiger Befund; er wird im Folgeschritt zusammen mit dem Runtime-Audit adressiert.
- **Keine** shadcn/ui-Refactor (`forwardRef`-Warnings sind in React 19 Hinweise, keine Errors — werden bei nächstem shadcn-Sweep adressiert).
- **Keine** Codemod-Optimierung (`reactCompiler`, Cache Components / `cacheComponents`-Flag, `next-devtools-mcp`) — alle drei sind opt-in, kein Default-Bruch.
- **Keine** Code-Quality-Refactorings für die in eslint-config-next 16 neu aktivierten Regeln. Konkret: `react-hooks/set-state-in-effect` (13 Treffer in Bestandskomponenten), `react-hooks/refs` (2 Treffer in `map-view.tsx`), `react/display-name` (8 Treffer in Test-Wrapper-Komponenten). Diese Regeln waren unter `eslint-config-next@15.0.4` nicht aktiv. Sie werden in `eslint.config.mjs` mit `"off"` gepinnt; ein gezielter Code-Quality-Sweep folgt als eigener Schritt nach M8. Begründung: Refactoring-Aufwand für `set-state-in-effect`-Treffer ist nicht trivial (echte React-19-Pattern-Migration nötig), gehört nicht in einen Stack-Bump.
- **Keine** `next-themes`-Migration. React 19.2 produziert eine Console-Warnung „Encountered a script tag while rendering React component" aus `<ThemeProvider>` (next-themes@0.4.6, latest, Theme-Hydration-Script-Pattern). Library-bedingt, nicht funktional brechend. Folgeschritt zusammen mit dem Code-Quality-Sweep.

**F. Verifikationsstrategie.**
DoD nach CLAUDE.md §9:
1. `pnpm install` durchläuft mit aktualisiertem Lockfile.
2. `pnpm typecheck` clean.
3. `pnpm lint` (jetzt direkt `eslint .`) clean.
4. `pnpm test` — alle 261 Vitest-Cases bleiben grün. Erwartung: Migration berührt keine Test-Logik direkt; einzig `tests/middleware.test.ts` braucht eine Import-Pfad-Anpassung auf den umbenannten Modul-Pfad.
5. `pnpm build` clean — Turbopack-Production-Build statt Webpack. Erwartung: alle 12 Routen weiterhin baubar.
6. Browser-Smoke via `preview_start frontend` + `preview_eval`/`preview_snapshot`: Login-Seite rendert, das „is outdated"-Overlay ist verschwunden, keine neue Deprecation-Meldung in Console oder Dev-Overlay.

### Verworfene Alternativen

- **Pfad A (Patch 15.0.4 → 15.0.8):** schließt 16 Monate Patches nicht und entfernt das Dev-Overlay-Outdated-Banner nicht — keine Auflösung des Auslöser-Symptoms.
- **Pfad B (Minor 15.0.4 → 15.5.15):** geringeres Risiko, aber kauft nur ~12 Monate. Verschiebt die identische Migrationsentscheidung in M-Phase 2/3, in der der Frontend-Code größer und die Migration entsprechend riskanter wäre. Keine technische Notwendigkeit, am 15-Major zu bleiben.
- **Codemod via `@next/codemod@canary upgrade latest` ausschließlich:** Codemod erledigt mechanisches Suchen-Ersetzen (Turbopack-Config-Move, `next lint` → eslint-cli, `middleware` → `proxy`, `unstable_`-Stripping, PPR-Segments). Wir nutzen den Codemod gezielt für `middleware` → `proxy` und ESLint-Migration, prüfen die Patches manuell. Unkontrollierte Anwendung auf einen produktiven Code-Stand wäre ein Verstoß gegen CLAUDE.md §6 „Determinismus vor Kreativität".
- **Sofortige Aktivierung von `cacheComponents` / React Compiler:** beides opt-in in 16, beides würde zusätzliche Verhaltens-/Performance-Validierung erfordern. Kein DoD-Mehrwert für Pfad A der Codebasis. Bleibt für M-Phase 2 offen.

### Lessons Learned

**Beobachtung:** Die Stack-Drift wurde am 2026-04-29 spät-session entdeckt — fünf Monate nach M0-Setup, zwei Major-Releases von Next zu spät, und nur dadurch sichtbar, dass eine separate React-19-Inkompatibilität (Sonner v1, ADR-042) zur manuellen Aktualitätsprüfung führte. Nach erstem Bericht (Blocker #001) war das Dev-Overlay-Banner „Next.js (15.0.4) is outdated" empirisch der einzige Next-eigene Hinweis im Live-Preview — eine Information, die der initiale M0-Setup-Schritt nicht eingespeist hatte, weil er ohne Registry-Lookup arbeitete.

**Ableitung:**
1. Pin-Werte in `package.json`/`pyproject.toml` sind ohne aktiven Registry-Lookup nicht vertrauenswürdig, auch wenn sie aus einem KI-Modell stammen, das auf jüngeren Trainingsdaten beruht. Modell-Trainingsstände driften gegen den Releasestand.
2. Dev-Server-Statusmeldungen sind ein **belastbarer** Indikator für Update-Bedarf — sie sind die schnellste Feedback-Quelle, sobald eine Lib-Version „latest" deutlich unterschreitet. Die periodische Sichtkontrolle des Dev-Overlay ist eine sehr günstige Audit-Maßnahme.

**Abgeleitete Regel (gilt ab dieser ADR, projektintern bis zur möglichen CLAUDE.md-Härtung in Blocker #001 Punkt 2):**
- **Regel — Dev-Overlay-Sichtprüfung im DoD:** Beim Setup oder Major-Update einer Frontend-Lib mit Dev-Overlay (Next.js, Vite-basierte Stacks, …) ist eine kurze Sichtprüfung des Dev-Overlay Pflicht-DoD-Bestandteil. Auftretende „outdated"-/„deprecated"-Banner werden im Implementierungs-Bericht referenziert und entweder im selben Schritt aufgelöst oder als Folge-Ticket erfasst.

### Migrations-Begleiterscheinungen (beobachtet 2026-04-30)

Während der Umsetzung sind eine Reihe von Effekten aufgetreten, die nicht durch den ADR-Scope-Cut explizit vorhergesagt waren. Sie sind weder Migrations-Fehler noch Funktionsregressionen, gehören aber zur Wahrheit der Migration und sind für künftige Major-Bumps wertvoll.

**A. Turbopack-CSS-Strikter als Webpack/PostCSS.**
Build schlug initial fehl mit „`@import` rules must precede all rules aside from `@charset` and `@layer` statements" auf [`globals.css:1488`](frontend/src/styles/globals.css). Webpack/PostCSS hatten die Reihenfolge `@tailwind ... @import "maplibre-gl/..."` toleriert. Fix: `@import` an den Anfang verschoben — funktional identisch, da Tailwind-Direktiven in keiner Variante als CSS-`@import` gelten. Lessons: Bei künftigem `next build` mit Turbopack auf strikte CSS-Spec-Konformität achten; PostCSS-Toleranzen sind nicht übertragbar.

**B. `tsconfig.json` und `next-env.d.ts` werden bei Next-16-Builds automatisch modifiziert.**
- `jsx: "preserve"` → `jsx: "react-jsx"` ist mandatory (React-19 automatic JSX runtime).
- `include` ergänzt um `.next/dev/types/**/*.ts` (Konsequenz der dev/build-Verzeichnistrennung).
- `next-env.d.ts` bekommt `import "./.next/types/routes.d.ts";` und einen aktualisierten Doku-Link.

Beide Auto-Edits gehen in den Commit ein. **Achtung: `next-env.d.ts` „bounct" zwischen `.next/types/...` und `.next/dev/types/...` je nachdem, ob zuletzt `next build` oder `next dev` lief.** Das ist eine bekannte Eigenheit der dev/build-Verzeichnistrennung. Pragmatisch akzeptiert; bei jeder Session den Stand committen, der zuletzt erzeugt wurde. Saubere Lösung wäre `next-env.d.ts` als generated File aus dem Repo zu nehmen (in `.gitignore`) — gehört zu einem späteren Tooling-Refactor.

**C. `eslint-config-next@16` exportiert native Flat-Config-Arrays.**
Erste Implementierung verwendete `FlatCompat` aus `@eslint/eslintrc` (gemäß Next-Doku-Beispiel) — produzierte einen `TypeError: Converting circular structure to JSON`. Inspektion der `eslint-config-next/dist/`-Files zeigte, dass `core-web-vitals.js` und `typescript.js` direkt als Flat-Config-Arrays geliefert werden. Die finale [`eslint.config.mjs`](frontend/eslint.config.mjs) importiert sie via `createRequire` und spreadet sie in den Default-Export. **Kein `FlatCompat` nötig** — die Next-Doku ist hier (Stand 2026-04-30) hinter dem Repo-Stand.

**D. `@eslint/js@latest` ist 10.x mit `eslint@^10`-Peer.**
`pnpm add -D @eslint/js@latest` zog 10.0.1 mit unmet Peer auf eslint@9.39.4 ein. Auf `9.39.0` (passende 9er-Linie) gepinnt. Lessons: Bei kombinierten ESLint-Stack-Bumps die `@eslint/*`-Major-Linien explizit angleichen, nicht `@latest` blind nehmen.

**E. Prettier reformatiert Bestandscode bei `pnpm format`-Lauf.**
Während der Migration wurde `pnpm format` einmal pauschal ausgeführt, um die `tsconfig.json`-Auto-Edits konsistent zu formatieren. Folge: ~40 Bestand-Files bekamen Zeilenumbruch-Refactorings, die mit der Migration nichts zu tun hatten. Diese Diffs wurden mittels `git restore` aus dem Migrations-Commit ausgeschlossen, um CLAUDE.md §11 (atomare Commits) zu wahren. Offene Frage: liefen frühere Sessions an Prettier vorbei? Hinweis für eigenen Folgeschritt — entweder gezielt `pnpm format` einmal isoliert committen oder im Pre-Commit-Hook fix erzwingen.

**F. Performance-Beobachtungen (manueller Vergleich, kein wissenschaftlicher Benchmark).**
- **Dev-Server `Ready`:** 1863 ms (15.0.4 / Webpack) → 220 ms (16.2.4 / Turbopack). ~8.5× schneller.
- **Production-Build:** ~5.9 s + nachgelagerte Schritte (15.0.4) → 2.6 s mit Turbopack-Default (16.2.4). ~2.3× schneller; präziserer Vergleich nicht möglich, weil 16 die „First Load JS"-Spalten aus dem Build-Output entfernt.
- **Build-Output-Form:** Spalten `Size` und `First Load JS` sind in 16 entfernt (siehe Upgrade Guide §Performance Improvements: nicht zuverlässig in RSC-Architekturen messbar). Wer Bundle-Größen weiterhin tracken will, braucht Lighthouse/Vercel Analytics.

**G. Dev-Overlay-Verhalten geändert.**
Statt einer prominenten roten Dialog-Box mit „Next.js (15.0.4) is outdated" zeigt 16 einen unauffälligen Header-Stripe „Next.js 16.2.4 Turbopack" plus einen Issues-Counter unten links. Console-Errors werden im Issues-Drawer aggregiert statt als blockierender Dialog. Funktion: Dev kann weiterklicken, ohne den Error-Dialog zu schließen. Folge: Issue-Counts können schnell hoch werden (z. B. 88 Tile-503-Errors auf `/map` ohne MapTiler-Key); kein Anlass zur Sorge, solange die Quellen bekannt sind.

**H. Browser-Console-Warnung aus React 19.2 in `next-themes`.**
Bereits in §E als Out-of-Scope vermerkt; an dieser Stelle nochmals als beobachtetes Symptom: jede Seite triggert n × „Encountered a script tag while rendering React component" (n abhängig von Seitenanzahl der Wechsel). Quelle: `<ThemeProvider>` aus `next-themes@0.4.6` rendert Hydration-Bootstrap-`<script>`. Funktional ohne Effekt; nur Console-Lärm.

**I. Vitest-Suite ungestört.**
Frontend-Tests mocken Sonner, fetch, RxDB-Replication, MapLibre — alle 261 Cases laufen unverändert grün durch. Die Migration berührt die Mock-Schicht nicht. Damit ist die Test-Suite zwar nicht der einzige Funktionsnachweis (siehe ADR-042 Lessons), aber sie ist ein zuverlässiger erster Filter für Regression in pure-Logik-Code.

**J. End-to-End-Verifikation am 2026-04-30 mit lebendem Backend bestätigt.**
Stack lokal hochgefahren (DB + Backend + Frontend via `preview_start`), Test-Admin via Argon2-Hash-Patch erstellt. Verifizierte Pfade: Auto-Login mit bestehender Session, Dashboard mit RxDB-Sync-Status, Event-Detail-Page mit Live-Timer + Application-Liste + Restraint-Anzeige, Admin/Catalogs mit Workflow-Tabs, MapView mit Cluster-Markern (Tile-Layer grau ohne MapTiler-Key — pre-existierend), Logout (`POST /api/auth/logout` → 204), Re-Login mit gepatchtem User. **Keine durch die Migration eingeführten Funktionsregressionen**.

### Folge-Arbeit

- README-Badges: Versions-Badge `Next.js 15.0.4` (falls vorhanden) auf `16.2.4` aktualisieren — siehe CLAUDE.md §6 „README-Badges spiegeln den Ist-Zustand".
- Blocker #001 Punkt 1 wird mit dieser ADR gelöst und nach „Gelöste Blocker" verschoben (Punkte 2 und 3 bleiben aktiv).
- M8 (Admin-Bereich, `[OFFEN]`) startet auf der 16.x-Linie.
- Pfad B/C des Audit-Themas (Backend, Container-Image-Tags, Sprach-Runtimes inklusive `engines: ">=22 <23"`-Pin-Anpassung) bleibt als eigenständiger Folge-Schritt offen. Keine implizite Mit-Erledigung in dieser ADR.
- **Code-Quality-Sweep (Folgeschritt nach M8):** Die in `eslint.config.mjs` deaktivierten Regeln (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `react/display-name`) werden iterativ angegangen. Pro Komponente: `useEffect` → `useEvent` / Memoisierung / Ref-Update außerhalb Render. Ziel: Regeln wieder als `"error"` aktivieren und Treffer auf 0 senken.
- **next-themes-Folgeschritt:** Console-Warnung „Encountered a script tag while rendering React component" durch React 19.2 — Workaround-Optionen: (a) Beobachten, ob `next-themes` v1.0 (aktuell beta) die Warnung auflöst, (b) eigene Theme-Initialisierung via Server-Component schreiben, (c) Warnung akzeptieren, da nicht funktional brechend. Entscheidung mit Code-Quality-Sweep treffen.

---

## ADR-048 — Backend-Stack-Drift Voll-Sweep (Variante B aus Audit Blocker #001 Punkt 3)

**Status:** Accepted
**Datum:** 2026-04-30
**Kategorie:** Externe Abhängigkeiten, mehrere Major-/0.x-Out-of-Range-Bumps in Bündel (CLAUDE.md §4.3)
**Vorgänger:** Blocker #001 (2026-04-29), ADR-047 (STACK-001 Frontend-Sweep, schließt das Frontend-Pendant), Audit-Befund 2026-04-30 (in dieser Session erstellt).

### Kontext

Blocker #001 Punkt 3 hat den Verdacht aufgestellt, dass die Backend-Pins in `backend/pyproject.toml` und die Container-Image-Tags in `docker/` ähnlichem Stack-Drift unterliegen wie die Frontend-Pins, die ADR-047 (STACK-001) gerade aufgelöst hat. STACK-001 hat das Frontend von Dezember-2024-Pins auf den 2026-04-Stand gebracht; Punkt 3 wurde damals ausdrücklich aus Scope ausgegrenzt und als „eigenständiger Folge-Schritt vor M8 oder parallel" markiert.

Am 2026-04-30 wurde der Audit ausgeführt — Lookup gegen PyPI (`https://pypi.org/pypi/<pkg>/json`), Docker Hub (`postgis/postgis`), GitHub-Releases (`uv`, `pre-commit-*`-Mirrors, `fastapi-users`), endoflife.date (Postgres/Python/Node-LTS-Stand). Befund:

- **Lockfile (`backend/uv.lock`)** ist seit M0 mehrfach refresht: 9 von 23 Paketen sind locked = latest-within-constraint (z. B. `pydantic 2.13.3` vom 2026-04-20, `mypy 1.20.2` vom 2026-04-21).
- **Constraint-Obergrenzen** in `pyproject.toml` lagen für 13 Pakete out-of-range gegen den jeweiligen `latest`-Tag:
  - SemVer-/CalVer-Major out-of-range (5): `fastapi-users 14→15`, `pytest 8→9`, `pytest-asyncio 0.24→1.x`, `argon2-cffi 23→25` (CalVer), `structlog 24→25` (CalVer).
  - 0.x-Minor out-of-range (8): `fastapi 0.115→0.136`, `uvicorn 0.32→0.46`, `asyncpg 0.30→0.31`, `geoalchemy2 0.15→0.19`, `uuid-utils 0.10→0.14`, `httpx 0.27→0.28`, `ruff 0.7→0.15`. (Plus `psycopg 3.2→3.3.x` → bereits aufgelöst durch lockfile-refresh, locked = 3.3.3, Constraint `<4` ist großzügig.)
- **Pre-commit-Pins:** `pre-commit-hooks v5→v6` (Major), `ruff-pre-commit v0.7.4→v0.15.x` (parallel zu pyproject `ruff`), `mirrors-mypy v1.13.0→v1.20.2` (innerhalb Major).
- **Container-Images:** `ghcr.io/astral-sh/uv:0.8.17 → 0.11.8` (3 0.x-Minors), `postgis/postgis:16-3.4 → 16-3.5` (PostGIS-Minor; Postgres 16 bleibt).
- **Within-Constraint-Refresh:** `pyjwt 2.10.1 → 2.12.1` (locked hinkt 2 Minors hinter, freigabefrei via `uv lock --upgrade-package`).

Patrick hat am 2026-04-30 **Variante B** (Voll-Sweep ohne Runtime-Majors) freigegeben. Begründung: Erfahrung aus STACK-001 hat den Aufwand für einen geschlossenen Stack-Bump validiert; ein zweiter, auf Backend fokussierter Sweep kostet weniger Zeit als drei verstreute Major-Entscheide während M8. Die Minimal-Variante A (`fastapi-users` allein) hätte 12 weitere Out-of-Range-Pins liegen lassen und einen zweiten Audit-Bedarf vor M9 erzeugt.

### Entscheidungen

**A. Versionssprünge `backend/pyproject.toml`.**

| Paket | Constraint vorher | Constraint nachher | Locked vorher | Locked nachher (Erwartung) |
|---|---|---|---|---|
| `fastapi` | `>=0.115,<0.116` | `>=0.136,<0.137` | 0.115.14 | 0.136.1 (Stand 2026-04-23) |
| `uvicorn[standard]` | `>=0.32,<0.33` | `>=0.46,<0.47` | 0.32.1 | 0.46.0 |
| `pydantic` | `>=2.9,<3` | `>=2.9,<3` (unverändert) | 2.13.3 | 2.13.3 |
| `pydantic-settings` | `>=2.6,<3` | `>=2.6,<3` (unverändert) | 2.14.0 | 2.14.0 |
| `structlog` | `>=24.4,<25` | `>=25,<26` | 24.4.0 | 25.5.0 |
| `sqlalchemy[asyncio]` | `>=2.0.36,<3` | `>=2.0.36,<3` (unverändert) | 2.0.49 | 2.0.49 |
| `alembic` | `>=1.14,<2` | `>=1.14,<2` (unverändert) | 1.18.4 | 1.18.4 |
| `asyncpg` | `>=0.30,<0.31` | `>=0.31,<0.32` | 0.30.0 | 0.31.0 |
| `psycopg[binary]` | `>=3.2,<4` | `>=3.2,<4` (unverändert) | 3.3.3 | 3.3.3 |
| `geoalchemy2` | `>=0.15,<0.16` | `>=0.19,<0.20` | 0.15.2 | 0.19.0 |
| `uuid-utils` | `>=0.10,<0.11` | `>=0.14,<0.15` | 0.10.0 | 0.14.1 |
| `fastapi-users[sqlalchemy]` | `>=14,<15` | `>=15,<16` | 14.0.2 | 15.0.5 |
| `argon2-cffi` | `>=23.1,<24` | `>=25,<26` | 23.1.0 | 25.1.0 |
| `pyjwt` | `>=2.10,<3` | `>=2.10,<3` (unverändert, Refresh) | 2.10.1 | 2.12.1 |
| `email-validator` | `>=2.2,<3` | `>=2.2,<3` (unverändert) | 2.3.0 | 2.3.0 |
| `openlocationcode` | `>=1.0,<2` | `>=1.0,<2` (unverändert) | 1.0.1 | 1.0.1 |
| `httpx` | `>=0.27,<0.28` | `>=0.28,<0.29` | 0.27.2 | 0.28.1 |
| `ruff` (dev) | `>=0.7,<0.8` | `>=0.15,<0.16` | 0.7.4 | 0.15.12 |
| `mypy` (dev) | `>=1.13,<2` | `>=1.13,<2` (unverändert) | 1.20.2 | 1.20.2 |
| `pytest` (dev) | `>=8.3,<9` | `>=9,<10` | 8.4.2 | 9.0.3 |
| `pytest-asyncio` (dev) | `>=0.24,<0.25` | `>=1,<2` | 0.24.0 | 1.3.0 |
| `testcontainers[postgresql]` (dev) | `>=4.8,<5` | `>=4.8,<5` (unverändert) | 4.14.2 | 4.14.2 |
| `coverage` (dev) | `>=7.13.5` | `>=7.13.5` (unverändert) | 7.13.5 | 7.13.5 |

**B. `.pre-commit-config.yaml`-Anpassungen.**
- `pre-commit/pre-commit-hooks` v5.0.0 → v6.0.0 (Major).
- `astral-sh/ruff-pre-commit` v0.7.4 → v0.15.12 (synchron zu pyproject `ruff`).
- `pre-commit/mirrors-mypy` v1.13.0 → v1.20.2 (synchron zu pyproject `mypy`).
- `additional_dependencies` für `mypy`-Hook: Pins `pydantic`/`pydantic-settings`/`fastapi`/`structlog` an die jeweils neuen Konstellationen ankleichen, soweit relevant.

**C. Container-Image-Tags.**
- `docker/backend.Dockerfile`: `COPY --from=ghcr.io/astral-sh/uv:0.8.17 /uv /usr/local/bin/uv` → `ghcr.io/astral-sh/uv:0.11.8`. Build-Tool-Drift (3 0.x-Minors). uv 0.11 hat keinen erkennbaren Breaking-Change im `uv sync --frozen --no-dev`-Pfad gegen 0.8 (verifiziert via Stichprobe der Release-Notes).
- `docker/docker-compose.yml`: `postgis/postgis:16-3.4` → `postgis/postgis:16-3.5`. Postgres-Major bleibt 16 (Daten-Migration ausgeschlossen). PostGIS-Minor 3.4 → 3.5: kompatibel zu Postgres 16, keine Schema-Änderung erforderlich, PostGIS-Erweiterung wird beim Container-Start regulär initialisiert.

**D. Innerhalb-Constraint-Refresh (freigabefrei nach §5).**
- `pyjwt`: Locked-Version 2.10.1 → 2.12.1 via `uv lock --upgrade-package pyjwt`. Constraint `>=2.10,<3` bleibt.

**E. Out-of-Scope.**
- **Postgres-Major:** 16 → 17 oder 18. Datenmigrations-Aufwand, eigener ADR bei Bedarf.
- **Node-Major:** 22 → 24 LTS. `engines: ">=22 <23"` in `frontend/package.json` bleibt unangetastet (Frontend war Scope von STACK-001, der dort bewusst stehen ließ).
- **Python-Major:** 3.12 → 3.13. mypy-/pydantic-Plugin-Kompat-Risiko, eigener ADR bei Bedarf.
- **CLAUDE.md-Methodik-Härtung:** Blocker #001 Punkt 2 bleibt offen.
- **SQLAdmin-Aufnahme** als neue Backend-Dependency: Teil von M8, nicht Teil dieses Stack-Bumps. M8-Strategie-ADR (geplant ADR-049) entscheidet die Versionsbasis.
- **Mockito/Stub-Refactoring** für ggf. neu deprecated APIs: nur reaktiv adressieren, falls Tests rot werden.

**F. Ausführungsreihenfolge (Phasen).**

Die Sweep-Reihenfolge folgt dem Risiko-Gradienten *aufsteigend*: erst tooling-only Bumps (Lint/Typing), die die Runtime nicht berühren, danach Test-Tooling, danach Runtime-Libraries, zuletzt Frameworks und Container. Tests werden zwischen den Phasen gefahren, sodass eine ggf. brechende Phase isoliert identifiziert werden kann.

1. **Phase 1 — Within-Constraint-Refresh:** `uv lock --upgrade-package pyjwt`. Sanity-Check, dass das Lockfile-Tool funktioniert.
2. **Phase 2 — Tooling-Bumps:** `ruff` 0.7→0.15 (pyproject + pre-commit synchron), `mirrors-mypy` v1.13→v1.20.2, `pre-commit-hooks` v5→v6. `ruff check` + `mypy --strict` ausführen, neue Lints fixen oder per `ignore` whitelisten (mit Kommentar).
3. **Phase 3 — Test-Tooling-Majors:** `pytest` 8→9, `pytest-asyncio` 0.24→1.x. `pytest` ausführen — Migrations-Tweaks (z. B. `asyncio_mode`, deprecated-fixture-Patterns) addressieren.
4. **Phase 4 — Runtime-Library-Bumps:** `httpx` 0.27→0.28, `asyncpg` 0.30→0.31, `structlog` 24→25, `argon2-cffi` 23→25, `geoalchemy2` 0.15→0.19, `uuid-utils` 0.10→0.14, `uvicorn` 0.32→0.46. Tests laufen lassen.
5. **Phase 5 — Framework-Majors:** `fastapi` 0.115→0.136, `fastapi-users` 14→15. **Höchstes Risiko** (Auth-Bridge, Routing-Layer, Pydantic-Integration). Bei Breakage: Migrations-Anpassung im Code, Tests grün ziehen.
6. **Phase 6 — Container/Build:** `ghcr.io/astral-sh/uv:0.11.8`, `postgis:16-3.5`. `docker compose build backend` und `docker compose up db` validieren.
7. **Phase 7 — Verifikation:** Volle `pytest`-Suite (Erwartung: 182/182 grün, ggf. mit migrations-bedingten Anpassungen). `ruff check` clean. `mypy --strict` clean. `docker compose build` clean.

**G. Verifikationsstrategie.**
DoD nach CLAUDE.md §9:
1. `uv lock` durchläuft ohne Fehler, neuer Lockfile committet.
2. `uv sync` (mit dev) erzeugt eine konsistente Venv.
3. `pytest` läuft vollständig grün; Anzahl der grünen Cases im Bericht festgehalten.
4. `ruff check .` clean (ggf. neu eingeführte Regel-Treffer dokumentiert oder gefixt).
5. `mypy --strict` clean.
6. `docker compose -f docker/docker-compose.yml build backend` produziert ein Image; uv-Image-Tag im Build-Log sichtbar als `0.11.8`.
7. `docker compose -f docker/docker-compose.yml up db` startet; PostGIS-Erweiterung (`SELECT postgis_version();`) liefert eine 3.5-Versionszeichenkette.
8. Smoke gegen das gebaute Backend (`curl http://127.0.0.1:8000/api/health`) liefert HTTP 200.

### Verworfene Alternativen

- **Variante A (Minimal-Sweep: nur `fastapi-users 14→15`).** Adressiert das M8-Risiko, lässt aber 12 out-of-range-Pins offen. Erzeugt einen zweiten Audit-Bedarf vor M9. Nicht effizient.
- **Variante C (Audit-Befund nur dokumentieren, keine Bumps).** Spart M8-Verzögerung, lässt Drift weiter wachsen. Bei späterem Sweep wären M8-Codeänderungen mit zu adressieren — teurer, nicht günstiger.
- **Variante D (Voll-Sweep + Runtime-Majors).** Postgres/Node/Python in einem Block hätte eigenständige Daten-/Build-/Plugin-Validierungen erzwungen; der zusätzliche Aufwand übersteigt den Nutzen für Pfad A (alle drei Runtimes sind aktuell auf einer aktiv gepatchten Major). Wenn Pfad B aktiviert wird, kann das je Runtime-Major separat getrieben werden.
- **Versions-Cap weglassen** (z. B. `fastapi>=0.136`). Dies würde künftige Auto-Upgrades durch `uv lock --upgrade` einfach erlauben und wäre weniger restriktiv. Verworfen, weil 0.x-Libraries per SemVer-Konvention in jeder Minor brechen können — der Cap dient als Schutz gegen unbeabsichtigte Major-Drifts und ist eine bewusste CLAUDE.md-§4-Schutzschicht. Beibehaltung des Cap-Stils aus M0.

### Lessons Learned

**Beobachtung:** Der Backend-Drift ist im Mittel kleiner als der Frontend-Drift (Lockfile war refresht, 9 Pins waren bereits at-latest-within-constraint), aber die Constraint-Caps in `pyproject.toml` sind seit M0 nie gehoben worden. Das heißt: Lockfile-Pflege erfasst nur den Innerhalb-Constraint-Drift, nicht den Out-of-Constraint-Drift. Eine routinemäßige `uv lock --upgrade`-Übung allein reicht nicht aus, um Major-Lag zu erkennen.

**Ableitung:**
1. Constraint-Caps in `pyproject.toml` und Lockfile-Snapshots driften unabhängig voneinander. Der Audit-Wert ist die Differenz zwischen Constraint-Cap und Registry-Latest, nicht die Differenz zwischen Lockfile-Snapshot und Registry-Latest.
2. Periodische Audits der Constraint-Caps gegen Registry-`latest` sind die einzige verlässliche Drift-Erkennung — ein automatisierbarer Skript-Schritt (Blocker #001 Punkt 2 schlägt das vor) wäre die natürliche Antwort.

### Migrations-Begleiterscheinungen (beobachtet 2026-04-30)

Während der Phasen-Ausführung sind eine Reihe von Effekten aufgetreten, die den ADR-Scope nicht brechen, aber für künftige Backend-Bumps wertvoll sind.

**A. `fastapi-users 14.0.2` enthält einen ultra-strikten Transitiv-Pin auf `pyjwt[crypto]==2.10.1`.**
Phase 1 (`uv lock --upgrade-package pyjwt`) wirkungslos gelaufen — das Lockfile blieb auf 2.10.1. uv-Resolver-Debug-Log zeigte: `fastapi-users==14.0.2 depends on pyjwt[crypto]>=2.10.1, <2.10.1+` (das `+` ist eine uv-interne Notation für „exklusiv obere Grenze direkt nach 2.10.1"). Konsequenz: pyjwt-Refresh ließ sich nicht vor Phase 5 fahren. Nach `fastapi-users 14→15` war die transitive Klammer aufgehoben, pyjwt landete im selben Lock-Lauf auf 2.12.1. Lessons: Bei künftigen Audits den Lockfile-Resolver nicht nur auf direkte Dependencies, sondern auch auf transitive Pin-Klammern prüfen — eine `pyproject.toml`-Constraint wie `>=2.10,<3` reicht nicht aus, wenn ein direktes Dep den Pin verengt.

**B. Analoges Phänomen für `argon2-cffi`: `fastapi-users 14` zwingt via `pwdlib[argon2]==0.2.1` auf `argon2-cffi>=23.1.0,<24`.**
Der erste Phase-4-Lockversuch mit `argon2-cffi>=25,<26` schlug mit „requirements are unsatisfiable" fehl. Workaround: argon2-cffi-Bump aus Phase 4 zurückgenommen, in Phase 5 zusammen mit fastapi-users 15 + pwdlib 0.3.0 nachgezogen. **Beide Pins (pyjwt, argon2-cffi) sind also unauflösbar an die fastapi-users-Major gekoppelt.** Bei Pfad-A-Architektur stellt das kein Problem dar; bei Pfad-B-Aktivierung wäre das eine Vendor-Lock-in-Beobachtung wert.

**C. `ruff 0.15.12` aktiviert standardmäßig drei Regeln, die in 0.7.4 stillschweigend nicht erkannt wurden.**
- `UP042` (StrEnum): `class X(str, enum.Enum)` → `class X(enum.StrEnum)`. 5 Treffer in `app/models/catalog.py`, `app/models/person.py`, `app/models/user.py`. Auto-Fix per `ruff check --fix --unsafe-fixes` zuverlässig.
- `UP046`/`UP047` (Generic Class/Function → Python-3.12-Type-Parameter): 7 Treffer in `app/services/catalog.py`, `app/routes/catalog.py`, `app/schemas/common.py`. Auto-Fix funktioniert, **aber:** generiert eine inkonsistente Mischung aus alten `TypeVar`-Modul-Definitionen und neuen Type-Param-Signaturen. `app/routes/catalog.py:55-63` hatte nach Auto-Fix einen Funktion-Header `[T: Base]` mit Body-Referenzen auf das alt-stilige `_T`. Manuell aufgeräumt: alte `TypeVar`-Definitionen entfernt, Body-Variablen auf den neuen Typ-Param-Namen umgestellt.
- `RUF046`/`RUF059` (überflüssige Casts, ungenutzte Tupel-Entpackungen): 5 Treffer in den Tests. Auto-Fix führte zu `_user`/`_csrf`-Prefixierung, was den bestehenden Stilkonventionen entspricht.
Lessons: `--unsafe-fixes` für UP046/UP047 nicht blind übernehmen — manueller Sweep nach Anwendung Pflicht, um Halbmigrations zu vermeiden.

**D. `ruff format` zwischen 0.7 und 0.15 hat das Zeilen-Layout für mehrzeilige Funktions-Signaturen geändert.**
22 Bestand-Files wurden bei `ruff format .` reformatiert (Migrations-Files, Test-Files, einige Service-Files). Konkrete Änderung: Funktions-Signaturen, die in 0.7 auf mehrere Zeilen umbrochen wurden, werden in 0.15 auf eine Zeile zurückgezogen, sofern sie unter `line-length = 100` passen. Funktional unverändert. **Pragmatisch akzeptiert** — die 22 Files sind im selben Commit Teil der ADR-048-Migration. Alternative wäre gewesen, die Format-Drift in einen separaten Commit auszulagern; dagegen sprach, dass das Reformat-Verhalten Teil der ruff-0.15-Migration *ist* und vom Bump untrennbar.

**E. Kein Code-Bruch durch fastapi 0.115→0.136 bzw. fastapi-users 14→15.**
Nach Phase 5 liefen alle 182 Tests beim ersten Versuch grün. Erwartet waren Migrations-Anpassungen für (1) Pydantic-v2-Async-Validators (in 0.116 als breaking deprecated markiert) und (2) `fastapi-users` Auth-Backend-Renaming. Tatsächlich: HC-Map nutzt keinen async validator und keine `fastapi-users`-API, die zwischen 14 und 15 entfernt wurde. Lessons: Die FastAPI-Minor-Bump-Phobie ist im konkreten Fall überzogen; Test-Coverage-Filter funktioniert auch hier als erstes Sicherheitsnetz (analog ADR-047 §I).

**F. PostGIS-Volume-Hybridzustand bei Tag-Bump auf bestehender Test-Instanz.**
Nach `docker compose up db` mit Tag `16-3.5` auf einem persistierten Volume, das vorher `16-3.4` initialisiert hat, läuft das Container-Binary mit PostGIS 3.5.2, aber die Datenbank-eigenen Extension-Procs sind weiterhin auf 3.4.3 (`postgis_full_version()` zeigt: `(core procs from "3.4.3 e365945" need upgrade)`). Auf einem frischen Volume entfällt das. Saubere Auflösung im laufenden Setup: einmalig `ALTER EXTENSION postgis UPDATE;` (und für Topology die analoge UPDATE-Anweisung). Für M10 (VPS-Deployment): in Bootstrap-Skript aufnehmen, falls vor Go-Live ein PostGIS-Bump fällig wird. **Aktuell akzeptierter Hybridzustand**, keine funktionale Beeinträchtigung in der Test-Suite (testcontainers fährt für jeden Test eine frische DB hoch).

**G. PostGIS-Image `postgis/postgis:16-3.5` ist amd64-only auf Docker Hub.**
Beim ersten `docker compose up db` Pull-Fehler `no matching manifest for linux/arm64/v8`. Workaround: `docker pull --platform linux/amd64 postgis/postgis:16-3.5` zwingt Rosetta-Emulation auf Apple Silicon. Konsequenz: Der `compose up`-Lauf zeigt einen Hinweis-Banner „The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)" — das ist erwartetes Verhalten und kein Fehler. Identisches Verhalten lag bereits beim alten Tag `16-3.4` vor (war im project-context.md nicht dokumentiert). **Keine Verschlechterung**, aber als Setup-Voraussetzung für M10 (wenn dort andere Hoster-Architekturen ins Spiel kommen) im Hinterkopf zu behalten. Die `alpine`-Variante (`16-3.5-alpine`) hat dieselbe Beschränkung.

**H. `testcontainers==4.14.2` Warnung „package does not have an extra named `postgresql`".**
Bei jedem `uv lock` taucht der Hinweis auf — der Extra-Name wurde in einer testcontainers-Minor umbenannt. Bestand vor STACK-002, ist also keine durch diese ADR eingeführte Beobachtung. Folge-Schritt-würdig (kosmetisch, kein Breakage).

**I. Backend-Image `hc-map-backend` baut sauber gegen `ghcr.io/astral-sh/uv:0.11.8`.**
`uv sync --frozen --no-dev` läuft im Build-Stage in 1.4 s durch (Layer-Cache aktiv). Smoke-Test mit `docker run --rm hc-map-backend:latest /app/.venv/bin/python -c "import fastapi, fastapi_users, …; print(...)"` gibt die erwarteten Versionen aus: `fastapi=0.136.1, fastapi-users=15.0.5, sqlalchemy=2.0.49, structlog=25.5.0, argon2=25.1.0, jwt=2.12.1`. Build-Tool-Drift ist also schmerzfrei aufgelöst.

**J. argon2 `__version__`-Deprecation-Hinweis.**
Beim Smoke-Print zeigt argon2-cffi 25 die Warnung: „Accessing argon2.__version__ is deprecated and will be removed in a future release. Use importlib.metadata directly to query for argon2-cffi's packaging metadata." HC-Map-Code zugreift nirgends auf `argon2.__version__` — der Hinweis stammt nur aus dem Smoke-Print. Keine Aktion nötig.

**K. Test-Suite-Laufzeit unverändert.**
Phase-für-Phase-Messung: 70 s (Baseline) / 64 s (nach Phase 2) / 63 s (nach Phase 3) / 64 s (nach Phase 4) / 67 s (nach Phase 5) / 66 s (nach Phase 7 mit format applied). Schwankung im Sekundenbereich, kein erkennbarer Performance-Trend.

### Folge-Arbeit

- Blocker #001 Punkt 3 wird mit dieser ADR gelöst und nach „Gelöste Blocker" verschoben (Punkt 2 bleibt aktiv).
- README-Badges: Falls Backend-Versions-Badges (FastAPI, Python, Postgres) bestehen, im selben Commit aktualisieren — siehe CLAUDE.md §6 „README-Badges spiegeln den Ist-Zustand".
- M8 (Admin-Bereich, `[OFFEN]`) startet auf dem aktualisierten Backend-Stack. SQLAdmin-Versionswahl in M8-Strategie-ADR (ADR-049 oder Folge).
- Runtime-Majors (Postgres/Node/Python): Bleiben offen. Bei Bedarf jeweils eigener ADR-Antrag.
- CLAUDE.md-Methodik-Härtung (Blocker #001 Punkt 2): Bleibt offen. Vorschlag aus dem 2026-04-29-Verlauf (fünf Änderungen plus CI-Audit-Skript).
- pre-commit-Hooks selbst-Update (`pre-commit autoupdate`) als möglichen Folge-Schritt notieren — kann in den Audit-Skript-Workflow eingebaut werden, sobald Punkt 2 entschieden ist.

---

## ADR-049 — Implementierungsstrategie M8 (Admin-Bereich: SQLAdmin-Schicht + Next.js-Workflow-Schicht)

**Status:** Accepted
**Datum:** 2026-04-30
**Freigabe:** 2026-04-30 (Patrick)
**Kategorie:** §4.1 Architektur (Zwei-Schichten-Admin-Topologie konkretisiert), §4.2 neue Module (`backend/app/admin_ui/`, `backend/app/routes/admin.py`, Frontend-Workflow-Routen unter `(admin-only)/`), §4.3 neue externe Abhängigkeit (`sqladmin`), §4.5 API-Verträge (`/api/admin/*`-Bündel inkl. Person-Merge), §4.6 Sicherheit (Cookie-Bridge SQLAdmin↔fastapi-users, Admin-RBAC).
**Vorgänger:** ADR-016 (2026-04-22, Zwei-Schichten-Ansatz beschlossen), ADR-006 (Auth-Topologie: HttpOnly-Cookie + JWT), ADR-019 (RLS via `app_user`-Rolle + GUCs), ADR-014 (on-the-fly-Person + Linkable-Verknüpfung), ADR-002 (Anonymisierungs-Kompromiss), ADR-015 (Admin-Export + Stats-Granularität), ADR-048 (Backend-Stack-Stand auf 2026-04-30).

### Kontext

ADR-016 hat den Zwei-Schichten-Ansatz verabschiedet: SQLAdmin-Schicht für reine Stammdaten-CRUD und Daten-Inspektion, Next.js-Schicht für Workflow-UI (Freigabe-Queues — bereits in M7.4 abgedeckt — Personen-Merge, Anonymisierungs-Wizard, User-Anlage mit Linkable-Person-Verknüpfung, Admin-Export, Statistik-Übersicht). Der Fahrplan-Eintrag M8 listet die Deliverables, lässt aber Sub-Step-Schnitt, SQLAdmin-Versionsbasis, Cookie-Bridge-Mechanik, ModelView-Umfang, Person-Merge-Mechanik und Stats-Definition offen.

Backend-Stand nach ADR-048 (STACK-002): Python 3.12, FastAPI 0.136.1, fastapi-users 15.0.5, SQLAlchemy 2.0.49, Starlette 0.46.2 (über fastapi gepinnt). Auth-Cookie heißt `hcmap_session`, JWT-Strategy mit `secret_key`-HMAC, RLS-Helper `app/rls.py::stamp_session` setzt `app_user`-Rolle und drei GUCs (`app.current_user_id`, `app.current_role`, `app.current_person_id`) per Transaction. Admin-Routen-Schutz erfolgt heute pro Endpoint via `Depends(require_role(UserRole.admin))`.

Frontend-Stand nach ADR-047: Next.js 16.2.4, App Router, Route-Group `(protected)/admin/(admin-only)/` als Stub; Layouts sind RBAC-gesetzt (Editor für Catalog-Zweig, Admin für `(admin-only)`-Zweig).

Patrick hat den Sub-Step-Schnitt M8.1–M8.5 am 2026-04-30 freigegeben. Diese ADR formalisiert die fünf Schlüssel-Entscheidungen, deren Inhalte beim Sub-Step-Schnitt-Vorschlag im Conversation-Verlauf vom 2026-04-30 als Empfehlungen mit-genannt wurden, und fixiert sie als Implementierungs-Vorgaben.

### Entscheidungen

**A. SQLAdmin-Versionsbasis.**

PyPI-Lookup 2026-04-30: `sqladmin` `latest = 0.25.0` (Release 2026-04-18, BSD-3, Python 3.10–3.14, `requires_dist`: `starlette<2.0,>=0.50` für Py ≥3.10, `wtforms<3.2,>=3.1`, `jinja2`, `python-multipart`, `sqlalchemy>=2.0`).

Constraint-Cap-Stil analog ADR-048 §A: `sqladmin>=0.25,<0.26` in `backend/pyproject.toml` aufnehmen. Dependency-Anker:

| Paket | Constraint | Locked-Erwartung | Anmerkung |
|---|---|---|---|
| `sqladmin` | `>=0.25,<0.26` | 0.25.0 | Hauptlibrary |
| `wtforms` | (transitiv) | 3.1.x | `<3.2` durch sqladmin gepinnt |
| `jinja2` | (transitiv) | latest | bereits via fastapi-Standard |
| `python-multipart` | (transitiv) | latest | wahrscheinlich bereits über fastapi extras |

**Starlette-Hub:** SQLAdmin 0.25 fordert Starlette ≥0.50, FastAPI 0.136.1 erlaubt `starlette>=0.46.0` ohne Obergrenze. uv-Resolver hebt das Lockfile automatisch auf Starlette ≥0.50 (heute 0.46.2). FastAPI-Test-Suite verifiziert die Kompatibilität in M8.2-Phase 1.

**B. Cookie-Auth-Bridge SQLAdmin ↔ fastapi-users.**

SQLAdmin akzeptiert ein eigenes `AuthenticationBackend`-Subklassen-Interface mit den Hooks `login(request)`, `logout(request)`, `authenticate(request)`. **Entscheidung: Wiederverwendung der bestehenden JWT-Cookie-Strategy ohne separate Token-Ausgabe.**

Konkrete Mechanik (`backend/app/admin_ui/auth.py`):

1. `authenticate(request)` liest `request.cookies.get("hcmap_session")`.
2. Erzeugt eine `JWTStrategy`-Instanz (`app.auth.backend._jwt_strategy()`).
3. Ruft `await strategy.read_token(token, user_manager)` auf — wirft `InvalidTokenError` bei fehlendem/abgelaufenem Cookie.
4. Lädt `User` mit `user_manager.get(user_id)`, prüft `user.is_active and user.role == UserRole.admin`. Andernfalls Auth-Fail (kein Tier-down auf Editor — `/admin` ist admin-only, ADR-016).
5. Bei Erfolg legt `request.session["sqladmin_user_id"] = str(user.id)` an (SQLAdmin-Konvention für nachfolgende Calls innerhalb derselben Session). Starlette-`SessionMiddleware` ist dafür Voraussetzung — wird in `app/main.py` einmalig hinzugefügt mit `secret_key=settings.secret_key`, `same_site="lax"`, `https_only=cookie_secure`.
6. `login()`/`logout()` sind No-Op-Forwards: SQLAdmin-Login-Form wird **nicht** exponiert; stattdessen redirected `/admin/login` auf `/login` (Next.js-Login). Nach erfolgreichem Next.js-Login ist der `hcmap_session`-Cookie gesetzt und `/admin/*` ist erreichbar.

**Vorteil:** Kein zweiter Auth-Pfad, kein Token-Sharing, keine doppelte CSRF-Logik. SQLAdmin-Session-Cookie ist nur ein Hint für die Authority (welche User-ID zur Session gehört); der eigentliche Auth-Beweis ist und bleibt das `hcmap_session`-JWT.

**Logout-Verhalten:** Logout über `/api/auth/logout` löscht den `hcmap_session`-Cookie; SQLAdmin liefert beim nächsten Request `401`/`Redirect-to-Login`, weil `authenticate()` keinen gültigen Token mehr findet. Starlette-Session bleibt physikalisch bestehen, ist aber wertlos ohne JWT.

**C. RLS/GUC pro SQLAdmin-Request.**

SQLAdmin betreibt eigene `Engine`/`Session`-Bindung; die `app/rls.py::stamp_session`-Funktion ist nur per FastAPI-Dependency-Injection erreichbar. **Entscheidung: SQLAdmin nutzt eine eigene Async-Engine-Factory mit per-Session-Event-Hook**, der `stamp_session` automatisch ausführt.

Mechanik (`backend/app/admin_ui/__init__.py`):

1. SQLAdmin-Init mit `Admin(app, engine=admin_engine, authentication_backend=…)`. `admin_engine` ist eine separate `create_async_engine`-Instanz, die auf dieselbe DSN zeigt wie der Haupt-Engine (eigener Pool für Admin-Requests, vermeidet RLS-Stamp-Konflikte mit nicht-Admin-Sessions).
2. Bei jeder Admin-Request-Session wird in einem `before_cursor_execute`/`after_begin`-Listener oder via Custom-`ModelView.list_query`-Override sichergestellt, dass `SET LOCAL ROLE app_user` + GUC-Stempel vor dem ersten DML laufen.
3. **Pragmatik:** Da Admin per RLS ohnehin Vollzugriff hat (siehe ADR-019 Policies mit `current_role = 'admin'`-Bypass), genügt es, den Admin als `app_user` mit `current_role = 'admin'` zu stempeln. Keine Sonderbehandlung der RLS für SQLAdmin nötig.
4. Falls die `before_*`-Hook-Variante in SQLAdmin 0.25 zu fragil ist: Alternative ist ein `ModelView`-Basisklassen-Override (`async def list_query(...)` etc.), der vor jedem Query-Aufruf das Session-Stamping injiziert. Endgültige Wahl in M8.2 nach Quelltext-Sichtung des SQLAdmin-Internals; beide Wege sind funktional äquivalent.

**D. ModelView-Umfang.**

Alle 8 Domain-Tabellen werden als ModelView angelegt:

| Tabelle | Mode | Spalten (List) | Filter | Edit-Form-Beschränkungen |
|---|---|---|---|---|
| `User` | full CRUD | email, role, is_active, person_id, created_at | role, is_active | Passwort-Felder ausgeblendet (Zurücksetzen-Funktion in Next.js-Schicht); `person_id` als FK-Selector |
| `Person` | full CRUD | name, alias, origin, linkable, is_deleted, created_at | origin, linkable, is_deleted | Anonymisierungs-Felder (`is_deleted`, `deleted_at`) read-only — Anonymisierung erfolgt über Next.js-Workflow |
| `RestraintType` | full CRUD | name, brand, model, mechanism, status | mechanism, status | analog zu M7-CRUD-Forms |
| `ArmPosition` | full CRUD | name, status | status | — |
| `HandPosition` | full CRUD | name, status | status | — |
| `HandOrientation` | full CRUD | name, status | status | — |
| `Event` | **read + edit only** (kein Create, kein Delete) | id, started_at, ended_at, lat, lon, plus_code, reveal_participants, is_deleted, created_by | reveal_participants, is_deleted | Neuanlage läuft über Live-/Backfill-Pfad (RxDB-Sync, ADR-029); Soft-Delete läuft über Edit-Pfad (ADR-040). Hard-Delete in SQLAdmin bewusst gesperrt |
| `Application` | **read-only** | id, event_id, sequence_no, performer_id, recipient_id, started_at, ended_at, is_deleted | is_deleted | Mutationen ausschließlich über Sync-Endpoints (ADR-029); SQLAdmin nur als Inspektions-Tool |

**Begründung der Edit-Sperren:** `Event.create`/`Event.delete` und alle `Application`-Mutationen würden den Sync-Vertrag (`updated_at`-LWW, Auto-Participant-Trigger, Sequence-No-Vergabe) umgehen. Inkonsistente RxDB-Pulls wären die Folge. Read+Edit-only auf Event ist der Kompromiss für Recovery-Aktionen (z. B. fehlerhafte Notiz korrigieren, wenn Editor das nicht selbst kann).

Bulk-Actions: SQLAdmin-Standard für RestraintType/Position-Status (Approve/Reject), keine Bulk-Action für Person (zu fehleranfällig für Anonymisierung/Merge — bewusst nur Single-Item-Workflow in Next.js-Schicht).

**E. Person-Merge-Mechanik.**

Service `app/services/person_merge.py::merge_persons(session, source_id, target_id) -> MergeResult` als Transaction:

1. **Pre-Check:**
   - Beide Personen existieren, beide `is_deleted = false`.
   - Source ≠ Target.
   - Wenn `source.user` existiert (`user.person_id = source_id`): **Abort mit Fehler** „Source-Person ist mit User verknüpft — Merge nur möglich, wenn beide Source-Person und Target-Person nicht oder beide mit demselben User verknüpft sind" (Konzeptuell falsch, wenn ein User dadurch zwei Identitäten kollabiert).
2. **EventParticipant-Re-Pointing:** Konflikt-Resolution für `(event_id, person_id)`-UNIQUE:
   ```sql
   DELETE FROM event_participant
    WHERE person_id = :source
      AND event_id IN (
        SELECT event_id FROM event_participant WHERE person_id = :target
      );
   UPDATE event_participant SET person_id = :target WHERE person_id = :source;
   ```
3. **Application-Re-Pointing:**
   ```sql
   UPDATE application SET performer_id = :target WHERE performer_id = :source;
   UPDATE application SET recipient_id = :target WHERE recipient_id = :source;
   ```
4. **Source-Person-Soft-Delete:** `UPDATE person SET is_deleted = true, deleted_at = now(), name = '[merged → ' || :target || ']' WHERE id = :source` (Markierung dient der Audit-Spur, anders als die ADR-002-Anonymisierung).
5. **Audit-Log:** Eintrag in `app/services/person_merge.py` via `structlog`-Logger (Felder: `source_id`, `target_id`, `actor_user_id`, `affected_event_participants`, `affected_applications`).

**Datenmodell-Migration: nicht erforderlich.** Die Operation arbeitet auf bestehenden Spalten/Constraints. `(event_id, person_id)` UNIQUE bleibt erhalten, `application.performer_id`/`recipient_id` haben keine Such-Conflict-Constraints.

**F. Stats-Definition (`/api/admin/stats`).**

Pydantic-Response-Schema `AdminStats`:

```python
class AdminStats(BaseModel):
    events_total: int
    events_per_month_last_12: list[MonthlyCount]   # {year, month, count}
    top_restraints: list[RestraintCount]            # {id, name, count}, top 10
    top_arm_positions: list[PositionCount]          # top 5
    top_hand_positions: list[PositionCount]         # top 5
    users_by_role: dict[UserRole, int]
    persons_total: int
    persons_on_the_fly_unlinked: int
    pending_catalog_proposals: int
```

Implementierung als ein einziger Endpoint mit ~6 SQL-Aggregat-Queries innerhalb derselben RLS-Session (Admin sieht alles). **Kein Caching in M8** — ADR-015 §F-Bewertung („bei Pfad-A-Last <5.000 Events ist Echtzeit-Aggregation unkritisch") gilt unverändert. Falls die Antwortzeit über die in §7 project-context.md genannten 2 s steigt, wird Caching als Folge-Aufgabe geöffnet.

**G. Admin-Export-Format (`/api/admin/export/all`).**

Single-Endpoint, `GET /api/admin/export/all?format=json` (CSV folgt nicht in M8 — Pfad-A-Volumen rechtfertigt es nicht). Streaming-Response mit `application/x-ndjson` ist bewusst **nicht** gewählt: Patrick als einziger Konsument profitiert mehr von einem strukturierten JSON-Objekt als von Zeilen-Streaming.

Response-Shape:

```json
{
  "exported_at": "2026-04-30T12:34:56Z",
  "schema_version": 1,
  "users": [...],
  "persons": [...],
  "events": [...],
  "applications": [...],
  "event_participants": [...],
  "application_restraints": [...],
  "restraint_types": [...],
  "arm_positions": [...],
  "hand_positions": [...],
  "hand_orientations": [...]
}
```

Soft-deleted Rows werden mit-exportiert (Backup-Charakter — siehe ADR-015 §G „Notausstieg"). Größenbedenken sind bei Pfad-A-Volumen (<5.000 Events × ~3 Apps × ~2 Restraints) irrelevant (~1–5 MB JSON, problemlos in einem Response-Body).

**H. Sub-Step-Spezifikation.**

| Sub-Step | Status nach Freigabe | Deliverables | Verifikation |
|---|---|---|---|
| **M8.1** | Diese ADR-049 zur Freigabe vorgelegt; bei Annahme `Status: Accepted` setzen, Fahrplan-Eintrag M8 in 5 Sub-Steps aufschlüsseln | ADR-049 + Fahrplan-Update | Patrick gibt frei |
| **M8.2** | Backend SQLAdmin-Schicht (Punkt A–D) | `pyproject.toml`-Dep, `app/admin_ui/{__init__.py,auth.py,views.py}`, `app/main.py`-Mount, `Starlette.SessionMiddleware`-Mount, neue Tests in `backend/tests/test_admin_ui.py` (mind. 1 positiver Login-Flow, 1 Editor-Reject, 1 Anonymous-Reject, 1 ModelView-Listing pro Tabelle) | `pytest` grün ≥187, `ruff`/`mypy --strict` clean, `docker compose build` clean. Browser-Smoke `/admin/user/list` mit Admin-Cookie (manuell, vor M8.3-Start) |
| **M8.3** | Backend `/api/admin/*` (Punkt E–G) | `app/routes/admin.py` (`users`-CRUD, `stats`, `export/all`, `persons/{id}/merge`, `persons/{id}/anonymize`), `app/services/person_merge.py`, `app/services/person_anonymize.py` (sofern noch nicht in M2 angelegt), neue Pydantic-Schemas, RLS-Tests inkl. negativ Editor/Viewer | `pytest` grün ≥200, Coverage Person-Merge ≥90 % (Datenintegrität-kritisch), Coverage Anonymisierung 100 % (DSGVO-Pflicht aus project-context.md §6) |
| **M8.4** | Frontend `/admin` Dashboard + `/admin/users` | `frontend/src/app/(protected)/admin/(admin-only)/page.tsx` mit Stats-Cards, `users/page.tsx` (Listing) + `users/new/page.tsx` (Form mit Linkable-Person-Picker), TanStack-Query-Hooks `useAdminStats`, `useAdminUsers`, `useCreateAdminUser`, vitest-Tests | `pnpm test` grün, `pnpm typecheck` clean, `pnpm lint` clean, Browser-Smoke (preview_*-Workflow gemäß Hauptpfad) |
| **M8.5** | Frontend `/admin/persons` Workflow + Export-UI | `persons/page.tsx` mit Filtern (`origin=on_the_fly`, `linkable=true`, `unlinked=true`), Merge-Wizard (Source/Target-Picker, Konflikt-Vorschau, Bestätigung), Anonymisierungs-Confirm-Dialog, Export-Trigger-Button mit `?format=json`-Download | `pnpm test` grün, Browser-Smoke (Merge-Roundtrip + Anonymisierungs-Roundtrip + Export-Download), `CHANGELOG.md`-Eintrag, M8 → `[ERLEDIGT]` |

### Verworfene Alternativen

- **Eigene SQLAdmin-Login-Seite mit Session-Token-Re-Issue.** Hätte zwei Auth-Pfade erzeugt, doppelten CSRF-Bedarf, Sync-Risiko zwischen Cookie-Lifetime und Session-Lifetime. Verworfen zugunsten der Cookie-Bridge.
- **SQLAdmin als reine Datenbank-Inspektion ohne Edit-Rechte (read-only-only).** Hätte den ADR-016-Vorteil „Admin pflegt Stammdaten schnell" amputiert. Verworfen.
- **Person-Merge als SQLAdmin-Bulk-Action.** UI-Beschränkung von SQLAdmin (kein Konflikt-Vorschau-Step), zu fehleranfällig. Verworfen zugunsten Next.js-Wizard.
- **CSV-Export pro Tabelle in M8.** Ohne konkreten Konsumenten überdimensioniert. Bei Bedarf in Phase 2 aufnehmen.
- **Stats-Caching mit Redis oder LRU.** Pfad-A-Volumen rechtfertigt es nicht (siehe project-context.md §7). Bei Last-Druck nachträglich öffnen.
- **Hard-Delete in SQLAdmin für Application/Event.** Würde Sync-Tombstone-Mechanik (ADR-033) umgehen. Verworfen.
- **Gemeinsamer DB-Pool zwischen FastAPI- und SQLAdmin-Engine.** RLS-Stamp-Konflikte unter Last. Verworfen zugunsten separater Engine (siehe Punkt C).

### Risiken und Mitigationen

- **R1. Starlette-Auto-Bump (0.46→0.50+) bricht FastAPI-Verhalten.** Mitigation: Phase-1-Verifikation in M8.2 (volle Test-Suite vor SQLAdmin-Code). Bei Breakage: SQLAdmin auf 0.24 zurückstufen (kompatibel zu Starlette 0.46 für Py 3.10+) und die Versionsbasis im ADR-049-Folge-Update korrigieren.
- **R2. SQLAdmin-Internal-Hook für Session-Stamping ist nicht offiziell dokumentiert.** Mitigation: Quelltext-Sichtung in M8.2-Phase 2; Fallback-Variante (ModelView-Basisklasse mit `list_query`-Override) bleibt verfügbar und ist von der öffentlichen API gedeckt.
- **R3. Person-Merge-Konflikte bei `event_participant.UNIQUE`.** Mitigation: §E-Algorithmus löst Konflikte deterministisch (Source-Eintrag löschen, Target behalten — kein Datenverlust, da Source ohnehin gemerged wird).
- **R4. ModelView-Edit auf `Event` ohne Sync-Pfad.** Mitigation: Edit-Form auf wenige Felder beschränken (`note`, `reveal_participants`, `is_deleted`), `updated_at` per `set_updated_at`-Trigger automatisch hochziehen → der nächste RxDB-Pull liefert die Änderung an alle Clients.

### Folge-Arbeit

- M9 (w3w-Migration) ist verworfen (siehe ADR-050) — Bestand wird manuell über die bestehende Erfassungs-UI nachgetragen.
- M11 (Go-Live) verlangt User-Anlage-Workflow als Akzeptanzkriterium — wird in M8.4 erfüllt.
- Phase-2-Foto-Anhänge (M15) erweitern ggf. die Person-Anonymisierung um Medien-Löschung — kein M8-Scope.
- README-Badges: Falls SQLAdmin-Version-Badge aufgenommen wird, im selben Commit pflegen (siehe CLAUDE.md §6).

---

## ADR-050 — M9 (w3w-Migration) verworfen, `event.w3w_legacy` zu `legacy_external_ref` umgewidmet

**Status:** Accepted
**Datum:** 2026-05-01

### Kontext
M9 sah laut [`fahrplan.md`](./fahrplan.md) ein Skript vor, das den w3w-Bestand
über die what3words-API in HC-Map überführt (Dry-Run, Idempotenz, Report,
Personen-Mapping, Application-Heuristik). ADR-004 (2026-04-22) beschrieb diese
einmalige Migration und die Kündigung des w3w-Accounts danach.

Bei der Sessionplanung am 2026-05-01 wurde geklärt, dass der reale w3w-Bestand
klein genug ist, um von den Mitgliedern manuell über die bestehende
Erfassungs-UI (M5c „Nachträgliche Erfassung") nachgetragen zu werden. Das
Skript-, Test- und Sicherheitsbudget für M9 steht nicht mehr im Verhältnis zum
Nutzen.

Gleichzeitig existiert das Schema-Feld `event.w3w_legacy` (Spaltentyp
`text NULL`) als geplantes Migrations-Artefakt aus ADR-004. Wird M9 ersatzlos
gestrichen, bleibt die Spalte zwecklos im Schema.

### Entscheidung

**1. M9 wird verworfen.**
- Status im [`fahrplan.md`](./fahrplan.md): `[VERWORFEN]` mit Verweis auf
  diesen ADR.
- M11 (Go-Live) wird angepasst: Voraussetzung „Produktive w3w-Migration
  ausgeführt (aus M9)" entfällt. Bestand wird vor oder nach Go-Live manuell
  nacherfasst, das ist nicht blockierend für M11.
- w3w-Account kann sofort gekündigt werden. Mitglieder, die alte
  3-Wort-Adressen behalten möchten, müssen sie vor der Kündigung extern
  sichern (Screenshot, Notiz, Account-Export). Verantwortung liegt beim
  jeweiligen Mitglied, nicht beim System.

**2. `event.w3w_legacy` wird umbenannt zu `event.legacy_external_ref`** und
allgemein als optionale Selbstreferenz für nachträglich erfasste Events
gewidmet (z. B. die ursprüngliche 3-Wort-Adresse, eine externe Event-URL,
eine Projekt-ID). Konkret:

- **Schema:** Eigenständige Alembic-Migration mit
  `op.alter_column('event', 'w3w_legacy', new_column_name='legacy_external_ref')`
  und symmetrischer Down-Migration. Typ und Nullability bleiben unverändert
  (`text NULL`). Keine Datenmigration nötig — die Spalte enthält im aktuellen
  Stand ausschließlich `NULL`-Werte (kein Bestand wurde je migriert).
- **Backend:** `Event.w3w_legacy` (SQLAlchemy) → `Event.legacy_external_ref`.
  Pydantic-Schemas (`EventRead/Create/Update`, `EventDoc`), Sync-Service,
  Routes, Services und Exports werden konsistent umbenannt. Validierung
  bleibt: nullable text, keine Format-Vorgabe (offen für 3-Wort-Adresse,
  URL oder Freitext).
- **RxDB-Schema:** `frontend/src/lib/rxdb/schemas/event.schema.json` bekommt
  einen `version`-Bump (0 → 1) mit `migrationStrategies[1]`-Mapping
  `(oldDoc) => ({ ...oldDoc, legacy_external_ref: oldDoc.w3w_legacy ?? null,
  w3w_legacy: undefined })`. Property-Name im Schema wird zu
  `legacy_external_ref`; Drift-Test (ADR-031) erkennt einen Mismatch zur
  Pydantic-`EventDoc` automatisch.
- **Sync-Strategie:** Wechsel von `server-authoritative (Migrations-Artefakt)`
  zu **LWW** (last-write-wins). Begründung: Das Feld ist jetzt
  user-eingegeben und über den Edit-Modus nachträglich änderbar.
  ADR-029-Pro-Feld-Tabelle wird in der `event`-Sektion entsprechend
  aktualisiert.

**3. UI-Anbindung als eigener Fahrplan-Schritt M5c-NACH** (`[OFFEN]`,
nicht-blockierend für M10/M11). Eingabefeld nur in „Nachträgliche
Erfassung" (`event-backfill-form.tsx`) und im Edit-Modus
(`event-edit-form.tsx`); Anzeige im Detail-View, wenn nicht null. Keine
Live-Modus-Eingabe (Live-Modus ist für neue Events, Legacy-Referenz
sinnlos).

### Begründung
- Geringer Datenbestand (Größenordnung deutlich unterhalb M9-Skript-Schwelle).
- Manuelle Nacherfassung nutzt die bereits abgenommene M5c-UI, kein
  Sonderpfad.
- Spalten-Umwidmung (statt Entfernung) hält die Möglichkeit offen, dass
  Mitglieder beim Nachtragen die ursprüngliche 3-Wort-Adresse oder
  eine andere Legacy-Quelle als Selbstreferenz speichern.
- Generische Spaltenbezeichnung `legacy_external_ref` entkoppelt von w3w
  und ist für künftige Importe (CSV, API) wiederverwendbar, ohne erneute
  Schema-Migration.
- Sofortige Kündigung des w3w-Accounts spart laufende Kosten und entfernt
  eine externe Abhängigkeit aus Phase 1 vollständig.

### Konsequenzen

**Positiv:**
- M9-Aufwand entfällt (kein Skript, keine API-Mocks, keine Personen-Mapping-
  Heuristik, keine Test-Suite-Erweiterung für einen Einmal-Lauf).
- Direkte Brücke von M8.5 zu M10 (Deployment) — eine Fahrplan-Stufe weniger.
- Schema-Semantik wird klarer (`legacy_external_ref` statt w3w-spezifisch).
- ADR-004-Strategie (Lat/Lon + Plus Codes) bleibt unverändert gültig — nur
  die Übergangsstrategie wird vereinfacht.

**Negativ:**
- Mitglieder erfassen ihren Bestand manuell. Kein automatisierter
  Geokodier-Roundtrip mehr; jede 3-Wort-Adresse muss vor w3w-Account-
  Kündigung extern aufgelöst und dann manuell als Lat/Lon (Karten-Klick
  oder Plus-Code) eingegeben werden.
- Schema-Migration (Spalten-Rename) und Code-Refactor an ~30 Stellen
  (Backend + Frontend + Tests + RxDB-Schema-Bump). Aufwand einmalig,
  reversibel, Test-Suite deckt das Verhalten ab.
- `legacy_external_ref` ist textfrei: Mitglieder können beliebige Werte
  eintragen, was die Datenqualität reduziert, falls niemand die Konvention
  pflegt. Akzeptiert in Pfad A (eingeschworene Gruppe, <20 Personen).

### Verworfene Alternativen

- **A — M9 wie geplant umsetzen:** Verhältnis Aufwand/Nutzen unverhältnismäßig
  bei kleinem Bestand. Zudem laufende w3w-API-Abhängigkeit länger als nötig.
- **B — M9 streichen, Spalte `w3w_legacy` belassen:** Tote Spalte mit
  irreführendem Namen widerspricht CLAUDE.md §6 („Determinismus vor
  Kreativität"); Schema sammelt Zombie-Felder.
- **C — M9 streichen, Spalte komplett entfernen:** Verbaut die optionale
  Mitführung der ursprünglichen 3-Wort-Adresse für nachträglich erfasste
  Events. Mitglieder hätten keinen Ort, an dem sie die Selbstreferenz
  ablegen könnten, außer `event.note` (vermischt mit Freitext).
- **D — M9 verschieben, Skript erst bei Bedarf entwickeln:** Belässt die
  Entscheidung in der Schwebe und blockiert die ADR-004-Account-Kündigung.

### Folge-Aktionen

1. ADR-049-Pro-Feld-Tabelle: `w3w_legacy` → `legacy_external_ref` mit
   LWW-Strategie. *(in diesem Commit)*
2. [`fahrplan.md`](./fahrplan.md): M9 → `[VERWORFEN]` mit Verweis auf
   ADR-050; M11-Voraussetzung anpassen; Phasen-Übersicht aktualisieren;
   neuer Eintrag „M5c-NACH — Legacy-External-Ref im UI"
   (`[OFFEN]`, nicht-blockierend).
3. [`project-context.md`](./project-context.md) §5: what3words-API-Zeile
   entfernen; §11 verweist auf erfolgte Klärung.
4. [`architecture.md`](./architecture.md): `migrate_w3w.py` aus dem
   Skript-Inventar entfernen; Datenmodell-Spaltenname auf
   `legacy_external_ref` aktualisieren; externe-Abhängigkeiten-Tabelle
   bereinigen.
5. Alembic-Migration `20260501_HHMM_rename_w3w_legacy.py` (Up + Down).
6. Backend-Refactor (Models, Schemas, Sync, Routes, Services, Exports,
   Tests).
7. Frontend-Refactor (Types, RxDB-Schema mit Version-Bump und
   Migration-Strategy, Komponenten, Tests).
8. [`framework-analyse.md`](./framework-analyse.md): M9-Abschnitt als
   verworfen kennzeichnen.
9. [`README.md`](../README.md): Hinweis „nach der Migration" präzisieren —
   w3w-API ist nicht mehr Teil des Plans, kein Migrationslauf.
10. [`CHANGELOG.md`](../CHANGELOG.md): Eintrag.

### Referenzen
- [ADR-004](#adr-004--geokodierung-abschied-von-what3words-latlon--plus-codes)
  (präzisiert).
- [ADR-029](#adr-029--konfliktlösungsstrategie-m5b-live-first-mit-reconciliation)
  (Pro-Feld-Tabelle aktualisiert).
- [ADR-031](#adr-031--rxdb-schema-source-of-truth-hand-gepflegt--drift-test)
  (Drift-Test deckt Schema-Bump automatisch ab).

---

## ADR-051 — Implementierungsstrategie M10 (Release-Candidate-Bündel: Deployment-ready durch jedermann)

**Status:** Accepted
**Datum:** 2026-05-01
**Freigabe:** 2026-05-01 (Patrick)
**Kategorie:** §4.1 Architektur (Multi-Instanz-Pattern als aktive Linie, Reverse-Proxy als Wahlpunkt), §4.2 neue Module (`docker/compose.prod.yml`, Reverse-Proxy-Overlays, Backup-Container, `ops/runbook.md`, `docs/templates/consent-de.md`, Frontend-Reset-Pages), §4.3 neue externe Abhängigkeiten (`aiosmtplib`, Container-Tools `age`/`rclone`, GHCR als Image-Registry), §4.5 API-Verträge (Mail-Versand-Hooks für `forgot-password`/`reset-password` produktiv), §4.6 Sicherheit (TLS-Termination, Cookie-`Secure`/-`Domain`, Reverse-Proxy-Headers, Backup-Verschlüsselung, ACME-Email-Konfig), §4.7 Build/Deploy (CI/CD via GitHub Actions, Image-Tag-Schema, Deployment-Mechanik), §4.8 Lizenz (AGPLv3 als Projektlizenz, Compliance-Auswirkungen).
**Vorgänger:** ADR-001 (Hoster-Vertrauensmodell), ADR-002 (Anonymisierung), ADR-006 (Cookie-Auth-Topologie), ADR-014 (on-the-fly-Personen), ADR-015 (Aggregat-Statistiken), ADR-022 (Tile-Proxy serverseitig), ADR-032 (IndexedDB unverschlüsselt), ADR-047/048 (aktueller Stack-Stand), ADR-049 (Admin-Bereich), ADR-050 (M9 verworfen).

### Kontext

[`fahrplan.md`](./fahrplan.md) listet M10 als „VPS-Deployment & Betriebs-Grundausstattung" mit Caddy-Skizze in [`architecture.md`](./architecture.md). Patrick hat den Scope am 2026-05-01 auf **Release Candidate, deploybar durch jedermann** geschärft — d. h. HC-Map muss als generische Multi-Instanz-Anwendung distribuierbar werden, nicht als persönliches Setup auf Patricks VPS. Die generische Lieferung schließt mehrere Folgepunkte ein, die M10 ursprünglich nicht abgedeckt hat:

- **Funktionaler RC-Blocker:** [`backend/app/auth/mail.py`](../backend/app/auth/mail.py) ist ein Stub (loggt Tokens nur), Frontend-Pages für `/forgot-password` und `/reset-password` fehlen. Ohne produktiven Mail-Versand ist der Passwort-Reset-Pfad nicht benutzbar.
- **Lizenz-Lücke:** kein `LICENSE`-File im Repo. Ein Pre-Release-Tag ohne Lizenz ist rechtlich ungeklärt; bei Multi-Instanz-Distribution müssen Fork-Bedingungen explizit sein.
- **Einwilligungs-Lücke:** project-context.md §6 fordert „schriftlichen Einwilligungstext vor M11". Bei Multi-Instanz muss HC-Map eine **Vorlage** mitliefern, weil kein Deployer aus dem Stand alle relevanten ADR-Hinweise (ADR-001/002/014/015/032) zusammenschreiben kann.
- **Reverse-Proxy-Wahl:** Patrick hat am 2026-05-01 festgelegt, dass **sowohl Caddy als auch Traefik** unterstützt werden müssen. Damit darf der Reverse-Proxy nicht als hartkodierter Service im Haupt-Compose stehen.
- **Image-Distribution:** ohne öffentliche Image-Registry müsste jeder Deployer selbst bauen — bei AGPLv3 + „jedermann" wäre das eine erhebliche Hürde.
- **VPS-spezifische Festlegungen** (Provider, Domain, Backup-Anbieter, SMTP-Anbieter): müssen Konfiguration werden, nicht Code-Konstanten.

Patrick hat am 2026-05-01 fünf Default-Empfehlungen freigegeben: AGPLv3, Caddy + Traefik beide, age, GHCR public, `v0.1.0-rc.1`-Versionsschema. Diese ADR formalisiert den Sub-Step-Schnitt und die Mechanik-Entscheidungen, die für die Implementierung der neun M10-Sub-Steps bindend sind.

### Entscheidungen

**A. Projektlizenz: AGPLv3-only.**

`LICENSE`-File im Repo-Root mit dem unveränderten AGPLv3-Originaltext (https://www.gnu.org/licenses/agpl-3.0.txt). SPDX-Identifier `AGPL-3.0-only` in [`backend/pyproject.toml`](../backend/pyproject.toml) (`license = "AGPL-3.0-only"`) und [`frontend/package.json`](../frontend/package.json) (`"license": "AGPL-3.0-only"`). README erhält Lizenz-Badge und Kurzhinweis „HC-Map ist freie Software unter AGPLv3 — siehe [`LICENSE`](../LICENSE)".

**Compliance-Check:** Aktuelle Backend-Deps (FastAPI, SQLAlchemy, Pydantic, fastapi-users, structlog, openlocationcode, asyncpg, alembic, sqladmin) sind MIT/BSD-3/Apache-2.0/MPL-2.0 — alle AGPLv3-kompatibel. Frontend-Deps (Next.js MIT, React MIT, Tailwind MIT, shadcn/ui MIT, MapLibre BSD-3, RxDB Apache-2.0, TanStack-Query MIT, sonner MIT) ebenfalls. Keine GPL-/LGPL-Konflikte. Falls künftig eine Dep mit restriktiverer Lizenz aufgenommen werden soll: ADR-Pflicht analog ADR-048.

**Konsequenz für Pfad B:** AGPLv3 erlaubt Pfad B (Self-Hosting kommerzieller Forks) nicht ohne Quellcode-Offenlegung. Das ist projekt-politisch konsistent mit project-context.md („Datensouveränität"-Motiv), wird aber in der ADR explizit benannt, falls künftig kommerzielle Lizenz-Optionen erwogen werden.

**B. Reverse-Proxy: Wahlfreiheit Caddy oder Traefik via Compose-Overlays.**

`docker/compose.prod.yml` enthält **keinen** Reverse-Proxy-Service. App-Services (`backend`, `frontend`, `db`, `backup`) exposen ausschließlich interne Container-Ports — kein Host-Port-Mapping außer für die DB-Backup-Schnittstelle (loopback-only).

Zwei Overlay-Files liefern den Reverse-Proxy als getrennte Komposition:

- `docker/compose.caddy.yml` — Caddy v2 mit `Caddyfile.example` (Auto-TLS via Let's Encrypt, ein Konfig-File, ACME-Email aus `HCMAP_ACME_EMAIL`).
- `docker/compose.traefik.yml` — Traefik v3 mit dynamischer Config (`docker/traefik/traefik.yml.example` + `docker/traefik/dynamic.yml.example`, Auto-TLS via Let's Encrypt, ACME-Email aus `HCMAP_ACME_EMAIL`).

Operator-Befehl: `docker compose -f docker/compose.prod.yml -f docker/compose.caddy.yml --env-file .env.prod up -d` (analog für Traefik). Ein dritter Pfad „eigener vorhandener Reverse-Proxy" wird im Runbook dokumentiert: App-Compose ohne Overlay starten, Backend `:8000` und Frontend `:3000` an Host-Loopback bind, externer Reverse-Proxy per Operator-Wahl davorhängen. Kein offizieller Beispiel-Stack für nginx — wird zugunsten Caddy/Traefik-Fokus weggelassen, kann aber bei Bedarf als drittes Overlay nachgeliefert werden.

**Forwarded-Headers:** Beide Overlays setzen identisch `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For`. Backend-uvicorn wird mit `--proxy-headers --forwarded-allow-ips=*` gestartet (in Docker-Netz akzeptabel; externe Reverse-Proxies können die Header nicht direkt setzen, Container-internes Vertrauensmodell).

**Cookie-Konfiguration:** `HCMAP_COOKIE_SECURE=true` Pflicht (HTTPS-only). `HCMAP_COOKIE_DOMAIN` optional — wenn gesetzt, wird Cookie auch an Subdomains gereicht; Default leer (Host-Cookie). CSRF-Origin wird aus `HCMAP_BASE_URL` abgeleitet (z. B. `https://hc-map.example.org`).

**C. Mail-Backend: SMTP via `aiosmtplib`.**

Neue Backend-Dep `aiosmtplib>=3,<4` (MIT, asyncio-native SMTP-Client; PyPI-Lookup zu Beginn von M10.1 fixiert die exakte Patch-Version analog ADR-048-Pin-Stil). Kein `fastapi-mail` (Overkill für zwei Mail-Templates).

Implementierung in `backend/app/auth/mail.py`:

```python
class SMTPMailer:
    def __init__(self, settings: MailSettings) -> None: ...
    async def send_password_reset(self, email: str, token: str) -> None: ...
    async def send_verify(self, email: str, token: str) -> None: ...
```

Settings (Pydantic, in `backend/app/settings.py` ergänzen):

| Variable | Typ | Pflicht | Anmerkung |
|---|---|---|---|
| `HCMAP_SMTP_HOST` | str | ja (Prod) | z. B. `smtp.eu.mailgun.org` |
| `HCMAP_SMTP_PORT` | int | ja (Prod) | typ. 587 (STARTTLS) oder 465 (SMTPS) |
| `HCMAP_SMTP_USER` | str | optional | leer = ohne Auth |
| `HCMAP_SMTP_PASSWORD` | secret | optional | analog |
| `HCMAP_SMTP_STARTTLS` | bool | default `true` | bei Port 465 auf `false` setzen, dafür `HCMAP_SMTP_USE_TLS=true` |
| `HCMAP_SMTP_USE_TLS` | bool | default `false` | implizit-TLS für Port 465 |
| `HCMAP_SMTP_FROM` | EmailStr | ja (Prod) | „From"-Header und Envelope-Sender |
| `HCMAP_SMTP_FROM_NAME` | str | optional | Anzeigename, z. B. „HC-Map" |
| `HCMAP_BASE_URL` | str | ja (Prod) | Pflicht für Reset-Link-Generierung |

Backend-Auswahl in `app/auth/mail.py::get_email_backend()`: bei `HCMAP_ENVIRONMENT == "production"` und gesetztem `HCMAP_SMTP_HOST` → `SMTPMailer`; sonst → bestehender `LoggingMailer`-Stub (für Tests/Dev).

**Templates:** zwei einfache Plain-Text-Templates in `backend/app/auth/templates/` (kein HTML, kein Branding — minimal: Begrüßung, Reset-Link mit Token, Hinweis auf Gültigkeitsdauer). Internationalisierung **nicht** im RC-Scope — Templates sind deutsch (Default-Sprache laut project-context.md §1).

**Frontend-Pages:**

- `frontend/src/app/(public)/forgot-password/page.tsx` — Form mit E-Mail-Eingabe, POST `/api/auth/forgot-password`, Success-Toast (immer „Falls die E-Mail existiert, wurde ein Link versendet" — kein User-Enumeration), Link „zurück zum Login".
- `frontend/src/app/(public)/reset-password/page.tsx` — liest `?token=...` aus URL, Form mit zwei Passwort-Feldern, POST `/api/auth/reset-password`, Erfolgs-Redirect zu Login mit Toast.

Tests: vitest-Tests für beide Pages (Render, Form-Submission, Error-Pfad), pytest-Tests für `SMTPMailer` mit `aiosmtplib`-Test-Server (oder via Mocking — endgültige Wahl in M10.1 nach Lib-Erprobung).

**D. Backup-Service: pg_dump | age | rclone in Cron-Container.**

Eigener Service `backup` in `docker/compose.prod.yml`, gebaut aus neuem `docker/backup.Dockerfile`:

- Base: `debian:bookworm-slim`.
- Installiert: `postgresql-client-16`, `age`, `rclone`, `cron`, `tini`.
- Lädt Backup-Skript `docker/backup/backup.sh` und Cron-Config `docker/backup/crontab`.
- ENTRYPOINT `tini -- crond -f -L /var/log/cron.log` (Foreground).

Backup-Skript-Logik:

```sh
ts=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump --format=custom --dbname="$HCMAP_DATABASE_URL" \
  | age --recipients-file /run/secrets/age-recipients.txt \
  | rclone rcat "${HCMAP_BACKUP_REMOTE}:${HCMAP_BACKUP_PREFIX}/daily/$ts.dump.age"
```

Cron-Schedule: täglich 03:17 UTC (`17 3 * * *`). Wöchentlich (Sonntag 03:33) und monatlich (1. des Monats 03:47) zusätzliche Pfade in `weekly/` und `monthly/` schreiben — Retention separat (Punkt unten).

**Retention** über `rclone delete --min-age` als zweiter Cron-Job (täglich 04:00):
- `daily/`: älter als 14 Tage → löschen.
- `weekly/`: älter als 56 Tage (8 Wochen) → löschen.
- `monthly/`: älter als 365 Tage → löschen.

**Verschlüsselung:** age-Schlüsselpaar pro Instanz. Public-Key (Recipient) in `docker/secrets/age-recipients.txt` als Docker-Secret eingehängt. Private-Key (für Restore) **nicht im Container**, sondern bei der Operator-Person (z. B. Passwort-Manager). Restore-Skript `scripts/backup-restore.sh` dokumentiert: Private-Key-Datei lokal vorhalten, `rclone copy` + `age --decrypt` + `pg_restore` in Ziel-DB.

**rclone-Konfiguration:** Operator legt vor erstem Start `docker/secrets/rclone.conf` an (rclone unterstützt Hetzner Storage Box, Backblaze B2, S3-kompatibel, SFTP, …). HC-Map gibt keinen Anbieter vor — Runbook listet die drei häufigen Setups (Hetzner Storage Box via SFTP, Backblaze B2, generisches S3) als Beispiele. Auswahl in M13 für Patricks eigene Instanz; M10 liefert nur die generische Mechanik.

**Off-Site-Pflicht relativ:** project-context.md §11 sieht Backup-Anbieter-Wahl in M13. M10 liefert die Skripte und macht Off-Site **technisch möglich**, erzwingt aber keinen konkreten Anbieter. Der RC ist bewusst so geschnitten, dass ein Operator zunächst auch nur lokal sichern kann (rclone-Remote `local:/var/backups/hc-map`), Off-Site dann nachrüstet — passt zur Multi-Instanz-Linie.

**E. CI/CD: GitHub Actions, GHCR als Image-Registry, Multi-Arch.**

Neue Datei `.github/workflows/ci.yml` mit drei Jobs:

1. **`backend-lint-test`** — Python 3.12, `uv sync --dev`, `ruff check`, `ruff format --check`, `mypy --strict`, `pytest` mit Postgres-Service-Container (Postgres+PostGIS image gepinnt).
2. **`frontend-lint-test`** — Node 22, `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test --run`.
3. **`build-push`** — nur auf `main` und Tags mit Pattern `v*.*.*`. Setzt `docker/setup-qemu-action` + `docker/setup-buildx-action`, login bei `ghcr.io` per `GITHUB_TOKEN`, baut beide Dockerfiles für `linux/amd64,linux/arm64`, taggt mit Schema (siehe unten), pusht.

Image-Tag-Schema (`ghcr.io/paddel87/hc-map-backend` und `ghcr.io/paddel87/hc-map-frontend`):

| Trigger (Git-Tag) | GHCR-Image-Tags |
|---|---|
| `v0.1.0-rc.1` | `:0.1.0-rc.1`, `:rc` |
| `v0.1.0` (RC → final) | `:0.1.0`, `:0.1`, `:0`, `:latest` |
| Push auf `main` | `:main`, `:sha-${shortsha}` |

**Wichtige Konvention** (M10.9-Postfix 2026-05-02): `docker/metadata-action`'s `v{{version}}`-Pattern strippt das führende `v` vom Git-Tag — der Git-Tag heißt `v0.1.0-rc.1`, der GHCR-Image-Tag ist `0.1.0-rc.1` (ohne `v`). Diese ADR hatte ursprünglich (2026-05-01) `:v0.1.0-rc.1` als Image-Tag versprochen; das war eine Annahme, die mit dem tatsächlichen `metadata-action`-Verhalten nicht zusammenpasst. Ein Re-Tag ohne `v` wäre möglich, aber unnötig — die Image-Bytes sind via `:0.1.0-rc.1` und `:rc` korrekt addressierbar, und alle Operator-Doku (README, Runbook, .env.example) verweist jetzt auf den ohne-`v`-Tag.

Zwischen RC und stable wird `:latest` **nicht** gesetzt — `:rc` ist der explizite RC-Channel. Operator wählt im Compose-File explizit `:0.1.0-rc.1` (oder `:rc`, wenn er rolling-RC will).

**GHCR-Sichtbarkeit:** beide Pakete public (passt zu AGPLv3 + „jedermann"). Pull ohne Authentifizierung möglich. Push-Permissions auf den Workflow beschränkt (Standard-`GITHUB_TOKEN` mit `packages: write` Scope).

**SBOM/Provenance:** in M10.6 nicht erzwingen (Software-Bill-of-Materials wäre nice-to-have, sprengt aber den RC-Scope). Als Folge-Aufgabe nach M11 öffnen.

**F. Deployment-Mechanik: manueller Pull, kein Auto-Deploy.**

Kein automatischer Deploy aus CI auf einen VPS — Multi-Instanz heißt: jeder Operator entscheidet selbst, wann er pullt. Workflow:

1. Operator hat `.env.prod`, `docker/compose.prod.yml`, ein Reverse-Proxy-Overlay und ggf. Reverse-Proxy-Konfigfiles in seinem Server-Pfad (typ. `/srv/hc-map/`).
2. Operator pullt neue Images: `docker compose -f compose.prod.yml -f compose.caddy.yml pull`.
3. Operator startet neu: `docker compose -f ... up -d`.
4. Compose-Reihenfolge sorgt für DB-Health-Wait, Backend-Migrations, Frontend-Restart.

**Migrations-Strategie:** Backend-Container führt Alembic-Migration **automatisch beim Start** aus (Standard-Pattern für Single-Instance-Deployments mit Multi-Instance-Ausschluss durch Postgres-Advisory-Lock; Mechanik in M10.1 implementieren). Bei Migrations-Fehler beendet Backend mit Exit-Code 1, Compose-Restart-Loop bringt das Problem an die Oberfläche. Operator kann Migration manuell überspringen via `HCMAP_SKIP_MIGRATIONS=1` für Notfälle.

**G. Einwilligungs-Vorlage `docs/templates/consent-de.md`.**

Strukturierte Markdown-Vorlage mit Platzhaltern in eckigen Klammern (`[GRUPPENNAME]`, `[ADMIN-NAME]`, `[INSTANZ-URL]`, `[HOSTING-PROVIDER]`, `[HOSTING-STANDORT]`, …). Inhaltlich abgedeckt:

1. **Vertrauensmodell zum VPS-Hoster** (ADR-001) — wer hat Zugriff, welche Verschlüsselung, kein App-seitiger Schutz vor Hoster.
2. **Anonymisierungs-Kompromiss** (ADR-002) — Re-Identifikation in kleiner Gruppe weiter möglich.
3. **On-the-fly-Personenanlage** (ADR-014) — externe Personen können ohne deren Wissen erfasst werden, Linkable-Mechanismus.
4. **Aggregat-Statistik in kleiner Gruppe** (ADR-015) — kollektive Zahlen sind nur scheinbar anonym.
5. **IndexedDB unverschlüsselt** (ADR-032) — Geräteverschlüsselung User-Pflicht.
6. **Foto-/Medien-Speicherung** (ADR-015 §M15) — als Platzhalter für späteren M15-Ausbau, mit Hinweis „aktiviert ab Phase 2".
7. **Widerrufs- und Auskunftsrechte** — Verweis auf Anonymisierung, Export-Funktion.

**Disclaimer:** `consent-de.md` ist explizit als Vorlage markiert. Operator muss anpassen, ggf. juristisch prüfen lassen — keine Rechtsberatung durch HC-Map. Englische Vorlage `consent-en.md` **nicht** im RC-Scope (kein Multi-Sprach-Support für M10).

**H. README-Restruktur und Operator-Quickstart.**

Aktuelle [`README.md`](../README.md) (17.990 Bytes) ist Dev-zentriert. M10.7 strukturiert um:

1. **Header**: Projektname, Tagline, Badges (Lizenz AGPLv3, CI-Status, RC-Version, Backend-Tests, Frontend-Tests, Docker-Pulls — alle nur dann, wenn echt befüllt; CLAUDE.md §6).
2. **Quickstart for Operators** (neu, oberster inhaltlicher Abschnitt) — VPS-Anforderungen, Domain & DNS-Voraussetzung, in 30 min zur lauffähigen Instanz.
3. **Konfiguration** — `.env.prod`-Variablen mit Pflicht/Optional-Markierung, Verweis auf `.env.example`.
4. **Backups** — Schnellüberblick + Verweis auf Runbook.
5. **Update-Pfad** — neuer RC pullen, Migrations-Verhalten.
6. **Development-Setup** (war oben, rutscht nach unten) — bestehender Inhalt im Wesentlichen unverändert.
7. **Architektur-Übersicht** — Verweis auf [`docs/architecture.md`](./architecture.md).
8. **Lizenz & Mitwirkung** — AGPLv3-Hinweis, Issue-Tracker, Contribution-Guidelines (kurz).

Detaillierte Schritt-für-Schritt-Anleitung wandert in `ops/runbook.md` (M10.7) — README bleibt Übersicht.

**I. Sub-Step-Spezifikation.**

| Sub-Step | Status nach Freigabe | Deliverables | Verifikation |
|---|---|---|---|
| **M10.1** | Diese ADR-051 zur Freigabe vorgelegt; bei Annahme `Status: Accepted` setzen, Fahrplan-Eintrag M10 in 9 Sub-Steps aufschlüsseln, restliche M10.x in Reihenfolge umsetzen | ADR-051 + Fahrplan-Update | Patrick gibt frei |
| **M10.2** | Mail-Backend SMTP + Frontend Reset-Pages | `aiosmtplib`-Dep in `pyproject.toml`, `app/auth/mail.py`-`SMTPMailer`, `app/settings.py`-Mail-Settings, `app/auth/templates/`, `frontend/src/app/(public)/forgot-password/page.tsx` + `reset-password/page.tsx`, vitest- + pytest-Tests | `pytest` grün ≥220, `pnpm test` grün ≥273, manueller Browser-Smoke gegen lokalen MailHog/MailCatcher (Reset-Roundtrip), `ruff`/`mypy --strict`/`tsc --noEmit`/`eslint` clean |
| **M10.3** | LICENSE + Lizenz-Metadaten + README-Header | `LICENSE` (AGPLv3-Volltext), `pyproject.toml::license`, `package.json::license`, README-Lizenz-Badge + Hinweis-Block, CHANGELOG-Eintrag | Visuell + Dependency-License-Compliance-Smoke (Backend `pip-licenses` als ad-hoc-Lauf, Frontend `pnpm licenses list` als ad-hoc-Lauf — keine GPL-/proprietären Treffer außer AGPL selbst) |
| **M10.4** | Einwilligungs-Vorlage | `docs/templates/consent-de.md` mit Platzhaltern, Verweis aus README + project-context.md §6 + architecture.md | Inhaltlicher Cross-Check gegen ADR-001/002/014/015/032 (alle Punkte adressiert) |
| **M10.5** | [ERLEDIGT] 2026-05-01 — `compose.prod.yml` + Reverse-Proxy-Overlays + Prod-ENV-Schema + Migrations-Runner | `docker/compose.prod.yml`, `docker/compose.caddy.yml` + `Caddyfile.example`, `docker/compose.traefik.yml` + `traefik/{traefik,dynamic}.yml.example`, erweiterte `.env.example` (Prod-Block: `HCMAP_DOMAIN`, `HCMAP_ACME_EMAIL`, `HCMAP_COOKIE_DOMAIN`, `HCMAP_IMAGE_TAG`, `HCMAP_SKIP_MIGRATIONS`, `HCMAP_BACKUP_*`), neues Modul `backend/app/migrations_runner.py` (Postgres-Advisory-Lock `pg_try_advisory_lock(47_110_815)` + Alembic-Upgrade via `asyncio.to_thread`), FastAPI-Lifespan in `app/main.py`, `--proxy-headers --forwarded-allow-ips=*` als Backend-Command-Override | Backend pytest 246/246 (+15 in `tests/test_migrations_runner.py`); `ruff check`/`ruff format --check`/`mypy --strict app` clean; `docker compose -f compose.prod.yml -f compose.caddy.yml config` und Traefik-Variante beide grün. Voll-Stack-Live-Smoke aufgeschoben in M10.9 (braucht GHCR-Images aus M10.7) |
| **M10.6** | Backup-Service | `docker/backup.Dockerfile`, `docker/backup/backup.sh`, `docker/backup/restore.sh`, `docker/backup/crontab`, `docker/secrets/age-recipients.txt.example`, `docker/secrets/rclone.conf.example`, Backup-Test-Skript für CI | Roundtrip-Test (lokal): pg_dump | age | rclone (rclone-Remote `local:`) → rclone copy + age --decrypt + pg_restore in zweite leere DB → pgbench-Schema-Diff = 0 Zeilen, App-Smoke gegen restore-DB grün |
| **M10.7** | GitHub Actions Workflow | `.github/workflows/ci.yml` mit drei Jobs (`backend-lint-test`, `frontend-lint-test`, `build-push`), QEMU+buildx-Setup, GHCR-Push mit Tag-Schema, separater Pre-Release-Workflow `.github/workflows/release.yml` (triggered auf `v*.*.*`-Tags, erstellt GitHub-Release mit Notes-Auto-Extract aus CHANGELOG) | CI-Lauf grün auf einem Branch-PR (act-Lokaltest oder echter PR), GHCR-Image-Tags `:rc`/`:v0.1.0-rc.1` nach Tag-Push prüfbar |
| **M10.8** | `ops/runbook.md` + README-Restruktur | `ops/runbook.md` (VPS-Setup, SSH-Hardening, Docker-Install, Stack-Start je nach Reverse-Proxy-Wahl, age-Key-Generierung, rclone-Setup, Bootstrap, Update-Pfad, Restore-Drill), README mit Operator-Quickstart als oberster inhaltlicher Abschnitt | Drittperson-Lese-Test (Patrick liest Runbook + README durch und schätzt: „Reicht das, um eine fremde HC-Map ans Laufen zu bringen?") |
| **M10.9** | Voll-Verifikation, Tag, Pre-Release | RC-Smoke-Run im lokalen Voll-Compose: Bootstrap, Login, Event-Anlage (Live + Backfill), Edit, Anonymisierung, Merge, Stats, Export, Backup-Roundtrip mit Restore in zweite DB, Reset-Mail-Roundtrip gegen MailHog. Tag `v0.1.0-rc.1` (signiert), GitHub-Pre-Release mit CHANGELOG-Notes, GHCR-Tags verifiziert, M10 → `[ERLEDIGT]` | Alle Schritte oben grün, CI-Workflow auf Tag grün, Pre-Release sichtbar, Image-Pull `docker pull ghcr.io/paddel87/hc-map-backend:0.1.0-rc.1` (M10.9-Postfix 2026-05-02: ohne `v` — siehe Punkt E) aus frischer Shell erfolgreich |

### Verworfene Alternativen

- **Reverse-Proxy hartkodiert auf Caddy.** Patrick hat Wahlfreiheit verlangt; Multi-Instanz-Linie. Verworfen zugunsten Overlay-Modell.
- **`fastapi-mail` als Mail-Lib.** Bringt Templating-Engine und HTML-Mail-Generator mit, die HC-Map nicht braucht. Verworfen zugunsten direkter `aiosmtplib`-Nutzung.
- **GPG statt age für Backup-Verschlüsselung.** GPG ist mächtig, aber Schlüssel-Verwaltung ist für unerfahrene Operator schwerer zu handhaben (Keyring, Web-of-Trust, Subkeys). age ist single-binary mit klarer ed25519-Schlüssel-Mechanik. Verworfen.
- **Off-Site-Backup-Anbieter im RC fixieren.** project-context.md §11 sieht Wahl in M13 für Patricks eigene Instanz; bei Multi-Instanz wäre eine Festlegung sowieso falsch. Verworfen — RC liefert Mechanik, kein Anbieter-Lock-in.
- **CSV-Export-Pflicht im RC.** Pfad-A-Volumen rechtfertigt es nicht (siehe ADR-049 §G); JSON-Export ist da. Verworfen.
- **Auto-Deploy aus CI auf produktive VPS.** Kollidiert mit Multi-Instanz-Modell. Jeder Operator pullt selbst. Verworfen.
- **Staging-Environment-Pflicht.** Optional gehalten; Operator kann zweite Compose-Instanz mit anderer Domain bauen, dokumentiert im Runbook, aber nicht erzwungen. Verworfen.
- **English-Sprach-Support im RC.** Multi-Sprach würde Templates, Frontend-i18n, Doku-Verdopplung bedeuten. Aus dem RC-Scope ausgeschlossen, als Folge-Aufgabe nach M11 öffnen.
- **SBOM/Provenance im RC erzwingen.** Sprengt Scope; als Folge-Aufgabe nach M11.
- **`fastapi-users`-`/api/auth/verify`-Pfad im RC produktivieren.** Email-Verifizierung neuer Accounts ist nice-to-have für Pfad B; in Pfad A (Admin lädt User ein, kein Self-Signup) nicht zwingend. Bleibt Folge-Aufgabe.

### Risiken und Mitigationen

- **R1. SMTP-Provider-Heterogenität bricht den `aiosmtplib`-Versand.** Mitigation: M10.2 testet gegen MailHog (lokaler Test-SMTP) **und** mindestens einen echten Provider während Patricks RC-Smoke (M10.9). Edge-Cases (Implicit-TLS auf 465, STARTTLS auf 587, kein TLS auf 25) decken die `HCMAP_SMTP_*`-Settings ab.
- **R2. Reverse-Proxy-Overlays divergieren in Header-Verhalten.** Mitigation: Test-Matrix in M10.5 fährt beide Overlays alternativ und prüft Login-Flow + CSRF + Cookie-Secure identisch. Falls Divergenzen auftreten: Header-Vereinheitlichung in den Overlay-Configs erzwingen.
- **R3. Backup-Verschlüsselung age — Schlüsselverlust = Datenverlust.** Mitigation: Runbook hebt Schlüssel-Verwahrung in fett hervor (Passwort-Manager + 2-Personen-Backup-Schlüssel als optional dokumentierte Variante). Restore-Drill ist in M10.9 Akzeptanzkriterium — d. h. Operator hat den Schlüssel mindestens einmal aktiv genutzt.
- **R4. GHCR-Multi-Arch-Build verdoppelt CI-Zeit.** Mitigation: bei Build-Zeit-Druck `linux/arm64` als optional flagsen; aktuelle GHCR-Erfahrung mit FastAPI/Next.js liegt typ. <8 min für beide Arches mit cache-from/to. Akzeptabel für RC-Cadence.
- **R5. Migrations-Auto-Run beim Backend-Start kollidiert mit zweitem Backend-Container.** Mitigation: Postgres-Advisory-Lock (`pg_try_advisory_lock` mit fixer Lock-ID, z. B. `0xHCMAPMIG`) verhindert konkurrierende Migrationen. RC-Scope ist Single-Backend-Instance; Multi-Backend wird erst Phase 3 relevant.
- **R6. Lizenz-Inkompatibilität mit transitiven Frontend-Deps.** Mitigation: M10.3 lässt `pnpm licenses list` einmal laufen, Treffer mit GPL/proprietary-Lizenzen würden manuell bewertet. Stand 2026-05-01: alle direkten Deps AGPLv3-kompatibel; transitive sind erfahrungsgemäß ebenfalls.
- **R7. Drittperson-Quickstart funktioniert nicht in 30 min.** Mitigation: M10.8 endet mit explizitem Patrick-Lese-Test; falls die Doku zu kompakt ist, Erweiterung um „häufige Stolperer"-Sektion.

### Folge-Arbeit

- **M5c-NACH** (Legacy-External-Ref im Edit/Backfill-UI) bleibt als nicht-blockierende Folge-Aufgabe; kann nach RC kommen, sollte aber vor `v0.1.0`-Final stehen, damit der RC-Test diesen Pfad ebenfalls abdeckt.
- **M11** (Go-Live Pfad A) wird auf Promote-RC-zu-Final reduziert: `v0.1.0-rc.1` läuft auf Patricks VPS, Mitglieder-Bootstrap, manuelle Datenmigration, Einwilligungstexte (aus `consent-de.md`-Vorlage abgeleitet), bei Erfolg Tag `v0.1.0`.
- **M13** (Backup-Härtung) übernimmt Patrick-spezifische Anbieter-Wahl + zusätzliche Restore-Tests + ggf. Notification-Hooks bei Backup-Fehlern.
- **M14** (Monitoring) bleibt Phase-2-Scope; M10 dokumentiert lediglich Healthcheck-Endpunkte.
- **README-Badges:** mit M10.3 (Lizenz-Badge), M10.7 (CI-Status-Badge), M10.9 (Version-Badge) sind die Badges erstmals echt belegbar — vorher leer. CLAUDE.md §6 wird damit erstmals positiv erfüllbar.
- **Folge-Aufgaben nach M11:** SBOM/Provenance, Englisch-Sprach-Support, `/api/auth/verify`-Pfad produktiv, optionaler nginx-Overlay als drittes Reverse-Proxy-Beispiel.

### Referenzen

- [ADR-001](#adr-001--hoster-vertrauensmodell), [ADR-002](#adr-002--anonymisierungs-kompromiss), [ADR-014](#adr-014--on-the-fly-personenanlage), [ADR-015](#adr-015--admin-export--stats-granularität), [ADR-032](#adr-032--indexeddb-storage-encryption-keine-encryption-in-pfad-a) — alle in `consent-de.md` adressiert (Punkt G).
- [ADR-006](#adr-006--cookie-auth-topologie) — Cookie-Secure-/Domain-Logik in Punkt B.
- [ADR-022](#adr-022--locationpicker-und-tile-proxy-in-m5a-vorgezogen) — Tile-Proxy bleibt unverändert; Reverse-Proxy leitet `/api/tiles/*` an Backend weiter.
- [ADR-047](#adr-047--nextjs-1504--1624-migration-pfad-c-aus-blocker-001), [ADR-048](#adr-048--backend-stack-drift-voll-sweep-variante-b-aus-audit-blocker-001-punkt-3) — Stack-Stand für Image-Build.
- [ADR-049](#adr-049--implementierungsstrategie-m8-admin-bereich-sqladmin-schicht--nextjs-workflow-schicht) — Admin-Mechanik wird im RC produktiv genutzt; CI-Image enthält SQLAdmin.
- [ADR-050](#adr-050--m9-w3w-migration-verworfen-eventw3w_legacy-zu-legacy_external_ref-umgewidmet) — M9 verworfen, M5c-NACH bleibt offen, beeinflusst RC nicht.

---

## ADR-052 — GitHub-Actions-Major-Bumps auf Node-24-fähige Runtimes (M10.7.1)

**Status:** Accepted
**Datum:** 2026-05-01
**Freigabe:** 2026-05-01 (Patrick — „jettz M10.7.1")
**Kategorie:** §4.3 externe Abhängigkeiten (neun GitHub-Action-Major-Bumps), §4.7 Build-/Deploy-Pipeline (`.github/workflows/ci.yml` + `release.yml`).
**Vorgänger:** Blocker #002 (GitHub-Actions-Runtime-Deprecation Node.js 20, 2026-05-01) — die im Blocker-Eintrag aufgeworfene Entscheidungsfrage „M10.7.1 als kurzer Audit-Sub-Step vor M10.9?" wird mit dieser ADR positiv beantwortet.

### Kontext

Beim ersten produktiven CI-Lauf der M10.7-Pipeline (Run `25225432180` ff., 2026-05-01) annotierte GitHub auf jedem Job:

> Node.js 20 actions are deprecated. Actions will be forced to run with Node.js 24 by default starting **June 2nd, 2026**. Node.js 20 will be removed from the runner on **September 16th, 2026**.

Neun in den beiden Workflows referenzierte Actions hängen an Node-20-Runtimes. Drei Wege standen offen:

- **Abwarten bis 2026-06-02** — würde unter Umständen einen kurzfristigen Notfall-Bump während der RC-Phase erzwingen.
- **Per `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` Workflow-Env** — verschiebt das Problem, aber das Risiko bleibt: Action-Code, der unter Node 20 entwickelt wurde, kann unter Node 24 brechen.
- **Mechanischer Tag-Bump auf Major-Versionen, die offiziell auf Node 24 laufen** — günstig, planbar, vor M10.9-RC-Tag erledigt.

Pfad C wurde gewählt. Der Audit fand am 2026-05-01 live gegen die GitHub-API statt (kein Verlass auf Trainingsdaten, CLAUDE.md §6).

### Entscheidungen

**A. Mapping aller neun Actions auf Node-24-Major-Versionen:**

| Action                          | Vorher | Nachher  | `using:` (verifiziert) | Begründung Detail-Pin                                                        |
|---------------------------------|--------|----------|-----------------------|------------------------------------------------------------------------------|
| `actions/checkout`              | `@v4`  | `@v6`    | `node24`              | floating Major; v5 übersprungen, weil v6 die aktuelle Major-Linie ist        |
| `actions/cache`                 | `@v4`  | `@v5`    | `node24`              | floating Major; reine Node-Bump-Major, kein Cache-Key-Schema-Bruch           |
| `actions/setup-node`            | `@v4`  | `@v6`    | `node24`              | floating Major; v6 limitiert Auto-Cache auf npm — kollidiert nicht mit unserem expliziten pnpm-Store-Cache (in v5 hätte das `packageManager`-Feld Auto-Cache aktiviert) |
| `astral-sh/setup-uv`            | `@v5`  | `@v8.1.0`| `node24`              | **immutable Tag**, nicht floating: astral hat mit v8 die floating major-/minor-Tags eingestellt (Supply-Chain-Hardening, vgl. `tj-actions`-Vorfall). Pin auf exakte Release-Version per astral-Empfehlung. |
| `docker/build-push-action`      | `@v6`  | `@v7`    | `node24`              | floating Major; nur Node-Bump + ESM-intern, keine Input/Output-Änderungen, die wir nutzen |
| `docker/login-action`           | `@v3`  | `@v4`    | `node24`              | floating Major; analog                                                        |
| `docker/metadata-action`        | `@v5`  | `@v6`    | `node24`              | floating Major; analog                                                        |
| `docker/setup-buildx-action`    | `@v3`  | `@v4`    | `node24`              | floating Major; v4 entfernt deprecated Inputs/Outputs — wir nutzen kein `with:`-Block, daher unkritisch |
| `docker/setup-qemu-action`      | `@v3`  | `@v4`    | `node24`              | floating Major; analog                                                        |

Alle neun `using:`-Werte wurden direkt aus `action.yml` der jeweiligen Major-Tags via GitHub-Contents-API verifiziert.

**B. `setup-uv` als einziger immutable Pin — Sonderfall.**

`astral-sh/setup-uv@v8.0.0` (Release-Notes, 2026-03-29): „No more major and minor tags. You won't be able to use `@v8` or `@v8.0` any longer. We do this because pinning to major releases opens up users to supply chain attacks like what happened to tj-actions." Empfohlene Pinning-Form: `astral-sh/setup-uv@v8.1.0` (immutable Tag) oder `@<sha>`.

Wir folgen dieser Empfehlung für `setup-uv` — alle anderen acht Actions bleiben auf floating Major-Tags. Eine projekt-weite Umstellung auf immutable Pins wäre ein eigenständiger Sub-Step (Aufwand: alle `uses:`-Zeilen + Renovate-/Dependabot-Konfig); wird **nicht** in M10.7.1 umgesetzt, sondern als Follow-up nach M11 vorgemerkt.

**C. Verträgliche Inputs unverändert.** `setup-uv@v8.1.0` akzeptiert weiterhin `version`, `enable-cache`, `cache-dependency-glob` (in v6/v7/v8 unverändert). `setup-node@v6` braucht **kein** explizites `package-manager-cache: false` (Auto-Cache ist in v6 auf npm beschränkt). Alle anderen Verträge sind in den Release-Notes als unverändert dokumentiert.

**D. Node-22-Toolchain im Frontend-Job bleibt.** `setup-node@v6` installiert weiterhin Node 22 (Wert aus `with: node-version: "22"`); die Action selbst läuft auf Node 24 (Runner-Runtime), liefert aber Node 22 als Toolchain — beides ist orthogonal. Konsequenz: Frontend-Build/-Test fährt unverändert auf Node 22 (entspricht Production-Image, ADR-048 §C).

### Konsequenzen

- Beide Stichtage aus Blocker #002 entschärft: **2026-06-02** (Runner-Default Node 24) und **2026-09-16** (Node 20 entfernt). CI bleibt grün, ohne Notfall-Workaround.
- Blocker #002 wird mit dem M10.7.1-Commit aufgelöst und nach „Gelöste Blocker" verschoben.
- `setup-uv` ist ab jetzt der einzige immutable-gepinnte Action-Eintrag im Repo. Beim nächsten Patch-Release (`v8.1.1` o. ä.) muss der Pin manuell mitgezogen werden — Renovate/Dependabot werden bei einem späteren Sub-Step entsprechend konfiguriert (Folge-Aufgabe).
- Keine Änderungen an Workflow-Logik, Tag-Schema, Image-Build-Matrix oder GHCR-Push-Pfad — reine `uses:`-Zeilen-Bumps + ein Inline-Kommentar an der `setup-uv`-Stelle, der die immutable-Pin-Begründung trägt.

### Verifikation

- `actionlint v1.7.12` (rhysd/actionlint) gegen beide Workflow-Files: **0 errors**.
- Live-CI-Run nach Push verifiziert: Node-20-Deprecation-Annotation verschwindet, alle drei Jobs grün, Pull der Multi-Arch-Images aus GHCR identisch zu M10.7-Run.
- Backend-Test-Stand unverändert: pytest **246/246** grün, vitest **278/278** grün (M10.7.1 berührt ausschließlich CI, kein Anwendungscode).

### Abgrenzung

- **Nicht im Scope:** Renovate/Dependabot-Konfig, immutable-Pins für andere Actions, GitHub-Actions-Version-Pin via SHA, SBOM/Provenance — siehe Folge-Aufgaben.
- **Nicht freigabepflichtig in dieser ADR:** der bereits in ADR-051 §E festgelegte Image-Tag-Schema-Plan und das Reverse-Proxy-Overlay-Konzept.

### Referenzen

- [Blocker #002 — GitHub-Actions-Runtime-Deprecation Node.js 20](./blockers.md#blocker-002-github-actions-runtime-deprecation-nodejs-20)
- [ADR-051 — Implementierungsstrategie M10](#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann) (CI/CD-Mechanik)
- [astral-sh/setup-uv v8.0.0 release notes](https://github.com/astral-sh/setup-uv/releases/tag/v8.0.0) — immutable-Tag-Begründung
- GitHub: „Required Node version on JavaScript actions" (Deprecation-Notice 2026-05-01-Annotation)

---

## ADR-053 — Frontend SSR-Backend-Adressierung im Production-Container-Netz

**Status:** Accepted
**Datum:** 2026-05-02
**Freigabe:** 2026-05-02 (Patrick — Empfehlung A)
**Kategorie:** §4.1 Architektur (Adressierung Frontend↔Backend im Container-Netz, Kommunikationsmuster zwischen Modulen). Sekundär §4.7 (Build-/Deploy-Pipeline: Compose-File-Änderung).
**Vorgänger:** ADR-051 §B (Reverse-Proxy-Wahlfreiheit über Compose-Overlays), §F (manueller Pull als Operator-Mechanik), §H (Operator-Quickstart-Doku).

### Kontext

Bug-Bericht aus M11-Provisionierung: Issue [#15](https://github.com/Paddel87/HC-Map/issues/15). Im RC-Image `ghcr.io/paddel87/hc-map-frontend:rc` rendert Next.js die Server-Side-Komponenten (Dashboard, Suche, Edit-Forms, Auth-Server-Probe) mit `fetch()`-Calls auf `http://127.0.0.1:8000`. Der Frontend-Container hat dort keinen Backend-Listener — `localhost` referenziert den Frontend-Prozess selbst. Folge: jede SSR-Route liefert `ECONNREFUSED`, der Browser sieht Next.js' Application-Error-Page. Statisch ausgelieferte Pfade (`GET /login` HTML) kommen durch und maskieren den Bug, weshalb der M10.9-RC-Smoke ihn nicht erkannt hat.

**Befund aus Code-Audit (Issue-Triage 2026-05-02):**

- Server-Components lesen die Backend-URL über `process.env.BACKEND_INTERNAL_URL` mit Fallback `"http://localhost:8000"` — der Mechanismus ist also bereits angelegt. Stellen:
  - [`frontend/src/lib/auth-server.ts`](../frontend/src/lib/auth-server.ts) Zeile 5
  - [`frontend/src/app/(protected)/page.tsx`](../frontend/src/app/(protected)/page.tsx) Zeile 10
  - [`frontend/src/app/(protected)/search/page.tsx`](../frontend/src/app/(protected)/search/page.tsx) Zeile 6
  - [`frontend/src/app/(protected)/events/[id]/edit/page.tsx`](../frontend/src/app/(protected)/events/[id]/edit/page.tsx) Zeile 9
- [`docker/compose.prod.yml`](../docker/compose.prod.yml) `frontend`-Service: setzt nur `NODE_ENV`, `NEXT_PUBLIC_TILE_URL`, `NEXT_PUBLIC_DEFAULT_MAP_CENTER`. Kein `BACKEND_INTERNAL_URL`.
- [`docker/docker-compose.yml`](../docker/docker-compose.yml) `frontend`-Service: gleiches Bild — nur `NODE_ENV`, sonst nichts. Dev-Setup ist latent vom selben Bug betroffen, fällt aber im Live-Modus + RxDB-Workflow weniger auf (Kern-UX-Pfade hängen nicht am SSR-Fetch).
- [`.env.example`](../.env.example): `BACKEND_INTERNAL_URL` ist nicht dokumentiert.
- [`docker/frontend.Dockerfile`](../docker/frontend.Dockerfile): kein `ARG`/`ENV` für `BACKEND_INTERNAL_URL` — die Variable ist **Runtime-Env**, kein Build-Inline. Image-Re-Build ist daher nicht erforderlich; ein neuer `compose up -d` mit ergänzter Env genügt operativ.

Der Bug betrifft alle drei Reverse-Proxy-Pfade aus ADR-051 §B (Caddy-Overlay, Traefik-Overlay, externer Reverse-Proxy nach `runbook.md` §4.3) gleichermaßen, weil der Reverse-Proxy ausschließlich Browser↔Container-Verkehr routet — SSR-`fetch`-Calls verlassen den Frontend-Container und sehen den Reverse-Proxy nicht.

### Entscheidungen

**A. Adressierungs-Mechanismus: Runtime-Env `BACKEND_INTERNAL_URL`, gelesen aus `process.env` zur Request-Zeit.**

Variable behält den Namen, unter dem sie bereits im Code existiert: `BACKEND_INTERNAL_URL`. Naming-Diskussion (siehe Punkt B). Default-Wert: `http://backend:8000` — der Container-Hostname, den Compose dem Backend-Service zuweist, ist konstant und Teil des öffentlichen Compose-Vertrags (in Repo-Doku und `compose.prod.yml`-Kommentar bereits genannt).

Der bestehende Fallback `"http://localhost:8000"` im Code bleibt unverändert. Begründung: lokaler `pnpm dev`-Workflow (Frontend außerhalb Docker, Backend via `docker compose up backend db`) erwartet ein `localhost:8000`-Backend. Würden wir den Fallback auf `http://backend:8000` ändern, bricht dieser Pfad. Compose-basierte Setups setzen die Variable explizit; `pnpm dev` außerhalb Docker bekommt den Fallback.

**B. Naming: kein `HCMAP_*`-Präfix für diese Variable.**

Pfad-A-Konvention im Backend (ADR-051 §C: `HCMAP_SMTP_HOST`, `HCMAP_BASE_URL`, `HCMAP_COOKIE_DOMAIN`, …) gilt für **Backend-Pydantic-Settings**. Frontend-Server-Envs sind ein eigener Namespace mit eigener Konvention (Next.js: `NEXT_PUBLIC_*` für Browser-Bundle, sonstige `process.env.*`-Reads gelten Server-only). `BACKEND_INTERNAL_URL` ist Frontend-Server-only und damit **außerhalb** des `HCMAP_*`-Geltungsbereichs. Eine Umbenennung auf `HCMAP_BACKEND_INTERNAL_URL` würde rein kosmetische Konsistenz erzeugen und vier Code-Stellen plus alle Doku-Referenzen anfassen — verworfen zugunsten Minimal-Touch.

**C. Operationalisierung in Compose-Files.**

Beide Compose-Files erhalten den Default-Wert mit Operator-Override-Syntax:

```yaml
# docker/compose.prod.yml — frontend service
environment:
  NODE_ENV: production
  BACKEND_INTERNAL_URL: ${BACKEND_INTERNAL_URL:-http://backend:8000}
  NEXT_PUBLIC_TILE_URL: ${NEXT_PUBLIC_TILE_URL:-/api/tiles/{z}/{x}/{y}}
  NEXT_PUBLIC_DEFAULT_MAP_CENTER: ${NEXT_PUBLIC_DEFAULT_MAP_CENTER:-52.5200,13.4050}
```

```yaml
# docker/docker-compose.yml — frontend service
environment:
  NODE_ENV: production
  BACKEND_INTERNAL_URL: ${BACKEND_INTERNAL_URL:-http://backend:8000}
```

Operator kann via `.env.prod` überschreiben, falls sein Reverse-Proxy-Pfad einen anderen Backend-Hostname erfordert (z. B. Pfad 4.3 mit externem Traefik, der den Backend-Container über ein anderes Netz adressiert).

**D. `.env.example` Doku-Block.**

Frontend-Block in `.env.example` erweitern um:

```
# Frontend SSR backend address (server-side fetch only, never sent to browser).
# Default in compose: http://backend:8000 (Docker-internal hostname).
# Override only if your reverse-proxy/compose topology changes the backend hostname,
# e.g. when running an external reverse-proxy outside the compose network.
BACKEND_INTERNAL_URL=http://backend:8000
```

**E. Runbook-Stolperer-Sektion (M10.8-Ergänzung).**

`ops/runbook.md` erhält einen kurzen Stolperer-Hinweis im Abschnitt zum externen Reverse-Proxy (Pfad 4.3): wenn das Compose-Netz von einem externen Reverse-Proxy umgangen wird, muss der Operator prüfen, ob `backend:8000` aus dem Frontend-Container weiterhin auflösbar ist — wenn nicht (anderes Compose-Netz, Bridge-Trennung), muss `BACKEND_INTERNAL_URL` explizit gesetzt werden.

**F. Image-Bytes unverändert — kein Re-Build nötig.**

Die Variable wird zur Request-Zeit in den Server-Components ausgewertet (Next.js `process.env`-Read in App-Router-Server-Code, kein Inline durch den Build-Schritt). Damit wirkt der Fix sofort nach `compose up -d` mit gepatchtem Compose-File — der bestehende GHCR-Image-Tag `:0.1.0-rc.1` bleibt gültig. Der Hotfix erzeugt einen Patch-Commit auf `main`, daraus baut CI ein neues `:main` und (perspektivisch) ein RC-2 mit aktualisierter `compose.prod.yml`-Vorlage. Patrick kann das Issue auf seiner laufenden RC-Instanz **schon vor dem RC-2-Tag** beheben, indem er das Compose-File patcht.

**G. Out-of-Scope (nicht Teil dieses ADR).**

- Erweiterung des RC-Smoke-Sets um echte SSR-Login-/Dashboard-Routen, damit derselbe Bug-Modus im nächsten RC nicht durchschlüpft. Eigene Folge-Aufgabe, in `M14`-Monitoring-Bereich oder als M11-Lessons-Learned dokumentiert.
- Frontend-Healthcheck-Status-Code-Whitelist (Image akzeptiert nur HTTP 200, nicht 307/308 — separater Bug, im Issue als Nebenbefund erwähnt). Eigener Folge-Issue empfohlen.

### Verworfene Alternativen

- **Issue-Vorschlag (a) — neue Variable `HCMAP_INTERNAL_API_URL` einführen.** Würde den bestehenden `BACKEND_INTERNAL_URL`-Mechanismus ignorieren, vier Code-Stellen ändern, zwei Variablen für dieselbe Sache hinterlassen oder einen Refactor erzwingen. Verworfen — der bestehende Mechanismus ist sauber, es fehlt nur das Durchreichen.
- **Issue-Vorschlag (b) — Build-Arg `BACKEND_URL` mit Default.** Würde die URL ins Image inlinen; Override erfordert Image-Re-Build. Operator-feindlich für Multi-Instanz (jedes Setup mit anderer Topologie braucht eigenes Image). Verworfen.
- **Issue-Vorschlag (c) — SSR-fetches relativ über den eigenen Reverse-Proxy.** Frontend müsste seinen externen Hostname kennen, TLS-Zertifikat aus Container-Sicht vertrauen, DNS-Auflösung mitbringen. Erhöht Komplexität. Verworfen.
- **Code-Fallback auf `http://backend:8000` ändern (statt `localhost:8000`).** Bricht lokales `pnpm dev`-Setup außerhalb Docker. Verworfen.
- **Auf `HCMAP_BACKEND_INTERNAL_URL` umbenennen.** Rein kosmetische Konsistenz mit Backend-Settings, vier Code-Stellen + Doku-Touch. Verworfen — Frontend-Server-Env ist eigener Namespace.

### Risiken und Mitigationen

- **R1. Operator setzt `BACKEND_INTERNAL_URL` aus Versehen auf einen externen Hostname (z. B. `https://hc-map.example.org`).** Folge: SSR-Fetches gehen über den eigenen Reverse-Proxy zurück nach innen — funktioniert, ist aber ineffizient (extra TLS-Handshake, doppelter Hop). Mitigation: `.env.example` und Runbook-Stolperer-Sektion erklären den Default und wann er überschrieben werden sollte.
- **R2. Compose-Override-Syntax `${VAR:-default}` wird in alten Docker-Versionen nicht interpretiert.** Mitigation: Repo unterstützt Compose ≥ v2.0 (siehe ADR-048 / `compose.prod.yml`-Header); diese Syntax ist seit v1.x stabil. Kein Risiko.
- **R3. `pnpm dev`-Pfad bleibt latent kaputt für SSR-Routes außerhalb von Docker.** Tatsächlich: Backend in Docker erreichbar als `localhost:8000`, Frontend `pnpm dev` außerhalb Docker — der Fallback-Wert `http://localhost:8000` greift, Pfad funktioniert. Kein Regression.
- **R4. Im `:rc`-Image existiert die Compose-Patches noch nicht.** Operator, der ein älteres `compose.prod.yml`-Template aus dem Tag-`v0.1.0-rc.1`-Snapshot verwendet, sieht den Bug weiter. Mitigation: README + Runbook erhalten unter „Bekannte Probleme im RC-1" einen Hinweis, nach Hotfix-Merge das Compose-File aus `main` zu beziehen (oder auf RC-2 zu warten).

### Folge-Arbeit

- **M11-HOTFIX-001** (Fahrplan-Eintrag mit Status `[WARTET-AUF-FREIGABE]`) → nach Annahme dieser ADR direkt umsetzen (Compose-Files + .env.example + Runbook-Stolperer-Sektion). Akzeptanzkriterien dort.
- **RC-Smoke-Härtung:** echter SSR-Login-Pfad in den nächsten Smoke-Run. Eigener Folge-Eintrag, nicht-blockierend für M11.
- **Frontend-Healthcheck-Status-Codes** (nur 200 statt auch 307/308): eigener Folge-Issue empfohlen, nicht Teil von M11-HOTFIX-001.
- **Optional nach M11 / vor `v0.1.0`-Final:** Konsolidierung der vier `BACKEND_URL`-Konstanten in einen einzelnen Server-Config-Helper (`frontend/src/lib/server-config.ts`), damit der Default an einer einzigen Stelle definiert ist. Refactoring innerhalb eines Moduls (CLAUDE.md §5 freigabefrei), aber nicht für den Hotfix nötig.

### Referenzen

- [Issue #15 — Frontend SSR macht ECONNREFUSED 127.0.0.1:8000 statt Backend-Service zu nutzen](https://github.com/Paddel87/HC-Map/issues/15)
- [ADR-051 — Implementierungsstrategie M10](#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann) §B (Reverse-Proxy-Wahlfreiheit), §F (Operator-Pull-Mechanik)
- [Fahrplan §M11-HOTFIX-001](./fahrplan.md#m11-hotfix-001--frontend-ssr-backend-url-nicht-durchgereicht-issue-15)
- Code-Stellen: [`lib/auth-server.ts:5`](../frontend/src/lib/auth-server.ts#L5), [`(protected)/page.tsx:10`](../frontend/src/app/(protected)/page.tsx#L10), [`(protected)/search/page.tsx:6`](../frontend/src/app/(protected)/search/page.tsx#L6), [`(protected)/events/[id]/edit/page.tsx:9`](../frontend/src/app/(protected)/events/[id]/edit/page.tsx#L9)

---

## ADR-054 — Strukturierter Access-Logger mit PII-Redaction (Variante B aus Issue #21)

**Status:** Accepted
**Datum:** 2026-05-02
**Freigabe:** 2026-05-02 (Patrick — Variante B)
**Kategorie:** §4.6 Sicherheit/Datenschutz (Logging-Strategie für Production: was geloggt wird, in welcher Form, mit welcher PII-Redaction). Sekundär §4.1 (neue cross-cutting Architektur-Komponente: HTTP-Middleware vor allen Routen).
**Vorgänger:** ADR-051 §G (Operator-Diagnostik vor `v0.1.0`-Final), `project-context.md` §6 (Constraint „Keine personenbezogenen Daten in Logs"); Issue [#21](https://github.com/Paddel87/HC-Map/issues/21) für die Variantenabwägung.

### Kontext

Während der M11-Operator-Begehung auf Nodica1 (Issue [#17](https://github.com/Paddel87/HC-Map/issues/17), 2026-05-02) wurden drei UX-Befunde gemeldet, deren Diagnose mangels Backend-Request-Logs nicht möglich war. `docker logs hcmap-backend` enthält ausschließlich Startup- und Migrations-Zeilen — keine Access-Logs für eingehende Requests, keine Application-Logs für durchgeführte Aktionen.

**Befund aus Code-Audit (Issue-Triage 2026-05-02):**

- [`docker/backend.Dockerfile:62`](../docker/backend.Dockerfile#L62) und [`docker/compose.prod.yml:74`](../docker/compose.prod.yml#L74) starten uvicorn **ohne** `--access-log`/`--no-access-log`-Flag. Default wäre Access-Logs an, aber:
- [`backend/app/logging.py:44-49`](../backend/app/logging.py#L44-L49) installiert `structlog.PrintLoggerFactory()` mit `make_filtering_bound_logger`. Das umkonfiguriert effektiv auch die `uvicorn.access`/`uvicorn.error`-Logger über den root-Logger-Pfad — Ursache für die fehlende Access-Log-Ausgabe.
- Constraint aus [`docs/project-context.md`](./project-context.md) §6: **„Keine personenbezogenen Daten in Logs"**. Konkrete Redaktionsregeln: Namen, Notizen, Lat/Lon werden vor Log-Ausgabe entfernt.

Die Spannung ist substantiell: ein nackter `uvicorn --access-log` würde Query-Parameter mit Geo-Koordinaten (`?ne_lat=…&ne_lon=…`) und Personen-IDs in Pfaden direkt loggen — kollidiert mit dem PII-Constraint. Operator-Diagnostik ist andererseits ohne Request-Spur praktisch unmöglich, was auch Issue [#19](https://github.com/Paddel87/HC-Map/issues/19) (Katalog-Reproduktion) blockiert.

### Entscheidungen

**A. Variante B aus Issue #21: strukturierter HTTP-Logger als FastAPI-Middleware mit PII-Redaction.**

Drei Varianten wurden in #17 vorgelegt:

- **A — Status quo.** Access-Logs bleiben aus. Werkzeug-Lücke bleibt.
- **B — Strukturierter Access-Logger via FastAPI-Middleware mit Redaction (Pfad-Templates statt konkrete IDs, Query-String entfernt, nur Methode+Route+Status+Duration+Request-ID).** Strukturiert, JSON-tauglich, datenschutz-konform.
- **C — Nur Fehler-Logs (4xx/5xx) + Auth-Events strukturiert mit User-ID-Hash.** Kompromiss; reduziert Mengenproblem, deckt aber 200er nicht ab und versteckt Performance-Regressionen.

Patrick wählt **B** mit Begründung: gibt vollständigen Operator-Diagnostik-Pfad bei minimaler PII-Exposition; lässt 200er sichtbar (Performance-Tracking, Erkennung kaputter Routes), 4xx/5xx werden zusätzlich auf höherem Level emittiert, sodass Filter `level>=WARNING` die Operator-relevanten Events isoliert.

**B. Logger-Implementierung: outermost HTTP-Middleware in `app/logging_middleware.py`.**

Funktion `request_logger(request, call_next)` wird per `app.middleware("http")(request_logger)` **nach** `_csrf_cookie_setter` und `CSRFMiddleware` registriert — damit ist sie outermost. Die Duration-Messung umschließt alle anderen Middlewares; das `X-Request-ID`-Header ist die letzte Mutation der Response.

Pro Request emittiert die Middleware **eine** strukturierte Logzeile mit:

- `event = "http.request"`
- `method` (HTTP-Verb)
- `route` — **Route-Template** aus `request.scope["route"].path` (z. B. `/api/events/{event_id}`); Fallback bei ungematchten Pfaden: `request.url.path` mit UUID-Redaction (`{redacted_uuid}`).
- `status` (HTTP-Status-Code)
- `duration_ms` (Float, gerundet auf 2 Nachkommastellen)
- `request_id` — UUID4, neu generiert oder aus `X-Request-ID`-Header übernommen.
- **Log-Level abhängig vom Status:** 1xx-3xx → `info`, 4xx → `warning`, 5xx → `error`. Ermöglicht Filter `level>=WARNING` für Operator-Diagnostik.

**Was nicht geloggt wird (PII-Redaction):**

- Query-Parameter (`request.url.query` wird ignoriert)
- Request-/Response-Body (kein Inhalt, keine Größe)
- Konkrete IDs in Pfaden (Route-Template ersetzt Path-Vars)
- E-Mail-Adressen, Klartext-User-IDs, Personen-Namen, Geo-Koordinaten

**C. Auth-Events: separate strukturierte Logs mit SHA-256-User-ID-Hash.**

In `app/auth/manager.py` werden vier Events emittiert:

- `auth.login.success` — via `on_after_login`-Hook, mit `user_id_hash`.
- `auth.login.failed` — via Logging-Middleware bei `path.endswith("/auth/login")` und Status 4xx; ohne User-ID (Server hat den User noch nicht aufgelöst).
- `auth.logout.success` — via Logging-Middleware bei `path.endswith("/auth/logout")` und Status <400.
- `auth.forgot_password.requested` — via `on_after_forgot_password`, mit `user_id_hash`.
- `auth.password.reset.success` — via `on_after_reset_password`, mit `user_id_hash`.

`user_id_hash` ist die ersten 16 Hex-Zeichen von `SHA-256(str(user_uuid))`. Stabil über Sessions, nicht-rückführbar auf die Klartext-UUID, ausreichend für Operator-Korrelation („welche `auth.login.success` gehört zur gleichzeitigen `http.request`?"). E-Mails und UUIDs erscheinen niemals im Log.

**D. Request-ID-Propagation.**

`X-Request-ID`-Header wird beim Eingang gelesen (Client-Override erlaubt für distributed Tracing) oder neu als UUID4 generiert. Per `structlog.contextvars.bind_contextvars` für die Dauer des Requests gebunden, sodass alle Application-Logs (`migrations.*`, `services.person_merge.*`, `auth.*`, …) automatisch dieselbe `request_id` führen. Im Response-Header zurückgespiegelt, damit der Browser/Operator die Korrelation hat.

**E. Exception-Pfad.**

Wenn `await call_next(request)` eine unbehandelte Exception wirft, emittiert die Middleware **vor** dem Re-Raise eine `error`-Logzeile mit `status=500` und reraised dann. Die Starlette-Default-Exception-Handler bauen die finale 500-Response — die zwei Pfade können in Logs zusammen auftauchen (eine Zeile aus dem Exception-Pfad, eine aus dem normalen Response-Pfad bei nachgelagerten Handlern). Akzeptiert: doppeltes Logging einer 500 ist Operator-freundlicher als eine fehlende Spur.

**F. Out-of-Scope (nicht Teil dieses ADR).**

- **uvicorn-Access-Log explizit deaktivieren.** uvicorn loggt aktuell ohnehin nichts, weil structlog das Stdlib-Logging übernommen hat. Eine zusätzliche `--no-access-log`-Flag wäre redundant. Falls in Zukunft jemand das Stdlib-Logging-Setup ändert, könnte uvicorn-Default-Logs zusätzlich entstehen — dann muss die Flag explizit gesetzt werden.
- **OpenTelemetry-/Tracing-Integration.** Die `request_id` ist mit OpenTelemetry-Span-Konventionen kompatibel; eine vollständige Tracing-Integration ist M14-Thema (Monitoring & Alerting), nicht hier.
- **Audit-Log für Datenänderungen.** Application-Level-Events (Person-Merge, Anonymisierung, Event-Backfill, Catalog-Approve) loggen bereits eigene strukturierte Events (siehe `services/person_merge.py`); die Erweiterung auf weitere Domain-Operationen ist eigene Folge-Aufgabe.
- **Log-Aggregation und -Retention.** Operator-Wahl in M14, nicht von dieser ADR vorgegeben.

### Verworfene Alternativen

- **Variante A (Status quo).** Operator-Diagnostik bleibt blockiert; Issue #19 nicht reproduzierbar; auch zukünftige Operator-Reports müssten ohne Server-Spur diagnostiziert werden. Verworfen.
- **Variante C (nur 4xx/5xx + Auth).** Versteckt 200er-Performance, macht „warum dauert /api/search 4 s?"-Fragen unsichtbar. Patrick wählte explizit B mit Begründung Vollständigkeit > Reduktion. Verworfen.
- **uvicorn `--access-log` aktivieren.** Hätte Query-Parameter und konkrete Pfad-IDs gelogged → Verstoß gegen §6-Constraint. Verworfen.
- **Body-Logging für 4xx/5xx.** Ermöglicht Diagnose von Validierungsfehlern, aber Body kann selbst PII enthalten (`POST /api/events` mit Person-Namen oder Notizen). Verworfen — wer Body-Inhalt für Diagnose braucht, repliziert über DevTools.
- **User-ID im `http.request`-Log.** Hätte Operator-Korrelation auf einer Zeile ermöglicht, aber: Middleware läuft vor Auth-Resolution; die User-Identität müsste durch Cookie-Decoding rekonstruiert werden — doppelte Arbeit und Code-Duplikation mit fastapi-users. Lösung über separate `auth.*`-Events ist sauberer.

### Risiken und Mitigationen

- **R1. UUID-Pattern in Query-String oder Header schlägt durch Path-Logging.** Query-String wird gar nicht geloggt; Header werden nicht geloggt. Risiko = niedrig.
- **R2. Path-Var, der KEINE UUID ist (z. B. integer-IDs in `/api/restraint-types/{entry_id}`), wird vom Fallback-Regex nicht redacted.** Mitigation: das ist nur der Fallback bei ungematchten Pfaden. FastAPI-Routen sind fast immer matched — der Fallback greift praktisch nur bei 404. Wenn das Problem konkret auftritt, kann der Regex erweitert werden (z. B. ganze Zahlen, Slugs).
- **R3. `request.scope["route"].path` ist nicht gesetzt vor dem Routing.** Tatsächlich: erst nach `await call_next` — nach dem Routing. Die Middleware liest es erst nach `call_next`, daher robust.
- **R4. structlog `bind_contextvars` leakt zwischen parallelen Requests.** Starlette führt jeden Request in einem eigenen `asyncio.Task` mit eigenem `contextvars`-Kontext — `bind_contextvars` ist Task-lokal. Zusätzliche Sicherheit: `unbind_contextvars("request_id")` im `finally`-Block.
- **R5. Performance-Overhead pro Request.** Eine UUID-Generierung + zwei `time.perf_counter`-Calls + ein `getattr` + ein `log_method`-Call. Größenordnung <0.1 ms. Vernachlässigbar gegenüber DB-Query-Zeiten der Routes.
- **R6. Auth-Events `auth.login.failed` ohne `user_id_hash` erlauben keine Korrelation auf Brute-Force-Versuche.** Akzeptiert: Logging erfolgte E-Mail wäre PII-Verstoß; Hash der nicht-existenten oder falsch-eingegebenen E-Mail wäre wenig informativ. Brute-Force-Detection (Rate-Limiting auf Auth-Endpunkt) ist eigene Aufgabe; Login-Failed-Volume reicht als Erstindikator.

### Folge-Arbeit

- **M11-HOTFIX-003** (Fahrplan-Eintrag mit Status `[IN ARBEIT]` 2026-05-02) → Implementierung dieser ADR (Middleware + Manager-Hooks + Tests + Doku). Akzeptanzkriterien dort.
- **M14 (Monitoring & Alerting)** wird die `http.request`-Logs als Quelle für Latenz-Metriken und Alarmierung nutzen können (Filter `level=error`, Aggregation `route` + `status`).
- **Optional nach M11:** Erweiterung der UUID-Redaction-Heuristik auf weitere ID-Formate (Slugs, Integer), falls reale 404-Logs dies erforderlich machen.
- **Tracing (OpenTelemetry)** als M14-Folgeaufgabe — `request_id` ist kompatible Vorbereitung.

### Referenzen

- [Issue #21 — Backend: Strukturierter Access-Logger mit PII-Redaction](https://github.com/Paddel87/HC-Map/issues/21)
- [Issue #17 — UX-Befunde nach M11-HOTFIX-001 (Nebenbefund: Backend ohne Access-Logs)](https://github.com/Paddel87/HC-Map/issues/17)
- [`backend/app/logging_middleware.py`](../backend/app/logging_middleware.py)
- [`backend/app/auth/manager.py`](../backend/app/auth/manager.py) (`_user_id_hash`, `on_after_login`, `on_after_reset_password`, `on_after_forgot_password`)
- [`backend/app/main.py`](../backend/app/main.py) (Middleware-Registrierung)
- [`backend/tests/test_logging_middleware.py`](../backend/tests/test_logging_middleware.py)
- Constraint: [`docs/project-context.md`](./project-context.md) §6 (Datenschutz-Logging-Regel)
- Vorbild: [`backend/app/services/person_merge.py`](../backend/app/services/person_merge.py) (strukturiertes Audit-Event)

---

## ADR-055 — SQLAdmin auf `/sqladmin/` umziehen (Routing-Konflikt-Auflösung Issue #19)

**Status:** Accepted
**Datum:** 2026-05-03
**Freigabe:** 2026-05-03 (Patrick — Variante A)
**Kategorie:** §4.5 (API-Vertrag: SQLAdmin-URL ändert sich von `/admin/` auf `/sqladmin/`). Sekundär §4.7 (Build-/Deploy-Pipeline: Reverse-Proxy-Configs im Caddyfile + compose.traefik.yml).
**Vorgänger:** [ADR-049](./decisions.md#adr-049--admin-bereich-implementierungs-plan-m8) §A–§D (SQLAdmin-Mount auf `/admin/`), [ADR-053](./decisions.md#adr-053--frontend-ssr-backend-adressierung-im-production-container-netz) (SSR-Backend-URL), [ADR-054](./decisions.md#adr-054--strukturierter-access-logger-mit-pii-redaction-variante-b-aus-issue-21) (Access-Logger als Diagnose-Werkzeug).

### Kontext

Issue [#19](https://github.com/Paddel87/HC-Map/issues/19) — Operator-Bericht: _"Katalog (Handfesseln) lässt sich nicht öffnen"_ auf der Production-Instanz Nodica1, obwohl der Katalog lokal funktioniert. Diagnose-Update am 2026-05-03 (Patrick mit M11-HOTFIX-003-Logger):

```json
{"method":"GET","route":"/admin/catalogs","status":404,"duration_ms":9.14,"level":"warning"}
```

Das Frontend-Log zeigt für `/admin/catalogs` **keinen** Eintrag — der Request kommt nie beim Frontend an. Wurzel:

- Frontend Next.js-Seiten existieren unter `/admin/...`:
  - `/admin/catalogs`, `/admin/catalogs/[kind]`, `/admin/catalogs/[kind]/new`, `/admin/catalogs/[kind]/[id]/edit`
  - `/admin/users`, `/admin/users/new`, `/admin/persons`, `/admin/` (Dashboard)
- Backend hat unter `/admin/` SQLAdmin (ADR-049 §A) sowie `/api/admin/*` für User-Mgmt (ADR-049 §E–§G).
- Der Reverse-Proxy-Default ([`docker/Caddyfile.example`](../docker/Caddyfile.example)) routet **alles** `/admin/*` ans Backend:

```caddy
handle /api/* { reverse_proxy backend:8000 }
handle /admin/* { reverse_proxy backend:8000 }
handle { reverse_proxy frontend:3000 }
```

Das Backend antwortet erwartungsgemäß 404 für `/admin/catalogs`, weil es dort keine Route gibt — `/admin/catalogs` ist eine Frontend-Seite. Damit ist die **gesamte** Frontend-Admin-UI hinter jedem Reverse-Proxy-Setup nicht erreichbar.

**Lokal funktioniert es,** weil das Dev-Setup (`pnpm dev` auf 3000, Backend auf 8000) keinen Reverse-Proxy hat — der Browser geht direkt auf `localhost:3000/admin/catalogs` und bekommt das Frontend.

**Tragweite:** alle drei Reverse-Proxy-Pfade aus ADR-051 §B (Caddy-Overlay, Traefik-Overlay, externer Proxy) sind betroffen, weil sie alle dem Caddyfile-Default folgen.

**M11-HOTFIX-005 (`BACKEND_INTERNAL_URL` als Image-ENV-Default)** war Defense-in-Depth, hat aber den eigentlichen Bug nicht getroffen — die SSR-Hypothese war falsch. Der Fix bleibt drin (Härtung gegen den Bug-Modus aus ADR-053), war aber für #19 wirkungslos.

### Entscheidungen

**A. SQLAdmin zieht von `/admin/` auf `/sqladmin/` um.**

Drei Alternativen wurden Patrick vorgelegt (siehe Issue #19):
- **A — SQLAdmin auf `/sqladmin/`** umziehen. Frontend behält `/admin/*`. Reverse-Proxy bekommt zwei klar getrennte Backend-Pfade (`/api/*` und `/sqladmin/*`).
- **B — Reverse-Proxy-Routing fein granulieren.** Caddy + Traefik mit mehreren Pfad-Matchern (`/admin/` exakt + `/admin/statics/*` + `/api/admin/*` ans Backend, alles andere ans Frontend). Funktional gleichwertig, aber jeder Reverse-Proxy-Setup trägt die Komplexität, und SQLAdmin-Updates können neue Sub-Routes mitbringen, die wir vergessen.
- **C — Frontend-Pfade umziehen** (Catalog/Users/Persons unter `/admin-dash/`). Stimmt zwar mit ursprünglicher README-Planung überein, aber viele Code-Stellen (Frontend, Tests, Nav, Doku) zu ändern.

**Patrick wählt A.** Begründung: SQLAdmin ist der nachträgliche Eindringling im Admin-Namespace (M8.2 / ADR-049 §A); ein Move auf `/sqladmin/` macht das Reverse-Proxy-Routing trivial (nur `/api/*` und `/sqladmin/*` ans Backend, sonst alles ans Frontend), und der Code-Change ist auf einen `base_url`-Parameter im SQLAdmin-Konstruktor begrenzt. Variante (b) verschiebt die Komplexität auf den Operator-Routing-Pfad und ist anfälliger für SQLAdmin-Internas; Variante (c) macht weiträumig Code-Touch ohne Mehrwert für die Architektur.

**B. Implementation: `Admin(app, ..., base_url="/sqladmin")`.**

[`backend/app/admin_ui/setup.py:70-77`](../backend/app/admin_ui/setup.py#L70-L77) wird um `base_url="/sqladmin"` erweitert. SQLAdmin re-mounted dann alle internen Routes (`/sqladmin/`, `/sqladmin/login`, `/sqladmin/logout`, `/sqladmin/<model>/list`, `/sqladmin/statics/*`) auf den neuen Präfix. Der Default-`base_url`-Wert ist `/admin`, ein expliziter `base_url="/sqladmin"`-Parameter genügt.

**C. `/admin/login`-Redirect umziehen auf `/sqladmin/login`.**

Der Redirect aus [`backend/app/main.py:148-150`](../backend/app/main.py#L148-L150) (SQLAdmin-Default-Login → SPA-Login) wird auf den neuen Präfix umgestellt:

```python
@app.get("/sqladmin/login", include_in_schema=False)
async def _sqladmin_login_redirect() -> RedirectResponse:
    return RedirectResponse(url="/login", status_code=302)
```

Der alte `/admin/login`-Redirect entfällt; `/admin/login` ist nun eine Frontend-Route (existiert dort nicht, wird zu 404 vom Frontend — kein Backend-Konflikt mehr).

**D. Reverse-Proxy-Configs auf `/sqladmin/` umstellen.**

- [`docker/Caddyfile.example`](../docker/Caddyfile.example): `handle /admin/* { ... }` → `handle /sqladmin/* { ... }`. Die `/api/*`-Regel bleibt unverändert (deckt `/api/admin/*` weiter ab).
- [`docker/compose.traefik.yml`](../docker/compose.traefik.yml): Router-Rule `PathPrefix(`/admin`)` → `PathPrefix(`/sqladmin`)`.
- [`docker/traefik/dynamic.yml.example`](../docker/traefik/dynamic.yml.example): keine Änderung (keine pfad-spezifischen Regeln dort).

**E. Tests aktualisieren.**

[`backend/tests/test_admin_ui.py`](../backend/tests/test_admin_ui.py) hat 8 ModelView-Pfade und 4 Auth-Bridge-Pfade auf `/admin/...`. Alle ziehen auf `/sqladmin/...` um. Test `test_admin_login_get_redirects_to_spa` deckt jetzt `/sqladmin/login` ab.

**F. Doku-Updates.**

- [`README.md`](../README.md): SQLAdmin-Verweise auf `/sqladmin/`.
- [`ops/runbook.md`](../ops/runbook.md): SQLAdmin-Operator-Pfade auf `/sqladmin/`.

**G. Out-of-Scope (nicht Teil dieses ADR).**

- **SQLAdmin-Header-Link „← Zurück zur App"** ([Issue #20](https://github.com/Paddel87/HC-Map/issues/20)): bleibt offen, separat zu lösen — nicht-blockierend für #19.
- **Frontend-`/admin-dash/`-Move (Variante C):** verworfen (siehe oben), kein Folge-ADR.
- **Operator-Migration alter `/admin/`-Bookmarks:** `/admin/` ist auf RC-1 nur kurz live gewesen; einziger relevanter Operator (Patrick) wird per RC-2-Release-Notes informiert.

### Verworfene Alternativen

- **Variante B (Routing fein granulieren).** Verschiebt die Komplexität in jeden Reverse-Proxy-Setup; SQLAdmin-Internas (Static-Asset-Pfade, neue Endpoints) müssen manuell mitgepflegt werden. Operator-feindlich für Multi-Instanz-Setups.
- **Variante C (Frontend-Pfade auf `/admin-dash/`).** Größerer Code-Touch (Routes, Nav, Tests, Doku) ohne Architektur-Mehrwert; SQLAdmin als kleinerer Eindringling sollte stattdessen umziehen.
- **`/admin/api/*` für Backend-API-Endpoints.** Die `/api/admin/*`-Routes (User-Mgmt, Stats, Export, Person-Merge) bleiben unverändert — sie liegen unter `/api/*` und sind vom Routing-Konflikt nicht betroffen. Eine zusätzliche Umbenennung auf `/api/admin/*` → `/api/sqladmin/*` wäre rein kosmetisch und würde Frontend-API-Calls aufwendig anpassen. Verworfen.

### Risiken und Mitigationen

- **R1. RC-1-Operator hat Bookmark auf `/admin/` (SQLAdmin):** das Bookmark führt nach RC-2 ins Frontend (`/admin/` zeigt das Admin-Dashboard, nicht SQLAdmin). Mitigation: RC-2-Release-Notes weisen explizit darauf hin.
- **R2. SQLAdmin's interne URL-Generation respektiert `base_url`:** verifiziert via Smoke-Test im RC-2-Smoke (alle ModelView-Pfade unter `/sqladmin/...` erreichbar).
- **R3. Frontend-Layout `(protected)/admin/layout.tsx` wird ggf. von SQLAdmin-URLs erfasst:** geprüft — Frontend-Layout greift nur für Next.js-Routes, nicht für Backend-mounted-Pfade. Reverse-Proxy entscheidet vorher.
- **R4. CSRF-Token-Pfad:** SQLAdmin macht selbst keine CSRF-Token-Logik im Sinne unseres `hcmap_csrf`-Cookie-Mechanismus; das Auth-Backend trägt die Cookie-Bridge. Pfad-Änderung ändert daran nichts.
- **R5. Test-Suite-Drift:** 11 Test-Pfade in `test_admin_ui.py` sind hartkodiert. Mit dem ADR-Move alle auf `/sqladmin/...` umgestellt; Suite läuft auf 256 → 256 grün (kein Test-Count-Change).

### Folge-Arbeit

- **M11-HOTFIX-006** (Fahrplan-Eintrag mit Status `[IN ARBEIT]`): Implementierung dieser ADR (Backend `base_url`, Redirect, Caddyfile, Traefik-Compose, Tests, Doku).
- **RC-3-Tag** nach Hotfix-Merge (analog RC-2-Pattern aus M10.9): bündelt M11-HOTFIX-006, re-mapped `:rc`. **Empfehlung als Folge-Aufgabe**, separater Patrick-Entscheid.
- **Issue [#19](https://github.com/Paddel87/HC-Map/issues/19) Schluss** nach Operator-Verifikation auf Production (Browser → `/admin/catalogs` zeigt Frontend-Seite).

### Referenzen

- [Issue #19 — Katalog-Übersicht öffnet nicht](https://github.com/Paddel87/HC-Map/issues/19) (Diagnose-Update 2026-05-03)
- [ADR-049 §A — SQLAdmin-Mount](./decisions.md#adr-049--admin-bereich-implementierungs-plan-m8) (vorheriger `base_url=/admin`)
- [ADR-051 §B — Reverse-Proxy-Wahlfreiheit](./decisions.md#adr-051--implementierungsstrategie-m10-release-candidate-bündel-deployment-ready-durch-jedermann)
- [ADR-054 — Access-Logger als Diagnose-Werkzeug](./decisions.md#adr-054--strukturierter-access-logger-mit-pii-redaction-variante-b-aus-issue-21) (404-Diagnose erst durch HOTFIX-003 möglich geworden)
- Code-Stellen: [`backend/app/admin_ui/setup.py:70`](../backend/app/admin_ui/setup.py#L70), [`backend/app/main.py:148`](../backend/app/main.py#L148), [`docker/Caddyfile.example:25`](../docker/Caddyfile.example#L25), [`docker/compose.traefik.yml:48`](../docker/compose.traefik.yml#L48)

---

## ADR-056 — Optionales `event.title`-Feld für Identifikation und Wiederfindung (Issue #27 Befund 4+5)

**Status:** Accepted
**Datum:** 2026-05-03
**Freigabe:** 2026-05-03 (Patrick — Variante A, Reihenfolge-Freigabe nach Operator-Befundbericht-II-Triage)
**Kategorie:** §4.4 Datenmodell-Änderung (neue Spalte am Event-Modell, RxDB-Schema-Bump v1→v2).
**Vorgänger:** [ADR-029](./decisions.md#adr-029--rxdb-replication-protokoll) (Sync-Protokoll), [ADR-030](./decisions.md#adr-030--soft-delete-und-cursor) (Cursor + Soft-Delete), [ADR-031](./decisions.md#adr-031--rxdb-json-schema-vs-pydantic-drift-test) (Schema-Drift-Test), [ADR-050](./decisions.md#adr-050--m9-w3w-migration-verworfen-eventw3w_legacy-zu-legacy_external_ref-umgewidmet) (vorheriger Schema-Bump v0→v1).

### Kontext

Issue [#27](https://github.com/Paddel87/HC-Map/issues/27) Befund 4 (Operator-Feldtest, RC-3-Phase Nodica1): Events haben kein Titel-/Bezeichnungs-Feld. Im Erfassungs-Workflow gibt es nur GPS + Startzeit + optionale Notiz. Folge:

- **Dashboard:** Events erscheinen mit Startzeit + Koordinaten — schwer voneinander zu unterscheiden, gerade bei mehreren Events am gleichen Tag/Ort.
- **Karten-Marker (Befund 5):** Punkte zeigen nur Koordinaten + Zeitstempel — visuell „kryptische Zahlen", keine Schnell-Identifikation.
- **Wiederfindung:** ohne Titel kein mentaler Anker („Konzert in Bremen"), nur exakte Zeit/Ort als Suchschlüssel.

Das `note`-Feld eignet sich als Workaround nicht — es ist semantisch für längere Beobachtungen (Verlauf, Kontext, Stimmung) und in Listen-Ansichten ungekürzt unbrauchbar.

### Entscheidungen

**A. Optionales `title`-Feld auf `event` (Variante A aus dem Triage-Block).**

Drei Alternativen wurden Patrick im Triage-Block vorgelegt:
- **A — Optionales `title VARCHAR(120) NULL` auf Event.** Anzeige: Dashboard-Hauptzeile, Karten-Marker-Tooltip/Label, Edit-Header. Fallback bei NULL: aktuelle Darstellung (Startzeit + Koordinaten).
- **B — Status quo.** Operator nutzt `note`-Feld als Workaround. Verworfen: `note` ist für längere Beobachtungen, in Listen-Ansichten unbrauchbar.
- **C — Synthetisch im Frontend** aus `note`-First-Line. Verworfen: keine echte Identifier-Semantik, nicht editierbar als Identifikator, vermischt zwei orthogonale Felder.

**Patrick wählt A.** Begründung: niedrigschwellige Migration (eine Spalte, nullable, kein Constraint), löst Befund 4 + 5 + die „Wiederfindung"-Sorge aus Befund 6 ein Stück weit. Wirkt sich an drei UI-Stellen aus (Dashboard, Karten-Marker, Edit-Form), klar abgrenzbar.

**B. Schema-Form: `title VARCHAR(120)`, NULL erlaubt, kein Default.**

- `VARCHAR(120)` deckt typische Bezeichnungen ab (Operator-Vorschlag war ~80 Zeichen, mit Puffer auf 120 für Mehrteiler wie „Konzert in Bremen — Halle 7").
- Nullable=True: Operator kann das Feld leer lassen → Fallback auf bestehende Darstellung (Startzeit + Koordinaten). **Keine Pflicht** — sonst wäre der Live-Modus mit Schnell-Erfassung „Tap → Standort → Start" gestört.
- Kein Server-Default — `NULL` ist die explizite Markierung „nicht gesetzt".
- Kein Volltext-Index initial — Such-Use-Case kommt erst mit M5c-NACH/M16; falls Volltextsuche nötig, kann der `note`-FTS-Index aus M3 erweitert werden (eigener Folge-ADR).

**C. RxDB-Schema-Bump v1 → v2 mit Migrations-Strategie.**

`frontend/src/lib/rxdb/schemas/event.schema.json` bekommt `version: 2` und ein neues `title`-Property (`type: ["string", "null"]`, `maxLength: 120`). `frontend/src/lib/rxdb/database.ts` ergänzt:

```typescript
migrationStrategies: {
  1: ...,  // v0 → v1 aus ADR-050
  2: (doc) => ({ ...doc, title: null }),  // v1 → v2: Default null
}
```

Bestehende lokale RxDB-Docs in IndexedDB werden bei nächstem Mount automatisch transformiert. Backend-DB-Migration setzt `title=NULL` für alle bestehenden Rows, was identisch ist — keine Daten-Reparatur nötig.

**D. UI-Stellen.**

- **Erfassungs-Forms** (`event-create-form.tsx`, `event-backfill-form.tsx`): neues optionales Eingabefeld „Titel" (`<input maxLength={120}>`), positioniert vor dem `Notiz`-Block.
- **Edit-Form** (`event-edit-form.tsx`): `title` als editierbares Feld in der bestehenden Editable-Felder-Liste (analog `note`).
- **Detail-View** (`event-detail-view.tsx`): `title` als Page-Header (oben prominent), Fallback auf bisherige Startzeit-Darstellung wenn NULL.
- **Dashboard** (`(protected)/page.tsx`): `title` als Hauptzeile (statt/zusätzlich zur Startzeit). Fallback wie oben.
- **MapView Popup** (`map-view.tsx`): `title` als Erste Zeile im Popup, Fallback Startzeit.

**E. Sync-Protokoll und Backend-Schemas.**

- `backend/app/sync/schemas.py` — `EventDoc.title: str | None = None`.
- `backend/app/sync/services.py` — `title` durchreichen analog `note`.
- `backend/app/schemas/event.py` — `EventBase.title`, `EventStart.title`, `EventUpdate.title`. LWW-Verhalten analog `note` (ADR-029).
- `backend/tests/test_rxdb_schema_drift.py` läuft automatisch mit, sobald JSON-Schema und Pydantic synchron sind.

**F. Out-of-Scope (nicht Teil dieses ADR).**

- **Volltextsuche über `title`:** kommt mit M16-Tags-Suche oder einem expliziten Folge-ADR.
- **Karten-Marker-Cluster mit Titel-Aggregation** (Befund 5 weitergehend): aktuell zeigt der Cluster nur die Anzahl. Titel-Tooltip beim Tap auf einzelnen Marker reicht für RC-3.
- **Validierung gegen leere/Whitespace-only Titel**: trim auf Frontend-Seite, Backend akzeptiert NULL = leer (kein Constraint nötig).
- **Migration bestehender `note`-First-Lines in `title`:** verworfen (Variante C-Reste). Operator pflegt manuell wenn gewünscht.

### Verworfene Alternativen

- **Variante B (Status quo).** Operator-Befund ist konkret und nicht hypothetisch; Workaround über `note` bricht die Listen-Ansichten.
- **Variante C (Frontend-synthetisch aus `note`-First-Line).** Vermischt zwei semantisch verschiedene Felder, nicht-editierbar als Identifier, und der Cursor-basierte RxDB-Sync würde die Title-Anzeige nicht reaktiv aktualisieren.
- **`title NOT NULL` mit Pflicht.** Verworfen: bricht Live-Modus-Schnellerfassung („Tap → Standort → Start").
- **Längere `VARCHAR`-Limits (255, 500).** Verworfen: Titel ist Identifier, kein Beschreibungstext (das ist `note`). 120 Zeichen reichen für die typischen Operator-Use-Cases.

### Folgearbeit

- **M11-HOTFIX-008** (Fahrplan-Eintrag): Implementierung dieser ADR (Migration, Backend-Modell + Schemas, RxDB-Schema-Bump, fünf UI-Stellen, Tests).
- **#27 Befund 6 (Wiederfindung):** weiterhin offen, gehört zu M5c-NACH/M16 — Filter/Suche-Implementierung erhält durch `title` eine sinnvolle zusätzliche Such-Dimension.

### Referenzen

- [Issue #27 — Operator-Befundbericht II Befund 4+5](https://github.com/Paddel87/HC-Map/issues/27)
- [ADR-029 — RxDB-Replication-Protokoll](./decisions.md#adr-029--rxdb-replication-protokoll)
- [ADR-031 — RxDB-JSON-Schema vs Pydantic Drift-Test](./decisions.md#adr-031--rxdb-json-schema-vs-pydantic-drift-test)
- [ADR-050 — Vorheriger Schema-Bump v0→v1 (Pattern-Vorlage)](./decisions.md#adr-050--m9-w3w-migration-verworfen-eventw3w_legacy-zu-legacy_external_ref-umgewidmet)
- Code-Stellen: [`backend/app/models/event.py`](../backend/app/models/event.py), [`backend/app/sync/schemas.py`](../backend/app/sync/schemas.py), [`frontend/src/lib/rxdb/schemas/event.schema.json`](../frontend/src/lib/rxdb/schemas/event.schema.json), [`frontend/src/lib/rxdb/database.ts`](../frontend/src/lib/rxdb/database.ts)

---

## ADR-057 — Application-Lifecycle: Auto-Stop bei Event-Ende + Stop-Button pro Application (Issue #23 Befund 2)

**Status:** Accepted
**Datum:** 2026-05-03
**Freigabe:** 2026-05-03 (Patrick — Variante A, Reihenfolge-Freigabe nach Operator-Befundbericht-Triage)
**Kategorie:** §4.5 API-Vertrags-Änderung (zusätzliche Server-Side-Effekte beim Event-Ende: Auto-Cascade auf laufende Applications). Sekundär §4.4 (Service-Layer-Logik im Sync-Pfad).
**Vorgänger:** [ADR-011](./decisions.md) (Live-Modus Lifecycle), [ADR-029](./decisions.md) (RxDB-Replication / FWW vs LWW), [ADR-038](./decisions.md) (Event-Detail-View), [ADR-039](./decisions.md) (Backfill-Validation), [ADR-040](./decisions.md) (Edit-UI).

### Kontext

Issue [#23](https://github.com/Paddel87/HC-Map/issues/23) Befund 2 (Operator-Feldtest, RC-3-Phase Nodica1) — drei zusammengehörige Beobachtungen:

- **2a:** Ein Live-Event wird beendet, aber zugehörige Applications bleiben offen-laufend. Der Container-Event ist terminiert, die Children sind es nicht — inkonsistent gegenüber der erwartbaren Lifecycle-Kaskade.
- **2b:** Im laufenden Live-Event hat eine einzelne Application keinen sichtbaren Stop-Button. Der einzige Weg zum Beenden geht über „Event bearbeiten" + manuelle Ende-Datum-Eingabe — fehleranfällig (siehe 2c).
- **2c:** Backend-Validatoren („Application endet nach dem Event-Ende", „Application-Ende liegt vor dem Start") greifen korrekt, sind aber UX-Sackgassen. Wenn das Frontend dieselbe Logik kennt, sollte es sie verwenden, statt den User in eine Backend-Validator-Kollision laufen zu lassen.

### Entscheidungen

**A. Backend Auto-Stop (Variante A aus dem Triage-Block).**

Drei Alternativen wurden Patrick vorgelegt:
- **A — Backend-Auto-Stop + Stop-Button + Frontend-Pre-Submit-Hint.** Beim Event-Ende setzt der Service alle nicht-beendeten Applications dieses Events transaktional auf `ended_at = event.ended_at`.
- **B — Frontend-only Auto-Stop.** Beim Event-Beenden iteriert das Frontend über offene Applications und schickt einzelne PATCH-Requests. Verworfen: Race-Conditions bei Offline/Reconnect, mehrere Requests statt einer Transaktion.
- **C — Nur Stop-Button + Pre-Submit-Hint, kein Auto-Stop.** Verworfen: Befund 2a (Konzeptbruch durch Lifecycle-Inkonsistenz) bleibt bestehen.

**Patrick wählt A.** Begründung: Auto-Stop ist die einzige Variante, die die Lifecycle-Kaskade konzeptkonform macht — ohne sie bleibt der Datenstand inkonsistent (beendetes Event mit laufenden Applications). Backend-Touch ist klein.

**B. Server-Side Auto-Stop an drei Code-Pfaden.**

Auto-Stop muss überall greifen, wo `event.ended_at` von `null` auf `not null` wechselt:

1. **`POST /api/events/{id}/end`** ([`backend/app/services/events.py:end_event`](../backend/app/services/events.py)) — Live-Modus-Beenden. Direkter Trigger.
2. **`PATCH /api/events/{id}`** ([`backend/app/services/events.py:update_event`](../backend/app/services/events.py)) — Edit-Form setzt `ended_at` nachträglich (FWW-only-when-null, ADR-040 §C).
3. **RxDB-Push** ([`backend/app/sync/services.py:_apply_event_update`](../backend/app/sync/services.py)) — Frontend-RxDB pusht ein Event mit `ended_at != null`.

Alle drei Pfade rufen einen neuen Helper `auto_stop_open_applications(session, event_id, ended_at)` auf, der per UPDATE alle Application-Rows im Event mit `ended_at IS NULL AND is_deleted=false` auf den übergebenen Zeitstempel setzt. Transaktional Teil derselben Session — entweder beide Writes (Event + Children) oder keiner.

**C. Idempotenz und FWW-Kompatibilität.**

- **Idempotenz:** Wenn das Event bereits `ended_at` hat, ändert sich nichts. Der Helper läuft trotzdem, hat aber leere Working-Set (keine offenen Applications mehr).
- **FWW-Kompatibilität:** Application's `ended_at` ist bisher LWW-frei (kein FWW-Constraint im Sync-Service). Der Auto-Stop überschreibt also keinen vom User gewollten späteren `ended_at`-Wert — wenn der Operator eine Application explizit später beenden wollte, muss er sie *vor* dem Event-Ende beenden.

**D. Frontend: Stop-Button pro laufende Application.**

In [`frontend/src/components/event/event-detail-view.tsx:ApplicationsTimeline`](../frontend/src/components/event/event-detail-view.tsx) bekommt jede aktive Application (`ended_at === null`) einen Stop-Button neben der Timer-Anzeige. Klick ruft denselben Handler wie der bestehende „Aktuelle beenden"-Button im Header (`handleEndApplication(id)`).

Sichtbarkeit: nur wenn `isLive === true` (sonst gibt es keine aktiven Applications) und `endedAt === null`. `data-testid="applications-timeline-stop"` für Tests.

**E. Frontend: Pre-Submit-Hint im Edit-Form.**

Der bestehende [`validateBackfill`](../frontend/src/lib/event-backfill-validation.ts)-Helper liefert bereits `bounds`-Errors für „Application endet nach dem Event-Ende". Im [`event-edit-form.tsx`](../frontend/src/components/event/event-edit-form.tsx) wird die Validierung **bereits beim Tippen** (statt erst beim Submit) ausgewertet, wenn der User ein `ended_at`-Feld editiert. Der Hint erscheint inline am betroffenen Feld, der Submit-Pfad nutzt denselben Validator. Damit muss der Operator nicht erst submit klicken, um die Backend-Validator-Meldung zu sehen — der Konflikt wird sichtbar, sobald der Wert getippt ist.

Implementiert über `useMemo` auf den aktuellen Form-State, der validateBackfill mit den lokalen Werten aufruft und die Errors anzeigt. Submit nutzt dieselben `errors` als Block-Bedingung.

**F. Out-of-Scope (nicht Teil dieses ADR).**

- **Auto-Restart:** Wenn ein Admin ein Event aus dem Soft-Delete restored (ended_at bleibt erhalten), werden Applications nicht „auto-resumed". Restore ist bereits Admin-only, manuelle Korrektur erlaubt.
- **Auto-Stop im Live-Modus „Neue Application"-Trigger:** Wenn der Operator eine zweite Application startet während die erste läuft, beendet das die erste *nicht* automatisch. Multi-Active ist explizit erlaubt (parallele Restraints).
- **Audit-Log für Auto-Stop:** Bisher kein dediziertes Audit (kein Audit-Log-System im Repo). Falls später eingeführt, würde Auto-Stop ein Audit-Event auslösen.
- **Migrations-Daten-Reparatur:** Bestehende inkonsistente Rows (beendete Events mit laufenden Applications) werden *nicht* automatisch repariert. Der Operator kann Edit-Form nutzen.

### Verworfene Alternativen

- **Variante B (Frontend-only Auto-Stop).** Race-Conditions, mehrere Requests statt Transaktion, schwierig bei Offline/Reconnect-Replay.
- **Variante C (nur Stop-Button + Hint, kein Auto-Stop).** Operator-Befund 2a (Lifecycle-Kaskade) bleibt unbehoben.
- **Auto-Restart bei Event-Restore.** Operator-Erwartung wäre uneindeutig; manuelle Korrektur ist sicherer.

### Folgearbeit

- **M11-HOTFIX-009** (Fahrplan-Eintrag): Implementierung dieser ADR (Helper, drei Service-Pfade, Stop-Button, Edit-Form-Live-Validation, Tests).
- **#23 Befund 2 schließen** nach Operator-Verifikation auf Production (Live-Event mit zwei Applications anlegen, Event beenden, beide Applications auf den Event-Ende-Zeitstempel gesetzt).

### Referenzen

- [Issue #23 — Operator-Befundbericht I Befund 2](https://github.com/Paddel87/HC-Map/issues/23)
- [ADR-011 — Live-Modus Lifecycle](./decisions.md)
- [ADR-029 — RxDB-Replication FWW vs LWW](./decisions.md)
- Code-Stellen: [`backend/app/services/events.py`](../backend/app/services/events.py), [`backend/app/services/applications.py`](../backend/app/services/applications.py), [`backend/app/sync/services.py`](../backend/app/sync/services.py), [`frontend/src/components/event/event-detail-view.tsx`](../frontend/src/components/event/event-detail-view.tsx), [`frontend/src/components/event/event-edit-form.tsx`](../frontend/src/components/event/event-edit-form.tsx)

---

## ADR-058 — Event.`time_precision`-Marker für ehrliche retrospektive Erfassung (Issue #24)

**Status:** Accepted
**Datum:** 2026-05-03
**Freigabe:** 2026-05-03 (Patrick — Variante A, Reihenfolge-Freigabe nach Operator-Befundbericht-Triage)
**Kategorie:** §4.4 Datenmodell-Änderung (neue Spalte am Event-Modell, RxDB-Schema-Bump v2→v3).
**Vorgänger:** [ADR-029](./decisions.md), [ADR-030](./decisions.md), [ADR-031](./decisions.md), [ADR-039](./decisions.md) (Backfill-Modus), [ADR-056](./decisions.md) (Schema-Bump-Pattern).

### Kontext

Issue [#24](https://github.com/Paddel87/HC-Map/issues/24) (Operator-Feldtest, RC-3-Phase Nodica1): Im Modus „Nachträglich erfassen" ist die Zeit-Eingabe zwingend volles Datetime (`datetime-local`). Für **frische** Backfills („gestern 14–16 Uhr") passend, für **ältere Erinnerungen** unrealistisch („Sommer 2024", „irgendwann im März"). Operator muss entweder Pseudo-Genauigkeit erfinden (`01.06.2024 12:00` für „Sommer 2024") oder den Eintrag weglassen — beides degradiert Datenqualität unsichtbar.

Operator-Produkt-Frage im Issue: „präzises Erfassungswerkzeug bleiben oder explizit auch retrospektives Logbuch?" → Patrick wählt: explizit auch retrospektives Logbuch, grobe Erinnerung gleichberechtigt.

### Entscheidungen

**A. `time_precision`-Spalte auf `event` (Variante A aus dem Triage-Block).**

Drei Alternativen wurden Patrick vorgelegt:
- **A — Marker auf Event, fünf Werte (`year`/`month`/`day`/`hour`/`minute`), Default `minute`.** Live-Modus bleibt minutengenau (Default), nachträglicher Modus zeigt Granularitäts-Wechsler. Application erbt im Display, hat kein eigenes Marker-Feld.
- **B — Status quo.** Operator akzeptiert Pseudo-Genauigkeit. Verworfen: zerstört Datenqualität.
- **C — A plus eigener Marker an Application.** Verworfen: Application liegt sowieso im Event-Fenster, eigenständige Granularität ist Overengineering ohne klaren Anwendungsfall.

**Patrick wählt A.** Begründung: minimale Migration (eine Spalte), löst Operator-Befund vollständig ohne Frontend-Aufblähung an der Application-UI.

**B. Schema-Form: `time_precision VARCHAR(10) NOT NULL DEFAULT 'minute' CHECK (time_precision IN ('year','month','day','hour','minute'))`.**

- **NOT NULL + Default `'minute'`:** alle bestehenden Rows bekommen automatisch `'minute'` (Backwards-Kompatibilität — entspricht dem bisherigen Verhalten, sortier- und filterbar wie zuvor).
- **CHECK-Constraint statt Postgres ENUM:** CHECK ist evolvierbar (zukünftige `quarter`/`season`-Werte würden nur den CHECK-Update erfordern, kein Migration-Stunt mit `ALTER TYPE`). Postgres-ENUMs sind beim Entfernen alter Werte fragil.
- **VARCHAR(10):** ausreichend für die fünf aktuellen Werte und potenzielle Erweiterungen (`quarter` = 7 Zeichen).
- **Pydantic-Typ:** `Literal["year", "month", "day", "hour", "minute"]` — typsicher und mit IDE-Unterstützung.

**C. Speicher-Konvention: volle Timestamps bleiben.**

`started_at`/`ended_at` werden weiter als volle `datetime` gespeichert. Die Granularität ist semantisches Metadatum, nicht Storage-Format:
- `time_precision='year'` mit `started_at='2024-01-01T00:00:00Z'` → UI zeigt „2024".
- `time_precision='month'` mit `started_at='2024-05-01T00:00:00Z'` → UI zeigt „Mai 2024".
- `time_precision='day'` → „01.05.2024".
- `time_precision='hour'` → „01.05.2024 12 Uhr".
- `time_precision='minute'` → bisheriges Verhalten („01.05.2024 12:30").

Sortier- und Filter-Logik kann unverändert auf den Timestamps arbeiten (Range-Queries, Throwbacks, Map-Filter). Nur die Anzeige-Logik kondensiert je nach Precision.

**D. Frontend-Form (Backfill-Modus): Granularitäts-Wechsler.**

[`event-backfill-form.tsx`](../frontend/src/components/event/event-backfill-form.tsx) bekommt im „Zeitraum"-Block einen Wechsler (Radio-Button-Group oder Select), der die Eingabefelder umschaltet:
- `Datum + Uhrzeit` (Default) → wie bisher (`datetime-local`-Input).
- `Datum` → `<input type="date">`.
- `Monat` → `<select>` für Monat + `<input type="number">` für Jahr.
- `Jahr` → `<input type="number">`.

Die Form normalisiert beim Submit auf den ersten Tag/Stunde/Minute des gewählten Bereichs (so wird `'Sommer 2024'` als `'2024-06-01T00:00:00Z'` mit `time_precision='month'` gespeichert — semantisch „Juni 2024", aber Operator gibt nur „Mai 2024" → speichert `'2024-05-01T00:00:00Z'`).

Live-Modus bleibt unverändert minutengenau (kein Wechsler im `event-create-form.tsx`, Backend-Default `'minute'`).

**E. Anzeige-Helper im Frontend.**

Neue pure Funktion `formatEventTime(iso: string, precision: TimePrecision): string` in [`frontend/src/lib/event-time.ts`](../frontend/src/lib/event-time.ts) — zentralisiert die Display-Logik. Genutzt im:
- Dashboard-Liste (Hauptzeile fällt auf precision-formatierten Zeitstempel zurück, wenn kein Title gesetzt — sonst bleibt Title primär).
- Detail-View (CardDescription, Status-Anzeige).
- MapView Popup (Datum-Zeile).

**F. Application-Anzeige.**

Application-Zeiten werden weiter mit voller `toLocaleString`-Formatierung angezeigt. Operator kann Application-Zeiten nicht „grob" erfassen — wenn die Erinnerung nur „Sommer 2024" ist, sollte er gar keine Application erfassen oder eine mit dem Event-Default-Zeitstempel anlegen. Validierung bleibt: Application muss innerhalb Event-Fenster liegen (existierende Backfill-Validation, ADR-039).

**G. Sync-Protokoll und Backend-Schemas.**

- `backend/app/sync/schemas.py` — `EventDoc.time_precision: TimePrecision = "minute"` (Pydantic-`Literal`).
- `backend/app/sync/services.py` — `time_precision` durchreichen, LWW analog `note`.
- `backend/app/schemas/event.py` — `EventBase.time_precision`, `EventStart.time_precision` (default `'minute'`), `EventUpdate.time_precision`.
- `backend/tests/test_rxdb_schema_drift.py` läuft automatisch mit, sobald JSON-Schema und Pydantic synchron sind.

**H. RxDB-Schema-Bump v2→v3 mit Migrations-Strategie.**

`event.schema.json` bekommt `version: 3` und ein neues `time_precision`-Property (`type: "string"`, `enum: [...]`, `default: "minute"`). `database.ts` ergänzt `migrationStrategies[3]: (doc) => ({ ...doc, time_precision: 'minute' })`.

**I. Out-of-Scope (nicht Teil dieses ADR).**

- **`quarter`/`season`-Werte:** kann später additiv ergänzt werden (CHECK-Constraint-Update + Frontend-Wechsler-Erweiterung).
- **Application-eigene Granularität:** Variante C verworfen, kein eigenes Feld.
- **Filter-/Such-Logik nach Precision:** aktuell alle Events gleich behandelt im Throwback/Map-Filter. Präzisions-aware-Filter (z. B. „nur tagesgenaue Events") ist M16-Folge-Aufgabe.
- **Migrations-Daten-Reparatur:** alte Rows haben automatisch `'minute'` (Default). Operator kann manuell auf `'year'` etc. umstellen falls bestehende Pseudo-Genauigkeit korrigiert werden soll.

### Verworfene Alternativen

- **Variante B (Status quo).** Pseudo-Genauigkeit zerstört Datenqualität.
- **Variante C (Marker auch an Application).** Application-Zeiten liegen immer im Event-Fenster — eigenständige Granularität bringt keinen klaren Mehrwert, dafür mehr UI-Fläche.
- **Postgres ENUM statt CHECK.** ENUM ist beim Entfernen/Umbenennen alter Werte fragil; CHECK ist evolvierbar.
- **`time_precision NULL` bei alten Rows.** Verworfen: Default `'minute'` ist semantisch korrekt für alle bisherigen Live-Modus-Events und macht den Pydantic-Typ einfacher (`Literal[...]` statt `Literal[...] | None`).

### Folgearbeit

- **M11-HOTFIX-010** (Fahrplan-Eintrag): Implementierung dieser ADR.
- **#27 Befund 6 (Wiederfindung):** weiterhin offen, gehört zu M5c-NACH/M16. Filter/Suche-Implementierung kann durch `time_precision` eine sinnvolle zusätzliche Such-Dimension erhalten.

### Referenzen

- [Issue #24 — Variable Zeitangabe-Präzision bei nachträglicher Event-Erfassung](https://github.com/Paddel87/HC-Map/issues/24)
- Code-Stellen: [`backend/app/models/event.py`](../backend/app/models/event.py), [`backend/app/sync/schemas.py`](../backend/app/sync/schemas.py), [`frontend/src/lib/rxdb/schemas/event.schema.json`](../frontend/src/lib/rxdb/schemas/event.schema.json), [`frontend/src/components/event/event-backfill-form.tsx`](../frontend/src/components/event/event-backfill-form.tsx)

---

## ADR-059 — `reveal_participants`-Toggle im Beteiligte-Tab statt versteckt im Edit-UI (Issue #23 Befund 1, korrigiert via #27)

**Status:** Accepted
**Datum:** 2026-05-03
**Freigabe:** 2026-05-03 (Patrick — Variante A, Reihenfolge-Freigabe nach Operator-Befundbericht-Triage)
**Kategorie:** §5 (UX-Platzierung, Frontend-only) — formal autonom, aber als ADR dokumentiert wegen Privacy-Architektur-Bezug.
**Vorgänger:** [ADR-038](./decisions.md) (Detail-View Maskierung), [ADR-040](./decisions.md) (Edit-UI mit `reveal_participants`-Checkbox).

### Kontext

Issue [#23](https://github.com/Paddel87/HC-Map/issues/23) Befund 1 (Operator-Feldtest, RC-3-Phase Nodica1) wurde im Folgebericht [#27](https://github.com/Paddel87/HC-Map/issues/27) **korrigiert**: ursprünglich vermutet als „Privacy by Default zu streng — Operator sieht eigene Beteiligte nicht", in [#27](https://github.com/Paddel87/HC-Map/issues/27) entdeckte Patrick selbst, dass im Edit-UI ein `reveal_participants`-Toggle existiert. Die strikte Default-Logik („Klardaten sichtbar nur via expliziter, audit-fähiger Aktion") ist DSGVO-konform und bleibt korrekt.

**Eigentlicher UX-Defekt (nach Korrektur):** der Toggle ist im Edit-UI versteckt — selbst der Event-Ersteller findet ihn nur durch Zufall. Operator-Folgerung: „der Sichtbarkeits-Toggle ist im Bearbeiten-Modus versteckt und nicht auffindbar".

### Entscheidungen

**A. Toggle prominent im Beteiligte-Tab platzieren (Variante A aus dem Triage-Block).**

Drei Alternativen wurden Patrick vorgelegt:
- **A — Toggle im Beteiligte-Tab** (dort wo `[verborgen]` steht), mit Erklärungstext „Aktiviert die Anzeige der Klardaten für dich. Diese Aktion wird protokolliert."
- **B — Eigener „Sichtbarkeit / Berechtigungen"-Block** im Event-Detail. Verworfen: überstrukturiert solange es nur ein Flag ist; mehr UI-Fläche, kein klarer Mehrwert.
- **C — Status quo + Tooltip am `[verborgen]`-Marker.** Verworfen: löst nicht das Problem (Toggle bleibt im Edit-UI versteckt), nur die Frustration.

**Patrick wählt A.** Begründung: Toggle gehört semantisch dort hin, wo der versteckte Inhalt sichtbar wird.

**B. Sichtbarkeit nur für Editoren.**

Der Toggle erscheint nur, wenn `canEditEvent(user, { created_by: event.created_by })` → true (Admin oder Event-Ersteller). Andere User sehen wie bisher die Beteiligten-Liste mit Maskierung, ohne Toggle. Das verhindert versehentliche Sichtbarkeits-Änderungen durch nicht-berechtigte Beteiligte.

**C. Implementation: bestehender RxDB-Patch-Pfad.**

Der Toggle ruft denselben `database.events.findOne(id).patch({ reveal_participants: ..., updated_at: ... })`-Pfad, der vom Edit-UI bereits genutzt wird. Sync nach Backend läuft über RxDB-Replication (LWW per ADR-029). Der bestehende Edit-UI-Toggle bleibt unverändert — der neue Detail-View-Toggle ist eine zusätzliche Eintrittstür, kein Ersatz.

**D. UI-Form.**

Im Beteiligte-Card-Header (vor der Liste): kompakter Switch/Checkbox mit Label „Klarnamen sichtbar" plus Hint-Text „Audit-pflichtige Aktion — wird protokolliert" (kursiv, klein). Live-Update der Maskierungs-Logik über die existierende RxDB-Subscription (ADR-038 §C).

**E. Out-of-Scope (nicht Teil dieses ADR).**

- **Audit-Log für Toggle-Klick:** kein Audit-Log-System im Repo. Die Erklärungstext-Aussage „wird protokolliert" verweist auf den `updated_at`-Cursor, der die Änderung in RxDB-Sync-Logs sichtbar macht (M11-HOTFIX-003 Logger). Echtes Audit-Log = M14/M16-Folge-ADR.
- **Pro-Person-Sichtbarkeit:** weiterhin alles-oder-nichts (Event-Flag), keine Einzel-Person-Berechtigung.
- **Server-Side-RBAC für reveal_participants:** Backend-Validierung wird in ADR-040 §C bereits durchgesetzt (Patch-Route gibt 403 für Nicht-Editoren); Frontend-Toggle macht das sichtbar, aber Backend bleibt die Source of Truth.

### Verworfene Alternativen

- **Variante B (Eigener Sichtbarkeits-Block).** Überstrukturiert für ein einzelnes Flag; mehr UI-Fläche, kein klarer Mehrwert.
- **Variante C (Tooltip ohne Toggle).** Löst nicht das eigentliche Problem (Toggle bleibt schwer erreichbar).
- **Toggle für alle User sichtbar.** Verworfen: nicht-berechtigte Beteiligte könnten versehentlich klicken; auch wenn Backend 403 gibt, ist das verwirrend.

### Folgearbeit

- **M11-HOTFIX-011** (Fahrplan-Eintrag): Implementierung dieser ADR.
- **#23 Befund 1 schließen** nach Operator-Verifikation auf Production (Toggle erscheint im Beteiligte-Tab, Klick schaltet Klarnamen frei, andere Beteiligte sehen den Toggle nicht).

### Referenzen

- [Issue #23 — Operator-Befundbericht I Befund 1](https://github.com/Paddel87/HC-Map/issues/23) und [Issue #27 — Korrektur zu Befund 1](https://github.com/Paddel87/HC-Map/issues/27)
- [ADR-038 — Maskierung im Detail-View](./decisions.md)
- [ADR-040 — Edit-UI mit `reveal_participants`-Checkbox](./decisions.md)
- Code-Stellen: [`frontend/src/components/event/event-detail-view.tsx`](../frontend/src/components/event/event-detail-view.tsx), [`frontend/src/lib/rbac.ts`](../frontend/src/lib/rbac.ts) (canEditEvent)

---

**Hinweis zur Initialisierungs-Entscheidung:** Die initiale Anpassung der Vorlagen-Dokumente an HC-Map-Komplexität ist in **ADR-009 (Vorgehensmodell: Vision-driven Scoping vor Code)** dokumentiert. Diese ADR übernimmt die Funktion, die in der generischen Vorlage für ADR-001 vorgesehen war.
