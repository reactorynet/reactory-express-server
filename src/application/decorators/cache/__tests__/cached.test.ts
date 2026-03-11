import { cached } from '../cached';

// Silence logger output during tests
jest.mock('@reactory/server-core/logging', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

describe('@cached decorator', () => {
  let redisMock: any;
  let mockContext: any;

  beforeEach(() => {
    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockContext = {
      getService: jest.fn().mockReturnValue(redisMock),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── cache hit ──────────────────────────────────────────────────
  it('should return cached value and skip method execution on cache hit', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify({ id: 1, name: 'cached' }));
    const spy = jest.fn().mockResolvedValue({ id: 1, name: 'fresh' });

    class TestService {
      context = mockContext;

      @cached('item:${0}')
      async getItem(id: string) {
        return spy(id);
      }
    }

    const svc = new TestService();
    const result = await svc.getItem('abc');

    expect(result).toEqual({ id: 1, name: 'cached' });
    expect(spy).not.toHaveBeenCalled();
    expect(redisMock.get).toHaveBeenCalledWith('item:abc');
  });

  // ── cache miss ─────────────────────────────────────────────────
  it('should execute method and cache result on cache miss', async () => {
    const spy = jest.fn().mockResolvedValue({ id: 2, name: 'fresh' });

    class TestService {
      context = mockContext;

      @cached('item:${0}')
      async getItem(id: string) {
        return spy(id);
      }
    }

    const svc = new TestService();
    const result = await svc.getItem('xyz');

    expect(spy).toHaveBeenCalledWith('xyz');
    expect(result).toEqual({ id: 2, name: 'fresh' });
    expect(redisMock.set).toHaveBeenCalledWith(
      'item:xyz',
      JSON.stringify({ id: 2, name: 'fresh' }),
      undefined
    );
  });

  // ── TTL ────────────────────────────────────────────────────────
  it('should pass ttl to redis set when specified', async () => {
    const spy = jest.fn().mockResolvedValue('data');

    class TestService {
      context = mockContext;

      @cached('key', { ttl: 300 })
      async getData() {
        return spy();
      }
    }

    const svc = new TestService();
    await svc.getData();

    expect(redisMock.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify('data'),
      300
    );
  });

  // ── template key with positional args ──────────────────────────
  it('should resolve positional template placeholders', async () => {
    class TestService {
      context = mockContext;

      @cached('model:${0}:${1}:${2}')
      async getModel(ns: string, name: string, version: string) {
        return { ns, name, version };
      }
    }

    const svc = new TestService();
    await svc.getModel('core', 'User', '1.0.0');

    expect(redisMock.get).toHaveBeenCalledWith('model:core:User:1.0.0');
  });

  // ── nested property access ─────────────────────────────────────
  it('should resolve nested property placeholders', async () => {
    class TestService {
      context = mockContext;

      @cached('user:${0.id}:${0.role}')
      async getUser(spec: { id: string; role: string }) {
        return spec;
      }
    }

    const svc = new TestService();
    await svc.getUser({ id: '42', role: 'admin' });

    expect(redisMock.get).toHaveBeenCalledWith('user:42:admin');
  });

  // ── no context → fallthrough ───────────────────────────────────
  it('should execute method without cache when context is missing', async () => {
    const spy = jest.fn().mockResolvedValue('ok');

    class TestService {
      @cached('key')
      async doWork() {
        return spy();
      }
    }

    const svc = new TestService();
    const result = await svc.doWork();

    expect(result).toBe('ok');
    expect(spy).toHaveBeenCalled();
    expect(redisMock.get).not.toHaveBeenCalled();
  });

  // ── RedisService unavailable → fallthrough ─────────────────────
  it('should execute method without cache when RedisService is unavailable', async () => {
    mockContext.getService.mockImplementation(() => {
      throw new Error('Service not found');
    });
    const spy = jest.fn().mockResolvedValue('ok');

    class TestService {
      context = mockContext;

      @cached('key')
      async doWork() {
        return spy();
      }
    }

    const svc = new TestService();
    const result = await svc.doWork();

    expect(result).toBe('ok');
    expect(spy).toHaveBeenCalled();
  });

  // ── cache read failure → fallthrough ───────────────────────────
  it('should execute method when cache read throws', async () => {
    redisMock.get.mockRejectedValue(new Error('connection lost'));
    const spy = jest.fn().mockResolvedValue('recovered');

    class TestService {
      context = mockContext;

      @cached('key')
      async doWork() {
        return spy();
      }
    }

    const svc = new TestService();
    const result = await svc.doWork();

    expect(result).toBe('recovered');
    expect(spy).toHaveBeenCalled();
  });

  // ── cache write failure → still returns result ─────────────────
  it('should return method result even when cache write fails', async () => {
    redisMock.set.mockRejectedValue(new Error('write error'));
    const spy = jest.fn().mockResolvedValue('good');

    class TestService {
      context = mockContext;

      @cached('key')
      async doWork() {
        return spy();
      }
    }

    const svc = new TestService();
    const result = await svc.doWork();

    expect(result).toBe('good');
  });

  // ── contextSource: 'params' ────────────────────────────────────
  it('should find context from method params when contextSource is params', async () => {
    const spy = jest.fn().mockResolvedValue('resolved');

    class TestResolver {
      @cached('resolver:${1.id}', { contextSource: 'params' })
      async resolve(parent: any, params: any, context: any) {
        return spy();
      }
    }

    const resolver = new TestResolver();
    const result = await resolver.resolve(
      {},
      { id: 'p1' },
      mockContext
    );

    expect(result).toBe('resolved');
    expect(redisMock.get).toHaveBeenCalledWith('resolver:p1');
  });

  // ── custom serialise / deserialise ─────────────────────────────
  it('should use custom serialise and deserialise functions', async () => {
    redisMock.get.mockResolvedValue('42');

    const customSerialise = (v: number) => String(v);
    const customDeserialise = (s: string) => parseInt(s, 10);

    class TestService {
      context = mockContext;

      @cached('counter', {
        serialise: customSerialise,
        deserialise: customDeserialise,
      })
      async getCount() {
        return 99;
      }
    }

    const svc = new TestService();
    const result = await svc.getCount();

    expect(result).toBe(42);
  });

  // ── static key (no placeholders) ───────────────────────────────
  it('should work with static keys without placeholders', async () => {
    const spy = jest.fn().mockResolvedValue({ config: true });

    class TestService {
      context = mockContext;

      @cached('app:config', { ttl: 600 })
      async getConfig() {
        return spy();
      }
    }

    const svc = new TestService();
    await svc.getConfig();

    expect(redisMock.get).toHaveBeenCalledWith('app:config');
    expect(redisMock.set).toHaveBeenCalledWith(
      'app:config',
      JSON.stringify({ config: true }),
      600
    );
  });

  // ── method error propagation ───────────────────────────────────
  it('should propagate errors from the original method', async () => {
    class TestService {
      context = mockContext;

      @cached('key')
      async doWork() {
        throw new Error('method failed');
      }
    }

    const svc = new TestService();
    await expect(svc.doWork()).rejects.toThrow('method failed');
    expect(redisMock.set).not.toHaveBeenCalled();
  });
});
