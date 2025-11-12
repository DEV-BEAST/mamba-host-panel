import { Redis } from 'ioredis';

/**
 * Redis-backed rate limiting for authentication endpoints
 *
 * Implements sliding window rate limiting with Redis
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  max: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Prefix for Redis keys */
  prefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Total limit */
  limit: number;
  /** Time until the window resets (seconds) */
  resetIn: number;
  /** Timestamp when the window resets */
  resetAt: Date;
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  LOGIN: {
    max: 5,
    windowSeconds: 15 * 60, // 15 minutes
    prefix: 'rl:login',
  },
  REGISTER: {
    max: 3,
    windowSeconds: 60 * 60, // 1 hour
    prefix: 'rl:register',
  },
  PASSWORD_RESET: {
    max: 3,
    windowSeconds: 60 * 60, // 1 hour
    prefix: 'rl:password_reset',
  },
  EMAIL_VERIFICATION: {
    max: 5,
    windowSeconds: 60 * 60, // 1 hour
    prefix: 'rl:email_verification',
  },
  API_GENERAL: {
    max: 100,
    windowSeconds: 60, // 1 minute
    prefix: 'rl:api',
  },
} as const;

/**
 * Rate limiter class using Redis
 */
export class RateLimiter {
  constructor(private redis: Redis) {}

  /**
   * Check if a request is allowed under the rate limit
   * Uses sliding window algorithm with Redis sorted sets
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const prefix = config.prefix || 'rl';
    const key = `${prefix}:${identifier}`;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Create a pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current entries in the window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on the key
    pipeline.expire(key, config.windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    // Get the count from zcard result
    const count = (results[1][1] as number) || 0;

    const allowed = count < config.max;
    const remaining = Math.max(0, config.max - count - 1);
    const resetIn = config.windowSeconds;
    const resetAt = new Date(now + windowMs);

    return {
      allowed,
      remaining,
      limit: config.max,
      resetIn,
      resetAt,
    };
  }

  /**
   * Reset rate limit for an identifier
   * Useful for clearing limits after successful operations
   */
  async resetLimit(identifier: string, config: RateLimitConfig): Promise<void> {
    const prefix = config.prefix || 'rl';
    const key = `${prefix}:${identifier}`;
    await this.redis.del(key);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    identifier: string,
    config: RateLimitConfig
  ): Promise<Omit<RateLimitResult, 'allowed'>> {
    const prefix = config.prefix || 'rl';
    const key = `${prefix}:${identifier}`;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Remove old entries and count
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const count = (results[1][1] as number) || 0;
    const remaining = Math.max(0, config.max - count);
    const resetIn = config.windowSeconds;
    const resetAt = new Date(now + windowMs);

    return {
      remaining,
      limit: config.max,
      resetIn,
      resetAt,
    };
  }

  /**
   * Block an identifier for a specific duration
   * Useful for blocking after too many failed attempts
   */
  async blockIdentifier(
    identifier: string,
    durationSeconds: number,
    prefix: string = 'rl:block'
  ): Promise<void> {
    const key = `${prefix}:${identifier}`;
    await this.redis.setex(key, durationSeconds, '1');
  }

  /**
   * Check if an identifier is blocked
   */
  async isBlocked(
    identifier: string,
    prefix: string = 'rl:block'
  ): Promise<boolean> {
    const key = `${prefix}:${identifier}`;
    const result = await this.redis.get(key);
    return result !== null;
  }

  /**
   * Unblock an identifier
   */
  async unblock(identifier: string, prefix: string = 'rl:block'): Promise<void> {
    const key = `${prefix}:${identifier}`;
    await this.redis.del(key);
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(redis: Redis): RateLimiter {
  return new RateLimiter(redis);
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(ip: string, userId?: string): string {
  return userId || ip;
}
