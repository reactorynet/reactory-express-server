// @ts-check
/**
 * Stryker mutation testing for the server core.
 *
 * Stryker changes the source in small ways (flips a condition, empties a
 * block, swaps an operator) and re-runs the tests that cover the change. A
 * change the tests still pass on is a "survived" mutant: code whose behaviour
 * the suite does not actually pin down. See docs/MUTATION_TESTING.md.
 *
 * Run it with `yarn test:mutation`, which runs Stryker and then the per-file
 * baseline gate (scripts/ci/mutation-ratchet.js, mutation-baseline.json).
 *
 * SCOPE. Mutation testing costs one test run per mutant, so it runs on a
 * chosen slice of the core rather than the whole tree: code that is
 * security-sensitive or widely shared, and that has fast, self-contained unit
 * suites. `mutate` lists the sources and `testMatch` the suites that exercise
 * them. Widen both together; a source with no suite in `testMatch` only
 * produces NoCoverage mutants. `yarn test:mutation --mutate <path>` runs one
 * file; for a file outside the scope, add its suite to `testMatch` first.
 *
 * MODULE MODE. With REACTORY_MUTATION_MODULE=<name> (set by
 * `yarn test:mutation:module <name>`) the scope comes from that module's own
 * src/modules/<name>/mutation.config.json instead, the module and the modules
 * it needs are put back into the sandbox, and reports go to
 * reports/mutation/modules/<name>/. See scripts/ci/mutationModule.js.
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { loadModuleScope, gitIgnoredPatterns, moduleSandboxPatterns } = require('./scripts/ci/mutationModule.js');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const moduleScope = process.env.REACTORY_MUTATION_MODULE
  ? loadModuleScope(ROOT, process.env.REACTORY_MUTATION_MODULE)
  : null;

const mutate = [
  // utilities
  'src/utils/string.ts',
  'src/utils/hash.ts',
  'src/utils/url/subresourceIntegrity.ts',
  'src/utils/graph/mergeResolver.ts',
  // authentication
  'src/authentication/password/PasswordHasher.ts',
  'src/authentication/oauth/state.ts',
  'src/authentication/oauth/token-crypto.ts',
  'src/authentication/oauth/token-store.ts',
  // error sanitisation
  'src/exceptions/index.ts',
  // method decorators
  'src/application/decorators/audit/audit.ts',
  'src/application/decorators/cache/cached.ts',
  'src/application/decorators/rateLimit/rateLimit.ts',
  'src/application/decorators/telemetry/counter.ts',
  'src/application/decorators/telemetry/gauge.ts',
  'src/application/decorators/telemetry/histogram.ts',
  'src/application/decorators/telemetry/metric.ts',
  'src/application/decorators/telemetry/traced.ts',
  // request pipeline: CORS and client authentication
  'src/express/cors.ts',
  'src/express/middleware/ReactoryCors.ts',
  'src/express/middleware/ReactoryClient.ts',
];

const testMatch = [
  '<rootDir>/src/utils/__tests__/string.test.ts',
  '<rootDir>/src/utils/__tests__/hash.test.ts',
  '<rootDir>/src/utils/url/__tests__/subresourceIntegrity.test.ts',
  '<rootDir>/src/utils/graph/__tests__/mergeResolver.test.ts',
  '<rootDir>/src/authentication/password/__tests__/*.test.ts',
  '<rootDir>/src/authentication/oauth/__tests__/*.test.ts',
  '<rootDir>/src/exceptions/__tests__/*.test.ts',
  '<rootDir>/src/application/decorators/**/__tests__/*.test.ts',
  // Not ordering.test.ts: it loads the context provider, which imports the
  // reactory-telemetry module, absent from the sandbox (and from CI).
  '<rootDir>/src/express/middleware/__tests__/AuthHardening.test.ts',
  '<rootDir>/src/express/middleware/__tests__/PublicKeyBrowserAuth.test.ts',
  '<rootDir>/src/express/middleware/__tests__/ServiceKeysAndBypassRemoval.test.ts',
];

/**
 * What Stryker leaves out of the sandbox it copies the project into.
 *
 * The sandbox holds what a CI checkout holds, so the results (and the
 * baseline) are the same on every machine:
 *
 * 1. Only what the tests need from the root: src/, test/ and the configs.
 *    The root also holds build/, docker/ and backups/, gigabytes between them.
 * 2. Nothing git ignores. That drops every module other than reactory-core
 *    (each is its own repository, so a suite that needs one skips itself here
 *    exactly as it does in CI) and, just as important, local configuration
 *    such as the client configs under src/data/clientConfigs, which change
 *    which code paths the suites reach. Untracked files that are not ignored
 *    (a new suite not yet committed) are kept.
 *
 * Without git (an exported tree), (2) falls back to the module rules.
 *
 * In module mode, the module under test and the modules it needs go back in,
 * each minus what its own repository ignores (except its node_modules, which
 * hold the dependencies yarn could not hoist).
 */
const sandboxIgnorePatterns = (modules = []) => {
  const roots = [
    '/*',
    '!/src',
    '!/test',
    '!/package.json',
    '!/tsconfig.json',
    '!/babel.config.js',
    '!/jest.config.ts',
  ];
  const ignored = gitIgnoredPatterns(ROOT, { paths: ['src', 'test'] }) || [
    '/src/modules/*',
    '!/src/modules/reactory-core',
    '!/src/modules/index.ts',
    '!/src/modules/generate_index.ts',
    '!/src/modules/available.json',
    '!/src/modules/helpers',
    '/src/data/clientConfigs/*',
    '!/src/data/clientConfigs/index.ts',
    '!/src/data/clientConfigs/readme.md',
    '!/src/data/clientConfigs/helpers',
    '!/src/data/clientConfigs/reactory',
  ];
  return [...roots, ...ignored, ...moduleSandboxPatterns(ROOT, modules)];
};

const reportDir = moduleScope ? moduleScope.reportDir : 'reports/mutation';

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'yarn',
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.ts',
    // Shallow overrides of the unit config. Open-handle detection stalls the
    // run (several suites leave timers behind); Stryker collects its own
    // coverage, so jest's coverage settings are switched off.
    config: {
      testMatch: moduleScope ? moduleScope.testMatch : testMatch,
      detectOpenHandles: false,
      collectCoverage: false,
      coverageThreshold: undefined,
      verbose: false,
    },
  },
  mutate: moduleScope ? moduleScope.mutate : mutate,
  // Each mutant runs only the tests that executed it in the initial run.
  coverageAnalysis: 'perTest',
  // No checker: types are advisory in this repository (ts-jest runs with
  // diagnostics off and there is a large tsc backlog, see
  // docs/TYPECHECK_RATCHET.md), so a type-checking pass would reject mutants
  // for errors that were already there.
  checkers: [],
  // Stryker prefixes the sandbox copies with `// @ts-nocheck`. The default
  // glob also takes the generated protobuf .js under reactory-core, which
  // Stryker's parser cannot read (decorators + legacy decorators).
  disableTypeChecks: 'src/**/*.{ts,tsx}',

  // The sandbox Stryker copies the project into holds what a CI checkout
  // holds; see sandboxIgnorePatterns above.
  ignorePatterns: sandboxIgnorePatterns(moduleScope ? [moduleScope.name, ...moduleScope.needs] : []),
  tempDirName: '.stryker-tmp',

  // Re-runs reuse the results of mutants whose code and covering tests did
  // not change. Delete the file (or pass --force) for a clean run.
  incremental: true,
  incrementalFile: `${reportDir}/stryker-incremental.json`,

  reporters: ['progress', 'clear-text', 'html', 'json'],
  htmlReporter: { fileName: `${reportDir}/mutation.html` },
  jsonReporter: { fileName: `${reportDir}/mutation.json` },
  clearTextReporter: { allowColor: true, logTests: false, reportScoreTable: true },

  // Colour bands only. The gate is per file (mutation-baseline.json), not a
  // global score: `break` stays off so a single-file run is not failed by the
  // score of the slice it happens to cover.
  thresholds: { high: 80, low: 60, break: null },

  timeoutMS: 10000,
};

export default config;
