# STATUS.md

Projektstatus per 2026-03-01 - MVP-Abschluss, Review-Ergebnisse, offene Punkte.

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

## Nächste Schritte

- Phase 2 starten (Sprint 20 - Herstellerkatalog & Schrankkonfigurator (Light)):
  - DB-Tabellen `manufacturers`, `catalog_articles`, `article_options`, `article_variants`, `article_prices`, `article_rules` im Prisma-Schema ergänzen.
  - Domain-Typen `Manufacturer`, `CatalogArticle`, `ArticleOption`, `ArticleVariant`, `ArticlePrice`, `ArticleRule` in API und Shared Layer konsistent verankern.
  - Import-Pipeline (CSV/JSON) für einen Pilot-Hersteller umsetzen.
- API-Stubs fachlich auffüllen:
  - `imports`, `openings`, `placements`, `bom` in der Reihenfolge, die für End-to-End-Flows von Planung -> BOM -> Pricing -> Angebot am wichtigsten ist.
- Build-Umgebung `planner-api` bereinigen:
  - Node/TypeScript/ESM-Konfiguration stabilisieren, bis alle Tests und Builds reproduzierbar laufen.
- Regressions-Review:
  - Nach größeren Refactorings in Sprint 20 und Sprint 21 (Herstellerkatalog, Automatismen) ROADMAP-Meilensteine (Sprints 6/8/13/15/19) mit Stichproben erneut validieren.
