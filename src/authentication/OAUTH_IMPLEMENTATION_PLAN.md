# Authentication Layer — OAuth Extraction Implementation Plan

> Companion to `OAUTH_REFACTOR_REVIEW.md` (the review that motivates this) and
> `modules/reactory-reactor/ai/macro/mcp/OAUTH_PLAN.md` (the MCP flow, which
> builds on Layer B produced here).

## Context

`src/authentication` today carries **three parallel OAuth implementations**
(6 near-identical passport login strategies; the separate `GoogleAuthService`
token-lifecycle stack; and a planned MCP flow). The login strategies discard
refresh tokens, hand-roll `user.authentications` instead of the model's
`setAuthentication`, and use **three different state mechanisms** (one of which,
`StateManager`, is an in-memory `Map` that breaks across instances/restarts).
This plan extracts the shared logic into two layers so login, service-to-API
access (Google Docs, SocialEyes LinkedIn), and MCP all share one battle-tested
path, and fixes the latent bugs on the way.

**Outcome:** each login strategy drops from ~300 → ~60 lines; any service can
obtain a valid, auto-refreshed access token for a user+provider with one call;
refresh tokens are persisted; state is stateless and multi-instance-safe.

## Non-goals

- No change to login UX or JWT issuance semantics.
- No forced data migration of the existing `GoogleToken` collection (a store
  adapter keeps it working; migration is an optional later phase).

## New layout: `src/authentication/oauth/`

```
oauth/
  state.ts                 # stateless OAuth state (create/consume) via encoder
  token-crypto.ts          # AES-256-GCM helpers (promoted from reactory-google)
  login-helpers.ts         # Layer A: partner/user/auth/login composition
  routes.ts                # Layer A: registerOAuthRoutes() login-route factory
  service-routes.ts        # Layer B: connect/callback routes for API-access grants
  token-store.ts           # Layer B: ITokenStore + UserAuthenticationsTokenStore
  OAuthTokenService.ts     # Layer B: core.OAuthTokenService@1.0.0
  providers/
    types.ts               # IOAuthProviderAdapter
    generic-oauth2.ts       # plain OAuth2 (LinkedIn, MCP-capable: PKCE)
    google.ts              # wraps google-auth-library
    registry.ts            # registerOAuthAdapter / getOAuthAdapter
  index.ts
  __tests__/
```

## Reused existing building blocks

- `utils/encoding/encode.ts` — `encoder.encodeState/decodeState` (AES-256-CBC +
  HMAC, **stateless**). The single state primitive going forward.
- `modules/reactory-google/utils/token-encryption.ts` — `encryptToken`,
  `decryptToken`, `generateEncryptionSalt` (AES-256-GCM, scrypt-derived key).
  **Promote** to `oauth/token-crypto.ts`; re-export from the old path for
  back-compat.
- `models/User.ts:459` — `user.setAuthentication({provider,props,lastLogin})`
  (merge + save + `$patching` guard), `getAuthentication`, `removeAuthentication`.
- `strategies/helpers.ts:143` — `Helpers.generateLoginToken`.
- `strategies/security.ts` — `ErrorSanitizer`, `AuthAuditLogger`, `RateLimiter`
  (keep; only `StateManager` is superseded).
- `strategies/telemetry.ts` — `AuthTelemetry` (keep).
- `configure.ts:44` — module `passportProviders` route-registration hook;
  strategy list in `strategies/index.ts` (`ReactoryPassportProviders`).
- `modules/reactory-google/services/GoogleAuthService.ts` — the reference
  token-lifecycle shape Layer B generalizes; `scope-helpers` for the scope catalog.
- Service pattern: `@service({...})` decorator + `IReactoryServiceDefinition`
  (as in `GoogleAuthService`), resolved via `context.getService(id)`.

---

## Layer A — shared login flow (the 6 passport strategies)

### `state.ts`
```ts
export interface OAuthStateData {
  clientKey: string; flow: string; userId?: string;
  nonce: string; ts: number; redirectTo?: string;
}
export const createState = (d: Omit<OAuthStateData,'nonce'|'ts'>): string   // encoder.encodeState
export const consumeState = (req): OAuthStateData | null                     // read query.state (preferred) else session.authState; decodeState; TTL + nonce check
```
- Standardize on the OAuth **`state` query param** the IdP echoes back (works
  statelessly across instances); session is fallback only.
- Keep `StateManager` for one release as a thin `@deprecated` shim delegating to
  `state.ts`, then delete (fixes the multi-instance breakage and the Google
  `authState`/`oauthState` key mismatch, `GoogleStrategy.ts:67` vs `:171`).

### `login-helpers.ts`
- `resolveSystemUser(context)` — the `REACTORY_APPLICATION_EMAIL` bootstrap.
- `resolvePartner(context, clientKey)` — `ReactoryClient.findOne({ key })`.
- `findOrCreateUserFromProfile(context, provider, profile)` — find-or-create +
  avatar (the block repeated in every strategy).
- `upsertProviderAuthentication(user, provider, tokenSet)` — wraps
  **`user.setAuthentication`**, persisting `{ profileId, displayName,
  access_token, refresh_token, expires_at, scope, raw }`. **Persists the refresh
  token** (today's strategies drop it). Encrypts token fields via `token-crypto`
  when `OAUTH_ENCRYPT_EMBEDDED_TOKENS=true`.
- `completeLogin(req, user, provider, clientKey)` — membership `lastLogin` +
  `generateLoginToken` + `AuthTelemetry.recordSuccess` + `AuthAuditLogger.logSuccess`.
- `handleVerify(req, provider, normalizedProfile, accessToken, refreshToken, params, done)`
  — orchestrator composing the above with unified error sanitizing/telemetry.

`NormalizedProfile = { id, email, firstName, lastName, displayName?, avatarUrl? }`
— each strategy supplies a tiny `normalize<Provider>Profile(raw)`.

### `routes.ts`
```ts
registerOAuthRoutes(app, {
  provider, strategyName, scope: string[],
  buildSuccessRedirect?, buildFailureRedirect?   // defaults: `${partner.siteUrl}?auth_token=` / `/auth/<p>/failure`
})
```
Generates `/auth/:provider/start|callback|failure` with shared state +
`onCompletion` redirect logic.

### Per-strategy result (example, Google)
```ts
export const GoogleStrategy = new PassportGoogleStrategy(cfg,
  (req, at, rt, profile, done) =>
    handleVerify(req, 'google', normalizeGoogleProfile(profile), at, rt, undefined, done));
export const useGoogleRoutes = (app) =>
  registerOAuthRoutes(app, { provider:'google', strategyName:'google', scope: GOOGLE_OAUTH_SCOPE.split(' ') });
```
OIDC strategies (microsoft `passport-azure-ad`, okta `passport-openidconnect`)
use the OIDC verify signature but map to the same `handleVerify`.

---

## Layer B — provider-agnostic token access (services & MCP)

### `token-store.ts`
```ts
export interface StoredToken {
  accessToken: string; refreshToken?: string; expiresAt?: Date;
  scopes?: string[]; accountId?: string; accountEmail?: string;
  raw?: Record<string,unknown>; connectedAt: Date; lastRefreshedAt?: Date; revokedAt?: Date;
}
export interface ITokenStore {
  get(userId, providerKey): Promise<StoredToken | null>;
  set(userId, providerKey, token: StoredToken): Promise<void>;
  remove(userId, providerKey): Promise<void>;
}
```
- **`UserAuthenticationsTokenStore`** (default) — backed by
  `user.getAuthentication(providerKey)` / `setAuthentication`. Token fields
  encrypted with `token-crypto` (per-user salt in props; master key
  `OAUTH_TOKEN_ENCRYPTION_KEY`, fallback `GOOGLE_TOKEN_ENCRYPTION_KEY`).
- **`CollectionTokenStore`** (optional) — dedicated collection, lets
  `GoogleToken` keep working during migration.
- **Provider-key convention:** `oauth:<provider>` for API-access grants, kept
  **distinct** from the SSO login entry (`google`, `linkedin`, …) so connecting a
  service with extra scopes doesn't clobber the login identity, and incremental
  scopes are tracked independently.

### `providers/types.ts`
```ts
export interface TokenResponse { accessToken; refreshToken?; expiresIn?; scope?; raw }
export interface IOAuthProviderAdapter {
  provider: string;
  buildAuthorizationUrl(o:{ redirectUri; scopes; state; userId; codeChallenge? }): string|Promise<string>;
  exchangeCode(o:{ code; redirectUri; codeVerifier? }): Promise<TokenResponse>;
  refresh(o:{ refreshToken }): Promise<TokenResponse>;
  revoke?(o:{ accessToken }): Promise<void>;
  fetchAccountInfo?(accessToken): Promise<{ id?; email? }>;
  defaultScopes?: string[];
  scopeCatalog?(services: string[]): string[];
}
```
- `GenericOAuth2Adapter(config)` — plain `authorizationUrl`/`tokenUrl`/`clientId`/
  `clientSecret`/`revokeUrl?`; **supports PKCE** (`codeVerifier`/`codeChallenge`)
  so it is directly reusable by MCP. Covers LinkedIn.
- `GoogleAdapter` — wraps `google-auth-library` (offline access, incremental
  scopes); `scopeCatalog` delegates to existing `scope-helpers`.
- `registry.ts` — `registerOAuthAdapter(adapter)` / `getOAuthAdapter(provider)`;
  core registers `google`; modules (SocialEyes) register their own at load.

### `OAuthTokenService.ts` (`core.OAuthTokenService@1.0.0`)
Singleton `@service`, deps: `core.UserService`, optional `core.RedisService`.
Generalizes `GoogleAuthService`:
- `getAuthorizationUrl(provider, userId, scopes?)` — adapter + `createState`.
- `handleCallback(provider, code, state)` — `consumeState`, `adapter.exchangeCode`,
  `fetchAccountInfo?`, `store.set`, audit.
- **`getValidAccessToken(provider, userId)`** — the primary consumer call:
  store.get → if expired/near-expiry `adapter.refresh` + store.set; Redis cache
  with TTL (mirrors `GoogleAuthService.getToken`).
- `refresh`, `revoke`, `getConnectionStatus`, `getGrantedScopes`,
  `requestAdditionalScopes(provider, userId, services)`.

### `service-routes.ts`
`registerServiceOAuthRoutes(app)` → `/auth/oauth/:provider/connect` (start) and
`/auth/oauth/:provider/callback` that call `OAuthTokenService.getAuthorizationUrl`
/ `handleCallback` and redirect to a `redirectTo` from state. These **connect an
account** (no JWT issuance) — the flow SocialEyes/Google-Docs use.

### GoogleAuthService migration
Reimplement its methods as thin delegations to `OAuthTokenService` + `GoogleAdapter`,
**preserving its public API** (`getToken`, `getAuthorizedClient`,
`getConnectionStatus`, `revokeAccess`, `requestAdditionalScopes`). Keep the
`GoogleToken` collection behind `CollectionTokenStore` initially; migrate to
`user.authentications` in a later phase if desired. No behaviour change for
existing Google consumers.

### SocialEyes LinkedIn (the payoff)
Register a `GenericOAuth2Adapter` for `linkedin`; the SocialEyes service calls
`oauthTokenService.getValidAccessToken('linkedin', userId)`. Connect via the
service-access routes. No new OAuth plumbing.

---

## Bugs fixed as part of this work

1. **Fragmented state** → one `encoder`-based stateless impl (multi-instance-safe).
2. **Google `authState` vs `oauthState`** key mismatch → single `consumeState`.
3. **Dropped refresh tokens** → `upsertProviderAuthentication` + token store persist them.
4. **Bypassed `setAuthentication`** → all persistence routes through the model method.

## Testing / verification

- Existing `strategies/**/**.spec.ts` guard each strategy across the refactor —
  run per migration; behaviour must be unchanged.
- New unit tests: `state` round-trip + tamper/expiry; `upsertProviderAuthentication`
  (mock `user.setAuthentication`, assert refresh_token persisted); `token-crypto`
  round-trip; `UserAuthenticationsTokenStore` encrypt/decrypt; `OAuthTokenService.
  getValidAccessToken` refresh path (mock adapter + clock); `GenericOAuth2Adapter`
  exchange/refresh (mock fetch).
- E2E (dev): migrated LinkedIn login → `/auth/linkedin/start` → callback issues
  JWT **and** `user.authentications.linkedin.props.refresh_token` is present.
  Then SocialEyes connect → `getValidAccessToken('linkedin', userId)` returns a
  token and transparently refreshes when the access token is expired.

## Sequencing (each phase independently reviewable / mergeable)

- **Phase 0** — promote `token-crypto`; add `OAUTH_TOKEN_ENCRYPTION_KEY` (+ fallback).
- **Phase 1** — Layer A (`state`, `login-helpers`, `routes`); migrate **LinkedIn**
  (OAuth2) + **Okta** (OIDC) as proofs; fix state bug; `StateManager` → deprecated shim.
- **Phase 2** — migrate remaining four strategies; delete `StateManager`.
- **Phase 3** — Layer B (`token-store` + `UserAuthenticationsTokenStore` +
  adapters + `OAuthTokenService` + `service-routes`).
- **Phase 4** — port `GoogleAuthService` onto Layer B behind its current API.
- **Phase 5** — SocialEyes LinkedIn adapter + connect flow.
- **Phase 6** — MCP OAuth on Layer B (see `OAUTH_PLAN.md`).

## Open decisions to confirm at review

1. **Provider-key separation** `oauth:<provider>` (API access) vs the SSO entry
   — recommended (keeps identity vs. grant distinct) but adds a second entry per
   provider for users who both log in with and connect the same provider.
2. **Embedded vs collection storage** as the default for Layer B
   (`user.authentications` encrypted — recommended, per your steer — vs. keeping
   dedicated collections for high-volume providers via `CollectionTokenStore`).
3. **Encrypt embedded login tokens too** (`OAUTH_ENCRYPT_EMBEDDED_TOKENS`) or
   only Layer-B service tokens.
4. Whether to **migrate `GoogleToken` data** into `user.authentications` in
   Phase 4 or leave it on `CollectionTokenStore` indefinitely.
