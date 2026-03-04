# Sprint 83 - Multilevel-Docs-Plugin: Layout, Sektionen & Interop

**Branch:** `feature/sprint-83-multilevel-docs-plugin`
**Gruppe:** B (startbar nach S81, sinnvoll nach S82)
**Status:** `done`
**Abhaengigkeiten:** S64 (Layout-Sheets), S72 (Bogen-Bemaßung), S80 (Vektor-Exporte), S81 (Levels), S82 (Treppen)

---

## Ziel

Mehr-Ebenen-Projekte professionell darstellen und exportieren:
level-spezifische Sheets, vertikale Schnitte, Treppendarstellung und
grundlegende Mehr-Ebenen-Daten in Exporten.

Leitidee: level-aware Sheets, vertikale Schnitte und mehrstufige Exportpfade.

**Plugin-Zuschnitt:** `multilevel-docs`

---

## 0. Plugin-Einordnung

Das Plugin kapselt:

- section_lines-basierte Schnittdefinitionen (pro Raum)
- level-aware Layout-Sheets
- vertikale Schnittdarstellung
- Export-/Interop-Erweiterungen fuer Mehr-Ebenen-Dokumentation

Der Core liefert nur:

- Levels aus `S81`
- Basissheets aus `S64`
- Export-Extension-Points

---

## 1. Backend

Neue oder angepasste Dateien:

- `planner-api/src/plugins/multilevelDocs.ts`
- Erweiterungen in `routes/annotations.ts`, `layoutSheets.ts`, `viewerExports.ts`, `exports.ts`, `cadInterop.ts`, `ifcInterop.ts`

Funktionen:

- vertikale Schnittdefinitionen ueber `room.section_lines` speichern
- Level-gebundene Layout-Sheets
- Exporte mit Level-Metadaten
- einfache Seiten-/Schnittansicht fuer Treppen und Raumstapel

---

## 2. Datenmodell

Keine neue View-Entitaet in S83.

S83 nutzt `room.section_lines` als Single Source of Truth und erweitert nur:

- Metadaten in `section_lines` (z. B. `level_scope`, `direction`, `depth_mm`, `sheet_visibility`)
- relationales `layout_sheets.level_id` fuer level-aware Sheet-Bindung

---

## 3. Frontend

Neue oder angepasste Dateien:

- `planner-frontend/src/plugins/multilevelDocs/*`
- `planner-frontend/src/components/editor/SectionPanel.tsx`
- Anpassungen in `api/rooms.ts`, `LayoutSheetTabs.tsx`, `Editor.tsx`, `ExportsPage.tsx`

Funktionen:

- Schnittlinie im Plan setzen
- Seiten-/Schnittansicht generieren
- Sheets nach Ebene und Section filtern
- Export von Level- und Schnittansichten
- Plugin-Sichtbarkeit tenant-aware

---

## 4. Deliverables

- Erweiterte `section_lines` inkl. CRUD
- Section-CRUD
- level-aware Layout-Sheets
- einfache Vertikalschnitte
- Export- und Interop-Erweiterungen fuer Mehr-Ebenen-Metadaten
- Plugin-Registrierung und tenant-aware Aktivierung
- 10-14 Tests

---

## 5. DoD

- Mehr-Ebenen-Projekte koennen in Sheets pro Ebene dargestellt werden
- vertikale Schnittansichten sind speicher- und exportierbar
- Treppen und Deckenaussparungen erscheinen sinnvoll in Layout und Export
- Level-Metadaten gehen in Exportpfaden nicht verloren

---

## 6. Freigegebene Architekturregeln (2026-03-04)

- `room.section_lines` bleibt Single Source of Truth.
- Keine neue View-Entitaet in S83.
- Interop-Pfade leiten aus denselben Section-/Level-Metadaten ab.
- Reihenfolge: Viewer/SVG zuerst, CAD/IFC danach.
- Falls CAD/IFC Sondermodelle erzwingen, Scope reduzieren statt Architektur aufbrechen.

---

## 7. Abschluss umgesetzt (2026-03-04)

Umgesetzt in S83:

- Shared Schema `SectionLine` um S83-Metadaten erweitert.
- Backend `annotations` um `PATCH/DELETE /rooms/:id/section-lines/:lineId` erweitert.
- `layout_sheets.level_id` relational eingefuehrt (Prisma + Migration).
- `layoutSheets` API level-aware (Filter `?level_id`, Validierung von `level_id` auf Projekt-Scope).
- Viewer/SVG-Export mit Level-/Section-Scope-Payload (`level_id`, `section_line_id`) und eingebetteter SVG-Metadatenstruktur.
- Frontend-Exportseite um optionale Level-/Section-Filter erweitert.
- Editor um `SectionPanel` (raumbezogene Section-CRUD-Bedienung) erweitert.
- Plugin `multilevel-docs` registriert fuer tenant-aware Feature-Toggle.
- CAD (DXF/DWG) Export nimmt Scope-Payload (`level_id`, `section_line_id`) an, validiert Projekt-Scope und propagiert Level-/Section-Metadaten als DXF-Kommentar (`999 OKP_METADATA`).
- IFC Export nimmt Scope-Payload (`level_id`, `section_line_id`) an, validiert Projekt-Scope und propagiert Level-/Section-Metadaten als STEP-Kommentar (`/* OKP_METADATA ... */`).

Verifikation:

- `planner-api`: `annotations`, `layoutSheets`, `viewerExports`, `cadInterop`, `ifcInterop`, `ifcEngine` Tests gruen (59/59).
- `planner-frontend`: Build gruen.
