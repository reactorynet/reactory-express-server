import crypto from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(crypto.pbkdf2);

export const DEFAULT_ITERATIONS = 600000;
export const DEFAULT_SALT_BYTES = 16;
export const DEFAULT_KEY_LEN = 64;
export const DEFAULT_DIGEST = 'sha512';

export const LEGACY_ITERATIONS = 1000;
export const LEGACY_KEY_LEN = 64;
export const LEGACY_DIGEST = 'sha512';

export interface VerifyResult {
  ok: boolean;
  needsRehash: boolean;
}

/**
 * Checks if a stored hash is in legacy format (bare hex string without algorithm prefix)
 */
export function isLegacy(stored: string): boolean {
  if (!stored || typeof stored !== 'string') return false;
  return !stored.startsWith('pbkdf2$');
}

/**
 * Safely compare two buffers in constant time without throwing on unequal lengths.
 */
function safeEqual(a: Buffer, b: Buffer): boolean {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Hashes a plaintext password using PBKDF2-SHA512 with 600,000 iterations.
 * Format: `pbkdf2$sha512$<iterations>$<saltHex>$<hashHex>`
 */
export async function hash(
  password: string,
  iterations: number = DEFAULT_ITERATIONS,
  saltBytes: number = DEFAULT_SALT_BYTES,
): Promise<string> {
  if (typeof password !== 'string') {
    throw new TypeError('Password must be a string');
  }

  const salt = crypto.randomBytes(saltBytes);
  const derivedKey = await pbkdf2Async(
    password,
    salt,
    iterations,
    DEFAULT_KEY_LEN,
    DEFAULT_DIGEST,
  );

  return `pbkdf2$${DEFAULT_DIGEST}$${iterations}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash string.
 * Supports both new prefixed format (`pbkdf2$sha512$...`) and legacy bare hex format.
 * If legacy, optional `salt` parameter is used as salt (legacy User/Client stored salt in a separate field).
 */
export async function verify(
  password: string,
  stored: string,
  salt?: string,
): Promise<VerifyResult> {
  if (typeof password !== 'string' || typeof stored !== 'string' || !stored) {
    return { ok: false, needsRehash: false };
  }

  // Handle legacy hash
  if (isLegacy(stored)) {
    if (!salt) {
      return { ok: false, needsRehash: false };
    }

    try {
      const derivedKey = await pbkdf2Async(
        password,
        salt,
        LEGACY_ITERATIONS,
        LEGACY_KEY_LEN,
        LEGACY_DIGEST,
      );

      const storedBuf = Buffer.from(stored, 'hex');
      const ok = safeEqual(storedBuf, derivedKey);
      return {
        ok,
        needsRehash: ok, // legacy hashes always need rehash upon successful verification
      };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }

  // Handle modern format: pbkdf2$<digest>$<iterations>$<saltHex>$<hashHex>
  const parts = stored.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') {
    return { ok: false, needsRehash: false };
  }

  const [, digest, iterStr, saltHex, hashHex] = parts;
  const iterations = parseInt(iterStr, 10);
  if (Number.isNaN(iterations) || iterations <= 0) {
    return { ok: false, needsRehash: false };
  }

  try {
    const saltBuf = Buffer.from(saltHex, 'hex');
    const expectedHashBuf = Buffer.from(hashHex, 'hex');

    if (saltBuf.length === 0 || expectedHashBuf.length !== DEFAULT_KEY_LEN) {
      return { ok: false, needsRehash: false };
    }

    const derivedKey = await pbkdf2Async(
      password,
      saltBuf,
      iterations,
      DEFAULT_KEY_LEN,
      digest,
    );

    const ok = safeEqual(expectedHashBuf, derivedKey);
    const needsRehash = ok && iterations < DEFAULT_ITERATIONS;

    return { ok, needsRehash };
  } catch {
    return { ok: false, needsRehash: false };
  }
}

export const PasswordHasher = {
  hash,
  verify,
  isLegacy,
  DEFAULT_ITERATIONS,
  DEFAULT_SALT_BYTES,
  DEFAULT_KEY_LEN,
  DEFAULT_DIGEST,
};

export default PasswordHasher;
