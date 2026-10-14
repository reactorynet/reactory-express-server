/**
 * The i18n instance default and `DEFAULT_LANGUAGE` used to disagree: the
 * instance was initialised with the regional `en-US` while the request resolver
 * normalises to `en`, so which bundles loaded depended on whether the request
 * context was ready. They now derive from the same constant — and resolve to a
 * *folder the backend can load*, since the fs backend matches `{{lng}}` against
 * literal folder names rather than normalised codes.
 */
import { i18nextInitOptions } from '../index';
import { DEFAULT_LANGUAGE, getLocaleFolders, normaliseLanguage } from '../language';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('i18n instance default language', () => {
  const folders = getLocaleFolders();

  it('preloads exactly the on-disk locale folders', () => {
    // Literal folder names, not normalised codes: a normalised list would drop
    // `en-US` (which normalises to `en`), and the backend resolves `{{lng}}`
    // against the folder name, so it would silently load nothing for it.
    if (folders.length > 0) {
      expect(i18nextInitOptions.preload).toEqual(folders);
    }
  });

  it('preloads the language it defaults to', () => {
    expect(i18nextInitOptions.preload).toContain(i18nextInitOptions.lng);
  });

  it('resolves the default to a folder the backend can actually load', () => {
    if (folders.length > 0) {
      expect(folders).toContain(i18nextInitOptions.lng);
      expect(folders).toContain(i18nextInitOptions.fallbackLng);
    }
  });

  it('agrees with the shared default language', () => {
    expect(normaliseLanguage(i18nextInitOptions.lng)).toBe(normaliseLanguage(DEFAULT_LANGUAGE));
    expect(normaliseLanguage(i18nextInitOptions.fallbackLng)).toBe(
      normaliseLanguage(DEFAULT_LANGUAGE)
    );
  });
});
