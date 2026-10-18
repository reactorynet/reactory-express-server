import { writeFileSync } from 'fs';
import { join } from 'path';
import i18next from 'i18next';
import { createI18nFixture, removeI18nFixture } from './support/i18nFixture';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_HEADER,
  createRequestI18n,
  getAvailableLanguages,
  getI18nRoot,
  getLocaleFolders,
  languageFromHeaders,
  normaliseLanguage,
  resetAvailableLanguages,
  resolveLanguage,
  resolveLocaleFolder,
} from '../language';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * Locale folders this suite asserts against, created under a temporary
 * APP_DATA_ROOT.
 *
 * These tests used to read whatever happened to be under the machine's data
 * root: a developer machine pointed APP_DATA_ROOT at the real `reactory-data`
 * (with `af`, `en`, `en-US`, …) so they passed, while CI — which checks out the
 * server alone and points APP_DATA_ROOT at a gitignored, empty
 * `src/reactory/test-data/i18n` — saw no folders at all and failed three
 * assertions. The behaviour under test (folder listing, de-duplication,
 * regional resolution) is a property of the resolver, not of the machine, so it
 * is pinned against a controlled tree instead.
 *
 * `en` alongside `en-US` exercises the de-duplication, `af` exercises regional
 * tag resolution, and `README.md` is a plain file that must not be treated as a
 * locale.
 */
const FIXTURE_FOLDERS = ['af', 'en', 'en-US'];

let fixtureRoot: string;
let previousAppDataRoot: string | undefined;

/**
 * These pin the fix for server-rendered strings following a shared language:
 * every request must get its own translation instance, so one caller cannot
 * change what another caller renders.
 */
beforeAll(async () => {
  previousAppDataRoot = process.env.APP_DATA_ROOT;
  fixtureRoot = createI18nFixture(FIXTURE_FOLDERS);

  // A plain file in the bundle root: only directories are locales.
  writeFileSync(join(fixtureRoot, 'i18n', 'README.md'), 'not a locale folder');

  process.env.APP_DATA_ROOT = fixtureRoot;

  // `language.ts` memoises the directory scan, so it has to be cleared before
  // the first read. `jest.resetModules()` is deliberately *not* used here: the
  // createRequestI18n assertions compare against the i18next instance this file
  // initialised, and a fresh module registry would hand `language.ts` a second,
  // uninitialised copy of i18next.
  resetAvailableLanguages();

  if (i18next.isInitialized !== true) {
    await i18next.init({ lng: DEFAULT_LANGUAGE, resources: {} });
  }
});

afterAll(() => {
  resetAvailableLanguages();

  if (previousAppDataRoot === undefined) {
    delete process.env.APP_DATA_ROOT;
  } else {
    process.env.APP_DATA_ROOT = previousAppDataRoot;
  }

  removeI18nFixture(fixtureRoot);
});

describe('normaliseLanguage', () => {
  it('reduces a regional tag to its primary subtag', () => {
    expect(normaliseLanguage('af-ZA')).toBe('af');
    expect(normaliseLanguage('EN_us')).toBe('en');
  });

  it('handles empty input', () => {
    expect(normaliseLanguage(undefined)).toBe('');
    expect(normaliseLanguage('  ')).toBe('');
  });
});

describe('bundle root', () => {
  it('resolves the i18n root from APP_DATA_ROOT', () => {
    // The suite is hermetic: it reads the fixture, not the developer machine.
    expect(getI18nRoot()).toBe(join(fixtureRoot, 'i18n'));
  });

  it('lists only the fixture folders', () => {
    expect(getLocaleFolders()).toEqual(FIXTURE_FOLDERS);
  });
});

describe('getAvailableLanguages', () => {
  it('lists the configured locale folders and includes the default', () => {
    const languages = getAvailableLanguages();

    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThan(0);
    expect(languages.map(normaliseLanguage)).toContain(normaliseLanguage(DEFAULT_LANGUAGE));
  });

  it('normalises and orders the fixture folders, default first', () => {
    // `en` and `en-US` collapse onto `en`; the default leads, the rest sort.
    expect(getAvailableLanguages()).toEqual(['en', 'af']);
  });

  it('returns the same memoised list on repeat calls', () => {
    // Memoised deliberately: the folder listing is stable for a process, and a
    // restart is required to pick up a new locale folder.
    expect(getAvailableLanguages()).toBe(getAvailableLanguages());
  });

  it('rescans after the cache is cleared', () => {
    const first = getAvailableLanguages();

    resetAvailableLanguages();
    const second = getAvailableLanguages();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});

describe('resolveLanguage', () => {
  it('resolves a regional variant to its configured base language', () => {
    expect(getAvailableLanguages()).toContain('af');
    expect(resolveLanguage('af-ZA')).toBe('af');
  });

  it('falls back to the default for an unconfigured language', () => {
    expect(resolveLanguage('zz-ZZ')).toBe(normaliseLanguage(DEFAULT_LANGUAGE));
    expect(resolveLanguage(undefined)).toBe(normaliseLanguage(DEFAULT_LANGUAGE));
  });
});

describe('languageFromHeaders', () => {
  it('prefers the explicit client choice over accept-language', () => {
    expect(
      languageFromHeaders({
        [LANGUAGE_HEADER]: 'af',
        'accept-language': 'en-GB,en;q=0.9',
      })
    ).toBe('af');
  });

  it('falls back to the first accept-language tag', () => {
    expect(languageFromHeaders({ 'accept-language': 'af-ZA,af;q=0.9,en;q=0.8' })).toBe('af-ZA');
  });

  it('returns undefined when nothing is set', () => {
    expect(languageFromHeaders({})).toBeUndefined();
    expect(languageFromHeaders(undefined)).toBeUndefined();
  });
});

describe('createRequestI18n', () => {
  it('gives each request a distinct instance', () => {
    const first = createRequestI18n('en');
    const second = createRequestI18n('en');

    expect(i18next.isInitialized).toBe(true);
    expect(first).not.toBe(second);
  });

  it('reports the requested language on the instance', () => {
    const instance = createRequestI18n('af');

    expect(instance.language).toBe('af');
  });

  it('does not let one request change another request language', async () => {
    const requestA = createRequestI18n('en');
    const requestB = createRequestI18n('en');

    // This is the regression: previously both were the process-wide instance,
    // so this call changed what request B rendered.
    await requestA.changeLanguage('af');

    expect(requestA.language).toBe('af');
    expect(requestB.language).toBe('en');
    expect(i18next.language).toBe('en');
  });

  it('falls back to the shared instance when i18n is not ready', () => {
    const previous = i18next.isInitialized;
    Object.defineProperty(i18next, 'isInitialized', { configurable: true, value: false });

    try {
      expect(createRequestI18n('af')).toBe(i18next);
    } finally {
      Object.defineProperty(i18next, 'isInitialized', { configurable: true, value: previous });
    }
  });
});

describe('resolveLanguage rejects path-shaped input (MF-3)', () => {
  /**
   * The resolver interpolates the resolved locale into a filesystem path, and
   * `ReactoryTranslation(lang:)` is reachable by ANON. `normaliseLanguage` only
   * trims/lowercases/splits, so it left `/` and `.` intact and `lang:
   * "../../../../etc"` escaped APP_DATA_ROOT. Routing through `resolveLanguage`
   * makes the value always one of the configured locales.
   */
  it('does not pass traversal sequences through', () => {
    const resolved = resolveLanguage('../../../../etc');

    expect(resolved).not.toContain('/');
    expect(resolved).not.toContain('..');
    expect(resolved).toBe(normaliseLanguage(DEFAULT_LANGUAGE));
  });

  it('only ever returns a configured language', () => {
    const configured = getAvailableLanguages().map(normaliseLanguage);

    ['../../etc', '..%2f..', 'af/../../..', 'nope', '', undefined].forEach((candidate) => {
      expect(configured).toContain(resolveLanguage(candidate as string));
    });
  });

  it('still resolves a legitimate regional tag', () => {
    // Unconditional now that the fixture guarantees an `af` folder: under the
    // old machine-dependent setup a checkout without `af` silently turned this
    // into a test of nothing.
    expect(resolveLanguage('af-ZA')).toBe('af');
  });
});

describe('languageFromHeaders quality values', () => {
  it('strips a quality value attached to a single tag', () => {
    // Previously `af;q=0.9` was kept whole, matched no configured locale and
    // silently fell back to English.
    expect(languageFromHeaders({ 'accept-language': 'af;q=0.9' })).toBe('af');
  });

  it('strips the quality value from the first tag of a list', () => {
    expect(languageFromHeaders({ 'accept-language': 'af-ZA,af;q=0.9,en;q=0.8' })).toBe('af-ZA');
  });

  it('still prefers the explicit client header', () => {
    expect(
      languageFromHeaders({ [LANGUAGE_HEADER]: 'af', 'accept-language': 'en;q=0.9' })
    ).toBe('af');
  });
});

describe('getAvailableLanguages ordering', () => {
  it('de-duplicates regional variants onto the primary subtag', () => {
    const languages = getAvailableLanguages();

    // `en` and `en-US` folders both normalise to `en`.
    expect(languages.filter((language) => normaliseLanguage(language) === 'en')).toHaveLength(1);
  });

  it('places the default language first', () => {
    expect(getAvailableLanguages()[0]).toBe(normaliseLanguage(DEFAULT_LANGUAGE));
  });

  it('returns only normalised codes', () => {
    getAvailableLanguages().forEach((language) => {
      expect(language).toBe(normaliseLanguage(language));
    });
  });
});

describe('getLocaleFolders', () => {
  it('returns literal on-disk folder names, sorted', () => {
    const folders = getLocaleFolders();

    expect(Array.isArray(folders)).toBe(true);
    expect(folders.length).toBeGreaterThan(0);
    expect(folders.every((folder) => typeof folder === 'string' && folder.length > 0)).toBe(true);
    expect(folders).toEqual([...folders].sort());
    // Files in the bundle root (the fixture's README.md) are not locales.
    expect(folders).toEqual(FIXTURE_FOLDERS);
  });
});

describe('resolveLocaleFolder', () => {
  it('prefers an exact folder', () => {
    expect(resolveLocaleFolder('en', ['af', 'en', 'en-US'])).toBe('en');
  });

  it('falls back to a regional folder sharing the primary subtag', () => {
    // The silent-failure case: `en` has no folder of its own, so resolving to
    // the bare code would load nothing for every request while the selector
    // still offered English.
    expect(resolveLocaleFolder('en', ['af', 'en-US'])).toBe('en-US');
  });

  it('returns undefined when no folder matches', () => {
    expect(resolveLocaleFolder('de', ['af', 'en'])).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(resolveLocaleFolder(undefined, ['en'])).toBeUndefined();
  });
});
