/**
 * Pure decision logic for the mutation-testing ratchet
 * (scripts/ci/mutation-ratchet.js).
 *
 * Kept out of the CLI so the rules can be exercised by a test without running
 * Stryker. Every function is pure: it takes a Stryker JSON report (the
 * mutation-testing-report-schema format `reports/mutation/mutation.json` is
 * written in) or the summary of one, and returns a decision.
 *
 * The gate counts UNDETECTED mutants per file: Survived (tests ran and still
 * passed) plus NoCoverage (no test executed the code). Killed and Timeout are
 * detected. CompileError, RuntimeError and Ignored mutants say nothing about
 * the tests and are left out of every number, as they are in Stryker's score.
 */
const path = require('path');

const DETECTED = new Set(['Killed', 'Timeout']);
const UNDETECTED = new Set(['Survived', 'NoCoverage']);
const INCOMPLETE = new Set(['Pending']);

const normalise = (file, root) => {
  const posix = String(file).replace(/\\/g, '/');
  if (!root || !path.isAbsolute(file)) return posix.replace(/^\.\//, '');
  return path.relative(root, file).replace(/\\/g, '/');
};

/** Detected / (detected + undetected), as a percentage with two decimals; null when nothing was measurable. */
const score = (detected, undetected) => {
  const valid = detected + undetected;
  return valid === 0 ? null : Math.round((detected / valid) * 10000) / 100;
};

/**
 * Per-file counts from a Stryker JSON report:
 * `{ [file]: { mutants, detected, undetected, survived, noCoverage, score } }`.
 * `mutants` counts only mutants that bear on the tests (detected + undetected).
 * Throws if the report holds mutants that were never run (an aborted run).
 */
const summariseReport = (report, root) => {
  if (!report || typeof report.files !== 'object') {
    throw new Error('Not a Stryker JSON report: no "files" object.');
  }
  const files = {};
  const pending = [];
  for (const [file, { mutants = [] }] of Object.entries(report.files)) {
    const key = normalise(file, root);
    const entry = { mutants: 0, detected: 0, undetected: 0, survived: 0, noCoverage: 0, score: null };
    for (const { status } of mutants) {
      if (INCOMPLETE.has(status)) pending.push(key);
      if (DETECTED.has(status)) entry.detected += 1;
      if (UNDETECTED.has(status)) entry.undetected += 1;
      if (status === 'Survived') entry.survived += 1;
      if (status === 'NoCoverage') entry.noCoverage += 1;
    }
    entry.mutants = entry.detected + entry.undetected;
    entry.score = score(entry.detected, entry.undetected);
    files[key] = entry;
  }
  if (pending.length) {
    throw new Error(`The report has mutants that were never run (an incomplete run): ${[...new Set(pending)].join(', ')}`);
  }
  return files;
};

/** Totals over a `{ [file]: { detected, undetected } }` map. */
const totals = (files) => {
  let detected = 0;
  let undetected = 0;
  for (const entry of Object.values(files)) {
    detected += entry.detected || 0;
    undetected += entry.undetected || 0;
  }
  return { mutants: detected + undetected, detected, undetected, score: score(detected, undetected) };
};

/**
 * Compare the files a run measured against the baseline. A file the run did
 * not measure (outside a `--mutate` subset) is neither a regression nor an
 * improvement. A measured file without a baseline entry is allowed 0.
 */
const compareWithBaseline = ({ summary, baseline }) => {
  const allowances = (baseline && baseline.files) || {};
  const regressions = [];
  const improvements = [];
  for (const [file, { undetected, mutants }] of Object.entries(summary).sort(([a], [b]) => a.localeCompare(b))) {
    const allowed = allowances[file] ? allowances[file].undetected : 0;
    if (undetected > allowed) regressions.push({ file, undetected, allowed, mutants, isNew: !allowances[file] });
    else if (undetected < allowed) improvements.push({ file, undetected, allowed, mutants });
  }
  return { regressions, improvements };
};

/**
 * The baseline after a run: every measured file takes its current numbers;
 * every file the run did not measure keeps its previous entry, so a refresh
 * from a single-file run cannot drop the rest. `shrunk` lists measured files
 * that now have fewer mutants than their entry recorded, which is what a
 * line-range run (`--mutate file.ts:10-20`) looks like.
 */
const mergeBaseline = ({ summary, previous }) => {
  const before = (previous && previous.files) || {};
  const files = {};
  const carried = [];
  const shrunk = [];
  for (const [file, entry] of Object.entries(before)) {
    if (!summary[file]) {
      files[file] = entry;
      carried.push(file);
    }
  }
  for (const [file, { mutants, undetected, score: fileScore }] of Object.entries(summary)) {
    if (before[file] && mutants < before[file].mutants) shrunk.push({ file, mutants, was: before[file].mutants });
    files[file] = { mutants, undetected, score: fileScore };
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  const detected = Object.values(sorted).reduce((n, e) => n + (e.mutants - e.undetected), 0);
  const undetected = Object.values(sorted).reduce((n, e) => n + e.undetected, 0);
  return {
    files: sorted,
    mutants: detected + undetected,
    undetected,
    score: score(detected, undetected),
    carried,
    shrunk,
  };
};

module.exports = { summariseReport, compareWithBaseline, mergeBaseline, totals, score, DETECTED, UNDETECTED };
