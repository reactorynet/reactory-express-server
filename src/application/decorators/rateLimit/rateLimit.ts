import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';

const RATE_LIMITER_SERVICE_ID = 'core.RateLimiterService@1.0.0';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RateLimitKeySource =
  | 'static'     // always the same key
  | 'user'       // keyed by context.user._id
  | 'ip'         // keyed by context.req.ip
  | 'param'      // use a specific method argument (see keyParam)
  | 'custom';    // call keyFn(args, instance) → string

export interface RateLimitOptions {
  /**
   * Maximum calls allowed within the window.
   */
  max: number;

  /**
   * Rolling window length in seconds.
   * @default 60
   */
  windowSeconds?: number;

  /**
   * Base key prefix for this rate limit bucket.
   * Combined with the resolved identifier to form the final Redis/DB key.
   * Supports the same `${n}` / `${n.prop}` placeholder syntax as @cached.
   *
   * @example 'auth:login'
   * @example 'api:${0}'   // first argument becomes part of the key
   */
  key: string;

  /**
   * Determines what constitutes a unique caller.
   * @default 'ip'
   */
  keySource?: RateLimitKeySource;

  /**
   * When keySource === 'param', the zero-based index of the argument to use.
   * Nested paths supported: `0.userId`, `1.headers.x-api-key`.
   * @default 0
   */
  keyParam?: string;

  /**
   * When keySource === 'custom', this function computes the full rate-limit key.
   */
  keyFn?: (args: any[], instance: any) => string;

  /**
   * Where to find the Reactory context.
   * - 'instance' – `this.context` on the class instance (default)
   * - 'params'   – scans method arguments for an object with `getService`
   */
  contextSource?: 'instance' | 'params';

  /**
   * When true, a rate-limit breach returns `null` instead of throwing.
   * The caller is responsible for handling the null result.
   * @default false
   */
  softFail?: boolean;

  /**
   * Error message or factory used when rate limit is breached.
   * @default 'Rate limit exceeded. Please try again later.'
   */
  errorMessage?: string | ((remaining: number, resetIn: number) => string);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveTemplate(template: string, args: any[]): string {
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

function resolvePath(path: string, obj: any): any {
  return path.split('.').reduce((acc, segment) => {
    if (acc == null) return undefined;
    return acc[segment];
  }, obj);
}

function extractContext(
  args: any[],
  instance: any,
  source: 'instance' | 'params',
): Reactory.Server.IReactoryContext | null {
  if (source === 'instance') {
    return instance?.context ?? null;
  }
  for (const arg of args) {
    if (arg && typeof arg === 'object' && typeof arg.getService === 'function') {
      return arg as Reactory.Server.IReactoryContext;
    }
  }
  return null;
}

function buildRateLimitKey(
  keyTemplate: string,
  opts: RateLimitOptions,
  args: any[],
  instance: any,
  context: Reactory.Server.IReactoryContext | null,
): { key: string; identifierType: string; identifier: string } {
  const base = resolveTemplate(keyTemplate, args);
  const source = opts.keySource ?? 'ip';

  switch (source) {
    case 'user': {
      const userId = context?.user?._id?.toString() ?? 'anon';
      return { key: `${base}:user:${userId}`, identifierType: 'user', identifier: userId };
    }
    case 'ip': {
      const ip = context?.req?.ip ?? 'unknown';
      return { key: `${base}:ip:${ip}`, identifierType: 'ip', identifier: ip };
    }
    case 'param': {
      const paramPath = opts.keyParam ?? '0';
      const [indexStr, ...rest] = paramPath.split('.');
      let value = args[parseInt(indexStr, 10)];
      for (const segment of rest) {
        if (value == null) break;
        value = value[segment];
      }
      const identifier = value != null ? String(value) : 'unknown';
      return { key: `${base}:param:${identifier}`, identifierType: 'param', identifier };
    }
    case 'custom': {
      if (typeof opts.keyFn !== 'function') {
        throw new Error('@rateLimit: keySource is "custom" but no keyFn was provided');
      }
      const fullKey = opts.keyFn(args, instance);
      return { key: fullKey, identifierType: 'custom', identifier: fullKey };
    }
    case 'static':
    default:
      return { key: base, identifierType: 'static', identifier: base };
  }
}

function resolveErrorMessage(
  errorMessage: RateLimitOptions['errorMessage'],
  remaining: number,
  resetIn: number,
): string {
  if (typeof errorMessage === 'function') return errorMessage(remaining, resetIn);
  return errorMessage ?? 'Rate limit exceeded. Please try again later.';
}

// ─── Decorator ───────────────────────────────────────────────────────────────

/**
 * Method decorator that enforces a rate limit via `RateLimiterService`.
 *
 * The decorator:
 * 1. Resolves the Reactory context and fetches `RateLimiterService`
 * 2. Builds a rate-limit key from the configured `keySource`
 * 3. Calls `RateLimiterService.checkLimit`
 * 4. If allowed → proceeds with the original method call
 * 5. If blocked → throws an error (or returns `null` when `softFail: true`)
 *
 * When the `RateLimiterService` is unavailable the method executes normally
 * (fail-open), and a warning is logged.
 *
 * @example
 * // Limit per IP: 5 attempts per 60 s
 * @rateLimit({ key: 'auth:login', max: 5, windowSeconds: 60, keySource: 'ip' })
 * async login(username: string, password: string) { … }
 *
 * @example
 * // Limit per user: 100 calls per minute, soft-fail
 * @rateLimit({ key: 'api:query', max: 100, keySource: 'user', softFail: true })
 * async resolve(parent: any, args: any, context: IReactoryContext) { … }
 *
 * @example
 * // Limit by first argument value, resolver context in params
 * @rateLimit({ key: 'upload:${0}', max: 10, keySource: 'param', keyParam: '0', contextSource: 'params' })
 * async uploadFile(bucket: string) { … }
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    max,
    windowSeconds = 60,
    key: keyTemplate,
    contextSource = 'instance',
    softFail = false,
    errorMessage,
  } = options;

  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = extractContext(args, this, contextSource);

      if (!context) {
        logger.warn(
          `@rateLimit [${propertyKey}]: no Reactory context found – executing without rate limiting`,
        );
        return originalMethod.apply(this, args);
      }

      let limiter: any;
      try {
        limiter = context.getService<any>(RATE_LIMITER_SERVICE_ID);
      } catch {
        logger.warn(
          `@rateLimit [${propertyKey}]: RateLimiterService not available – executing without rate limiting`,
        );
        return originalMethod.apply(this, args);
      }

      if (!limiter) {
        return originalMethod.apply(this, args);
      }

      const { key, identifierType, identifier } = buildRateLimitKey(
        keyTemplate,
        options,
        args,
        this,
        context,
      );

      let result: { allowed: boolean; remaining: number; resetIn: number };
      try {
        result = await limiter.checkLimit(key, max, windowSeconds, identifierType, identifier);
      } catch (err) {
        logger.error(`@rateLimit [${propertyKey}]: checkLimit threw, allowing call`, {
          key,
          error: err,
        });
        return originalMethod.apply(this, args);
      }

      if (!result.allowed) {
        const message = resolveErrorMessage(errorMessage, result.remaining, result.resetIn);
        logger.warn(`@rateLimit [${propertyKey}]: rate limit breached`, {
          key,
          max,
          windowSeconds,
          remaining: result.remaining,
          resetIn: result.resetIn,
        });

        if (softFail) {
          return null;
        }

        const error = new ApiError(message, {          
          responseCode: 429,
          status: 'RATE_LIMIT_EXCEEDED',
          remaining: result.remaining,
          resetIn: result.resetIn,
        });  
        throw error;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
