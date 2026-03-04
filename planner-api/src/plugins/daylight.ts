import type { FastifyInstance } from 'fastify'
import type { OkpPlugin } from './pluginRegistry.js'
import { isTenantPluginEnabled } from './tenantPluginAccess.js'
import { projectEnvironmentRoutes } from '../routes/projectEnvironment.js'

async function daylightPluginRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Missing tenant scope',
      })
    }

    const enabled = await isTenantPluginEnabled(tenantId, 'daylight')
    if (!enabled) {
      return reply.status(403).send({
        error: 'PLUGIN_DISABLED',
        message: 'Plugin daylight is disabled for this tenant',
      })
    }
  })

  await app.register(projectEnvironmentRoutes)
}

export const daylightPlugin: OkpPlugin = {
  id: 'daylight',
  name: 'Daylight',
  register: daylightPluginRoutes,
}
