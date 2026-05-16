import { rateLimit } from '../rateLimit';

// ─── Shared mocks ────────────────────────────────────────────────────────────

const makeContext = (overrides: Partial<{
  userId: string;
  ip: string;
  limiter: object;
}> = {}): any => {
  const limiter = overrides.limiter ?? {
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 4, resetIn: 60 }),
  };
  return {
    user: { _id: overrides.userId ?? 'user-123' },
    req: { ip: overrides.ip ?? '10.0.0.1' },
    getService: jest.fn((id: string) => {
      if (id === 'core.RateLimiterService@1.0.0') return limiter;
      return null;
    }),
    _limiter: limiter, // expose for assertions
  };
};

// ─── Test class factory ──────────────────────────────────────────────────────

function makeClass(decoratorOptions: Parameters<typeof rateLimit>[0]) {
  class Service {
    context: any;
    called = false;

    constructor(ctx: any) { this.context = ctx; }

    @rateLimit(decoratorOptions)
    async action(..._args: any[]) {
      this.called = true;
      return 'ok';
    }
  }
  return Service;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('@rateLimit decorator', () => {
  // ── Allowed path ───────────────────────────────────────────────────────────

  describe('when within limit', () => {
    it('calls the original method and returns its result', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'test', max: 5 }))(ctx);

      const result = await svc.action('arg0');

      expect(result).toBe('ok');
      expect(svc.called).toBe(true);
    });

    it('calls checkLimit with the resolved key', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'auth:login', max: 5, keySource: 'ip' }))(ctx);

      await svc.action();

      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(
        'auth:login:ip:10.0.0.1', 5, 60, 'ip', '10.0.0.1'
      );
    });
  });

  // ── Key sources ────────────────────────────────────────────────────────────

  describe('key sources', () => {
    it('static: uses base key without modification', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'fixed-key', max: 5, keySource: 'static' }))(ctx);
      await svc.action();
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith('fixed-key', 5, 60, 'static', 'fixed-key');
    });

    it('user: appends user._id to key', async () => {
      const ctx = makeContext({ userId: 'u-abc' });
      const svc = new (makeClass({ key: 'api', max: 10, keySource: 'user' }))(ctx);
      await svc.action();
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith('api:user:u-abc', 10, 60, 'user', 'u-abc');
    });

    it('ip: appends req.ip to key', async () => {
      const ctx = makeContext({ ip: '192.168.1.1' });
      const svc = new (makeClass({ key: 'login', max: 3, keySource: 'ip' }))(ctx);
      await svc.action();
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith('login:ip:192.168.1.1', 3, 60, 'ip', '192.168.1.1');
    });

    it('param: uses specified argument by index', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'upload', max: 5, keySource: 'param', keyParam: '0' }))(ctx);
      await svc.action('bucket-name');
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(
        'upload:param:bucket-name', 5, 60, 'param', 'bucket-name'
      );
    });

    it('param: supports nested path e.g. "1.userId"', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'op', max: 5, keySource: 'param', keyParam: '1.userId' }))(ctx);
      await svc.action('first', { userId: 'nested-id' });
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(
        'op:param:nested-id', 5, 60, 'param', 'nested-id'
      );
    });

    it('custom: calls keyFn and uses its return value as the full key', async () => {
      const ctx = makeContext();
      const keyFn = jest.fn().mockReturnValue('my:custom:key');
      const svc = new (makeClass({ key: 'ignored', max: 2, keySource: 'custom', keyFn }))(ctx);
      await svc.action('a', 'b');
      expect(keyFn).toHaveBeenCalledWith(['a', 'b'], expect.any(Object));
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith('my:custom:key', 2, 60, 'custom', 'my:custom:key');
    });

    it('custom: throws when keyFn is missing', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'x', max: 1, keySource: 'custom' }))(ctx);
      await expect(svc.action()).rejects.toThrow('keyFn');
    });
  });

  // ── Key template interpolation ─────────────────────────────────────────────

  describe('key template interpolation', () => {
    it('replaces ${0} with the first argument', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'ns:${0}', max: 5, keySource: 'static' }))(ctx);
      await svc.action('widgets');
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(
        expect.stringContaining('ns:widgets'), 5, 60, 'static', expect.any(String)
      );
    });

    it('replaces nested ${0.id}', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'res:${0.id}', max: 5, keySource: 'static' }))(ctx);
      await svc.action({ id: 'obj-42' });
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(
        expect.stringContaining('res:obj-42'), 5, 60, 'static', expect.any(String)
      );
    });
  });

  // ── Rate limit exceeded ────────────────────────────────────────────────────

  describe('when rate limit is exceeded', () => {
    it('throws an error with RATE_LIMIT_EXCEEDED code', async () => {
      const limiter = {
        checkLimit: jest.fn().mockResolvedValue({ allowed: false, remaining: 0, resetIn: 45 }),
      };
      const ctx = makeContext({ limiter });
      const svc = new (makeClass({ key: 'k', max: 5 }))(ctx);

      await expect(svc.action()).rejects.toMatchObject({
        extensions: { status: 'RATE_LIMIT_EXCEEDED', responseCode: 429, resetIn: 45 },
      });
      expect(svc.called).toBe(false);
    });

    it('throws default message when none configured', async () => {
      const limiter = {
        checkLimit: jest.fn().mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30 }),
      };
      const ctx = makeContext({ limiter });
      const svc = new (makeClass({ key: 'k', max: 3 }))(ctx);

      await expect(svc.action()).rejects.toThrow('Rate limit exceeded');
    });

    it('throws custom string message', async () => {
      const limiter = {
        checkLimit: jest.fn().mockResolvedValue({ allowed: false, remaining: 0, resetIn: 10 }),
      };
      const ctx = makeContext({ limiter });
      const svc = new (makeClass({ key: 'k', max: 3, errorMessage: 'Slow down!' }))(ctx);

      await expect(svc.action()).rejects.toThrow('Slow down!');
    });

    it('calls errorMessage factory with remaining/resetIn', async () => {
      const limiter = {
        checkLimit: jest.fn().mockResolvedValue({ allowed: false, remaining: 0, resetIn: 20 }),
      };
      const ctx = makeContext({ limiter });
      const factory = jest.fn().mockReturnValue('Custom dynamic message');
      const svc = new (makeClass({ key: 'k', max: 3, errorMessage: factory }))(ctx);

      await expect(svc.action()).rejects.toThrow('Custom dynamic message');
      expect(factory).toHaveBeenCalledWith(0, 20);
    });
  });

  // ── Soft-fail mode ─────────────────────────────────────────────────────────

  describe('softFail mode', () => {
    it('returns null instead of throwing when limit is breached', async () => {
      const limiter = {
        checkLimit: jest.fn().mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30 }),
      };
      const ctx = makeContext({ limiter });
      const svc = new (makeClass({ key: 'k', max: 5, softFail: true }))(ctx);

      const result = await svc.action();

      expect(result).toBeNull();
      expect(svc.called).toBe(false);
    });
  });

  // ── contextSource: params ──────────────────────────────────────────────────

  describe('contextSource: params', () => {
    it('locates context in method arguments', async () => {
      class Resolver {
        @rateLimit({ key: 'gql', max: 100, contextSource: 'params', keySource: 'user' })
        async resolve(_parent: any, _args: any, context: any) {
          return 'resolved';
        }
      }

      const ctx = makeContext();
      const resolver = new Resolver();
      const result = await resolver.resolve(null, {}, ctx);

      expect(result).toBe('resolved');
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(
        expect.stringContaining('user-123'), 100, 60, 'user', 'user-123'
      );
    });
  });

  // ── Fail-open behaviour ────────────────────────────────────────────────────

  describe('fail-open behaviour (service unavailable)', () => {
    it('executes the method when no context is found', async () => {
      class Service {
        // no this.context
        @rateLimit({ key: 'k', max: 5 })
        async action() { return 'ok'; }
      }

      const result = await new Service().action();
      expect(result).toBe('ok');
    });

    it('executes the method when RateLimiterService is not registered', async () => {
      const ctx = { user: {}, req: {}, getService: jest.fn().mockReturnValue(null) };
      class Service {
        context = ctx;
        @rateLimit({ key: 'k', max: 5 })
        async action() { return 'ok'; }
      }

      const result = await new Service().action();
      expect(result).toBe('ok');
    });

    it('executes the method when getService throws', async () => {
      const ctx = {
        user: {}, req: {},
        getService: jest.fn().mockImplementation(() => { throw new Error('DI error'); }),
      };
      class Service {
        context = ctx;
        @rateLimit({ key: 'k', max: 5 })
        async action() { return 'ok'; }
      }

      const result = await new Service().action();
      expect(result).toBe('ok');
    });

    it('executes the method when checkLimit throws', async () => {
      const limiter = {
        checkLimit: jest.fn().mockRejectedValue(new Error('DB exploded')),
      };
      const ctx = makeContext({ limiter });
      const svc = new (makeClass({ key: 'k', max: 5 }))(ctx);

      const result = await svc.action();
      expect(result).toBe('ok');
    });
  });

  // ── windowSeconds ──────────────────────────────────────────────────────────

  describe('windowSeconds', () => {
    it('defaults to 60 when not specified', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'k', max: 10 }))(ctx);
      await svc.action();
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(expect.any(String), 10, 60, expect.any(String), expect.any(String));
    });

    it('forwards custom windowSeconds to checkLimit', async () => {
      const ctx = makeContext();
      const svc = new (makeClass({ key: 'k', max: 10, windowSeconds: 300 }))(ctx);
      await svc.action();
      expect(ctx._limiter.checkLimit).toHaveBeenCalledWith(expect.any(String), 10, 300, expect.any(String), expect.any(String));
    });
  });
});
