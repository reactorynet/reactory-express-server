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
  let originalAppDataRoot: string | undefined;

  beforeEach(() => {
    originalAppDataRoot = process.env.APP_DATA_ROOT;
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
    process.env.APP_DATA_ROOT = originalAppDataRoot;
  });

  const makeService = (context: any) => new ReactoryFileService({}, context);

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
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe('index.ts');
  });

  it('handles missing workspace file gracefully without throwing', () => {
    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, '/', {
      workspace: path.join(tmpRoot, 'non-existent.code-workspace'),
    });

    expect(result).toBeDefined();
    expect(result.folders).toEqual([]);
    expect(result.files).toEqual([]);
  });

  it('correctly loads and resolves folders for the actual reactory.code-workspace file', () => {
    const actualWorkspacePath = '/Users/wweber/Source/reactory/reactory.code-workspace';
    if (!fs.existsSync(actualWorkspacePath)) {
      return;
    }

    const service = makeService(ctx);
    const result = service.getUserFiles(ctx.user._id, '/', {
      workspace: actualWorkspacePath,
    });

    expect(result).toBeDefined();
    expect(result.path).toBe('/');
    expect(result.workspace).toBe(actualWorkspacePath);
    expect(result.folders.length).toBeGreaterThan(0);

    const folderNames = result.folders.map(f => f.name);
    expect(folderNames).toContain('🔄 Reactory Core');
    expect(folderNames).toContain('🚀 Express Server');
    expect(folderNames).toContain('📱 PWA Client');
  });
});
