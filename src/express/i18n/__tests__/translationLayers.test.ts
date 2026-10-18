import {
  TRANSLATION_PRECEDENCE,
  bundleFromTranslations,
  resolveTranslationBundle,
} from '../translationLayers';

/**
 * Translation values reach a caller from three layers. Before this helper the
 * order was accidental and the JSON bundle always won, so a CMS edit could be
 * silently shadowed. These tests pin the rule down.
 */
describe('translation layer precedence', () => {
  it('declares the layers in ascending authority', () => {
    expect(TRANSLATION_PRECEDENCE).toEqual(['module', 'file', 'cms']);
  });

  it('lets a shipped file value override a compiled module default', () => {
    const bundle = resolveTranslationBundle({
      module: { 'common.search': 'Search (module)' },
      file: { 'common.search': 'Search' },
    });

    expect(bundle['common.search']).toBe('Search');
  });

  it('lets a CMS value override the shipped file value', () => {
    const bundle = resolveTranslationBundle({
      module: { 'common.search': 'Search (module)' },
      file: { 'common.search': 'Search' },
      cms: { 'common.search': 'Soek' },
    });

    expect(bundle['common.search']).toBe('Soek');
  });

  /**
   * The regression this module exists for: a file value must not win over a
   * CMS value, which is what the previous
   * `{ ...serviceBundle, ...fileContent }` spread did.
   */
  it('does not let a file value shadow a CMS value', () => {
    const fileContent = { 'support-ticket-delete-action': 'Delete Ticket' };
    const cmsContent = { 'support-ticket-delete-action': 'Verwyder Kaartjie' };

    const merged = resolveTranslationBundle({ file: fileContent, cms: cmsContent });

    expect(merged['support-ticket-delete-action']).toBe('Verwyder Kaartjie');
    // The spread the old code used, kept here as the counter-example.
    expect({ ...cmsContent, ...fileContent }['support-ticket-delete-action']).toBe(
      'Delete Ticket'
    );
  });

  it('keeps keys that only a lower layer defines', () => {
    const bundle = resolveTranslationBundle({
      module: { 'module.only': 'module' },
      file: { 'file.only': 'file' },
      cms: { 'cms.only': 'cms' },
    });

    expect(bundle).toEqual({
      'module.only': 'module',
      'file.only': 'file',
      'cms.only': 'cms',
    });
  });

  it('treats an absent layer as empty rather than erasing lower values', () => {
    const bundle = resolveTranslationBundle({
      module: { 'common.search': 'Search' },
      file: undefined,
      cms: null,
    });

    expect(bundle['common.search']).toBe('Search');
  });

  it('does not let an empty CMS value blank a shipped string', () => {
    const bundle = resolveTranslationBundle({
      file: { 'common.search': 'Search' },
      cms: { 'common.search': '' },
    });

    // An empty string is a deliberate value (an editor cleared the field), but
    // `undefined`/`null` is a missing row and must not override.
    expect(bundle['common.search']).toBe('');
  });

  it('ignores null and undefined values from a higher layer', () => {
    const bundle = resolveTranslationBundle({
      file: { 'common.search': 'Search' },
      cms: { 'common.search': null, 'common.other': undefined },
    });

    expect(bundle['common.search']).toBe('Search');
    expect(bundle['common.other']).toBeUndefined();
  });

  it('ignores non-object layers', () => {
    const bundle = resolveTranslationBundle({
      file: { 'common.search': 'Search' },
      cms: 'not-a-bundle' as any,
    });

    expect(bundle).toEqual({ 'common.search': 'Search' });
  });
});

describe('bundleFromTranslations', () => {
  it('flattens persisted rows into a flat map', () => {
    expect(
      bundleFromTranslations([
        { key: 'common.search', translation: 'Search' },
        { key: 'common.cancel', translation: 'Cancel' },
      ])
    ).toEqual({ 'common.search': 'Search', 'common.cancel': 'Cancel' });
  });

  it('skips rows without a key or a value', () => {
    expect(
      bundleFromTranslations([
        { key: 'common.search' },
        { translation: 'orphan' },
        { key: 'common.cancel', translation: 'Cancel' },
      ])
    ).toEqual({ 'common.cancel': 'Cancel' });
  });

  it('passes an already-flat map through', () => {
    expect(bundleFromTranslations({ 'common.search': 'Search' })).toEqual({
      'common.search': 'Search',
    });
  });

  it('returns an empty bundle for missing input', () => {
    expect(bundleFromTranslations(undefined)).toEqual({});
    expect(bundleFromTranslations(null)).toEqual({});
  });
});
