import UserResolver from '../UserResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * The language preference used to live in `localStorage` only, so it did not
 * follow a user to a new browser or device. `setUserLanguage` persists it on the
 * account, and these tests pin the two rules that make that safe:
 *
 *   * the target is always the *caller* — it cannot be pointed at another user;
 *   * only a language the server actually ships may be stored.
 */
const setUserLanguage = async (language: string, context: any) => {
  const instance: any = Object.create((UserResolver as any).prototype);
  return instance.setUserLanguage({}, { language }, context);
};

const makeContext = (userId: string | null, updateUser = jest.fn()) => ({
  user: userId ? { _id: { toString: () => userId } } : null,
  getService: jest.fn().mockReturnValue({ updateUser }),
});

describe('setUserLanguage', () => {
  it('persists the normalised language for the signed-in user', async () => {
    const updateUser = jest.fn().mockResolvedValue({ id: 'user-1', il8n: { locale: 'af' } });
    const context = makeContext('user-1', updateUser);

    await setUserLanguage('af-ZA', context);

    expect(updateUser).toHaveBeenCalledWith({ id: 'user-1', il8n: { locale: 'af' } });
  });

  /**
   * The value is validated against the built-in list, which is where `af`
   * comes from in this test environment. An unsupported tag must be rejected
   * rather than stored: a locale with no bundles would silently pin the account
   * to English on every device.
   */
  it('rejects a language the server does not ship', async () => {
    const updateUser = jest.fn();
    const context = makeContext('user-1', updateUser);

    await expect(setUserLanguage('zz', context)).rejects.toThrow(/Unsupported language/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('requires a signed-in user', async () => {
    const updateUser = jest.fn();
    const context = makeContext(null, updateUser);

    await expect(setUserLanguage('af', context)).rejects.toThrow(/signed-in user/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('never accepts a target user id from the caller', async () => {
    // The mutation signature takes only `language`; the id comes from the
    // context. Nothing in the arguments can redirect the write.
    const updateUser = jest.fn().mockResolvedValue({});
    const context = makeContext('user-1', updateUser);

    await setUserLanguage('af' as any, context);

    expect(updateUser.mock.calls[0][0].id).toBe('user-1');
  });
});
