/**
 * The typecheck ratchet (scripts/ci/typecheck-ratchet.js) is the CI gate that
 * keeps new type errors out without failing on the pre-existing backlog.
 *
 * These tests build a throwaway project with its own `tsconfig.json` and run
 * the real script against it, so they exercise the gate end to end without
 * type-checking this repository. The case that matters is the one the gate used
 * to get wrong: a file that imports a module this checkout lacks. Such a file
 * cannot be checked, so it must not fail the gate, and `--update` must carry its
 * baseline entry over instead of refusing to run — some modules (reactory-email,
 * reactory-sms, reactory-whatsapp) are optional and absent from every checkout,
 * which made refreshing the baseline impossible.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { parseTscOutput } = require('../../scripts/ci/typecheckRatchet');

const REPO_ROOT = path.resolve(__dirname, '../..');
const SCRIPTS = ['typecheck-ratchet.js', 'typecheckRatchet.js', 'moduleConfiguration.js'];

const TS_CONFIG = {
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
    target: 'es2020',
    noImplicitAny: true,
    baseUrl: './',
    paths: { '@reactory/server-modules/*': ['src/modules/*'] },
    types: [],
  },
  include: ['src/**/*'],
};

const CLEAN_SOURCE = 'export const ok: number = 1;\n';
const BROKEN_SOURCE = "export const bad: number = 'not a number';\n";
const IMPORTS_ABSENT_MODULE = [
  "import type { Thing } from '@reactory/server-modules/reactory-email/types';",
  'export const use = (thing: Thing): Thing => thing;',
  '',
].join('\n');

const temporaryDirectories: string[] = [];

const makeFixture = ({ files, baseline }: { files: Record<string, string>; baseline?: unknown }): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'typecheck-ratchet-'));
  temporaryDirectories.push(root);

  fs.mkdirSync(path.join(root, 'scripts', 'ci'), { recursive: true });
  for (const script of SCRIPTS) {
    fs.copyFileSync(path.join(REPO_ROOT, 'scripts', 'ci', script), path.join(root, 'scripts', 'ci', script));
  }

  // The script resolves typescript from the project root, exactly as it does in
  // a real checkout.
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(root, 'node_modules'), 'dir');

  // presentModules() lists the directories under src/modules; an empty modules
  // directory is a server-only checkout.
  fs.mkdirSync(path.join(root, 'src', 'modules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify(TS_CONFIG, null, 2));

  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }

  if (baseline) {
    fs.writeFileSync(path.join(root, 'typecheck-baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
  }

  return root;
};

const runRatchet = (root: string, args: string[] = []) =>
  spawnSync(process.execPath, [path.join(root, 'scripts', 'ci', 'typecheck-ratchet.js'), ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
  });

const readBaseline = (root: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'typecheck-baseline.json'), 'utf8'));

afterAll(() => {
  for (const directory of temporaryDirectories) fs.rmSync(directory, { recursive: true, force: true });
});

describe('typecheck ratchet --update', () => {
  it('refreshes the baseline in a checkout that cannot check every file, carrying those entries over', () => {
    const root = makeFixture({
      files: {
        'src/clean.ts': CLEAN_SOURCE,
        'src/broken.ts': BROKEN_SOURCE,
        'src/consumer.ts': IMPORTS_ABSENT_MODULE,
      },
      baseline: {
        total: 5,
        files: {
          'src/consumer.ts': 4,
          'src/modules/reactory-email/index.ts': 1,
        },
      },
    });

    const result = runRatchet(root, ['--update']);

    // Before this change the script refused to update at all (exit 2) as soon
    // as one file imported a module the checkout lacks.
    expect(result.stderr).not.toMatch(/Refusing to rewrite the baseline/);
    expect(result.status).toBe(0);

    const baseline = readBaseline(root);
    // Checked files are recorded as they are now...
    expect(baseline.files['src/broken.ts']).toBe(1);
    expect(baseline.files['src/clean.ts']).toBeUndefined();
    // ...files that could not be checked keep their previous allowance...
    expect(baseline.files['src/consumer.ts']).toBe(4);
    expect(baseline.files['src/modules/reactory-email/index.ts']).toBe(1);
    // ...and the total is the sum of the entries actually written.
    expect(baseline.total).toBe(6);
    expect(result.stdout).toMatch(/2 baseline entries carried over unchanged/);
  });

  it('lowers entries for files that improved', () => {
    const root = makeFixture({
      files: {
        'src/clean.ts': CLEAN_SOURCE,
        'src/broken.ts': BROKEN_SOURCE,
      },
      baseline: {
        total: 6,
        files: {
          'src/clean.ts': 3,
          'src/broken.ts': 2,
        },
      },
    });

    expect(runRatchet(root, ['--update']).status).toBe(0);

    const baseline = readBaseline(root);
    expect(baseline.files).toEqual({ 'src/broken.ts': 1 });
    expect(baseline.total).toBe(1);
  });
});

describe('typecheck ratchet check', () => {
  it('fails when a file has more errors than its baseline entry', () => {
    const root = makeFixture({
      files: { 'src/clean.ts': CLEAN_SOURCE, 'src/broken.ts': BROKEN_SOURCE },
      baseline: { total: 0, files: {} },
    });

    const result = runRatchet(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/New type errors in 1 file\(s\)/);
    expect(result.stderr).toMatch(/src\/broken\.ts: 1 errors \(baseline 0\)/);
  });

  it('does not fail on files it cannot check, and reports improvements without failing', () => {
    const root = makeFixture({
      files: {
        'src/clean.ts': CLEAN_SOURCE,
        'src/broken.ts': BROKEN_SOURCE,
        'src/consumer.ts': IMPORTS_ABSENT_MODULE,
      },
      baseline: {
        total: 9,
        files: {
          'src/clean.ts': 2,
          'src/broken.ts': 1,
          'src/consumer.ts': 6,
        },
      },
    });

    const result = runRatchet(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Not checked: 1 file\(s\) import modules this checkout lacks:/);
    expect(result.stdout).toMatch(/src\/consumer\.ts/);
    expect(result.stdout).toMatch(/1 file\(s\) improved/);
    expect(result.stdout).toMatch(/src\/clean\.ts: 0 \(baseline 2\)/);
    expect(result.stdout).toMatch(/No new type errors\./);
  });
});

describe('parseTscOutput', () => {
  it('counts only error lines, normalises separators and ignores the summary', () => {
    const output = [
      'src/a.ts(1,2): error TS2322: Type string is not assignable.',
      'src/a.ts(3,4): error TS7006: Parameter implicitly has an any type.',
      'src\\nested\\b.ts(5,6): error TS2304: Cannot find name.',
      '',
      'Found 3 errors in 2 files.',
      '',
      'Errors  Files',
      '     2  src/a.ts',
    ].join('\n');

    const { counts, total } = parseTscOutput(output);

    expect(total).toBe(3);
    expect(counts).toEqual({ 'src/a.ts': 2, 'src/nested/b.ts': 1 });
  });
});
