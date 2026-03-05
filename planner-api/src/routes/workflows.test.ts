import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '11111111-1111-1111-1111-111111111111'
const DEFINITION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const INSTANCE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROJECT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const graph = {
  nodes: [
    { id: 'lead', label: 'Lead', is_start: true },
    { id: 'quoted', label: 'Quoted' },
    { id: 'production', label: 'Production', is_terminal: true },
  ],
  transitions: [
    { from: 'lead', to: 'quoted', label: 'Prepare quote' },
    {
      from: 'quoted',
      to: 'production',
      label: 'Release production',
      guard: {
        type: 'project_status_equals',
        equals: 'quoted',
      },
    },
  ],
}

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    workflowDefinition: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    workflowInstance: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    workflowEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { workflowRoutes } from './workflows.js'

function makeApp() {
  const app = Fastify()
  app.register(workflowRoutes, { prefix: '/api/v1' })
  return app
}

function authHeaders() {
  return {
    'x-tenant-id': TENANT_ID,
    'x-user-id': USER_ID,
  }
}

describe('workflowRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a workflow definition', async () => {
    prismaMock.workflowDefinition.create.mockResolvedValue({
      id: DEFINITION_ID,
      tenant_id: TENANT_ID,
      name: 'Lead Flow',
      version: 1,
      is_active: false,
      graph_json: graph,
    })

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workflow/definitions',
      headers: authHeaders(),
      payload: {
        name: 'Lead Flow',
        graph,
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      id: DEFINITION_ID,
      name: 'Lead Flow',
    })

    await app.close()
  })

  it('publishes a workflow definition and deactivates older versions', async () => {
    prismaMock.workflowDefinition.findFirst.mockResolvedValue({
      id: DEFINITION_ID,
      tenant_id: TENANT_ID,
      name: 'Lead Flow',
      is_active: false,
    })
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      workflowDefinition: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({
          id: DEFINITION_ID,
          is_active: true,
        }),
      },
    }))

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/definitions/${DEFINITION_ID}/publish`,
      headers: authHeaders(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: DEFINITION_ID,
      is_active: true,
    })

    await app.close()
  })

  it('creates a workflow instance on the start node', async () => {
    prismaMock.workflowDefinition.findFirst.mockResolvedValue({
      id: DEFINITION_ID,
      tenant_id: TENANT_ID,
      is_active: true,
      graph_json: graph,
    })
    prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      workflowInstance: {
        create: vi.fn().mockResolvedValue({
          id: INSTANCE_ID,
          current_node_id: 'lead',
          definition_id: DEFINITION_ID,
        }),
      },
      workflowEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event-1' }),
      },
    }))

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workflow/instances',
      headers: authHeaders(),
      payload: {
        definition_id: DEFINITION_ID,
        entity_type: 'project',
        entity_id: PROJECT_ID,
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      id: INSTANCE_ID,
      current_node_id: 'lead',
    })

    await app.close()
  })

  it('rejects transition when guard fails', async () => {
    prismaMock.workflowInstance.findFirst.mockResolvedValue({
      id: INSTANCE_ID,
      tenant_id: TENANT_ID,
      current_node_id: 'quoted',
      entity_type: 'project',
      entity_id: PROJECT_ID,
      definition: {
        graph_json: graph,
      },
    })
    prismaMock.project.findFirst.mockResolvedValue({ project_status: 'planning' })

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/instances/${INSTANCE_ID}/transition`,
      headers: authHeaders(),
      payload: {
        to_node_id: 'production',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: 'CONFLICT' })

    await app.close()
  })

  it('transitions instance and persists event when guard passes', async () => {
    prismaMock.workflowInstance.findFirst.mockResolvedValue({
      id: INSTANCE_ID,
      tenant_id: TENANT_ID,
      current_node_id: 'quoted',
      entity_type: 'project',
      entity_id: PROJECT_ID,
      definition: {
        graph_json: graph,
      },
    })
    prismaMock.project.findFirst.mockResolvedValue({ project_status: 'quoted' })

    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      workflowInstance: {
        update: vi.fn().mockResolvedValue({
          id: INSTANCE_ID,
          current_node_id: 'production',
          finished_at: '2026-03-05T08:00:00.000Z',
        }),
      },
      workflowEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event-2' }),
      },
    }))

    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/instances/${INSTANCE_ID}/transition`,
      headers: authHeaders(),
      payload: {
        to_node_id: 'production',
        reason: 'Quote approved',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: INSTANCE_ID,
      current_node_id: 'production',
    })

    await app.close()
  })

  it('lists workflow events for an instance', async () => {
    prismaMock.workflowInstance.findFirst.mockResolvedValue({ id: INSTANCE_ID })
    prismaMock.workflowEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        instance_id: INSTANCE_ID,
        from_node_id: null,
        to_node_id: 'lead',
      },
    ])

    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/workflow/instances/${INSTANCE_ID}/events`,
      headers: authHeaders(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
    expect(response.json()[0]).toMatchObject({ id: 'event-1' })

    await app.close()
  })
})
