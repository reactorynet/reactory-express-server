/**
 * Precedence rules for the layers a translation value can come from.
 *
 * Translation data reaches a caller from three places, and before this module
 * existed the order was accidental: `getTranslations` and the
 * `ReactoryTranslation` resolver both spread the JSON bundle over whatever the
 * service had produced, so a string committed to
 * `reactory-data/i18n/<locale>/<ns>.json` always beat a row edited through the
 * CMS (`ReactorySetTranslation`). A content editor could therefore correct a
 * typo, see it in the panel, and have the site keep serving the old text with
 * nothing in the logs — the JSON file silently shadowed the database.
 *
 * The rule is now explicit, and asserted in
 * `__tests__/translationLayers.test.ts`:
 *
 *   1. `module`  — translations compiled into a module (`module.translations`).
 *                  The lowest authority: they ship with the code and are the
 *                  fallback for a string no bundle has been translated for.
 *   2. `file`    — the JSON bundles under `i18n/<locale>/<ns>.json`. These are
 *                  the reviewed, shipped baseline for a locale.
 *   3. `cms`     — rows persisted by the CMS (`ReactoryTranslation`). Highest
 *                  authority: a human editing translations at runtime is
 *                  correcting shipped data, so their value must win.
 *
 * Later layers override earlier ones; a `null`/`undefined` value in a higher
 * layer is *not* an override (an empty CMS field must not blank a shipped
 * string), which is why a missing key is skipped rather than written as
 * `undefined`.
 */

/** A flat translation map: `{ [key]: translatedString }`. */
export interface ITranslationBundle {
  [key: string]: any;
}

/** The layers translation values can be read from, in ascending authority. */
export type TranslationLayer = 'module' | 'file' | 'cms';

/**
 * Ascending authority. Exported so callers and tests can assert the ordering
 * rather than restating it.
 */
export const TRANSLATION_PRECEDENCE: TranslationLayer[] = ['module', 'file', 'cms'];

/** A partial set of layers; any layer may be absent. */
export interface ITranslationLayers {
  module?: ITranslationBundle | null;
  file?: ITranslationBundle | null;
  cms?: ITranslationBundle | null;
}

/**
 * Merges translation layers using {@link TRANSLATION_PRECEDENCE}.
 *
 * Values are only taken from a layer when the key is present and the value is
 * defined, so an absent layer (or a bundle that failed to load) leaves the
 * lower-authority value intact instead of erasing it.
 */
export const resolveTranslationBundle = (
  layers: ITranslationLayers
): ITranslationBundle => {
  const resolved: ITranslationBundle = {};

  TRANSLATION_PRECEDENCE.forEach((layer) => {
    const bundle = layers[layer];
    if (!bundle || typeof bundle !== 'object') return;

    Object.keys(bundle).forEach((key) => {
      const value = bundle[key];
      if (value === undefined || value === null) return;
      resolved[key] = value;
    });
  });

  return resolved;
};

/**
 * Flattens the GraphQL/JSON shape of a persisted translation row into the flat
 * `{ [key]: value }` map the layers expect.
 *
 * Rows arrive either already flat (`{ key, translation }`) or grouped by
 * namespace; both are accepted so the caller does not have to know which
 * storage shape produced them.
 */
export const bundleFromTranslations = (
  translations?:
    | Array<{ key?: string; translation?: any }>
    | { [key: string]: any }
    | null
): ITranslationBundle => {
  if (!translations) return {};

  if (Array.isArray(translations)) {
    const bundle: ITranslationBundle = {};
    translations.forEach((entry) => {
      if (entry && typeof entry.key === 'string' && entry.translation !== undefined) {
        bundle[entry.key as string] = entry.translation;
      }
    });
    return bundle;
  }

  if (typeof translations === 'object') {
    return { ...translations };
  }

  return {};
};
