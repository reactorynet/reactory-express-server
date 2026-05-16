import RateLimiterService from '../RateLimiterService';
import { Repository } from 'typeorm';
import RateLimitModel from '../../models/RateLimit';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

const mockRedisService = {
  incr: jest.fn(),
  expire: jest.fn(),
};

// QueryBuilder returned by createQueryBuilder().update().set().where()
const makeUpdateQb = (affected: number, raw: object[] = []) => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected, raw }),
});

const mockRepository = {
  createQueryBuilder: jest.fn(),
  upsert: jest.fn(),
} as unknown as Repository<RateLimitModel>;

jest.mock('../../models', () => ({
  PostgresDataSource: {
    getRepository: jest.fn(() => mockRepository),
  },
}));

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
} as any;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeService(): RateLimiterService {
  const svc = new RateLimiterService({}, mockContext);
  svc.setRedisService(mockRedisService as any);
  return svc;
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  // ---- Redis path ------------------------------------------------

  describe('Redis path (primary)', () => {
    it('allows first request and sets TTL', async () => {
      mockRedisService.incr.mockResolvedValue(1);
      mockRedisService.expire.mockResolvedValue(true);

      const result = await service.checkLimit('ip:1.2.3.4', 5, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetIn).toBe(60);
      expect(mockRedisService.expire).toHaveBeenCalledWith('ratelimit:ip:1.2.3.4', 60);
    });

    it('only sets TTL on the very first increment (count === 1)', async () => {
      mockRedisService.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      await service.checkLimit('k', 5, 60);
      await service.checkLimit('k', 5, 60);

      expect(mockRedisService.expire).toHaveBeenCalledTimes(1);
    });

    it('allows requests up to the limit', async () => {
      mockRedisService.incr.mockResolvedValue(5);

      const result = await service.checkLimit('k', 5, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('blocks requests that exceed the limit', async () => {
      mockRedisService.incr.mockResolvedValue(6);

      const result = await service.checkLimit('k', 5, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // ---- DB fallback path (Redis unavailable) ----------------------

  describe('DB fallback path (Redis unavailable)', () => {
    beforeEach(() => {
      mockRedisService.incr.mockRejectedValue(new Error('Redis down'));
    });

    describe('active window exists in DB', () => {
      it('allows request when count is within limit', async () => {
        const qb = makeUpdateQb(1, [{ count: 3, windowEnd: Date.now() + 30000, maxAttempts: 5 }]);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

        const result = await service.checkLimit('k', 5, 60);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
        expect(qb.set).toHaveBeenCalledWith({ count: expect.any(Function) });
      });

      it('blocks request when post-increment count exceeds maxAttempts', async () => {
        const now = Date.now();
        const qb = makeUpdateQb(1, [{ count: 6, windowEnd: now + 30000, maxAttempts: 5 }]);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

        const result = await service.checkLimit('k', 5, 60);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetIn).toBeGreaterThan(0);
      });

      it('uses max param as fallback when maxAttempts is 0', async () => {
        const qb = makeUpdateQb(1, [{ count: 3, windowEnd: Date.now() + 30000, maxAttempts: 0 }]);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

        const result = await service.checkLimit('k', 5, 60);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
      });

      it('does NOT call upsert when an active window was incremented', async () => {
        const qb = makeUpdateQb(1, [{ count: 2, windowEnd: Date.now() + 30000, maxAttempts: 5 }]);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

        await service.checkLimit('k', 5, 60);

        expect(mockRepository.upsert).not.toHaveBeenCalled();
      });
    });

    describe('no active window (expired or first-ever request)', () => {
      it('upserts a fresh window and allows the request', async () => {
        const qb = makeUpdateQb(0); // 0 rows updated → no active window
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
        (mockRepository.upsert as jest.Mock).mockResolvedValue({ identifiers: [] });

        const result = await service.checkLimit('k', 5, 60, 'ip', '10.0.0.1');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
        expect(result.resetIn).toBe(60);
        expect(mockRepository.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'k',
            count: 1,
            maxAttempts: 5,
            identifierType: 'ip',
            identifier: '10.0.0.1',
          }),
          { conflictPaths: ['key'], skipUpdateIfNoValuesChanged: false },
        );
      });

      it('passes identifierType and identifier through to upsert', async () => {
        const qb = makeUpdateQb(0);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
        (mockRepository.upsert as jest.Mock).mockResolvedValue({ identifiers: [] });

        await service.checkLimit('login', 3, 60, 'user', 'user-abc');

        expect(mockRepository.upsert).toHaveBeenCalledWith(
          expect.objectContaining({ identifierType: 'user', identifier: 'user-abc' }),
          expect.any(Object),
        );
      });

      it('uses correct windowEnd based on windowSeconds', async () => {
        const before = Date.now();
        const qb = makeUpdateQb(0);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
        (mockRepository.upsert as jest.Mock).mockResolvedValue({ identifiers: [] });

        await service.checkLimit('k', 5, 120);

        const call = (mockRepository.upsert as jest.Mock).mock.calls[0][0];
        expect(call.windowEnd).toBeGreaterThanOrEqual(before + 120_000);
        expect(call.windowEnd).toBeLessThanOrEqual(Date.now() + 120_000);
      });
    });

    describe('concurrent upsert safety', () => {
      it('does not throw when upsert resolves normally', async () => {
        const qb = makeUpdateQb(0);
        (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
        (mockRepository.upsert as jest.Mock).mockResolvedValue({ identifiers: [] });

        // Two concurrent calls — both should resolve without throwing
        await expect(
          Promise.all([
            service.checkLimit('shared-key', 5, 60),
            service.checkLimit('shared-key', 5, 60),
          ])
        ).resolves.toBeDefined();
      });
    });
  });

  // ---- Lifecycle -------------------------------------------------

  describe('service lifecycle', () => {
    it('onStartup logs without throwing', async () => {
      await expect(service.onStartup()).resolves.toBeUndefined();
      expect(mockContext.log).toHaveBeenCalled();
    });

    it('getExecutionContext returns the context', () => {
      expect(service.getExecutionContext()).toBe(mockContext);
    });

    it('setExecutionContext updates context and returns true', () => {
      const newCtx = { log: jest.fn() } as any;
      expect(service.setExecutionContext(newCtx)).toBe(true);
      expect(service.getExecutionContext()).toBe(newCtx);
    });
  });
});
