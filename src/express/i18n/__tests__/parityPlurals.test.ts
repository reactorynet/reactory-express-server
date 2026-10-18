import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Nothing used to fail the build on a count-bearing string with no plural
 * forms, which is how `"Completed {{count}} tool calls"` shipped and rendered
 * "1 tool calls". The parity script now audits plurals; these tests prove the
 * guard actually fails a bundle that needs one.
 */
const SCRIPT = resolve(__dirname, '../../../../bin/scripts/i18n-check-parity.mjs');

const runParity = (i18nRoot: string) => {
  const result = spawnSync(process.execPath, [SCRIPT, i18nRoot, '--json'], {
    encoding: 'utf8',
  });

  return {
    status: result.status,
    report: result.stdout ? JSON.parse(result.stdout) : null,
    stderr: result.stderr,
  };
};

const writeLocale = (root: string, locale: string, namespace: string, bundle: unknown) => {
  mkdirSync(join(root, locale), { recursive: true });
  writeFileSync(join(root, locale, `${namespace}.json`), JSON.stringify(bundle, null, 2), 'utf8');
};

/** Findings in a stable order, so the assertion does not depend on directory order. */
const findings = (entries: any[]) =>
  [...entries]
    .map(({ namespace, locale, key, missing }) => ({ namespace, locale, key, missing }))
    .sort((a, b) => `${a.locale}:${a.key}`.localeCompare(`${b.locale}:${b.key}`));


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
  i18nRoot = mkdtempSync(join(tmpdir(), 'reactory-parity-'));
});

afterEach(() => {
  removeTree(i18nRoot);
});

describe('locale parity: plural audit', () => {
  it('fails when a count-bearing key has no plural forms', () => {
    const bundle = { 'chat.toolResultsSummary': 'Completed {{count}} tool calls' };
    writeLocale(i18nRoot, 'en', 'reactor', bundle);
    writeLocale(i18nRoot, 'af', 'reactor', bundle);

    const { status, report } = runParity(i18nRoot);

    expect(status).toBe(1);
    expect(findings(report.plurals)).toEqual([
      { namespace: 'reactor.json', locale: 'af', key: 'chat.toolResultsSummary', missing: ['_one', '_other'] },
      { namespace: 'reactor.json', locale: 'en', key: 'chat.toolResultsSummary', missing: ['_one', '_other'] },
    ]);
  });

  it('reports only the missing half of a partial plural pair', () => {
    writeLocale(i18nRoot, 'en', 'reactor', {
      'chat.toolResultsSummary_one': 'Completed {{count}} tool call',
    });
    writeLocale(i18nRoot, 'af', 'reactor', {
      'chat.toolResultsSummary_one': 'Een',
      'chat.toolResultsSummary_other': 'Baie',
    });

    const { status, report } = runParity(i18nRoot);

    expect(status).toBe(1);
    expect(findings(report.plurals)).toEqual([
      { namespace: 'reactor.json', locale: 'en', key: 'chat.toolResultsSummary', missing: ['_other'] },
    ]);
  });

  it('passes when every count-bearing key carries its plural pair', () => {
    const bundle = {
      'chat.toolResultsSummary_one': 'Completed {{count}} tool call',
      'chat.toolResultsSummary_other': 'Completed {{count}} tool calls',
    };
    writeLocale(i18nRoot, 'en', 'reactor', bundle);
    writeLocale(i18nRoot, 'af', 'reactor', bundle);

    const { status, report } = runParity(i18nRoot);

    expect(report.plurals).toEqual([]);
    expect(status).toBe(0);
  });

  it('flags a count held in an array length, which cannot drive pluralisation', () => {
    // `{{selected.length}}` is not `{{count}}`, so i18next can never select a
    // plural suffix for it. Surfaced so the gap is visible rather than "green".
    const bundle = { 'confirm.dialog.content': 'Delete the {{selected.length}} selected tickets' };
    writeLocale(i18nRoot, 'en', 'forms', bundle);
    writeLocale(i18nRoot, 'af', 'forms', bundle);

    const { status, report } = runParity(i18nRoot);

    expect(status).toBe(1);
    expect(
      report.countInterpolations
        .map(({ namespace, locale, key }: any) => ({ namespace, locale, key }))
        .sort((a: any, b: any) => a.locale.localeCompare(b.locale))
    ).toEqual([
      { namespace: 'forms.json', locale: 'af', key: 'confirm.dialog.content' },
      { namespace: 'forms.json', locale: 'en', key: 'confirm.dialog.content' },
    ]);
  });
});
