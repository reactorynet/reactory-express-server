/**
 * Route Access Policies — the configurable answer to "which routes are exempt from
 * tenant authentication and CORS, and from which IP addresses?"
 *
 * Resolved by `src/express/routeAccess.ts` and consumed by both the tenant-auth
 * middleware (`ReactoryClient.ts`) and the CORS delegate (`cors.ts`), so the two
 * cannot drift apart. Precedence, lowest first:
 *
 *   1. built-in defaults (the old hardwired `bypassUri` behaviour)
 *   2. `REACTORY_ROUTE_ACCESS` env seed (JSON array) — deploy-time
 *   3. this setting, from the static client config
 *   4. the same setting on the `ReactoryClient` document — changeable at runtime
 *
 * ## The PayU callback
 *
 * PayU cannot send `x-client-key`, so the IPN route must exempt tenant auth. It is
 * **not** unprotected: the handler verifies the IPN signature over the merchant
 * salt before trusting anything, and `ipAllowList` is a second, cheaper layer.
 *
 * `ipAllowList` is seeded from `PAYMENT_PAYU_IP_ALLOWLIST` (the same variable the
 * handler's own allow-list reads) so there is one place to configure it. **When
 * that is unset the list is empty, which allows any source** — the route is then
 * protected by signature verification alone. Set it as soon as PayU publishes its
 * ranges.
 */
const payuIpAllowList: string[] = String(process.env.PAYMENT_PAYU_IP_ALLOWLIST || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

// No type annotation: the published `IReactoryClientSetting` only declares
// `name`/`componentFqn`/`data`, while every setting in this folder also carries
// `title`/`description`/`roles`/`settingType`/`variant`. Annotating produces an
// excess-property error, so this matches the sibling settings' unannotated shape.
const RouteAccessSetting = {
  title: 'Route Access Policies',
  name: 'routeAccess',
  description:
    'Routes exempt from tenant authentication and/or CORS, optionally restricted to source IP ranges. ' +
    'Longest matching path wins; omit a field to keep the secure default (auth required, CORS required, any IP).',
  componentFqn: 'core.RouteAccessForm@1.0.0',
  settingType: 'security',
  // Shape matches core.RouteAccessForm@1.0.0 (an object carrying `policies`), so what
  // the form saves is exactly what the engine reads. A bare array is also accepted,
  // for config-as-code that predates the form.
  data: {
    policies: [
      {
        path: '/api/payment/v1/webhooks/',
        methods: ['POST'],
        tenantAuth: false,
        cors: false,
        ipAllowList: payuIpAllowList,
        description: 'PayU IPN callback — public by necessity, signature-verified in the handler',
      },
      // Google Workspace module (reactory-google) — public endpoints.
      // The OAuth callback is a browser redirect FROM Google and carries no tenant
      // credential; the route resolves the user from the server-issued `state`
      // (cached in Redis) and is CSRF-protected by that state. Mirrors the built-in
      // `/auth/google/` exemption used by the platform login flow.
      {
        path: '/google/auth/callback',
        tenantAuth: false,
        cors: false,
        description: 'Google Workspace OAuth callback — tenant-less browser redirect; state-verified',
      },
      // Google Pub/Sub push notifications (Gmail/Calendar watch). Delivered by Google
      // infrastructure with no tenant credential; the route verifies a shared token.
      {
        path: '/google/webhooks/',
        methods: ['POST'],
        tenantAuth: false,
        cors: false,
        description: 'Google Pub/Sub push receiver — token-verified',
      },
    ],
  },
  roles: ['ADMIN'],
};

export default RouteAccessSetting;
