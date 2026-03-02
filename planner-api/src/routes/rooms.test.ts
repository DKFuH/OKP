import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const roomId = '33333333-3333-3333-3333-333333333333'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { roomRoutes } from './rooms.js'

describe('roomRoutes reference image', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.room.findUnique.mockResolvedValue({ id: roomId })
    prismaMock.room.update.mockImplementation(async ({ data }: { data: { reference_image: unknown } }) => ({
      id: roomId,
      reference_image: data.reference_image,
    }))
  })

  it('stores reference image via PUT /rooms/:id/reference-image', async () => {
    const app = Fastify()
    await app.register(roomRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/rooms/${roomId}/reference-image`,
      payload: {
        url: 'https://example.com/floorplan.png',
        x: 40,
        y: 80,
        rotation: 0,
        scale: 1,
        opacity: 0.5,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: roomId },
      data: {
        reference_image: {
          url: 'https://example.com/floorplan.png',
          x: 40,
          y: 80,
          rotation: 0,
          scale: 1,
          opacity: 0.5,
        },
      },
    })

    await app.close()
  })

  it('returns 400 for invalid URL in PUT /rooms/:id/reference-image', async () => {
    const app = Fastify()
    await app.register(roomRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/rooms/${roomId}/reference-image`,
      payload: {
        url: 'not-a-valid-url',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.room.update).not.toHaveBeenCalled()

    await app.close()
  })

  it('clears reference image via DELETE /rooms/:id/reference-image', async () => {
    const app = Fastify()
    await app.register(roomRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/rooms/${roomId}/reference-image`,
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: roomId },
      data: { reference_image: null },
    })

    await app.close()
  })
})
