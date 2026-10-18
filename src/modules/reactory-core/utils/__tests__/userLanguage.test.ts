import { resolveUserLocale, validateUserLocale } from '../userLanguage';

/**
 * The language preference used to live in `localStorage` only, so a user lost
 * their choice on a new browser or device even though the server knew who they
 * were. These tests pin the rules that make the persisted field safe to use:
 * only shipped languages are stored, and a stored value is re-validated on read.
 */
describe('validateUserLocale', () => {
  const available = ['en', 'af', 'de'];

  it('accepts a shipped language', () => {
    expect(validateUserLocale('af', available)).toBe('af');
  });

  it('normalises a regional tag onto its primary subtag', () => {
    expect(validateUserLocale('af-ZA', available)).toBe('af');
    expect(validateUserLocale('af_ZA', available)).toBe('af');
  });

  it('normalises casing', () => {
    expect(validateUserLocale('AF', available)).toBe('af');
  });

  it('rejects a language the server does not ship', () => {
    expect(validateUserLocale('zz', available)).toBeNull();
  });

  it('rejects empty and missing input', () => {
    expect(validateUserLocale(undefined, available)).toBeNull();
    expect(validateUserLocale('', available)).toBeNull();
    expect(validateUserLocale('   ', available)).toBeNull();
  });
});

describe('resolveUserLocale', () => {
  const available = ['en', 'af', 'de'];

  it('returns the stored preference', () => {
    expect(resolveUserLocale({ il8n: { locale: 'de' } }, 'en')).toBe('de');
  });

  it('returns the fallback when there is no stored preference', () => {
    expect(resolveUserLocale({ il8n: {} }, 'en')).toBe('en');
    expect(resolveUserLocale({}, 'en')).toBe('en');
    expect(resolveUserLocale(null, 'en')).toBe('en');
  });

  it('returns the fallback when the stored language is no longer shipped', () => {
    // A locale folder removed after a user chose it must not pin the account to
    // a language with no bundles.
    expect(resolveUserLocale({ il8n: { locale: 'zz' } }, 'en')).toBe('en');
  });

  it('normalises the fallback', () => {
    expect(resolveUserLocale({}, 'EN-GB')).toBe('en');
  });
});
