import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';

jest.mock('chokidar');
import chokidar from 'chokidar';

import { FileSSETransportManager } from '../FileSSETransportManager';

const sha256Hex16 = (input: string | Buffer) =>
  crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);

class MockWatcher extends EventEmitter {
  closed = false;
  close = jest.fn().mockImplementation(async () => { this.closed = true; });
}

class MockResponse extends EventEmitter {
  _writes: string[] = [];
  _ended = false;
  headers: Record<string, string> = {};
  setHeader(k: string, v: string) { this.headers[k] = v; }
  flushHeaders = jest.fn();
  write(chunk: string) { this._writes.push(chunk); return true; }
  end() { this._ended = true; this.emit('close'); }
  _emitClose() { this.emit('close'); }
  // Some helpers for assertions
  sseEvents(): Array<{ event: string; data: any }> {
    const events: Array<{ event: string; data: any }> = [];
    for (const chunk of this._writes) {
      const match = chunk.match(/^event: (\w+)\ndata: (.+)\n\n$/);
      if (match) {
        events.push({ event: match[1], data: JSON.parse(match[2]) });
      }
    }
    return events;
  }
  comments(): string[] {
    return this._writes.filter(w => w.startsWith(':'));
  }
}

const makeCtx = (): any => ({
  user: { _id: new ObjectId() },
  partner: { _id: new ObjectId(), key: 'reactory' },
  hasRole: jest.fn((role: string) => role === 'ADMIN'),
  log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
});

describe('FileSSETransportManager', () => {
  let tmpRoot: string;
  let originalAppDataRoot: string | undefined;
  let originalDesktop: string | undefined;
  let watchers: MockWatcher[];
  let manager: FileSSETransportManager;
  let context: any;

  beforeEach(() => {
    jest.useRealTimers();
    originalAppDataRoot = process.env.APP_DATA_ROOT;
    originalDesktop = process.env.IS_DESKTOP_INSTALL;
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fsse-'));
    process.env.APP_DATA_ROOT = tmpRoot;
    delete process.env.IS_DESKTOP_INSTALL;
    fs.mkdirSync(path.join(tmpRoot, 'files'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'files', 'a.txt'), 'hello');

    watchers = [];
    (chokidar.watch as jest.Mock).mockImplementation(() => {
      const w = new MockWatcher();
      watchers.push(w);
      return w as any;
    });

    context = makeCtx();
    manager = new FileSSETransportManager({}, context);
  });

  afterEach(async () => {
    await manager.shutdown();
    jest.useRealTimers();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    process.env.APP_DATA_ROOT = originalAppDataRoot;
    if (originalDesktop === undefined) delete process.env.IS_DESKTOP_INSTALL;
    else process.env.IS_DESKTOP_INSTALL = originalDesktop;
    (chokidar.watch as jest.Mock).mockReset();
  });

  const openA = () => manager.openSession({
    path: 'files/a.txt',
    user: context.user,
    partner: context.partner,
  });

  describe('session identity', () => {
    it('returns deterministic sessionId for same (partner, path)', async () => {
      const a = await openA();
      const b = await openA();
      expect(a.sessionId).toBe(b.sessionId);
      expect(a.sessionId).toMatch(/^[0-9a-f]{16}$/);
    });

    it('different paths produce different sessionIds', async () => {
      fs.writeFileSync(path.join(tmpRoot, 'files', 'b.txt'), 'world');
      const a = await openA();
      const b = await manager.openSession({
        path: 'files/b.txt', user: context.user, partner: context.partner,
      });
      expect(a.sessionId).not.toBe(b.sessionId);
    });

    it('different partner keys produce different sessionIds', async () => {
      const a = await openA();
      const b = await manager.openSession({
        path: 'files/a.txt',
        user: context.user,
        partner: { ...context.partner, key: 'other-tenant' },
      });
      expect(a.sessionId).not.toBe(b.sessionId);
    });

    it('openSession returns current file revision', async () => {
      const a = await openA();
      expect(a.currentRevision).toBe(sha256Hex16('hello'));
    });
  });

  describe('watcher lifecycle', () => {
    it('opening a session creates exactly one chokidar watcher', async () => {
      await openA();
      expect(chokidar.watch).toHaveBeenCalledTimes(1);
      expect(watchers.length).toBe(1);
    });

    it('opening the same session twice reuses the watcher', async () => {
      await openA();
      await openA();
      expect(chokidar.watch).toHaveBeenCalledTimes(1);
    });
  });

  describe('attachTransport', () => {
    it('with valid token writes opened SSE event', async () => {
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      const events = res.sseEvents();
      expect(events.length).toBe(1);
      expect(events[0].event).toBe('opened');
      expect(events[0].data.sessionId).toBe(s.sessionId);
      expect(events[0].data.revision).toBe(s.currentRevision);
    });

    it('with wrong token throws UNAUTHORIZED', async () => {
      const s = await openA();
      const res = new MockResponse();
      await expect(
        manager.attachTransport(s.sessionId, 'bad-token', res as any),
      ).rejects.toMatchObject({ meta: { code: 'UNAUTHORIZED' } });
    });

    it('with expired token throws TOKEN_EXPIRED', async () => {
      const s = await openA();
      manager._testExpireSession(s.sessionId);
      const res = new MockResponse();
      await expect(
        manager.attachTransport(s.sessionId, s.token, res as any),
      ).rejects.toMatchObject({ meta: { code: 'TOKEN_EXPIRED' } });
    });

    it('two subscribers on same session share a watcher and both receive events', async () => {
      const s = await openA();
      const r1 = new MockResponse();
      const r2 = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, r1 as any);
      await manager.attachTransport(s.sessionId, s.token, r2 as any);

      expect(chokidar.watch).toHaveBeenCalledTimes(1);

      fs.writeFileSync(path.join(tmpRoot, 'files', 'a.txt'), 'updated');
      watchers[0].emit('change', path.join(tmpRoot, 'files', 'a.txt'));

      // Give the async handler a tick to flush
      await new Promise(r => setImmediate(r));

      const e1 = r1.sseEvents().find(e => e.event === 'file_changed');
      const e2 = r2.sseEvents().find(e => e.event === 'file_changed');
      expect(e1).toBeDefined();
      expect(e2).toBeDefined();
      expect(e1!.data.revision).toBe(sha256Hex16('updated'));
    });
  });

  describe('broadcast + echo suppression', () => {
    it('watcher change event broadcasts file_changed with revision + summary', async () => {
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      fs.writeFileSync(path.join(tmpRoot, 'files', 'a.txt'), 'next');
      watchers[0].emit('change', path.join(tmpRoot, 'files', 'a.txt'));
      await new Promise(r => setImmediate(r));

      const evt = res.sseEvents().find(e => e.event === 'file_changed');
      expect(evt).toBeDefined();
      expect(evt!.data.revision).toBe(sha256Hex16('next'));
      expect(evt!.data.summary.bytesAfter).toBe(4);
      expect(typeof evt!.data.timestamp).toBe('string');
    });

    it('noteLocalWrite suppresses matching broadcast', async () => {
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      fs.writeFileSync(path.join(tmpRoot, 'files', 'a.txt'), 'echoed');
      manager.noteLocalWrite(s.sessionId, sha256Hex16('echoed'));
      watchers[0].emit('change', path.join(tmpRoot, 'files', 'a.txt'));
      await new Promise(r => setImmediate(r));

      expect(res.sseEvents().some(e => e.event === 'file_changed')).toBe(false);
    });

    it('echo-suppression note expires after 2 s', async () => {
      jest.useFakeTimers();
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      manager.noteLocalWrite(s.sessionId, sha256Hex16('echoed'));
      jest.advanceTimersByTime(2001);

      fs.writeFileSync(path.join(tmpRoot, 'files', 'a.txt'), 'echoed');
      watchers[0].emit('change', path.join(tmpRoot, 'files', 'a.txt'));
      await Promise.resolve();
      await Promise.resolve();

      expect(res.sseEvents().some(e => e.event === 'file_changed')).toBe(true);
    });

    it('unlink event broadcasts file_deleted', async () => {
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      watchers[0].emit('unlink', path.join(tmpRoot, 'files', 'a.txt'));
      await new Promise(r => setImmediate(r));

      expect(res.sseEvents().some(e => e.event === 'file_deleted')).toBe(true);
    });
  });

  describe('eviction', () => {
    it('last subscriber disconnect starts 60 s eviction timer', async () => {
      jest.useFakeTimers();
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      res._emitClose();
      jest.advanceTimersByTime(59_000);
      expect(watchers[0].close).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2_000);
      expect(watchers[0].close).toHaveBeenCalled();
    });

    it('re-attach within eviction window cancels the timer', async () => {
      jest.useFakeTimers();
      const s = await openA();
      const r1 = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, r1 as any);
      r1._emitClose();

      jest.advanceTimersByTime(30_000);
      const r2 = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, r2 as any);

      jest.advanceTimersByTime(60_000);
      expect(watchers[0].close).not.toHaveBeenCalled();
    });

    it('closeSession closes all subscribers and watcher immediately', async () => {
      const s = await openA();
      const r1 = new MockResponse();
      const r2 = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, r1 as any);
      await manager.attachTransport(s.sessionId, s.token, r2 as any);

      await manager.closeSession(s.sessionId);

      expect(watchers[0].close).toHaveBeenCalled();
      expect(r1._ended).toBe(true);
      expect(r2._ended).toBe(true);
    });
  });

  describe('heartbeat', () => {
    it('sends SSE comment heartbeat every 15 s', async () => {
      jest.useFakeTimers();
      const s = await openA();
      const res = new MockResponse();
      await manager.attachTransport(s.sessionId, s.token, res as any);

      jest.advanceTimersByTime(15_000);
      expect(res.comments().some(c => c.includes('heartbeat'))).toBe(true);
    });
  });

  describe('user scope', () => {
    let userHome: string;

    beforeEach(() => {
      userHome = path.join(
        tmpRoot,
        'profiles',
        context.user._id.toString(),
        'files',
        context.partner._id.toString(),
        'home',
      );
      fs.mkdirSync(path.join(userHome, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(userHome, 'docs', 'note.md'), '# hi');
    });

    const openUserNote = () => manager.openSession({
      path: 'docs/note.md',
      user: context.user,
      partner: context.partner,
      scope: 'user',
    });

    it('opens a session rooted in the user home and returns the revision', async () => {
      const s = await openUserNote();
      expect(s.currentRevision).toBe(sha256Hex16('# hi'));
      expect(chokidar.watch).toHaveBeenCalledWith(
        path.join(userHome, 'docs', 'note.md'),
        expect.anything(),
      );
    });

    it('user-scope and server-scope on the same relative path produce different sessionIds', async () => {
      // Create a server-scope file at the same relative path so both opens succeed.
      fs.mkdirSync(path.join(tmpRoot, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, 'docs', 'note.md'), '# server');

      const userSession = await openUserNote();
      const serverSession = await manager.openSession({
        path: 'docs/note.md',
        user: context.user,
        partner: context.partner,
        scope: 'server',
      });

      expect(userSession.sessionId).not.toBe(serverSession.sessionId);
    });

    it('rejects traversal out of the user home with INVALID_PATH', async () => {
      await expect(
        manager.openSession({
          path: '../../../etc/passwd',
          user: context.user,
          partner: context.partner,
          scope: 'user',
        }),
      ).rejects.toMatchObject({ meta: { code: 'INVALID_PATH' } });
    });

    it('sessionIdFor with scope=user uses the user home root', async () => {
      const id = manager.sessionIdFor(
        context.partner.key,
        'docs/note.md',
        'user',
        context.user,
        context.partner,
      );
      const s = await openUserNote();
      expect(id).toBe(s.sessionId);
    });
  });
});
