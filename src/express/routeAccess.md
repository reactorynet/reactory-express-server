# Route Access Policies

How to make a route public — and optionally restrict it to a set of IP addresses —
without a code change.

Implementation: `src/express/routeAccess.ts`. Consumed by two middleware points that
must agree:

- `src/express/middleware/ReactoryClient.ts` — tenant/client authentication
- `src/express/cors.ts` — the CORS origin check

## The problem this replaces

Both middleware files used to carry their own **hardwired** `bypassUri` array, matched
with a loose `path.includes(uri)`. That meant:

- opening a route required a code change and a deploy;
- there was no way to say "public, but only from these addresses";
- the two lists drifted apart (they already had different entries);
- `includes()` matched substrings — `'/login'` also exempted `/api/login-ish`.

## Configuring a route

Policies are an array. Each entry:

| Field | Default | Meaning |
|---|---|---|
| `path` | *required* | Path prefix. **Longest match wins.** |
| `methods` | all | Restrict to these HTTP methods. |
| `tenantAuth` | `true` | `false` exempts the route from the tenant credential. |
| `cors` | `true` | `false` exempts it from the origin check. |
| `ipAllowList` | *(any)* | Allowed source addresses: exact IPs, IPv4 CIDR ranges, or `*`. |
| `description` | — | Free text for operators. |

### Where to put it

Sources, lowest precedence first:

1. **Built-in defaults** — the previous `bypassUri` behaviour (`/login`, `/cdn/…`,
   `/auth/<provider>/`, `/health`, …). Code, not configuration.
2. **`REACTORY_ROUTE_ACCESS`** — a JSON array in the environment. Deploy-time, and the
   easiest way to get a route open on a fresh environment.
3. **A client setting named `routeAccess`** — in the tenant's config
   (`src/data/clientConfigs/<client>/settings/routeAccess.ts`) or on the
   `ReactoryClient` document, so an operator can change it at runtime.

Entries are merged by `path` + `methods`: a later source overrides the matching earlier
one, so a tenant can tighten or relax a built-in default.

### Recipe: the PayU IPN callback

PayU cannot send `x-client-key`, so the route must exempt tenant auth:

```json
[
  {
    "path": "/api/payment/v1/webhooks/",
    "methods": ["POST"],
    "tenantAuth": false,
    "cors": false,
    "ipAllowList": ["41.0.0.0/8", "196.44.0.0/16"],
    "description": "PayU IPN callback"
  }
]
```

Set it as `REACTORY_ROUTE_ACCESS`, or in the tenant's `routeAccess` setting. The
`ipAllowList` is seeded from **`PAYMENT_PAYU_IP_ALLOWLIST`** (comma-separated) in the
shipped config, so there is one variable to configure.

> **An empty `ipAllowList` allows any source.** The route is then protected only by the
> handler's signature verification. That is *sufficient* — the IPN signature is the real
> control — but the allow-list is a cheap second layer. Set it as soon as PayU
> publishes its ranges. The handler applies its own allow-list too
> (`PayUWebhookHandler`), so a misconfigured route policy is not the only defence.

## Scope: route policies are server-wide

A route is mounted once on the server and is **not** tenant-scoped, so a route
exemption is inherently server-wide. When a request carries no tenant key — which is
exactly what a payment provider sends — the policy is resolved from the **union of
every enabled client's config**, merged permissively:

- `tenantAuth` / `cors`: `false` from any client wins (the exemption is a deliberate act)
- `methods`: omitted by any client means all methods
- `ipAllowList`: omitted by any client means unrestricted; otherwise the union

This matters more than it looks. An earlier version resolved policies per tenant only,
so a tenant-less request fell back to the built-in defaults and the PayU callback still
returned **401** — the exemption was configured but unreachable by the very requests it
was meant for. When you test a public route, test it **without** a tenant credential.

## Design constraints (why it looks like this)

1. **Resolution is synchronous and I/O-free.** It runs on *every request*, so it reads
   the built-in defaults, the env seed and the tenant's **in-memory** client config,
   cached for 5 minutes. An earlier version awaited a database read here; that hung the
   CORS delegate when no database was reachable and broke the middleware's synchronous
   contract. Database-managed overrides come from
   `refreshRouteAccessPolicies()`, which is async and must never be awaited on a request
   path — warm it at startup or after an operator edits the setting.
2. **Deny on failure.** If a policy cannot be evaluated, the request does **not** get
   the benefit of the doubt (CORS falls through to the normal origin check; the tenant
   middleware answers 503).
3. **One source of truth.** Both middleware points call the same engine, so an
   exemption cannot apply to one and not the other.
4. **IP checks are independent of `tenantAuth`.** A route can be public *and*
   IP-restricted.
5. **Unsupported ranges fail closed.** An IPv6 CIDR is not evaluated (and therefore not
   matched) rather than silently passing.

## Operational notes

- **Denied requests are logged** with the path, the source address and the matched
  policy (`Route access denied for …`), so an allow-list mistake is visible.
- **Cache**: 5 minutes per tenant key. `clearRouteAccessCache(clientId?)` invalidates.
- **Client IP** comes from `x-forwarded-for` (first hop), then `x-real-ip`, then
  `req.ip` / the socket — so it is only meaningful behind a trusted proxy that sets
  those headers.
- **Follow-up**: the setting is bound to **`core.RouteAccessForm@1.0.0`**
  (`src/modules/reactory-core/forms/Security/RouteAccess`) — a repeatable policy list.
  Form field names are the **engine's** field names (`tenantAuth`, `cors`,
  `ipAllowList`): there is no translation layer, and
  `src/express/__tests__/routeAccess.form.test.ts` fails if the two ever drift — a
  friendlier key would save fine and then be silently ignored, leaving a route open.
- **Two accepted setting shapes**: the object the form edits (`{ policies: [...] }`)
  and a bare array (config-as-code). Both are read.
- **`PAYMENT_PAYU_IP_ALLOWLIST` is read at module load** — set it before starting the
  server; changing it at runtime has no effect until a restart.
