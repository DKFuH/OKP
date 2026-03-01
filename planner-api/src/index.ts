import Fastify from 'fastify'
import cors from '@fastify/cors'
import { projectRoutes } from './routes/projects.js'
import { roomRoutes } from './routes/rooms.js'
import { prisma } from './db.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})

// Routes
await app.register(projectRoutes, { prefix: '/api/v1' })
await app.register(roomRoutes, { prefix: '/api/v1' })

// Health check
app.get('/health', async () => ({ status: 'ok' }))

// Graceful shutdown
const shutdown = async () => {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
