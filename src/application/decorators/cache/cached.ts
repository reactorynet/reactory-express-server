import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

const REDIS_SERVICE_ID = 'core.RedisService@1.0.0';

export interface CachedOptions {
  /**
   * Time-to-live in seconds. If omitted the cached value has no expiry.
   */
  ttl?: number;
  /**
   * How to locate the Reactory context so the decorator can obtain the
   * Redis service via `context.getService()`.
   *
   * - `'instance'` – reads `this.context` on the class instance (default)
   * - `'params'`   – scans the method arguments for an object that has a
   *                   `getService` function (e.g. GraphQL resolver context)
   */
  contextSource?: 'instance' | 'params';
  /**
   * Custom serialiser for the return value.
   * Defaults to `JSON.stringify`.
   */
  serialise?: (value: any) => string;
  /**
   * Custom deserialiser for the cached string.
   * Defaults to `JSON.parse`.
   */
  deserialise?: (raw: string) => any;
}

/**
 * Resolve a key template against the method arguments.
 *
 * Placeholders use the form `${0}`, `${1}`, etc. referring to positional
 * arguments.  Nested access is supported: `${0.id}`, `${1.name}`.
 *
 * If the argument at a given position is an object, it is serialised to a
 * stable JSON string so the whole object can serve as part of the key.
 *
 * Examples:
 *   key: 'model:${0}:${1}'        args: ['ns', 'v2']       → 'model:ns:v2'
 *   key: 'user:${0.id}'           args: [{ id: 42 }]       → 'user:42'
 *   key: 'static-key'             args: []                  → 'static-key'
 */
function resolveKey(template: string, args: any[]): string {
  return template.replace(/\$\{(\d+(?:\.[^}]+)?)\}/g, (_match, path: string) => {
    const [indexStr, ...rest] = path.split('.');
    const index = parseInt(indexStr, 10);
    let value = args[index];
    for (const segment of rest) {
      if (value == null) break;
      value = value[segment];
    }
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

/**
 * Extract the Reactory execution context from the call-site.
 */
function extractContext(
  args: any[],
  instance: any,
  source: 'instance' | 'params'
): Reactory.Server.IReactoryContext | null {
  if (source === 'instance') {
    return instance?.context ?? null;
  }
  // scan args for an object that looks like IReactoryContext
  for (const arg of args) {
    if (arg && typeof arg === 'object' && typeof arg.getService === 'function') {
      return arg as Reactory.Server.IReactoryContext;
    }
  }
  return null;
}

/**
 * Method decorator that transparently caches the return value in Redis.
 *
 * On invocation the decorator:
 * 1. Resolves the cache key from the template + method arguments
 * 2. Attempts a Redis GET – if a hit is found the deserialised value is
 *    returned **without** executing the original method
 * 3. On a cache miss the original method runs, and the result is written
 *    back to Redis (with optional TTL)
 *
 * The decorator obtains the `RedisService` via the Reactory context so it
 * participates in the normal dependency-injection lifecycle.
 *
 * Usage:
 *   @cached('models:${0}:${1}', { ttl: 300 })
 *   async getModel(nameSpace: string, version: string) { … }
 *
 *   @cached('config', { ttl: 60, contextSource: 'params' })
 *   async resolve(parent: any, params: any, context: IReactoryContext) { … }
 */
export function cached(key: string, options: CachedOptions = {}) {
  const {
    ttl,
    contextSource = 'instance',
    serialise = JSON.stringify,
    deserialise = JSON.parse,
  } = options;

  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = extractContext(args, this, contextSource);

      if (!context) {
        logger.warn(
          `@cached: no Reactory context found for key "${key}" – executing without cache`
        );
        return originalMethod.apply(this, args);
      }

      let redis: any;
      try {
        redis = context.getService(REDIS_SERVICE_ID);
      } catch {
        logger.warn(
          `@cached: RedisService not available – executing without cache`
        );
        return originalMethod.apply(this, args);
      }

      if (!redis) {
        return originalMethod.apply(this, args);
      }

      const resolvedKey = resolveKey(key, args);

      // --- cache lookup ---
      try {
        const hit = await redis.get(resolvedKey);
        if (hit !== null && hit !== undefined) {
          return deserialise(hit);
        }
      } catch (err) {
        logger.error('@cached: cache read failed, falling through to method', {
          key: resolvedKey,
          error: err,
        });
      }

      // --- execute original method ---
      const result = await originalMethod.apply(this, args);

      // --- write back to cache ---
      try {
        const serialised = serialise(result);
        await redis.set(resolvedKey, serialised, ttl);
      } catch (err) {
        logger.error('@cached: cache write failed', {
          key: resolvedKey,
          error: err,
        });
      }

      return result;
    };

    return descriptor;
  };
}
