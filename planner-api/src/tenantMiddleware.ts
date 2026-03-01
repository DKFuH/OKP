/**
 * tenantMiddleware.ts – Sprint 23 / TASK-23-A01
 * Tenant-Scoping Middleware für Fastify.
 *
 * Liest tenant_id aus dem Header X-Tenant-Id (oder zukünftig JWT).
 * Nach prisma generate steht tenant_id / branch_id als Felder auf Users / Projects zur Verfügung.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        tenantId: string | null
        branchId: string | null
    }
}

export async function tenantMiddleware(app: FastifyInstance) {
    app.decorateRequest('tenantId', null)
    app.decorateRequest('branchId', null)

    app.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
        const tenantHeader = request.headers['x-tenant-id']
        const branchHeader = request.headers['x-branch-id']
        request.tenantId = Array.isArray(tenantHeader) ? (tenantHeader[0] ?? null) : (tenantHeader ?? null)
        request.branchId = Array.isArray(branchHeader) ? (branchHeader[0] ?? null) : (branchHeader ?? null)
    })
}
