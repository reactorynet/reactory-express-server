import crypto from 'crypto';
import User from '../User';
import PasswordHasher from '@reactory/server-core/authentication/password/PasswordHasher';

describe('User Model - Password Hashing and Migration', () => {
  const plainPassword = 'UserSecretPass123!';

  it('sets password in pbkdf2$sha512 format with 600,000 iterations', async () => {
    const user: any = new User({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await user.setPassword(plainPassword);

    expect(user.salt).toBeDefined();
    expect(user.salt.length).toBe(32);
    expect(user.password).toBeDefined();
    expect(user.password).toMatch(/^pbkdf2\$sha512\$600000\$[0-9a-f]{32}\$[0-9a-f]{128}$/);

    const isValid = await user.validatePassword(plainPassword);
    expect(isValid).toBe(true);

    const isInvalid = await user.validatePassword('WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('validates a legacy-hashed user and migrates hash to new format', async () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const legacyHash = crypto.pbkdf2Sync(plainPassword, salt, 1000, 64, 'sha512').toString('hex');

    const user: any = new User({
      email: 'legacy@example.com',
      firstName: 'Legacy',
      lastName: 'User',
      password: legacyHash,
      salt: salt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    user.save = jest.fn().mockResolvedValue(user);

    expect(PasswordHasher.isLegacy(user.password)).toBe(true);
    expect(user.password).toBe(legacyHash);

    // Validate legacy password
    const isValid = await user.validatePassword(plainPassword);
    expect(isValid).toBe(true);

    // Should have migrated password to modern pbkdf2 format
    expect(PasswordHasher.isLegacy(user.password)).toBe(false);
    expect(user.password).toMatch(/^pbkdf2\$sha512\$600000\$/);
    expect(user.save).toHaveBeenCalled();

    // Subsequent validation works on migrated hash
    const isValidSecondTime = await user.validatePassword(plainPassword);
    expect(isValidSecondTime).toBe(true);
  });

  it('does not migrate password if validation fails', async () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const legacyHash = crypto.pbkdf2Sync(plainPassword, salt, 1000, 64, 'sha512').toString('hex');

    const user: any = new User({
      email: 'legacy@example.com',
      firstName: 'Legacy',
      lastName: 'User',
      password: legacyHash,
      salt: salt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    user.save = jest.fn().mockResolvedValue(user);

    const isValid = await user.validatePassword('WrongPassword');
    expect(isValid).toBe(false);
    expect(user.password).toBe(legacyHash);
    expect(user.save).not.toHaveBeenCalled();
  });
});
