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
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BASELINE = path.join(ROOT, 'typecheck-baseline.json');
const update = process.argv.includes('--update');

const tsc = spawnSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc', { paths: [ROOT] }), '--noEmit', '--pretty', 'false', '-p', 'tsconfig.json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192' } },
);

const output = `${tsc.stdout || ''}${tsc.stderr || ''}`;
const counts = {};
let total = 0;
for (const line of output.split('\n')) {
  const match = /^(.+?)\(\d+,\d+\): error TS\d+:/.exec(line);
  if (!match) continue;
  const file = match[1].replace(/\\/g, '/');
  counts[file] = (counts[file] || 0) + 1;
  total += 1;
}

if (tsc.status !== 0 && total === 0) {
  console.error('tsc failed without reporting type errors:\n' + output);
  process.exit(2);
}

if (update) {
  const sorted = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  fs.writeFileSync(BASELINE, JSON.stringify({ total, files: sorted }, null, 2) + '\n');
  console.log(`Baseline written: ${total} errors in ${Object.keys(counts).length} files.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { total: 0, files: {} };
const regressions = [];
const improvements = [];
for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline.files[file] || 0;
  if (count > allowed) regressions.push(`${file}: ${count} errors (baseline ${allowed})`);
}
for (const [file, allowed] of Object.entries(baseline.files)) {
  const count = counts[file] || 0;
  if (count < allowed) improvements.push(`${file}: ${count} (baseline ${allowed})`);
}

console.log(`Type errors: ${total} (baseline ${baseline.total}).`);
if (improvements.length) {
  console.log(`\n${improvements.length} file(s) improved; run with --update to lower the baseline:\n  ${improvements.join('\n  ')}`);
}
if (regressions.length) {
  console.error(`\nNew type errors in ${regressions.length} file(s):\n  ${regressions.join('\n  ')}`);
  const newLines = output.split('\n').filter((l) => regressions.some((r) => l.startsWith(r.split(':')[0] + '(')));
  console.error('\n' + newLines.join('\n'));
  process.exit(1);
}
console.log('No new type errors.');
