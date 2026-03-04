# Sprint 95 - Room-Survey-Import & robuste JSON-Interop

**Branch:** `feature/sprint-95-room-survey-json-import`
**Gruppe:** A (startbar nach S47, S58 und S79)
**Status:** `planned`
**Abhaengigkeiten:** S47, S58, S79

---

## Ziel

Room-Surveys und strukturierte JSON-Aufmasse robust importieren:
Validerung, Mapping, Fehlerrueckmeldung und nachvollziehbare Importdiagnostik
sollen den Survey-Import alltagstauglich machen.

---

## 1. Backend

Einzufuehren:

- JSON-Schema fuer Survey-Importe
- Importdiagnostik mit Warnungen und Fehlerlisten
- Mapping auf Raeume, Waende, Oeffnungen und Referenzdaten

Neue Endpunkte:

- `POST /projects/:id/import/room-survey`
- `POST /projects/:id/validate/room-survey`
- `GET /projects/:id/room-survey-jobs`

---

## 2. Frontend

- Upload fuer Survey-JSON
- Vorschau/Review der importierten Raeume
- klare Importwarnungen bei unvollstaendigen oder ungueltigen Feldern

---

## 3. DoD

- valide Survey-JSONs erzeugen Raeume nachvollziehbar
- invalide Daten geben strukturierte Fehler zurueck
- Importdiagnostik ist im UI sichtbar
- mindestens 12 Tests fuer Validierung, Mapping und Warnungen
