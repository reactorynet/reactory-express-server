#!/usr/bin/env node
/**
 * Runs the CI test suite (jest.ci.config.ts) for whatever modules this
 * checkout contains.
 *
 * A Reactory backend is any combination of modules, and CI checks out the
 * server alone. A suite that fails only because it cannot load a module this
 * configuration lacks is reported as skipped, with the module it needs; every
 * other failure fails the run. With every module present this is exactly
 * `jest -c jest.ci.config.ts`.
 *
 *   node scripts/ci/run-tests.js [jest arguments]
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { absentModuleIn, presentModules, ROOT } = require('./moduleConfiguration');

const resultsFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-tests-')), 'results.json');
const jest = spawnSync(
  process.execPath,
  [require.resolve('jest/bin/jest', { paths: [ROOT] }), '-c', 'jest.ci.config.ts', '--json', `--outputFile=${resultsFile}`, ...process.argv.slice(2)],
  { cwd: ROOT, stdio: 'inherit' },
);

if (!fs.existsSync(resultsFile)) {
  console.error(`jest wrote no results (exit ${jest.status}).`);
  process.exit(jest.status || 1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const present = presentModules();
const absentModuleInMessage = (message) => {
  for (const match of (message || '').matchAll(/Cannot find module '([^']+)'/g)) {
    const module = absentModuleIn(match[1], present);
    if (module) return module;
  }
  return null;
};

// Skipped only when nothing else went wrong: the suite could not load, or
// every one of its failed tests failed on an absent module. A suite with any
// other failure still fails.
const needsModule = (suite) => {
  const failedTests = (suite.assertionResults || []).filter((t) => t.status === 'failed');
  if (failedTests.length === 0) return absentModuleInMessage(suite.message);
  const modules = failedTests.map((t) => absentModuleInMessage((t.failureMessages || []).join('\n')));
  return modules.every(Boolean) ? modules[0] : null;
};

const skipped = [];
const failed = [];
for (const suite of results.testResults.filter((s) => s.status === 'failed')) {
  const file = path.relative(ROOT, suite.name);
  const module = needsModule(suite);
  if (module) skipped.push({ file, module });
  else failed.push(file);
}

const lines = [
  `Suites: ${results.numTotalTestSuites}; failed ${failed.length}; skipped for absent modules ${skipped.length}.`,
  `Tests: ${results.numTotalTests}; failed ${results.numFailedTests}.`,
];
if (skipped.length) {
  const byModule = {};
  for (const { file, module } of skipped) (byModule[module] = byModule[module] || []).push(file);
  lines.push(`Modules present: ${[...present].sort().join(', ')}.`, 'Skipped because this checkout lacks a module:');
  for (const [module, files] of Object.entries(byModule)) lines.push(`- ${module}: ${files.join(', ')}`);
}
if (failed.length) lines.push('Failed:', ...failed.map((file) => `- ${file}`));

console.log(`\n${lines.join('\n')}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Server tests\n\n${lines.join('\n\n')}\n`);
}
process.exit(failed.length ? 1 : 0);
