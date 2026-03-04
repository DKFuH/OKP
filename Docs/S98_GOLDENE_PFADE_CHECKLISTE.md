# S98 Goldene Pfade Checkliste

Stand: 2026-03-04

Zweck: Diese Checkliste ist die manuelle Produktabnahme fuer `S98`.
Sie bewertet nicht Einzelfeatures, sondern die zusammenhaengende Benutzbarkeit
der Anwendung.

---

## 1. Start und Einstieg

- App startet ohne sichtbaren Crash
- Projektliste laedt ohne Fehlermeldung
- Navigation zu Editor, Einstellungen und Exportseiten funktioniert
- keine sichtbaren Encoding-/Mojibake-Fehler auf Hauptseiten

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 2. Projekt anlegen und oeffnen

- neues Projekt anlegen
- Projekt erscheint in der Liste
- Projekt laesst sich oeffnen
- Editor initialisiert ohne Blocker

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 3. Raum bearbeiten

- vorhandenen Raum laden oder neuen Raum anlegen
- Raumgeometrie ist sichtbar
- Raum kann bearbeitet oder gespeichert werden
- Raumdaten bleiben nach Reload konsistent

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 4. Objekt platzieren

- Katalog-/Asset-Objekt auswaehlen
- Objekt im Raum platzieren
- Objekt ist in 2D sichtbar
- falls 3D aktiv: Objekt ist auch dort sichtbar
- keine inkonsistenten Positions- oder Auswahlzustande

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 5. Layout und Dokumente

- Layout-Sheets lassen sich oeffnen
- bestehende Sheets brechen nicht
- level-/raumbezogene Inhalte werden plausibel dargestellt
- Export-/Dokument-UI ist erreichbar

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 6. Exportpfad

- einen realen Export ausloesen
- Export endet ohne offensichtlichen Server- oder UI-Blocker
- Ergebnisdatei ist erzeugt oder als Job sichtbar
- keine Sackgasse in der Export-UI

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 7. Plugin-Einstellungen

- Plugin-Seite ist erreichbar
- Plugin aktivieren/deaktivieren funktioniert
- deaktivierte Plugins verschwinden oder sind sauber gesperrt
- kein inkonsistenter Zustand zwischen UI und API

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 8. Level-Wechsel

Nur pruefen, wenn Level-Funktion verfuegbar ist.

- aktive Ebene wechseln
- sichtbare Inhalte passen zur gewaehlten Ebene
- neue Elemente landen auf der aktiven Ebene
- kein Leak zwischen fremden Ebenen

Ergebnis:

- `pass`
- `fail`
- `n/a`
- Notizen:

---

## 9. Security-Sanity

- keine tenantfremden Daten sichtbar
- keine projektfremden IDs werden still akzeptiert
- deaktivierte Plugins bleiben serverseitig gesperrt
- offensichtliche 4xx-Fehler sind klar und nicht irrefuehrend

Ergebnis:

- `pass`
- `fail`
- Notizen:

---

## 10. Abschlussbewertung

Freigaberegel fuer `S98`:

- kein `fail` in Start, Projekt, Raum, Objekt und Export
- hoechstens bekannte Restfehler mit dokumentiertem Workaround
- Security-Sanity darf keine kritischen Leaks zeigen

Gesamt:

- `release_candidate`
- `noch_nicht_stabil`
- Zusammenfassung:
