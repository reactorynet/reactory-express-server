import ejs from 'ejs';
import {
  mkdirSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync, writeFileSync
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  createEmailTranslator,
  emailTemplateProperties,
  languageDirection,
  renderLocalisedSubject,
  resolveEmailLocale,
} from '../i18n';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * Transactional email used to be hardcoded English, so a user who had selected
 * Afrikaans still received an English message. These tests pin the two halves of
 * the fix: the language comes from the recipient's stored preference, and the
 * rendered message actually uses it.
 */

const EMAIL_BUNDLES: { [locale: string]: { [key: string]: string } } = {
  en: {
    'emails.activation.subject': 'Welcome to {{applicationTitle}} {{firstName}}, please confirm your account',
    'emails.activation.intro': 'Welcome to {{applicationTitle}}.',
    'emails.activation.instructions': 'Please take a moment to complete your registration by clicking on the link below',
    'emails.forgotPassword.subject': 'Follow the steps below to reset your password for {{applicationTitle}}.',
    'emails.forgotPassword.intro': 'Hi, {{firstName}}',
    'emails.forgotPassword.requested': 'You have requested a password reset for {{applicationTitle}}.',
    'emails.forgotPassword.linkLabel': 'Reset Password',
  },
  af: {
    'emails.activation.subject': 'Welkom by {{applicationTitle}} {{firstName}}, bevestig asseblief jou rekening',
    'emails.activation.intro': 'Welkom by {{applicationTitle}}.',
    'emails.activation.instructions': "Neem asseblief 'n oomblik om jou registrasie te voltooi deur op die skakel hieronder te klik",
    'emails.forgotPassword.subject': 'Volg die stappe hieronder om jou wagwoord vir {{applicationTitle}} te herstel.',
    'emails.forgotPassword.intro': 'Hallo, {{firstName}}',
    'emails.forgotPassword.requested': "Jy het 'n wagwoordherstel vir {{applicationTitle}} aangevra.",
    'emails.forgotPassword.linkLabel': 'Herstel Wagwoord',
  },
};


/**
 * Removes a fixture tree depth-first.
 *
 * `fs.rmSync` post-dates this repository's `@types/node`, so using it would add
 * a new entry to the typecheck baseline for a test helper.
 */
const removeTree = (directory: string): void => {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) removeTree(entryPath);
    else unlinkSync(entryPath);
  });
  rmdirSync(directory);
};

let i18nRoot: string;

beforeEach(() => {
  i18nRoot = mkdtempSync(join(tmpdir(), 'reactory-email-i18n-'));
  Object.keys(EMAIL_BUNDLES).forEach((locale) => {
    mkdirSync(join(i18nRoot, locale), { recursive: true });
    writeFileSync(
      join(i18nRoot, locale, 'emails.json'),
      JSON.stringify(EMAIL_BUNDLES[locale]),
      'utf8'
    );
  });
});

afterEach(() => {
  removeTree(i18nRoot);
});

describe('resolveEmailLocale', () => {
  it('uses the recipient stored preference rather than a request language', () => {
    expect(resolveEmailLocale({ il8n: { locale: 'af' } })).toBe('af');
  });

  it('normalises a regional stored tag onto its primary subtag', () => {
    expect(resolveEmailLocale({ il8n: { locale: 'af-ZA' } })).toBe('af');
  });

  it('falls back to the default when the account has no preference', () => {
    expect(resolveEmailLocale({}, 'en')).toBe('en');
    expect(resolveEmailLocale(null, 'en')).toBe('en');
  });

  it('does not depend on the locale folders being mounted', () => {
    // Regression: resolving validated the stored locale against the on-disk
    // locale list, so a checkout or deployment without the i18n data volume
    // silently reverted every recipient to English. A missing bundle is handled
    // per key by fallbackLng, so the account's choice is returned as-is.
    expect(resolveEmailLocale({ il8n: { locale: 'zz' } }, 'en')).toBe('zz');
  });

  it('discards a stored value that is not a language tag', () => {
    expect(resolveEmailLocale({ il8n: { locale: '../../etc/passwd' } }, 'en')).toBe('en');
  });
});

describe('createEmailTranslator', () => {
  it('renders the activation subject in the recipient language', async () => {
    const translator = await createEmailTranslator(
      { il8n: { locale: 'af' } },
      { i18nRoot }
    );

    expect(
      translator.t('emails.activation.subject', {
        applicationTitle: 'Reactory',
        firstName: 'Werner',
      })
    ).toBe('Welkom by Reactory Werner, bevestig asseblief jou rekening');
  });

  it('renders the same key in English for an English recipient', async () => {
    const translator = await createEmailTranslator(
      { il8n: { locale: 'en' } },
      { i18nRoot }
    );

    expect(
      translator.t('emails.activation.subject', {
        applicationTitle: 'Reactory',
        firstName: 'Werner',
      })
    ).toBe('Welcome to Reactory Werner, please confirm your account');
  });

  it('falls back to English for a key the locale does not carry', async () => {
    writeFileSync(
      join(i18nRoot, 'af', 'emails.json'),
      JSON.stringify({ 'emails.activation.intro': 'Welkom by {{applicationTitle}}.' }),
      'utf8'
    );

    const translator = await createEmailTranslator(
      { il8n: { locale: 'af' } },
      { i18nRoot }
    );

    expect(translator.t('emails.forgotPassword.linkLabel')).toBe('Reset Password');
  });

  it('returns the key rather than undefined when a string is missing everywhere', async () => {
    const translator = await createEmailTranslator({}, { i18nRoot });

    expect(translator.t('emails.does.not.exist')).toBe('emails.does.not.exist');
  });

  it('exposes the locale and text direction for the template', async () => {
    const translator = await createEmailTranslator({ il8n: { locale: 'af' } }, { i18nRoot });

    expect(translator.locale).toBe('af');
    expect(translator.direction).toBe('ltr');
  });

  it('marks right-to-left languages so a template can set dir', () => {
    expect(languageDirection('ar')).toBe('rtl');
    expect(languageDirection('he-IL')).toBe('rtl');
    expect(languageDirection('af')).toBe('ltr');
    expect(languageDirection('en-US')).toBe('ltr');
  });
});

describe('emailTemplateProperties', () => {
  it('adds t, locale and dir alongside the existing properties', async () => {
    const translator = await createEmailTranslator({ il8n: { locale: 'af' } }, { i18nRoot });

    const properties = emailTemplateProperties(translator, { applicationTitle: 'Reactory' });

    expect(properties.applicationTitle).toBe('Reactory');
    expect(properties.locale).toBe('af');
    expect(properties.dir).toBe('ltr');
    expect(typeof properties.t).toBe('function');
  });
});

describe('renderLocalisedSubject', () => {
  const properties = { applicationTitle: 'Reactory', user: { firstName: 'Werner' } };
  const noopTranslate = (key: string, params?: any) =>
    `${key}:${params ? params.applicationTitle : ''}`;
  // The senders inject their EJS renderer; the rule itself only needs *a*
  // renderer, which is what makes it testable in isolation.
  const ejsRender = (template: any, props: any) =>
    ejs.render(typeof template === 'string' ? template : template.content, props);

  it('uses the translated default when the template is missing', () => {
    expect(
      renderLocalisedSubject(null, properties, noopTranslate, {
        key: 'emails.activation.subject',
        params: { applicationTitle: 'Reactory' },
      }, ejsRender)
    ).toBe('emails.activation.subject:Reactory');
  });

  /**
   * The regression: a template seeded before localisation holds hardcoded
   * English and cannot localise itself, so it must be superseded rather than
   * rendered verbatim.
   */
  it('replaces a legacy hardcoded English subject with the translated default', () => {
    const legacy = {
      content: 'Welcome to <%= applicationTitle %> <%= user.firstName %>, please confirm your account',
    };

    expect(
      renderLocalisedSubject(legacy, properties, noopTranslate, {
        key: 'emails.activation.subject',
        params: { applicationTitle: 'Reactory' },
      }, ejsRender)
    ).toBe('emails.activation.subject:Reactory');
  });

  it('keeps a genuinely custom subject', () => {
    const custom = { content: 'Confirm your <%= applicationTitle %> account' };

    expect(
      renderLocalisedSubject(custom, properties, noopTranslate, {
        key: 'emails.activation.subject',
        params: { applicationTitle: 'Reactory' },
      }, ejsRender)
    ).toBe('Confirm your Reactory account');
  });

  it('renders an i18n-aware template through its own t call', () => {
    const aware = {
      content: "<%= t('emails.forgotPassword.subject', { applicationTitle: applicationTitle }) %>",
    };
    const t = () => 'Volg die stappe hieronder';

    expect(
      renderLocalisedSubject(aware, { ...properties, t }, () => 'unused', {
        key: 'emails.forgotPassword.subject',
      }, ejsRender)
    ).toBe('Volg die stappe hieronder');
  });
});
