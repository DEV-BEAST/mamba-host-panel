import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { RateLimiter, RateLimitConfig, getIdentifier } from '@mambaPanel/security';

/**
 * Rate Limiting Middleware using Redis
 *
 * Implements sliding window rate limiting for API endpoints
 */

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private rateLimiter: RateLimiter;

  constructor(
    private readonly redis: Redis,
    private readonly config: RateLimitConfig
  ) {
    this.rateLimiter = new RateLimiter(redis);
  }

  async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    try {
      // Get identifier (IP or user ID)
      const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const userId = (req as any).user?.id; // From auth middleware
      const identifier = getIdentifier(ip, userId);

      // Check rate limit
      const result = await this.rateLimiter.checkLimit(identifier, this.config);

      // Set rate limit headers
      res.header('X-RateLimit-Limit', result.limit.toString());
      res.header('X-RateLimit-Remaining', result.remaining.toString());
      res.header('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later',
            error: 'Too Many Requests',
            retryAfter: result.resetIn,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If rate limiting fails (e.g., Redis is down), allow the request
      // but log the error
      console.error('Rate limiting error:', error);
      next();
    }
  }
}

/**
 * Factory function to create rate limit middleware with specific config
 */
export function createRateLimitMiddleware(
  redis: Redis,
  config: RateLimitConfig
): RateLimitMiddleware {
  return new RateLimitMiddleware(redis, config);
}
