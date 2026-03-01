import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { importRoutes } from './imports.js'

function createMinimalDxf(): string {
  return [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$INSUNITS',
    '70',
    '4',
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    '0',
    'LINE',
    '5',
    'A1',
    '8',
    'Walls',
    '10',
    '0',
    '20',
    '0',
    '11',
    '1000',
    '21',
    '0',
    '0',
    'ENDSEC',
    '0',
    'EOF',
  ].join('\n')
}

describe('importRoutes', () => {
  it('returns a parsed DXF preview asset', async () => {
    const app = Fastify()
    await app.register(importRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/preview/dxf',
      payload: {
        source_filename: 'preview.dxf',
        dxf: createMinimalDxf(),
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.source_filename).toBe('preview.dxf')
    expect(body.entities).toHaveLength(1)
    expect(body.entities[0]).toMatchObject({
      id: 'A1',
      type: 'line',
    })

    await app.close()
  })

  it('returns a parsed SKP preview model from base64 payloads', async () => {
    const app = Fastify()
    await app.register(importRoutes, { prefix: '/api/v1' })

    const payload = Buffer.from(
      JSON.stringify({
        project_id: 'project-7',
        import_job_id: 'job-7',
        components: [
          {
            name: 'US_60',
            guid: 'guid-1',
            position: { x_mm: 100, y_mm: 200, z_mm: 0 },
            vertices: [
              { x_mm: 0, y_mm: 0, z_mm: 0 },
              { x_mm: 600, y_mm: 0, z_mm: 0 },
              { x_mm: 600, y_mm: 580, z_mm: 720 },
            ],
          },
        ],
      }),
      'utf8',
    ).toString('base64')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/preview/skp',
      payload: {
        source_filename: 'preview.skp',
        file_base64: payload,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.source_filename).toBe('preview.skp')
    expect(body.components).toHaveLength(1)
    expect(body.components[0].mapping.target_type).toBe('cabinet')

    await app.close()
  })
})
