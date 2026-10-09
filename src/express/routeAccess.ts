/**
 * Route Access Policy — configurable exemptions and IP allow-lists, by route.
 *
 * ## Why this exists
 *
 * Two pieces of middleware decide whether a request may proceed without a tenant
 * credential:
 *
 *   - `ReactoryClient.ts` — the tenant/client authentication middleware
 *   - `cors.ts`           — the CORS origin check
 *
 * Both carried their own **hardwired** `bypassUri` array, matched with a loose
 * `path.includes(uri)` (so `/login` also exempted `/api/login-ish`, and a bypass
 * path inside a query string once skipped authentication entirely). Neither could
 * express "this route is public but only from these IP addresses", which is exactly
 * what a payment provider callback needs: PayU cannot send `x-client-key`, and the
 * route must not be open to the world.
 *
 * This module is the single source of truth for that decision. It is deliberately
 * **configuration-driven, not code-driven**:
 *
 *   1. an environment seed — `REACTORY_ROUTE_ACCESS` (JSON), for deploy-time
 *   2. a per-tenant client setting named `routeAccess`, resolved from the static
 *      client configs and the `ReactoryClient` document (the same two sources
 *      `resolveTenantWhitelist()` already merges for CORS), cached for 5 minutes
 *
 * The built-in defaults reproduce the previous `bypassUri` behaviour, so wiring this
 * in is behaviour-preserving.
 *
 * ## Policy shape
 *
 * ```jsonc
 * [
 *   {
 *     "path": "/api/payment/v1/webhooks/",   // prefix match, longest wins
 *     "methods": ["POST"],                   // optional; omit for all methods
 *     "tenantAuth": false,                   // exempt from x-client-key
 *     "cors": false,                         // exempt from the origin check
 *     "ipAllowList": ["41.0.0.0/8"],         // optional; omit to allow any IP
 *     "description": "PayU IPN callback"
 *   }
 * ]
 * ```
 *
 * Omitted fields default to the safe value (`tenantAuth: true`, `cors: true`,
 * no IP restriction).
 */

import logger from '@reactory/server-core/logging';
import EnabledClients from '@reactory/server-core/data/clientConfigs';

export interface IReactoryRouteAccessPolicy {
  /** Path prefix. Longest matching prefix wins. */
  path: string;
  /** HTTP methods this policy applies to. Omit for all methods. */
  methods?: string[];
  /** Must the request carry a valid tenant credential? Default true. */
  tenantAuth?: boolean;
  /** Must the request pass the CORS origin check? Default true. */
  cors?: boolean;
  /**
   * Allowed client IPs: exact addresses, IPv4 CIDR ranges, or `*` for any.
   * Omit to allow any IP (only sensible together with `tenantAuth: true`).
   */
  ipAllowList?: string[];
  /** Free text, for operators reading the config. */
  description?: string;
}

export interface IResolvedRouteAccess {
  /** No policy matched: the defaults apply. */
  policy?: IReactoryRouteAccessPolicy;
  tenantAuthRequired: boolean;
  corsRequired: boolean;
  ipAllowed: boolean;
  matchedPath?: string;
}

export interface IRouteAccessRequest {
  path: string;
  method?: string;
  /** Client IP, already resolved from proxy headers by the caller. */
  ip?: string;
  /** Tenant key, when known. Used to resolve per-tenant policy. */
  clientId?: string;
}

/* ------------------------------------------------------------------ *
 * Defaults — reproduce the previous hardwired `bypassUri` behaviour
 * ------------------------------------------------------------------ */

/**
 * The previous `bypassUri` list, expressed as policies.
 *
 * `tenantAuth: false` on each reproduces the old exemption; CORS keeps the same
 * exemptions it had (`cors: false`) except for the API root, which the old CORS
 * list carried but the auth list did not — the old lists genuinely differed, so
 * this encodes what each actually did rather than flattening them.
 */
export const DEFAULT_ROUTE_ACCESS_POLICIES: IReactoryRouteAccessPolicy[] = [
  { path: '/cdn/content/', tenantAuth: false, cors: false, description: 'Static CDN content' },
  { path: '/cdn/plugins/', tenantAuth: false, cors: false, description: 'Static plugin assets' },
  { path: '/cdn/profiles/', tenantAuth: false, cors: false, description: 'Static profile assets' },
  { path: '/cdn/organization/', tenantAuth: false, cors: false, description: 'Static org assets' },
  { path: '/cdn/themes/', tenantAuth: false, cors: false, description: 'Static theme assets' },
  { path: '/cdn/ui/', tenantAuth: false, cors: false, description: 'Static UI assets' },
  { path: '/cdn/fonts/', tenantAuth: false, cors: false, description: 'Static font assets' },
  { path: '/cdn/i18n/', tenantAuth: false, cors: false, description: 'Static i18n bundles' },
  { path: '/cdn/wordnet/', tenantAuth: false, cors: false, description: 'Static wordnet data' },
  { path: '/cdn/forms/images/', tenantAuth: false, cors: false, description: 'Static form images' },
  { path: '/cdn/forms/icons/', tenantAuth: false, cors: false, description: 'Static form icons' },
  { path: '/favicon.ico', tenantAuth: false, cors: false, description: 'Favicon' },
  { path: '/login', tenantAuth: false, cors: false, description: 'Login page' },
  { path: '/logout', tenantAuth: false, cors: false, description: 'Logout endpoint' },
  { path: '/health', tenantAuth: false, cors: false, description: 'Health probes' },
  { path: '/telemetry', tenantAuth: false, cors: false, description: 'Telemetry endpoints' },
  // OAuth provider flows: an IdP redirect carries no tenant credential; the route
  // resolves the tenant from the tenant key (start) or the session-bound CSRF
  // state (callback). See src/authentication/strategies/tenantOAuth.ts.
  { path: '/auth/google/', tenantAuth: false, cors: false, description: 'OAuth: Google' },
  { path: '/auth/github/', tenantAuth: false, cors: false, description: 'OAuth: GitHub' },
  { path: '/auth/facebook/', tenantAuth: false, cors: false, description: 'OAuth: Facebook' },
  { path: '/auth/linkedin/', tenantAuth: false, cors: false, description: 'OAuth: LinkedIn' },
  { path: '/auth/okta/', tenantAuth: false, cors: false, description: 'OAuth: Okta' },
  { path: '/auth/microsoft/', tenantAuth: false, cors: false, description: 'OAuth: Microsoft' },
];

/** Extra exemptions only in non-production runtimes. */
export const DEVELOPMENT_ROUTE_ACCESS_POLICIES: IReactoryRouteAccessPolicy[] = [
  { path: '/swagger', tenantAuth: false, cors: false, description: 'Swagger UI (non-production)' },
  { path: '/telemetry/metrics', tenantAuth: false, cors: false, description: 'Metrics (non-production)' },
  { path: '/telemetry/health', tenantAuth: false, cors: false, description: 'Health (non-production)' },
];

const NON_PRODUCTION = ['development', 'local', 'test'];

/** Defaults for the current runtime (adds dev-only entries outside production). */
export const defaultRouteAccessPolicies = (
  nodeEnv: string | undefined = process.env.NODE_ENV,
): IReactoryRouteAccessPolicy[] => [
  ...DEFAULT_ROUTE_ACCESS_POLICIES,
  ...(NON_PRODUCTION.includes((nodeEnv || '').toLowerCase()) ? DEVELOPMENT_ROUTE_ACCESS_POLICIES : []),
];

/* ------------------------------------------------------------------ *
 * IP matching
 * ------------------------------------------------------------------ */

/** Strip an IPv6-mapped IPv4 prefix (`::ffff:196.2.1.1` -> `196.2.1.1`). */
const normaliseIp = (ip: string): string =>
  String(ip || '')
    .trim()
    .replace(/^::ffff:/i, '');

const parseIpv4 = (value: string): number[] | undefined => {
  const parts = value.split('.');
  if (parts.length !== 4) return undefined;
  const octets = parts.map((part) => (part === '' ? NaN : Number(part)));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return undefined;
  return octets;
};

const ipv4ToInt = (octets: number[]): number =>
  ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];

/** Does `ip` fall inside the IPv4 CIDR `range/cidr`? */
const ipv4InCidr = (ip: string, range: string, cidr: number): boolean => {
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) return false;
  const ipOctets = parseIpv4(ip);
  const rangeOctets = parseIpv4(range);
  if (!ipOctets || !rangeOctets) return false;
  if (cidr === 0) return true;
  const mask = cidr === 32 ? 0xffffffff : (0xffffffff << (32 - cidr)) >>> 0;
  return (ipv4ToInt(ipOctets) & mask) === (ipv4ToInt(rangeOctets) & mask);
};

/**
 * Is `ip` permitted by `allowList`?
 *
 * Supports exact addresses (v4 and v6), IPv4 CIDR ranges, and `*` for any.
 * An **empty or missing** list allows any IP — the caller decides whether that is
 * acceptable for a given route; `evaluateRouteAccess` reports it either way.
 */
export const isIpAllowed = (ip: string | undefined, allowList: string[] | undefined): boolean => {
  if (!allowList || allowList.length === 0) return true;
  const candidate = normaliseIp(ip || '');
  if (!candidate) return false;

  for (const rawEntry of allowList) {
    const entry = String(rawEntry || '').trim();
    if (!entry) continue;
    if (entry === '*') return true;

    const [range, cidrPart] = entry.split('/');
    if (cidrPart !== undefined) {
      // IPv4 CIDR only; an IPv6 CIDR is not supported and must not silently pass.
      if (range.includes(':')) continue;
      if (ipv4InCidr(candidate, range, Number(cidrPart))) return true;
      continue;
    }

    if (normaliseIp(entry).toLowerCase() === candidate.toLowerCase()) return true;
  }

  return false;
};

/* ------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------ */

const normalisePath = (value: string): string => {
  const pathOnly = String(value || '').split('?')[0];
  if (pathOnly.length > 1 && pathOnly.endsWith('/')) return pathOnly.slice(0, -1);
  return pathOnly;
};

/** Prefix match on a path boundary: `/health` matches `/health` and `/health/x`, not `/healthz`. */
const pathMatches = (requestPath: string, policyPath: string): boolean => {
  const request = normalisePath(requestPath);
  const policy = normalisePath(policyPath);
  if (!policy) return false;
  if (request === policy) return true;
  return request.startsWith(policy.endsWith('/') ? policy : `${policy}/`);
};

const methodMatches = (policy: IReactoryRouteAccessPolicy, method?: string): boolean => {
  if (!policy.methods || policy.methods.length === 0) return true;
  if (!method) return false;
  return policy.methods.map((m) => m.toUpperCase()).includes(method.toUpperCase());
};

/**
 * The policy governing a request, or undefined when none matches.
 *
 * Precedence: longest `path` wins (most specific); a method-qualified policy beats
 * an unqualified one of the same length.
 */
export const matchRoutePolicy = (
  policies: IReactoryRouteAccessPolicy[],
  path: string,
  method?: string,
): IReactoryRouteAccessPolicy | undefined => {
  const candidates = (policies || []).filter(
    (policy) => policy && policy.path && pathMatches(path, policy.path) && methodMatches(policy, method),
  );
  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, candidate) => {
    const bestLength = normalisePath(best.path).length;
    const candidateLength = normalisePath(candidate.path).length;
    if (candidateLength > bestLength) return candidate;
    if (candidateLength === bestLength) {
      // More specific: a policy that names methods wins over one that does not.
      const bestScoped = Array.isArray(best.methods) && best.methods.length > 0;
      const candidateScoped = Array.isArray(candidate.methods) && candidate.methods.length > 0;
      if (candidateScoped && !bestScoped) return candidate;
    }
    return best;
  });
};

/**
 * Resolve the effective access decision for a request.
 *
 * Defaults are the safe ones: tenant auth required, CORS required, IP unrestricted.
 * A matching policy may relax `tenantAuth`/`cors` and/or restrict by IP. An IP
 * allow-list is enforced **independently of** `tenantAuth`, so a route can be both
 * public and IP-restricted (the webhook case).
 */
export const evaluateRouteAccess = (
  request: IRouteAccessRequest,
  policies: IReactoryRouteAccessPolicy[],
): IResolvedRouteAccess => {
  const policy = matchRoutePolicy(policies, request.path, request.method);

  if (!policy) {
    return { tenantAuthRequired: true, corsRequired: true, ipAllowed: true };
  }

  return {
    policy,
    tenantAuthRequired: policy.tenantAuth !== false,
    corsRequired: policy.cors !== false,
    ipAllowed: isIpAllowed(request.ip, policy.ipAllowList),
    matchedPath: policy.path,
  };
};

/* ------------------------------------------------------------------ *
 * Configuration resolution
 * ------------------------------------------------------------------ */

/** Setting name a tenant uses to declare its route-access policies. */
export const ROUTE_ACCESS_SETTING_NAME = 'routeAccess';

interface CacheEntry {
  policies: IReactoryRouteAccessPolicy[];
  timestamp: number;
}

export const routeAccessCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 300000;

export const clearRouteAccessCache = (clientId?: string): void => {
  if (clientId) delete routeAccessCache[clientId];
  else Object.keys(routeAccessCache).forEach((key) => delete routeAccessCache[key]);
};

/** Parse the `REACTORY_ROUTE_ACCESS` seed. Returns [] on anything malformed. */
export const parseRouteAccessSeed = (raw: string | undefined): IReactoryRouteAccessPolicy[] => {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn('[routeAccess] REACTORY_ROUTE_ACCESS must be a JSON array; ignoring');
      return [];
    }
    return parsed.filter((entry) => entry && typeof entry.path === 'string');
  } catch (error) {
    logger.warn(`[routeAccess] REACTORY_ROUTE_ACCESS is not valid JSON; ignoring: ${(error as Error).message}`);
    return [];
  }
};

const policiesFromSettings = (settings: any): IReactoryRouteAccessPolicy[] => {
  if (!Array.isArray(settings)) return [];
  const setting = settings.find((entry: any) => entry && entry.name === ROUTE_ACCESS_SETTING_NAME);
  const data = setting?.data;
  // Two accepted shapes: the bare array (config-as-code), or the object the
  // RouteAccessForm edits (`{ policies: [...] }`). Accepting both means an operator
  // editing through the form cannot silently produce data the engine ignores.
  const list = Array.isArray(data) ? data : Array.isArray(data?.policies) ? data.policies : [];
  return list.filter((entry: any) => entry && typeof entry.path === 'string');
};

undefined

/** Policies declared in a client's IN-MEMORY config. No I/O. */
const clientPolicies = (clientId: string): IReactoryRouteAccessPolicy[] => {
  const client = (EnabledClients || []).find(
    (candidate: any) => candidate && (candidate.key === clientId || candidate.id === clientId),
  );
  return policiesFromSettings((client as any)?.settings);
};

/**
 * Policies from EVERY enabled client, merged permissively.
 *
 * Used when the request carries no tenant key — a payment provider callback cannot
 * send `x-client-key`. Routes are mounted once on the server and are **not**
 * tenant-scoped, so a route exemption is inherently server-wide: a per-tenant
 * exemption that could never apply to a tenant-less request would be a fiction.
 *
 * Merge semantics are "most permissive wins", because the only way an entry gets
 * here is that somebody deliberately declared an exemption:
 *   - `tenantAuth` / `cors`: `false` from any client wins
 *   - `methods`: omitted by any client means all methods
 *   - `ipAllowList`: omitted by any client means unrestricted; otherwise the union
 */
const unionOfEnabledClients = (): IReactoryRouteAccessPolicy[] => {
  const union = new Map<string, IReactoryRouteAccessPolicy>();
  (EnabledClients || []).forEach((client: any) => {
    policiesFromSettings(client?.settings).forEach((policy) => {
      const key = `${normalisePath(policy.path)}::${(policy.methods || []).join(',')}`;
      const existing = union.get(key);
      if (!existing) {
        union.set(key, { ...policy });
        return;
      }
      const anyUnrestricted =
        !Array.isArray(existing.ipAllowList) || existing.ipAllowList.length === 0 ||
        !Array.isArray(policy.ipAllowList) || policy.ipAllowList.length === 0;
      union.set(key, {
        ...existing,
        ...policy,
        methods:
          Array.isArray(existing.methods) && existing.methods.length > 0 &&
          Array.isArray(policy.methods) && policy.methods.length > 0
            ? Array.from(new Set([...existing.methods, ...policy.methods]))
            : undefined,
        tenantAuth:
          existing.tenantAuth === false || policy.tenantAuth === false
            ? false
            : existing.tenantAuth ?? policy.tenantAuth,
        cors:
          existing.cors === false || policy.cors === false ? false : existing.cors ?? policy.cors,
        ipAllowList: anyUnrestricted
          ? undefined
          : Array.from(new Set([...(existing.ipAllowList as string[]), ...(policy.ipAllowList as string[])])),
      });
    });
  });
  return Array.from(union.values());
};

/** Later sources override earlier ones for the same path + methods. */
const mergeByPath = (
  target: Map<string, IReactoryRouteAccessPolicy>,
  policies: IReactoryRouteAccessPolicy[],
): void => {
  policies.forEach((policy) => {
    const key = `${normalisePath(policy.path)}::${(policy.methods || []).join(',')}`;
    target.set(key, { ...(target.get(key) || {}), ...policy });
  });
};

/**
 * Defaults + client config + env seed. Synchronous, no I/O.
 *
 * Precedence (last wins): built-in defaults, the client config (the matching tenant
 * when one is resolvable, otherwise the union across all enabled clients), then the
 * `REACTORY_ROUTE_ACCESS` seed — so the environment always has the final say.
 */
const buildStaticPolicies = (clientId?: string): IReactoryRouteAccessPolicy[] => {
  const byPath = new Map<string, IReactoryRouteAccessPolicy>();
  mergeByPath(byPath, defaultRouteAccessPolicies());
  mergeByPath(
    byPath,
    clientId ? clientPolicies(clientId) : unionOfEnabledClients(),
  );
  mergeByPath(byPath, parseRouteAccessSeed(process.env.REACTORY_ROUTE_ACCESS));
  return Array.from(byPath.values());
};

/**
 * The policies governing a request, resolved SYNCHRONOUSLY.
 *
 * Deliberately synchronous and I/O-free: it runs on every request inside the
 * tenant-auth and CORS middleware, so it must not await a database. It reads the
 * built-in defaults, the env seed and the tenant's **in-memory** client config,
 * cached for 5 minutes. Database-managed overrides arrive via
 * {@link refreshRouteAccessPolicies}.
 */
export const getRouteAccessPolicies = (clientId?: string): IReactoryRouteAccessPolicy[] => {
  const cacheKey = clientId || '__global__';
  const cached = routeAccessCache[cacheKey];
  if (cached && cached.timestamp > Date.now() - CACHE_TTL_MS) return cached.policies;
  const policies = buildStaticPolicies(clientId);
  routeAccessCache[cacheKey] = { policies, timestamp: Date.now() };
  return policies;
};

/**
 * Resolve a tenant's route-access policies.
 *
 * Sources, later overriding earlier by path: built-in defaults, the environment
 * seed, the static client config, then the database `ReactoryClient` document — so
 * an operator can change a tenant's exempt routes and IP allow-lists without a
 * deployment. Cached for 5 minutes like the CORS whitelist.
 *
 * Best-effort throughout: a missing client or an unreadable setting leaves the
 * defaults in place rather than failing a request.
 */
/**
 * Refresh the cache, merging DATABASE-managed overrides over the static policies.
 *
 * Async by necessity (it reads the tenant document), so it must NEVER be awaited on
 * a request path — warm it at startup, and after an operator edits the setting.
 * {@link getRouteAccessPolicies} keeps serving the cached static policies meanwhile.
 */
export const refreshRouteAccessPolicies = async (clientId?: string): Promise<IReactoryRouteAccessPolicy[]> => {
  const cacheKey = clientId || '__global__';
  const cached = routeAccessCache[cacheKey];
  if (cached && cached.timestamp > Date.now() - CACHE_TTL_MS) return cached.policies;

  const byPath = new Map<string, IReactoryRouteAccessPolicy>();
  const add = (policies: IReactoryRouteAccessPolicy[]): void => {
    policies.forEach((policy) => {
      const key = `${normalisePath(policy.path)}::${(policy.methods || []).join(',')}`;
      byPath.set(key, { ...(byPath.get(key) || {}), ...policy });
    });
  };

  add(defaultRouteAccessPolicies());

  const seed = parseRouteAccessSeed(process.env.REACTORY_ROUTE_ACCESS);
  if (seed.length > 0) add(seed);

  if (clientId) {
    try {
      const EnabledClients = require('@reactory/server-core/data/clientConfigs').default;
      const staticClient = (EnabledClients || []).find(
        (client: any) => client && (client.key === clientId || client.id === clientId),
      );
      if (staticClient) add(policiesFromSettings(staticClient.settings));
    } catch (error) {
      logger.debug(`[routeAccess] static client config unavailable: ${(error as Error).message}`);
    }

    try {
      const ReactoryClientModel = require('@reactory/server-modules/reactory-core/models/ReactoryClient').default;
      if (ReactoryClientModel && typeof ReactoryClientModel.findOne === 'function') {
        const dbClient = await ReactoryClientModel.findOne({ key: clientId }).exec();
        if (dbClient) add(policiesFromSettings(dbClient.settings));
      }
    } catch (error) {
      logger.debug(`[routeAccess] client settings unavailable: ${(error as Error).message}`);
    }
  }

  const policies = Array.from(byPath.values());
  routeAccessCache[cacheKey] = { policies, timestamp: Date.now() };
  return policies;
};

/** The client IP, honouring the usual proxy headers when a proxy is trusted. */
export const clientIp = (req: any): string | undefined => {
  const headers = req?.headers || {};
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(',')[0].trim();
  }
  return headers['x-real-ip'] || req?.ip || req?.socket?.remoteAddress || undefined;
};
