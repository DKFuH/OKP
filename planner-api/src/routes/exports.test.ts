import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { exportRoutes } from './exports.js'

function createPayload() {
  return {
    filename: 'kitchen-plan',
    payload: {
      room: {
        boundary: [
          { id: 'v1', x_mm: 0, y_mm: 0, index: 0 },
          { id: 'v2', x_mm: 4000, y_mm: 0, index: 1 },
          { id: 'v3', x_mm: 4000, y_mm: 3000, index: 2 },
          { id: 'v4', x_mm: 0, y_mm: 3000, index: 3 },
        ],
      },
      wallSegments: [
        {
          id: 'wall-1',
          start: { x_mm: 0, y_mm: 0 },
          end: { x_mm: 4000, y_mm: 0 },
          length_mm: 4000,
        },
      ],
      openings: [
        {
          id: 'opening-1',
          wall_id: 'wall-1',
          offset_mm: 800,
          width_mm: 900,
          source: 'manual',
        },
      ],
      furniture: [
        {
          id: 'furniture-1',
          footprintRect: {
            min: { x_mm: 500, y_mm: 500 },
            max: { x_mm: 1100, y_mm: 1100 },
          },
        },
      ],
      includeFurniture: true,
    },
  }
}

describe('exportRoutes', () => {
  it('returns a DXF document as attachment', async () => {
    const app = Fastify()
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dxf',
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.dxf')
    expect(response.headers['content-type']).toContain('application/dxf')
    expect(response.body).toContain('YAKDS_ROOM')
    expect(response.body).toContain('YAKDS_OPENINGS')

    await app.close()
  })

  it('rejects malformed export payloads', async () => {
    const app = Fastify()
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dxf',
      payload: {
        payload: {
          room: { boundary: [] },
          wallSegments: [],
          openings: [],
          furniture: [],
          includeFurniture: true,
        },
      },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })
})
