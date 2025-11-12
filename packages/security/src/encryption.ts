import crypto from 'crypto';

/**
 * Envelope Encryption Implementation
 *
 * Uses a master key (from environment or KMS) to encrypt data encryption keys (DEKs).
 * Each encrypted value has its own DEK, encrypted with the master key.
 *
 * This allows for:
 * - Key rotation without re-encrypting all data
 * - Integration with KMS in production
 * - Secure secret storage
 */

const ALGORITHM = 'aes-256-gcm';
const DEK_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Get master key from environment
 * In production, this would come from AWS KMS, Google Cloud KMS, etc.
 */
function getMasterKey(): Buffer {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;

  if (!masterKey) {
    throw new Error(
      'MASTER_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  if (masterKey.length !== 64) {
    throw new Error(
      'MASTER_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  return Buffer.from(masterKey, 'hex');
}

/**
 * Generate a random Data Encryption Key (DEK)
 */
export function generateDEK(): Buffer {
  return crypto.randomBytes(DEK_LENGTH);
}

/**
 * Encrypt a DEK with the master key
 */
export function encryptDEK(dek: Buffer): {
  encryptedDEK: string;
  iv: string;
  authTag: string;
} {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(dek),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedDEK: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt a DEK with the master key
 */
export function decryptDEK(
  encryptedDEK: string,
  iv: string,
  authTag: string
): Buffer {
  const masterKey = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedDEK, 'base64')),
    decipher.final(),
  ]);

  return decrypted;
}

/**
 * Encrypt plaintext with envelope encryption
 * Returns encrypted value, encrypted DEK, IV, and auth tag
 */
export function encrypt(plaintext: string): {
  encryptedValue: string;
  encryptedDEK: string;
  iv: string;
  authTag: string;
  algorithm: string;
} {
  // Generate a new DEK for this value
  const dek = generateDEK();

  // Encrypt the DEK with the master key
  const {
    encryptedDEK,
    iv: dekIV,
    authTag: dekAuthTag,
  } = encryptDEK(dek);

  // Encrypt the plaintext with the DEK
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString('base64'),
    encryptedDEK: `${encryptedDEK}:${dekIV}:${dekAuthTag}`,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypt ciphertext with envelope encryption
 */
export function decrypt(
  encryptedValue: string,
  encryptedDEKString: string,
  iv: string,
  authTag: string
): string {
  // Parse the encrypted DEK components
  const [encryptedDEK, dekIV, dekAuthTag] = encryptedDEKString.split(':');

  // Decrypt the DEK with the master key
  const dek = decryptDEK(encryptedDEK, dekIV, dekAuthTag);

  // Decrypt the value with the DEK
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    dek,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Hash a value using SHA256
 * Used for hashing backup codes, tokens, etc.
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hashedToken: string): boolean {
  return hash(token) === hashedToken;
}

/**
 * Generate backup codes for 2FA
 * Returns an array of plaintext codes and their hashes
 */
export function generateBackupCodes(count: number = 8): {
  codes: string[];
  hashedCodes: string[];
} {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate a readable backup code (format: XXXX-XXXX-XXXX)
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}-${part3}`;

    codes.push(code);
    hashedCodes.push(hash(code));
  }

  return { codes, hashedCodes };
}
