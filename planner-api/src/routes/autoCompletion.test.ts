import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'
const ROOM_ID = '22222222-2222-2222-2222-222222222222'

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    rebuild: vi.fn(),
    list: vi.fn(),
  },
}))

vi.mock('../services/autoCompletionService.js', () => ({
  AutoCompletionService: serviceMock,
}))

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn() },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { autoCompletionRoutes } from './autoCompletion.js'

describe('autoCompletionRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST auto-complete triggers rebuild and returns summary', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      project_id: PROJECT_ID,
      placements: [
        { id: 'p-1', wall_id: 'w-1', offset_mm: 0, width_mm: 600, depth_mm: 600, height_mm: 720, type: 'base' },
      ],
    })

    serviceMock.rebuild.mockResolvedValue({
      project_id: PROJECT_ID,
      room_id: ROOM_ID,
      deleted: 1,
      created: 2,
      items: [
        { type: 'worktop', label: 'Arbeitsplatte (Wand w-1)', qty: 1200, unit: 'mm' },
      ],
    })

    const app = Fastify()
    await app.register(autoCompletionRoutes, { prefix: '/api/v1' })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${PROJECT_ID}/rooms/${ROOM_ID}/auto-complete`,
      payload: { worktopOverhangFront_mm: 20 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ project_id: PROJECT_ID, room_id: ROOM_ID, created: 2 })
    expect(serviceMock.rebuild).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('GET auto-complete lists generated items', async () => {
    serviceMock.list.mockResolvedValue([
      { id: 'gi-1', item_type: 'worktop', label: 'Arbeitsplatte (Wand w-1)', qty: 1200, unit: 'mm', source_links: [] },
    ])

    const app = Fastify()
    await app.register(autoCompletionRoutes, { prefix: '/api/v1' })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${PROJECT_ID}/rooms/${ROOM_ID}/auto-complete`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(expect.arrayContaining([expect.objectContaining({ item_type: 'worktop' })]))
    expect(serviceMock.list).toHaveBeenCalledWith(PROJECT_ID, ROOM_ID)
    await app.close()
  })
})
