# STATUS.md

Projektstatus per 2026-03-01 - MVP abgeschlossen, Phase 2 umgesetzt, Phase 3 geplant.

---

## MVP-Status (Stand 2026-03-01)

**Sprints 0-19: abgeschlossen.**

Sprint 01 wurde extern bearbeitet. Alle übrigen Sprints lieferten Artefakte in:
- `shared-schemas` - Polygon, Öffnungen, Decken/Wände, Kollision/Höhe
- `planner-frontend` - Snap-Utilities
- `planner-api` - BOM-Kalkulation, Route-Stubs, Autorisierung

**Teststatus:** 9 Testdateien, **45 Tests grün** (Stand letzter Durchlauf).

---

## Review-Ergebnisse

Alle Reviews (TASK-3-R01 bis TASK-11-R01) intern ausgeführt. Alle Findings umgesetzt.

### Behobene Findings

| Priorität | Finding | Datei | Umsetzung |
|-----------|---------|-------|-----------|
| Hoch | Keine Autorisierung in `/validate` | `planner-api/src/routes/validate.ts` | Benutzer-/Projekt-Prüfung ergänzt |
| Hoch | `setEdgeLength` ohne Guard für `<= 0` | `shared-schemas/src/geometry/polygonEditor.ts` | Guard + Tests |
| Mittel | CAD-Intervalle nicht auf Wandgrenzen normalisiert | `shared-schemas/src/geometry/openingValidator.ts` | Clamping auf `[0, wallLength_mm]` |
| Mittel | API-Route-Stubs fehlten | `imports.ts`, `openings.ts`, `placements.ts`, `bom.ts` | Stubs mit Zod-Validierung angelegt |
| Mittel | `labor_surcharge` pauschal bei jedem Verstoß | `shared-schemas/src/validation/heightChecker.ts` | Differenzierte Regel + Grenzschwellen-Tests |
| Niedrig | BOM `surcharge` mit Betrag 0 | `planner-api/src/services/bomCalculator.ts` | Parametrisierbarer Default-Zuschlag |

---

## Offene Punkte

- `planner-api` Build-Probleme (Environment/NodeNext-Import) wurden in diesem Durchlauf **nicht** als Gesamtpaket bereinigt.
- Neu angelegte API-Stubs (`imports`, `openings`, `placements`, `bom`) sind fachlich noch **nicht vollständig implementiert** (Stub/`501`).
- Verbleibende Companion-Reviews (Sprint 0/1/2/19) noch separat einzuplanen.
- Referenzen auf noch nicht existierende Komponenten (`PolygonEditor.tsx`, `PlacementManager.tsx`) bei Review-Läufen mit "Scope-Nicht-Vorhanden" kennzeichnen.

---

## Phase-2 Abschluss / Übergabe in Phase 3

- Sprint 20-24 Kernziele sind in Architektur und Feature-Set verankert (Herstellerkatalog, Auto-Completion, Rule Engine v2, Multi-Tenant, Webplaner-Handover).
- Für verbleibende P0/P1-Lücken wurde ein priorisierter Umsetzungs- und DoD-Plan geführt und schrittweise abgearbeitet.
- Nächster Ausbaupfad verschiebt den Fokus von reiner Planung auf Studio-Workflow und Cloud-Betrieb.

---

## Nächste Schritte (Phase 3, Sprints 25-30)

- Sprint 25: Projekt-/Aufgabenmanagement mit Kanban + Gantt.
- Sprint 26: Dokumentenmanagement mit Upload, Vorschau, Suche und S3-kompatiblem Storage.
- Sprint 27: Kontakte/CRM-Light inkl. Webplaner-Lead-Übernahme.
- Sprint 28: Personalisierte Dashboards/KPIs mit speicherbarer Widget-Konfiguration.
- Sprint 29: Katalogindexierung für projektbezogene EK/VK-Preissteuerung.
- Sprint 30: Cloud-Sync, globale Suche, Export und E-Mail-Benachrichtigungen.
- Referenzplanung: `Docs/PHASE_3_DOD_AND_EXECUTION_PLAN.md`

