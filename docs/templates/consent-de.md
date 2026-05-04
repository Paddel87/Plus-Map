<!--
Vorlage für die Einwilligungserklärung der Mitglieder einer HC-Map-Instanz.

Diese Vorlage ist KEINE Rechtsberatung. HC-Map liefert sie als Hilfestellung
für Operator, weil project-context.md §6 vor Go-Live eine schriftliche
Einwilligung verlangt, die das Vertrauensmodell, den Anonymisierungs-
Kompromiss, die On-the-fly-Erfassung und die Aggregat-Statistik explizit
benennt. Welche der unten gelisteten Punkte für deine konkrete Instanz
zutreffen, muss du als Betreiber prüfen — Vorlage anpassen, gegebenenfalls
juristisch prüfen lassen.

Konventionen für Platzhalter:
- `[GRUPPENNAME]` — Bezeichnung der nutzenden Gruppe.
- `[ADMIN-NAME]` und `[ADMIN-KONTAKT]` — verantwortliche Person für
  diese Instanz und ihre Erreichbarkeit (Email, Signal, …).
- `[INSTANZ-URL]` — die produktive Adresse, z. B. `https://hc-map.example.org`.
- `[HOSTING-PROVIDER]` — der Anbieter, auf dessen Infrastruktur die
  Instanz läuft (z. B. „Hetzner Cloud, Standort Falkenstein/DE").
- `[HOSTING-STANDORT]` — Land/Region des Servers.
- `[BACKUP-ZIEL]` — Off-Site-Backup-Anbieter und Standort
  (z. B. „Hetzner Storage Box, Standort Falkenstein/DE").
- `[DATUM]` — Datum, an dem die Einwilligung eingeholt wird.

Lösche diesen Kommentar-Block, bevor du das Dokument an deine Mitglieder
weitergibst.
-->

# Einwilligungserklärung — HC-Map-Instanz „[GRUPPENNAME]"

**Stand:** [DATUM]
**Verantwortliche Person dieser Instanz:** [ADMIN-NAME] · [ADMIN-KONTAKT]
**Instanz-URL:** [INSTANZ-URL]

---

## 1. Worum es geht

HC-Map ist ein selbst gehostetes Logbuch für Fesselungs-Ereignisse einer
festen, eingeschworenen Gruppe. Erfasst werden Ereignisse mit Zeit, Ort
(Koordinaten und/oder Plus-Code) und beteiligten Personen sowie eine
zeitliche Sequenz einzelner Anwendungen (Bindings) inklusive verwendeter
Restraints und Positionen.

Diese Einwilligung gilt nur für die Instanz „[GRUPPENNAME]". Eine andere
HC-Map-Instanz wird durch eine andere Person betrieben und braucht eine
eigene Einwilligung.

## 2. Daten, die über dich erfasst werden können

- **Stammdaten:** Name oder Alias, optionale Notiz, Verknüpfung zu deinem
  Login-Konto (sofern du eines hast).
- **Ereignisdaten:** Datum, Zeit, Geokoordinaten oder Plus-Code,
  optionale freie Notiz, Sichtbarkeitskennzeichen.
- **Anwendungsdaten:** Reihenfolge, Start-/Endzeit, Performer und
  Recipient (jeweils Personen-Verweise), verwendete Restraints (aus dem
  Katalog) sowie Positionen.
- **Beteiligungsdaten:** Aus den Anwendungen wird abgeleitet, an welchen
  Ereignissen du beteiligt warst. Diese Liste ist standardmäßig nur für
  dich und den Admin sichtbar; andere Beteiligte siehst du nur, wenn das
  Event explizit als „Teilnehmer sichtbar" markiert wurde.
- **Login-Daten:** Falls du ein Konto hast — E-Mail-Adresse, Passwort-
  Hash (Argon2id), Rolle, Anlagedatum.

## 3. Wer Zugriff hat — Vertrauensmodell

- **Du selbst** über dein Login.
- **Der Admin dieser Instanz** ([ADMIN-NAME]) über die Admin-Oberfläche.
  Der Admin kann sämtliche Daten lesen, ändern und löschen.
- **Der Hosting-Provider** ([HOSTING-PROVIDER], Standort
  [HOSTING-STANDORT]) hat technischen Zugriff auf den Server. HC-Map
  speichert die Daten nicht zusätzlich App-seitig verschlüsselt — wer
  Server-Zugriff hat, kann die Datenbank lesen. Wir vertrauen dem
  Provider und dem Admin. Wenn du diesem Vertrauensmodell **nicht**
  zustimmst, melde dich nicht an.
- **Backup-Anbieter** [BACKUP-ZIEL]: tägliche, mit `age` verschlüsselte
  Datenbank-Sicherungen werden dort abgelegt. Der Backup-Anbieter sieht
  nur den verschlüsselten Blob; den Schlüssel hält ausschließlich der
  Admin.

## 4. „Anonymisierung" hat in einer kleinen Gruppe Grenzen

Wenn du HC-Map verlässt, wird dein Personen-Eintrag auf Anfrage
anonymisiert: Name und Alias werden durch einen Platzhalter ersetzt,
freie Notiz wird gelöscht. Die Verknüpfungen (an welchen Ereignissen du
beteiligt warst, wer dich gefesselt hat oder umgekehrt) bleiben jedoch
**erhalten**, weil sie für die Geschichte der anderen Mitglieder
relevant sind.

In einer Gruppe von unter 20 einander persönlich bekannten Personen ist
nach einer solchen Anonymisierung über Kontextwissen (Datum, Ort,
Mitbeteiligte) eine Re-Identifikation in der Praxis weiterhin möglich.
HC-Map kann das technisch nicht verhindern. Wenn du diese Konsequenz
nicht akzeptierst, melde dich nicht an.

## 5. Personen ohne Konto („on-the-fly-Erfassung")

Mitglieder können während der Live-Erfassung andere Personen spontan als
Beteiligte anlegen, **ohne dass diese Person vorher eingewilligt hat**.
HC-Map markiert solche Einträge als `origin = "on_the_fly"`.

Wenn du selbst nicht möchtest, dass dich jemand auf diese Weise erfasst,
musst du das mit den anderen Mitgliedern direkt klären — HC-Map kann
das nicht für dich tun. Du hast jederzeit Anspruch auf Anonymisierung
deines Eintrags (siehe Abschnitt 7), auch wenn du kein Konto hast.

## 6. Aggregat-Statistiken sind nur scheinbar anonym

HC-Map kann anzeigen, wie oft welche Restraints, Positionen oder Orte
verwendet wurden. In einer kleinen Gruppe lassen sich aus solchen
Aggregaten oft Rückschlüsse auf einzelne Personen ziehen — schon ein
einzelnes seltenes Restraint kann eine Person erkennbar machen.
Veröffentliche diese Aggregate niemals außerhalb des Kreises der
Mitglieder.

## 7. Deine Rechte

- **Auskunft:** Du kannst jederzeit alle über dich gespeicherten Daten
  einsehen. Login-User sehen ihre Beteiligungen direkt in der App; bei
  Bedarf erstellt der Admin einen vollständigen Datenexport.
- **Berichtigung:** Falsche Einträge kannst du dem Admin oder einem
  Editor melden; bei eigenen Login-Konten korrigierst du Stammdaten
  direkt.
- **Anonymisierung / Widerruf:** Du kannst jederzeit die Anonymisierung
  deines Eintrags und gegebenenfalls die Deaktivierung deines Kontos
  verlangen. Die Anonymisierung wird unverzüglich durchgeführt; die
  Verknüpfungen bleiben aus den in Abschnitt 4 genannten Gründen
  erhalten.
- **Beschwerderecht:** Falls dein Aufenthaltsstaat Datenschutzbehörden
  vorsieht, hast du das Recht, dich dort über die Verarbeitung zu
  beschweren.

## 8. Speicherdauer

Daten werden gespeichert, solange diese HC-Map-Instanz betrieben wird.
Bei Anonymisierung deines Eintrags werden Name, Alias und Notiz sofort
ersetzt; Verknüpfungen bleiben. Bei Auflösung der Gruppe werden die
Daten vom Admin gelöscht.

## 9. Daten auf deinem Endgerät

HC-Map nutzt im Browser eine lokale Datenbank (IndexedDB) für die
Offline-Erfassung. Diese lokale Datenbank ist **nicht App-seitig
verschlüsselt**. Geräteverschlüsselung (FileVault, BitLocker, Android
File-Based Encryption, iOS Data Protection) liegt in deiner
Verantwortung. Die App-PIN von HC-Map schützt die UI nach Inaktivität,
ersetzt aber keine Geräteverschlüsselung.

## 10. Foto- und Medien-Anhänge

Aktuell werden **keine** Fotos oder Medien gespeichert. Sobald diese
Funktion in einer späteren Version (Phase 2) aktiviert wird, gilt eine
ergänzende Einwilligung mit erweitertem Vertrauensmodell — das
Speichern intimer Medien beim Hoster ist eine andere Risikoklasse als
Textdaten. Stimmst du der heutigen Einwilligung zu, **stimmst du der
späteren Foto-Funktion noch nicht** zu.

## 11. Was passiert, wenn du nicht zustimmst

Du kannst nicht teilnehmen, deine Daten werden nicht erfasst. Personen
ohne Einwilligung dürfen vom Admin nicht als Login-User angelegt
werden. Falls dich jemand on-the-fly erfasst hat, ohne dass du
eingewilligt hast, hast du das Recht auf Anonymisierung des Eintrags
(siehe Abschnitt 7).

## 12. Änderungen dieser Erklärung

Wesentliche Änderungen am Vertrauensmodell, am Backup-Setup, am
Hosting-Provider, an der Art der erfassten Daten oder die Aktivierung
der Foto-Funktion erfordern eine **neue Einwilligung**. Der Admin
informiert dich rechtzeitig; bei fehlender neuer Einwilligung werden
die jeweiligen Funktionen für dich deaktiviert.

---

## Bestätigung

Ich habe die obige Erklärung gelesen und verstanden. Ich willige darin
ein, dass meine Daten gemäß den genannten Bedingungen in der HC-Map-
Instanz „[GRUPPENNAME]" verarbeitet werden.

Mir ist insbesondere bewusst, dass

- der Hosting-Provider und der Admin technischen Vollzugriff auf die
  Daten haben (Abschnitt 3),
- in einer kleinen Gruppe eine vollständige Anonymisierung praktisch
  nicht möglich ist (Abschnitt 4),
- mich andere Mitglieder ohne meine vorherige Zustimmung als Beteiligte
  erfassen können (Abschnitt 5),
- Aggregat-Statistiken in einer kleinen Gruppe nicht als anonym gelten
  können (Abschnitt 6),
- die lokale Daten-Kopie in meinem Browser nicht App-seitig verschlüsselt
  ist (Abschnitt 9),
- Foto-/Medien-Funktionen aktuell nicht aktiviert sind und bei späterer
  Aktivierung eine separate Einwilligung erfordern (Abschnitt 10).

Ort, Datum: _______________________________________________________

Name in Druckbuchstaben: __________________________________________

Unterschrift: _____________________________________________________
