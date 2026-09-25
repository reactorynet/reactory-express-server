import Express from 'express';
import CorsOptions, { CorsOriginRejectedError } from '@reactory/server-core/express/cors';
import cors from 'cors';
import logger from '@reactory/server-core/logging';

const corsMiddleware = cors(CorsOptions);

/**
 * Runs the tenant-scoped CORS check. An Origin rejected by the whitelist is
 * answered with 403 here, before any route runs; every other error continues
 * to the normal error handler.
 */
export const ReactoryCorsHandler = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  corsMiddleware(req, res, (err?: any) => {
    if (err instanceof CorsOriginRejectedError) {
      logger.warn(`[CORS] Rejected origin ${err.origin}${err.clientId ? ` for tenant ${err.clientId}` : ''} on ${req.method} ${req.path}`);
      res.status(403).json({ error: 'origin-not-allowed', description: 'The request origin is not allowed for this client.' });
      return;
    }
    next(err);
  });
};

/**
 * Express `trust proxy` from TRUST_PROXY.
 *
 * `req.ip` feeds login-token IP binding (`Helpers.generateLoginToken`), rate
 * limits and audit logs, so it must be the client address rather than the
 * address of the nearest proxy. Set TRUST_PROXY to the number of proxy hops
 * between the client and this process that append to X-Forwarded-For, or to a
 * comma-separated list of trusted proxy addresses/CIDRs.
 *
 *   unset       -> 1 (a single reverse proxy; previous behaviour)
 *   'false'/'0' -> trust nothing; req.ip is the socket peer
 *   'true'      -> trust every hop (only when the edge strips client-supplied
 *                  X-Forwarded-For)
 *   '2'         -> e.g. AWS load balancer + Istio ingress gateway; the Istio
 *                  sidecar does not append on inbound traffic
 *   '10.0.0.0/8,loopback' -> trust those addresses only
 */
export const resolveTrustProxy = (value: string | undefined = process.env.TRUST_PROXY): boolean | number | string => {
  if (value === undefined || value.trim() === '') return 1;
  const trimmed = value.trim();
  if (trimmed === 'false') return false;
  if (trimmed === 'true') return true;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  return trimmed;
};

const ReactoryCors = (app: Express.Application) => { 
  app.use('*', ReactoryCorsHandler);
  app.set('trust proxy', resolveTrustProxy());
};

const ReactoryCorsMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  name: 'ReactoryCors',
  nameSpace: 'Reactory',
  version: '1.0.0',
  ordinal: -100,
  type: 'configuration',
  async: false,
  component: ReactoryCors,
};

export default ReactoryCorsMiddlewareDefinition;