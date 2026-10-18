import fs from 'fs';
import os from 'os';
import path from 'path';
import { ObjectId } from 'mongodb';
import { ReactoryFileService } from '../ReactoryFileService';

const makeCtx = (roles: string[] = ['USER']): any => ({
  user: { _id: new ObjectId() },
  partner: { _id: new ObjectId(), key: 'reactory' },
  hasRole: jest.fn((role: string) => roles.includes(role)),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('ReactoryFileService — workspace support', () => {
  let ctx: any;
  let tmpRoot: string;
  let workspacePath: string;
  let folder1Path: string;
  let folder2Path: string;
  let originalEnv: {
    APP_DATA_ROOT: string | undefined;
    IS_DESKTOP_INSTALL: string | undefined;
    REACTOR_HOME_PATH: string | undefined;
    REACTOR_DESKTOP_ROOT: string | undefined;
  };

  const restoreEnv = () => {
    const entries = Object.entries(originalEnv) as Array<[string, string | undefined]>;
    entries.forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  };

  beforeEach(() => {
    // Capture then clear every ambient variable that can move the resolved
    // home root, so the suite is hermetic: with .env present a developer run
    // would otherwise list os.homedir(), and in CI it would list an unrelated
    // APP_DATA_ROOT tree. Each test opts in to the layout it needs.
    originalEnv = {
      APP_DATA_ROOT: process.env.APP_DATA_ROOT,
      IS_DESKTOP_INSTALL: process.env.IS_DESKTOP_INSTALL,
      REACTOR_HOME_PATH: process.env.REACTOR_HOME_PATH,
      REACTOR_DESKTOP_ROOT: process.env.REACTOR_DESKTOP_ROOT,
    };
    delete process.env.IS_DESKTOP_INSTALL;
    delete process.env.REACTOR_HOME_PATH;
    delete process.env.REACTOR_DESKTOP_ROOT;

    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rfs-ws-'));
    process.env.APP_DATA_ROOT = tmpRoot;

    // Create target directories on disk
    folder1Path = path.join(tmpRoot, 'module-core');
    folder2Path = path.join(tmpRoot, 'module-client');
    fs.mkdirSync(folder1Path, { recursive: true });
    fs.mkdirSync(folder2Path, { recursive: true });

    // Add dummy file in folder1
    fs.writeFileSync(path.join(folder1Path, 'index.ts'), '// core index');

    // Create a .code-workspace file with JSONC comments and relative folder paths
    workspacePath = path.join(tmpRoot, 'test.code-workspace');
    const workspaceContent = `{
      // Workspace configuration
      "folders": [
        {
          "name": "🔄 Core Module",
          "path": "module-core"
        },
        {
          "name": "📱 Client Module",
          "path": "./module-client"
        },
        {
          "name": "Non Existent Folder",
          "path": "does-not-exist"
        },
      ],
      "settings": {
        "editor.tabSize": 2
      }
    }`;
    fs.writeFileSync(workspacePath, workspaceContent, 'utf8');

    ctx = makeCtx(['USER']);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    restoreEnv();
  });

  const makeService = (context: any) => new ReactoryFileService({}, context);

  const filenames = (result: { files: Array<{ filename?: string; alias?: string }> }) =>
    result.files.map(f => f.filename ?? f.alias);

  it('parses .code-workspace JSONC and returns resolved workspace folders for root path "/"', () => {
    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, '/', {
      workspace: workspacePath,
    });

    expect(result).toBeDefined();
    expect(result.path).toBe('/');
    expect(result.workspace).toBe(workspacePath);
    expect(result.folders).toHaveLength(2); // Non-existent folder is filtered out

    const folderNames = result.folders.map(f => f.name);
    expect(folderNames).toContain('🔄 Core Module');
    expect(folderNames).toContain('📱 Client Module');

    const folder1 = result.folders.find(f => f.name === '🔄 Core Module');
    expect(folder1?.path).toBe(folder1Path);
  });

  it('lists contents of a specific subfolder when rootPath is an absolute subfolder path', () => {
    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, folder1Path, {
      workspace: workspacePath,
    });

    expect(result).toBeDefined();
    expect(result.path).toBe(folder1Path);
    expect(result.workspace).toBe(workspacePath);
    expect(filenames(result)).toEqual(['index.ts']);
    expect(result.folders).toEqual([]);
  });

  it('lists a nested folder inside a workspace folder and returns absolute child paths', () => {
    const nestedPath = path.join(folder1Path, 'nested');
    fs.mkdirSync(nestedPath, { recursive: true });
    fs.writeFileSync(path.join(nestedPath, 'deep.ts'), '// deep file');

    const service = makeService(ctx);

    const folderListing = service.getUserFiles(ctx.user._id, folder1Path, {
      workspace: workspacePath,
    });
    expect(folderListing.folders).toEqual([
      { name: 'nested', path: nestedPath },
    ]);

    const nestedListing = service.getUserFiles(ctx.user._id, nestedPath, {
      workspace: workspacePath,
    });
    expect(nestedListing.path).toBe(nestedPath);
    expect(filenames(nestedListing)).toEqual(['deep.ts']);
  });

  it('returns an empty listing for an absolute path inside a workspace folder that does not exist', () => {
    const missingPath = path.join(folder1Path, 'missing-subfolder');
    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, missingPath, {
      workspace: workspacePath,
    });

    expect(result).toBeDefined();
    expect(result.path).toBe(missingPath);
    expect(result.files).toEqual([]);
    expect(result.folders).toEqual([]);
  });

  it('handles missing workspace file gracefully without throwing', () => {
    // Force desktop mode with an explicit fake home so the pre-fix
    // fall-through is observable: it would list these sentinels instead of
    // degrading to an empty workspace listing. CI's default layout (random
    // userId/partnerId under APP_DATA_ROOT) never exists, which made an
    // emptiness-only assertion pass against the buggy source.
    const fakeHome = path.join(tmpRoot, 'fake-home');
    fs.mkdirSync(fakeHome, { recursive: true });
    fs.writeFileSync(path.join(fakeHome, 'home-sentinel.txt'), 'home listing');
    process.env.IS_DESKTOP_INSTALL = 'true';
    process.env.REACTOR_HOME_PATH = fakeHome;

    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, '/', {
      workspace: path.join(tmpRoot, 'non-existent.code-workspace'),
    });

    expect(result).toBeDefined();
    expect(result.path).toBe('/');
    expect(result.folders).toEqual([]);
    expect(result.files).toEqual([]);
    expect(filenames(result)).not.toContain('home-sentinel.txt');
  });

  it('does not fall through to the home listing for a missing workspace when a subfolder path is requested', () => {
    // The pre-fix fall-through resolves an absolute rootPath against the home
    // root, so make the requested workspace folder resolvable from there: the
    // buggy source then returns module-core's index.ts, while the fixed source
    // degrades to an empty listing.
    fs.writeFileSync(path.join(tmpRoot, 'home-sentinel.txt'), 'home listing');
    process.env.IS_DESKTOP_INSTALL = 'true';
    process.env.REACTOR_HOME_PATH = tmpRoot;

    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, folder1Path, {
      workspace: path.join(tmpRoot, 'non-existent.code-workspace'),
    });

    expect(result).toBeDefined();
    expect(result.path).toBe(folder1Path);
    expect(result.folders).toEqual([]);
    expect(result.files).toEqual([]);
    expect(filenames(result)).not.toContain('index.ts');
    expect(filenames(result)).not.toContain('home-sentinel.txt');
  });
});
