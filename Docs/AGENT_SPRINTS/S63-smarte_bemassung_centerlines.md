# Sprint 63 – Smarte Bemaßung & Centerlines

**Branch:** `feature/sprint-63-smarte-bemassung-centerlines`
**Gruppe:** C (baut auf S59 auf)
**Status:** `done`
**Abhängigkeiten:** Sprint 59 (Dimension-Entity vorhanden)

---

## Ziel

Bemaßungs-Update-Endpunkt; automatische Maßketten-Generierung aus
Möbelplacements; Centerline-Markierungen (Mittellinien) für Placements
im Grundriss-Canvas.

---

## 1. Backend: `PUT /dimensions/:id`

Erlaubt das Überschreiben von `label` und/oder `style` einer bestehenden Bemaßung.

```typescript
// in planner-api/src/routes/dimensions.ts

const UpdateDimensionSchema = z.object({
  label: z.string().max(100).nullable().optional(),
  style: StyleSchema,
})

app.put<{ Params: { id: string } }>('/dimensions/:id', async (request, reply) => {
  const existing = await prisma.dimension.findUnique({ where: { id: request.params.id } })
  if (!existing) return sendNotFound(reply, 'Dimension not found')

  const parsed = UpdateDimensionSchema.safeParse(request.body)
  if (!parsed.success) return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid')

  const updated = await prisma.dimension.update({
    where: { id: request.params.id },
    data: {
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.style !== undefined ? { style: parsed.data.style ?? {} } : {}),
    },
  })
  return reply.send(updated)
})
```

---

## 2. Backend: `POST /rooms/:id/dimensions/smart`

Erzeugt automatisch eine **Maßkette**: pro Wand eine Gesamt-Bemaßung
(außen, `offset_mm: 300`) sowie je eine einzelne Placement-Bemaßung
(innen, `offset_mm: 150`) für jedes Möbelstück auf dieser Wand.

```typescript
// in planner-api/src/routes/dimensions.ts

app.post<{ Params: { id: string } }>('/rooms/:id/dimensions/smart', async (request, reply) => {
  const room = await prisma.room.findUnique({ where: { id: request.params.id } })
  if (!room) return sendNotFound(reply, 'Room not found')

  const boundary = room.boundary as RoomBoundary
  if (!boundary?.wall_segments?.length) {
    return sendBadRequest(reply, 'Room has no boundary')
  }

  const placements = (room.placements as RoomPlacement[] | null) ?? []
  await prisma.dimension.deleteMany({ where: { room_id: request.params.id } })

  const OUTER_OFFSET_MM = 300
  const INNER_OFFSET_MM = 150
  const results: Awaited<ReturnType<typeof prisma.dimension.create>>[] = []

  for (const wall of boundary.wall_segments) {
    const dx = wall.x1_mm - wall.x0_mm
    const dy = wall.y1_mm - wall.y0_mm
    const len = Math.hypot(dx, dy)
    if (len < 50) continue

    const dirX = dx / len
    const dirY = dy / len

    // Gesamt-Wandbemaßung (außen)
    results.push(await prisma.dimension.create({
      data: {
        room_id: request.params.id,
        type: 'linear',
        points: [
          { x_mm: wall.x0_mm, y_mm: wall.y0_mm },
          { x_mm: wall.x1_mm, y_mm: wall.y1_mm },
        ],
        style: { unit: 'mm', offset_mm: OUTER_OFFSET_MM },
        label: null,
      },
    }))

    // Placement-Bemaßungen (innen, nach offset_mm sortiert)
    const wallPlacements = placements
      .filter(p => p.wall_id === wall.id)
      .sort((a, b) => a.offset_mm - b.offset_mm)

    for (const placement of wallPlacements) {
      const startX = wall.x0_mm + dirX * placement.offset_mm
      const startY = wall.y0_mm + dirY * placement.offset_mm
      const endX = wall.x0_mm + dirX * (placement.offset_mm + placement.width_mm)
      const endY = wall.y0_mm + dirY * (placement.offset_mm + placement.width_mm)
      results.push(await prisma.dimension.create({
        data: {
          room_id: request.params.id,
          type: 'linear',
          points: [
            { x_mm: startX, y_mm: startY },
            { x_mm: endX, y_mm: endY },
          ],
          style: { unit: 'mm', offset_mm: INNER_OFFSET_MM },
          label: `${Math.round(placement.width_mm)} mm`,
        },
      }))
    }
  }

  return reply.status(201).send(results)
})
```

---

## 3. Backend Tests (`planner-api/src/routes/dimensions.test.ts` erweitern)

Neue Mindest-Tests (10):

1. `PUT /dimensions/:id` mit Label → 200, label überschrieben
2. `PUT /dimensions/:id` mit style → 200, style geändert
3. `PUT /dimensions/:id` unbekannte ID → 404
4. `PUT /dimensions/:id` ungültiger style (fontSize > 24) → 400
5. `POST /rooms/:id/dimensions/smart` → 201, erstellt Gesamt + Placement-Bemaßungen
6. `POST /rooms/:id/dimensions/smart` unbekannter Raum → 404
7. `POST /rooms/:id/dimensions/smart` Raum ohne boundary → 400
8. `POST /rooms/:id/dimensions/smart` löscht bestehende Bemaßungen vorher
9. `POST /rooms/:id/dimensions/smart` mit zwei Placements → mindestens 3 Dimensionen (1 Wand + 2 Placements)
10. `POST /rooms/:id/dimensions/smart` Wand ohne Placements → nur Gesamt-Bemaßung

---

## 4. Frontend: `dimensionsApi` erweitern

### `planner-frontend/src/api/dimensions.ts`

```typescript
update: (id: string, data: { label?: string | null; style?: CreateDimensionInput['style'] }): Promise<Dimension> =>
  api.put<Dimension>(`/dimensions/${id}`, data),

smartGenerate: (roomId: string): Promise<Dimension[]> =>
  api.post<Dimension[]>(`/rooms/${roomId}/dimensions/smart`, {}),
```

---

## 5. Frontend: Centerlines in `PolygonEditor.tsx`

Neue optionale Props:

```typescript
showCenterlines?: boolean
onToggleCenterlines?: () => void
```

Im `<Layer>`, nach den Bemaßungslinien, vor den Placements, füge ein:

```tsx
{/* Centerlines (Mittellinien der Placements) */}
{state.closed && showCenterlines && (
  <Group>
    {placements.map(placement => {
      const wallIdx = state.wallIds.indexOf(placement.wall_id)
      if (wallIdx < 0 || wallIdx >= pts.length) return null
      const p0 = pts[wallIdx]
      const p1 = pts[(wallIdx + 1) % pts.length]
      const dx = p1.x - p0.x
      const dy = p1.y - p0.y
      const len = Math.hypot(dx, dy)
      if (len === 0) return null
      const dirX = dx / len
      const dirY = dy / len
      const centerOffset = worldToCanvas(placement.offset_mm + placement.width_mm / 2)
      const cx = p0.x + dirX * centerOffset
      const cy = p0.y + dirY * centerOffset
      const TICK_PX = 16
      const nx = -dirY
      const ny = dirX
      return (
        <Line
          key={`cl-${placement.id}`}
          points={[cx - nx * TICK_PX, cy - ny * TICK_PX, cx + nx * TICK_PX, cy + ny * TICK_PX]}
          stroke="#0080ff"
          strokeWidth={1}
          dash={[4, 3]}
          opacity={0.8}
        />
      )
    })}
  </Group>
)}
```

In der Toolbar, nach dem `+ Platzieren`-Button:

```tsx
{state.closed && placements.length > 0 && onToggleCenterlines && (
  <ToolBtn active={showCenterlines ?? false} onClick={onToggleCenterlines}>
    ⊕ Mittellinien
  </ToolBtn>
)}
```

---

## DoD-Checkliste

- [ ] `npx vitest run planner-api/src/routes/dimensions.test.ts` → alle Tests grün (10+ neue + 10 bestehende)
- [ ] `PUT /api/v1/dimensions/:id` aktualisiert Label/Style
- [ ] `POST /api/v1/rooms/:id/dimensions/smart` generiert Gesamt- + Placement-Bemaßungen
- [ ] `dimensionsApi.update()` und `dimensionsApi.smartGenerate()` vorhanden
- [ ] Centerline-Toggle im PolygonEditor sichtbar (wenn Placements vorhanden)
- [ ] Centerlines im Canvas als blaue gestrichelte Linien sichtbar
- [ ] ROADMAP.md Sprint 63 Status → `done`
- [ ] Commit + PR `feature/sprint-63-smarte-bemassung-centerlines`
