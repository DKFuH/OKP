import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { lookupPrice, type PropertyDefinition, type PropertyValues, validatePropertyCombination } from '../services/ofmlEngine.js'

const PropertySchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(['enum', 'dimension', 'boolean']),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  depends_on: z.record(z.array(z.string())).optional(),
  sort_order: z.number().int().min(0).optional(),
})

const PropertyValuesSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))

function toPropertyDefinitions(
  properties: Array<{
    key: string
    type: string
    options: unknown
    depends_on: unknown
  }>,
): PropertyDefinition[] {
  return properties.map((property) => {
    const options = Array.isArray(property.options)
      ? property.options
          .filter((option): option is { value: string; label: string } => {
            if (!option || typeof option !== 'object') {
              return false
            }
            const candidate = option as Record<string, unknown>
            return typeof candidate.value === 'string' && typeof candidate.label === 'string'
          })
      : []

    const dependsOnSource = property.depends_on
    const dependsOn =
      dependsOnSource && typeof dependsOnSource === 'object' && !Array.isArray(dependsOnSource)
        ? Object.entries(dependsOnSource as Record<string, unknown>).reduce<Record<string, string[]>>((result, [key, value]) => {
            if (Array.isArray(value)) {
              const allowedValues = value
                .filter((entry): entry is string => typeof entry === 'string')
              if (allowedValues.length > 0) {
                result[key] = allowedValues
              }
            }
            return result
          }, {})
        : {}

    return {
      key: property.key,
      type: property.type,
      options,
      depends_on: dependsOn,
    }
  })
}

async function ensureArticleExists(articleId: string) {
  return prisma.catalogArticle.findUnique({ where: { id: articleId }, select: { id: true } })
}

export async function articleConfiguratorRoutes(app: FastifyInstance) {
  app.post<{ Params: { articleId: string } }>(
    '/catalog-articles/:articleId/properties',
    async (request, reply) => {
      const parsed = PropertySchema.safeParse(request.body)
      if (!parsed.success) {
        return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid request body')
      }

      const article = await ensureArticleExists(request.params.articleId)
      if (!article) {
        return sendNotFound(reply, 'Article not found')
      }

      const property = await prisma.catalogArticleProperty.create({
        data: {
          article_id: request.params.articleId,
          key: parsed.data.key,
          label: parsed.data.label,
          type: parsed.data.type,
          options: parsed.data.options ?? [],
          depends_on: parsed.data.depends_on ?? {},
          sort_order: parsed.data.sort_order ?? 0,
        },
      })

      return reply.status(201).send(property)
    },
  )

  app.get<{ Params: { articleId: string } }>(
    '/catalog-articles/:articleId/properties',
    async (request, reply) => {
      const article = await ensureArticleExists(request.params.articleId)
      if (!article) {
        return sendNotFound(reply, 'Article not found')
      }

      const properties = await prisma.catalogArticleProperty.findMany({
        where: { article_id: request.params.articleId },
        orderBy: { sort_order: 'asc' },
      })
      return reply.send(properties)
    },
  )

  app.delete<{ Params: { articleId: string; propertyId: string } }>(
    '/catalog-articles/:articleId/properties/:propertyId',
    async (request, reply) => {
      const property = await prisma.catalogArticleProperty.findUnique({
        where: { id: request.params.propertyId },
      })

      if (!property || property.article_id !== request.params.articleId) {
        return sendNotFound(reply, 'Property not found')
      }

      await prisma.catalogArticleProperty.delete({ where: { id: request.params.propertyId } })
      return reply.status(204).send()
    },
  )

  app.post<{ Params: { articleId: string } }>(
    '/catalog-articles/:articleId/validate-configuration',
    async (request, reply) => {
      const schema = z.object({ values: PropertyValuesSchema })
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        return sendBadRequest(reply, 'values object required')
      }

      const article = await ensureArticleExists(request.params.articleId)
      if (!article) {
        return sendNotFound(reply, 'Article not found')
      }

      const properties = await prisma.catalogArticleProperty.findMany({
        where: { article_id: request.params.articleId },
        orderBy: { sort_order: 'asc' },
      })

      const validationResult = validatePropertyCombination(
        toPropertyDefinitions(properties),
        parsed.data.values as PropertyValues,
      )

      const priceTableEntries = await prisma.catalogArticlePriceTable.findMany({
        where: { article_id: request.params.articleId },
      })

      const price = lookupPrice(
        priceTableEntries as Array<{ property_combination: PropertyValues; price_net: number }>,
        parsed.data.values as PropertyValues,
      )

      return reply.send({ ...validationResult, price_net: price })
    },
  )

  app.post<{ Params: { articleId: string } }>(
    '/catalog-articles/:articleId/price-table',
    async (request, reply) => {
      const schema = z.object({
        property_combination: PropertyValuesSchema,
        price_net: z.number().min(0),
      })
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid request body')
      }

      const article = await ensureArticleExists(request.params.articleId)
      if (!article) {
        return sendNotFound(reply, 'Article not found')
      }

      const entry = await prisma.catalogArticlePriceTable.create({
        data: {
          article_id: request.params.articleId,
          property_combination: parsed.data.property_combination,
          price_net: parsed.data.price_net,
        },
      })

      return reply.status(201).send(entry)
    },
  )

  app.get<{ Params: { articleId: string } }>(
    '/catalog-articles/:articleId/price-table',
    async (request, reply) => {
      const article = await ensureArticleExists(request.params.articleId)
      if (!article) {
        return sendNotFound(reply, 'Article not found')
      }

      const entries = await prisma.catalogArticlePriceTable.findMany({
        where: { article_id: request.params.articleId },
      })
      return reply.send(entries)
    },
  )

  app.post('/article-profiles', async (request, reply) => {
    const schema = z.object({
      article_id: z.string().uuid(),
      name: z.string().min(1).max(100),
      property_values: PropertyValuesSchema,
      user_id: z.string().min(1),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid request body')
    }

    const profile = await prisma.userArticleProfile.create({
      data: {
        user_id: parsed.data.user_id,
        tenant_id: request.tenantId ?? null,
        name: parsed.data.name,
        article_id: parsed.data.article_id,
        property_values: parsed.data.property_values,
      },
    })

    return reply.status(201).send(profile)
  })

  app.get<{ Params: { userId: string } }>('/article-profiles/:userId', async (request, reply) => {
    const profiles = await prisma.userArticleProfile.findMany({
      where: { user_id: request.params.userId },
      orderBy: { name: 'asc' },
    })

    return reply.send(profiles)
  })
}
