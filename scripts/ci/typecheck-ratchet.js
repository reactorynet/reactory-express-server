#!/usr/bin/env node
/**
 * Type-check ratchet (WP-A8).
 *
 * `tsc --noEmit` on this repository reports a large pre-existing error
 * backlog (see typecheck-baseline.json). Failing CI on the backlog would keep
 * the job red forever; ignoring it would let new errors in. This script
 * does neither: it fails when any file has MORE errors than its baseline
 * entry, or when a file absent from the baseline has errors. Fixing errors
 * never fails the job; run with --update to lower the baseline afterwards.
 *
 *   node scripts/ci/typecheck-ratchet.js           # check (CI)
 *   node scripts/ci/typecheck-ratchet.js --update  # rewrite the baseline
 *
 * A file that imports a module this checkout lacks cannot be type-checked
 * meaningfully: it is reported as skipped, as are the entries of the absent
 * modules themselves, and neither counts as a regression nor as an
 * improvement. `--update` carries those entries over unchanged instead of
 * dropping them, so it is safe to run in a checkout that does not contain
 * every module — including this one, where some modules (reactory-email,
 * reactory-sms, reactory-whatsapp) are optional and absent from every
 * checkout, so refusing outright made the documented refresh impossible.
 *
 * The rules themselves live in typecheckRatchet.js, where a test can exercise
 * them against fixtures without running tsc over the whole repository.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { presentModules } = require('./moduleConfiguration');
const { parseTscOutput, findSkippedFiles, compareWithBaseline, mergeBaseline } = require('./typecheckRatchet');

const ROOT = path.resolve(__dirname, '../..');
const BASELINE = path.join(ROOT, 'typecheck-baseline.json');
const update = process.argv.includes('--update');

const tsc = spawnSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc', { paths: [ROOT] }), '--noEmit', '--pretty', 'false', '-p', 'tsconfig.json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192' } },
);

const output = `${tsc.stdout || ''}${tsc.stderr || ''}`;
const { counts, total } = parseTscOutput(output);

if (tsc.status !== 0 && total === 0) {
  console.error('tsc failed without reporting type errors:\n' + output);
  process.exit(2);
}

// Files that cannot resolve an import from a module this checkout lacks.
const present = presentModules();
const skipped = findSkippedFiles(output, present);

const reportSkipped = () => {
  if (!skipped.size) return;
  const byModule = {};
  for (const [file, module] of skipped) (byModule[module] = byModule[module] || []).push(file);
  console.log(`\nNot checked: ${skipped.size} file(s) import modules this checkout lacks:`);
  for (const [module, files] of Object.entries(byModule)) console.log(`  ${module}: ${files.join(', ')}`);
};

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { total: 0, files: {} };

if (update) {
  const merged = mergeBaseline({ counts, skipped, present, previous: baseline });
  fs.writeFileSync(BASELINE, JSON.stringify({ total: merged.total, files: merged.files }, null, 2) + '\n');
  console.log(`Baseline written: ${merged.total} allowed errors in ${Object.keys(merged.files).length} files.`);

  reportSkipped();

  const preserved = Object.entries(merged.preserved);
  if (preserved.length) {
    const modules = [...new Set(preserved.map(([file]) => skipped.get(file)).filter(Boolean))];
    console.log(
      `\n${preserved.length} baseline entr${preserved.length === 1 ? 'y' : 'ies'} carried over unchanged ` +
        `(file(s) this checkout cannot check${modules.length ? `: ${modules.join(', ')}` : ''}).`,
    );
  }
  process.exit(0);
}

const { regressions, improvements } = compareWithBaseline({ counts, skipped, present, baseline });

// baseline.total is the sum of the allowances written to the file, which
// includes entries carried over for files this checkout cannot check; it is a
// baseline budget, not a second opinion on the current error count.
console.log(`Type errors: ${total} (baseline allows ${baseline.total} in ${Object.keys(baseline.files || {}).length} files).`);
reportSkipped();

if (improvements.length) {
  console.log(
    `\n${improvements.length} file(s) improved; run with --update to lower the baseline:\n  ` +
      improvements.map(({ file, count, allowed }) => `${file}: ${count} (baseline ${allowed})`).join('\n  '),
  );
}
if (regressions.length) {
  console.error(
    `\nNew type errors in ${regressions.length} file(s):\n  ` +
      regressions.map(({ file, count, allowed }) => `${file}: ${count} errors (baseline ${allowed})`).join('\n  '),
  );
  const newLines = output
    .split('\n')
    .filter((line) => regressions.some(({ file }) => line.startsWith(`${file}(`)));
  console.error('\n' + newLines.join('\n'));
  process.exit(1);
}
console.log('No new type errors.');
