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
}

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
      logger.debug('Health cache miss or error', e);
    }
  }

  const services = context.listServices ? context.listServices({}) : [];
  const serviceHealths: ServiceHealth[] = [];

  for (const svc of services) {
    let healthy = true;
    let message = 'Assumed healthy (no healthCheck implemented)';
    
    try {
      // Access the actual service instance via getService to invoke method
      const serviceInstance: any = context.getService(svc.id || svc.name);
      if (serviceInstance && typeof serviceInstance.healthCheck === 'function') {
        const result = await serviceInstance.healthCheck();
        healthy = result?.healthy !== false;
        message = result?.message || 'Healthy';
      }
    } catch (err) {
      healthy = false;
      message = err.message || 'Health check failed';
    }

    serviceHealths.push({
      id: svc.id || svc.name,
      name: svc.name || svc.id,
      healthy,
      message,
      checkedAt: new Date().toISOString()
    });
  }

  const overallHealthy = serviceHealths.every(s => s.healthy);
  const healthResult: SystemHealth = {
    status: overallHealthy ? 'healthy' : 'degraded',
    services: serviceHealths,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  };

  // Cache the result
  if (redisService && typeof redisService.set === 'function') {
    try {
      await redisService.set(cacheKey, JSON.stringify(healthResult), 'EX', 30); // 30s TTL
    } catch (e) {
      logger.debug('Failed to cache health status', e);
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
    const httpStatus = health.status === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(health);
  } catch (error) {
    logger.error('Health check error', error);
    res.status(503).json({ status: 'degraded', error: error.message, timestamp: new Date().toISOString() });
  }
});

export { performHealthCheck };
export default router;
