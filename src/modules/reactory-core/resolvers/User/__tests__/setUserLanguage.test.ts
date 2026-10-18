import { mkdirSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import UserResolver from '../UserResolver';
import { resetAvailableLanguages } from '@reactory/server-core/express/i18n/language';

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
 *
 * The shipped list is derived from the locale folders on disk, so the test owns
 * that tree. Without a fixture this passes on a developer machine (which has
 * `reactory-data/i18n/af`) and fails in the server-only CI checkout, where the
 * only "available" language is the default — the exact class of
 * environment-dependent test the i18n suite's fixture helper exists to prevent.
 */
const removeTree = (directory: string): void => {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) removeTree(entryPath);
    else unlinkSync(entryPath);
  });
  rmdirSync(directory);
};

const setUserLanguage = async (language: string, context: any) => {
  const instance: any = Object.create((UserResolver as any).prototype);
  return instance.setUserLanguage({}, { language }, context);
};

const makeContext = (userId: string | null, updateUser = jest.fn()) => ({
  user: userId ? { _id: { toString: () => userId } } : null,
  getService: jest.fn().mockReturnValue({ updateUser }),
});

let dataRoot: string;

beforeEach(() => {
  dataRoot = mkdtempSync(join(tmpdir(), 'reactory-user-language-'));
  mkdirSync(join(dataRoot, 'i18n', 'en'), { recursive: true });
  mkdirSync(join(dataRoot, 'i18n', 'af'), { recursive: true });

  process.env.APP_DATA_ROOT = dataRoot;
  // The language scan is memoised, so it must be cleared for the new tree.
  resetAvailableLanguages();
});

afterEach(() => {
  delete process.env.APP_DATA_ROOT;
  resetAvailableLanguages();
  removeTree(dataRoot);
});

describe('setUserLanguage', () => {
  it('persists the normalised language for the signed-in user', async () => {
    const updateUser = jest.fn().mockResolvedValue({ id: 'user-1', il8n: { locale: 'af' } });
    const context = makeContext('user-1', updateUser);

    await setUserLanguage('af-ZA', context);

    expect(updateUser).toHaveBeenCalledWith({ id: 'user-1', il8n: { locale: 'af' } });
  });

  it('rejects a language the server does not ship', async () => {
    // `zz` has no locale folder. Storing it would pin the account to a language
    // with no bundles, so the write is rejected rather than silently accepted.
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
