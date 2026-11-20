/**
 * Module mode for mutation testing (scripts/ci/mutationModule.js): the scope
 * of a module repository comes from its own mutation.config.json, and the
 * module goes back into Stryker's sandbox minus what its repository ignores.
 *
 * These tests build throwaway server trees in a temp directory. What matters:
 * a malformed or escaping scope is refused with a message a person can act
 * on; a module that needs another module the checkout lacks is refused rather
 * than silently measured differently; the module's un-hoisted node_modules
 * stay in the sandbox while its other ignored files do not.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const {
  loadModuleScope,
  moduleSandboxPatterns,
  toModuleKeys,
  anchored,
} = require('../../scripts/ci/mutationModule');

const write = (root: string, file: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
};

const addModule = (root: string, name: string, scope?: unknown) => {
  write(root, `src/modules/${name}/index.ts`, 'export default {};\n');
  if (scope !== undefined) {
    write(root, `src/modules/${name}/mutation.config.json`, typeof scope === 'string' ? scope : JSON.stringify(scope));
  }
};

describe('mutation module mode', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-mutation-module-'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  describe('loadModuleScope', () => {
    it('maps a module-relative scope onto the server root', () => {
      addModule(root, 'reactory-dep');
      addModule(root, 'reactory-thing', {
        mutate: ['services/Thing.ts', 'utils/**/*.ts'],
        tests: ['services/__tests__/Thing.test.ts'],
        needs: ['reactory-dep', 'reactory-core', 'reactory-dep'],
      });

      const scope = loadModuleScope(root, 'reactory-thing');

      expect(scope).toMatchObject({
        name: 'reactory-thing',
        prefix: 'src/modules/reactory-thing/',
        mutate: ['src/modules/reactory-thing/services/Thing.ts', 'src/modules/reactory-thing/utils/**/*.ts'],
        testMatch: ['<rootDir>/src/modules/reactory-thing/services/__tests__/Thing.test.ts'],
        // reactory-core is in this repository, so always present; duplicates collapse.
        needs: ['reactory-dep'],
        reportDir: 'reports/mutation/modules/reactory-thing',
      });
      expect(scope.baselinePath).toBe(path.join(root, 'src/modules/reactory-thing/mutation-baseline.json'));
    });

    it('refuses a module that is not checked out', () => {
      expect(() => loadModuleScope(root, 'reactory-absent')).toThrow('Module reactory-absent is not checked out');
    });

    it('refuses a module without a scope file, pointing at the docs', () => {
      addModule(root, 'reactory-thing');
      expect(() => loadModuleScope(root, 'reactory-thing')).toThrow(/has no mutation\.config\.json.*MUTATION_TESTING/);
    });

    it('refuses a module that needs a module this checkout lacks', () => {
      addModule(root, 'reactory-thing', { mutate: ['a.ts'], tests: ['a.test.ts'], needs: ['reactory-missing'] });
      expect(() => loadModuleScope(root, 'reactory-thing')).toThrow('needs module(s) this checkout lacks: reactory-missing');
    });

    it.each([
      ['invalid JSON', '{ mutate: ', /not valid JSON/],
      ['no mutate', { tests: ['a.test.ts'] }, /"mutate" must be a non-empty array/],
      ['empty tests', { mutate: ['a.ts'], tests: [] }, /"tests" must be a non-empty array/],
      ['needs not a list', { mutate: ['a.ts'], tests: ['a.test.ts'], needs: 'reactory-dep' }, /"needs" must be an array/],
      ['a path escaping the module', { mutate: ['../../../utils/hash.ts'], tests: ['a.test.ts'] }, /paths inside the module/],
      ['an absolute path', { mutate: ['a.ts'], tests: ['/etc/a.test.ts'] }, /paths inside the module/],
      ['a path as a module name', { mutate: ['a.ts'], tests: ['a.test.ts'], needs: ['../x'] }, /"needs" lists module names/],
    ])('refuses a scope with %s', (_label, scope, message) => {
      addModule(root, 'reactory-thing', scope);
      expect(() => loadModuleScope(root, 'reactory-thing')).toThrow(message);
    });

    it('refuses a name that is a path', () => {
      expect(() => loadModuleScope(root, '../reactory-thing')).toThrow('Not a module name');
    });
  });

  describe('moduleSandboxPatterns', () => {
    const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'ignore' });

    it("re-includes the module minus what its repository ignores, keeping its node_modules", () => {
      addModule(root, 'reactory-thing');
      const dir = path.join(root, 'src/modules/reactory-thing');
      write(dir, '.gitignore', 'node_modules/\n.env\ncoverage/\n');
      write(dir, 'node_modules/left-pad/index.js', '');
      write(dir, '.env', 'SECRET=1\n');
      write(dir, 'coverage/lcov.info', '');
      git(dir, 'init', '-q');

      expect(moduleSandboxPatterns(root, ['reactory-thing'])).toEqual([
        '!/src/modules/reactory-thing/',
        '/src/modules/reactory-thing/.env',
        '/src/modules/reactory-thing/coverage/',
      ]);
    });

    it('re-includes a module that is not its own repository as it is', () => {
      addModule(root, 'reactory-plain');
      expect(moduleSandboxPatterns(root, ['reactory-plain'])).toEqual(['!/src/modules/reactory-plain/']);
    });
  });

  it('escapes gitignore pattern characters in anchored paths', () => {
    expect(anchored('src/a[1]/b*.ts')).toBe('/src/a\\[1\\]/b\\*.ts');
  });

  describe('toModuleKeys', () => {
    it('keys a summary relative to the module', () => {
      expect(toModuleKeys({ 'src/modules/m/a.ts': { undetected: 1 } }, 'src/modules/m/')).toEqual({ 'a.ts': { undetected: 1 } });
    });

    it('refuses files outside the module, whose baseline would not belong to it', () => {
      expect(() => toModuleKeys({ 'src/utils/hash.ts': {} }, 'src/modules/m/')).toThrow('outside src/modules/m/');
    });
  });
});
