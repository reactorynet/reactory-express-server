/**
 * The i18n instance used to disagree with `DEFAULT_LANGUAGE`: it was
 * initialised with the regional `en-US` while the request resolver normalises to
 * `en`, so which bundles loaded depended on whether the request context was
 * ready.
 *
 * The two concerns are now separate and both are pinned here:
 *   - the *filter identity* is the normalised language code (`en`), used by the
 *     selector, the bundle `locale` and the `language` argument; and
 *   - the *loader* maps that code onto the folder that actually holds the
 *     bundle, so a code with no folder of its own (`en` when the bundle lives in
 *     `en-US/`) still loads instead of silently resolving to nothing.
 *
 * Both are asserted against a temporary bundle tree rather than the machine's
 * data root. Previously this suite read `src/reactory/test-data/i18n`, which is
 * gitignored and therefore empty in CI, and every folder-dependent assertion
 * silently returned early — the suite could not run in a server-only checkout
 * at all.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { createI18nFixture, removeI18nFixture } from './support/i18nFixture';

type LanguageModule = typeof import('../language');
type I18nextInitOptions = typeof import('../index').i18nextInitOptions;

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * `../index` asks the module registry for its i18n namespaces at import time.
 * A bare server checkout has no `${MODULES_ENABLED}.json` (the module folders
 * are separate repositories), so `getModuleDefinitions()` throws and the suite
 * fails to load. Module namespaces are not what this suite is about — the
 * language/default reconciliation is — so the registry is stubbed to "no extra
 * modules" rather than skipped entirely.
 */
jest.mock('@reactory/server-core/modules/helpers/moduleImportFactory', () => ({
  getModuleDefinitions: () => [],
}));

/** Only a regional folder: this is the shape that caused the `en`/`en-US` drift. */
const FIXTURE_FOLDERS = ['en-US'];

let fixtureRoot: string;
let previousAppDataRoot: string | undefined;
let language: LanguageModule;
let i18nextInitOptions: I18nextInitOptions;

beforeAll(() => {
  previousAppDataRoot = process.env.APP_DATA_ROOT;
  fixtureRoot = createI18nFixture(FIXTURE_FOLDERS, 'reactory-i18n-default-');
  // A real bundle, so the backend has something to load and the test is not
  // relying on load failures being tolerated.
  writeFileSync(join(fixtureRoot, 'i18n', 'en-US', 'common.json'), '{"greeting":"Hello"}');

  process.env.APP_DATA_ROOT = fixtureRoot;

  // `index.ts` captures `getI18nRoot()` at import time, so the fixture must be
  // in place before it is loaded — hence `require` after `resetModules()`
  // rather than a static import. Language and index are required from the same
  // fresh registry so they share one memoised folder scan.
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  language = require('../language');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ i18nextInitOptions } = require('../index'));
});

afterAll(() => {
  if (previousAppDataRoot === undefined) {
    delete process.env.APP_DATA_ROOT;
  } else {
    process.env.APP_DATA_ROOT = previousAppDataRoot;
  }

  removeI18nFixture(fixtureRoot);
});

describe('i18n instance language', () => {
  it('preloads the language codes the selector offers', () => {
    // Codes, not folder names: the set has to match `getAvailableLanguages`, so
    // that everything the selector offers is loaded and nothing else.
    expect(i18nextInitOptions.preload).toEqual(language.getAvailableLanguages());
    expect(i18nextInitOptions.preload).toEqual(['en']);
  });

  it('defaults to the shared default language code, not a regional variant', () => {
    const expected = language.normaliseLanguage(language.DEFAULT_LANGUAGE);

    expect(i18nextInitOptions.lng).toBe(expected);
    expect(i18nextInitOptions.fallbackLng).toBe(expected);
    // `en-US` is the shape that caused the original drift.
    expect(i18nextInitOptions.lng).not.toContain('-');
  });

  it('maps a loaded language code onto the folder that holds it', () => {
    const { loadPath } = i18nextInitOptions.backend as { loadPath: Function };
    expect(typeof loadPath).toBe('function');

    // The code stays the code; only the resolved path knows about the folder.
    expect(loadPath(i18nextInitOptions.lng, 'common')).toBe(
      `${language.getI18nRoot()}/${language.resolveLocaleFolder(i18nextInitOptions.lng)}/common.json`
    );
    expect(loadPath(i18nextInitOptions.lng, 'common')).toBe(
      join(fixtureRoot, 'i18n', 'en-US', 'common.json')
    );
  });

  it('has a folder for the language it defaults to', () => {
    expect(language.getLocaleFolders()).toEqual(['en-US']);
    expect(language.resolveLocaleFolder(language.DEFAULT_LANGUAGE)).toBe('en-US');
  });
});
