import { FastifyReply } from 'fastify'

export function sendNotFound(reply: FastifyReply, message = 'Not found') {
  return reply.status(404).send({ error: 'NOT_FOUND', message })
}

export function sendBadRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: 'BAD_REQUEST', message })
}

export function sendServerError(reply: FastifyReply, message = 'Internal server error') {
  return reply.status(500).send({ error: 'SERVER_ERROR', message })
}
