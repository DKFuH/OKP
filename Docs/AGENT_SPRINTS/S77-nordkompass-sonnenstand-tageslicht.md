# Sprint 77 - Nordkompass, Sonnenstand & Tageslicht

**Branch:** `feature/sprint-77-sun-compass-daylight`
**Gruppe:** A (startbar nach S74)
**Status:** `planned`
**Abhaengigkeiten:** S14 (3D-Preview), S67 (Layout-Styles), S76 (Praesentationsmodus)

---

## Ziel

Grundriss, 3D-Preview und Praesentationsmodus um Nordrichtung, Geolokation
und einfachen Sonnenstand erweitern. Damit werden Tageslichtwirkung,
Fensterorientierung und Schatten glaubwuerdig und im Plan dokumentierbar.

Inspiration: Sweet Home 3D Compass, Sunlight by time of day and location.

---

## 1. Datenmodell

Ans Ende von `planner-api/prisma/schema.prisma` anhaengen:

```prisma
model ProjectEnvironment {
  id                 String   @id @default(uuid())
  tenant_id          String
  project_id         String   @unique
  north_angle_deg    Float    @default(0)
  latitude           Float?
  longitude          Float?
  timezone           String?  @db.VarChar(60)
  default_datetime   DateTime?
  daylight_enabled   Boolean  @default(true)
  config_json        Json     @default("{}")
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  @@index([tenant_id, project_id])
  @@map("project_environments")
}
```

---

## 2. Backend

Neue Dateien:

- `planner-api/src/routes/projectEnvironment.ts`
- `planner-api/src/services/sunPositionService.ts`

Endpoints:

- `GET /projects/:id/environment`
- `PUT /projects/:id/environment`
- `POST /projects/:id/environment/sun-preview`

Service:

- Sonnenstand aus Datum, Uhrzeit, Laengengrad und Breitengrad berechnen
- Nordrotation auf Grundriss und 3D-View abbilden
- leichte Preview-Daten liefern: Sonnenrichtung, Elevation, Intensitaet

---

## 3. Frontend

Neue oder angepasste Dateien:

- `planner-frontend/src/api/projectEnvironment.ts`
- `planner-frontend/src/components/editor/CompassOverlay.tsx`
- `planner-frontend/src/components/editor/DaylightPanel.tsx`
- Anpassungen in `CanvasArea.tsx`, `Preview3D.tsx`, `LayoutSheetTabs.tsx`

Funktionen:

- Nordkompass im Grundriss
- Slider oder Zeitwaehler fuer Tageszeit
- Datum/Uhrzeit/Ort im Projekt speichern
- 3D-Schatten und Sonnenrichtung aktualisieren
- Nordpfeil optional in Layout-Sheets anzeigen

---

## 4. Deliverables

- `ProjectEnvironment` plus Migration
- Kompass-/Sonnenstands-API
- Grundriss-Kompass
- Tageslichtpanel fuer 3D/Praesentation
- Nordpfeil in Sheets
- 10-14 Tests

---

## 5. DoD

- Nutzer kann Nordrichtung pro Projekt definieren
- Sonnenstand reagiert auf Ort und Tageszeit
- 3D-Preview zeigt sichtbare Aenderungen in Schatten/Licht
- Nordpfeil kann in Zeichnungsblaettern eingeblendet werden

