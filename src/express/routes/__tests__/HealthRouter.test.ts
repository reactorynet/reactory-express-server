import request from 'supertest';
import express from 'express';
import HealthRouter, { performHealthCheck } from '../HealthRouter';

// Mock logger to avoid console noise
jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

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
    expect(redisService.set).toHaveBeenCalled();
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
    expect(res.status).toBe(503);
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
    expect(res.status).toBe(503);
    expect(res.body.services[0].healthy).toBe(false);
    expect(res.body.services[0].message).toBe('boom');
  });

  it('returns 503 degraded on unexpected error during check', async () => {
    const context = createMockContext({
      redisService: { get: jest.fn().mockRejectedValue(new Error('redis fail')) },
      servicesList: [],
    });
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
