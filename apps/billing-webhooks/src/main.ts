import Fastify from 'fastify';
import pino from 'pino';
import { createDatabaseConnection } from '@gamePanel/db';
import { stripeWebhookHandler } from './handlers/stripe';
import { idempotencyMiddleware } from './middleware/idempotency';

const logger = pino({
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
          },
        }
      : undefined,
});

async function start() {
  const fastify = Fastify({
    logger,
    disableRequestLogging: false,
  });

  // Initialize database connection
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }
  const { db } = createDatabaseConnection(databaseUrl);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'healthy', service: 'billing-webhooks' };
  });

  // Stripe webhook endpoint
  fastify.post(
    '/webhooks/stripe',
    {
      preHandler: idempotencyMiddleware,
    },
    async (request, reply) => {
      return stripeWebhookHandler(request, reply, db);
    }
  );

  // Start server
  const port = parseInt(process.env.PORT || '3002', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    logger.info(`Billing webhooks service listening on ${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
