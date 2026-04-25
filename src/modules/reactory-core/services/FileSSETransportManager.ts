import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Response } from 'express';
import chokidar, { FSWatcher } from 'chokidar';
import { ObjectId } from 'mongodb';
import ApiError from '@reactory/server-core/exceptions';
import { service } from '@reactory/server-core/application/decorators/service';

export type FileScope = 'server' | 'user';

const SESSION_TTL_MS = 60 * 60 * 1000;         // 1 hour
const EVICTION_GRACE_MS = 60 * 1000;           // 60 s
const HEARTBEAT_INTERVAL_MS = 15 * 1000;       // 15 s
const ECHO_TTL_MS = 2000;                      // 2 s

export interface FileSseActor {
  userId?: string;
  clientId?: string;
}

export interface FileSseChangeSummary {
  bytesBefore: number;
  bytesAfter: number;
}

export type FileSseEvent =
  | { type: 'opened';       sessionId: string; revision: string; timestamp: string }
  | { type: 'file_changed'; sessionId: string; revision: string; summary: FileSseChangeSummary; actor?: FileSseActor; timestamp: string }
  | { type: 'file_deleted'; sessionId: string; timestamp: string }
  | { type: 'error';        sessionId: string; code: string; message: string; timestamp: string };

interface OpenSessionArgs {
  path: string;
  user: { _id: ObjectId | string };
  partner: { _id: ObjectId | string; key: string };
  /** 'server' (rooted at APP_DATA_ROOT) or 'user' (rooted at the caller's home). */
  scope?: FileScope;
}

interface OpenSessionResult {
  sessionId: string;
  endpoint: string;
  token: string;
  expiry: Date;
  currentRevision: string;
}

interface Subscriber {
  id: string;
  response: Response;
  heartbeatTimer: NodeJS.Timeout;
  detach: () => void;
}

interface Session {
  sessionId: string;
  absolutePath: string;
  partnerKey: string;
  userId: string;
  token: string;
  expiry: Date;
  lastRevision: string;
  lastBytes: number;
  watcher: FSWatcher | null;
  subscribers: Map<string, Subscriber>;
  evictTimer: NodeJS.Timeout | null;
  echoNote: { revision: string; expiresAt: number } | null;
  /** Set while closeSession is running — suppresses re-scheduling eviction from detach. */
  closing: boolean;
}

@service({
  id: 'core.FileSSETransportManager@1.0.0',
  nameSpace: 'core',
  name: 'FileSSETransportManager',
  version: '1.0.0',
  description: 'Manages SSE sessions and file watchers for the <File /> live editor.',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [],
  roles: ['SYSTEM', 'ADMIN', 'DEVELOPER'],
})
export class FileSSETransportManager {
  name = 'FileSSETransportManager';
  nameSpace = 'core';
  version = '1.0.0';

  private sessions = new Map<string, Session>();
  private static instance: FileSSETransportManager;
  private context: any;

  constructor(_props: any, context: any) {
    this.context = context;
    if (!FileSSETransportManager.instance) {
      FileSSETransportManager.instance = this;
    }
    return FileSSETransportManager.instance;
  }

  async openSession(args: OpenSessionArgs): Promise<OpenSessionResult> {
    const scope = args.scope ?? 'server';
    const absolutePath = this.resolvePath(args.path, scope, args.user, args.partner);
    const sessionId = this.deriveSessionId(args.partner.key, absolutePath);

    let session = this.sessions.get(sessionId);
    if (session) {
      this.cancelEviction(session);
      return this.toOpenResult(session);
    }

    if (!fs.existsSync(absolutePath)) {
      throw new ApiError(`File not found: ${args.path}`, { code: 'FILE_NOT_FOUND' });
    }

    const buffer = fs.readFileSync(absolutePath);
    const revision = sha256Hex16(buffer);

    const token = crypto.randomBytes(24).toString('hex');
    const expiry = new Date(Date.now() + SESSION_TTL_MS);

    session = {
      sessionId,
      absolutePath,
      partnerKey: args.partner.key,
      userId: String(args.user._id),
      token,
      expiry,
      lastRevision: revision,
      lastBytes: buffer.byteLength,
      watcher: this.createWatcher(absolutePath, sessionId),
      subscribers: new Map(),
      evictTimer: null,
      echoNote: null,
      closing: false,
    };

    this.sessions.set(sessionId, session);
    return this.toOpenResult(session);
  }

  async attachTransport(sessionId: string, token: string, res: Response): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ApiError(`Unknown session ${sessionId}`, { code: 'UNKNOWN_SESSION' });
    }
    if (session.token !== token) {
      throw new ApiError('Invalid SSE session token', { code: 'UNAUTHORIZED' });
    }
    if (session.expiry.getTime() <= Date.now()) {
      throw new ApiError('SSE session token has expired', { code: 'TOKEN_EXPIRED' });
    }

    this.cancelEviction(session);

    this.initSseHeaders(res);

    const subscriberId = crypto.randomBytes(8).toString('hex');
    const heartbeatTimer = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch { /* best-effort */ }
    }, HEARTBEAT_INTERVAL_MS);

    const detach = () => {
      clearInterval(heartbeatTimer);
      session.subscribers.delete(subscriberId);
      if (session.subscribers.size === 0 && !session.closing) {
        this.scheduleEviction(session);
      }
    };

    res.on('close', detach);
    res.on('error', detach);

    const subscriber: Subscriber = { id: subscriberId, response: res, heartbeatTimer, detach };
    session.subscribers.set(subscriberId, subscriber);

    this.sendEventTo(res, {
      type: 'opened',
      sessionId: session.sessionId,
      revision: session.lastRevision,
      timestamp: new Date().toISOString(),
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.closing = true;

    if (session.evictTimer) {
      clearTimeout(session.evictTimer);
      session.evictTimer = null;
    }

    for (const sub of session.subscribers.values()) {
      clearInterval(sub.heartbeatTimer);
      try { sub.response.end(); } catch { /* ignore */ }
    }
    session.subscribers.clear();

    if (session.watcher) {
      try { await session.watcher.close(); } catch { /* ignore */ }
      session.watcher = null;
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Record a local write so the resulting chokidar `change` event is suppressed
   * (prevents the originator client from seeing its own save as an external change).
   */
  noteLocalWrite(sessionId: string, revision: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.echoNote = { revision, expiresAt: Date.now() + ECHO_TTL_MS };
  }

  /**
   * Derive the session ID for a given (partnerKey, scope, path) tuple.
   * Lets the resolver layer call `noteLocalWrite` without round-tripping.
   *
   * User-scope calls must pass `user` so the path resolves under that user's
   * home folder.
   */
  sessionIdFor(
    partnerKey: string,
    filePath: string,
    scope: FileScope = 'server',
    user?: { _id: ObjectId | string },
    partner?: { _id: ObjectId | string; key: string },
  ): string {
    return this.deriveSessionId(
      partnerKey,
      this.resolvePath(filePath, scope, user, partner),
    );
  }

  /**
   * Cleanup hook for tests and process shutdown: close every session/watcher.
   */
  async shutdown(): Promise<void> {
    const ids = Array.from(this.sessions.keys());
    await Promise.all(ids.map(id => this.closeSession(id)));
  }

  // Test-only escape hatch (underscore-prefixed to flag its status).
  _testExpireSession(sessionId: string): void {
    const s = this.sessions.get(sessionId);
    if (s) s.expiry = new Date(Date.now() - 1);
  }

  // ───────────────────────────── internals ─────────────────────────────

  private userHomeRoot(
    user?: { _id: ObjectId | string },
    partner?: { _id: ObjectId | string; key: string },
  ): string {
    const appDataRoot = process.env.APP_DATA_ROOT;
    if (!appDataRoot) {
      throw new ApiError('APP_DATA_ROOT is not configured', { code: 'CONFIG_ERROR' });
    }
    if (process.env.IS_DESKTOP_INSTALL === 'true') {
      const desktopRoot = process.env.REACTOR_DESKTOP_ROOT
        ? path.join(os.homedir(), process.env.REACTOR_DESKTOP_ROOT)
        : os.homedir();
      return process.env.REACTOR_HOME_PATH || desktopRoot;
    }
    const userId = user?._id ?? this.context?.user?._id;
    const partnerId = partner?._id ?? this.context?.partner?._id;
    if (!userId || !partnerId) {
      throw new ApiError(
        'User or partner context missing for user-scope path resolution',
        { code: 'CONFIG_ERROR' },
      );
    }
    return path.join(
      appDataRoot,
      'profiles',
      String(userId),
      'files',
      String(partnerId),
      'home',
    );
  }

  private resolvePath(
    inputPath: string,
    scope: FileScope = 'server',
    user?: { _id: ObjectId | string },
    partner?: { _id: ObjectId | string; key: string },
  ): string {
    if (scope === 'user') {
      const rootAbs = path.resolve(this.userHomeRoot(user, partner));

      // Same two-form acceptance as ReactoryFileService.resolveContentPath:
      // absolute-under-home (desktop mode) vs home-relative.
      let absolute: string;
      const candidate = path.isAbsolute(inputPath) ? path.resolve(inputPath) : null;
      if (candidate && (candidate === rootAbs || candidate.startsWith(rootAbs + path.sep))) {
        absolute = candidate;
      } else {
        const relative = inputPath.replace(/^\/+/, '');
        absolute = path.resolve(rootAbs, relative);
      }

      if (absolute !== rootAbs && !absolute.startsWith(rootAbs + path.sep)) {
        throw new ApiError(
          `Path ${inputPath} escapes the user's home folder`,
          { code: 'INVALID_PATH' },
        );
      }
      return absolute;
    }

    const appDataRoot = process.env.APP_DATA_ROOT;
    if (!appDataRoot) {
      throw new ApiError('APP_DATA_ROOT is not configured', { code: 'CONFIG_ERROR' });
    }
    const rootAbs = path.resolve(appDataRoot);
    const absolute = path.isAbsolute(inputPath)
      ? path.resolve(inputPath)
      : path.resolve(rootAbs, inputPath);

    if (absolute !== rootAbs && !absolute.startsWith(rootAbs + path.sep)) {
      throw new ApiError(`Path ${inputPath} escapes the allowed root`, { code: 'INVALID_PATH' });
    }
    return absolute;
  }

  private deriveSessionId(partnerKey: string, absolutePath: string): string {
    // Canonicalize separators so Windows + POSIX agree; trim trailing slashes.
    const canonical = `${partnerKey}::${absolutePath.replace(/\\/g, '/').replace(/\/+$/, '')}`;
    return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
  }

  private createWatcher(absolutePath: string, sessionId: string): FSWatcher {
    const watcher = chokidar.watch(absolutePath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });
    watcher.on('change', (file) => this.handleChange(sessionId, String(file)));
    watcher.on('unlink', () => this.handleUnlink(sessionId));
    watcher.on('error', (err: unknown) => this.handleWatcherError(sessionId, err));
    return watcher;
  }

  private handleChange(sessionId: string, _file: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(session.absolutePath);
    } catch {
      // File disappeared mid-read — the unlink handler will fire shortly.
      return;
    }

    const newRevision = sha256Hex16(buffer);
    if (newRevision === session.lastRevision) return; // no-op duplicate

    if (session.echoNote && session.echoNote.expiresAt > Date.now()
        && session.echoNote.revision === newRevision) {
      session.echoNote = null;
      session.lastRevision = newRevision;
      session.lastBytes = buffer.byteLength;
      return;
    }
    if (session.echoNote && session.echoNote.expiresAt <= Date.now()) {
      session.echoNote = null;
    }

    const event: FileSseEvent = {
      type: 'file_changed',
      sessionId,
      revision: newRevision,
      summary: { bytesBefore: session.lastBytes, bytesAfter: buffer.byteLength },
      timestamp: new Date().toISOString(),
    };

    session.lastRevision = newRevision;
    session.lastBytes = buffer.byteLength;

    this.broadcast(session, event);
  }

  private handleUnlink(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.broadcast(session, {
      type: 'file_deleted',
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleWatcherError(sessionId: string, err: unknown): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const message = err instanceof Error ? err.message : String(err);
    this.broadcast(session, {
      type: 'error',
      sessionId,
      code: 'WATCHER_ERROR',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private broadcast(session: Session, event: FileSseEvent): void {
    for (const sub of session.subscribers.values()) {
      this.sendEventTo(sub.response, event);
    }
  }

  private sendEventTo(res: Response, event: FileSseEvent): void {
    try {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    } catch { /* best-effort; disconnect is handled via close listener */ }
  }

  private initSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }
  }

  private scheduleEviction(session: Session): void {
    if (session.evictTimer) clearTimeout(session.evictTimer);
    session.evictTimer = setTimeout(() => {
      void this.closeSession(session.sessionId);
    }, EVICTION_GRACE_MS);
  }

  private cancelEviction(session: Session): void {
    if (session.evictTimer) {
      clearTimeout(session.evictTimer);
      session.evictTimer = null;
    }
  }

  private toOpenResult(session: Session): OpenSessionResult {
    return {
      sessionId: session.sessionId,
      endpoint: `/reactory/files/sse/${session.sessionId}`,
      token: session.token,
      expiry: session.expiry,
      currentRevision: session.lastRevision,
    };
  }
}

function sha256Hex16(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export const FileSSETransportManagerDefinition: Reactory.Service.IReactoryServiceDefinition<FileSSETransportManager> = {
  id: 'core.FileSSETransportManager@1.0.0',
  name: 'FileSSETransportManager',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Manages SSE sessions and file watchers for the <File /> live editor.',
  dependencies: [],
  serviceType: 'data',
  service: (props: Reactory.Service.IReactoryServiceProps, context: any) => {
    return new FileSSETransportManager(props, context);
  },
};

export default FileSSETransportManagerDefinition;
