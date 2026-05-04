# HC-Map — Framework- und Library-Analyse

> **Zweck:** Übersicht, welche Aufgaben im Projekt von fertigen Frameworks/Libraries
> übernommen werden können und welche tatsächlich Eigenarbeit bleiben.
> Erstellt am Ende der Konzeptionsphase, vor Code-Start.
>
> **Methode:** Gezielte Web-Recherche zu vier Bereichen — Backend-Foundations,
> Frontend-Foundations, Spezialaufgaben, Komplettlösungen.
>
> **Wichtigstes Ergebnis vorab:** Es existiert **keine Komplettlösung**, die das
> HC-Map-Konzept abdeckt (Logbuch mit mehreren Beteiligten, strukturierten
> Sub-Vorgängen, Sequenz, Live-Erfassung, RLS). Die nächstgelegenen Selfhosted-
> Tools (Wanderer, Georap, Geomem) sind konzeptionell zu weit entfernt zum Forken.
> Was hingegen großzügig vorhanden ist, sind hochwertige **Bausteine**.

---

## Backend-Foundations

### Auth — fastapi-users
**Status:** Bereits in ADR-006 als Hauptentscheidung gewählt.
**Was es abnimmt:** Komplettes User-Modell, Login/Logout, Passwort-Reset, E-Mail-Verifikation, Session-Management, Cookie-Backend, OAuth-Integration (für später).
**Was Eigenarbeit bleibt:** Rollen-Modell (Admin/Editor/Viewer) als Erweiterung, RBAC-Dependencies in Routes, Bootstrap-Skript für ersten Admin, CSRF-Middleware.
**Einsparung gegenüber Eigenbau:** sehr hoch (mehrere Tage).

### Admin-UI — SQLAdmin
**Status:** Bisher nicht spezifiziert; Architektur sieht „Admin-UI komplett selbst bauen" vor (ADR-005, Verworfene Alternativen).
**Was es ist:** SQLAlchemy-basiertes Admin-Panel für FastAPI/Starlette, Tabler-UI, BSD-3-lizenziert, ~2.200 GitHub-Stars, aktiv gepflegt.
**Was es abnehmen würde:** CRUD-Oberfläche für alle Tabellen ohne Custom-Code, sortier- und durchsuchbare Listen, Filter, Form-Building per WTForms.
**Eignung für HC-Map:** Sehr gut für die **Stamm-Datenpflege** (RestraintType, ArmPosition, HandPosition, HandOrientation), für **User- und Personen-Verwaltung** und als „Notausstieg" zur Daten-Inspektion. **Nicht** geeignet für die User-orientierten Workflows (Live-Modus, Event-Erfassung, Karte) — die bleiben in Next.js.
**Empfehlung:** **Aufnehmen.** SQLAdmin als parallele Admin-Schicht unter `/admin` zusätzlich zur Next.js-App. Das erspart vermutlich 60–70 % der M8-Arbeit für reine Datenpflege-Oberflächen.
**Konsequenz:** ADR ergänzen (ADR-016), M8-Deliverables anpassen.

### Datenbank-Migrations — Alembic
**Status:** Bereits gewählt (ADR-005). Standard für SQLAlchemy.

### ORM und Validierung — SQLAlchemy 2.0 + Pydantic v2
**Status:** Bereits gewählt (ADR-005). Standard.

### Plus-Code-Berechnung — Google `openlocationcode`
**Status:** Bereits in Architektur erwähnt.
**Was es ist:** Offizielle Apache-2.0-Bibliothek von Google, pure Python, keine Abhängigkeiten.
**Einsparung:** Algorithmus-Implementierung wäre möglich, aber Eigenbau wäre Verschwendung.
**Empfehlung:** Direkt einsetzen. Alternative `pluscodes` (pythonischere API) ist optional.

---

## Frontend-Foundations

### Karten-Library — react-map-gl + MapLibre GL JS
**Status:** Bereits in ADR-008 gewählt.
**Was es abnimmt:** Komplettes Karten-Rendering, Touch-Gesten, Marker, Popups, Cluster (mit `supercluster`), Viewport-Steuerung, Vector- und Raster-Tile-Support.
**Einsparung:** Sehr hoch.

### Komponenten-Bibliothek — shadcn/ui auf Tailwind
**Status:** Bereits in ADR-007 gewählt.
**Was es abnimmt:** Buttons, Dialoge, Forms, Drop-downs, Tabellen, Tabs, Sheets — alles in einem konsistenten Stil, kopiert ins Projekt (kein NPM-Lock-in).
**Einsparung:** Sehr hoch.

### Server-State und Caching — TanStack Query
**Status:** Bereits in ADR-007 gewählt.
**Was es abnimmt:** Daten-Fetching, Caching, Invalidation, Optimistic Updates, Background-Refetch, Loading-/Error-States.
**Einsparung:** Hoch.

### Offline-Sync (M5b) — RxDB oder Dexie.js
**Status:** In ADR-011 als Anforderung benannt, aber noch nicht spezifiziert *wie*.
**Optionen:**

| Library | Eignung | Aufwand | Bemerkung |
|---|---|---|---|
| **RxDB** | Sehr hoch | Mittel-hoch | Reaktiv, mit Replication-Protocol für FastAPI-Backend; Conflict-Resolution-Strategien eingebaut; gut dokumentiert |
| **Dexie.js** | Hoch | Mittel | Schlanker IndexedDB-Wrapper, kein eingebautes Sync — Sync-Logik selbst schreiben |
| **PouchDB** | Mittel | Mittel | CouchDB-Replication-Protokoll, würde CouchDB als Backend bedeuten — passt nicht zum Postgres-Stack |
| **Eigenbau auf nativem IndexedDB** | Theoretisch | Hoch | Würde M5b von einem Meilenstein zu drei machen |

**Empfehlung:** **RxDB mit Dexie-Storage-Adapter.** RxDB übernimmt Replication-Protokoll und Conflict-Resolution; das spart vermutlich 50–60 % der M5b-Arbeit. Backend-Endpoints müssen RxDB-Replication-Schema entsprechen (sync-spezifische Felder wie `_deleted`, `updatedAt`-basierte Pull/Push-Endpoints) — das ist überschaubarer Aufwand.
**Konsequenz:** ADR ergänzen (ADR-017), M5b-Deliverables konkretisieren, kleine Backend-Anpassung an Replication-Schema vornehmen.

### PWA-Wrapping — Next.js + `next-pwa` oder Service Worker selbst
**Status:** In Architektur nicht explizit, aber implizit für „Mobile-First + Offline" relevant.
**Empfehlung:** PWA-Manifest (Home-Screen-Icon, Vollbild) ist trivial. Service Worker für Offline-Caching ergänzt sich gut mit RxDB-Sync (RxDB für Daten, Service Worker für statische App-Assets).
**Konsequenz:** Kleine Erweiterung in M5b oder eigener Mini-Meilenstein.

### App-PIN — Web Crypto API + IndexedDB
**Status:** In ADR-015 spezifiziert.
**Bibliothek nötig?** Nein, Web Crypto API ist nativ. PIN-Hash via PBKDF2 oder Argon2-WASM (z. B. `argon2-browser`).
**Einsparung:** Algorithmus-Eigenbau wäre Verschwendung; native API reicht.

---

## Spezialaufgaben

### Volltextsuche — PostgreSQL nativ
**Status:** In Architektur als GIN-Index spezifiziert.
**Bibliothek nötig?** Nein, Postgres `to_tsvector` reicht für die Datenmenge einer <20-Personen-Gruppe völlig.
**Wann lohnt Meilisearch/Typesense?** Erst bei deutlich größerem Datenbestand oder Bedarf an Tippfehler-Toleranz und Facettierung. In Pfad B möglicherweise Thema, in Pfad A Overkill.

### Charts (M17 Statistik-Dashboard) — Recharts
**Status:** In Architektur erwähnt.
**Was es abnimmt:** Bar-Charts, Line-Charts, Heatmaps, alles responsive, in shadcn-kompatiblem Stil.
**Einsparung:** Sehr hoch.

### Reverse-Geocoding (Adress-Suche) — MapTiler Geocoding API
**Status:** In ADR-008 gewählt.
**Alternative für Self-Hosting (Phase 2):** Nominatim auf eigenem VPS. Setup-Aufwand mittelhoch (OSM-Daten-Import), aber dann komplett unabhängig.

### w3w-Migration (M9) — verworfen
**Status:** Verworfen mit ADR-050 (2026-05-01). Bestand wird manuell über die
M5c-Erfassungs-UI nachgetragen; kein Skript-Projekt nötig. Spalte
`event.legacy_external_ref` (vormals `w3w_legacy`) bleibt für freiwillige
Selbstreferenz-Eingabe erhalten.

### Foto-Anhänge (M15)
**Status:** Phase 2.
**Backend-Bibliotheken:** Pillow (Standard) oder VIPS (schneller, RAM-effizienter) für Thumbnails. Beide in der Python-Welt etabliert.
**Frontend:** Keine spezielle Library nötig, native File-Upload-API plus shadcn-Dialog.

### E-Mail-Versand
**Status:** Im MVP gestubbt; später externer Dienst (ADR-005, offene Punkte).
**Bibliothek:** `fastapi-mail` als FastAPI-Wrapper, oder direkt SMTP-Library wie `aiosmtplib`. Externer Dienst (Brevo, Postmark, SES) hat eigene SDKs.

---

## Komplettlösungen — Recherche-Ergebnis

Es wurde gezielt nach „selfhosted private event logbook with map" gesucht. Die nächstgelegenen Treffer:

### Wanderer
- Selfhosted Trail-Logbuch mit Karte.
- AGPL-3, SvelteKit + PocketBase, ~1.800 Stars.
- **Konzept-Distanz zu HC-Map:** Eine Person, kein Mehrbenutzer-Modell, keine Sub-Vorgänge, keine Sequenz, andere Domäne (Wandern/Outdoor).
- **Forken sinnvoll?** Nein.

### Georap
- Geographisches Forum mit Karten.
- MIT, JavaScript, klein (2 Stars), seit 2022 inaktiv.
- **Konzept-Distanz:** Forum mit Geo-Bezug, kein Logbuch.
- **Forken sinnvoll?** Nein.

### Geomem
- Persönlicher Reise-Tracker.
- MIT, JavaScript, klein.
- **Konzept-Distanz:** Single-User, simple Punkte auf Karte ohne Strukturierung.
- **Forken sinnvoll?** Nein.

### µlogger
- Live-GPS-Tracking.
- GPL-3, PHP.
- **Konzept-Distanz:** Pure Track-Aufzeichnung, kein Logbuch-Konzept.
- **Forken sinnvoll?** Nein.

**Schlussfolgerung:** HC-Map ist konzeptionell tatsächlich neu in der Selfhosted-Welt. Eigenbau ist die richtige Strategie — aber mit massiver Stütze durch hochwertige Bausteine.

---

## Zusammenfassung — Was sich konkret an der Architektur ändern sollte

Vier konkrete Änderungsvorschläge, die in eigene ADRs und Anpassungen münden sollten:

1. **SQLAdmin als parallele Admin-Schicht** für Stammdaten- und User-Verwaltung — erspart Großteil von M8.
2. **RxDB als Offline-Sync-Library** — erspart Großteil der M5b-Komplexität.
3. **PWA-Wrapping** als kleine Ergänzung zu M5a oder M5b — geringer Aufwand, deutlicher UX-Vorteil (Home-Screen-Installation, Vollbild).
4. **Argon2-WASM** für App-PIN-Hashing — kleine, aber bewusste Library-Wahl in M5a.

Die anderen Stack-Komponenten sind bereits in den ADRs als Library-Wahlen festgehalten.

---

## Ehrliche Einordnung

**Der Anteil „echter Eigenarbeit"** in HC-Map liegt nach dieser Analyse bei vielleicht 30–40 % des spürbaren Aufwands. Der Rest ist:
- Konfiguration und Glue-Code zwischen Bausteinen.
- Spezifisch HC-Map: Datenmodell-Design, RLS-Policies, Live-Modus-UI, on-the-fly-Personenanlage, Auto-Participant-Logik, Vorlagen-Workflow (später).

**Das ist keine Schande, sondern modernes Engineering.** Ein Hobby-Projekt, das alles selbst implementiert, ist ein Hobby-Projekt, das nie fertig wird. Die Frage ist nicht „kann ich das selbst", sondern „sollte ich das selbst" — und für die meisten Bausteine ist die Antwort klar nein.

**Was bleibt deine Eigenleistung:** Die Vision, das Datenmodell, die Workflow-Entscheidungen, die UX im Live-Modus, die Sicherheits- und Datenschutz-Architektur. Das ist genug, und das ist viel.
