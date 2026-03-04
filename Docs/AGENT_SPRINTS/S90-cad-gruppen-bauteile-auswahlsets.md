# Sprint 90 - CAD-Gruppen, Bauteile & Auswahlsets

**Branch:** `feature/sprint-90-cad-groups-selection-sets`
**Gruppe:** A (startbar nach S81, sinnvoll nach S88)
**Status:** `planned`
**Abhaengigkeiten:** S63 (Centerlines/Bemaßung), S81 (Levels), S88 (Locking)

---

## Ziel

CAD-artiges Arbeiten mit Gruppen, Bauteilen und Auswahlsets:
Zeichnungsmodelle, Bauteile, Maßgruppen oder Objektbloecke koennen logisch
zusammengefasst, gemeinsam transformiert, gelockt, ein-/ausgeblendet und
wiederverwendet werden.

Leitidee: gruppierbare Zeichnungselemente, Bauteile und Auswahlsets fuer CAD-artige Arbeitslogik.

---

## 1. Datenmodell

Ans Ende von `planner-api/prisma/schema.prisma` anhaengen:

```prisma
model DrawingGroup {
  id            String   @id @default(uuid())
  tenant_id     String
  project_id    String
  name          String   @db.VarChar(140)
  kind          String   @db.VarChar(40)
  members_json  Json
  config_json   Json     @default("{}")
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@index([tenant_id, project_id, kind])
  @@map("drawing_groups")
}
```

`kind` V1:

- `selection_set`
- `drawing_group`
- `component`
- `annotation_group`

---

## 2. Backend

Neue Dateien:

- `planner-api/src/routes/drawingGroups.ts`
- `planner-api/src/services/groupTransformService.ts`

Endpoints:

- `GET /projects/:id/drawing-groups`
- `POST /projects/:id/drawing-groups`
- `PATCH /drawing-groups/:id`
- `DELETE /drawing-groups/:id`
- `POST /drawing-groups/:id/apply-transform`

Funktionen:

- Gruppen definieren und persistieren
- Batch-Transform auf Mitglieder
- Auswahlsets speichern und wiederherstellen
- Lock-/Visibility-Integration aus `S88`

---

## 3. Frontend

Neue oder angepasste Dateien:

- `planner-frontend/src/api/drawingGroups.ts`
- `planner-frontend/src/components/editor/GroupsPanel.tsx`
- Anpassungen in `CanvasArea.tsx`, `PolygonEditor.tsx`, `RightSidebar.tsx`

Funktionen:

- selektierte Elemente gruppieren/entgruppieren
- Auswahlset speichern
- Gruppe gemeinsam verschieben, drehen, sperren, ausblenden
- Highlight aller Mitglieder einer Gruppe
- einfache Komponentenlogik fuer wiederkehrende Bauteile

---

## 4. Deliverables

- `DrawingGroup` plus Migration
- Gruppen- und Auswahlset-CRUD
- Batch-Transform-Service
- GroupsPanel im Editor
- Lock-/Visibility-Verzahnung
- 10-16 Tests

---

## 5. DoD

- Nutzer kann Zeichnungselemente zu Gruppen und Auswahlsets zusammenfassen
- Gruppen lassen sich gemeinsam transformieren
- Gruppen koennen gesperrt und ausgeblendet werden
- wiederkehrende Bauteilbloecke lassen sich schneller bearbeiten
