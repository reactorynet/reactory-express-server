import { UserAuthenticationsTokenStore, TokenStoreUser, StoredToken } from '../token-store';
import { encryptToken, decryptToken, generateEncryptionSalt } from '../token-crypto';

const MASTER = 'test-master-key-at-least-32-chars-long!!';

/** In-memory fake of the User document's authentications accessors. */
const makeUser = (): TokenStoreUser & { store: Map<string, { props?: Record<string, unknown> }> } => {
  const store = new Map<string, { props?: Record<string, unknown> }>();
  return {
    store,
    getAuthentication: (provider) => store.get(provider) ?? null,
    setAuthentication: ({ provider, props }) => {
      // Mirror the model's merge-by-provider semantics on props.
      const existing = store.get(provider);
      store.set(provider, { props: { ...(existing?.props ?? {}), ...props } });
      return true;
    },
    removeAuthentication: (provider) => store.delete(provider),
  };
};

describe('token-crypto', () => {
  it('round-trips a value', () => {
    const salt = generateEncryptionSalt();
    const enc = encryptToken('super-secret', salt, MASTER);
    expect(enc).not.toContain('super-secret');
    expect(decryptToken(enc, salt, MASTER)).toBe('super-secret');
  });

  it('fails to decrypt with the wrong salt (GCM auth tag)', () => {
    const enc = encryptToken('x', generateEncryptionSalt(), MASTER);
    expect(() => decryptToken(enc, generateEncryptionSalt(), MASTER)).toThrow();
  });
});

describe('UserAuthenticationsTokenStore', () => {
  it('encrypts secrets at rest and round-trips via get', async () => {
    const user = makeUser();
    const store = new UserAuthenticationsTokenStore(user, MASTER);
    const token: StoredToken = {
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      expiresAt: 1_700_000_000_000,
      scopes: ['read', 'write'],
      accountEmail: 'a@b.com',
    };
    await store.set('mcp:grafana', token);

    // Raw persisted props must not contain the plaintext tokens.
    const persisted = JSON.stringify(user.store.get('mcp:grafana'));
    expect(persisted).not.toContain('at-123');
    expect(persisted).not.toContain('rt-456');
    // Non-secret metadata is stored in the clear.
    expect(persisted).toContain('a@b.com');

    const got = await store.get('mcp:grafana');
    expect(got).toMatchObject({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      expiresAt: 1_700_000_000_000,
      scopes: ['read', 'write'],
      accountEmail: 'a@b.com',
    });
  });

  it('patch merges top-level fields and shallow-merges raw', async () => {
    const user = makeUser();
    const store = new UserAuthenticationsTokenStore(user, MASTER);

    // SDK saves a PKCE verifier first...
    await store.patch('mcp:x', { raw: { codeVerifier: 'cv-1' } });
    // ...then client registration...
    await store.patch('mcp:x', { raw: { clientInformation: { client_id: 'cid' } } });
    // ...then tokens.
    await store.patch('mcp:x', { accessToken: 'at', raw: { tokens: { access_token: 'at' } } });

    const got = await store.get('mcp:x');
    expect(got?.accessToken).toBe('at');
    expect(got?.raw).toEqual({
      codeVerifier: 'cv-1',
      clientInformation: { client_id: 'cid' },
      tokens: { access_token: 'at' },
    });
  });

  it('returns null before anything is stored and after remove', async () => {
    const user = makeUser();
    const store = new UserAuthenticationsTokenStore(user, MASTER);
    expect(await store.get('mcp:none')).toBeNull();
    await store.set('mcp:none', { accessToken: 'a' });
    expect(await store.get('mcp:none')).not.toBeNull();
    await store.remove('mcp:none');
    expect(await store.get('mcp:none')).toBeNull();
  });
});
