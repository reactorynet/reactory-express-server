import {
  mkdirSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync, writeFileSync
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import ReactoryTranslation from '../ReactoryTranslation';
import { resetAvailableLanguages } from '@reactory/server-core/express/i18n/language';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * End-to-end precedence through the resolver.
 *
 * `getTranslations` merges module + file + CMS; the resolver then used to spread
 * the raw JSON bundle over that result, so a committed file always beat a CMS
 * edit. The rule is now `module` -> `file` -> `cms`, with the CMS highest.
 *
 * The service is stubbed here so the assertion is about *the resolver's* merge
 * step: whatever the service already resolved (including CMS values) must not be
 * overwritten by the file read.
 */
const harvest = () => {
  const instance: any = Object.create((ReactoryTranslation as any).prototype);
  const map = instance.resolver;
  return { Query: { ...map.Query } };
};

/**
 * Removes a fixture tree depth-first. `fs.rmSync` post-dates this repository's
 * `@types/node`, so using it would add a typecheck-baseline entry for a helper.
 */
const removeTree = (directory: string): void => {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) removeTree(entryPath);
    else unlinkSync(entryPath);
  });
  rmdirSync(directory);
};

let dataRoot: string;

const FILE_VALUE = 'Delete Ticket';
const CMS_VALUE = 'Verwyder Kaartjie';

beforeEach(() => {
  dataRoot = mkdtempSync(join(tmpdir(), 'reactory-precedence-'));
  mkdirSync(join(dataRoot, 'i18n', 'af'), { recursive: true });
  writeFileSync(
    join(dataRoot, 'i18n', 'af', 'reactory.json'),
    JSON.stringify({ 'support-ticket-delete-action': FILE_VALUE }),
    'utf8'
  );

  process.env.APP_DATA_ROOT = dataRoot;
});

afterEach(() => {
  delete process.env.APP_DATA_ROOT;
  resetAvailableLanguages();
  removeTree(dataRoot);
});

const runResolver = async (bundles: any[]) => {
  const { Query } = harvest();
  const context: any = {
    hasRole: jest.fn().mockReturnValue(true),
    i18n: { language: 'af' },
    getService: jest.fn().mockReturnValue({
      getTranslations: async () => ({
        id: 'af',
        locale: 'af',
        resources: {},
        translations: [] as any[],
        languages: ['af'],
        i18n: bundles,
      }),
    }),
  };

  return Query.ReactoryTranslation({}, { lang: 'af' }, context);
};

const translationsOf = (result: any): any =>
  (result?.i18n || []).reduce((all: any, bundle: any) => ({ ...all, ...bundle.translations }), {});

describe('translation precedence through the resolver', () => {
  it('keeps a CMS value that overrides the shipped file', async () => {
    const result = await runResolver([
      { id: 'af.reactory', ns: 'reactory', translations: { 'support-ticket-delete-action': CMS_VALUE } },
    ]);

    expect(translationsOf(result)['support-ticket-delete-action']).toBe(CMS_VALUE);
  });

  /**
   * The regression this change fixes: the previous
   * `{ ...serviceBundle, ...fileContent }` spread let the file win.
   */
  it('does not let the file value shadow the CMS value', async () => {
    const result = await runResolver([
      { id: 'af.reactory', ns: 'reactory', translations: { 'support-ticket-delete-action': CMS_VALUE } },
    ]);

    const merged = translationsOf(result);
    expect(merged['support-ticket-delete-action']).not.toBe(FILE_VALUE);
  });

  it('still falls back to the file for a key the CMS has no value for', async () => {
    const result = await runResolver([
      { id: 'af.reactory', ns: 'reactory', translations: { 'cms.only': 'CMS only' } },
    ]);

    const merged = translationsOf(result);
    expect(merged['support-ticket-delete-action']).toBe(FILE_VALUE);
    expect(merged['cms.only']).toBe('CMS only');
  });
});
