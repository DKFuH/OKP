# REVIEW_EXECUTION_RESULTS_2026-03-01.md

## Ausführungsstatus

Abgearbeitet auf Basis der Vorlagen:

- TASK-3-R01: intern ausgeführt
- TASK-3-R02: intern ausgeführt und umgesetzt
- TASK-5-R01: intern ausgeführt
- TASK-8-R01: intern ausgeführt und umgesetzt
- TASK-9-R01: intern ausgeführt und umgesetzt
- TASK-10-R01: intern ausgeführt
- TASK-11-R01: intern ausgeführt und umgesetzt

## Findings (konsolidiert, Status: umgesetzt)

### Hoch (historisch, behoben)

1. Keine vollständige Autorisierung in neuer serverseitiger Validierungsroute
   - Datei: `planner-api/src/routes/validate.ts`
   - Risiko (damals): keine Benutzer-/Projektprüfung innerhalb der Route
   - Umsetzung: Benutzer-/Projekt-Autorisierung ergänzt

Umgesetzt seit letzter Runde:

- `setEdgeLength`-Guard für `newLengthMm <= 0` ergänzt (`shared-schemas/src/geometry/polygonEditor.ts`)
- serverseitige Basisroute `POST /api/v1/validate` ergänzt (`planner-api/src/routes/validate.ts`, Registration in `planner-api/src/index.ts`)

### Mittel (historisch, behoben)

3. Öffnungskandidaten aus CAD werden nicht gegen Wandlänge normalisiert
   - Datei: `shared-schemas/src/geometry/openingValidator.ts`
   - Risiko (damals): bei fehlerhaften CAD-Koordinaten inkonsistente Gap-Berechnung
   - Umsetzung: Intervalle auf `[0, wallLength_mm]` werden geclampt

4. Offene API-Artefakte für Review-Tasks fehlten
   - betroffene Dateien (mittlerweile vorhanden): `planner-api/src/routes/imports.ts`, `planner-api/src/routes/openings.ts`, `planner-api/src/routes/placements.ts`, `planner-api/src/routes/bom.ts`
   - Risiko (damals): Companion-Reviews nur teilweise möglich, sicherheitskritische Teile nicht prüfbar
   - Umsetzung: Route-Stubs mit Validierung wurden angelegt

5. Height-Checker setzt `labor_surcharge` bei jedem Verstoß pauschal auf `true`
   - Datei: `shared-schemas/src/validation/heightChecker.ts`
   - Risiko (damals): kaufmännische Übermarkierung in Grenzfällen
   - Umsetzung: differenzierte Regel eingeführt

### Niedrig (historisch, behoben)

6. BOM `surcharge` wird aktuell mit Betrag `0` angelegt
   - Datei: `planner-api/src/services/bomCalculator.ts`
   - Risiko (damals): fachlich unvollständig, aber technisch konsistent
   - Umsetzung: parameterisierbarer Default-Zuschlag ergänzt

7. Template-/Task-Dateien referenzieren teils (noch) nicht vorhandene Komponenten
   - z. B. `planner-frontend/src/editor/PolygonEditor.tsx`, `planner-frontend/src/editor/PlacementManager.tsx`
   - Risiko: Review-Läufe müssen angepasst werden
   - Empfehlung: bis zur Implementierung mit "Scope-Nicht-Vorhanden" kennzeichnen

## Nächste Umsetzungsschritte

1. Regression der bereits abgearbeiteten Tasks bei größeren Refactorings erneut ausführen
2. Verbleibende offene Companion-Tasks (Sprint 0/1/2/19) separat einplanen
