/**
 * Symmetric token encryption for OAuth secrets at rest.
 *
 * AES-256-GCM with a scrypt-derived key and per-record random salt. Promoted
 * from `modules/reactory-google/utils/token-encryption` so the shared OAuth
 * token store (and any provider) can encrypt tokens on `user.authentications`.
 *
 * Master key resolution order:
 *   OAUTH_TOKEN_ENCRYPTION_KEY → GOOGLE_TOKEN_ENCRYPTION_KEY → SECRET_SAUCE
 * The Google fallback preserves continuity for data written by the existing
 * GoogleAuthService while callers migrate to the shared key.
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export const resolveMasterKey = (): string => {
  const key =
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY ||
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
    process.env.SECRET_SAUCE;
  if (!key) {
    throw new Error(
      'No OAuth token encryption key configured. Set OAUTH_TOKEN_ENCRYPTION_KEY (or SECRET_SAUCE).'
    );
  }
  return key;
};

const deriveKey = (masterKey: string, salt: string): Buffer =>
  crypto.scryptSync(masterKey, salt, KEY_LENGTH);

/** Encrypt plaintext → base64 `iv:authTag:ciphertext`. */
export const encryptToken = (plaintext: string, salt: string, masterKey: string = resolveMasterKey()): string => {
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8') as unknown as Uint8Array,
    cipher.final() as unknown as Uint8Array,
  ]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
};

/** Decrypt a value produced by {@link encryptToken}. */
export const decryptToken = (ciphertext: string, salt: string, masterKey: string = resolveMasterKey()): string => {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format');
  const [ivB64, authTagB64, encryptedB64] = parts;
  const key = deriveKey(masterKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')) as unknown as Uint8Array,
    decipher.final() as unknown as Uint8Array,
  ]);
  return decrypted.toString('utf8');
};

/** Random per-record salt. */
export const generateEncryptionSalt = (): string => crypto.randomBytes(16).toString('base64');
