/**
 * Request-scoped language resolution.
 *
 * Kept free of module-level and logging imports on purpose: the context
 * provider and the translation service both depend on this, and pulling in the
 * module registry would create an import cycle.
 */
import i18next from 'i18next';
import fs from 'fs';
import path from 'path';

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

  try {
    const entries = fs.readdirSync(path.resolve(dataRoot(), 'i18n'), { withFileTypes: true });
    const found = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    cachedLanguages = found.length > 0 ? found : [DEFAULT_LANGUAGE];
  } catch (error) {
    cachedLanguages = [DEFAULT_LANGUAGE];
  }

  return cachedLanguages;
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
  return value.split(',')[0].trim() || undefined;
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
