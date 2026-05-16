import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { Repository } from 'typeorm';
import RateLimitModel from '../models/RateLimit';
import { PostgresDataSource } from '../models';
import RedisService from './RedisService';

@service({
  id: 'core.RateLimiterService@1.0.0',
  nameSpace: 'core',
  name: 'RateLimiterService',
  version: '1.0.0',
  description: 'Distributed rate limiter using Redis and TypeORM',
  serviceType: 'security',
  lifeCycle: 'singleton',
  dependencies: ['core.RedisService@1.0.0'],
})
export class RateLimiterService implements Reactory.Service.IReactoryDefaultService {
  name = 'RateLimiterService';
  nameSpace = 'core';
  version = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  private repository: Repository<RateLimitModel>;
  private redis: RedisService;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.repository = PostgresDataSource.getRepository(RateLimitModel);
  }

  setRedisService(redis: RedisService) {
    this.redis = redis;
  }

  async onStartup(): Promise<void> {
    this.context.log('RateLimiterService STARTUP OKAY', {}, 'info', 'core.RateLimiterService');
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  async checkLimit(
    key: string,
    max: number,
    windowSeconds: number,
    identifierType = 'ip',
    identifier = '',
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const now = Date.now();
    const redisKey = `ratelimit:${key}`;

    // --- Redis path (primary) ---
    try {
      const current = await this.redis.incr(redisKey);
      if (current === 1) {
        await this.redis.expire(redisKey, windowSeconds);
      }
      if (current > max) {
        return { allowed: false, remaining: 0, resetIn: windowSeconds };
      }
      return { allowed: true, remaining: Math.max(0, max - current), resetIn: windowSeconds };
    } catch (_redisErr) {
      // Redis unavailable — fall through to the DB path.
    }

    // --- DB fallback path (race-safe) ---
    const windowEnd = now + windowSeconds * 1000;

    // Atomically increment the counter for an active window.
    // Returns 0 rows affected when no active window exists yet.
    const increment = await this.repository
      .createQueryBuilder()
      .update(RateLimitModel)
      .set({ count: () => 'count + 1' })
      .where('"key" = :key AND "windowEnd" > :now', { key, now })
      .returning(['"count"', '"windowEnd"', '"maxAttempts"'])
      .execute();

    if (increment.affected && increment.affected > 0) {
      // A row existed and was incremented atomically.
      const row = increment.raw[0] as { count: number; windowEnd: number; maxAttempts: number };
      if (row.count > (row.maxAttempts || max)) {
        return {
          allowed: false,
          remaining: 0,
          resetIn: Math.ceil((row.windowEnd - now) / 1000),
        };
      }
      return {
        allowed: true,
        remaining: Math.max(0, (row.maxAttempts || max) - row.count),
        resetIn: Math.ceil((row.windowEnd - now) / 1000),
      };
    }

    // No active window — upsert a fresh window.
    // ON CONFLICT (key) DO UPDATE resets the window atomically, preventing
    // two concurrent pods from both inserting and hitting a unique-key violation.
    await this.repository.upsert(
      {
        key,
        count: 1,
        windowStart: now,
        windowEnd,
        maxAttempts: max,
        identifierType,
        identifier,
      },
      {
        conflictPaths: ['key'],
        skipUpdateIfNoValuesChanged: false,
      },
    );

    return { allowed: true, remaining: max - 1, resetIn: windowSeconds };
  }
}

export default RateLimiterService;
