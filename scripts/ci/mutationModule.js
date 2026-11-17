/**
 * Module mode for mutation testing: running Stryker on code that lives in a
 * module repository under src/modules/<name>.
 *
 * A module cannot run Stryker on its own: it has no jest config, setup or
 * node_modules of its own, and its suites import the server core. So the
 * server runs it (`yarn test:mutation:module <name>`), with the scope and the
 * baseline owned by the module repository:
 *
 *   src/modules/<name>/mutation.config.json   what to mutate, which suites, which other modules it needs
 *   src/modules/<name>/mutation-baseline.json the module's per-file allowance (paths relative to the module)
 *
 * Used by stryker.config.mjs (scope and sandbox) and by
 * scripts/ci/mutation-ratchet.js (baseline and report paths). See
 * docs/MUTATION_TESTING.md, "Modules".
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODULES_DIR = 'src/modules';
const SCOPE_FILE = 'mutation.config.json';
const BASELINE_FILE = 'mutation-baseline.json';
/** Lives in this repository, so it is always in the sandbox. */
const ALWAYS_PRESENT = 'reactory-core';

const isModuleName = (name) => typeof name === 'string' && /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(name);
const isCheckedOut = (root, name) => fs.existsSync(path.join(root, MODULES_DIR, name, 'index.ts'));

/** A path inside the module: relative, no `..` segment, forward slashes. */
const insideModule = (entry) =>
  typeof entry === 'string' &&
  entry.length > 0 &&
  !path.isAbsolute(entry) &&
  !entry.split(/[\\/]/).includes('..');

const stringList = (value, field, file, { required }) => {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || (required && value.length === 0) || !value.every((v) => typeof v === 'string' && v)) {
    throw new Error(`${file}: "${field}" must be ${required ? 'a non-empty' : 'an'} array of strings.`);
  }
  return value;
};

/**
 * Read and validate src/modules/<name>/mutation.config.json. Throws with a
 * message meant for the person running the command when the module is not
 * checked out, has no scope file, the file is malformed, or a module it needs
 * is missing (a missing dependency would make suites skip or fail, and the
 * numbers would then depend on the machine).
 */
const loadModuleScope = (root, name) => {
  if (!isModuleName(name)) throw new Error(`Not a module name: ${JSON.stringify(name)}.`);
  const dir = `${MODULES_DIR}/${name}`;
  if (!isCheckedOut(root, name)) throw new Error(`Module ${name} is not checked out at ${dir}.`);

  const file = `${dir}/${SCOPE_FILE}`;
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`${name} has no ${SCOPE_FILE}, so it has not opted into mutation testing. See docs/MUTATION_TESTING.md, "Modules".`);
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }

  const mutate = stringList(config.mutate, 'mutate', file, { required: true });
  const tests = stringList(config.tests, 'tests', file, { required: true });
  const needs = stringList(config.needs, 'needs', file, { required: false });

  const outside = [...mutate, ...tests].filter((entry) => !insideModule(entry));
  if (outside.length) {
    throw new Error(`${file}: "mutate" and "tests" are paths inside the module, relative to ${dir}; not: ${outside.join(', ')}`);
  }
  const badNames = needs.filter((n) => !isModuleName(n));
  if (badNames.length) throw new Error(`${file}: "needs" lists module names; not: ${badNames.join(', ')}`);

  const dependencies = [...new Set(needs)].filter((n) => n !== name && n !== ALWAYS_PRESENT);
  const missing = dependencies.filter((n) => !isCheckedOut(root, n));
  if (missing.length) {
    throw new Error(`${name} needs module(s) this checkout lacks: ${missing.join(', ')}. Check them out under ${MODULES_DIR}/ first.`);
  }

  return {
    name,
    dir,
    prefix: `${dir}/`,
    mutate: mutate.map((entry) => `${dir}/${entry.replace(/\\/g, '/')}`),
    testMatch: tests.map((entry) => `<rootDir>/${dir}/${entry.replace(/\\/g, '/')}`),
    needs: dependencies,
    baselinePath: path.join(root, dir, BASELINE_FILE),
    reportDir: `reports/mutation/modules/${name}`,
  };
};

/** Anchor a path for Stryker's ignorePatterns (gitignore syntax), escaping pattern characters. */
const anchored = (p) => `/${p.replace(/[\\*?[\]!#]/g, (c) => `\\${c}`)}`;

/**
 * What git ignores under `paths` of the repository at `cwd`, as anchored
 * ignore patterns prefixed with `prefix`. `keep` filters out entries that
 * must stay in the sandbox. Returns null when `cwd` is not a git work tree
 * (or git is unavailable).
 */
const gitIgnoredPatterns = (cwd, { paths = [], prefix = '', keep = () => false } = {}) => {
  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (fs.realpathSync(top) !== fs.realpathSync(cwd)) return null; // inside some other repository
    return execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z', '--', ...paths], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\0')
      .filter(Boolean)
      .filter((p) => !keep(p))
      .map((p) => anchored(`${prefix}${p}`));
  } catch {
    return null;
  }
};

/** Nested node_modules hold a module's un-hoisted dependencies; its code resolves them first. */
const isNodeModules = (p) => /(^|\/)node_modules\/?$/.test(p);

/**
 * Patterns that put modules back into the sandbox: each module directory,
 * minus what that module's own repository ignores, except its node_modules.
 */
const moduleSandboxPatterns = (root, modules) =>
  modules.flatMap((name) => {
    const dir = `${MODULES_DIR}/${name}`;
    const own = gitIgnoredPatterns(path.join(root, dir), { prefix: `${dir}/`, keep: isNodeModules }) || [];
    return [`!${anchored(`${dir}/`)}`, ...own];
  });

/**
 * Map summary keys (relative to the server root) onto the module
 * (`src/modules/<name>/services/x.ts` -> `services/x.ts`). Throws when the
 * run measured a file outside the module: its baseline would not belong in
 * the module's repository.
 */
const toModuleKeys = (summary, prefix) => {
  const outside = Object.keys(summary).filter((file) => !file.startsWith(prefix));
  if (outside.length) {
    throw new Error(`Module run measured files outside ${prefix}: ${outside.join(', ')}`);
  }
  return Object.fromEntries(Object.entries(summary).map(([file, entry]) => [file.slice(prefix.length), entry]));
};

module.exports = {
  loadModuleScope,
  gitIgnoredPatterns,
  moduleSandboxPatterns,
  toModuleKeys,
  anchored,
  MODULES_DIR,
  SCOPE_FILE,
  BASELINE_FILE,
};
