import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ObjectId } from 'mongodb';
import { ReactoryFileService } from '../ReactoryFileService';

const sha256Hex16 = (input: string | Buffer) =>
  crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);

const makeCtx = (roles: string[]): any => ({
  user: { _id: new ObjectId() },
  partner: { _id: new ObjectId(), key: 'reactory' },
  hasRole: jest.fn((role: string) => roles.includes(role)),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('ReactoryFileService — content I/O', () => {
  let adminCtx: any;
  let anonCtx: any;
  let tmpRoot: string;
  let originalAppDataRoot: string | undefined;
  let originalDesktop: string | undefined;

  beforeEach(() => {
    originalAppDataRoot = process.env.APP_DATA_ROOT;
    originalDesktop = process.env.IS_DESKTOP_INSTALL;
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rfs-content-'));
    process.env.APP_DATA_ROOT = tmpRoot;
    // Tests exercise the non-desktop path layout; IS_DESKTOP_INSTALL in
    // .env.local would otherwise redirect user home to `os.homedir()`.
    delete process.env.IS_DESKTOP_INSTALL;

    const filesDir = path.join(tmpRoot, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    fs.writeFileSync(path.join(filesDir, 'hello.txt'), 'hello world');
    fs.writeFileSync(path.join(filesDir, 'config.json'), '{"a":1}');
    fs.writeFileSync(path.join(filesDir, 'empty.bin'), '');

    adminCtx = makeCtx(['ADMIN']);
    anonCtx = makeCtx([]);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    process.env.APP_DATA_ROOT = originalAppDataRoot;
    if (originalDesktop === undefined) delete process.env.IS_DESKTOP_INSTALL;
    else process.env.IS_DESKTOP_INSTALL = originalDesktop;
  });

  const makeService = (ctx: any) => new ReactoryFileService({}, ctx);

  describe('readFileContent', () => {
    it('returns content + sha256 revision for a text file', async () => {
      const result = await makeService(adminCtx).readFileContent('files/hello.txt');

      expect(result.content).toBe('hello world');
      expect(result.revision).toBe(sha256Hex16('hello world'));
      expect(result.mimetype).toBe('text/plain');
      expect(result.bytes).toBe(11);
      expect(Object.prototype.toString.call(result.modified)).toBe('[object Date]');
      expect(Number.isFinite(result.modified.getTime())).toBe(true);
    });

    it('returns application/json mimetype for .json', async () => {
      const result = await makeService(adminCtx).readFileContent('files/config.json');

      expect(result.mimetype).toBe('application/json');
      expect(result.content).toBe('{"a":1}');
    });

    it('resolves ${APP_DATA_ROOT} template variable in path', async () => {
      const result = await makeService(adminCtx)
        .readFileContent('${APP_DATA_ROOT}/files/hello.txt');

      expect(result.content).toBe('hello world');
    });

    it('throws FILE_NOT_FOUND when path does not exist', async () => {
      await expect(
        makeService(adminCtx).readFileContent('files/missing.txt'),
      ).rejects.toMatchObject({ meta: { code: 'FILE_NOT_FOUND' } });
    });

    it('throws ACCESS_DENIED for non-admin/non-developer contexts', async () => {
      await expect(
        makeService(anonCtx).readFileContent('files/hello.txt'),
      ).rejects.toMatchObject({ meta: { code: 'ACCESS_DENIED' } });
    });

    it('empty file returns empty string with stable revision', async () => {
      const result = await makeService(adminCtx).readFileContent('files/empty.bin');

      expect(result.content).toBe('');
      expect(result.bytes).toBe(0);
      expect(result.revision).toBe(sha256Hex16(''));
    });
  });

  describe('writeFileContent', () => {
    it('writes content and returns new revision', async () => {
      const result = await makeService(adminCtx)
        .writeFileContent('files/hello.txt', 'updated');

      expect(fs.readFileSync(path.join(tmpRoot, 'files/hello.txt'), 'utf-8'))
        .toBe('updated');
      expect(result.revision).toBe(sha256Hex16('updated'));
      expect(result.bytesWritten).toBe(7);
      expect(Object.prototype.toString.call(result.savedAt)).toBe('[object Date]');
    });

    it('creates file when target does not exist', async () => {
      const result = await makeService(adminCtx)
        .writeFileContent('files/new.txt', 'hi');

      expect(fs.existsSync(path.join(tmpRoot, 'files/new.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(tmpRoot, 'files/new.txt'), 'utf-8'))
        .toBe('hi');
      expect(result.bytesWritten).toBe(2);
    });

    it('with matching baseRevision succeeds', async () => {
      const svc = makeService(adminCtx);
      const rev0 = (await svc.readFileContent('files/hello.txt')).revision;

      const result = await svc.writeFileContent('files/hello.txt', 'next', rev0);

      expect(result.revision).toBe(sha256Hex16('next'));
    });

    it('with stale baseRevision throws STALE_REVISION', async () => {
      const svc = makeService(adminCtx);
      const rev0 = (await svc.readFileContent('files/hello.txt')).revision;

      fs.writeFileSync(path.join(tmpRoot, 'files/hello.txt'), 'intervening');
      const rev1 = sha256Hex16('intervening');

      await expect(
        svc.writeFileContent('files/hello.txt', 'clobber', rev0),
      ).rejects.toMatchObject({
        meta: { code: 'STALE_REVISION', currentRevision: rev1 },
      });
    });

    it('with stale baseRevision and force:true succeeds', async () => {
      const svc = makeService(adminCtx);
      const rev0 = (await svc.readFileContent('files/hello.txt')).revision;
      fs.writeFileSync(path.join(tmpRoot, 'files/hello.txt'), 'intervening');

      const result = await svc.writeFileContent('files/hello.txt', 'clobber', rev0, true);

      expect(result.revision).toBe(sha256Hex16('clobber'));
      expect(fs.readFileSync(path.join(tmpRoot, 'files/hello.txt'), 'utf-8'))
        .toBe('clobber');
    });

    it('rejects content >2 MB with FILE_TOO_LARGE', async () => {
      const oversized = 'a'.repeat(2 * 1024 * 1024 + 1);

      await expect(
        makeService(adminCtx).writeFileContent('files/hello.txt', oversized),
      ).rejects.toMatchObject({
        meta: { code: 'FILE_TOO_LARGE', maxBytes: 2 * 1024 * 1024 },
      });
    });

    it('rejects path traversal with INVALID_PATH', async () => {
      await expect(
        makeService(adminCtx).writeFileContent('../etc/passwd', 'x'),
      ).rejects.toMatchObject({ meta: { code: 'INVALID_PATH' } });
    });

    it('rejects write for non-admin/non-developer with ACCESS_DENIED', async () => {
      await expect(
        makeService(anonCtx).writeFileContent('files/hello.txt', 'x'),
      ).rejects.toMatchObject({ meta: { code: 'ACCESS_DENIED' } });
    });

    it('leaves file unchanged when validation fails', async () => {
      const before = fs.readFileSync(
        path.join(tmpRoot, 'files/hello.txt'), 'utf-8',
      );
      const oversized = 'a'.repeat(2 * 1024 * 1024 + 1);

      await expect(
        makeService(adminCtx).writeFileContent('files/hello.txt', oversized),
      ).rejects.toBeDefined();

      const after = fs.readFileSync(
        path.join(tmpRoot, 'files/hello.txt'), 'utf-8',
      );
      expect(after).toBe(before);
    });
  });

  describe("user scope", () => {
    let userHome: string;
    let userCtx: any;

    beforeEach(() => {
      userCtx = makeCtx([]); // no ADMIN/DEVELOPER role
      userHome = path.join(
        tmpRoot,
        'profiles',
        userCtx.user._id.toString(),
        'files',
        userCtx.partner._id.toString(),
        'home',
      );
      fs.mkdirSync(path.join(userHome, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(userHome, 'docs', 'note.md'), '# hi');
    });

    it('reads a user-home file without ADMIN role', async () => {
      const result = await makeService(userCtx)
        .readFileContent('docs/note.md', 'user');

      expect(result.content).toBe('# hi');
      expect(result.mimetype).toBe('text/markdown');
      expect(result.revision).toBe(sha256Hex16('# hi'));
    });

    it('strips leading slash when resolving user paths', async () => {
      const result = await makeService(userCtx)
        .readFileContent('/docs/note.md', 'user');

      expect(result.content).toBe('# hi');
    });

    it('rejects traversal out of the user home with INVALID_PATH', async () => {
      await expect(
        makeService(userCtx).readFileContent('../../../etc/passwd', 'user'),
      ).rejects.toMatchObject({ meta: { code: 'INVALID_PATH' } });
    });

    it('rejects unauthenticated callers with ACCESS_DENIED', async () => {
      const anon = makeCtx([]);
      anon.user = null;
      await expect(
        makeService(anon).readFileContent('docs/note.md', 'user'),
      ).rejects.toMatchObject({ meta: { code: 'ACCESS_DENIED' } });
    });

    it('writes a user-home file and creates parent directories', async () => {
      const result = await makeService(userCtx)
        .writeFileContent('new/path/todo.md', 'todo', undefined, false, 'user');

      const abs = path.join(userHome, 'new/path/todo.md');
      expect(fs.existsSync(abs)).toBe(true);
      expect(fs.readFileSync(abs, 'utf-8')).toBe('todo');
      expect(result.revision).toBe(sha256Hex16('todo'));
    });

    it('enforces stale-revision check for user scope too', async () => {
      const svc = makeService(userCtx);
      const rev0 = (await svc.readFileContent('docs/note.md', 'user')).revision;

      fs.writeFileSync(path.join(userHome, 'docs/note.md'), 'intervening');

      await expect(
        svc.writeFileContent('docs/note.md', 'clobber', rev0, false, 'user'),
      ).rejects.toMatchObject({ meta: { code: 'STALE_REVISION' } });
    });

    it('does NOT expand ${APP_DATA_ROOT} in user scope (treated as a literal path segment)', async () => {
      // User-scope paths are always relative to the user's home. Template
      // variables would enable escape, so they're intentionally not expanded.
      // A path containing `${APP_DATA_ROOT}` simply won't match anything.
      await expect(
        makeService(userCtx).readFileContent('${APP_DATA_ROOT}/any.txt', 'user'),
      ).rejects.toMatchObject({ meta: { code: 'FILE_NOT_FOUND' } });
    });

    it('defaults scope to "server" when omitted (ACCESS_DENIED for non-admin)', async () => {
      await expect(
        makeService(userCtx).readFileContent('docs/note.md'),
      ).rejects.toMatchObject({ meta: { code: 'ACCESS_DENIED' } });
    });

    it('treats absolute paths already under the home root as already-resolved', async () => {
      // Simulates desktop mode where getUserFiles returns e.g. `/Users/wweber/foo.json`
      // and the client hands that path straight through to <File />.
      const absolute = path.join(userHome, 'docs', 'note.md');
      const result = await makeService(userCtx).readFileContent(absolute, 'user');
      expect(result.content).toBe('# hi');
    });

    it('reinterprets a leading-slash path as home-relative (so the server never reads outside the home root)', async () => {
      // `/etc/passwd` is absolute but outside the home root. The resolver
      // treats it as home-relative (`etc/passwd` joined under home), which
      // simply doesn't exist → FILE_NOT_FOUND. The home root is never
      // escaped.
      await expect(
        makeService(userCtx).readFileContent('/etc/passwd', 'user'),
      ).rejects.toMatchObject({ meta: { code: 'FILE_NOT_FOUND' } });
    });
  });
});
