#!/usr/bin/env node
/**
 * Mutation-testing ratchet.
 *
 * Runs Stryker (stryker.config.mjs) and then compares the result with
 * mutation-baseline.json, per file: a file fails the gate when it has MORE
 * undetected mutants (Survived + NoCoverage) than its baseline entry, or when
 * it has undetected mutants and no entry at all. Killing mutants never fails;
 * run with --update to lower the baseline afterwards. See
 * docs/MUTATION_TESTING.md.
 *
 *   node scripts/ci/mutation-ratchet.js [stryker args]   # run Stryker, then check
 *   node scripts/ci/mutation-ratchet.js --no-run         # check the last report
 *   node scripts/ci/mutation-ratchet.js --no-run --update  # rewrite the baseline from the last report
 *
 *   node scripts/ci/mutation-ratchet.js --module <name> [...]  # the same, for a module repository
 *
 * Any argument other than --no-run / --update / --module <name> is passed to
 * `stryker run`, e.g. `--mutate src/utils/hash.ts` for a single file. Files
 * the run did not measure are left alone, by the check and by --update alike.
 *
 * Module mode (scripts/ci/mutationModule.js) takes the scope from
 * src/modules/<name>/mutation.config.json, gates against
 * src/modules/<name>/mutation-baseline.json (paths relative to the module),
 * and reads the report from reports/mutation/modules/<name>/.
 *
 * The rules live in mutationRatchet.js, where a test exercises them against
 * fixture reports without running Stryker.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { summariseReport, compareWithBaseline, mergeBaseline, totals } = require('./mutationRatchet');
const { loadModuleScope, toModuleKeys } = require('./mutationModule');

const ROOT = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const update = args.includes('--update');
const run = !args.includes('--no-run');
const moduleAt = args.indexOf('--module');
const moduleName = moduleAt === -1 ? null : args[moduleAt + 1];
if (moduleAt !== -1 && (!moduleName || moduleName.startsWith('-'))) {
  console.error('--module needs a module name, e.g. `yarn test:mutation:module reactory-temporal`.');
  process.exit(2);
}
const strykerArgs = args.filter((a, i) => a !== '--update' && a !== '--no-run' && i !== moduleAt && i !== moduleAt + 1);

let scope = null;
if (moduleName) {
  try {
    scope = loadModuleScope(ROOT, moduleName);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
const BASELINE = scope ? scope.baselinePath : path.join(ROOT, 'mutation-baseline.json');
const REPORT = path.join(ROOT, scope ? scope.reportDir : 'reports/mutation', 'mutation.json');
const commands = scope
  ? { run: `yarn test:mutation:module ${scope.name}`, update: `yarn test:mutation:module:update-baseline ${scope.name}` }
  : { run: 'yarn test:mutation', update: 'yarn test:mutation:update-baseline' };
const label = scope ? `Mutation testing: ${scope.name}` : 'Mutation testing';

// The package's "exports" map hides bin/, so find the CLI through package.json.
const STRYKER_PKG = require.resolve('@stryker-mutator/core/package.json', { paths: [ROOT] });
const strykerPackage = require(STRYKER_PKG);

const pct = (value) => (value === null || value === undefined ? 'n/a' : `${value.toFixed(2)}%`);

if (run) {
  const startedAt = Date.now();
  const stryker = spawnSync(
    process.execPath,
    [path.join(path.dirname(STRYKER_PKG), strykerPackage.bin.stryker), 'run', ...strykerArgs],
    { cwd: ROOT, stdio: 'inherit', env: scope ? { ...process.env, REACTORY_MUTATION_MODULE: scope.name } : process.env },
  );
  if (stryker.status !== 0) {
    console.error(`\nStryker exited with ${stryker.status}; the baseline was not checked.`);
    process.exit(stryker.status || 1);
  }
  if (!fs.existsSync(REPORT) || fs.statSync(REPORT).mtimeMs < startedAt) {
    console.error(`Stryker finished but did not write ${path.relative(ROOT, REPORT)}; is the json reporter enabled?`);
    process.exit(2);
  }
} else if (!fs.existsSync(REPORT)) {
  console.error(`No report at ${path.relative(ROOT, REPORT)}. Run \`${commands.run}\` first.`);
  process.exit(2);
} else {
  console.log(`Using the report written ${fs.statSync(REPORT).mtime.toISOString()}.`);
}

let summary;
try {
  summary = summariseReport(JSON.parse(fs.readFileSync(REPORT, 'utf8')), ROOT);
  // A module's baseline lives in the module's repository, keyed relative to it.
  if (scope) summary = toModuleKeys(summary, scope.prefix);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { files: {} };
const measured = totals(summary);

if (update) {
  const merged = mergeBaseline({ summary, previous: baseline });
  const written = {
    _comment: [
      'Per-file allowance of undetected (Survived + NoCoverage) mutants. The gate fails when a file exceeds its allowance.',
      `Written by \`${commands.update}\`; see docs/MUTATION_TESTING.md in reactory-express-server. \`score\` and \`mutants\` are informational.`,
    ],
    ...(scope ? { module: scope.name } : {}),
    stryker: strykerPackage.version,
    score: merged.score,
    mutants: merged.mutants,
    undetected: merged.undetected,
    files: merged.files,
  };
  fs.writeFileSync(BASELINE, JSON.stringify(written, null, 2) + '\n');
  console.log(
    `Baseline written: ${merged.undetected} undetected of ${merged.mutants} mutants (score ${pct(merged.score)}) in ${Object.keys(merged.files).length} files.`,
  );
  if (merged.carried.length) {
    console.log(`${merged.carried.length} entr${merged.carried.length === 1 ? 'y' : 'ies'} carried over (not measured by this run).`);
  }
  if (merged.shrunk.length) {
    console.warn(
      '\nThese files now have fewer mutants than their old entry. That is expected when code was removed; if the run used a line range (--mutate file.ts:10-20) the entries are partial, so revert and refresh from a full run:\n  ' +
        merged.shrunk.map(({ file, mutants, was }) => `${file}: ${mutants} mutants (was ${was})`).join('\n  '),
    );
  }
  process.exit(0);
}

const { regressions, improvements } = compareWithBaseline({ summary, baseline });

const lines = [
  `Mutation score: ${pct(measured.score)} (${measured.undetected} undetected of ${measured.mutants} mutants in ${Object.keys(summary).length} files).`,
];
if (improvements.length) {
  lines.push(
    `${improvements.length} file(s) improved; run \`${commands.update}\` to lower the baseline:`,
    ...improvements.map(({ file, undetected, allowed }) => `  ${file}: ${undetected} undetected (baseline ${allowed})`),
  );
}
if (regressions.length) {
  lines.push(
    `New undetected mutants in ${regressions.length} file(s):`,
    ...regressions.map(
      ({ file, undetected, allowed, isNew }) =>
        `  ${file}: ${undetected} undetected (baseline ${allowed}${isNew ? ', no entry' : ''})`,
    ),
    `See ${path.relative(ROOT, REPORT).replace(/json$/, 'html')} for the surviving mutants.`,
  );
} else {
  lines.push('No new undetected mutants.');
}

const out = lines.join('\n');
(regressions.length ? console.error : console.log)(`\n${out}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${label}\n\n\`\`\`\n${out}\n\`\`\`\n`);
}
process.exit(regressions.length ? 1 : 0);
