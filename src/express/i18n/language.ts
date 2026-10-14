/**
 * Request-scoped language resolution.
 *
 * Deliberately free of module-registry imports: the context provider and the
 * translation service both depend on this file, and importing the registry
 * would create a cycle. The logger is a leaf module (winston + fs), so it is
 * safe to use here.
 */
import i18next from 'i18next';
import fs from 'fs';
import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

/** Language used when nothing else can be resolved. */
export const DEFAULT_LANGUAGE = process.env.DEFAULT_LOCALE || 'en';

/**
 * Header a client sets to state the language the user actually chose.
 *
 * Taken from the shared core constant rather than a literal so that this and
 * the CORS allowlist (`express/cors`) and the client's request headers all name
 * the same header. When the two sides drifted, the header fell out of the
 * allowlist and every GraphQL request failed its preflight — which presents as
 * "all GraphQL is broken" rather than a localisation problem.
 */
export const { LANGUAGE_HEADER } = Reactory;

/**
 * Reduces a tag to its lowercase primary subtag (`af-ZA` -> `af`), matching how
 * translatable content is keyed.
 */
export const normaliseLanguage = (language?: string): string =>
  (language || '').trim().toLowerCase().split(/[-_]/)[0];

/** Root of the on-disk translation bundles. */
const dataRoot = (): string =>
  process.env.APP_DATA_ROOT ||
  process.env.REACTORY_DATA ||
  path.resolve(process.cwd(), '../reactory-data');

/** Root folder holding the per-locale bundle directories. */
export const getI18nRoot = (): string => path.resolve(dataRoot(), 'i18n');

let cachedLanguages: string[] | null = null;
let cachedFolders: string[] | null = null;

/**
 * Locale folder names exactly as they exist on disk (`en`, `en-US`, `af`).
 *
 * `getAvailableLanguages` normalises these to language codes for the selector
 * and the language filter (`en-US` -> `en`). The bundle *loader* needs the
 * literal folder, which is what `resolveLocaleFolder` provides — the two are
 * deliberately separate: a code is a stable filter identity, a folder is a
 * storage detail.
 */
export const getLocaleFolders = (): string[] => {
  if (cachedFolders) return cachedFolders;

  try {
    const entries = fs.readdirSync(getI18nRoot(), { withFileTypes: true });
    cachedFolders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    // Not cached, so a later call can succeed once the path is corrected.
    cachedFolders = null;
    return [];
  }

  return cachedFolders;
};

/**
 * Maps a language code onto a locale folder the backend can actually load.
 *
 * An exact folder wins (`en` -> `en`); otherwise a regional folder sharing the
 * primary subtag is used (`en` -> `en-US`). Without this, resolution can return
 * a code that is not on disk, and every request silently loads no translations
 * while the selector still offers the language.
 */
export const resolveLocaleFolder = (language?: string, folders?: string[]): string | undefined => {
  const normalised = normaliseLanguage(language);
  if (!normalised) return undefined;

  const candidates = folders || getLocaleFolders();
  return (
    candidates.find((folder) => folder === normalised)
    || candidates.find((folder) => normaliseLanguage(folder) === normalised)
  );
};

/**
 * The languages that actually have translation folders on disk.
 *
 * This is the source of truth for what a user may select, so adding a locale
 * folder is all that is required to make it available — the client no longer
 * carries its own list.
 */
export const getAvailableLanguages = (): string[] => {
  if (cachedLanguages && cachedLanguages.length > 0) return cachedLanguages;

  const fallback = [normaliseLanguage(DEFAULT_LANGUAGE)];
  const folders = getLocaleFolders();

  if (folders.length === 0) {
    logger.warn(`No locale folders found under ${getI18nRoot()}; defaulting to ${fallback[0]}`);
    return fallback;
  }

  // Normalised and de-duplicated: the folder listing can hold regional variants
  // of one language (en alongside en-US), which would otherwise appear as
  // separate choices and push the default out of first position.
  const seen: { [code: string]: boolean } = {};
  const found: string[] = [];

  folders.forEach((name) => {
    const normalised = normaliseLanguage(name);
    if (!normalised || seen[normalised]) return;
    seen[normalised] = true;
    found.push(normalised);
  });

  // Default language first so the selector leads with it.
  const ordered = [
    ...found.filter((language) => language === fallback[0]),
    ...found.filter((language) => language !== fallback[0]).sort(),
  ];

  cachedLanguages = ordered;
  return cachedLanguages;
};

/** Clears the memoised scans. Intended for tests. */
export const resetAvailableLanguages = (): void => {
  cachedLanguages = null;
  cachedFolders = null;
};

/**
 * Resolves a requested tag against the configured languages, falling back to
 * the default. Accepts regional variants (`af-ZA` resolves to `af`).
 *
 * Returns the normalised language code, which is the stable identity used for
 * the language filter (bundle `locale`, `context.i18n.language`) and by the
 * selector. It is deliberately *not* a folder name: the loader maps codes onto
 * on-disk folders, so a regional folder (`en-US`) never leaks into the filter.
 */
export const resolveLanguage = (requested?: string): string => {
  const available = getAvailableLanguages();
  const normalised = normaliseLanguage(requested);

  if (normalised) {
    const match = available.find((language) => normaliseLanguage(language) === normalised);
    if (match) return normaliseLanguage(match);
  }

  const fallback = available.find(
    (language) => normaliseLanguage(language) === normaliseLanguage(DEFAULT_LANGUAGE)
  );

  return normaliseLanguage(fallback || DEFAULT_LANGUAGE);
};

/**
 * Reads the requested language from request headers.
 *
 * An explicit client choice wins over the browser's `Accept-Language`, which may
 * list several tags with quality values — only the first is meaningful here and
 * the caller validates it against the configured languages.
 */
export const languageFromHeaders = (
  headers?: { [key: string]: string | string[] | undefined }
): string | undefined => {
  if (!headers) return undefined;
  // Node lower-cases incoming header names, so look the constant up in lower
  // case rather than assuming it is already lower-case — otherwise a casing
  // change in the shared constant would stop the header being read at all.
  const explicit = headers[LANGUAGE_HEADER.toLowerCase()];
  const raw = Array.isArray(explicit) ? explicit[0] : explicit || headers['accept-language'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;

  // `af;q=0.9` and `af-ZA,af;q=0.9` both denote `af`. Keeping the quality value
  // meant the tag never matched a configured locale and fell back to English.
  const tag = value.split(',')[0].split(';')[0].trim();
  return tag || undefined;
};

/**
 * A translation instance scoped to one request.
 *
 * Without this every request shares the process-wide instance, so one caller's
 * `changeLanguage` changes what every other caller renders — including
 * server-authored strings such as form titles. Clones share the resource store,
 * so this costs a language pointer rather than a copy of the bundles.
 *
 * Falls back to the shared instance when i18n is not ready yet, which keeps
 * start-up and CLI paths working.
 */
export const createRequestI18n = (language?: string) => {
  const target = language || DEFAULT_LANGUAGE;

  try {
    if (i18next && i18next.isInitialized === true && typeof i18next.cloneInstance === 'function') {
      return i18next.cloneInstance({ lng: target });
    }
  } catch (error) {
    // Fall through to the shared instance rather than failing the request.
  }

  return i18next;
};
