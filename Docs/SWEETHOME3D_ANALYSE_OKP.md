# SweetHome3D Analyse -> OKP Umsetzung (konsolidiert)

Diese Datei ist die kanonische Zusammenfuehrung aus:

- `Docs/SWEETHOME3D_ANALYSE_OKP.md`
- `Docs/SWEETHOME3d_Analyse_OPK.md`

## Scope / analysierte SH3D-Bereiche

Quelle analysiert unter:

- `SWH3D/src/com/eteks/sweethome3d/viewcontroller/PlanController.java`
- `SWH3D/src/com/eteks/sweethome3d/viewcontroller/HomeController.java`
- `SWH3D/src/com/eteks/sweethome3d/viewcontroller/HomeView.java`
- `SWH3D/src/com/eteks/sweethome3d/viewcontroller/WallController.java`
- `SWH3D/src/com/eteks/sweethome3d/viewcontroller/FurnitureController.java`
- `SWH3D/src/com/eteks/sweethome3d/viewcontroller/RoomController.java`
- `SWH3D/src/com/eteks/sweethome3d/model/UserPreferences.java`
- `SWH3D/src/com/eteks/sweethome3d/model/LengthUnit.java`
- `SWH3D/src/com/eteks/sweethome3d/model/Wall.java`
- `SWH3D/src/com/eteks/sweethome3d/model/Room.java`

Ziel: fehlende Basic-Editorfunktionen in OKP strukturiert ergaenzen.

## Beobachtungen aus SH3D

- Magnetismus ist ein kombiniertes System (Winkel, Punkte/Kanten, Laengen).
- Temporaere Modifikatoren waehrend Drag/Zeichnen sind zentral.
- Grid/Magnetismus sind User-Praeferenzen, nicht hart codiert.
- Wall/Room-Operationen sind transaktional gedacht (Undo/Redo, Geometrie-Konsistenz).
- SH3D trennt klar Mode, ActionType und Controller-Orchestrierung.

## In OKP bereits umgesetzt

- Editor-Magnetismus:
  - Fang auf nahe bestehende Punkte beim Zeichnen und Vertex-Verschieben.
  - Konfigurierbare Fangtoleranz im Editor-State (`magnetismToleranceMm`).
- Konfigurierbares Winkelraster:
  - Nicht mehr starr auf 45 Grad.
  - Winkel-Schritt wird als erlaubte Winkelliste erzeugt.
- Modifier (SH3D-inspiriert):
  - `Shift` beim Zeichnen und Vertex-Drag mit Align auf H/V plus Nachbarwand-Winkel.
  - `Alt` deaktiviert Magnetismus temporaer beim Zeichnen/Vertex-Drag.
  - `Ctrl` fuer Feinschritt (halbes Laengenraster) beim numerischen Setzen von Kantenlaengen.
  - Visuelle Toolbar-Badges (`ORTHO`, `MAG OFF`).
- Magnetismus auf Wandachsen/Projektionen:
  - Fang auf naechste Projektion auf bestehende Wandsegmente innerhalb Toleranz.
  - Segment- und Punkt-Magnetismus konkurrieren; naeherer Fangpunkt gewinnt.
  - Zoom-adaptive Fangtoleranz (praeziser bei starkem Zoom, grosszuegiger in Weitansicht).
- Magnetisierte Laengenrasterung:
  - Explizites Setzen von Kantenlaengen wird auf `lengthSnapStepMm` gerundet.
- Toolbar-UX:
  - Getrennte Toggles fuer `Punktfang` und `Achsenfang`.
  - `L-Snap` Feld fuer Laengenraster.
  - `Fang: ...` Live-Anzeige inkl. Tooltip `Basis -> Effektiv` und Warn/Active-Farblogik.
  - Klickbare `Fang`-Anzeige (AUTO/BASIS Modus).
  - `Zoom: ...%` Anzeige plus Klick auf 100 Prozent Reset bei stabilem Viewport-Zentrum.
- Mode-Orchestrierung (Basis):
  - Zentraler `editorModeStore` als erster gemeinsamer Mode-Layer zwischen Workflow-UI und Editor-Toolstate.
  - Workflow-Step-Wechsel (`walls/openings/furniture`) setzt konsistente Editor-Modi (Zeichnen vs. Auswahl).
  - Insert-nahe Flows (`Raum`, `Oeffnung`, `Placement`) schalten auf `selection` zurueck.
- Action-Orchestrierung (Basis):
  - Zentraler `actionStateResolver` fuer Header-/Menue-Aktionen mit `enabled` und `reasonIfDisabled`.
  - Erste Anbindung fuer View-Modi (Split/ELV/SEC), Capture-Aktionen und Mehr-Menue-Operationen.
  - Shortcut-Freigaben (`D`, `S`, `Delete`, `Escape`) im Polygon-Editor zentral ueber Resolver statt Inline-Bedingungen.
  - View-Shortcuts (`1` bis `5`) zentral ueber Resolver (`resolveViewModeShortcut`) statt separater Sonderlogik.
  - Projektabhaengige Menue-Aktionen zentral gegatet (Angebotspositionen, Panorama-Touren, Werkstattpakete, Viewer-Exports, GLB, Alles geliefert).
  - `Bereiche`-Toggle ist konsistent in `Mehr`-Menue und `Toolboxen` ueber zentrale Action-Matrix verdrahtet.
- Editor-Orchestrierung (Konsolidierung):
  - Ein gemeinsamer `actionContext` in `Editor.tsx` ersetzt doppelte Context-Erzeugung fuer Resolver und Shortcuts.
  - `actionStates` werden als Single Source sowohl fuer UI-Buttons als auch Keyboard-Handler genutzt.

## Geaenderte OKP-Dateien (bisher)

- `planner-frontend/src/editor/snapUtils.ts`
- `planner-frontend/src/editor/snapUtils.js`
- `planner-frontend/src/editor/usePolygonEditor.ts`
- `planner-frontend/src/editor/usePolygonEditor.js`
- `planner-frontend/src/editor/PolygonEditor.tsx`
- `planner-frontend/src/editor/PolygonEditor.js`
- `planner-frontend/src/editor/editorModeStore.ts`
- `planner-frontend/src/editor/workflowStateStore.ts`
- `planner-frontend/src/editor/actionStateResolver.ts`
- `planner-frontend/src/editor/actionStateResolver.js`
- `planner-frontend/src/editor/PolygonEditor.module.css`
- `planner-frontend/src/components/editor/CanvasArea.tsx`
- `planner-frontend/src/pages/Editor.tsx`
- `planner-frontend/src/pages/Editor.module.css`
- Tests:
  - `planner-frontend/src/editor/snapUtils.test.ts`
  - `planner-frontend/src/editor/snapUtils.test.js`
  - `planner-frontend/src/editor/usePolygonEditor.test.js`
  - `planner-frontend/src/editor/editorModeStore.test.ts`
  - `planner-frontend/src/editor/workflowStateStore.test.ts`
  - `planner-frontend/src/editor/actionStateResolver.test.ts`
  - `planner-frontend/src/editor/actionStateResolver.test.js`

## Verifikation (zuletzt)

- `npm run -w planner-frontend test -- src/editor`
- `npm run -w planner-frontend test -- src/editor/actionStateResolver.test.ts`
- `npm run -w planner-frontend build`

## Konkrete Implementierungsvorschlaege (Backlog)

### P1: Snap-Engine und Interaktion

1. Snap-Engine 2.0 finalisieren (Grid -> Angle -> Vertex/Edge -> Length als klare Pipeline).
2. Temporaere Modifier weiter ausbauen (kontextsensitive Schwellwerte, konsistente Hinweise in UI).
3. Praeferenzmodell persistieren (`grid_visible`, `grid_size_mm`, `magnetism_enabled`, `angle_step_deg`, `length_snap_step_mm`).

### P1: Mode/Action/Insert-Orchestrierung

1. Einheitlichen `editorModeStore` etablieren (`selection | pan | wallCreate | roomCreate | polylineCreate | dimCreate | labelCreate`).
2. Harte Regel: nach Insert/Drop/Paste/Import immer auf `selection` zurueck.
3. Konsolidierte Insert/Paste/Drop-Pipeline mit konsistenter Selection- und Undo-Logik.
4. Zentrale Actions-Matrix fuer Header/Menu/Shortcuts (`visible`, `enabled`, `reasonIfDisabled`).

### P2: Geometrie-Robustheit

1. Wall-Bearbeitung robust machen (split/join/reverse/move mit Nachbarbindung und Oeffnungs-Rebind).
2. Raumgeometrie-Validierung plus optionaler Auto-Fix (Selbstueberschneidung, Doppelpunkte, Nullkanten, Orientierung).

### P2/P3: Bemaßung und Multi-View

1. Kontextsensitive Bemaßungsvorschlaege (Wandparallel, Oeffnungsabstaende, Live-Massfeedback).
2. Fenster/Tueren als echte Entities mit synchroner Draufsicht/3D/Wandansicht.

## Empfohlene Reihenfolge

1. Snap/Modifier abschliessen
2. Mode-/Action-Orchestrierung und Insert-Pipeline vereinheitlichen
3. Preferences-Persistenz
4. Wall-Topologie robust machen
5. Room-Validation + Auto-Fix
6. Dimension-Assist und Multi-View-Objekte

## Risiko / Aufwand

- Niedrig: Snap, Modifier, Preferences
- Mittel: Mode-Orchestrierung, Room-Validation
- Hoeher: Arc-Walls, robuste Wall-Merge/Split-Operationen mit abhaengigen Objekten

## Definition of Done pro Block

- Unit-Tests auf Utility-/Reducer-Ebene
- Mindestens 1 UI-Flow-Test (Draw/Move/Save)
- Keine Geometrie-Regressions im bestehenden `PolygonEditor`-Flow
