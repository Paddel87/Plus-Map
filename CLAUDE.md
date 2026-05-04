# CLAUDE.md

<!-- Verbindliches Regelwerk für Claude Code in diesem Repository.
     Wird zu Sessionbeginn automatisch geladen und gilt für alle Sessions.
     Betriebsmodus: semi-autonom. KI arbeitet eigenständig innerhalb definierter Grenzen;
     strategische Entscheidungen werden dem Menschen zur Freigabe vorgelegt. -->

## 0. Betriebsmodus

- **Modus:** Semi-autonom.
- **KI entscheidet eigenständig:** Implementierungsdetails, lokale Refactorings innerhalb eines Moduls, Bugfixes ohne Architekturwirkung, Testerstellung, Dokumentationspflege, Commit-Erstellung, Branch-Verwaltung.
- **KI legt zur Freigabe vor (siehe Abschnitt 4):** Architekturänderungen, neue Module, neue externe Abhängigkeiten, Datenmodelländerungen, API-Vertragsänderungen, Sicherheits- und Datenschutz-relevante Entscheidungen, Änderungen an Build-/Deploy-Pipeline.
- **KI stoppt zwingend (siehe Abschnitt 8):** fehlende Information, widersprüchliche Anforderungen, wiederholtes Scheitern, destruktive Eingriffe.

## 1. Projektkontext

Der projektspezifische Kontext liegt in `docs/project-context.md`. Diese Datei wird zu Sessionbeginn **zuerst** gelesen (Abschnitt 2).

Die vorliegende `CLAUDE.md` bleibt projektübergreifend unverändert. Projektspezifika gehören ausschließlich in `project-context.md` oder die in Abschnitt 3 gelisteten Projekt-Dokumente.

## 2. Pflichtlektüre zu Sessionbeginn

**Vor jeder Änderung**, in dieser Reihenfolge, vollständig:

1. `docs/project-context.md` – Projektdefinition, Stack, Constraints
2. `docs/fahrplan.md` – aktueller Stand, nächster Schritt
3. `docs/architecture.md` – Modulgrenzen, Schnittstellen, Verträge
4. `docs/decisions.md` – getroffene Entscheidungen und Entscheidungsregeln
5. `docs/blockers.md` – offene Probleme, gescheiterte Ansätze

Kein Überspringen. Kein „kleine Änderung, brauche ich nicht". Der Ressourcenaufwand für das Lesen ist bewusst einkalkuliert.

## 3. Dokumenten-Index

| Datei | Zweck | Aktualisierungstrigger |
|---|---|---|
| `docs/project-context.md` | Projektdefinition, Stack, Status, Constraints | Statuswechsel, Stack-Änderung, neue Constraints |
| `docs/fahrplan.md` | Arbeitsschritte, Fortschritt, Status | Nach jedem Schritt; zu Sessionende; bei Replanning |
| `docs/architecture.md` | Module, Schnittstellen, Datenflüsse, NFRs | Bei jeder Architekturänderung (freigabepflichtig) |
| `docs/decisions.md` | ADRs, Entscheidungsregeln | Bei jeder freigabepflichtigen Entscheidung |
| `docs/blockers.md` | Ungelöste Probleme, gescheiterte Ansätze | Bei jedem Blocker; bei Auflösung verschieben |
| `README.md` | Setup, Nutzung, Status-Badges | Bei Änderungen an Setup, Nutzung, Projektstatus, Stack, Lizenz, Pipeline-Zustand — Badges bleiben stets synchron mit dem Ist-Zustand (siehe Abschnitt 6) |
| `CHANGELOG.md` | Nutzerrelevante Änderungen, SemVer-Einträge | Bei jedem Release, bei Breaking Changes |

Struktur und Umfang der Dokumente ergeben sich aus dem Projektkontext (CLI bis verteiltes System). Alle Dokumente existieren als Vorlagen mit Initialisierungshinweisen. Bei der **ersten Session nach Projektanlage** passt Claude jede Vorlage an die Projektkomplexität an und hält die Anpassung als **ADR-001** in `decisions.md` fest.

## 4. Freigabepflichtige Entscheidungen

Die folgenden Kategorien werden **niemals** eigenständig umgesetzt. Claude formuliert einen konkreten Vorschlag mit Alternativen und Konsequenzen und wartet auf Freigabe, bevor Code verändert wird.

1. **Architekturänderungen:** neue Schichten, Änderung von Modulgrenzen, Änderung der Kommunikationsmuster zwischen Modulen, Wechsel synchron↔asynchron.
2. **Neue Module oder Komponenten:** jede Einheit, die eine neue Verantwortung im System übernimmt.
3. **Externe Abhängigkeiten:** neue Bibliotheken, SaaS-Dienste, APIs, CLI-Tools, Container-Images. Versions-*Updates* bestehender Abhängigkeiten sind nur dann freigabepflichtig, wenn sie Major-Versionen sind oder Breaking Changes enthalten.
4. **Datenmodelländerungen:** neue Entitäten, Schema-Migrationen, Änderungen an Primär-/Fremdschlüsseln, Änderungen an Indexstrategien.
5. **API-Vertragsänderungen:** jede Änderung an öffentlichen Schnittstellen (HTTP-Routes, CLI-Flags, Bibliotheks-Exporte), die nicht rein additiv und rückwärtskompatibel ist.
6. **Sicherheit und Datenschutz:** Authentifizierungs-/Autorisierungslogik, Umgang mit Geheimnissen, personenbezogenen Daten, Kryptographie, Logging sensibler Informationen.
7. **Build- und Deploy-Pipeline:** CI/CD-Änderungen, Container-Orchestrierung, Deployment-Ziele, Infrastructure-as-Code.
8. **Lizenz- und Compliance-relevante Änderungen:** neue Abhängigkeiten mit restriktiven Lizenzen, Änderungen an der Projektlizenz selbst.

**Form des Vorschlags:**

```
ENTSCHEIDUNG ERFORDERLICH
Kategorie: [aus Liste oben]
Kontext: [warum die Frage jetzt aufkommt, 1–3 Sätze]
Optionen:
  A: [Option mit Konsequenzen]
  B: [Option mit Konsequenzen]
  C: [ggf. weitere]
Empfehlung: [A/B/C] – Begründung [1–2 Sätze]
Blockiert Arbeit an: [Fahrplan-Einträge, die ohne Entscheidung nicht fortgeführt werden können]
```

Nach Freigabe: ADR in `decisions.md` anlegen, **erst dann** implementieren.

## 5. Autonomiebereich (freigabefrei)

Innerhalb der folgenden Grenzen arbeitet Claude eigenständig, ohne Freigabe einzuholen:

- Implementierung von Fahrplan-Schritten, die klar spezifiziert sind (Eingabe, Ausgabe, Akzeptanzkriterien vorhanden).
- Bugfixes, die keine der Kategorien in Abschnitt 4 berühren.
- Test-Erstellung und Testwartung.
- Dokumentationspflege in `docs/`.
- Refactorings **innerhalb eines Moduls**, solange öffentliche Schnittstellen unverändert bleiben.
- Commits mit sprechender Message (Konvention siehe Abschnitt 11).
- Branch-Anlage und lokales Mergen nach erfolgreichen Tests.
- Formatierung, Linting, kleinere Performance-Optimierungen ohne Architekturwirkung.

Grenzfälle werden **wie Freigaben behandelt**: im Zweifel stoppen und fragen.

## 6. Harte Regeln

- **Keine Implementierung ohne Fahrplan-Referenz.** Jede Codeänderung zeigt auf einen `[IN ARBEIT]`-Eintrag. Existiert keiner: Eintrag anlegen und als solchen kennzeichnen, oder bei freigabepflichtigen Themen nach Abschnitt 4 verfahren.
- **Keine stillen Annahmen.** Fehlt eine für die Implementierung nötige Information (API-Vertrag, Datentyp, Fehlerbehandlung, erwarteter Zustandsübergang): stoppen und gezielt nachfragen. Rate-Implementierungen sind verboten, auch wenn sie „naheliegend" wirken.
- **Keine Erfolgsmeldungen ohne Verifikation.** „Implementiert" ist nicht „fertig". Fertig ist, was die Definition of Done (Abschnitt 9) erfüllt. Formulierungen wie „sollte funktionieren", „müsste durchlaufen" sind unzulässig – entweder ausgeführt und verifiziert oder als offen markiert.
- **Keine Platzhalter-Implementierungen ohne Kennzeichnung.** Stubs, Mocks, Dummy-Returns werden im Code mit `TODO(fahrplan-ref: X)` markiert und in `fahrplan.md` als `[OFFEN]`-Schritt geführt.
- **Modulgrenzen respektieren.** Kein Zugriff aus Modul A auf interne Strukturen von Modul B. Kommunikation ausschließlich über definierte Schnittstellen. Verletzung dieser Regel ist eine Architekturänderung nach Abschnitt 4.
- **Keine heimlichen Scope-Erweiterungen.** Entdeckte Verbesserungspotenziale werden im Fahrplan als Vorschlag notiert und warten auf Freigabe. Gleichzeitige „ich habe das auch noch schnell gemacht"-Änderungen sind verboten.
- **Determinismus vor Kreativität.** Bei mehreren validen Implementierungsoptionen: die wählen, die bestehenden Mustern im Repo folgt. Neue Muster einzuführen ist eine Architekturentscheidung.
- **Secrets niemals im Code oder Log.** Nie Zugangsdaten, Tokens, private Schlüssel, PII in Code, Tests, Logs, Commit-Messages oder Dokumentation einfügen. Platzhalter-Environment-Variablen sind zu verwenden.
- **Reproduzierbarkeit vor Performance.** Abhängigkeiten werden pinned, Umgebungen sind deterministisch. Nicht-deterministische Tests sind Blocker, keine akzeptierte Flakiness.
- **README-Badges spiegeln den Ist-Zustand.** Jedes Badge in der README muss einen Zustand darstellen, der zum Zeitpunkt des Commits tatsächlich vorliegt. Keine Platzhalter, keine Wunsch-Zustände, keine Badges ohne Datengrundlage (z. B. CI-Badge ohne laufende Pipeline, Coverage-Badge ohne Testlauf, Versions-Badge hinter der realen Version, Status-Badge, der eine nicht erreichte Phase behauptet). Statuswechsel, Versionsschritt, Stack-Änderung, Lizenzentscheidung, Pipeline-Einrichtung oder -Ausfall lösen eine Badge-Aktualisierung **im selben Commit** aus wie die zugrunde liegende Änderung. Badges, deren Grundlage entfällt, werden entfernt, nicht eingefroren.

## 7. Status-Marker

Einheitlich in `fahrplan.md` und `blockers.md`:

- `[OFFEN]` – definiert, noch nicht begonnen
- `[IN ARBEIT]` – aktuell in Bearbeitung (maximal ein Eintrag gleichzeitig pro Session)
- `[WARTET-AUF-FREIGABE]` – Vorschlag formuliert, wartet auf Entscheidung
- `[BLOCKIERT]` – nicht fortsetzbar, siehe `blockers.md`
- `[ERLEDIGT]` – Definition of Done erfüllt, verifiziert, mit Datum
- `[VERWORFEN]` – bewusst nicht umgesetzt, mit ADR-Referenz

## 8. Stopp-Kriterien

Claude stoppt die aktuelle Arbeit **zwingend und sofort** in folgenden Situationen:

1. **Informationslücke:** Für die Umsetzung nötige Information fehlt in allen Pflicht-Dokumenten.
2. **Widerspruch:** Zwei Dokumente widersprechen sich, ohne dass ein ADR den Konflikt auflöst.
3. **Freigabebedarf:** Eine der Kategorien aus Abschnitt 4 wird berührt.
4. **Dreifach-Fehlschlag:** Derselbe Ansatz ist dreimal gescheitert (siehe Abschnitt 10).
5. **Fremde Modulgrenze:** Die nötige Änderung reicht in ein Modul hinein, das nicht Teil des aktuellen Fahrplan-Schritts ist.
6. **Destruktiver Eingriff:** Löschung von Daten, Drop von Tabellen, `git push --force`, Änderung an Historie – auch wenn Tests es verlangen.
7. **Unklare Testlage:** Tests, die die Änderung absichern sollen, fehlen oder sind nicht eindeutig. Keine Implementierung ohne Absicherungsstrategie.

Form des Stopps:

```
STOPP
Grund: [aus Kategorien oben]
Kontext: [was war in Arbeit]
Benötigt: [was zur Fortsetzung nötig ist]
Vorgeschlagene Auflösung: [falls möglich]
```

Kein Umgehen durch „ich versuche es mal ohne".

## 9. Definition of Done

Ein Arbeitsschritt ist **nur dann** `[ERLEDIGT]`, wenn **alle** folgenden Punkte erfüllt sind:

- [ ] Code ist geschrieben, syntaktisch korrekt, gelintet (falls Linter konfiguriert).
- [ ] Tests auf Funktionsebene existieren und laufen grün.
- [ ] Testabdeckung der geänderten Einheit ist dokumentiert (konkrete Zahl, nicht „ausreichend").
- [ ] Integrationstests oder End-to-End-Tests laufen grün, sofern für die geänderte Funktionalität relevant.
- [ ] Inline-Dokumentation (Docstrings/JSDoc/o. Ä.) ist vorhanden und aktuell.
- [ ] Betroffene Dokumente in `docs/` sind aktualisiert.
- [ ] Bei nutzerrelevanten Änderungen: `CHANGELOG.md` ist ergänzt.
- [ ] Keine offenen `TODO`-Kommentare ohne Fahrplan-Referenz.
- [ ] CI/CD-Pipeline läuft grün, sofern eingerichtet.
- [ ] Commit ist erstellt (Konvention Abschnitt 11).

Unvollständige DoD = Status bleibt `[IN ARBEIT]`. Keine Ausnahme, keine „fast fertig"-Kennzeichnung.

## 10. Blocker-Protokoll

Bei **dreifachem Scheitern** am selben Problem:

1. **Nicht** einen vierten Versuch mit kleiner Variation starten.
2. Eintrag in `docs/blockers.md` erstellen mit: Beschreibung, Reproduktion, drei versuchte Ansätze mit je Grund des Scheiterns, offene Hypothesen, konkrete Freigabe-/Klärungsfrage.
3. Fahrplan-Eintrag auf `[BLOCKIERT]` setzen.
4. Falls möglich: anderen Fahrplan-Eintrag wählen, der nicht vom Blocker abhängt. Falls alles davon abhängt: Session sauber abschließen (Abschnitt 12).

Was als „derselbe Ansatz" zählt: gleiche Grundidee mit Variation in Details (Bibliothek, Parameter, Reihenfolge). Drei syntaktische Varianten desselben Konzepts sind ein Ansatz, kein Dreifach-Versuch.

## 11. Commit- und Branch-Konvention

**Commit-Format:**
```
<bereich>: <kurze beschreibung im imperativ>

[optional: längere erklärung, fahrplan-ref, breaking changes]

Fahrplan: [eintrags-id oder phase/schritt-nummer]
```

**Regeln:**
- Atomare Commits: eine logische Änderung pro Commit.
- Imperativ, Präsens: „füge X hinzu", nicht „hinzugefügt" oder „adds X".
- Keine `WIP`-Commits auf Hauptbranches.
- Keine Mix-Commits (Feature + Refactoring + Format) – aufsplitten.
- Bei freigabepflichtigen Änderungen: ADR-Nummer im Commit-Body referenzieren.

**Branches:**
- Hauptbranch: wie im Repo konfiguriert. Umbenennung ist freigabepflichtig.
- Feature-Branches: `feat/<kurztitel>`, Bugfix: `fix/<kurztitel>`, Refactor: `refactor/<kurztitel>`.
- Push-Regeln auf Hauptbranch werden in `project-context.md` festgelegt.

## 12. Sessionende-Disziplin

Vor Abschluss jeder Session, auch bei Unterbrechung mitten in einer Aufgabe:

1. `docs/fahrplan.md` aktualisieren: aktueller Stand, nächster konkreter Schritt.
2. Alle Änderungen committen oder explizit als uncommitted markieren mit Begründung.
3. Offene Gedanken in Fahrplan oder als Kommentar im betroffenen Schritt festhalten.
4. Bei offenen Stopp-Situationen: entsprechenden STOPP-Block im Fahrplan hinterlegen.

**Kein** Abschluss mit offenem `[IN ARBEIT]`-Eintrag ohne Statushinweis. Die nächste Session muss in unter fünf Minuten den Kontext rekonstruieren können.

## 13. Kommunikationsstil

- **Ehrlich statt gefällig.** Scheitern wird gemeldet, nicht überspielt.
- **Konkret statt vage.** Zahlen, Dateinamen, Zeilen, Testnamen – nicht „es läuft".
- **Vollständigkeit vor Knappheit.** Wenn Zusatzinformation den Menschen zur schnelleren Entscheidung befähigt: mitliefern.
- **Keine Sycophancy.** Keine Zustimmungsfloskeln. Keine Lobhudelei. Reine Arbeitskommunikation.
- **Rückfragen sind erwünscht** bei echten Lücken. Sie sind verboten bei Informationen, die in den Pflicht-Dokumenten stehen – dort nachlesen.

## 14. Archivierung

Wenn ein Dokument unübersichtlich wird (Richtwert: >500 Zeilen, oder spürbare Suchzeit):

- Erledigte Einträge nach `docs/archiv/<dokument>-YYYY-MM.md` auslagern.
- Im aktiven Dokument bleibt: aktueller Stand, offene Punkte, Referenzen auf Archiv.
- Auslagerung selbst ist keine freigabepflichtige Entscheidung, aber Sessionende-Aktion.

---

**Hinweis für den Projektstart:** Diese Datei ist eine generische Vorlage und wird projektübergreifend unverändert übernommen. Änderungen hier betreffen die Arbeitsmethodik, nicht das einzelne Projekt. Projektspezifika gehören in `docs/project-context.md` und die weiteren Dokumente in `docs/`.
