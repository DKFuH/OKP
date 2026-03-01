import type { Prisma } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { serializeBlockProgram } from '../services/blockProgramService.js'

const ProgramParamsSchema = z.object({
  id: z.string().uuid(),
})

const ProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
})

const BlockTierSchema = z.object({
  min_value: z.number(),
  discount_pct: z.number().min(0).max(100),
})

const BlockConditionSchema = z.object({
  field: z.string().min(1).max(80),
  operator: z.enum(['gte', 'lte', 'eq', 'neq']).default('gte'),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

const BlockProgramBodySchema = z.object({
  name: z.string().min(1).max(120),
  manufacturer: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
  groups: z.array(
    z.object({
      code: z.string().min(1).max(80),
      name: z.string().min(1).max(120),
      item_selector: z.unknown().nullable().optional(),
    }),
  ).default([]),
  conditions: z.array(BlockConditionSchema).default([]),
  definitions: z.array(
    z.object({
      name: z.string().min(1).max(120),
      basis: z.enum(['purchase_price', 'sell_price', 'points']),
      group_code: z.string().min(1).max(80).nullable().optional(),
      sort_order: z.number().int().min(0).default(0),
      tiers: z.array(BlockTierSchema).min(1),
      conditions: z.array(BlockConditionSchema).default([]),
    }),
  ).min(1),
})

async function loadBlockProgram(id: string) {
  return prisma.blockProgram.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { created_at: 'asc' },
      },
      conditions: {
        orderBy: { created_at: 'asc' },
      },
      definitions: {
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
        include: {
          group: true,
          conditions: {
            orderBy: { created_at: 'asc' },
          },
        },
      },
    },
  })
}

async function saveBlockProgram(programId: string | null, payload: z.infer<typeof BlockProgramBodySchema>) {
  const savedProgram = await prisma.$transaction(async (tx) => {
    const program = programId
      ? await tx.blockProgram.update({
          where: { id: programId },
          data: {
            name: payload.name,
            manufacturer: payload.manufacturer ?? null,
            notes: payload.notes ?? null,
            is_active: payload.is_active ?? true,
          },
        })
      : await tx.blockProgram.create({
          data: {
            name: payload.name,
            manufacturer: payload.manufacturer ?? null,
            notes: payload.notes ?? null,
            is_active: payload.is_active ?? true,
          },
        })

    await tx.blockCondition.deleteMany({ where: { program_id: program.id } })
    await tx.blockDefinitionRecord.deleteMany({ where: { program_id: program.id } })
    await tx.blockGroup.deleteMany({ where: { program_id: program.id } })

    const groupIdsByCode = new Map<string, string>()
    for (const group of payload.groups) {
      const createdGroup = await tx.blockGroup.create({
        data: {
          program_id: program.id,
          code: group.code,
          name: group.name,
          item_selector: (group.item_selector ?? null) as Prisma.InputJsonValue | null,
        },
      })

      groupIdsByCode.set(group.code, createdGroup.id)
    }

    if (payload.conditions.length > 0) {
      await tx.blockCondition.createMany({
        data: payload.conditions.map((condition) => ({
          program_id: program.id,
          field: condition.field,
          operator: condition.operator,
          value: condition.value as Prisma.InputJsonValue,
        })),
      })
    }

    for (const definition of payload.definitions) {
      const createdDefinition = await tx.blockDefinitionRecord.create({
        data: {
          program_id: program.id,
          block_group_id: definition.group_code ? (groupIdsByCode.get(definition.group_code) ?? null) : null,
          name: definition.name,
          basis: definition.basis,
          sort_order: definition.sort_order,
          tiers: definition.tiers as Prisma.InputJsonValue,
        },
      })

      if (definition.conditions.length > 0) {
        await tx.blockCondition.createMany({
          data: definition.conditions.map((condition) => ({
            program_id: program.id,
            block_definition_id: createdDefinition.id,
            field: condition.field,
            operator: condition.operator,
            value: condition.value as Prisma.InputJsonValue,
          })),
        })
      }
    }

    return program
  })

  return loadBlockProgram(savedProgram.id)
}

export async function blockRoutes(app: FastifyInstance) {
  app.get('/block-programs', async (_request, reply) => {
    const programs = await prisma.blockProgram.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        groups: {
          orderBy: { created_at: 'asc' },
        },
        conditions: {
          orderBy: { created_at: 'asc' },
        },
        definitions: {
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
          include: {
            group: true,
            conditions: {
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    })

    return reply.send(programs.map(serializeBlockProgram))
  })

  app.post('/block-programs', async (request, reply) => {
    const parsedBody = BlockProgramBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0].message)
    }

    const program = await saveBlockProgram(null, parsedBody.data)
    return reply.status(201).send(program ? serializeBlockProgram(program) : null)
  })

  app.get<{ Params: { id: string } }>('/block-programs/:id', async (request, reply) => {
    const parsedParams = ProgramParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0].message)
    }

    const program = await loadBlockProgram(parsedParams.data.id)
    if (!program) {
      return sendNotFound(reply, 'Block program not found')
    }

    return reply.send(serializeBlockProgram(program))
  })

  app.put<{ Params: { id: string } }>('/block-programs/:id', async (request, reply) => {
    const parsedParams = ProgramParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0].message)
    }

    const parsedBody = BlockProgramBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0].message)
    }

    const existing = await prisma.blockProgram.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true },
    })
    if (!existing) {
      return sendNotFound(reply, 'Block program not found')
    }

    const program = await saveBlockProgram(parsedParams.data.id, parsedBody.data)
    return reply.send(program ? serializeBlockProgram(program) : null)
  })

  app.get<{ Params: { projectId: string } }>('/projects/:projectId/block-evaluations', async (request, reply) => {
    const parsedParams = ProjectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0].message)
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
      select: { id: true },
    })
    if (!project) {
      return sendNotFound(reply, 'Project not found')
    }

    const evaluations = await prisma.projectBlockEvaluation.findMany({
      where: { project_id: parsedParams.data.projectId },
      orderBy: { created_at: 'desc' },
      include: {
        program: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return reply.send(
      evaluations.map((evaluation) => ({
        id: evaluation.id,
        project_id: evaluation.project_id,
        program_id: evaluation.program_id,
        program_name: evaluation.program.name,
        created_at: evaluation.created_at,
        price_summary: evaluation.price_summary,
        evaluations: evaluation.evaluations,
        best_block: evaluation.best_block,
      })),
    )
  })
}
