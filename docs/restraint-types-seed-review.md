# RestraintType — Seed-Sichtungsliste

> **Zweck:** Inhaltliche Sichtung durch den Admin (Domain-Experte) vor Übernahme
> in `backend/seeds/restraint_types.py`. Liste basiert auf Web-Recherche
> (Hersteller-Webseiten, Fachshops Nordhandel, Handcuff Warehouse, Cuffsland,
> The Handcuff Shop, Wikipedia, ASP, Peerless, Clejuso).
>
> **Vorgehen:**
> - **Behalten:** Zeile unverändert lassen.
> - **Streichen:** Zeile durchstreichen `~~Zeile~~` oder löschen.
> - **Ergänzen:** Neue Zeile im gleichen Format hinzufügen.
> - **Korrigieren:** Insiderwissen, regionale Verfügbarkeit, falsche Modellbezeichnung — direkt überschreiben.
>
> **Nach Sichtung** wird daraus die finale Seed-Datei erzeugt. `display_name`
> wird aus den Feldern automatisch generiert nach Schema:
> `{Brand} {Model} ({mechanical_type})` bei Schellen, sonst freier Name.
>
> Alle Einträge erhalten beim Seed `status = 'approved'`.

---

## Schema-Erinnerung

```
category         enum   handcuffs | thumbcuffs | legcuffs | cuffs_leather
                        | rope | tape | cable_tie | cloth | strap | other
brand            text   z. B. "Clejuso", NULL bei Materialien ohne Marke
model            text   z. B. "Model 15 Heavy", NULL bei Materialien
mechanical_type  enum   chain | hinged | rigid (NULL bei Nicht-Schellen)
display_name     text   wird generiert
note             text   freier Hinweis (z. B. Gewicht, Besonderheit)
```

---

## Handschellen (`category = handcuffs`)

### ASP

| Brand | Model              | mechanical_type | Notiz                             |
|-------|--------------------|-----------------|-----------------------------------|
| ASP   | Chain Cuffs        | chain           |                                   |
| ASP   | Sentry Hinge       | hinged          | Edelstahl, günstiges Modell       |
| ASP   | Ultra Cuffs        | hinged          | klassisches Hinged-Modell         |
| ASP   | Ultra Plus Cuffs   | hinged          | erweiterte Variante               |
| ASP   | Rigid Ultra Cuffs  | rigid           | Aluminium-Bow                     |
| ASP   | Rigid Plus (Alu)   | rigid           | replaceable lock set              |
| ASP   | Rigid Plus (Steel) | rigid           | replaceable lock set              |
| ASP   | Tri-Fold           | other (Einweg)  | ggf. eigene Kategorie nötig       |

### Smith & Wesson

| Brand          | Model                   | mechanical_type | Notiz                       |
|----------------|-------------------------|-----------------|-----------------------------|
| Smith & Wesson | Model 100               | chain           | Standard, sehr verbreitet   |
| Smith & Wesson | Model 100M (Melonite)   | chain           | Melonite-Beschichtung       |
| Smith & Wesson | Model 103               | chain           | Hochsicherheit              |
| Smith & Wesson | Model 104               | chain           | Maximum Security            |
| Smith & Wesson | Model 110               | hinged          |                             |
| Smith & Wesson | Model 1                 | hinged          | Universal Nickel            |
| Smith & Wesson | Model 300               | hinged          | korrekturanstaltentauglich  |
| Smith & Wesson | Model 350               | hinged          | Maximum Security Hinged     |
| Smith & Wesson | M&P Lever Lock          | chain           | Hebel-Doppel-Lock           |

### Peerless

| Brand    | Model                       | mechanical_type | Notiz                            |
|----------|-----------------------------|-----------------|----------------------------------|
| Peerless | Model 700                   | chain           | Standard Chain                   |
| Peerless | Model 700C (Color)          | chain           | farbige Variante                 |
| Peerless | Model 708 / 4708 Superlite  | chain           | leichte Aluminium-Variante       |
| Peerless | Model 730                   | hinged          | Superlite Hinged                 |
| Peerless | Model 750                   | rigid           | rigid handcuff                   |
| Peerless | Model 801                   | hinged          | NIJ-zertifiziert, Standard       |
| Peerless | Model 850                   | hinged          | High Security                    |

### Clejuso (Clemen & Jung, Solingen)

| Brand   | Model        | mechanical_type | Notiz                                              |
|---------|--------------|-----------------|----------------------------------------------------|
| Clejuso | No. 8        | chain           | Beinschelle, hier irrelevant — siehe Legcuffs      |
| Clejuso | No. 9        | chain           |                                                    |
| Clejuso | No. 11       | chain           | Polizei-Standard DE                                |
| Clejuso | No. 11A      | chain           | Variante                                           |
| Clejuso | No. 12       | chain           | Edelstahl                                          |
| Clejuso | No. 12A      | chain           | farbig erhältlich                                  |
| Clejuso | No. 12A/7    | chain           | mit Edelstahl-Kette                                |
| Clejuso | No. 13       | chain           | "Medium Heavy", ca. 1 kg, 16 Verschlusspositionen  |
| Clejuso | No. 14       | chain           |                                                    |
| Clejuso | No. 15 Heavy | chain           | "Heavy", ca. 1,4 kg, schwerste Schwingschelle      |
| Clejuso | No. 17       | chain           | No. 15 mit Anker-Kombination                       |
| Clejuso | No. 19R      | hinged          | gelenkverbundene Variante                          |
| Clejuso | No. 101      | chain           | High-Security mit Pin-Tumbler                      |
| Clejuso | No. 102      | chain           | High-Security                                      |
| Clejuso | No. 119/SH   | rigid           | Rigid-Variante                                     |
| Clejuso | No. 138M     | chain           | Kombi mit Bauchkette                               |

### TCH (Total Control Handcuffs, UK — Hiatt-Nachfolger)

| Brand | Model      | mechanical_type | Notiz                                   |
|-------|------------|-----------------|-----------------------------------------|
| TCH   | 840        | rigid           | Standard UK-Polizei, Nachfolger Hiatt Speedcuff |
| TCH   | 840B       | rigid           | schwarze Variante                       |
| TCH   | 850        | rigid (Folding) | klappbar (UL1-Nachfolger)               |
| TCH   | Chain      | chain           | klassische Kettenvariante               |
| TCH   | Hinged     | hinged          |                                         |

### Hiatts (historisch, Vorgänger TCH)

| Brand  | Model               | mechanical_type | Notiz                                            |
|--------|---------------------|-----------------|--------------------------------------------------|
| Hiatts | Speedcuff (2010)    | rigid           | nicht mehr produziert, häufig im Sammlermarkt    |
| Hiatts | Chain               | chain           | historisch                                       |
| Hiatts | Darby               | rigid           | sehr alter Typ, Sammlerstück                     |

### Weitere Marken (oft zitiert in Fachshops)

| Brand                    | Model               | mechanical_type | Notiz                          |
|--------------------------|---------------------|-----------------|--------------------------------|
| Chicago Handcuff Company | Standard Chain      | chain           |                                |
| Chicago Handcuff Company | Hinged              | hinged          |                                |
| CTS Thompson             | Chain               | chain           | US-Hersteller                  |
| CTS Thompson             | Hinged              | hinged          |                                |
| Bonowi                   | Chain               | chain           | DE-Hersteller                  |
| 1912 Cuffs               | Chain               | chain           | High-Security                  |
| Winchester               | Chain               | chain           |                                |

---

## Daumenschellen (`category = thumbcuffs`)

| Brand        | Model           | mechanical_type | Notiz                          |
|--------------|-----------------|-----------------|--------------------------------|
| Clejuso      | No. 7 Thumb     | chain           |                                |
| Peerless     | Model 1900      | chain           |                                |
| Smith & Wesson | Thumbcuffs    | chain           |                                |
| (Generisch)  | Thumbcuffs Hinged | hinged        |                                |
| (Generisch)  | Thumbcuffs Rigid  | rigid         |                                |

> Hinweis: Daumenschellen sind selten als Marken-Modelle gelistet — viele werden
> als "Thumbcuffs" generisch verkauft.

---

## Fußschellen / Beinschellen (`category = legcuffs`)

| Brand    | Model                   | mechanical_type | Notiz                            |
|----------|-------------------------|-----------------|----------------------------------|
| Peerless | Model 703               | chain           | Standard Leg Iron                |
| Peerless | Model 703C (Color)      | chain           |                                  |
| Peerless | Model 705               | chain           | Oversize                         |
| Smith & Wesson | Model 1900        | chain           |                                  |
| Smith & Wesson | Model 1840        | chain           | Maximum Security                 |
| ASP      | Ankle Cuffs             | hinged          |                                  |
| ASP      | Ankle Ultra Plus        | hinged          | Aluminium-Frame                  |
| Clejuso  | No. 8                   | chain           | Heavy, ca. 1 kg                  |
| Clejuso  | No. 103                 | chain           | High Security mit Pin-Tumbler    |
| Clejuso  | No. 109                 | chain           |                                  |
| TCH      | Leg Cuffs               | chain           |                                  |
| Hiatts   | Leg Irons (historisch)  | chain           |                                  |
| CTS Thompson | Leg Irons           | chain           |                                  |
| Chicago Handcuff Co. | Leg Irons   | chain           |                                  |

---

## Lederschellen / -manschetten (`category = cuffs_leather`)

> Hinweis: Hier dominieren Bondage-Manufakturen, weniger "klassische" Marken.

| Brand       | Model              | mechanical_type | Notiz                             |
|-------------|--------------------|-----------------|-----------------------------------|
| Mr. S Leather | Wrist Cuffs      | NULL            | gepolstert                        |
| Strict Leather | Wrist Restraints | NULL          |                                   |
| (Generisch) | Lederfesseln Handgelenk | NULL       | freie Eingabe, viele Hersteller   |
| (Generisch) | Lederfesseln Knöchel    | NULL       |                                   |
| (Generisch) | Lederpranger / Halsfessel | NULL     |                                   |

> Empfehlung: Für Leder eher generische Einträge anlegen, Marke optional als
> Freitext, weil der Markt sehr fragmentiert ist.

---

## Seile (`category = rope`)

| Brand       | Model               | mechanical_type | Notiz                              |
|-------------|---------------------|-----------------|------------------------------------|
| (Generisch) | Hanfseil 6 mm       | NULL            | klassisch Shibari                  |
| (Generisch) | Hanfseil 8 mm       | NULL            |                                    |
| (Generisch) | Jute 6 mm           | NULL            |                                    |
| (Generisch) | Jute 8 mm           | NULL            |                                    |
| (Generisch) | Baumwollseil        | NULL            | weicher                            |
| (Generisch) | Nylonseil / POSH    | NULL            | synthetisch                        |
| (Generisch) | MFP / Polypropylen  | NULL            | wasserfest                         |

> Seil-Material und -Stärke sind oft wichtiger als der Hersteller. Vorschlag:
> `brand = NULL`, `model` = Material + Stärke.

---

## Tape & Klebeband (`category = tape` / `category = cable_tie`)

| Category   | Brand       | Model                   | Notiz                           |
|------------|-------------|-------------------------|---------------------------------|
| tape       | (Generisch) | Bondage-Tape (PVC)      | klebt nur an sich selbst        |
| tape       | (Generisch) | Vetrap / Selbsthaftbinde| medizinisch                     |
| tape       | Gaffer      | Gaffer-Tape             | sehr klebrig, schwer entfernbar |
| tape       | (Generisch) | Panzertape / Duct Tape  | aggressiv                       |
| tape       | (Generisch) | Malerkrepp              | leicht entfernbar               |
| cable_tie  | (Generisch) | Kabelbinder Standard    |                                 |
| cable_tie  | (Generisch) | Kabelbinder Doppelschlinge | Polizei-Variante "FlexCuff" |
| cable_tie  | ASP         | Tri-Fold Restraint      | Einweg-Doppelschlinge           |
| cable_tie  | Safariland  | Flex-Cuf                | Einweg-Doppelschlinge           |

---

## Tuch / Stoff (`category = cloth`)

| Brand       | Model              | Notiz                           |
|-------------|--------------------|---------------------------------|
| (Generisch) | Schal              |                                 |
| (Generisch) | Krawatte           |                                 |
| (Generisch) | Stoffstreifen      | freie Eingabe                   |
| (Generisch) | Bandana / Tuch     |                                 |

---

## Riemen / Gurt (`category = strap`)

| Brand       | Model              | Notiz                                |
|-------------|--------------------|--------------------------------------|
| (Generisch) | Lederriemen        |                                      |
| (Generisch) | Nylongurt          | Spanngurt-artig                      |
| (Generisch) | Klettband (Velcro) |                                      |
| (Generisch) | Bondage-Strap      | Marken: Mr. S, Strict Leather, etc.  |

---

## Sonstige (`category = other`)

| Brand       | Model                   | Notiz                                 |
|-------------|-------------------------|---------------------------------------|
| (Generisch) | Spreizstange (Spreader Bar) | mit oder ohne Manschetten         |
| (Generisch) | Bauchkette / Belly Chain    | Verbindungselement                |
| (Generisch) | Hogtie-Verbinder            | Karabiner / Riemen                |
| (Generisch) | Verbindungskette zwischen Hand- und Fußschellen | Transportkette |
| (Generisch) | Suspension-Cuffs            | für Aufhängung geeignet           |
| (Generisch) | Posey / medizinische Restraints | Klinik-Bereich, eigenes Feld   |

---

## Offene Fragen für die Sichtung

1. **Tri-Fold / FlexCuff:** als `cable_tie` oder eigene Kategorie `disposable`?
2. **Lederschellen:** Marken einzeln pflegen oder „Leder generisch"?
3. **Seile:** Material+Stärke als `model`, oder eigene Felder ergänzen?
4. **Spreader Bar / Belly Chain:** als `other`, oder eigene Kategorie `connector`?
5. **Welche Modelle aus deinem realen Bestand fehlen?** Insiderwissen schlägt jede Recherche.
6. **Welche Modelle in der Liste werden NIE benutzt** und sollten nicht in den Default-Seed?
