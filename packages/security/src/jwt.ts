import crypto from 'crypto';

/**
 * JWT Utilities for short-lived access tokens and refresh token flow
 *
 * Access tokens: 15 minutes
 * Refresh tokens: 30 days
 * Token rotation on every refresh to detect token theft
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  tenantId?: string;
  type: 'access' | 'refresh' | 'intent';
  intent?: string; // For intent-based tokens (e.g., 'email_verification', 'password_reset')
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
}

export const JWT_EXPIRY = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 30 * 24 * 60 * 60, // 30 days
  INTENT_TOKEN: 24 * 60 * 60, // 24 hours
} as const;

/**
 * Generate a JWT ID (jti)
 */
export function generateJTI(): string {
  return crypto.randomUUID();
}

/**
 * Generate a token family ID for refresh token rotation
 */
export function generateTokenFamily(): string {
  return crypto.randomUUID();
}

/**
 * Create access token payload
 */
export function createAccessTokenPayload(user: {
  id: string;
  email: string;
  role?: string;
  tenantId?: string;
}): Omit<JWTPayload, 'iat' | 'exp' | 'jti'> {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    type: 'access',
  };
}

/**
 * Create refresh token payload
 */
export function createRefreshTokenPayload(user: {
  id: string;
  email: string;
}): Omit<JWTPayload, 'iat' | 'exp' | 'jti'> {
  return {
    userId: user.id,
    email: user.email,
    type: 'refresh',
  };
}

/**
 * Create intent-based token payload
 * Used for email verification, password reset, etc.
 */
export function createIntentTokenPayload(
  user: {
    id: string;
    email: string;
  },
  intent: string
): Omit<JWTPayload, 'iat' | 'exp' | 'jti'> {
  return {
    userId: user.id,
    email: user.email,
    type: 'intent',
    intent,
  };
}

/**
 * Generate a cryptographically secure token for refresh tokens
 * This is stored in the database, not a JWT
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('base64url');
}

/**
 * Hash a refresh token for storage
 * We store hashed tokens in the database for security
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a refresh token against its hash
 */
export function verifyRefreshToken(token: string, hashedToken: string): boolean {
  return hashRefreshToken(token) === hashedToken;
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(exp: number): boolean {
  return Date.now() >= exp * 1000;
}

/**
 * Calculate token expiration timestamp
 */
export function calculateExpiration(expirySeconds: number): number {
  return Math.floor(Date.now() / 1000) + expirySeconds;
}
