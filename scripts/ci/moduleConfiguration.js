/**
 * Which server modules this checkout contains.
 *
 * A Reactory backend is any combination of modules: each directory under
 * src/modules is its own repository (only reactory-core lives in this one).
 * CI checks out the server alone, so every other module is absent there, and
 * a developer's checkout may hold any subset. The CI scripts use this to tell
 * "needs a module this configuration does not include" apart from a failure.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MODULES = path.join(ROOT, 'src', 'modules');

const presentModules = () =>
  new Set(
    fs.readdirSync(MODULES, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(MODULES, entry.name, 'index.ts')))
      .map((entry) => entry.name),
  );

/**
 * The absent module a specifier or path points into, or null. Understands
 * `@reactory/server-modules/<m>/…`, `…/modules/<m>/…`, `src/modules/<m>/…`
 * and relative paths such as `../../../<m>/…` from inside another module.
 */
const absentModuleIn = (specifier, present = presentModules()) => {
  const normalised = String(specifier).replace(/\\/g, '/');
  const match = /(?:server-modules\/|(?:^|\/)modules\/|(?:^|\/)\.\.\/)(reactory-[A-Za-z0-9_-]+)\//.exec(normalised);
  return match && !present.has(match[1]) ? match[1] : null;
};

module.exports = { presentModules, absentModuleIn, ROOT };
