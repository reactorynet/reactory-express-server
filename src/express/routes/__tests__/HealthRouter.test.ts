import request from 'supertest';
import express from 'express';
import HealthRouter, { performHealthCheck } from '../HealthRouter';

// Mock logger to avoid console noise
jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mongoose is required lazily inside the mongo readiness probe, so the factory
// runs at probe time rather than import time. Named with a `mock` prefix to
// satisfy jest's out-of-scope variable rule.
const mockMongoose = { connection: { readyState: 1 } };
jest.mock('mongoose', () => mockMongoose);

// Helper to create a mock context
const createMockContext = (overrides: any = {}) => {
  const servicesList = overrides.servicesList ?? [];
  const serviceInstances: any = overrides.serviceInstances ?? {};

  return {
    getService: jest.fn((fqn: string) => {
      if (fqn === 'core.RedisService@1.0.0') {
        return overrides.redisService ?? null;
      }
      return serviceInstances[fqn] ?? null;
    }),
    listServices: jest.fn(() => servicesList),
    ...overrides.extra,
  };
};

describe('HealthRouter', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', HealthRouter);
    jest.clearAllMocks();
    delete (global as any).REACTORY_SYSTEM_CONTEXT;
  });

  afterEach(() => {
    delete (global as any).REACTORY_SYSTEM_CONTEXT;
  });

  it('returns 503 starting when no system context is available', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'starting', message: 'System context not ready' });
  });

  it('returns cached health status when available', async () => {
    const cachedHealth = {
      status: 'healthy',
      services: [],
      timestamp: new Date().toISOString(),
    };
    const redisService = {
      get: jest.fn().mockResolvedValue(JSON.stringify(cachedHealth)),
      set: jest.fn(),
    };
    (global as any).REACTORY_SYSTEM_CONTEXT = createMockContext({ redisService });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(cachedHealth);
    expect(redisService.get).toHaveBeenCalledWith('system:health:status');
  });

  it('performs fresh check and caches when cache miss', async () => {
    const redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const mockService = {
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, message: 'OK' }),
    };
    const context = createMockContext({
      redisService,
      servicesList: [{ id: 'core.Test@1.0.0', name: 'Test' }],
      serviceInstances: { 'core.Test@1.0.0': mockService },
    });
    (global as any).REACTORY_SYSTEM_CONTEXT = context;

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services).toHaveLength(1);
    expect(res.body.services[0].healthy).toBe(true);
    // Assert the arguments, not merely that a call happened: the original bug
    // here was `set(key, value, 'EX', 30)`, which passed this test because the
    // 'EX' landed in the ttl slot and only Redis noticed.
    expect(redisService.set).toHaveBeenCalledTimes(1);
    const [cacheKeyArg, payloadArg, ttlArg] = redisService.set.mock.calls[0];
    expect(cacheKeyArg).toBe('system:health:status');
    expect(ttlArg).toBe(30);
    expect(JSON.parse(payloadArg)).toMatchObject({ status: 'healthy' });
  });
  it('marks service as degraded when healthCheck returns false', async () => {
    const redisService = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const badService = {
      healthCheck: jest.fn().mockResolvedValue({ healthy: false, message: 'Down' }),
    };
    const context = createMockContext({
      redisService,
      servicesList: [{ id: 'core.Bad@1.0.0' }],
      serviceInstances: { 'core.Bad@1.0.0': badService },
    });
    (global as any).REACTORY_SYSTEM_CONTEXT = context;

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services[0].healthy).toBe(false);
  });

  it('assumes healthy when no healthCheck method', async () => {
    const redisService = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const plainService = {}; // no healthCheck
    const context = createMockContext({
      redisService,
      servicesList: [{ id: 'core.Plain@1.0.0', name: 'Plain' }],
      serviceInstances: { 'core.Plain@1.0.0': plainService },
    });
    (global as any).REACTORY_SYSTEM_CONTEXT = context;

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.services[0].message).toContain('Assumed healthy');
  });

  it('handles healthCheck throwing error', async () => {
    const redisService = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const throwingService = {
      healthCheck: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const context = createMockContext({
      redisService,
      servicesList: [{ id: 'core.Throw@1.0.0' }],
      serviceInstances: { 'core.Throw@1.0.0': throwingService },
    });
    (global as any).REACTORY_SYSTEM_CONTEXT = context;

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.services[0].healthy).toBe(false);
    expect(res.body.services[0].message).toBe('boom');
  });

  it('returns 503 degraded on unexpected error during check', async () => {
    const context = createMockContext({
      servicesList: [],
    });
    context.listServices = jest.fn(() => { throw new Error('critical failure'); });
    (global as any).REACTORY_SYSTEM_CONTEXT = context;

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
  });

  it('still succeeds if caching set fails', async () => {
    const redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockRejectedValue(new Error('cache set fail')),
    };
    const context = createMockContext({ redisService, servicesList: [] });
    (global as any).REACTORY_SYSTEM_CONTEXT = context;

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('performHealthCheck (direct)', () => {
  it('returns healthy for empty service list', async () => {
    const ctx: any = {
      getService: jest.fn().mockReturnValue(null),
      listServices: jest.fn().mockReturnValue([]),
    };
    const result = await performHealthCheck(ctx);
    expect(result.status).toBe('healthy');
    expect(result.services).toHaveLength(0);
  });

  it('uses cache when present', async () => {
    const cached = { status: 'healthy', services: [], timestamp: 'now' };
    const ctx: any = {
      getService: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(JSON.stringify(cached)) }),
      listServices: jest.fn(),
    };
    const result = await performHealthCheck(ctx);
    expect(result).toEqual(cached);
  });
});

describe('performHealthCheck (cost controls)', () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const buildContext = (specs: Array<{ id: string; healthCheck: () => Promise<any> }>) => ({
    getService: jest.fn((fqn: string) => specs.find((s) => s.id === fqn) ?? null),
    listServices: jest.fn(() => specs.map((s) => ({ id: s.id, name: s.id }))),
  });

  afterEach(() => {
    delete process.env.HEALTH_CHECK_TIMEOUT_MS;
  });

  it('runs service checks concurrently rather than one after another', async () => {
    // Ten checks of 100ms each. Sequential evaluation needs >= 1000ms; concurrent
    // evaluation needs ~100ms. The bound below is deliberately loose so it does
    // not flake on a loaded machine, while still failing if the loop regresses.
    const specs = Array.from({ length: 10 }, (_, i) => ({
      id: `core.Slow${i}@1.0.0`,
      healthCheck: async () => {
        await delay(100);
        return { healthy: true };
      },
    }));

    const started = Date.now();
    const result = await performHealthCheck(buildContext(specs) as any);
    const elapsed = Date.now() - started;

    expect(result.services).toHaveLength(10);
    expect(result.status).toBe('healthy');
    expect(elapsed).toBeLessThan(600);
  });

  it('bounds a hung check instead of hanging the endpoint', async () => {
    // A dependency whose client waits 30s (the compute adapter) must not be able
    // to hold the probe open past the kubelet's 5s timeout.
    process.env.HEALTH_CHECK_TIMEOUT_MS = '100';

    const ctx = buildContext([
      {
        id: 'core.Hung@1.0.0',
        healthCheck: () => new Promise(() => { /* never settles */ }),
      },
    ]);

    const started = Date.now();
    const result = await performHealthCheck(ctx as any);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(1000);
    expect(result.services[0].healthy).toBe(false);
    expect(result.services[0].message).toMatch(/exceeded 100ms budget/);
    expect(result.status).toBe('degraded');
  });

  it('still reports healthy services when one is hung', async () => {
    process.env.HEALTH_CHECK_TIMEOUT_MS = '100';

    const ctx = buildContext([
      { id: 'core.Hung@1.0.0', healthCheck: () => new Promise(() => { /* never settles */ }) },
      { id: 'core.Fine@1.0.0', healthCheck: async () => ({ healthy: true, message: 'OK' }) },
    ]);

    const result = await performHealthCheck(ctx as any);

    const byId = Object.fromEntries(result.services.map((s) => [s.id, s]));
    expect(byId['core.Hung@1.0.0'].healthy).toBe(false);
    expect(byId['core.Fine@1.0.0'].healthy).toBe(true);
  });

  it('reports how long the sweep took', async () => {
    const ctx = buildContext([
      { id: 'core.Fast@1.0.0', healthCheck: async () => ({ healthy: true }) },
    ]);

    const result = await performHealthCheck(ctx as any);

    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('probe endpoints', () => {
  let app: express.Application;

  const readyContext = (overrides: any = {}) =>
    createMockContext({
      redisService: { healthCheck: jest.fn().mockResolvedValue(true) },
      ...overrides,
    });

  const setContext = (ctx: any) => { (global as any).REACTORY_SYSTEM_CONTEXT = ctx; };

  beforeEach(() => {
    app = express();
    app.use('/health', HealthRouter);
    mockMongoose.connection.readyState = 1;
    process.env.HEALTH_READY_DEPENDENCIES = 'mongo,redis';
    delete (global as any).REACTORY_SYSTEM_CONTEXT;
  });

  afterEach(() => {
    delete (global as any).REACTORY_SYSTEM_CONTEXT;
    delete process.env.HEALTH_READY_DEPENDENCIES;
    delete process.env.HEALTH_READY_TIMEOUT_MS;
  });

  it('answers liveness with no system context at all', async () => {
    // Liveness must not need the context — a half-initialised process is still
    // alive, and it must never be restarted for a dependency it cannot reach.
    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  it('is ready when every dependency answers', async () => {
    setContext(readyContext());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.map((c: any) => c.name).sort()).toEqual(['mongo', 'redis']);
    expect(res.body.checks.every((c: any) => c.ok)).toBe(true);
  });

  it('is not ready when mongo is disconnected', async () => {
    mockMongoose.connection.readyState = 0;
    setContext(readyContext());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not ready');
    const mongo = res.body.checks.find((c: any) => c.name === 'mongo');
    expect(mongo.ok).toBe(false);
    expect(mongo.message).toBe('disconnected');
    // The healthy dependency is still reported as healthy.
    expect(res.body.checks.find((c: any) => c.name === 'redis').ok).toBe(true);
  });

  it('is not ready when mongo is still connecting', async () => {
    mockMongoose.connection.readyState = 2;
    setContext(readyContext());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.checks.find((c: any) => c.name === 'mongo').message).toBe('connecting');
  });

  it('is not ready when redis ping fails', async () => {
    setContext(createMockContext({
      redisService: { healthCheck: jest.fn().mockResolvedValue(false) },
    }));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    const redis = res.body.checks.find((c: any) => c.name === 'redis');
    expect(redis.ok).toBe(false);
    expect(redis.message).toBe('PING failed');
  });

  it('gates on postgres once the deployment configures it', async () => {
    process.env.HEALTH_READY_DEPENDENCIES = 'mongo,redis,postgres';
    const query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
    setContext(readyContext({
      serviceInstances: { 'core.ReactorySQLService@1.0.0': { query } },
    }));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledWith({ engine: 'postgres', sql: 'SELECT 1' });
  });

  it('is not ready when postgres is configured but unreachable', async () => {
    process.env.HEALTH_READY_DEPENDENCIES = 'mongo,redis,postgres';
    setContext(readyContext({
      serviceInstances: {
        'core.ReactorySQLService@1.0.0': { query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) },
      },
    }));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.checks.find((c: any) => c.name === 'postgres').message).toBe('ECONNREFUSED');
  });

  it('skips a dependency this deployment does not have', async () => {
    // No SQL service registered. A backend this tier does not use must not be
    // able to hold the pod out of rotation.
    process.env.HEALTH_READY_DEPENDENCIES = 'mongo,redis,postgres';
    setContext(readyContext());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    const postgres = res.body.checks.find((c: any) => c.name === 'postgres');
    expect(postgres.skipped).toBe(true);
    expect(postgres.ok).toBe(false);
  });

  it('does not gate on an unrecognised dependency name', async () => {
    process.env.HEALTH_READY_DEPENDENCIES = 'mongo,nonsense';
    setContext(readyContext());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.checks.find((c: any) => c.name === 'nonsense').skipped).toBe(true);
  });

  it('treats an empty dependency list as no dependency gating', async () => {
    process.env.HEALTH_READY_DEPENDENCIES = '';
    mockMongoose.connection.readyState = 0;
    setContext(readyContext());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.checks).toHaveLength(0);
  });

  it('bounds a hanging dependency probe', async () => {
    process.env.HEALTH_READY_TIMEOUT_MS = '100';
    setContext(createMockContext({
      redisService: { healthCheck: () => new Promise(() => { /* never settles */ }) },
    }));

    const started = Date.now();
    const res = await request(app).get('/health/ready');
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(1500);
    expect(res.status).toBe(503);
    expect(res.body.checks.find((c: any) => c.name === 'redis').message).toMatch(/exceeded 100ms budget/);
    expect(typeof res.body.durationMs).toBe('number');
  });

  it('is not ready when the system context is absent', async () => {
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not ready');
  });
});