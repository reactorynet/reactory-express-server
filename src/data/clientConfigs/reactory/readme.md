# `reactory` client application configuration

## `reactory-client-core` CDN plugin: audit result (ORG-041b)

The `reactory` client application loads organisation components from **two** independent
paths at the same time:

1. **Generated submodule import** — `reactory-pwa-client/src/components/plugins/__index.ts`
   imports `./reactory-core` (the `reactory-client-core-pwa-plugin` submodule) and spreads
   its `components`. This is the canonical, current plugin.
2. **CDN plugin registration** — the `plugins` array in `index.ts` loads
   `cdn/plugins/reactory-client-core/lib/reactory.client.core.js` at runtime through
   `ReactoryApi.loadPlugins()`.

ORG-041b audited both paths to decide whether path 2 could be retired. **It cannot — yet.**
The submodule is *not* a superset of the CDN bundle: the CDN bundle is the only provider of
the whole authentication and user-administration surface (`core.Login@1.0.0`,
`core.Register@1.0.0`, `core.Logout@1.0.0`, `core.ForgotPassword@1.0.0`, the four OAuth
buttons, the membership/role selectors, user import, `core.UserDemographics@1.0.0`, …), and
the seed routes in `routes/index.ts` point straight at several of them.

Removing the entry today would leave `/login`, `/register`, `/logout`, `/forgot`,
`/reset-password` and the OAuth buttons unresolved (`component not loaded`) — the application
could not be signed into. The registration is therefore **retained deliberately**, and this
document records the evidence so the next attempt starts from facts instead of assumption.

### Method

* CDN bundle: served from `CDN_ROOT/plugins/reactory-client-core/lib/reactory.client.core.js`
  (387 KB, built 2026-03-11, source repo `reactorynet/reactory-client-core-plugin`, i.e. a
  *different* repository from the submodule). Loaded in a browser page with a stubbed
  `window.reactory.api`; `registerComponent(namespace, name, version, …)` calls were recorded.
  The bundle's `install()` registers **27** FQNs — the 26 entries of its `components` array
  plus the `reactory-core.ReactoryCoreClientPlugin@1.0.0` marker.
* Submodule plugin: `reactory-client-core-pwa-plugin` at `830dee2`, whose
  `index.ts` spreads the `components` arrays of `content-management`,
  `application-management`, `organization-management`, `sql-editor` and `graphql-editor`
  — **22** FQNs. (`demographic-form` and `theme-editor` are re-exported helpers, not
  registry entries.)
* Client registry: `reactory-pwa-client/src/components/index.tsx` (`componentRegistery`).

### Coverage table

`CDN` = registered by the CDN bundle, `SUB` = registered by the submodule plugin,
`CLIENT` = registered by the pwa client's own registry (`componentRegistery`).

`✅` means a **working** provider. `⚠️` means an FQN *is* registered under that exact key but
the registration is not a usable component — a throwing placeholder or a different version.
The distinction matters: resolving an FQN only proves something answered to that key, not
that the screen renders.

| Component FQN | CDN | SUB | CLIENT | Notes |
| --- | :---: | :---: | :---: | --- |
| `reactory-core.ReactoryCoreClientPlugin@1.0.0` | ✅ | ❌ | ❌ | plugin install marker |
| `reactory-core.ReactoryClientSelector@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `reactory-core.ReactoryBusinessUnitSelector@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `reactory-core.EmailTemplateEditor@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** (stub: renders "WORK IN PROGRESS") |
| `core.ReactoryOrganizationSelector@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; unused by this app's routes |
| `core.UserImportForm@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.UserImportButton@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.UserFileImportStatus@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.ReactoryMembershipRoles@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.ReactoryCreateUserMembership@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.UserDemographics@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** (pre-ORG-035 self-service demographics) |
| `core.ResetPassword@1.0.0` | ✅ | ❌ | ⚠️ | **CDN-only in practice**: the client registers a *throwing placeholder* — `component: () => new Error('Complete core.ResetPassword Migratation to reactory-user plugin')` at `reactory-pwa-client/src/components/index.tsx:551-558`. The CDN bundle is the only **working** provider, so `/reset-password` throws without it. |
| `core.UserList@1.0.0` | ✅ | ❌ | ✅ | |
| `core.Profile@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.UserProfile@1.0.0` | ✅ | ❌ | ⚠️ | client registers `1.0.1`; the route pins `1.0.1` |
| `core.EditProfile@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.ReactoryUserProfile@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.ReactoryUserProfileGeneral@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.Login@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/login` route + `App.tsx` boot dependency |
| `core.Register@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/register` route |
| `core.ForgotPassword@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/forgot`, `/send-link` routes |
| `core.Logout@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/logout` route |
| `core.TwoFactorAuth@1.0.0` | ✅ | ❌ | ❌ | **CDN-only** |
| `core.GoogleLoginButton@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/login` `authlist` |
| `core.MicrosoftLoginButton@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/login` `authlist` |
| `core.GitHubLoginButton@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/login` `authlist` |
| `core.OktaLoginButton@1.0.0` | ✅ | ❌ | ❌ | **CDN-only**; `/login` `authlist` |
| `core.ContentStatusBadge@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `core.ContentFormatBadge@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `core.ContentDetailPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `core.ContentManagementToolbar@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `core.ContentEditorDrawer@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `core.NewContentDialog@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `core.ContentManagementPage@1.0.0` | ❌ | ✅ | ❌ | submodule only; `/content` route |
| `core.SQLQueryEditor@1.0.0` | ❌ | ✅ | ❌ | submodule only; `/data/sql-editor/*` route |
| `core.GraphQLEditor@1.0.0` | ❌ | ✅ | ❌ | submodule only; `/data/graphiql/*` route |
| `reactory.ApplicationOverviewPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationSettingsPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationUsersPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationOrganizationsPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only; legacy `/organizations/` route (ORG-042) |
| `reactory.ApplicationRolesPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationThemesPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationStatisticsPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationRoutesPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationMenusPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.ApplicationFeatureFlagsPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only |
| `reactory.OrganizationListPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only; `/organizations/manage/` |
| `reactory.OrganizationCreatePage@1.0.0` | ❌ | ✅ | ❌ | submodule only; `/organizations/manage/create` |
| `reactory.OrganizationDetailPanel@1.0.0` | ❌ | ✅ | ❌ | submodule only; `/organizations/manage/:id` |

Summary: 27 CDN FQNs, 22 submodule FQNs, **zero FQN overlap** between the two.

Two counts, because at FQN level they differ by one:

* **25 CDN FQNs have no other registration at all** — the 23 components marked "**CDN-only**"
above, plus `core.UserProfile@1.0.0` and the plugin marker.
* **26 CDN FQNs have no other *working* provider** — the same list plus
`core.ResetPassword@1.0.0`. The client registry does claim that key, but the value is a
`() => new Error(...)` placeholder, so it resolves and then throws on render. Only
`core.UserList@1.0.0` is a genuine client-side provider.

`core.UserProfile@1.0.0` is counted above even though the client registers `1.0.1`, because
resolution is by exact `nameSpace.name@version` — the `1.0.1` entry does not shadow the
bundle's `1.0.0`, and `/profile` pins `1.0.1` anyway.

The organisation management panels the ORG programme built are served exclusively by the
submodule, so nothing in ORG-010…ORG-024 is affected either way.

### Why "remove the entry" is not the supported change

* `plugins` **is** reconciled as a whole collection — `RECONCILABLE_COLLECTION_FIELDS` in
  `models/ReactoryClient/statics.ts` includes `plugins`, and `upsertFromConfig` assigns the
  array wholesale (`Object.assign` + `markModified`), with `applyReconcileDefaults` clearing
  it when the field is omitted during the `reconcile: true` seed pass. Reconciliation is
  **not** additive-only, so deleting the entry really would delete the stored document entry
  on the next start. The blocker is functional (missing components), not mechanical.
* `Presets.plugins.clientCore()` in `../helpers/configBuilder.ts` still exposes the same
  registration for other app definitions — it is referenced only from doc comments today.

### Preconditions for actually retiring it (follow-up work)

The registration can be removed in a single commit once **all** of the following hold:

1. `core.Login`, `core.Register`, `core.ResetPassword`, `core.ForgotPassword`, `core.Logout`,
   `core.TwoFactorAuth` and the four `core.*LoginButton` widgets are registered by the pwa
   client (client registry or the `reactory-core` plugin submodule). **`core.ResetPassword`
   needs a *real* component, not the existing placeholder** — the key is already claimed in
   `components/index.tsx`, so the migration is easy to mistake for done.
2. The user-administration surface (`core.Profile`, `core.EditProfile`,
   `core.ReactoryUserProfile`, `core.ReactoryUserProfileGeneral`, `core.UserImport*`,
   `core.ReactoryMembershipRoles`, `core.ReactoryCreateUserMembership`,
   `core.UserDemographics`, `reactory-core.ReactoryClientSelector`,
   `reactory-core.ReactoryBusinessUnitSelector`) is either ported or confirmed unused.
3. `core.ReactoryOrganizationSelector@1.0.0` is deleted rather than ported — no route in this
   app references it, so porting it would perpetuate a redundant organisation UI.
4. `App.tsx`'s `dependencies` array no longer lists `core.Login@1.0.0`, or the client
   registers it locally.
5. `./bin/jest.sh reactory local 'clientConfig'` still passes — the guard in
   `__tests__/pluginCoverage.test.ts` pins exactly this contract.

`core.ReactoryPasswordField@1.0.0` is also written directly into
`reactory.componentRegister` by the bundle (not through `registerComponent`), so it does not
show up in the install-time inventory above; any port must account for it separately.

The same placeholder trap exists outside this file: `booktutor/__tests__/adminRoutes.test.ts:67`
annotates `core.ResetPassword@1.0.0` as a "pwa client componentRegistery" provider. It is not
one. That file is gitignored in this checkout, so the correction belongs with whoever owns the
booktutor configs — do not read it as corroboration of a working client-side provider.

Anything that remains CDN-only after that porting work belongs in the stale plugin repository
(`reactory-data/plugins/reactory-client-core`, outside the ORG programme repos) and needs its
own ticket — deleting the registration is not a substitute for porting.
