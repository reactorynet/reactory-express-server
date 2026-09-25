import ReactoryClientModel from '../index';
import { ensurePublicKey } from '../statics';

/**
 * WP-A4 seeding: a tenant document must always carry a browser-facing publicKey.
 * Precedence is configured value > stored value > generated value.
 */
describe('ReactoryClient ensurePublicKey (WP-A4 seeding)', () => {
  it('generates a 32-byte hex publicKey when neither config nor document has one', () => {
    const client = new ReactoryClientModel({ key: 'seed-test', name: 'Seed Test' });
    expect(client.publicKey).toBeUndefined();

    ensurePublicKey(client as any, { key: 'seed-test' } as any);

    expect(typeof client.publicKey).toBe('string');
    expect(client.publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(client.browserAuth).toBe('origin');
  });

  it('uses the configured publicKey when one is supplied', () => {
    const client = new ReactoryClientModel({ key: 'seed-test', name: 'Seed Test' });
    ensurePublicKey(client as any, { key: 'seed-test', publicKey: 'configured-key' } as any);
    expect(client.publicKey).toBe('configured-key');
  });

  it('keeps an existing stored publicKey when config does not supply one', () => {
    const client = new ReactoryClientModel({ key: 'seed-test', name: 'Seed Test', publicKey: 'stored-key' });
    ensurePublicKey(client as any, { key: 'seed-test' } as any);
    expect(client.publicKey).toBe('stored-key');

    ensurePublicKey(client as any, { key: 'seed-test', publicKey: '' } as any);
    expect(client.publicKey).toBe('stored-key');
  });

  it('replaces a stored publicKey when config pins a different one', () => {
    const client = new ReactoryClientModel({ key: 'seed-test', name: 'Seed Test', publicKey: 'stored-key' });
    ensurePublicKey(client as any, { key: 'seed-test', publicKey: 'pinned-key' } as any);
    expect(client.publicKey).toBe('pinned-key');
  });

  it('does not override an explicit browserAuth of secret', () => {
    const client = new ReactoryClientModel({ key: 'seed-test', name: 'Seed Test', browserAuth: 'secret' });
    ensurePublicKey(client as any, { key: 'seed-test' } as any);
    expect(client.browserAuth).toBe('secret');
  });

  it('generated key is different from the tenant password (secret must not leak into the bundle)', async () => {
    const client = new ReactoryClientModel({ key: 'seed-test', name: 'Seed Test' });
    await client.setPassword('tenant-secret');
    ensurePublicKey(client as any, { key: 'seed-test' } as any);
    expect(client.publicKey).not.toBe('tenant-secret');
    expect(client.publicKey).not.toBe(client.password);
  });
});
