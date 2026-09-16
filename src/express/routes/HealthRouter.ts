import express from 'express';
import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false
});

interface ServiceHealth {
  id: string;
  name: string;
  healthy: boolean;
  message?: string;
  checkedAt: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'starting';
  services: ServiceHealth[];
  timestamp: string;
  version?: string;
  /** Wall time the sweep took. Additive; existing consumers can ignore it. */
  durationMs?: number;
}

/**
 * Per-check ceiling.
 *
 * Service healthChecks may perform network I/O with generous client timeouts —
 * the compute adapter's axios client waits 30s. A kubelet probe gives up after
 * 5s, so an unbounded check does not just slow the endpoint down: the probe is
 * abandoned, the handler keeps running, and sustained failures restart the pod.
 * A dependency's latency must never be able to restart this process.
 *
 * Tunable so a deployment can raise it without a code change.
 */
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 1500;

/**
 * Resolved per sweep rather than captured at import, so the budget can be
 * adjusted in a test without reloading the module.
 */
const resolveCheckBudget = (): number => {
  const parsed = Number(process.env.HEALTH_CHECK_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HEALTH_CHECK_TIMEOUT_MS;
};

/**
 * Reject if `promise` has not settled within `timeoutMs`.
 *
 * The timer is unref'd so a pending budget never holds the event loop open —
 * otherwise a hung check would keep the process alive and mask a clean shutdown.
 */
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const budget = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: health check exceeded ${timeoutMs}ms budget`)),
      timeoutMs
    );
    if (timer && typeof (timer as any).unref === 'function') (timer as any).unref();
  });

  try {
    return await Promise.race([promise, budget]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Performs health check on all registered services using context.
 * Caches result in RedisCache (via RedisService).
 */
const performHealthCheck = async (context: Reactory.Server.IReactoryContext): Promise<SystemHealth> => {
  const redisService = context.getService<Reactory.Service.IReactoryService & { get?: Function, set?: Function }>('core.RedisService@1.0.0');
  
  // Try cache first
  const cacheKey = 'system:health:status';
  if (redisService && typeof redisService.get === 'function') {
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Log only the message. The caught error from a failed Redis command
      // carries its full argument list, which for this key is the entire ~50KB
      // health payload — logging it verbatim is how one bad key turns into
      // hundreds of megabytes of log per day.
      logger.debug('Health cache miss or error', { message: (e as any)?.message });
    }
  }

  const services = context.listServices ? context.listServices({}) : [];
  const startedAt = Date.now();

  // Every service is evaluated concurrently.
  //
  // Sequentially, the endpoint's latency is the SUM of all checks: one slow
  // dependency delays every check queued behind it, and with ~100 services that
  // compounds past any probe timeout. Concurrently it is bounded by the slowest
  // single check, which the per-check budget then caps.
  //
  // Promise.all is safe here because each mapper catches its own errors and
  // always resolves — one broken dependency cannot reject the batch.
  const serviceHealths: ServiceHealth[] = await Promise.all(
    services.map(async (svc): Promise<ServiceHealth> => {
      const id = svc.id || svc.name;
      const name = svc.name || svc.id;
      const checkedAt = new Date().toISOString();

      try {
        const serviceInstance: any = context.getService(id);

        if (!serviceInstance || typeof serviceInstance.healthCheck !== 'function') {
          // Nothing to await, so a service without a healthCheck costs no time.
          return { id, name, healthy: true, message: 'Assumed healthy (no healthCheck implemented)', checkedAt };
        }

        const result = await withTimeout(
          Promise.resolve(serviceInstance.healthCheck()),
          resolveCheckBudget(),
          id
        );

        return { id, name, healthy: result?.healthy !== false, message: result?.message || 'Healthy', checkedAt };
      } catch (err: any) {
        // Threw, or overran its budget. Reported as unhealthy rather than fatal:
        // one bad dependency must never take the whole endpoint down.
        return { id, name, healthy: false, message: err?.message || 'Health check failed', checkedAt };
      }
    })
  );

  const durationMs = Date.now() - startedAt;
  const overallHealthy = serviceHealths.every(s => s.healthy);
  const healthResult: SystemHealth = {
    status: overallHealthy ? 'healthy' : 'degraded',
    services: serviceHealths,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    durationMs
  };

  // Cache the result
  if (redisService && typeof redisService.set === 'function') {
    try {
      // RedisService.set is (key, value, ttlSeconds) — the TTL goes in the third
      // argument. The raw node-redis client takes (key, value, 'EX', seconds),
      // and passing the 'EX' form to this wrapper lands the literal string 'EX'
      // in the seconds slot, which Redis rejects.
      await redisService.set(cacheKey, JSON.stringify(healthResult), 30); // 30s TTL
    } catch (e) {
      // Message only — see the note on the read path above.
      logger.debug('Failed to cache health status', { message: (e as any)?.message });
    }
  }

  return healthResult;
};

router.get('/', async (req, res) => {
  try {
    // For health endpoint, we need a system context. 
    // This assumes a global or factory; in practice may need adjustment.
    const systemContext: Reactory.Server.IReactoryContext = (global as any).REACTORY_SYSTEM_CONTEXT || {} as any;
    
    if (!systemContext.getService || !systemContext.listServices) {
      return res.status(503).json({ status: 'starting', message: 'System context not ready' });
    }

    const health = await performHealthCheck(systemContext);
    const httpStatus = 200;
    res.status(httpStatus).json(health);
  } catch (error) {
    logger.error('Health check error', error);
    res.status(503).json({ status: 'degraded', error: error.message, timestamp: new Date().toISOString() });
  }
});

// ---------------------------------------------------------------------------
// Readiness
//
// A pod that cannot reach its datastores cannot serve requests, so it should not
// receive them. This is deliberately NOT the /health sweep: readiness runs on
// every rolling update and every kubelet period, so it has to cost milliseconds
// and must never depend on a third party.
//
// Each probe reports one of three outcomes:
//
//   ok       the dependency answered
//   failed   the dependency is configured but not answering  -> not ready
//   skipped  the dependency is not part of this deployment   -> ignored
//
// Only "configured but broken" gates. A backend this tier does not use can never
// pull the pod out of rotation.
// ---------------------------------------------------------------------------

const DEFAULT_READY_TIMEOUT_MS = 1000;

/** Resolved per call so a test can adjust the budget without reloading. */
const resolveReadyBudget = (): number => {
  const parsed = Number(process.env.HEALTH_READY_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_READY_TIMEOUT_MS;
};

/**
 * Which dependencies readiness gates on.
 *
 * Defaults to the two the application cannot serve without: MongoDB holds the
 * primary data, Redis backs sessions, queues and rate limiting.
 *
 * PostgreSQL joins the list only when this deployment configures it —
 * REACTORY_POSTGRES_HOST is the signal. A probe for an unconfigured backend
 * would report failed and hold the pod out of rotation permanently, which is
 * the same class of self-inflicted outage as gating liveness on a dependency.
 *
 * HEALTH_READY_DEPENDENCIES overrides the list entirely; an empty value turns
 * dependency gating off and leaves readiness as a process-answers test.
 */
const resolveDependencies = (): string[] => {
  const override = process.env.HEALTH_READY_DEPENDENCIES;
  if (override !== undefined) {
    return override.split(',').map((entry) => entry.trim()).filter(Boolean);
  }

  const dependencies = ['mongo', 'redis'];
  if (process.env.REACTORY_POSTGRES_HOST) dependencies.push('postgres');
  return dependencies;
};

interface DependencyCheck {
  name: string;
  ok: boolean;
  /** True when the dependency is absent from this deployment, so it cannot gate. */
  skipped?: boolean;
  message: string;
}

interface ProbeOutcome {
  ok: boolean;
  skipped?: boolean;
  message: string;
}

const MONGO_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Mongo needs no round trip: mongoose tracks the connection state locally, so
 * reading it is a field access rather than a query.
 *
 * The require is deferred to call time so mongoose stays off this module's
 * import graph — health traffic should still be servable if that dependency is
 * missing or slow to initialise.
 */
const probeMongo = async (): Promise<ProbeOutcome> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mongoose = require('mongoose');
  const state = mongoose?.connection?.readyState;

  if (typeof state !== 'number') {
    return { ok: false, message: 'mongoose connection state unavailable' };
  }

  return { ok: state === 1, message: MONGO_STATES[state] ?? `readyState ${state}` };
};

const probeRedis = async (context: Reactory.Server.IReactoryContext): Promise<ProbeOutcome> => {
  const service: any = context.getService('core.RedisService@1.0.0');

  if (!service || typeof service.healthCheck !== 'function') {
    return { ok: false, skipped: true, message: 'RedisService not registered' };
  }

  const healthy = await withTimeout(
    Promise.resolve(service.healthCheck()),
    resolveReadyBudget(),
    'redis'
  );

  return { ok: healthy === true, message: healthy === true ? 'PING ok' : 'PING failed' };
};

/**
 * A single `SELECT 1`, which any reachable PostgreSQL answers without touching
 * user data.
 */
const probePostgres = async (context: Reactory.Server.IReactoryContext): Promise<ProbeOutcome> => {
  const service: any = context.getService('core.ReactorySQLService@1.0.0');

  if (!service || typeof service.query !== 'function') {
    return { ok: false, skipped: true, message: 'ReactorySQLService not registered' };
  }

  const result: any = await withTimeout(
    Promise.resolve(service.query({ engine: 'postgres', sql: 'SELECT 1' })),
    resolveReadyBudget(),
    'postgres'
  );

  return Array.isArray(result?.rows)
    ? { ok: true, message: 'SELECT 1 ok' }
    : { ok: false, message: 'unexpected result from SELECT 1' };
};

const PROBES: Record<string, (context: Reactory.Server.IReactoryContext) => Promise<ProbeOutcome>> = {
  mongo: probeMongo,
  redis: probeRedis,
  postgres: probePostgres,
};

const runReadinessChecks = async (
  context: Reactory.Server.IReactoryContext
): Promise<{ ready: boolean; checks: DependencyCheck[] }> => {
  const checks = await Promise.all(
    resolveDependencies().map(async (name): Promise<DependencyCheck> => {
      const probe = PROBES[name];

      if (!probe) {
        return { name, ok: false, skipped: true, message: 'unknown dependency' };
      }

      try {
        const outcome = await probe(context);
        return { name, ok: outcome.ok, skipped: outcome.skipped, message: outcome.message };
      } catch (err: any) {
        return { name, ok: false, message: err?.message || 'probe failed' };
      }
    })
  );

  // Only dependencies actually present in this deployment can gate.
  const gating = checks.filter((check) => !check.skipped);
  return { ready: gating.every((check) => check.ok), checks };
};

/**
 * GET /health/live — liveness.
 *
 * Answers from memory and consults nothing. If this process can accept the
 * connection and reply, it is alive. Deliberately dependency-free: a slow
 * datastore must never cause the kubelet to restart a working process.
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * GET /health/ready — readiness.
 *
 * Gates traffic on the datastores the application cannot serve without.
 */
router.get('/ready', async (req, res) => {
  try {
    const systemContext: Reactory.Server.IReactoryContext = (global as any).REACTORY_SYSTEM_CONTEXT || {} as any;

    if (!systemContext.getService) {
      return res.status(503).json({
        status: 'not ready',
        message: 'System context not ready',
        timestamp: new Date().toISOString(),
      });
    }

    const startedAt = Date.now();
    const { ready, checks } = await runReadinessChecks(systemContext);

    return res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not ready',
      checks,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Readiness check error', { message: error?.message });
    return res.status(503).json({
      status: 'not ready',
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { performHealthCheck, runReadinessChecks };
export default router;
