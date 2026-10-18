/**
 * Localisation for transactional email.
 *
 * Email is asynchronous, so the language cannot come from the request that
 * triggered the send: by the time the message is rendered the request is gone,
 * and a support agent resending an activation email is not the person who will
 * read it. The locale therefore comes from the *recipient* — `user.il8n.locale`
 * — and only falls back to the default language when the account has no
 * preference (see `utils/userLanguage`).
 *
 * A dedicated i18next instance is created per send rather than reusing the
 * process-wide one. That mirrors the per-request instance used for server
 * responses and, more importantly, keeps email rendering deterministic: two
 * emails queued for different recipients cannot race on a shared `lng`.
 */
import fs from 'fs';
import path from 'path';
import i18next, { i18n as I18n } from 'i18next';
import {
  DEFAULT_LANGUAGE,
  getI18nRoot,
  normaliseLanguage,
} from '@reactory/server-core/express/i18n/language';
import { resolveUserLocale, IUserLanguageSource } from '@reactory/server-modules/reactory-core/utils/userLanguage';

/** Namespace holding the strings used by the email templates. */
export const EMAIL_NAMESPACE = 'emails';

/** Languages written right-to-left, used to set `dir` on the message body. */
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export interface IEmailTranslator {
  /** Normalised language code the message is rendered in. */
  locale: string;
  /** `ltr` / `rtl`, for the template's `dir` attribute. */
  direction: 'ltr' | 'rtl';
  /** Translate a key in the email namespace. */
  t: (key: string, params?: { [key: string]: any }) => string;
  /** The i18next instance, exposed for tests and advanced callers. */
  instance: I18n;
}

/** Reads one locale's email bundle, or `{}` when it is absent. */
const readEmailBundle = (locale: string, root: string): { [key: string]: any } => {
  try {
    const filePath = path.join(root, locale, `${EMAIL_NAMESPACE}.json`);
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return {};
  }
};

/**
 * The language a message to this recipient should be written in.
 *
 * Exported and separate from the translator so the rule can be asserted
 * without rendering anything.
 */
export const resolveEmailLocale = (
  recipient?: IUserLanguageSource | null,
  fallback: string = DEFAULT_LANGUAGE
): string => resolveUserLocale(recipient, fallback);

/** Direction of a language, for the template's `dir` attribute. */
export const languageDirection = (language?: string): 'ltr' | 'rtl' =>
  RTL_LANGUAGES.indexOf(normaliseLanguage(language)) >= 0 ? 'rtl' : 'ltr';

/**
 * Builds a translator scoped to one recipient's language.
 *
 * Resources are read from disk and injected inline, so the instance is usable
 * immediately (`initImmediate: false`) and does not depend on the server's
 * global i18n having finished initialising — email is also sent from CLI
 * commands and queue workers, where it may not have.
 */
export const createEmailTranslator = async (
  recipient?: IUserLanguageSource | null,
  options: { fallback?: string; i18nRoot?: string } = {}
): Promise<IEmailTranslator> => {
  const fallback = normaliseLanguage(options.fallback || DEFAULT_LANGUAGE) || DEFAULT_LANGUAGE;
  const locale = resolveEmailLocale(recipient, fallback);
  const root = options.i18nRoot || getI18nRoot();

  const localeBundle = readEmailBundle(locale, root);
  const fallbackBundle = readEmailBundle(fallback, root);

  const instance = i18next.createInstance();

  await instance.init({
    lng: locale,
    fallbackLng: fallback,
    ns: [EMAIL_NAMESPACE],
    defaultNS: EMAIL_NAMESPACE,
    // Inline resources and a synchronous init: `t` is callable as soon as
    // `init` resolves, with no backend round trip per send.
    initImmediate: false,
    interpolation: { escapeValue: false },
    resources: {
      [locale]: { [EMAIL_NAMESPACE]: localeBundle },
      // Only register the fallback bundle separately when it is a different
      // language, so an `af` request falls back to English rather than to a
      // half-populated copy of itself.
      ...(locale === fallback ? {} : { [fallback]: { [EMAIL_NAMESPACE]: fallbackBundle } }),
    },
  });

  return {
    locale,
    direction: languageDirection(locale),
    t: (key: string, params?: { [key: string]: any }) =>
      // `defaultValue: key` keeps an unexpected missing key visible as the key
      // itself rather than rendering `undefined` into an email body.
      instance.t(key, { defaultValue: key, ...(params || {}) }) as string,
    instance,
  };
};

/**
 * Subjects that were hardcoded in templates seeded before localisation.
 *
 * A template holding one of these cannot localise itself, so the translated
 * default supersedes it. A genuinely custom subject differs and is preserved.
 */
const LEGACY_SUBJECTS: { [key: string]: string[] } = {
  'emails.activation.subject': [
    'Welcome to <%= applicationTitle %> <%= user.firstName %>, please confirm your account',
  ],
  'emails.forgotPassword.subject': [
    'Follow the steps below to reset your password for <%= applicationTitle %>.',
  ],
};

/**
 * Renders a subject, falling back to a translated default.
 *
 * Two cases have to work at once:
 *
 *   * an **i18n-aware** template (the shipped defaults render
 *     `<%= t('emails.…') %>`) localises itself, so its output is used as-is;
 *   * a **legacy** template still contains the hardcoded English string that
 *     was seeded before localisation existed. It cannot localise itself, so the
 *     translated default replaces it — otherwise an Afrikaans user keeps
 *     getting English until every template is re-seeded.
 *
 * `render` is injected rather than imported so this module stays free of the
 * email transport's dependency graph (the senders need the whole server; this
 * rule does not).
 */
export const renderLocalisedSubject = (
  subjectTemplate: any,
  properties: { [key: string]: any },
  translate: (key: string, params?: { [key: string]: any }) => string,
  fallback: { key: string; params?: { [key: string]: any } },
  render: (template: any, properties: { [key: string]: any }) => string
): string => {
  const translatedDefault = translate(fallback.key, fallback.params);
  if (!subjectTemplate) return translatedDefault;

  const rawContent = typeof subjectTemplate === 'string'
    ? subjectTemplate
    : subjectTemplate.content;

  const legacyDefaults = LEGACY_SUBJECTS[fallback.key] || [];
  if (typeof rawContent === 'string' && legacyDefaults.indexOf(rawContent.trim()) >= 0) {
    return translatedDefault;
  }

  try {
    const rendered = render(subjectTemplate, properties);
    return rendered && rendered.trim().length > 0 ? rendered : translatedDefault;
  } catch (renderError) {
    return translatedDefault;
  }
};

/**
 * Adds the translation helpers to an EJS property bag.
 *
 * Templates receive `t`, `locale` and `dir`, so a shipped template can be
 * localised (`<%= t('emails.activation.intro', { applicationTitle }) %>`)
 * without the send path having to know the template's internals.
 */
export const emailTemplateProperties = (
  translator: IEmailTranslator,
  properties: { [key: string]: any } = {}
): { [key: string]: any } => ({
  ...properties,
  locale: translator.locale,
  dir: translator.direction,
  t: translator.t,
});
