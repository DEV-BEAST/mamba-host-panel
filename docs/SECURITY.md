# Security Architecture - Mamba Host Panel

This document describes the security implementation for the Mamba Host Panel Alpha release.

## Table of Contents

1. [mTLS for Node Communication](#mtls-for-node-communication)
2. [Authentication & Authorization](#authentication--authorization)
3. [Envelope Encryption](#envelope-encryption)
4. [Rate Limiting](#rate-limiting)
5. [Email Verification](#email-verification)
6. [Best Practices](#best-practices)

---

## mTLS for Node Communication

### Overview

All communication between the API and Wings nodes uses mutual TLS (mTLS) for authentication and encryption.

### Development Setup

1. **Generate CA and Certificates**:

```bash
# Initialize the CA
./scripts/dev-ca.sh init

# Generate certificate for a node
./scripts/dev-ca.sh generate us-east-1-node-01 node1.example.com

# Verify the certificate
./scripts/dev-ca.sh verify us-east-1-node-01

# Get environment variables for Wings
./scripts/dev-ca.sh env us-east-1-node-01
```

2. **Configure Wings**:

Add to `apps/wings/.env.local`:

```env
WINGS_TLS_CERT_FILE=/path/to/certs/nodes/us-east-1-node-01-cert.pem
WINGS_TLS_KEY_FILE=/path/to/certs/nodes/us-east-1-node-01-key.pem
WINGS_API_CA_CERT=/path/to/certs/ca/ca-cert.pem
WINGS_NODE_ID=us-east-1-node-01
WINGS_API_URL=https://api.example.com:3001
```

3. **Configure API**:

The API automatically validates client certificates on `/wings/*` endpoints using the `MTLSMiddleware`.

### Certificate Validation

The API performs the following checks:

1. Client certificate is present
2. Certificate is signed by the trusted CA
3. Node ID in certificate CN matches database
4. Certificate fingerprint matches database record (after first connection)

### Certificate Rotation

**Planned for Beta**: Automatic certificate rotation with overlap periods.

For Alpha: Manually rotate certificates before expiry (365 days).

---

## Authentication & Authorization

### JWT Access Tokens

- **Lifetime**: 15 minutes
- **Purpose**: Short-lived for API authentication
- **Claims**: `userId`, `email`, `role`, `tenantId`

### Refresh Tokens

- **Lifetime**: 30 days
- **Storage**: Hashed in database with token family tracking
- **Rotation**: New refresh token issued on every refresh
- **Theft Detection**: Token reuse revokes entire token family

### Token Flow

```
1. Login → Access Token (15min) + Refresh Token (30d)
2. Access Token Expires → Use Refresh Token
3. Refresh → New Access Token + New Refresh Token (rotation)
4. Old Refresh Token marked as "used"
5. If used token is reused → Revoke entire family (theft detected)
```

### Implementation

```typescript
// apps/api/src/auth/auth.service.ts
const { accessToken, refreshToken } = await authService.login(email, password);

// Refresh
const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(oldRefreshToken);

// Logout
await authService.logout(refreshToken);
```

### RBAC (Role-Based Access Control)

Implemented via `packages/authz`:

```typescript
// Roles
enum Role {
  OWNER = 'owner',     // Full tenant access
  ADMIN = 'admin',     // Administrative access
  SUPPORT = 'support', // Support access
  MEMBER = 'member',   // Basic access
}

// Permissions
enum Permission {
  TENANT_READ = 'tenant:read',
  SERVER_CREATE = 'server:create',
  SERVER_READ = 'server:read',
  SERVER_UPDATE = 'server:update',
  SERVER_DELETE = 'server:delete',
  SERVER_START = 'server:start',
  SERVER_STOP = 'server:stop',
  BACKUP_CREATE = 'backup:create',
  BACKUP_RESTORE = 'backup:restore',
  // ... more permissions
}
```

---

## Envelope Encryption

### Overview

Sensitive data (API keys, tokens, secrets) is encrypted using envelope encryption:

1. **Master Key**: Single key from environment (KMS-ready)
2. **Data Encryption Key (DEK)**: Unique per encrypted value
3. **Encrypted DEK**: DEK encrypted with master key

This allows key rotation without re-encrypting all data.

### Master Key Setup

```bash
# Generate a master key
openssl rand -hex 32

# Add to .env
MASTER_ENCRYPTION_KEY=<your-64-character-hex-key>
```

### Usage

```typescript
import { encrypt, decrypt } from '@mambaPanel/security';

// Encrypt
const {
  encryptedValue,
  encryptedDEK,
  iv,
  authTag,
  algorithm,
} = encrypt('sensitive-api-key');

// Store in database
await db.insert(encryptedSecrets).values({
  key: 'stripe_api_key',
  encryptedValue,
  encryptedDek: encryptedDEK,
  iv,
  authTag,
  algorithm,
});

// Decrypt
const secret = await db.select().from(encryptedSecrets).where(eq(encryptedSecrets.key, 'stripe_api_key'));
const plaintext = decrypt(
  secret.encryptedValue,
  secret.encryptedDek,
  secret.iv,
  secret.authTag
);
```

### Algorithm

- **Cipher**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes)
- **Authentication**: GCM mode provides authenticated encryption

---

## Rate Limiting

### Implementation

Redis-backed sliding window rate limiting for authentication endpoints.

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Register | 3 attempts | 1 hour |
| Password Reset | 3 attempts | 1 hour |
| Email Verification | 5 attempts | 1 hour |
| API General | 100 requests | 1 minute |

### Usage

```typescript
import { createRateLimiter, RATE_LIMITS } from '@mambaPanel/security';

const rateLimiter = createRateLimiter(redis);

// Check rate limit
const result = await rateLimiter.checkLimit(userIP, RATE_LIMITS.LOGIN);

if (!result.allowed) {
  throw new TooManyRequestsException(`Try again in ${result.resetIn} seconds`);
}

// Block identifier after failed attempts
await rateLimiter.blockIdentifier(userIP, 3600); // 1 hour

// Check if blocked
const isBlocked = await rateLimiter.isBlocked(userIP);
```

### Response Headers

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2024-01-15T10:30:00Z
```

---

## Email Verification

### Flow

1. **Registration**: Email verification token generated and sent
2. **User clicks link**: Token verified, email marked as verified
3. **Unverified users**: Blocked from sensitive actions

### Implementation

```typescript
// Generate verification token
const token = await authService.generateEmailVerificationToken(userId);

// Send email (implement with your email provider)
await emailService.send({
  to: user.email,
  subject: 'Verify your email',
  body: `Click here: https://app.example.com/verify?token=${token}`,
});

// Verify email
await authService.verifyEmail(token);
```

### Token Properties

- **Lifetime**: 24 hours
- **Storage**: Database with expiration timestamp
- **One-time use**: Marked as verified after use

---

## Best Practices

### For Development

1. **Never commit secrets**:
   - Use `.env.local` for local secrets
   - Add to `.gitignore`

2. **Use development CA**:
   - Don't use development certificates in production
   - Rotate regularly even in development

3. **Test rate limiting**:
   - Verify limits work as expected
   - Test edge cases (token theft, reuse, etc.)

### For Production

1. **Master Key Management**:
   - Use AWS KMS, Google Cloud KMS, or Azure Key Vault
   - Never store master key in code or database
   - Rotate keys periodically

2. **mTLS Certificates**:
   - Use proper PKI infrastructure
   - Automate certificate rotation
   - Monitor certificate expiration
   - Use short-lived certificates (90 days)

3. **JWT Security**:
   - Use strong secrets (min 32 bytes)
   - Rotate JWT secrets periodically
   - Monitor for token theft
   - Implement refresh token family revocation

4. **Rate Limiting**:
   - Adjust limits based on traffic patterns
   - Use Redis Cluster for high availability
   - Monitor for abuse patterns
   - Implement IP blocklists for repeat offenders

5. **Monitoring & Alerts**:
   - Alert on token theft detection
   - Alert on rate limit breaches
   - Alert on certificate expiration (30 days before)
   - Log all authentication failures

6. **HTTPS Everywhere**:
   - Use TLS 1.3
   - Strong cipher suites only
   - HSTS headers
   - Certificate pinning for mobile apps

---

## Security Checklist

- [ ] Master encryption key set and secured
- [ ] CA certificates generated and secured
- [ ] Node certificates issued and distributed
- [ ] JWT secrets configured (min 32 bytes)
- [ ] Redis configured for rate limiting
- [ ] Email service configured for verification
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured
- [ ] Rate limits tested and adjusted
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] Database credentials secured
- [ ] Secrets rotation schedule defined
- [ ] Incident response plan documented

---

## Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Email security issues to: security@mambahost.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 24 hours.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [mTLS Best Practices](https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/)
