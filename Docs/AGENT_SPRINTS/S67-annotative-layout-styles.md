# Sprint 67 - Annotative Layout-Styles & Massstabslogik

**Branch:** `feature/sprint-67-annotative-layout-styles`
**Gruppe:** A (startbar nach S64)
**Status:** `done`
**Abhaengigkeiten:** S59 (Bemaßung), S64 (Layout-Sheets & Detail-Views)

---

## Ziel

Masse, Texte, Symbole und Centerlines sollen in Zeichnungsblaettern
massstabsstabil bleiben. Der Nutzer definiert Papier-/Plot-Stile einmal,
und Floorplan-, Detail- und Schnittansichten rendern lesbar ohne
manuelle Textgroessen-Korrektur pro View.

Inspiration: AutoCAD Annotative Objects, pCon.planner Dimension Styles.

---

## 1. Datenmodell

Ans Ende von `planner-api/prisma/schema.prisma` anhaengen:

```prisma
model LayoutStylePreset {
  id                 String   @id @default(uuid())
  tenant_id          String
  name               String   @db.VarChar(120)
  text_height_mm     Float    @default(3.5)
  arrow_size_mm      Float    @default(2.5)
  line_width_mm      Float    @default(0.25)
  centerline_dash_mm Float    @default(6)
  symbol_scale_mm    Float    @default(10)
  font_family        String?  @db.VarChar(120)
  config_json        Json     @default("{}")
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  @@index([tenant_id])
  @@map("layout_style_presets")
}
```

Zusatz in `LayoutSheet.config`:

```json
{
  "style_preset_id": "...",
  "sheet_scale": "1:20",
  "annotative_mode": true
}
```

Migration:

- Neue Tabelle `layout_style_presets`
- Keine Rewrite-Migration bestehender Layout-Daten

---

## 2. Backend-Service

Neue Datei: `planner-api/src/services/layoutStyleResolver.ts`

Implementieren:

```ts
export interface AnnotativeStyleInput {
  sheet_scale: string
  preset: {
    text_height_mm: number
    arrow_size_mm: number
    line_width_mm: number
    centerline_dash_mm: number
    symbol_scale_mm: number
  }
}

export interface ResolvedAnnotativeStyle {
  text_px: number
  arrow_px: number
  stroke_px: number
  centerline_dash_px: number[]
  symbol_px: number
}

export function resolveAnnotativeStyle(input: AnnotativeStyleInput): ResolvedAnnotativeStyle
```

Regeln:

- Papiermasse werden ueber den Sheet-Scale in Canvas-/SVG-Pixel uebersetzt
- Gueltige Scales: `1:10`, `1:20`, `1:25`, `1:50`
- Fallback bei unbekanntem Scale: `1:20`
- Ein einzelner Preset muss fuer Floorplan, Detail und Section konsistent sein

---

## 3. API

Neue Route: `planner-api/src/routes/layoutStyles.ts`

Endpoints:

- `GET /tenant/layout-styles`
- `POST /tenant/layout-styles`
- `PUT /tenant/layout-styles/:id`
- `DELETE /tenant/layout-styles/:id`
- `POST /layout-sheets/:id/preview-style`

`preview-style` liefert berechnete Pixelwerte fuer Text, Pfeile, Linien und Symbole.

---

## 4. Frontend

Neue Dateien:

- `planner-frontend/src/api/layoutStyles.ts`
- `planner-frontend/src/pages/LayoutStylesPage.tsx`

Anpassungen:

- `LayoutSheetsPage.tsx`: Style-Preset pro Blatt waehlen
- `CanvasArea.tsx` / Layout-Renderer: Masse, Labels und Centerlines mit annotativer Aufloesung rendern
- `main.tsx`: Route `/settings/layout-styles`
- `SettingsPage.tsx`: Link auf Layout-Stile

UI:

- Liste der Presets
- Formular: Textgroesse, Pfeilgroesse, Linienstaerke, Dash-Muster
- Live-Vorschau fuer `1:20`, `1:25`, `1:50`

---

## 5. Tests

Mindestens:

1. `layoutStyleResolver.test.ts`: `1:20` -> stabile Umrechnung
2. `layoutStyleResolver.test.ts`: unbekannter Scale -> Fallback `1:20`
3. `layoutStyles.test.ts`: CRUD pro Tenant
4. `layoutStyles.test.ts`: `preview-style` gibt berechnete Werte zurueck
5. Frontend: Preset kann Blatt zugewiesen werden

---

## 6. DoD

- Layout-Stile sind tenantfaehig speicherbar
- Ein Sheet kann ein Style-Preset und einen Scale referenzieren
- Dimensionen und Labels bleiben in unterschiedlichen Sheet-Scales lesbar
- Detail- und Schnitt-Views verwenden dieselbe annotative Logik
- Tests gruen

---

## 7. Roadmap-Update

- Sprint 67 in `Docs/ROADMAP.md` als `planned` aufnehmen
- `Docs/AGENT_SPRINTS/README.md` um Sprint 67 erweitern
