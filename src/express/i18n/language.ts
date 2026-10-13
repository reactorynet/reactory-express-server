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
import logger from '@reactory/server-core/logging';

/** Language used when nothing else can be resolved. */
export const DEFAULT_LANGUAGE = process.env.DEFAULT_LOCALE || 'en';

/** Header a client sets to state the language the user actually chose. */
export const LANGUAGE_HEADER = 'x-reactory-language';

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

let cachedLanguages: string[] | null = null;

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
  const i18nRoot = path.resolve(dataRoot(), 'i18n');

  try {
    const entries = fs.readdirSync(i18nRoot, { withFileTypes: true });

    // Normalised and de-duplicated: the folder listing can hold regional
    // variants of one language (en alongside en-US), which would otherwise
    // appear as separate choices and push the default out of first position.
    const seen: { [code: string]: boolean } = {};
    const found: string[] = [];

    entries
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => {
        const normalised = normaliseLanguage(entry.name);
        if (!normalised || seen[normalised]) return;
        seen[normalised] = true;
        found.push(normalised);
      });

    if (found.length === 0) {
      logger.warn('No locale folders found under ' + i18nRoot + '; defaulting to ' + fallback[0]);
      return fallback;
    }

    // Default language first so the selector leads with it.
    const ordered = [
      ...found.filter((language) => language === fallback[0]),
      ...found.filter((language) => language !== fallback[0]).sort(),
    ];

    cachedLanguages = ordered;
    return cachedLanguages;
  } catch (error) {
    // Not cached, so a later call can succeed once the path is corrected.
    logger.warn(
      'Could not read locale folders under ' + i18nRoot + '; falling back to ' + fallback[0],
      { error },
    );
    return fallback;
  }
};

/** Clears the memoised language scan. Intended for tests. */
export const resetAvailableLanguages = (): void => {
  cachedLanguages = null;
};

/**
 * Resolves a requested tag against the configured languages, falling back to
 * the default. Accepts regional variants (`af-ZA` resolves to `af`).
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
  const explicit = headers[LANGUAGE_HEADER];
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
