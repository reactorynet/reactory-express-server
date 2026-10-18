/**
 * Reading and writing the user's persisted language preference.
 *
 * The preference lives on `user.il8n.locale` (see `models/User.ts`). Two rules
 * matter and are enforced here rather than at each call site:
 *
 *   1. only a language the server actually ships may be stored — otherwise a
 *      profile can end up pointing at a locale folder that does not exist and
 *      the user quietly falls back to English forever; and
 *   2. reads normalise and validate, so a record written before a locale was
 *      removed (or by a hand-edited document) cannot make a caller render in a
 *      language that has no bundles.
 *
 * `localStorage` on the client remains the pre-auth/first-paint fallback; this
 * module is the server-side durable record that makes the choice follow the
 * user across browsers and devices.
 */
import {
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  normaliseLanguage,
} from '@reactory/server-core/express/i18n/language';

/** Minimal shape read from a user document for language resolution. */
export interface IUserLanguageSource {
  il8n?: { locale?: string } | null;
}

/**
 * Validates a requested locale against the languages that ship.
 *
 * Returns the normalised code (`af-ZA` -> `af`) when the language is available,
 * and `null` when it is not — a caller that persists the result must therefore
 * treat `null` as "reject", not "store the raw input".
 */
export const validateUserLocale = (
  requested?: string,
  available: string[] = getAvailableLanguages()
): string | null => {
  const normalised = normaliseLanguage(requested);
  if (!normalised) return null;

  const match = (available || []).find(
    (language) => normaliseLanguage(language) === normalised
  );

  return match ? normalised : null;
};

/**
 * The language to render for a user, or the supplied fallback.
 *
 * Used by paths that have no request headers to read — most importantly the
 * transactional email send, which is asynchronous and must use the recipient's
 * stored preference rather than the language of whatever request triggered it.
 */
export const resolveUserLocale = (
  user?: IUserLanguageSource | null,
  fallback: string = DEFAULT_LANGUAGE
): string => {
  const stored = user?.il8n?.locale;
  const validated = validateUserLocale(stored);
  if (validated) return validated;

  return normaliseLanguage(fallback) || DEFAULT_LANGUAGE;
};
