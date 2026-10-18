/**
 * Reading and writing the user's persisted language preference.
 *
 * The preference lives on `user.il8n.locale` (see `models/User.ts`).
 *
 * Two different questions are asked of a stored locale, and they need different
 * answers:
 *
 *   * **Writing** must validate against the shipped locales. Storing a locale
 *     with no bundles would pin an account to a language the product cannot
 *     render, and the user would see English forever with no way to tell why.
 *     `validateUserLocale` is the write-path rule, used by
 *     `setUserLanguage` and `UserService.updateUser`.
 *
 *   * **Reading** must *not* validate against the shipped locales. What this
 *     process happens to have mounted is not a property of the account: a
 *     deployment without the data volume, a cold start before the locale
 *     folders are read, or a CI checkout with no `i18n/` tree would all silently
 *     revert a user's saved choice to English. A missing bundle is already
 *     handled per key by i18next's `fallbackLng`, so resolution just returns
 *     what the account asked for and lets the fallback do its job.
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

/** A BCP-47-ish tag: a 2-3 letter primary subtag, optionally regioned. */
const LANGUAGE_TAG = /^[a-z]{2,3}([-_][a-z0-9]{2,8})*$/;

/**
 * Validates a requested locale against the languages that ship.
 *
 * Returns the normalised code (`af-ZA` -> `af`) when the language is available,
 * and `null` when it is not — a caller that persists the result must therefore
 * treat `null` as "reject", not "store the raw input".
 *
 * Only for the write path. See the module comment for why reads must not use
 * this.
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
 *
 * Deliberately does not consult the on-disk locale list: see the module comment.
 * Only a structurally implausible value (empty, or not a language tag at all) is
 * discarded, so a hand-edited field cannot inject a path or an injection vector
 * into a bundle lookup.
 */
export const resolveUserLocale = (
  user?: IUserLanguageSource | null,
  fallback: string = DEFAULT_LANGUAGE
): string => {
  const stored = normaliseLanguage(user?.il8n?.locale);
  if (stored && LANGUAGE_TAG.test(stored)) return stored;

  return normaliseLanguage(fallback) || DEFAULT_LANGUAGE;
};
