# Editor-Funktionsmatrix (2D/3D/Rendering)

Stand: 2026-03-05

Legende:
- `vorhanden`: produktiv im Code mit UI/API-Pfad
- `teilweise`: Basis vorhanden, aber nicht vollstaendig wie in CAD-/Render-Tools
- `fehlt`: derzeit keine belastbare Umsetzung gefunden

## 1) 2D-Zeichnung

| Feature | Status | Beleg | Prioritaet |
|---|---|---|---|
| Raeume/Waende (Polygon, auch komplexe Geometrie) | vorhanden | `planner-frontend/src/editor/PolygonEditor.tsx:190`, `planner-frontend/src/editor/PolygonEditor.tsx:564` | - |
| Oeffnungen (Tuer/Fenster etc.) in Waenden | vorhanden | `planner-frontend/src/pages/Editor.tsx:1332`, `planner-api/src/routes/openings.ts:1` | - |
| Hilfsgeometrie (Grid, Snapping/Pan/Zoom) | vorhanden | `planner-frontend/src/components/editor/Preview3D.tsx:470`, `planner-frontend/src/editor/PolygonEditor.tsx:359`, `planner-frontend/src/editor/PolygonEditor.tsx:381` | - |
| Bemassung (CRUD + Auto/Smart/Chain) | vorhanden | `planner-api/src/routes/dimensions.ts:138`, `planner-api/src/routes/dimensions.ts:215`, `planner-frontend/src/editor/PolygonEditor.tsx:833` | - |
| 2D-Symbole/Objekte (mehr als reine Geometrie) | teilweise | Platzierungen/Gruppen vorhanden, aber kein dedizierter Symbolkatalog im 2D-Editor nachgewiesen | P2 |
| Ansichten (Grundriss/Ansicht/Schnitt) | teilweise | Grundriss + Schnittlinien vorhanden (`planner-frontend/src/components/editor/SectionPanel.tsx:54`, `planner-api/src/routes/viewerExports.ts:258`), keine eigene interaktive Elevation-Ansicht sichtbar | P1 |

## 2) 3D-Modell & Darstellung

| Feature | Status | Beleg | Prioritaet |
|---|---|---|---|
| 3D-Vorschau/Geometrie aus 2D-Daten | vorhanden | `planner-frontend/src/components/editor/Preview3D.tsx:292`, `planner-frontend/src/components/editor/Preview3D.tsx:475` | - |
| 3D-Objekte (Moebel/Geraete) inkl. Materialzuweisung | vorhanden | `planner-api/src/routes/materialLibrary.ts:525`, `planner-frontend/src/components/editor/MaterialPanel.tsx:1` | - |
| Oeffnungen in 3D mit baulichen Details (Laibung/Sims/Sturz) | teilweise | Oeffnungsdarstellung vorhanden (`planner-frontend/src/components/editor/Preview3D.tsx:544`), Detail-Bauteile nicht eindeutig sichtbar | P1 |
| Mehrere 3D-Ansichten (2D/3D/Split) | vorhanden | `planner-frontend/src/pages/Editor.tsx:292`, `planner-frontend/src/pages/Editor.tsx:2062`, `planner-frontend/src/pages/Editor.tsx:2364` | - |

## 3) Kamera, Sichtbarkeit, Himmel/Transparenz

| Feature | Status | Beleg | Prioritaet |
|---|---|---|---|
| View-Wechsel 2D/3D/Split | vorhanden | `planner-frontend/src/pages/Editor.tsx:2062`, `planner-frontend/src/pages/Editor.tsx:2069`, `planner-frontend/src/pages/Editor.tsx:2078` | - |
| Virtueller Besucher/Kamerahoehe | vorhanden | `planner-frontend/src/pages/Editor.tsx:2017`, `planner-frontend/src/pages/Editor.tsx:2092` | - |
| Navigationsprofile (Pan/Zoom/Orbit/Touch) | vorhanden | `planner-frontend/src/components/editor/NavigationSettingsPanel.tsx:47`, `planner-frontend/src/components/editor/Preview3D.tsx:370` | - |
| Tageslicht/Sonne/Kompass | vorhanden | `planner-api/src/routes/projectEnvironment.ts:140`, `planner-frontend/src/components/editor/DaylightPanel.tsx:128`, `planner-frontend/src/pages/Editor.tsx:2015` | - |
| Skybox/Himmel-Boden als frei konfigurierbare Renderumgebung | teilweise | Tageslichtsystem vorhanden, explizite Skybox-/HDRI-Auswahl nicht nachgewiesen | P2 |
| Wandtransparenz/Dollhouse (automatisches Frontwand-Ausblenden) | teilweise | Sichtbarkeits-API vorhanden (`planner-api/src/routes/visibility.ts:146`), aber kein klarer Auto-Dollhouse-Mechanismus | P1 |
| Selektive Sichtbarkeit (Wand/Bemassung/Objekte) | vorhanden | `planner-frontend/src/components/editor/VisibilityPanel.tsx:37`, `planner-frontend/src/pages/Editor.tsx:1934` | - |

## 4) Ausgabe/Rendering

| Feature | Status | Beleg | Prioritaet |
|---|---|---|---|
| HTML-Viewer + SVG-Exporte | vorhanden | `planner-api/src/routes/viewerExports.ts:162`, `planner-api/src/routes/viewerExports.ts:213`, `planner-api/src/routes/viewerExports.ts:276` | - |
| Renderjobs mit Presets (draft/balanced/best) | vorhanden | `planner-api/src/routes/renderJobs.ts:14`, `planner-api/src/routes/renderJobs.ts:150` | - |
| Panorama/Sharing (Touren) | vorhanden | `planner-api/src/routes/panoramaTours.ts:57`, `planner-frontend/src/pages/PanoramaToursPage.tsx:181` | - |
| Direkter Screenshot-Button aus Editor | teilweise | Exportpfade vorhanden, aber kein expliziter dedizierter Screenshot-Flow nachgewiesen | P2 |
| 360°-Ausgabe als standardisierter Einzel-Export | teilweise | Panorama-Tour-Flow vorhanden, aber kein klarer "Export 360 Datei" Endpoint gefunden | P2 |

## 5) Empfohlene naechste Umsetzung (kurz)

1. `P1`: Interaktive Elevation/Section-View im Editor (nicht nur Sheet/Export).
2. `P1`: Automatische Wandtransparenz/Dollhouse-Regel in 3D je Kamerawinkel.
3. `P1`: Kamera-FOV + gespeicherte Kamerapositionen (Preset-Liste pro Projekt).
4. `P2`: Skybox/HDRI-Auswahl (Himmel/Boden-Style) im Render-/Praesentationsmodus.
5. `P2`: One-click Screenshot und optional 360-Panorama-Dateiexport.
