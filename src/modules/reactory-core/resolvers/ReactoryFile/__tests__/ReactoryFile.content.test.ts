import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import ApiError from '@reactory/server-core/exceptions';
import ReactoryFile from '../ReactoryFile';

const sha256Hex16 = (s: string) =>
  crypto.createHash('sha256').update(Buffer.from(s, 'utf-8')).digest('hex').slice(0, 16);

interface Fakes {
  fileService: {
    readFileContent: jest.Mock;
    writeFileContent: jest.Mock;
  };
  transportManager: {
    openSession: jest.Mock;
    closeSession: jest.Mock;
    noteLocalWrite: jest.Mock;
    sessionIdFor: jest.Mock;
  };
}

const makeFakes = (): Fakes => ({
  fileService: {
    readFileContent: jest.fn(),
    writeFileContent: jest.fn(),
  },
  transportManager: {
    openSession: jest.fn(),
    closeSession: jest.fn(),
    noteLocalWrite: jest.fn(),
    sessionIdFor: jest.fn(),
  },
});

const makeContext = (fakes: Fakes, roles: string[] = ['ADMIN']): any => ({
  user: { _id: new ObjectId() },
  partner: { _id: new ObjectId(), key: 'reactory' },
  hasRole: jest.fn((r: string) => roles.includes(r)),
  log: jest.fn(),
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  getService: jest.fn((id: string) => {
    if (id === 'core.ReactoryFileService@1.0.0') return fakes.fileService;
    if (id === 'core.FileSSETransportManager@1.0.0') return fakes.transportManager;
    return null;
  }),
});

describe('ReactoryFile resolvers — content operations', () => {
  let resolver: any;
  let fakes: Fakes;
  let ctx: any;

  beforeEach(() => {
    resolver = new ReactoryFile();
    fakes = makeFakes();
    ctx = makeContext(fakes);
  });

  describe('ReactoryReadFile', () => {
    it('returns ReactoryFileContent on success', async () => {
      const modified = new Date('2026-04-18T00:00:00.000Z');
      fakes.fileService.readFileContent.mockResolvedValue({
        content: 'x', revision: 'r1', mimetype: 'text/plain', bytes: 1, modified,
      });

      const result = await resolver.readFile({}, { path: 'files/a.txt' }, ctx);

      expect(result).toEqual({
        __typename: 'ReactoryFileContent',
        path: 'files/a.txt',
        content: 'x',
        mimetype: 'text/plain',
        revision: 'r1',
        bytes: 1,
        modified: '2026-04-18T00:00:00.000Z',
      });
    });

    it('maps FILE_NOT_FOUND ApiError to ReactoryFileError', async () => {
      fakes.fileService.readFileContent.mockRejectedValue(
        new ApiError('missing', { code: 'FILE_NOT_FOUND' }),
      );

      const result = await resolver.readFile({}, { path: 'missing.txt' }, ctx);

      expect(result).toMatchObject({
        __typename: 'ReactoryFileError',
        code: 'FILE_NOT_FOUND',
        message: 'missing',
      });
    });

    it('maps ACCESS_DENIED ApiError to ReactoryFileError', async () => {
      fakes.fileService.readFileContent.mockRejectedValue(
        new ApiError('denied', { code: 'ACCESS_DENIED' }),
      );
      const result = await resolver.readFile({}, { path: 'x' }, ctx);
      expect(result).toMatchObject({ code: 'ACCESS_DENIED' });
    });

    it('maps unknown errors to INTERNAL', async () => {
      fakes.fileService.readFileContent.mockRejectedValue(new Error('boom'));
      const result = await resolver.readFile({}, { path: 'x' }, ctx);
      expect(result).toMatchObject({
        __typename: 'ReactoryFileError',
        code: 'INTERNAL',
        message: 'boom',
      });
    });
  });

  describe('ReactoryWriteFile', () => {
    it('notes local write BEFORE calling writeFileContent', async () => {
      fakes.transportManager.sessionIdFor.mockReturnValue('sess-abc');
      const callOrder: string[] = [];
      fakes.transportManager.noteLocalWrite.mockImplementation(() => {
        callOrder.push('noteLocalWrite');
      });
      fakes.fileService.writeFileContent.mockImplementation(async () => {
        callOrder.push('writeFileContent');
        return { revision: sha256Hex16('new'), savedAt: new Date('2026-04-18T01:00:00.000Z'), bytesWritten: 3 };
      });

      const result = await resolver.writeFile(
        {},
        { input: { path: 'files/a.txt', content: 'new' } },
        ctx,
      );

      expect(callOrder).toEqual(['noteLocalWrite', 'writeFileContent']);
      expect(fakes.transportManager.sessionIdFor).toHaveBeenCalledWith(
        'reactory', 'files/a.txt', 'server', ctx.user, ctx.partner,
      );
      expect(fakes.transportManager.noteLocalWrite).toHaveBeenCalledWith('sess-abc', sha256Hex16('new'));
      expect(result).toMatchObject({
        __typename: 'ReactoryFileWriteSuccess',
        path: 'files/a.txt',
        bytesWritten: 3,
      });
    });

    it('surfaces STALE_REVISION with currentRevision', async () => {
      fakes.transportManager.sessionIdFor.mockReturnValue('sess-abc');
      fakes.fileService.writeFileContent.mockRejectedValue(
        new ApiError('stale', { code: 'STALE_REVISION', currentRevision: 'r9' }),
      );

      const result = await resolver.writeFile(
        {},
        { input: { path: 'files/a.txt', content: 'x', baseRevision: 'r0' } },
        ctx,
      );

      expect(result).toMatchObject({
        __typename: 'ReactoryFileError',
        code: 'STALE_REVISION',
        currentRevision: 'r9',
      });
    });

    it('surfaces FILE_TOO_LARGE with maxBytes', async () => {
      fakes.transportManager.sessionIdFor.mockReturnValue('sess-abc');
      fakes.fileService.writeFileContent.mockRejectedValue(
        new ApiError('big', { code: 'FILE_TOO_LARGE', maxBytes: 2 * 1024 * 1024 }),
      );

      const result = await resolver.writeFile(
        {},
        { input: { path: 'files/a.txt', content: 'x' } },
        ctx,
      );

      expect(result).toMatchObject({
        code: 'FILE_TOO_LARGE',
        maxBytes: 2 * 1024 * 1024,
      });
    });

    it('sessionIdFor throwing does not abort the write', async () => {
      fakes.transportManager.sessionIdFor.mockImplementation(() => {
        throw new Error('no session map');
      });
      fakes.fileService.writeFileContent.mockResolvedValue({
        revision: 'r2', savedAt: new Date(), bytesWritten: 1,
      });

      const result = await resolver.writeFile(
        {},
        { input: { path: 'files/a.txt', content: 'x' } },
        ctx,
      );

      expect(result.__typename).toBe('ReactoryFileWriteSuccess');
      expect(fakes.transportManager.noteLocalWrite).not.toHaveBeenCalled();
      expect(fakes.fileService.writeFileContent).toHaveBeenCalled();
    });
  });

  describe('ReactoryOpenFileSession', () => {
    it('returns ACCESS_DENIED for non-admin/non-developer', async () => {
      ctx = makeContext(fakes, []);
      const result = await resolver.openFileSession({}, { path: 'files/a.txt' }, ctx);
      expect(result).toMatchObject({
        __typename: 'ReactoryFileError',
        code: 'ACCESS_DENIED',
      });
      expect(fakes.transportManager.openSession).not.toHaveBeenCalled();
    });

    it('returns ReactoryFileSession on admin happy path', async () => {
      const expiry = new Date('2026-04-18T02:00:00.000Z');
      fakes.transportManager.openSession.mockResolvedValue({
        sessionId: 'sess-abc',
        endpoint: '/reactory/files/sse/sess-abc',
        token: 'tok',
        expiry,
        currentRevision: 'r1',
      });

      const result = await resolver.openFileSession({}, { path: 'files/a.txt' }, ctx);

      expect(result).toEqual({
        __typename: 'ReactoryFileSession',
        sessionId: 'sess-abc',
        endpoint: '/reactory/files/sse/sess-abc',
        token: 'tok',
        expiry: '2026-04-18T02:00:00.000Z',
        currentRevision: 'r1',
      });
    });

    it('maps manager ApiError to ReactoryFileError', async () => {
      fakes.transportManager.openSession.mockRejectedValue(
        new ApiError('missing', { code: 'FILE_NOT_FOUND' }),
      );

      const result = await resolver.openFileSession({}, { path: 'x' }, ctx);

      expect(result).toMatchObject({
        code: 'FILE_NOT_FOUND',
      });
    });

    it('user scope bypasses ADMIN check — only requires authentication', async () => {
      ctx = makeContext(fakes, []); // no ADMIN/DEVELOPER
      fakes.transportManager.openSession.mockResolvedValue({
        sessionId: 'uid-sess',
        endpoint: '/reactory/files/sse/uid-sess',
        token: 'tok',
        expiry: new Date('2026-04-19T12:00:00Z'),
        currentRevision: 'r1',
      });

      const result = await resolver.openFileSession({}, { path: 'docs/note.md', scope: 'user' }, ctx);

      expect(result).toMatchObject({ __typename: 'ReactoryFileSession', sessionId: 'uid-sess' });
      expect(fakes.transportManager.openSession).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'docs/note.md', scope: 'user' }),
      );
    });

    it('user scope without an authenticated user returns ACCESS_DENIED', async () => {
      ctx = makeContext(fakes, []);
      ctx.user = null;
      const result = await resolver.openFileSession({}, { path: 'x', scope: 'user' }, ctx);
      expect(result).toMatchObject({ code: 'ACCESS_DENIED' });
      expect(fakes.transportManager.openSession).not.toHaveBeenCalled();
    });
  });

  describe('ReactoryWriteFile with scope', () => {
    it('passes scope through to writeFileContent and sessionIdFor', async () => {
      fakes.transportManager.sessionIdFor.mockReturnValue('sess-user');
      fakes.fileService.writeFileContent.mockResolvedValue({
        revision: sha256Hex16('x'), savedAt: new Date(), bytesWritten: 1,
      });

      await resolver.writeFile(
        {},
        { input: { path: 'docs/note.md', content: 'x', scope: 'user' } },
        ctx,
      );

      expect(fakes.transportManager.sessionIdFor).toHaveBeenCalledWith(
        'reactory', 'docs/note.md', 'user', ctx.user, ctx.partner,
      );
      expect(fakes.fileService.writeFileContent).toHaveBeenCalledWith(
        'docs/note.md', 'x', undefined, false, 'user',
      );
    });
  });

  describe('ReactoryReadFile with scope', () => {
    it('defaults to server scope when omitted', async () => {
      fakes.fileService.readFileContent.mockResolvedValue({
        content: 'x', revision: 'r', mimetype: 'text/plain', bytes: 1, modified: new Date(),
      });
      await resolver.readFile({}, { path: 'x.txt' }, ctx);
      expect(fakes.fileService.readFileContent).toHaveBeenCalledWith('x.txt', 'server');
    });

    it('forwards scope=user to the service', async () => {
      fakes.fileService.readFileContent.mockResolvedValue({
        content: 'x', revision: 'r', mimetype: 'text/plain', bytes: 1, modified: new Date(),
      });
      await resolver.readFile({}, { path: 'docs/a.md', scope: 'user' }, ctx);
      expect(fakes.fileService.readFileContent).toHaveBeenCalledWith('docs/a.md', 'user');
    });
  });

  describe('ReactoryCloseFileSession', () => {
    it('closes and returns ReactoryFileSessionCloseSuccess', async () => {
      fakes.transportManager.closeSession.mockResolvedValue(undefined);

      const result = await resolver.closeFileSession({}, { sessionId: 'sess-abc' }, ctx);

      expect(fakes.transportManager.closeSession).toHaveBeenCalledWith('sess-abc');
      expect(result).toEqual({
        __typename: 'ReactoryFileSessionCloseSuccess',
        sessionId: 'sess-abc',
      });
    });

    it('maps manager errors to ReactoryFileError', async () => {
      fakes.transportManager.closeSession.mockRejectedValue(new Error('boom'));

      const result = await resolver.closeFileSession({}, { sessionId: 'sess-abc' }, ctx);

      expect(result).toMatchObject({
        __typename: 'ReactoryFileError',
        code: 'INTERNAL',
        message: 'boom',
      });
    });
  });
});
