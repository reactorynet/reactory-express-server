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
 */
import { i18nextInitOptions } from '../index';
import {
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getI18nRoot,
  getLocaleFolders,
  normaliseLanguage,
  resolveLocaleFolder,
} from '../language';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('i18n instance language', () => {
  const folders = getLocaleFolders();

  it('preloads the language codes the selector offers', () => {
    // Codes, not folder names: the set has to match `getAvailableLanguages`, so
    // that everything the selector offers is loaded and nothing else.
    expect(i18nextInitOptions.preload).toEqual(getAvailableLanguages());
  });

  it('defaults to the shared default language code, not a regional variant', () => {
    const expected = normaliseLanguage(DEFAULT_LANGUAGE);

    expect(i18nextInitOptions.lng).toBe(expected);
    expect(i18nextInitOptions.fallbackLng).toBe(expected);
    // `en-US` is the shape that caused the original drift.
    expect(i18nextInitOptions.lng).not.toContain('-');
  });

  it('maps a loaded language code onto the folder that holds it', () => {
    if (folders.length === 0) return;

    const { loadPath } = i18nextInitOptions.backend as { loadPath: Function };
    expect(typeof loadPath).toBe('function');

    // The code stays the code; only the resolved path knows about the folder.
    expect(loadPath(i18nextInitOptions.lng, 'common')).toBe(
      `${getI18nRoot()}/${resolveLocaleFolder(i18nextInitOptions.lng)}/common.json`
    );
  });

  it('has a folder for the language it defaults to', () => {
    if (folders.length > 0) {
      expect(resolveLocaleFolder(DEFAULT_LANGUAGE)).toBeDefined();
    }
  });
});
