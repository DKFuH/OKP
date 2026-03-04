# Sprint 68 - Constraint-Modus & Driving Dimensions

**Branch:** `feature/sprint-68-constraints-driving-dims`
**Gruppe:** B (startbar nach S63)
**Status:** `done`
**Abhaengigkeiten:** S63 (Smarte Bemaßung), S60 (Kitchen Assistant), S65 (Cutlist)

---

## Ziel

Ein pragmatischer Constraint-Modus fuer Grundriss- und Planungsgeometrie:
parallel, orthogonal, coincident, symmetry-light und Driving Dimensions
fuer wiederkehrende Kuechenlogik. Kein vollwertiger CAD-Solver, sondern
ein deterministisches Regelset fuer haeufige Tischlerfaelle.

Inspiration: AutoCAD Geometric Constraints, Fusion/Sketch parametric edits.

---

## 1. Datenmodell

Ans Ende von `planner-api/prisma/schema.prisma` anhaengen:

```prisma
enum ConstraintType {
  horizontal
  vertical
  parallel
  perpendicular
  coincident
  equal_length
  symmetry_axis
  driving_dimension
}

model GeometryConstraint {
  id             String         @id @default(uuid())
  tenant_id      String
  room_id        String
  type           ConstraintType
  target_refs    Json           @default("[]")
  value_json     Json           @default("{}")
  enabled        Boolean        @default(true)
  created_at     DateTime       @default(now())
  updated_at     DateTime       @updatedAt

  @@index([tenant_id, room_id])
  @@map("geometry_constraints")
}
```

---

## 2. Backend-Service

Neue Datei: `planner-api/src/services/constraintEngine.ts`

Implementieren:

```ts
export interface ConstraintSolveInput {
  walls: Array<{ id: string; x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }>
  placements: Array<{ id: string; x_mm: number; y_mm: number; rotation_deg?: number | null }>
  constraints: Array<{
    id: string
    type: 'horizontal' | 'vertical' | 'parallel' | 'perpendicular' | 'coincident' | 'equal_length' | 'symmetry_axis' | 'driving_dimension'
    target_refs: Array<{ entity: string; id: string }>
    value_json: Record<string, unknown>
    enabled: boolean
  }>
}

export interface ConstraintSolveResult {
  walls: ConstraintSolveInput['walls']
  placements: ConstraintSolveInput['placements']
  applied: string[]
  warnings: string[]
}

export function solveConstraints(input: ConstraintSolveInput): ConstraintSolveResult
```

Scope V1:

- `horizontal` / `vertical` auf Wall-Segmente
- `parallel` / `perpendicular` fuer zwei Walls
- `coincident` fuer Placement auf Wall-Achse
- `driving_dimension` fuer feste Wandlaenge oder Placement-Abstand
- Konflikte liefern Warnungen, kein harter Fehler

Nicht in V1:

- zyklische Solver-Magie
- numerische Iteration
- Freiformflaechen

---

## 3. API

Neue Route: `planner-api/src/routes/constraints.ts`

Endpoints:

- `GET /rooms/:id/constraints`
- `POST /rooms/:id/constraints`
- `PUT /constraints/:id`
- `DELETE /constraints/:id`
- `POST /rooms/:id/constraints/solve`

`solve` laedt Raumgeometrie, wendet Constraints an und persistiert optional mit `?persist=true`.

---

## 4. Frontend

Neue Dateien:

- `planner-frontend/src/api/constraints.ts`
- `planner-frontend/src/pages/ConstraintsPanel.tsx`

Anpassungen:

- `Editor.tsx` / `RightSidebar.tsx`: neuer Tab `Constraints`
- `PolygonEditor.tsx`: Constraint-Hinweise, Lock-Icons, Hilfsachsen
- `CanvasArea.tsx`: Preview fuer symmetry-axis / driven length

UI-Faelle:

- Wand anklicken -> `horizontal`, `vertical`
- Zwei Waende waehlen -> `parallel`, `perpendicular`
- Placement + Wand -> `coincident`
- Driving-Dimension eingeben -> z.B. `2500 mm`

---

## 5. Tests

Mindestens:

1. `constraintEngine.test.ts`: horizontal richtet Segment exakt aus
2. `constraintEngine.test.ts`: parallel uebernimmt Richtung der Referenzwand
3. `constraintEngine.test.ts`: driving_dimension fixiert Laenge
4. `constraints.test.ts`: CRUD pro Raum
5. `constraints.test.ts`: `solve` liefert `warnings` bei Konflikt

---

## 6. DoD

- Constraint-Modus im Editor verfuegbar
- Walls und Placements koennen einfache Constraints erhalten
- Driving-Dimensions koennen Laengen und Abstaende fixieren
- Solver arbeitet deterministisch und liefert Warnungen statt Absturz
- Cutlist- und Sheet-Logik bleibt mit geaenderter Geometrie kompatibel

---

## 7. Roadmap-Update

- Sprint 68 in `Docs/ROADMAP.md` als `planned` aufnehmen
- `Docs/AGENT_SPRINTS/README.md` um Sprint 68 erweitern
