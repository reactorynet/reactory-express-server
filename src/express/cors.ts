import logger from '../logging';
import { CorsOptions, CorsOptionsDelegate } from 'cors';
import Reactory from '@reactorynet/reactory-core';
import EnabledClients from '@reactory/server-core/data/clientConfigs';

const {
  CDN_ROOT,
  API_ROOT,
  CORS_DEBUG = 'false',
  REACTORY_APP_WHITELIST = '',
} = process.env as Reactory.Server.ReactoryEnvironment;

const bypassUri = [
  `${CDN_ROOT}content/`,
  `${CDN_ROOT}plugins/`,
  `${CDN_ROOT}profiles/`,
  `${CDN_ROOT}organization/`,
  `${CDN_ROOT}themes/`,
  `${CDN_ROOT}ui/`,
  `${CDN_ROOT}/favicon.ico`,
  `${CDN_ROOT}/auth/microsoft/openid`,
  API_ROOT,
];

type CORSCallback = (error: Error | null, pass: boolean) => void;

/**
 * Raised when a request's Origin is not on the resolved whitelist.
 * `ReactoryCors` turns it into a 403 so clients can tell a policy rejection
 * from a server fault (the default error handler would answer 500).
 */
export class CorsOriginRejectedError extends Error {
  public readonly status = 403;
  constructor(public readonly origin: string, public readonly clientId?: string) {
    super(`[CORS] Origin ${origin} not allowed by CORS whitelist`);
    this.name = 'CorsOriginRejectedError';
  }
}

const allowedHeadersString = [
  'DNT',
  'User-Agent',
  'X-Requested-With',
  'If-Modified-Since',
  'Cache-Control',
  'Content-Type',
  'Range',
  'X-Client-Key',
  'X-Client-Pwd',
  'x-client-key',
  'x-client-pwd',
  'x-service-key',
  'X-Service-Key',
  'x-client-public-key',
  'X-Client-Public-Key',
  'origin',
  'authorization',
  'x-client-name',
  'x-client-version',
  'apollo-require-preflight',
  'x-apollo-operation-name',
].join(',');

const proxyHeaderString = 'X-Real-IP,X-Forwarded-For,X-Forwarded-Host,X-Forwarded-Proto';

export const tenantWhitelistCache: Record<string, { whitelist: string[]; timestamp: number }> = {};

export async function resolveTenantWhitelist(clientId: string): Promise<string[]> {
  if (!clientId) return [];
  const cached = tenantWhitelistCache[clientId];
  if (cached && cached.timestamp > Date.now() - 300000) {
    return cached.whitelist;
  }

  let list: string[] = [];
  // 1. Check enabled static client configs
  if (EnabledClients && EnabledClients.length > 0) {
    const staticClient = EnabledClients.find(
      (c) => c && (c.key === clientId || (c as any).id === clientId),
    );
    if (staticClient && Array.isArray(staticClient.whitelist)) {
      list = [...staticClient.whitelist];
    }
  }

  // 2. Check database model if available
  try {
    const ReactoryClientModel = require('@reactory/server-modules/reactory-core/models/ReactoryClient').default;
    if (ReactoryClientModel && typeof ReactoryClientModel.findOne === 'function') {
      const dbClient = await ReactoryClientModel.findOne({ key: clientId }).exec();
      if (dbClient && Array.isArray(dbClient.whitelist)) {
        list = Array.from(new Set([...list, ...dbClient.whitelist]));
      }
    }
  } catch (err) {
    // DB not available or model load error — keep static list
  }

  tenantWhitelistCache[clientId] = {
    whitelist: list,
    timestamp: Date.now(),
  };

  return list;
}

export const clearTenantWhitelistCache = () => {
  Object.keys(tenantWhitelistCache).forEach((k) => delete tenantWhitelistCache[k]);
};

const CorsDelegate: CorsOptionsDelegate = (
  request: Reactory.Server.ReactoryExpressRequest,
  corsDelegateCallback: (err: Error | null, options: CorsOptions) => void,
) => {
  const corsOptions: CorsOptions = {
    origin: async (origin: string, callback: CORSCallback) => {
      if (CORS_DEBUG === 'true') {
        logger.info(`[CORS] Origin: ${origin}`);
      }

      if (!origin) {
        callback(null, true);
        return;
      }

      // Path only: a bypass path inside the query string must not skip CORS.
      const requestPath = (request.url || '').split('?')[0];
      if (bypassUri.some((uri) => uri && requestPath.indexOf(uri) > -1)) {
        if (CORS_DEBUG === 'true') logger.info(`[CORS] Bypassing CORS for ${request.url}`);
        callback(null, true);
        return;
      }

      const globalWhitelistRaw = process.env.REACTORY_APP_WHITELIST || REACTORY_APP_WHITELIST || '';
      const globalWhitelist: string[] = globalWhitelistRaw
        ? globalWhitelistRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Extract client key from request (header, query, params, or attached partner)
      let clientId: string =
        request.partner?.key ||
        ((request.headers && (request.headers['x-client-key'] || request.headers['X-Client-Key'])) as string);

      if (!clientId && request.query && request.query['x-client-key']) {
        clientId = decodeURIComponent(request.query['x-client-key'] as string);
      }
      if (!clientId && request.params && request.params['clientId']) {
        clientId = request.params['clientId'];
      }

      // If tenant is identified, allow ONLY that tenant's whitelist plus global whitelist
      if (clientId) {
        const tenantWhitelist = await resolveTenantWhitelist(clientId);
        const allowed = [...globalWhitelist, ...tenantWhitelist];

        if (CORS_DEBUG === 'true') {
          logger.info(`[CORS] Tenant "${clientId}" allowed origins: ${allowed.join(', ')}`);
        }

        if (allowed.includes(origin)) {
          callback(null, true);
        } else {
          if (CORS_DEBUG === 'true') {
            logger.warn(`[CORS] Origin "${origin}" not allowed by whitelist for tenant "${clientId}"`);
          }
          callback(new CorsOriginRejectedError(origin, clientId), false);
        }
        return;
      }

      // Preflight (OPTIONS) requests do not reliably carry custom headers across all browsers.
      // If unresolvable on OPTIONS, fall back to union across all tenants as a safe preflight fallback.
      if (request.method === 'OPTIONS') {
        let fallbackUnion = [...globalWhitelist];
        if (EnabledClients && EnabledClients.length > 0) {
          EnabledClients.forEach((client) => {
            if (client && Array.isArray(client.whitelist)) {
              fallbackUnion = [...fallbackUnion, ...client.whitelist];
            }
          });
        }
        if (fallbackUnion.includes(origin)) {
          if (CORS_DEBUG === 'true') {
            logger.info(`[CORS] Preflight OPTIONS allowed via fallback union for origin: ${origin}`);
          }
          callback(null, true);
          return;
        }
      }

      // Requests without a resolvable tenant get the global list only
      if (globalWhitelist.length > 0 && globalWhitelist.includes(origin)) {
        callback(null, true);
      } else {
        if (CORS_DEBUG === 'true') {
          logger.warn(`[CORS] Origin "${origin}" not allowed by global CORS whitelist`);
        }
        callback(new CorsOriginRejectedError(origin), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [...allowedHeadersString.split(','), ...proxyHeaderString.split(',')],
    exposedHeaders: [
      'X-Client-Key',
      'X-Client-Pwd',
      'x-client-key',
      'x-client-pwd',
      'x-service-key',
      'x-client-public-key',
      'x-client-version',
      'x-client-name',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  };

  corsDelegateCallback(null, corsOptions);
};

export default CorsDelegate;
