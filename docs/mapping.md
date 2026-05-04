# UI-Vokabular-Mapping

Arbeitsgrundlage für die Anpassung der UI-Strings. Code-Identifier (TypeScript-Typen, Funktionsnamen, API-Routes, DB-Spalten) bleiben unverändert; nur sichtbare deutsche Beschriftungen werden umgestellt.

## 1. Begriffs-Mapping (Wortstamm-Tabelle)

| Code-Identifier (englisch) | Sichtbarer deutscher Tarn-Begriff |
|---|---|
| `Event` (im UI-Text) | **Tour** |
| `Events` (im UI-Text) | **Touren** |
| `Application` | **Stopp** |
| `Applications` | **Stopps** |
| `Performer` | **Erfasser** |
| `Recipient` | **Begleitung** |
| `Participant` / `Beteiligte` | **Mit dabei** |
| `Restraint` / `RestraintType` | **Ausrüstung** / **Equipment** |
| `Live-Event` | **Live-Tour** |
| `Live-Modus` / `Live-Erfassung` | **Live-Erfassung** (Begriff bleibt, ist neutral) |
| `On this day` | **An diesem Tag** (unverändert) |
| `Anonymisierung` (Person) | **Eintrag entfernen** (weicher) |
| `Mergen` (Person) | **Zusammenführen** |
| Mechanik `chain` / `hinged` / `rigid` | Bauart `flexibel` / `klappbar` / `starr` |
| `reveal_participants` | „Begleitung sichtbar machen" |

## 2. Spezifische Phrasen (Hilfetexte und Beschreibungen)

| Original | Tarn |
|---|---|
| „Live-Erfassung mit GPS, Karten-Korrektur und optionalem Recipient" | „Live-Erfassung mit GPS, Karten-Korrektur und optionaler Begleitung" |
| „In diesem Event wurden keine Applications erfasst." | „In dieser Tour wurden keine Stopps erfasst." |
| „Tippe auf „Neue Application", um die erste zu starten." | „Tippe auf „Neuer Stopp", um den ersten zu starten." |
| „Andere Beteiligte werden verborgen." | „Andere Begleitung wird verborgen." |
| „Noch keine Application erfasst." | „Noch kein Stopp erfasst." |
| „Noch keine Beteiligten erfasst." | „Noch keine Begleitung erfasst." |
| „Application starten" | „Stopp starten" |
| „Neue Application starten" | „Neuen Stopp starten" |
| „Application entfernen" | „Stopp entfernen" |
| „Application löschen" | „Stopp löschen" |
| „Application beenden" | „Stopp beenden" |
| „Top Restraints" | „Top Ausrüstung" |
| „Top Arm-Positionen" / „Top Hand-Positionen" | (im Cover-UI ausgeblendet, siehe §4) |
| „Restraint suchen" | „Ausrüstung suchen" |
| „Restraint-Auswahl" | „Ausrüstungs-Auswahl" |
| „Recipient" | „Begleitung" |
| „Restraints (optional)" | „Ausrüstung (optional)" |
| „Live-Event" / „Event läuft" | „Live-Tour" / „Tour läuft" |
| „Event beendet" | „Tour beendet" |
| „Event speichern" / „Event bearbeiten" / „Neues Event" | „Tour speichern" / „Tour bearbeiten" / „Neue Tour" |
| „Events gesamt" / „Events pro Monat" | „Touren gesamt" / „Touren pro Monat" |
| „Externe Referenz" | (unverändert; passt zu Tour-Kontext) |

## 3. Equipment-Katalog (RestraintType-Tabelle, Tarn-Inhalte)

Anstelle der Bondage-Equipment-Liste werden in der Cover-DB folgende Outdoor-Equipment-Einträge geseedet. Schema bleibt identisch (`category`, `brand`, `model`, `mechanism`).

| Kategorie | Marke | Modell | Bauart |
|---|---|---|---|
| Wanderstöcke | Leki | Makalu Lite | klappbar |
| Wanderstöcke | Black Diamond | Distance Z | klappbar |
| Stirnlampe | Petzl | Tikka | starr |
| Stirnlampe | Black Diamond | Spot 400 | starr |
| Kompass | Suunto | M-3 Global | starr |
| Karte | DAV-Karte | BY 09 Allgäu | flexibel |
| Karte | Kompass-Karte | Pfälzer Wald | flexibel |
| Trinkflasche | Nalgene | Wide Mouth 1l | starr |
| Trinkflasche | Salomon | Soft Flask 500 | flexibel |
| Rucksack | Deuter | Speed Lite 21 | flexibel |
| Rucksack | Osprey | Talon 22 | flexibel |
| Erste-Hilfe-Set | Tatonka | First Aid Mini | flexibel |
| Multitool | Leatherman | Wave+ | klappbar |
| Taschenmesser | Victorinox | Climber | klappbar |
| Kamera | Sony | RX100 VII | starr |
| Stativ | Manfrotto | PIXI Mini | klappbar |
| Powerbank | Anker | PowerCore 10000 | starr |
| Notfallpfeife | Fox 40 | Classic | starr |
| Sitzkissen | Therm-a-Rest | Z Seat | klappbar |
| Picknickdecke | Fjällräven | Re-Wool Blanket | flexibel |

**Bauart-Zuordnung (Logik):** `flexibel` = formvariabel, `klappbar` = mit Gelenk, `starr` = formstabil.

## 4. ArmPosition / HandPosition / HandOrientation — Cover-UI-Ausblendung

Diese drei Felder werden im Cover-UI **nicht angezeigt**. Daten-Modell und DB-Constraints bleiben unverändert; im Frontend werden die Form-Felder per Conditional-Rendering versteckt, in den Anzeige-Komponenten weggelassen.

### Betroffene Frontend-Komponenten (Stand: ~5 Vorkommen pro Begriff)

Identifikation per:
```
grep -rE "ArmPosition|HandPosition|HandOrientation|arm-?position|hand-?position|hand-?orientation" frontend/src --include="*.tsx" --include="*.ts"
```

Erwartete Treffer (zu prüfen beim eigentlichen Tausch):
- Application-Form (Live-Modus, Backfill, Edit) — Felder ausblenden
- Position-Picker-Komponenten — Komponenten nicht rendern
- Application-Detail-Anzeige — Felder weglassen
- Statistik-Top-Listen („Top Arm-Positionen", „Top Hand-Positionen") — Karten weglassen
- Catalog-Admin-Routes — bleiben sichtbar nur für Admin (nicht Test-Scope)

### Backend bleibt unverändert
DB-Tabellen `arm_position`, `hand_position`, `hand_orientation` werden mit Platzhalter-Werten geseedet (mind. ein Eintrag pro Tabelle, weil DB-Constraints es erfordern). Diese Werte werden im UI nie angezeigt.

## 5. Backend-User-sichtbare Strings

Geringer Umfang — Backend antwortet meist mit Status-Codes; user-sichtbare Strings sind:

- Pydantic-Validation-Messages (Pflichtfelder, Längenlimits, Format-Fehler)
- HTTPException-`detail`-Felder
- Toast-Errors aus API-Responses

Identifikation per:
```
grep -rE "(Application|Event|Performer|Recipient|Restraint|Participant)" backend/app --include="*.py" | grep -iE "detail|error|message|description"
```

## 6. Tausch-Strategie

1. **Komponentenweise Edits** statt globalem Search-and-Replace, weil Englisch-Identifier (z. B. `event` als Variablenname) nicht angefasst werden dürfen.
2. **Reihenfolge:** Frontend-UI-Strings → Frontend-Position-Felder ausblenden → Backend-User-Strings → Tests reparieren.
3. **Tests:** Frontend-Test-Suite (`pnpm test`) wird beim Tausch nachjustiert; einzelne Snapshot- oder Text-Erwartungen passen sich an die neuen Begriffe an. Backend-Tests bleiben weitgehend unberührt (testen Code-Identifier, nicht User-Text).
4. **Verifikation am Ende:** Walkthrough durch Live-Modus, Karte, Suche, Backfill, Profil — kein Restraint/Performer/Recipient/Application im sichtbaren Text. Stichprobe per:
   ```
   grep -rE "Application|Performer|Recipient|Restraint" frontend/src --include="*.tsx" | grep -vE "//|^\s*\*|import |from |interface |type |const [A-Z]" | head
   ```

## 7. Demo-Daten-Konzept

- **5 Personen:** Erfasser (Tester) + 4 fiktive Begleiter mit Outdoor-typischen Vornamen.
- **15 Touren** über die letzten 3 Monate gestreut, gemischt:
  - 5 Wanderungen (Frankenjura, Pfälzer Wald)
  - 3 Foto-Spaziergänge (Stadtgebiet)
  - 2 Naturbeobachtungen (Wald)
  - 2 Stadtspaziergänge mit Sehenswürdigkeiten
  - 3 Picknick-Spots
- **~30 Stopps** verteilt auf die Touren (1–4 pro Tour).
- **GPS-Punkte** ausschließlich aus öffentlichen OSM-POIs (keine Echtdaten-Übernahme aus anderen Quellen).
