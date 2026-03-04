import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const roomId = '11111111-1111-1111-1111-111111111111'
const levelId = '22222222-2222-2222-2222-222222222222'
const sectionLineId = '33333333-3333-3333-3333-333333333333'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { annotationRoutes } from './annotations.js'

async function createApp() {
  const app = Fastify()
  await app.register(annotationRoutes, { prefix: '/api/v1' })
  return app
}

describe('annotationRoutes section-lines', () => {
  let sectionLines: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.clearAllMocks()
    sectionLines = [
      {
        id: sectionLineId,
        room_id: roomId,
        start: { x_mm: 0, y_mm: 0 },
        end: { x_mm: 1000, y_mm: 0 },
        label: 'S-A',
        level_scope: 'single_level',
        level_id: levelId,
        direction: 'both',
      },
    ]

    prismaMock.room.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id !== roomId) return null
      return {
        id: roomId,
        section_lines: sectionLines,
        measure_lines: [],
        comments: [],
      }
    })

    prismaMock.room.update.mockImplementation(async ({ data }: { data: { section_lines?: Array<Record<string, unknown>> } }) => {
      sectionLines = data.section_lines ?? sectionLines
      return {
        id: roomId,
        section_lines: sectionLines,
      }
    })
  })

  it('creates section line with extended metadata', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/section-lines`,
      payload: {
        id: '44444444-4444-4444-4444-444444444444',
        start: { x_mm: 0, y_mm: 500 },
        end: { x_mm: 2000, y_mm: 500 },
        label: 'S-B',
        level_scope: 'single_level',
        level_id: levelId,
        depth_mm: 1800,
        direction: 'left',
        sheet_visibility: 'sheet_only',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      id: '44444444-4444-4444-4444-444444444444',
      level_scope: 'single_level',
      level_id: levelId,
      depth_mm: 1800,
      direction: 'left',
      sheet_visibility: 'sheet_only',
      room_id: roomId,
    })

    await app.close()
  })

  it('rejects single_level payload without level_id', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/section-lines`,
      payload: {
        start: { x_mm: 0, y_mm: 100 },
        end: { x_mm: 2000, y_mm: 100 },
        level_scope: 'single_level',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })

    await app.close()
  })

  it('updates existing section line and allows resetting level fields', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/rooms/${roomId}/section-lines/${sectionLineId}`,
      payload: {
        label: 'S-A-Updated',
        level_scope: 'room_level',
        level_id: null,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: sectionLineId,
      label: 'S-A-Updated',
      level_scope: 'room_level',
    })
    expect(response.json().level_id).toBeUndefined()

    await app.close()
  })

  it('deletes existing section line', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/rooms/${roomId}/section-lines/${sectionLineId}`,
    })

    expect(response.statusCode).toBe(204)
    expect(sectionLines).toHaveLength(0)

    await app.close()
  })
})
