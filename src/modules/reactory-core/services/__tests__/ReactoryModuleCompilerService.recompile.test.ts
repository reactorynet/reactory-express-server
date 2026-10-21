import fs from 'fs';
import os from 'os';
import path from 'path';
import ReactoryModuleCompilerService, { getDataRoot } from '../ReactoryModuleCompilerService';

/**
 * Regression cover for the 2026-10-20 classroom toolbar outage.
 *
 * A module build that failed used to be *permanently* unbuildable:
 *
 *  - `compileWithRollup` failure → a failure stub is written to
 *    `lib/<id>.min.js`, and the checksum was only persisted on success;
 *  - `doCompile` was decided with
 *    `if (existingChecksum && existingChecksum !== newChecksum) doCompile = true;`
 *  - with no checksum file, `existingChecksum` was `''`, the condition was
 *    falsy, and `doCompile` stayed `false` forever.
 *
 * So after the source was fixed and the server restarted, the stale failure
 * stub (a JS file that cannot even be parsed - it embeds an ANSI-escaped rollup
 * log inside a string literal) kept being served. The browser reported
 * `Uncaught SyntaxError: Invalid or unexpected token at :5:27`.
 *
 * These tests pin the two halves of the fix:
 *  1. a missing checksum forces a recompile;
 *  2. the checksum is recorded for failed attempts too, so an unchanged broken
 *     module is not rebuilt on every request while a source edit still is.
 */
describe('ReactoryModuleCompilerService recompile-after-failure', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDataRoot = process.env.APP_DATA_ROOT;
  const moduleId = 'test.RecompileProbe@1.0.0';
  const moduleDirName = moduleId.replace(/[\\/]/g, '_');

  let service: ReactoryModuleCompilerService;
  let dataRoot: string;
  let runtimeBase: string;
  let compiledFile: string;
  let checksumFile: string;
  let moduleDir: string;
  let compileSpy: jest.SpyInstance;

  const baseModule = (src: string) => ({
    id: moduleId,
    src,
    compiler: 'rollup',
    fileType: 'tsx',
    compilerOptions: {},
  } as any);

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    // Isolate from the machine's data root. `jest.sh` sources `.env`, so a local
    // run otherwise inherits a real `plugins/__runtime__` while a clean CI
    // checkout does not - which is precisely how these tests came to pass
    // locally and fail in CI.
    process.env.APP_DATA_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-recompile-'));
    dataRoot = getDataRoot();
    runtimeBase = path.join(dataRoot, 'plugins', '__runtime__');
    compiledFile = path.join(runtimeBase, `lib/${moduleId}.min.js`);
    checksumFile = path.join(runtimeBase, 'src', moduleDirName, '.reactory-checksum');
    moduleDir = path.join(runtimeBase, 'src', moduleDirName);

    // The service deliberately refuses to recompile when
    // `plugins/__runtime__/build.sh` is absent (the production-freeze guard).
    // These tests assert whether a compile is *attempted*, so provide the
    // script a build-capable checkout would have.
    fs.mkdirSync(runtimeBase, { recursive: true });
    fs.writeFileSync(path.join(runtimeBase, 'build.sh'), '#!/bin/sh\n', { mode: 0o755 });

    service = new ReactoryModuleCompilerService({} as any, { log: jest.fn() } as any);

    // Never spawn rollup in this test - we only care whether it is *attempted*.
    compileSpy = jest
      .spyOn(service as any, 'compileWithRollup')
      .mockResolvedValue({ success: false, messages: [] });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalDataRoot === undefined) delete process.env.APP_DATA_ROOT;
    else process.env.APP_DATA_ROOT = originalDataRoot;
    jest.restoreAllMocks();
    // Removing the temporary data root also removes the module dir, the
    // compiled stub, the checksum and the build script in one step.
    // `rmSync` landed in Node 14.14 but this repo pins @types/node 10.x, so the
    // typed surface does not expose it. Cast rather than weaken the tsconfig
    // (or the ratchet baseline) for one call: the runtime supports it.
    try {
      (fs as any).rmSync(dataRoot, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('recompiles when a compiled artifact exists but no checksum was recorded', async () => {
    // The exact poisoned state: a failure stub on disk, no checksum beside it.
    fs.mkdirSync(path.dirname(compiledFile), { recursive: true });
    fs.writeFileSync(compiledFile, 'if(window&&window.reactory){$reactory.log("Compilation Failure for x")}');
    expect(fs.existsSync(checksumFile)).toBe(false);

    await service.compileModule(baseModule('export default 1;'));

    expect(compileSpy).toHaveBeenCalledTimes(1);
  });

  it('records a checksum even when the build fails, so the retry is sticky', async () => {
    fs.mkdirSync(path.dirname(compiledFile), { recursive: true });
    fs.writeFileSync(compiledFile, 'stale');

    await service.compileModule(baseModule('export default 1;'));

    expect(compileSpy).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(checksumFile)).toBe(true);
    expect(fs.readFileSync(checksumFile, 'utf8').trim().length).toBeGreaterThan(0);
  });

  it('does not rebuild unchanged sources after a failed attempt', async () => {
    fs.mkdirSync(path.dirname(compiledFile), { recursive: true });
    fs.writeFileSync(compiledFile, 'stale');

    await service.compileModule(baseModule('export default 1;'));
    expect(compileSpy).toHaveBeenCalledTimes(1);

    // Same source again: checksum matches, so no second rollup run.
    await service.compileModule(baseModule('export default 1;'));
    expect(compileSpy).toHaveBeenCalledTimes(1);
  });

  it('rebuilds once the source changes after a failed attempt', async () => {
    fs.mkdirSync(path.dirname(compiledFile), { recursive: true });
    fs.writeFileSync(compiledFile, 'stale');

    await service.compileModule(baseModule('export default 1;'));
    expect(compileSpy).toHaveBeenCalledTimes(1);

    // A real fix changes the source, hence the checksum, hence a new build.
    await service.compileModule(baseModule('export default 2;'));
    expect(compileSpy).toHaveBeenCalledTimes(2);
  });
});
