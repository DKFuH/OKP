import type { FastifyInstance } from 'fastify'
import type { OkpPlugin } from './pluginRegistry.js'
import { isTenantPluginEnabled } from './tenantPluginAccess.js'
import { materialLibraryRoutes } from '../routes/materialLibrary.js'

async function materialsPluginRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Missing tenant scope',
      })
    }

    const enabled = await isTenantPluginEnabled(tenantId, 'materials')
    if (!enabled) {
      return reply.status(403).send({
        error: 'PLUGIN_DISABLED',
        message: 'Plugin materials is disabled for this tenant',
      })
    }
  })

  await app.register(materialLibraryRoutes)
}

export const materialsPlugin: OkpPlugin = {
  id: 'materials',
  name: 'Materials',
  register: materialsPluginRoutes,
}
