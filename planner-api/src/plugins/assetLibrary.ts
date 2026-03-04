import type { FastifyInstance } from 'fastify'
import type { OkpPlugin } from './pluginRegistry.js'
import { assetLibraryRoutes } from '../routes/assetLibrary.js'
import { isTenantPluginEnabled } from './tenantPluginAccess.js'

async function assetLibraryPluginRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Missing tenant scope',
      })
    }

    const enabled = await isTenantPluginEnabled(tenantId, 'asset-library')
    if (!enabled) {
      return reply.status(403).send({
        error: 'PLUGIN_DISABLED',
        message: 'Plugin asset-library is disabled for this tenant',
      })
    }
  })

  await app.register(assetLibraryRoutes)
}

export const assetLibraryPlugin: OkpPlugin = {
  id: 'asset-library',
  name: 'Asset Library',
  register: assetLibraryPluginRoutes,
}
