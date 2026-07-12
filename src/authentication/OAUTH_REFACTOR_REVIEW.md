# OAuth Logic Review & Extraction Proposal

**Question:** Can we extract OAuth logic from `src/authentication` into helper
functions reusable by other flows (e.g. a Google Docs service, a LinkedIn flow
for the SocialEyes module)?

**Answer:** Yes — and we already have concrete evidence that we *should*. There
are currently **three parallel OAuth implementations** in the codebase, and a
fourth (MCP, see `modules/reactory-reactor/ai/macro/mcp/OAUTH_PLAN.md`) about to
be added. The shared logic is extractable into two layers.

## The three implementations today

1. **6 passport login strategies** (`strategies/{google,linkedin,github,facebook,microsoft,okta}`)
   — ~300–376 lines each, ~85% identical boilerplate. Purpose: SSO login →
   issue a Reactory JWT.
2. **`GoogleAuthService`** (`modules/reactory-google/services/GoogleAuthService.ts`)
   — a full, well-factored OAuth *token-lifecycle* service (authorize URL,
   code exchange, encrypted refresh-token store in a dedicated `GoogleToken`
   collection, auto-refresh, revoke, connection status, `getAuthorizedClient`).
   Purpose: call Google APIs *on the user's behalf* (offline access).
3. **(planned) MCP OAuth** — per `OAUTH_PLAN.md`, storing tokens on
   `user.authentications`.

**The core problem:** the login strategies **discard the refresh token** — they
persist only `accessToken` into `user.authentications[provider].props` (e.g.
`GoogleStrategy.ts:98`, `LinkedInStrategy.ts:122`). So they cannot support
API-access use-cases. That is *precisely why* `GoogleAuthService` was built as a
separate stack. Without extraction, **SocialEyes + LinkedIn will clone
`GoogleAuthService` a fourth time.**

## Measured duplication across the 6 strategies

Confirmed by inspection (`GoogleStrategy.ts`, `LinkedInStrategy.ts`) and grep
across all six:

| Concern | google | linkedin | github | facebook | microsoft | okta |
| --- | --- | --- | --- | --- | --- | --- |
| Manual `authentications.find/push` (not `user.setAuthentication`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Helpers.generateLoginToken` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| State via `StateManager` | — | ✅ | ✅ | ✅ | — | — |
| State via `encoder` | ✅ | — | — | — | — | — |

Each verify-callback repeats the same sequence: record telemetry → resolve
system user (`REACTORY_APPLICATION_EMAIL`) → resolve `context.partner` from state
(CSRF) → find-or-create user → **manually upsert `user.authentications`** →
update membership `lastLogin` → `generateLoginToken` → sanitize error. Each
route file repeats near-identical `/start`, `/callback`, `/failure` handlers.

## Inconsistencies / latent bugs to fix *while* extracting

- **Three different state mechanisms** for the same job:
  - `StateManager` (`security.ts:17`) — in-memory `Map`. **Does not survive
    restarts and breaks across multiple instances / clustered / serverless
    deployments** (state created on instance A won't validate on instance B).
  - `encoder` (`utils/encoding/encode.ts`) — AES-256-CBC + HMAC, **stateless**
    (correct for multi-instance).
  - `GoogleAuthService` — Redis + sha256 state key (a third pattern).
- **Key-name mismatch bug in Google**: `/auth/google/start` writes
  `req.session.authState` (`GoogleStrategy.ts:171`) but the verify callback
  decodes `session.oauthState` (`GoogleStrategy.ts:67`). The two keys differ.
- **Refresh tokens discarded** by all login strategies (see above).
- **Model method bypassed**: none use `user.setAuthentication()`
  (`models/User.ts:459`), which already does merge-by-provider + save + a
  `$patching` re-entrancy guard. All six hand-roll the array manipulation.

## Proposed extraction — two layers under `src/authentication/oauth/`

### Layer A — shared login-flow helpers (used by the passport strategies)

Stateless functions + a route factory so each strategy becomes *config + a
profile→user mapper*:

- `oauthState.create(data)` / `oauthState.consume(req)` — **one** implementation
  built on `encoder` (stateless, multi-instance-safe). Replaces `StateManager`
  and the ad-hoc google/redis variants. Carries `{ clientKey, flow, userId?,
  nonce, redirectTo? }`.
- `resolvePartnerFromState(req)` → sets `context.partner` from `clientKey`.
- `resolveSystemUser(context)` → the `REACTORY_APPLICATION_EMAIL` bootstrap.
- `upsertProviderAuthentication(user, provider, { accessToken, refreshToken,
  expiresAt, scopes, profileId, raw })` → wraps **`user.setAuthentication`** and
  **persists the refresh token + expiry** (fixes the dropped-refresh-token bug
  for free).
- `findOrCreateUserFromProfile(context, provider, normalizedProfile)`.
- `completeLogin(req, user, provider, clientKey)` → membership `lastLogin` +
  `generateLoginToken` + telemetry + audit.
- `registerOAuthRoutes(app, { provider, strategyName, scope, successRedirect,
  failureRedirect })` → generates `/start`, `/callback`, `/failure`.

Expected effect: each strategy shrinks from ~300 → ~60 lines (strategy
construction + a `normalizeProfile()` function).

### Layer B — a provider-agnostic token-access service (used by *services*)

Generalize `GoogleAuthService`'s lifecycle into a reusable
`core.OAuthTokenService` (or an abstract base + provider adapters), backed by the
platform-standard `user.authentications` store the user identified:

- `getAuthorizationUrl(provider, userId, scopes)`
- `handleCallback(provider, code, state)` → exchange + store **incl. refresh token**
- `getValidAccessToken(provider, userId)` → cached, auto-refresh
- `refresh / revoke / getConnectionStatus / getGrantedScopes / requestAdditionalScopes`
- **Provider adapters** describe endpoints, client id/secret, scope catalogue,
  and optional profile fetch:
  - `google` adapter wraps `google-auth-library` (port existing `GoogleAuthService`).
  - `generic-oauth2` adapter uses plain token/authorize endpoints — covers
    **LinkedIn for SocialEyes** and, notably, **MCP** (whose SDK already exposes
    `exchangeAuthorization`/`refreshAuthorization`).

Then:
- `GoogleAuthService` becomes a thin adapter (or is deprecated in favour of the
  base) — no behaviour change for existing Google consumers.
- **SocialEyes LinkedIn** = a ~small adapter + a call to `getValidAccessToken`.
- **MCP OAuth** (`OAUTH_PLAN.md`) plugs its `OAuthClientProvider`
  `tokens()/saveTokens()` into the same store instead of a bespoke one.
- Login (Layer A) can *feed* Layer B by persisting refresh tokens, so one login
  can grant both SSO and API access where scopes allow.

## Key decision: token storage model

Two stores exist today: `user.authentications` (embedded, unencrypted props) vs
`GoogleToken` (dedicated collection, AES-256-GCM encrypted, Redis-cached). The
user has pointed us at `user.authentications` as the platform convention.

**Recommendation:** standardize Layer B on `user.authentications` **with
field-level encryption** for token props (reuse
`modules/reactory-google/utils/token-encryption`), exposed behind a pluggable
`ITokenStore` interface so the dedicated-collection option remains available for
high-volume providers. This keeps one conceptual store while not regressing
Google's encryption-at-rest.

## Suggested sequencing

1. Extract **Layer A** state + `upsertProviderAuthentication` + route factory;
   migrate one OAuth2 strategy (LinkedIn) and one OIDC strategy (Okta) as
   proofs; fix the state-key bug and standardize on `encoder`. Strategy specs
   already exist (`*.spec.ts`) to guard the refactor.
2. Migrate the remaining four strategies.
3. Introduce **Layer B** `OAuthTokenService` + `ITokenStore`; port
   `GoogleAuthService` onto it behind its existing public API.
4. Build the SocialEyes LinkedIn adapter on Layer B.
5. Point the MCP OAuth provider (`OAUTH_PLAN.md`) at Layer B's store.

## Files referenced

- `strategies/security.ts:17` (`StateManager`), `strategies/helpers.ts:143` (`generateLoginToken`)
- `strategies/google/GoogleStrategy.ts:67,98,171`, `strategies/linkedin/LinkedInStrategy.ts:122,216`
- `utils/encoding/encode.ts` (`encoder`)
- `models/User.ts:147,459` (`authentications`, `setAuthentication`)
- `modules/reactory-google/services/GoogleAuthService.ts` (the token-lifecycle reference impl)
- `configure.ts:44` (module `passportProviders` route hook)
