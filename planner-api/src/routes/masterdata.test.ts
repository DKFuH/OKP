import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const RECORD_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CONFLICT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    masterCustomer: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    masterSupplier: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    masterLocation: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    masterSyncSubscription: {
      upsert: vi.fn(),
    },
    masterSyncCheckpoint: {
      upsert: vi.fn(),
    },
    masterSyncConflict: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { tenantMiddleware } from '../tenantMiddleware.js'
import { masterdataRoutes } from './masterdata.js'

function makeApp() {
  const app = Fastify()
  app.register(async (instance) => {
    await tenantMiddleware(instance)
    await masterdataRoutes(instance)
  })
  return app
}

describe('masterdataRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.masterCustomer.findMany.mockResolvedValue([])
    prismaMock.masterSupplier.findMany.mockResolvedValue([])
    prismaMock.masterLocation.findMany.mockResolvedValue([])
    prismaMock.masterSyncConflict.findMany.mockResolvedValue([])
  })

  it('creates customer masterdata record in tenant scope', async () => {
    prismaMock.masterCustomer.create.mockResolvedValue({
      id: RECORD_ID,
      tenant_id: TENANT_ID,
      external_ref: 'C-100',
      payload_json: { name: 'Muster GmbH' },
      version: 1,
      is_deleted: false,
    })

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/masterdata/customers',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        external_ref: 'C-100',
        payload_json: { name: 'Muster GmbH' },
      },
    })

    expect(response.statusCode).toBe(201)
    expect(prismaMock.masterCustomer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: TENANT_ID,
        external_ref: 'C-100',
        version: 1,
      }),
    })

    await app.close()
  })

  it('returns 409 and writes conflict when expected version mismatches', async () => {
    prismaMock.masterCustomer.findFirst.mockResolvedValue({
      id: RECORD_ID,
      tenant_id: TENANT_ID,
      version: 3,
      external_ref: 'C-100',
      payload_json: { name: 'Muster GmbH' },
      is_deleted: false,
      updated_at: new Date('2026-03-05T09:00:00.000Z'),
    })

    const app = makeApp()
    const response = await app.inject({
      method: 'PATCH',
      url: `/masterdata/customers/${RECORD_ID}`,
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        expected_version: 2,
        payload_json: { name: 'Muster GmbH Neu' },
      },
    })

    expect(response.statusCode).toBe(409)
    expect(prismaMock.masterSyncConflict.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: TENANT_ID,
        entity_type: 'customer',
        entity_id: RECORD_ID,
        expected_version: 2,
        actual_version: 3,
      }),
    })

    await app.close()
  })

  it('updates masterdata record and increments version when expected version matches', async () => {
    prismaMock.masterCustomer.findFirst.mockResolvedValue({
      id: RECORD_ID,
      tenant_id: TENANT_ID,
      version: 3,
      external_ref: 'C-100',
      payload_json: { name: 'Muster GmbH' },
      is_deleted: false,
      updated_at: new Date('2026-03-05T09:00:00.000Z'),
    })
    prismaMock.masterCustomer.update.mockResolvedValue({
      id: RECORD_ID,
      version: 4,
      external_ref: 'C-100',
      payload_json: { name: 'Muster GmbH Neu' },
      is_deleted: false,
    })

    const app = makeApp()
    const response = await app.inject({
      method: 'PATCH',
      url: `/masterdata/customers/${RECORD_ID}`,
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        expected_version: 3,
        payload_json: { name: 'Muster GmbH Neu' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.masterCustomer.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: expect.objectContaining({
        version: 4,
      }),
    })

    await app.close()
  })

  it('returns aggregated delta changes with cursor', async () => {
    prismaMock.masterCustomer.findMany.mockResolvedValue([
      {
        id: 'c-1',
        tenant_id: TENANT_ID,
        external_ref: 'C-1',
        payload_json: { name: 'Customer 1' },
        version: 1,
        is_deleted: false,
        created_at: new Date('2026-03-05T09:00:00.000Z'),
        updated_at: new Date('2026-03-05T09:00:00.000Z'),
      },
    ])
    prismaMock.masterSupplier.findMany.mockResolvedValue([
      {
        id: 's-1',
        tenant_id: TENANT_ID,
        external_ref: 'S-1',
        payload_json: { name: 'Supplier 1' },
        version: 2,
        is_deleted: false,
        created_at: new Date('2026-03-05T09:01:00.000Z'),
        updated_at: new Date('2026-03-05T09:01:00.000Z'),
      },
    ])
    prismaMock.masterLocation.findMany.mockResolvedValue([])

    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/masterdata/sync/delta?cursor=2026-03-05T08:00:00.000Z&limit=10',
      headers: { 'x-tenant-id': TENANT_ID },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      cursor: '2026-03-05T08:00:00.000Z',
    })
    expect(response.json().changes).toHaveLength(2)

    await app.close()
  })

  it('acks sync cursor and upserts subscription/checkpoint', async () => {
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      masterSyncSubscription: {
        upsert: vi.fn().mockResolvedValue({
          id: 'sub-1',
          tenant_id: TENANT_ID,
          target_system: 'studio-app',
        }),
      },
      masterSyncCheckpoint: {
        upsert: vi.fn().mockResolvedValue({
          id: 'cp-1',
          tenant_id: TENANT_ID,
          target_system: 'studio-app',
        }),
      },
    }))

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/masterdata/sync/ack',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        target_system: 'studio-app',
        last_sync_cursor: '2026-03-05T09:20:00.000Z',
        scope_json: { branch: 'north' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      subscription: expect.objectContaining({ target_system: 'studio-app' }),
      checkpoint: expect.objectContaining({ target_system: 'studio-app' }),
    })

    await app.close()
  })

  it('resolves sync conflict in tenant scope', async () => {
    prismaMock.masterSyncConflict.findFirst.mockResolvedValue({
      id: CONFLICT_ID,
      tenant_id: TENANT_ID,
      status: 'open',
    })
    prismaMock.masterSyncConflict.update.mockResolvedValue({
      id: CONFLICT_ID,
      tenant_id: TENANT_ID,
      status: 'resolved',
      resolved_by: 'ops-user',
    })

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: `/masterdata/sync/conflicts/${CONFLICT_ID}/resolve`,
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        resolution: 'resolved',
        resolved_by: 'ops-user',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: CONFLICT_ID,
      status: 'resolved',
    })

    await app.close()
  })
})
