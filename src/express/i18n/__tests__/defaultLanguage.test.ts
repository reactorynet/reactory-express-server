/**
 * The i18n instance default and `DEFAULT_LANGUAGE` used to disagree: the
 * instance was initialised with the regional `en-US` while the request resolver
 * normalises to `en`, so which bundles loaded depended on whether the request
 * context was ready. They now derive from the same constant.
 */
import { i18nextInitOptions } from '../index';
import { DEFAULT_LANGUAGE, normaliseLanguage } from '../language';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('i18n instance default language', () => {
  const expected = normaliseLanguage(DEFAULT_LANGUAGE);

  it('uses the shared default language for the instance language', () => {
    expect(i18nextInitOptions.lng).toBe(expected);
  });

  it('uses the shared default language as the fallback', () => {
    expect(i18nextInitOptions.fallbackLng).toBe(expected);
  });

  it('preloads the default language', () => {
    expect(i18nextInitOptions.preload).toContain(expected);
  });

  it('uses a primary subtag, not a regional variant', () => {
    // `en-US` is the shape that caused the drift; the resolver never returns it.
    expect(i18nextInitOptions.lng).not.toContain('-');
    expect(String(i18nextInitOptions.fallbackLng)).not.toContain('-');
  });
});
