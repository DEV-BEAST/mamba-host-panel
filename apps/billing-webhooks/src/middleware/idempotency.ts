import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Idempotency middleware to prevent duplicate webhook processing
 * Uses idempotency key from headers or generates from event ID
 */
export async function idempotencyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Get idempotency key from header or will use event ID later
  const idempotencyKey =
    request.headers['idempotency-key'] ||
    request.headers['stripe-signature'];

  if (!idempotencyKey) {
    return reply.status(400).send({
      error: 'Missing idempotency key',
    });
  }

  // Attach to request for use in handler
  (request as any).idempotencyKey = idempotencyKey;
}
