import type { FastifyInstance } from 'fastify'
import type { OkpPlugin } from './pluginRegistry.js'

async function multilevelDocsPluginRoutes(_app: FastifyInstance): Promise<void> {
  // S83 start slice: plugin is registered for tenant-aware feature toggling.
  // Dedicated plugin-gated routes are added incrementally in later slices.
}

export const multilevelDocsPlugin: OkpPlugin = {
  id: 'multilevel-docs',
  name: 'Multilevel Docs',
  register: multilevelDocsPluginRoutes,
}
