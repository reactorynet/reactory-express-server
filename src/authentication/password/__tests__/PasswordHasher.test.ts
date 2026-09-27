import crypto from 'crypto';
import { hash, verify, isLegacy, DEFAULT_ITERATIONS, PasswordHasher } from '../PasswordHasher';

describe('PasswordHasher', () => {
  const testPassword = 'CorrectHorseBatteryStaple!2026';

  describe('isLegacy', () => {
    it('returns true for bare hex legacy hashes', () => {
      const legacyHash = crypto.randomBytes(64).toString('hex');
      expect(isLegacy(legacyHash)).toBe(true);
    });

    it('returns false for new format pbkdf2$... hashes', () => {
      expect(isLegacy('pbkdf2$sha512$600000$abcdef$123456')).toBe(false);
    });

    it('returns false for non-string or falsy input', () => {
      expect(isLegacy('')).toBe(false);
      expect(isLegacy(null as any)).toBe(false);
      expect(isLegacy(undefined as any)).toBe(false);
    });
  });

  describe('hash', () => {
    it('generates a string with pbkdf2$sha512 prefix and 600,000 iterations', async () => {
      // Use lower iterations for fast unit test of format, but verify default constant
      expect(DEFAULT_ITERATIONS).toBe(600000);

      const hashed = await hash(testPassword, 1000); // 1k iterations for test speed
      expect(hashed).toMatch(/^pbkdf2\$sha512\$1000\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    });

    it('throws when password is not a string', async () => {
      await expect(hash(null as any)).rejects.toThrow(TypeError);
    });
  });

  describe('verify', () => {
    it('verifies a modern pbkdf2 hash successfully', async () => {
      const hashed = await hash(testPassword, 2000);
      const result = await verify(testPassword, hashed);

      expect(result.ok).toBe(true);
      // Because iterations (2000) < DEFAULT_ITERATIONS (600000), needsRehash should be true
      expect(result.needsRehash).toBe(true);
    });

    it('returns needsRehash: false when iterations match or exceed DEFAULT_ITERATIONS', async () => {
      const hashed = await hash(testPassword, DEFAULT_ITERATIONS);
      const result = await verify(testPassword, hashed);

      expect(result.ok).toBe(true);
      expect(result.needsRehash).toBe(false);
    });

    it('fails verification on wrong password', async () => {
      const hashed = await hash(testPassword, 2000);
      const result = await verify('WrongPassword123!', hashed);

      expect(result.ok).toBe(false);
      expect(result.needsRehash).toBe(false);
    });

    it('verifies a legacy bare hex hash with separate salt and reports needsRehash: true', async () => {
      const salt = crypto.randomBytes(16).toString('hex');
      const legacyHash = crypto.pbkdf2Sync(testPassword, salt, 1000, 64, 'sha512').toString('hex');

      expect(isLegacy(legacyHash)).toBe(true);

      const result = await verify(testPassword, legacyHash, salt);
      expect(result.ok).toBe(true);
      expect(result.needsRehash).toBe(true);
    });

    it('fails legacy verification when salt is missing', async () => {
      const legacyHash = crypto.randomBytes(64).toString('hex');
      const result = await verify(testPassword, legacyHash);
      expect(result.ok).toBe(false);
      expect(result.needsRehash).toBe(false);
    });

    it('fails legacy verification with incorrect password', async () => {
      const salt = crypto.randomBytes(16).toString('hex');
      const legacyHash = crypto.pbkdf2Sync(testPassword, salt, 1000, 64, 'sha512').toString('hex');

      const result = await verify('WrongPassword', legacyHash, salt);
      expect(result.ok).toBe(false);
      expect(result.needsRehash).toBe(false);
    });

    it('fails verification gracefully when hash is tampered', async () => {
      const hashed = await hash(testPassword, 2000);
      const parts = hashed.split('$');
      parts[4] = 'ff' + parts[4].slice(2); // tamper with hash bytes
      const tampered = parts.join('$');

      const result = await verify(testPassword, tampered);
      expect(result.ok).toBe(false);
    });

    it('does not throw when hash lengths are unequal', async () => {
      const malformedHash = 'pbkdf2$sha512$1000$abcd$short';
      await expect(verify(testPassword, malformedHash)).resolves.toEqual({
        ok: false,
        needsRehash: false,
      });
    });

    it('handles empty or malformed strings gracefully without throwing', async () => {
      expect(await verify('', '')).toEqual({ ok: false, needsRehash: false });
      expect(await verify(testPassword, 'invalid')).toEqual({ ok: false, needsRehash: false });
      expect(await verify(testPassword, 'pbkdf2$bad$format')).toEqual({ ok: false, needsRehash: false });
    });
  });
});
