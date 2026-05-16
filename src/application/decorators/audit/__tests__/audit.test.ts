import { audit } from '../audit';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const makeAuditService = () => ({
  logAuditEvent: jest.fn().mockResolvedValue({ id: 'audit-1' }),
});

const makeContext = (overrides: Partial<{
  userId: string;
  ip: string;
  sessionId: string;
  partnerId: string;
  userAgent: string;
  auditService: object;
}> = {}): any => {
  const auditService = overrides.auditService ?? makeAuditService();
  return {
    user: { _id: overrides.userId ?? 'u-123' },
    req: {
      ip: overrides.ip ?? '10.0.0.1',
      headers: { 'user-agent': overrides.userAgent ?? 'jest-ua' },
    },
    sessionId: overrides.sessionId ?? 'sess-abc',
    partner: { _id: overrides.partnerId ?? 'org-1' },
    getService: jest.fn((id: string) =>
      id === 'core.ReactoryAuditService@1.0.0' ? auditService : null
    ),
    _auditService: auditService,
  };
};

function makeClass(decoratorOptions: Parameters<typeof audit>[0]) {
  class MyService {
    context: any;
    constructor(ctx: any) { this.context = ctx; }

    @audit(decoratorOptions)
    async action(..._args: any[]): Promise<any> {
      return { id: 'res-42', status: 'ok' };
    }
  }
  return MyService;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('@audit decorator', () => {

  // ── timing: after (default) ──────────────────────────────────────────────

  describe('timing: after (default)', () => {
    it('calls the original method and returns its result', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.action' }))(ctx);
      const result = await svc.action('arg0');
      expect(result).toEqual({ id: 'res-42', status: 'ok' });
    });

    it('writes one audit entry after execution', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.do' }))(ctx);
      await svc.action();
      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(1);
    });

    it('marks the entry as success=true on normal completion', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.do' }))(ctx);
      await svc.action();
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.errorMessage).toBeUndefined();
    });

    it('marks success=false and captures errorMessage when method throws', async () => {
      class FailService {
        context: any;
        constructor(ctx: any) { this.context = ctx; }

        @audit({ action: 'test.fail', failSilently: true })
        async action() { throw new Error('Something went wrong'); }
      }

      const ctx = makeContext();
      const svc = new FailService(ctx);

      await expect(svc.action()).rejects.toThrow('Something went wrong');

      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.success).toBe(false);
      expect(call.errorMessage).toBe('Something went wrong');
    });

    it('still rethrows the original error after writing the audit entry', async () => {
      class ThrowService {
        context: any;
        constructor(ctx: any) { this.context = ctx; }

        @audit({ action: 'test.throw' })
        async action() { throw new Error('boom'); }
      }

      const ctx = makeContext();
      await expect(new ThrowService(ctx).action()).rejects.toThrow('boom');
      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ── timing: before ───────────────────────────────────────────────────────

  describe('timing: before', () => {
    it('writes the entry before execution (result is undefined in entry)', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.before', timing: 'before' }))(ctx);

      await svc.action('hello');

      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(1);
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      // before-entry has no success flag
      expect(call.success).toBeUndefined();
    });

    it('does NOT write an after-entry', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.before', timing: 'before' }))(ctx);
      await svc.action();
      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ── timing: both ─────────────────────────────────────────────────────────

  describe('timing: both', () => {
    it('writes two entries — one before and one after', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.both', timing: 'both' }))(ctx);

      await svc.action();

      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(2);
    });

    it('before-entry has success=undefined, after-entry has success=true', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'test.both', timing: 'both' }))(ctx);

      await svc.action();

      const [beforeCall, afterCall] = ctx._auditService.logAuditEvent.mock.calls.map((c: any[]) => c[0]);
      expect(beforeCall.success).toBeUndefined();
      expect(afterCall.success).toBe(true);
    });

    it('still writes the after-entry when method throws', async () => {
      class BothFailService {
        context: any;
        constructor(ctx: any) { this.context = ctx; }

        @audit({ action: 'test.both.fail', timing: 'both' })
        async action() { throw new Error('fail'); }
      }

      const ctx = makeContext();
      await expect(new BothFailService(ctx).action()).rejects.toThrow('fail');
      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(2);
    });
  });

  // ── Field resolution ──────────────────────────────────────────────────────

  describe('field resolution', () => {
    describe('action template', () => {
      it('resolves ${0} placeholder from args', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'resource.${0}.update' }))(ctx);

        await svc.action('widget');

        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.action).toBe('resource.widget.update');
      });

      it('resolves ${0.type} nested placeholder', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'doc.${0.type}' }))(ctx);

        await svc.action({ type: 'invoice' });

        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.action).toBe('doc.invoice');
      });
    });

    describe('source', () => {
      it('defaults to class name when source not provided', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'x' }))(ctx);
        await svc.action();
        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.source).toBe('MyService');
      });

      it('uses explicit source string', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'x', source: 'AuthModule' }))(ctx);
        await svc.action();
        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.source).toBe('AuthModule');
      });
    });

    describe('resourceId extractor', () => {
      it('dot-path string resolves against args', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'x', resourceId: '0.id' }))(ctx);

        await svc.action({ id: 'doc-99' });

        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.resourceId).toBe('doc-99');
      });

      it('function extractor receives args and result', async () => {
        const ctx = makeContext();
        const extractor = jest.fn((_args, result) => result?.id);
        const svc = new (makeClass({ action: 'x', resourceId: extractor }))(ctx);

        await svc.action('arg0');

        expect(extractor).toHaveBeenCalledWith(['arg0'], { id: 'res-42', status: 'ok' }, expect.any(Object));
        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.resourceId).toBe('res-42');
      });
    });

    describe('before / after extractors', () => {
      it('captures before snapshot from args', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({
          action: 'doc.update',
          timing: 'both',
          before: '0',
          after: (_args, result) => result,
        }))(ctx);

        await svc.action({ id: 'doc-1', title: 'Old' });

        const [beforeCall, afterCall] = ctx._auditService.logAuditEvent.mock.calls.map((c: any[]) => c[0]);
        expect(beforeCall.before).toEqual({ id: 'doc-1', title: 'Old' });
        expect(afterCall.after).toEqual({ id: 'res-42', status: 'ok' });
      });

      it('before extractor receives undefined result in before phase', async () => {
        const extractor = jest.fn((_args, result) => ({ result }));
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'x', timing: 'before', before: extractor }))(ctx);

        await svc.action();

        expect(extractor).toHaveBeenCalledWith(expect.any(Array), undefined, expect.any(Object));
      });
    });

    describe('metadata', () => {
      it('static object is forwarded as-is', async () => {
        const ctx = makeContext();
        const svc = new (makeClass({ action: 'x', metadata: { env: 'test' } }))(ctx);
        await svc.action();
        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.metadata).toEqual({ env: 'test' });
      });

      it('function metadata receives args and result', async () => {
        const ctx = makeContext();
        const meta = jest.fn((_args, result) => ({ resultId: result?.id }));
        const svc = new (makeClass({ action: 'x', metadata: meta }))(ctx);

        await svc.action('a');

        expect(meta).toHaveBeenCalledWith(['a'], { id: 'res-42', status: 'ok' }, expect.any(Object));
        const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
        expect(call.metadata).toEqual({ resultId: 'res-42' });
      });
    });
  });

  // ── Context fields forwarded to audit entry ───────────────────────────────

  describe('context fields forwarded to audit params', () => {
    it('populates user, ipAddress, sessionId, organizationId', async () => {
      const ctx = makeContext({ userId: 'u-999', ip: '1.2.3.4', sessionId: 'sess-xyz', partnerId: 'org-A' });
      const svc = new (makeClass({ action: 'x' }))(ctx);

      await svc.action();

      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.user).toBe('u-999');
      expect(call.actorId).toBe('u-999');
      expect(call.ipAddress).toBe('1.2.3.4');
      expect(call.sessionId).toBe('sess-xyz');
      expect(call.organizationId).toBe('org-A');
    });

    it('sets actorType to "user" for authenticated users', async () => {
      const ctx = makeContext({ userId: 'u-1' });
      const svc = new (makeClass({ action: 'x' }))(ctx);
      await svc.action();
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.actorType).toBe('user');
    });

    it('sets actorType to "system" for anonymous users', async () => {
      const ctx = makeContext({ userId: 'ANON' });
      const svc = new (makeClass({ action: 'x' }))(ctx);
      await svc.action();
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.actorType).toBe('system');
    });

    it('respects explicit actorType override', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'x', actorType: 'admin' }))(ctx);
      await svc.action();
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.actorType).toBe('admin');
    });

    it('forwards moduleName and moduleVersion', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'x', moduleName: 'auth', moduleVersion: '2.0.0' }))(ctx);
      await svc.action();
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.moduleName).toBe('auth');
      expect(call.moduleVersion).toBe('2.0.0');
    });

    it('forwards eventType', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ action: 'x', eventType: 'approve' }))(ctx);
      await svc.action();
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.eventType).toBe('approve');
    });
  });

  // ── contextSource: params ─────────────────────────────────────────────────

  describe('contextSource: params', () => {
    it('picks up context from method arguments', async () => {
      class Resolver {
        @audit({ action: 'gql.resolve', contextSource: 'params' })
        async resolve(_parent: any, _args: any, context: any) { return 'result'; }
      }

      const ctx = makeContext({ userId: 'u-resolver' });
      const result = await new Resolver().resolve(null, {}, ctx);

      expect(result).toBe('result');
      expect(ctx._auditService.logAuditEvent).toHaveBeenCalledTimes(1);
      const call = ctx._auditService.logAuditEvent.mock.calls[0][0];
      expect(call.user).toBe('u-resolver');
    });
  });

  // ── Fail-open / fail-silently behaviour ───────────────────────────────────

  describe('fail-open behaviour', () => {
    it('executes method when no context is found', async () => {
      class NoCtx {
        @audit({ action: 'x' })
        async action() { return 'ok'; }
      }
      expect(await new NoCtx().action()).toBe('ok');
    });

    it('executes method when ReactoryAuditService is not registered', async () => {
      const ctx = { user: {}, req: {}, getService: jest.fn().mockReturnValue(null) };
      class Svc {
        context = ctx;
        @audit({ action: 'x' })
        async action() { return 'ok'; }
      }
      expect(await new Svc().action()).toBe('ok');
    });

    it('executes method when getService throws', async () => {
      const ctx = {
        user: {}, req: {},
        getService: jest.fn().mockImplementation(() => { throw new Error('DI error'); }),
      };
      class Svc {
        context = ctx;
        @audit({ action: 'x' })
        async action() { return 'ok'; }
      }
      expect(await new Svc().action()).toBe('ok');
    });

    it('swallows audit write failures when failSilently=true (default)', async () => {
      const failingService = { logAuditEvent: jest.fn().mockRejectedValue(new Error('DB down')) };
      const ctx = makeContext({ auditService: failingService });
      const svc = new (makeClass({ action: 'x', failSilently: true }))(ctx);

      // Method result should come back even though audit write failed
      await expect(svc.action()).resolves.toEqual({ id: 'res-42', status: 'ok' });
    });

    it('propagates audit write failures when failSilently=false', async () => {
      const failingService = { logAuditEvent: jest.fn().mockRejectedValue(new Error('DB down')) };
      const ctx = makeContext({ auditService: failingService });
      const svc = new (makeClass({ action: 'x', failSilently: false }))(ctx);

      await expect(svc.action()).rejects.toThrow('DB down');
    });
  });
});
