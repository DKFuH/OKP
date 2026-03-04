# Sprint 94 - Bestellstatus, Positionsnummern & Sperranzeige

**Branch:** `feature/sprint-94-bestellstatus-positionsnummern-sperranzeige`
**Gruppe:** A (startbar nach S46 und S48)
**Status:** `planned`
**Abhaengigkeiten:** S46, S48, S60

---

## Ziel

Operative Transparenz im Tagesgeschaeft erhoehen: Lieferstatus gesammelt setzen,
Positionsnummern gezielt neu nummerieren und Projekt-/Alternativsperren sichtbar machen.

---

## 1. Backend

Einzufuehren:

- Sammelaktion fuer Lieferstatus je Alternative oder Bestellungspaket
- Renummerierung ab beliebiger Position
- Sperrinfo mit `locked_by_user`, `locked_by_host`, `locked_at`

Neue Endpunkte:

- `POST /alternatives/:id/orders/mark-delivered`
- `POST /quotes/:id/resequence-lines`
- `GET /projects/:id/lock-state`

---

## 2. Frontend

- Massenaktion "alles geliefert"
- Dialog fuer Positionsnummern neu ab Position X
- sichtbare Sperranzeige in Projektliste und Editor

---

## 3. DoD

- Lieferstatus kann gesammelt gesetzt werden
- Positionsnummern lassen sich kontrolliert neu nummerieren
- aktive Sperren zeigen User und Zeitpunkt an
- mindestens 10 Tests fuer Sammelstatus, Renummerierung und Lock-State
