import fs from 'fs';
import os from 'os';
import path from 'path';
import ReactoryTranslationResolver from '../ReactoryTranslation';
import { resetAvailableLanguages } from '@reactory/server-core/express/i18n/language';
jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * The resolver interpolates its locale into a filesystem path:
 *
 *   path.resolve(APP_DATA_ROOT, `i18n/${locale}/${$ns}.json`)
 *
 * `lang` is caller-supplied on an ANON-reachable query, and `normaliseLanguage`
 * only trims/lowercases/splits — it leaves `/` and `.` intact. Passing
 * `../../outside` therefore escaped APP_DATA_ROOT and returned whatever
 * `<dir>/reactory.json` happened to exist to an anonymous caller.
 *
 * These tests assert the observable consequence: content from outside the
 * translation root must never appear in the response.
 */
const harvest = () => {
  const instance: any = Object.create((ReactoryTranslationResolver as any).prototype);
  const map = instance.resolver;
  return { Query: { ...map.Query } };
};

const EN_SENTINEL = 'sentinel-from-i18n-en';
const OUTSIDE_SENTINEL = 'sentinel-from-outside-root';

let dataRoot: string;

beforeEach(() => {
  dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-i18n-'));

  // In-root bundle: the legitimate read.
  fs.mkdirSync(path.join(dataRoot, 'i18n', 'en'), { recursive: true });
  fs.writeFileSync(
    path.join(dataRoot, 'i18n', 'en', 'reactory.json'),
    JSON.stringify({ 'reactory.menu.home': EN_SENTINEL }),
    'utf8'
  );

  // A sibling of the i18n folder. `../outside` as the locale makes the resolver
  // build `i18n/../outside/reactory.json`, i.e. escape the translation root.
  fs.mkdirSync(path.join(dataRoot, 'outside'), { recursive: true });
  fs.writeFileSync(
    path.join(dataRoot, 'outside', 'reactory.json'),
    JSON.stringify({ 'reactory.menu.home': OUTSIDE_SENTINEL }),
    'utf8'
  );

  process.env.APP_DATA_ROOT = dataRoot;
});

afterEach(() => {
  delete process.env.APP_DATA_ROOT;
  resetAvailableLanguages();
  fs.rmSync(dataRoot, { recursive: true, force: true });
});

const runResolver = async (lang: string) => {
  const { Query } = harvest();
  const context: any = {
    hasRole: jest.fn().mockReturnValue(true),
    i18n: { language: 'en' },
    getService: jest.fn().mockReturnValue({
      getTranslations: async () => ({
        id: lang,
        locale: lang,
        resources: {},
        translations: [],
        i18n: [{ id: `${lang}.reactory`, ns: 'reactory', translations: {} }],
      }),
    }),
  };

  return Query.ReactoryTranslation({}, { lang }, context);
};

const translationsOf = (result: any): any =>
  (result?.i18n || []).reduce((all: any, bundle: any) => ({ ...all, ...bundle.translations }), {});

describe('ReactoryTranslation locale path safety', () => {
  it('does not read outside the translation root for a traversal tag', async () => {
    const result = await runResolver('../outside');

    expect(JSON.stringify(translationsOf(result))).not.toContain(OUTSIDE_SENTINEL);
  });

  it('falls back to the in-root bundle for a traversal tag', async () => {
    const result = await runResolver('../outside');

    expect(translationsOf(result)['reactory.menu.home']).toBe(EN_SENTINEL);
  });

  it('does not read outside the root for an encoded traversal tag', async () => {
    const result = await runResolver('..%2foutside');

    expect(JSON.stringify(translationsOf(result))).not.toContain(OUTSIDE_SENTINEL);
  });

  it('still reads the requested locale when it is legitimate', async () => {
    fs.mkdirSync(path.join(dataRoot, 'i18n', 'af'), { recursive: true });
    fs.writeFileSync(
      path.join(dataRoot, 'i18n', 'af', 'reactory.json'),
      JSON.stringify({ 'reactory.menu.home': 'Tuis' }),
      'utf8'
    );

    // The language scan is memoised, so it must be cleared after adding a folder.
    resetAvailableLanguages();

    const result = await runResolver('af-ZA');
    expect(translationsOf(result)['reactory.menu.home']).toBe('Tuis');
  });
});
