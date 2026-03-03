# AGENT_SPRINTS - Sprint-Dokumentation

Sprints `S47` bis `S66` sind implementiert und gemergt.
`S67` bis `S70` sind als naechster Backlog fuer GitHub-Agents vorbereitet.

Stand: 2026-03-03

---

## Sprint-Uebersicht

| Sprint | Datei | Status | Commit | Tests |
|--------|-------|--------|--------|-------|
| 47 | `S47-mobile-aufmass.md` | done | `ab83788` | +15 |
| 48 | `S48-erp-connector.md` | done | `ab83788` | +10 |
| 49 | `S49-analytics-reports.md` | done | `ab83788` | +15 |
| 50 | `S50-compliance-rbac.md` | done | `ab83788` | +12 |
| 51 | `S51-gltf-export.md` | done | `ab83788` | +5 |
| 52 | `S52-ifc-import-export.md` | done | `a7f8758` | +10 |
| 53 | `S53-dwg-skp.md` | done | `b4e7db7` | +12 |
| 54 | `S54-ofml-konfigurator.md` | done | `b4e7db7` | +22 |
| 55 | `S55-raumakustik.md` | done | `27f3f69` | +14 |
| 56 | `S56-canvas-ux.md` | done | `ab83788` | Frontend |
| 57 | `S57-wall-attachments.md` | done | `def4c96` | +5 |
| 58 | `S58-bild-nachzeichnen.md` | done | `411028b` | +3 |
| 59 | `S59-bemassung-frontansicht.md` | done | `299276a` | +10 |
| 60 | `S60-katalog-kitchen-assistant.md` | done | `299276a` | +15 |
| 61 | `S61-angebots-pdf-firmenprofil.md` | done | `584ee9b` | +8 |
| 62 | `S62-mcp-planungsassistent.md` | done | `8de198f` | +26 |
| 63 | `S63-smarte-bemassung-centerlines.md` | done | `f396864` | +53 |
| 64 | `S64-layout-sheets-detail-views.md` | done | `4ad81e3` | +10 |
| 65 | `S65-zuschnittliste-cutlist.md` | done | `6b7b81c` | +11 |
| 66 | `S66-cnc-nesting-dxf-export.md` | done | `24f4cbc` | +16 |

---

## Technische Rahmenbedingungen

- **Backend:** Fastify v5, Prisma 5, Zod, TypeScript, Vitest
- **Frontend:** React 18, React Router v6, CSS Modules, Konva
- **API-Prefix:** `/api/v1`
- **Error-Helpers:** `sendBadRequest(reply, msg)`, `sendNotFound(reply, msg)` aus `../errors.js`
- **Prisma-Client:** `import { prisma } from '../db.js'`
- **API-Client (Frontend):** `import { api } from './client.js'`

---

## Vorbereiteter Backlog

| Sprint | Datei | Status | Thema |
|--------|-------|--------|-------|
| 67 | `S67-annotative-layout-styles.md` | planned | Annotative Layout-Stile, massstabsstabile Masse und Symbole |
| 68 | `S68-constraint-modus-driving-dimensions.md` | planned | Constraint-Modus und Driving Dimensions fuer Waende und Placements |
| 69 | `S69-panorama-multipoint-client-tour.md` | planned | Multi-Point-Panorama und oeffentliche Client-Touren |
| 70 | `S70-spezifikationsblaetter-werkstattpaket.md` | planned | Spezifikationsblaetter und Werkstattpakete aus Quote, BOM, Cutlist und Nesting |
