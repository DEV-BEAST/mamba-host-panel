import { pgTable, text, timestamp, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Refresh tokens table for JWT refresh flow
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    token: text('token').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    family: text('family').notNull(), // Token family for rotation detection
    used: boolean('used').notNull().default(false),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    // Self-reference: which token replaced this one (for rotation tracking)
    // Note: Foreign key constraint should be added via migration to avoid circular dependency
    replacedBy: uuid('replaced_by'),
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    familyIdx: index('refresh_tokens_family_idx').on(table.family),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
    tokenIdx: index('refresh_tokens_token_idx').on(table.token),
  })
);

// Encrypted secrets table for envelope encryption
export const encryptedSecrets = pgTable(
  'encrypted_secrets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull().unique(), // e.g., 'stripe_api_key', 'node_daemon_token_<node_id>'
    encryptedValue: text('encrypted_value').notNull(), // Base64 encoded encrypted data
    encryptedDek: text('encrypted_dek').notNull(), // Data Encryption Key encrypted with master key
    iv: text('iv').notNull(), // Initialization vector
    algorithm: text('algorithm').notNull().default('aes-256-gcm'),
    authTag: text('auth_tag'), // Authentication tag for GCM mode
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    rotatedAt: timestamp('rotated_at', { mode: 'date' }),
  },
  (table) => ({
    keyIdx: index('encrypted_secrets_key_idx').on(table.key),
  })
);

// Email verification tokens
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    verifiedAt: timestamp('verified_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('email_verification_tokens_user_id_idx').on(table.userId),
    tokenIdx: index('email_verification_tokens_token_idx').on(table.token),
  })
);

// Password reset tokens
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
    tokenIdx: index('password_reset_tokens_token_idx').on(table.token),
  })
);

// TOTP 2FA secrets (optional for Alpha)
export const totpSecrets = pgTable(
  'totp_secrets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    encryptedSecret: text('encrypted_secret').notNull(),
    backupCodes: text('backup_codes'), // JSON array of hashed backup codes
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    enabledAt: timestamp('enabled_at', { mode: 'date' }),
  },
  (table) => ({
    userIdIdx: index('totp_secrets_user_id_idx').on(table.userId),
  })
);
