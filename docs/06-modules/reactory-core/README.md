---
title: reactory-core
status: Implemented
owner: core
verified: 2026-10-19
verifiedAgainst: reactory-express-server@59639fe09622
audience: developer
---

# `reactory-core`

**FQN:** `core.ReactoryServer@1.0.0` · **Licence:** Apache-2.0 · **Registry entry:** `available.json` → `reactory-core`

`reactory-core` is the canonical implementation of the Reactory module contract. Everything else in the
platform is written against the abstractions it provides: the user/organisation/tenancy model, the file
and CDN service, templates and email, SQL and search, the workflow engine host, the core GraphQL schema
and resolvers, the CLI surface, migrations and feature flags.

It is also the reference implementation — when the architecture page on the module system describes an
extension point, this is the module that exercises all of them.

> **Where the detail lives.** Sections 2, 4, 5 and 7 are enumerations and are **generated** into
> [`07-reference/modules/reactory-core.md`](../../07-reference/modules/reactory-core.md). This page
> carries the narrative, the caveats and the evidence; it does not restate the tables.
> Regenerate the reference with `node scripts/docs/generate-core-module-reference.js`.

---

## 1. Purpose & status

**Status: Implemented.** The module loads, contributes every extension point, and is depended on by the
rest of the platform. It is not "complete" in the sense of being finished — §9 lists the boundaries and
the known defects — but nothing in this page is aspirational.

### What it does

| Responsibility | Where |
|---|---|
| **Tenancy** — `ReactoryClient` is the tenant record; application roles, themes, routes, menus, feature flags and auth config hang off it | `src/modules/reactory-core/models/ReactoryClient/schema.ts` |
| **Identity** — users, memberships, peer relationships, sessions, credentials, password auth | `src/modules/reactory-core/services/UserService.ts`, `models/User.ts`, `services/SecurityService/SecurityService.ts` |
| **Org structure** — organisations, business units, teams, organigrams, demographics | `models/Organization.ts`, `models/BusinessUnit.ts`, `models/Team.ts`, `models/Organigram.ts` |
| **Files & CDN** — upload, storage, remote sync, folders, SSE transport for live file sessions | `services/ReactoryFileService.ts`, `models/CoreFile.ts`, `services/FileSSETransportManager.ts` |
| **Templates & email** — EJS template registry and rendering, email composition, queued sends | `services/TemplateService/TemplateService.ts`, `services/EmailService.ts`, `models/Template.ts`, `models/EmailQueue.ts` |
| **Data access** — SQL over registered connections, Mongo, search providers (Meilisearch/Elasticsearch), Redis cache, rate limiting | `services/ReactorySQLService.ts`, `services/ReactorySearchService.ts`, `services/search/providers/`, `services/RedisService.ts`, `services/RateLimiterService.ts` |
| **Workflow engine host** — lifecycle, scheduler, security manager, error handler, YAML step registry and 38 registered step types | `workflow/` |
| **GraphQL core** — 39 SDL modules, resolver map, and the `@auth` directive | `graph/types/index.ts`, `resolvers/index.ts`, `graph/directives/AuthDirective.ts` |
| **Forms library** — core forms and the component/widget definitions the PWA renders | `forms/` |
| **Operations** — CLI definitions, migrations, feature flags, audit log | `cli/index.ts`, `migrations/`, `index.ts`, `services/ReactoryAuditService.ts` |

### What it explicitly does **not** do

- **No client plugins.** `clientPlugins: []` and `serverPlugins: []`
  (`src/modules/reactory-core/index.ts:32-33`). Core ships forms and widget *definitions*; the bundles
  are delivered by the PWA client.
- **No gRPC service.** `grpc: null` (`src/modules/reactory-core/index.ts:37`). A `ProtoServerCli` exists
  in `cli/proto-srv/`, but the module contributes no gRPC server.
- **No PDF generation.** `pdfs: []` (`src/modules/reactory-core/index.ts:39`). `PdfService` wraps a
  PDF library for ad-hoc generation; the module's `pdfs` extension point is empty.
- **No general-purpose data ingestion.** See §9 — `services/ETL` is a user/demographic import feature.
- **No agent runtime.** Personas, providers, macros and skills belong to `reactory-reactor`; core
  supplies the `ReactoryClient` and `User` records the agent layer resolves against.

---

## 2. Module contract

Reference implementation of `Reactory.Server.IReactoryModule`, declared in
`src/modules/reactory-core/index.ts:14-156`.

| Field | Value | Evidence |
|---|---|---|
| `id` | `reactory-core` | `src/modules/reactory-core/index.ts:15` |
| `nameSpace` | `core` | `src/modules/reactory-core/index.ts:16` |
| `name` | `ReactoryServer` | `src/modules/reactory-core/index.ts:18` |
| `version` | `1.0.0` | `src/modules/reactory-core/index.ts:17` |
| **FQN** | **`core.ReactoryServer@1.0.0`** | registry: `src/modules/available.json` |
| `dependencies` | `[]` — no module-level dependencies | `src/modules/reactory-core/index.ts:19` |
| `priority` | `0` — loads first | `src/modules/reactory-core/index.ts:20` |
| `licence` | Apache-2.0 | `src/modules/available.json` |

Because `dependencies` is empty and `priority` is `0`, core is the load-order root: a module that
depends on `core.UserService@1.0.0` is guaranteed to resolve it after core has registered. A module
that declares a dependency on core and is *itself* priority `0` has no ordering guarantee against core
beyond the dependency edge.

The extension points it contributes — and the ones it deliberately leaves empty — are enumerated in
**[§2 of the generated reference](../../07-reference/modules/reactory-core.md#2-module-contract--extension-points)**.

---

## 3. Data model

Core owns 41 collections and entities — 31 mongoose collections and 10 typeorm entities. The full table
with `file:line` is generated
in [§3 of the reference](../../07-reference/modules/reactory-core.md#3-data-model--collections-and-entities).
This section describes the ones with semantics a reader needs.

### Tenancy and identity

**`reactory_clients`** (`models/ReactoryClient/schema.ts:32`) — the tenant. One document per deployed
application. Carries `key`, `siteUrl`, `applicationRoles`, `themes`, `mode`, `menus`, `routes`,
`auth_config`, `settings`, `whitelist`, `plugins`, `featureFlags`. Every request resolves its
`context.partner` from this collection.

The tenant `key` is stored **in plaintext**, unique and lowercased (`schema.ts:34-39`) — it is not
hashed. The hashed key is a different artefact: `keyHash` exists only on `ServiceKeySchema`
(`schema.ts:24-30`), the per-tenant service credentials used for machine-to-machine calls. Treat the
tenant `key` as a secret because it is one.

**`reactory_users`** (`models/User.ts:685`) — the user record. `memberships[]` holds
`{ client, organization, businessUnit, roles[] }`; `roles[]` is the legacy flat list;
`socials`, `authentications`, `avatar`, `avatarProvider`, `password`/`salt`, `sessionInfo`,
`linked_agents`, `il8n` (sic — the field is spelled `il8n`, not `i18n`, at `User.ts:222`).

Uniqueness is **global, not tenant-scoped**: `email` and `username` are each `unique: true` and
`index: true` on the collection (`User.ts:81-108`). A user therefore cannot hold an account on two
tenants with the same email address; tenancy is expressed through `memberships[]`, not through
per-tenant user records.

**`reactory_organizations`** (`models/Organization.ts:136`) — `code`, `name`, `tradingName`, `logo`,
`avatar`, `businessUnits[]`, `teams[]`, `clients[]`, `settings`, `public`.

**`reactory_business_units`** (`models/BusinessUnit.ts:36`) — `organization`, `owner`, `members[]`,
`name`, `description`, `avatar`, `deleted`.

**`reactory_teams`** (`models/Team.ts:39`) — `title`, `name` (defaults to `title`), `owner`,
`organization`, `members[]`, `deleted`.

The four levels — tenant → organisation → business unit → team — are the axes the `@auth` directive
checks against (§4). A user's effective role at a scope comes from `memberships[]`, not from `roles[]`;
`roles[]` is the tenant-wide legacy list.

### Files and templates

**`reactory_files`** (`models/CoreFile.ts:283`) — `hash`, `checksum`, `algo`, `partner`, `path`,
`alias`, `filename`, `mimetype`, `size`, `remotes[]`, `uploadContext`, `owner`, `public`, `published`,
`status`, `tags`, `ttl`. Content is addressed by hash; `remotes[]` records where copies have been
pushed, which is what `ReactorySyncFileToRemote` operates on.

**`reactory_templates`** (`models/Template.ts:173`) — scoped by `client`/`organization`/`businessUnit`/
`user` with a `visibility` field, and typed by `kind`/`format`. `locale` makes a template
locale-specific; the resolver falls back when a locale variant is missing.

### Submission and audit

**`reactory_form_submission`** (`models/ReactoryFormSubmission.ts:26`) is TypeORM/Postgres, not Mongo —
form submissions moved to Postgres. Same for `reactory_audit`, `reactory_user_sessions`,
`reactory_rate_limits` and the calendar tables. A reader assuming "core is Mongo" will be wrong about
those.

### Migrations

4 timestamped migrations, two per store:

| Store | Migration | Source |
|---|---|---|
| Mongo | `20260516013514-baseline-reactory-clients.js` | `src/modules/reactory-core/migrations/mongo/` |
| Mongo | `20260516032000-core-index-baseline.js` | `src/modules/reactory-core/migrations/mongo/` |
| TypeORM | `20260923120000-CoreBaseline.ts` | `src/modules/reactory-core/migrations/typeorm/` |
| TypeORM | `20260924090000-ClientKeyTenancy.ts` | `src/modules/reactory-core/migrations/typeorm/` |

The TypeORM entity/migration manifest is `migrations/typeorm/schema.ts` (`CORE_ENTITIES`,
`CORE_MIGRATIONS`), consumed by `models/index.ts` through
`prepareSchemaOrExit` / `resolveSynchronize` — schema synchronisation is governed, not implicit.

---

## 4. GraphQL API

Core contributes **469 unique type names** across **39 SDL modules**, root fields of **115 queries**
and **142 mutations**, and **145 `@auth` usages**. The full field-level listing with `file:line` is in
[§4 of the reference](../../07-reference/modules/reactory-core.md#4-graphql-surface).

### Composition

`graph/types/index.ts` calls `loadGraphQLTypeDefinitions([...], __dirname, 'CORE')` with an explicit
module list. Adding an SDL file without adding it to that array means the file is dead.

`resolvers/index.ts` merges 32 resolver objects via `mergeGraphResolver`. The SDL and the resolver map
are maintained separately — a field can exist in SDL with no resolver (see §9).

### The `@auth` directive

The only directive core contributes. Declared in `graph/directives/AuthDirective.ts:10-15`:

```graphql
directive @auth(
  roles: [String] = ["USER"],
  scope: AuthScope = TENANT,
  orgArg: String,
  buArg: String
) on OBJECT | FIELD_DEFINITION
```

- `roles` — the caller needs **any one** of them.
- `scope` — `TENANT` (membership on the request's tenant), `ORGANIZATION` (membership on the
  organisation named by `orgArg`, or a tenant-wide membership), or `BUSINESS_UNIT` (membership on the
  unit named by `buArg`, or on that organisation, or tenant-wide). Narrower scopes inherit from wider
  ones, so a tenant `ADMIN` keeps organisation access. **A scoped check whose argument is missing is
  denied.**
- On `OBJECT`, the directive applies to every field that does not carry its own `@auth`.

Denial throws a `GraphQLError` with `extensions.code` `UNAUTHENTICATED` (no user, or anonymous) or
`FORBIDDEN` (signed in, wrong role at the required scope) — `graph/directives/AuthDirective.ts:135`.
Strict denial is the default; a tenant may opt back into the legacy "denied field resolves to `null`"
behaviour for one release by setting the `core.AuthDirectiveStrict@1.0.0` feature flag to
`enabled: true, value: false` (`graph/directives/AuthDirective.ts:52-79`).

Anonymous detection is not just `user == null`: a real account holding only `ANON` is treated as
anonymous (`graph/directives/AuthDirective.ts:56-69`).

---

## 5. Services

**40 service definitions** are declared under `services/` (113 `.ts` files including tests and
type-only helpers — the ticket's "113 service files" is a file count, not a service count). FQN,
lifecycle, dependencies and public methods for each are generated in
[§5 of the reference](../../07-reference/modules/reactory-core.md#5-services).

The registration array is one entry longer than the directory: `services/index.ts:5` imports
`ReactoryExcelWriterServiceDefinition` from `src/excel/ExcelWriter.ts`, so
`core.ReactoryExcelWriterService@1.0.0` is contributed by core but **defined outside** the module.
41 entries register; 40 definitions live here.

### What to know before reading that table

- **Three declaration styles coexist.** Some services use the `@service({...})` decorator, some export a
  `static reactory` definition object, and some `export default { ... }` a bare definition object. All
  three register; the style is historical, not semantic.
- **Lifecycle is `lifeCycle`, not `serviceType`.** `lifeCycle: 'singleton' | 'instance'` is declared on
  **12** definitions (6 singleton, 6 instance). **28 declare no `lifeCycle` at all** and therefore take
  the registry default. `serviceType` is a *category* (`data`, `user`, `file`, `workflow`, `security`,
  `support`, `statistics`, `forms`, `template`, `pdf`, `organization`, `codeGeneration`,
  `schemaGeneration`, `calendar`), not a lifecycle. Three definitions declare **neither**:
  `core.EmailService@1.0.0`, `core.ReactoryModuleCompilerService@1.0.0` and
  `core.ReactoryTranslationService@1.0.0`. The generated table shows both columns.
- **Three services live in core but are namespaced `reactory`, not `core`:** `reactory.CalendarService`,
  `reactory.CalendarEntryService`, `reactory.CalendarIntegrationService`. Resolve them by their
  declared FQN, not by directory.
- **Dependency injection is by alias.** `{ id: 'core.ReactorySearchService@1.0.0', alias: 'searchService' }`
  means the instance arrives as `this.searchService`. The registry resolves these before construction;
  a missing dependency fails at startup, not at first use.

### The load-bearing ones

| Service | Why it matters |
|---|---|
| `core.UserService@1.0.0` | Creates users and memberships; depends on search + model registry |
| `core.SystemService@1.0.0` | Tenant administration: routes, menus, roles, settings, feature flags, themes |
| `core.ReactoryFileService@1.0.0` | Every file operation; the most-depended-on service in core |
| `core.ReactoryFormService@1.0.0` | Form registry, lookup, compile; backed by the module compiler |
| `core.ReactoryWorkflowService@1.0.0` | The workflow engine's public surface — start, pause, schedule, history |
| `core.ReactorySearchService@1.0.0` | Provider-agnostic index/search; Meilisearch and Elasticsearch implementations |
| `core.SecurityService@1.0.0` | Token creation/expiry, session validation and history |
| `core.TemplateService@1.0.0` | Template rendering for email and content |

---

## 6. UI surface

Core is server-side; its UI contribution is **form and component definitions**, not React bundles. 48
form definitions are declared under `forms/`; the full list with `file:line` is generated in
[§6 of the reference](../../07-reference/modules/reactory-core.md#6-forms).

### Grouping

| Group | Examples | Purpose |
|---|---|---|
| Tenant administration | `ReactoryDashboard`, `ReactoryClientAdmin`, `ReactoryApplicationsForm` | Operator console (`forms/ReactoryAdmin/dashboard.ts`) |
| Application management | `reactory-application`, `core.ApplicationUsers@1.0.0`, `core.ApplicationRouteEditor@1.0.0`, `reactory.MyApplications@1.0.0` | Per-tenant application config, users, routes |
| Workflow operations | `core.WorkflowSystemDashboard@1.0.0`, `core.WorkflowInstanceManagement@1.0.0`, `core.WorkflowRegistryManagement@1.0.0`, `core.WorkflowScheduleManagement@1.0.0`, `core.WorkflowDetails@1.0.0`, `core.WorkflowOperationsDashboard@1.0.0` | Engine inspection and control |
| Support | `core.SupportForm@1.0.0`, `core.SupportTickets@1.0.0`, `core.SupportTicketsAdmin@1.0.0`, `core.SupportTicketDeleteAction@1.0.0` | Ticket lifecycle |
| Identity | `core.UserLoginForm@1.0.0`, `LoginForm`, `ResetPasswordForm`, `forgot-password`, `MicrosoftLogin` | Auth screens |
| Content & templates | `ContentCapture`, `ContentList`, `TemplateEditor`, `TemplateList`, `core.StaticContentInputForm@1.0.0` | CMS and email templates |
| Shared primitives | `search-user`, `business-units`, `business-unit`, `FileLoader`, `ExternalLinkList`, `CommentForm` | Reused across modules (`forms/shared.ts`) |
| Samples | `array`, `default`, `SmartAdminComplexFormSample`, `new-product-idea`, `product-ideas`, `contact.Form@1.0.0` | Demonstration only — not a product surface |

`registerAsComponent: true` on a form makes it resolvable as a client component by FQN. **Widget
mapping** (`widgetMap`) is how a form substitutes a bespoke component for a schema field — for example
`core.SupportForm@1.0.0` maps `SupportTicketStatusWidget` to
`core.SupportTicketStatusComponent@1.0.0` (`forms/Support/SupportRequest/index.ts:17-19`).

### Routes and middleware

Core mounts three Express routers:

| Mount | Router | Source |
|---|---|---|
| `/support` | support tickets | `routes/support/Support.ts` |
| `/workflow` | workflow control and log streaming | `routes/workflow/Workflow.ts` |
| `/useraccount` | account self-service | `routes/useraccount/UserAccount.ts` |

One middleware: `FileSSEMiddleware` (`middleware/FileSSEMiddleware.ts`), which upgrades a request to a
server-sent event stream for live file sessions and pairs with `core.FileSSETransportManager@1.0.0`.

---

## 7. Workflows

Core hosts the workflow engine and ships the flows other modules copy. 50 YAML files exist on disk,
47 of them are registered by a loader, and one flow is authored in TypeScript. The engine registers
38 step types. Enumerations — including which files are unregistered — are in
[§7 of the reference](../../07-reference/modules/reactory-core.md#7-workflows).

### Code workflow

`CleanCacheWorkflow` (`workflows/CleanCacheWorkflow.ts`) is the only flow authored as a TypeScript
`IWorkflow`. Everything else is YAML loaded through `loadYamlWorkflow`, which is itself worth noting:
on a parse failure or exception it logs at **error** level and returns `null`
(`workflow/YamlFlow/YamlToWorkflow.ts:96-111`), and every index then filters the nulls away
(`workflows/index.ts:18-20`). The log line is emitted, but the **boot succeeds with the flow missing**
— a broken YAML flow never fails startup, so the registry silently differs from the directory.

### Flow families

| Family | Namespace | Count | Notes |
|---|---|---|---|
| Product flows | `core` | 4 YAML + 1 code | `DeployServer`, `DeployClient`, `SyncClusterData`, `VerifyDeployment`, plus `CleanCacheWorkflow` in TypeScript |
| Support flows | `core` | 3 | `ListOpenTicketsWorkflow`, `SupportAIAgentProcessNewTicket`, `TicketEscalationWorkflow` |
| Onboarding | `reactory-core` | 1 | `DefaultUserOnboarding` — the namespace differs from the rest of core |
| Development utilities | `reactory-dev` | 10 | Build, deploy, test, self-heal, health monitor |
| Engine examples | `reactory-examples` | 25 registered of 28 files | One flow per step type plus composites; the step catalogue in executable form |
| Auto-repair | `reactory` | 3 | Detect and re-run failed YAML workflows |

The example catalogue is the most useful artefact here: `workflows/examples/` contains a minimal flow
per step type (`ApiCall`, `Condition`, `ForEach`, `While`, `Parallel`, `Saga`, `WaitEvent`,
`Custom`, `Validation` …), so the step catalogue is demonstrated rather than merely listed.

**Three files in `workflows/examples/` are not registered:** `EtlDemo.yaml`, `InvokeChild.yaml` and
`ListReactoryHomeFiles.yaml` are absent from the `EXAMPLE_NAMES` array in
`workflows/examples/index.ts`, so `loadYamlWorkflow` is never called for them. They are readable
examples but cannot be started by `workflowId`.

### Step types

38 step types are registered imperatively in `workflow/YamlFlow/steps/registry/YamlStepRegistry.ts`,
backed by 37 implementation files in `workflow/YamlFlow/steps/core/` (the registry registers `saga` and
`wait_event` from the shipped set as well). Registration is not derived from the directory, so a file
added to `steps/core/` without a `registerStep` call is inert. Execution
concerns — configuration, lifecycle, scheduling, security, error handling — are separate classes under
`workflow/` (`ConfigurationManager`, `LifecycleManager`, `Scheduler`, `SecurityManager`, `ErrorHandler`,
`WorkflowRunner`, `QueueListener`). The scheduler persists locks in `SchedulerLock.model.ts`, so a
restart does not double-fire a scheduled instance.

### A runnable example

`workflows/examples/EngineHello.yaml` — start → log → end. It has no external dependencies and is the
first thing to run on a new deployment:

```yaml
nameSpace: reactory-examples
name: EngineHello
version: 1.0.0
description: Minimal engine smoke test (start, log, end).
tags: [example, smoke, engine]
steps:
  - id: start
    type: start
  - id: greet
    type: log
    dependsOn: start
    config:
      message: "Hello from the YAML workflow engine"
      level: info
  - id: done
    type: end
    dependsOn: greet
```

Run it as a signed-in user. `startWorkflow` takes a single `workflowId` in `namespace.name@version` form
— the service splits the version off at the last `@`:

```graphql
mutation RunEngineHello {
  startWorkflow(
    workflowId: "reactory-examples.EngineHello@1.0.0"
    input: { input: {}, tags: ["smoke"], priority: 5 }
  ) {
    id
    name
    nameSpace
    version
    status
  }
}
```

Then read the outcome:

```graphql
query EngineHelloStatus($id: String!) {
  workflowInstance(id: $id) {
    id
    status
    startTime
    endTime
    duration
    error {
      message
    }
  }
}
```

Both fields are in core's own SDL (`graph/types/System/Workflow.graphql:1138` and `:1240`) and both are
`@auth`-guarded — `startWorkflow` requires `USER`, `workflowInstance` carries the query-side
equivalent. The step log is the `log` step's output in the instance history.

---

## 8. Operations

### Feature flags

8 flags are declared in `index.ts:42-155`, all tenant-scoped, all editable through
`core.WorkflowEditorFeatureFlagForm@1.0.0`:

| Flag | Effect |
|---|---|
| `workflow-editor-beta-ui` | Beta editor UI |
| `workflow-advanced-features` | Conditional logic, loops, complex branching in the editor |
| `workflow-collaboration` | Multi-user editing |
| `workflow-templates-beta` | Beta template library |
| `workflow-validation-experimental` | Experimental / AI-assisted validation |
| `workflow-ai-assistance` | AI authoring assistance |
| `forms-engine-v5` | Global default for the react-jsonschema-form v5 adapter (per-form override via `formDef.options.engine`) |
| `auth-directive-strict` | Strict `@auth` denial; off restores legacy `null` resolution |

The first six gate editor affordances only — they do not change execution semantics. The last two
change behaviour and are the ones to check first when a client behaves inconsistently across tenants.

### CLI

`cli/index.ts:9` exports **seven** definitions: `SchemaGen`, `InitializeSystemUser`, `csv2json`,
`ServiceGen`, `SecurityCli`, `WorkflowCli`, `ServiceKeysCli`. The module's `bin` is
`./bin/reactory` (`package.json`).

**Three further CLI files exist but are not exported** — `cli/module/module-init.ts`,
`cli/module/module-install.ts`, `cli/proto-srv/ProtoServerCli.ts`. They are not reachable from the
`reactory` binary. Treat them as unfinished unless they are added to `cli/index.ts`.

### Migrations

Run through the hosting server's migration governance, not by core. `models/index.ts` builds the
`PostgresDataSource` and calls `prepareSchemaOrExit` / `resolveSynchronize`, so a schema mismatch fails
startup rather than mutating the database. Mongo migrations are timestamped JS files executed in order.

### Telemetry and observability

Core does not emit OpenTelemetry spans itself; it exposes the signals other surfaces read:

| Signal | Source |
|---|---|
| Audit trail (Postgres `reactory_audit`) | `services/ReactoryAuditService.ts` |
| Workflow system status, metrics, error map | `workflowSystemStatus`, `workflowMetrics` — `services/Workflow/ReactoryWorkflowService.ts` |
| Workflow execution history and log files | `workflowExecutionHistory`, `workflowInstanceLogFileUrl` |
| Statistics packages | `services/Statistics/StatisticsService.ts` |
| Search index health | `services/search/providers/*` |

### Failure modes

| Failure | Behaviour | Where |
|---|---|---|
| A dependency FQN cannot be resolved | Startup failure — the registry cannot construct the dependent service | service definitions' `dependencies[]` |
| Invalid YAML workflow | **Omits the flow, does not fail the boot** — `loadYamlWorkflow` logs an error and returns `null`; each index filters it out | `workflow/YamlFlow/YamlToWorkflow.ts:96-111`, `workflows/index.ts:18-20` |
| `@auth` denial | `GraphQLError` with `UNAUTHENTICATED` / `FORBIDDEN` | `graph/directives/AuthDirective.ts:135` |
| Redis unavailable | `RateLimiterService` and `SecurityService` session cache degrade; `RedisService.isHealthy()` is the probe | `services/RedisService.ts` |
| Search provider unavailable | `ReactorySearchService` surfaces the provider error; index-dependent features fail open at the caller | `services/ReactorySearchService.ts` |
| TypeORM schema drift | Startup abort via `prepareSchemaOrExit` | `models/index.ts` |
| Mongo connection loss | Mongoose buffering — requests hang until the buffer timeout | driver default |

---

## 9. Limitations & roadmap

Everything in this section is a statement about the current code, verified at
`reactory-server@59639fe09622`. Nothing here is a wish list item presented as fact.

### `services/ETL` is a user/demographics import feature, not a general ingestion pipeline

This is the most commonly misunderstood part of core. `services/ETL` contains **five processors**, all
user import:

| Processor FQN | Purpose |
|---|---|
| `core.UserFileImportCSV2JSON@1.0.0` | Convert an uploaded CSV to JSON rows |
| `core.UserFileImportPreview@1.0.0` | Produce a preview of the parsed rows |
| `core.UserFileImportValidation@1.0.0` | Claimed file validation — see below |
| `core.UserFileImportProcessGeneral@1.0.0` | Apply general user fields |
| `core.UserFileImportProcessDemographics@1.0.0` | Apply demographic fields, creating users and organisation links |

They are registered by `services/ETL/Processors/index.ts`, orchestrated by
`core.ReactoryFileImportPackageManager@1.0.0` (`services/ETL/ReactoryPackageManager.ts`), and driven by
the `reactory_file_import_packages` collection and the `UserImport` GraphQL surface
(`graph/types/User/UserImport.graphql`).

There is **no generic record ingestion, no arbitrary-schema mapping, no transform DSL and no
non-user entity support**. Every processor is hard-coded to the user/demographic shape. A caller
wanting to import products, invoices or any other entity must write new processors; the package
manager will run them, but nothing in the shipped set does that job.

### `UserImportFileValidation` throws on invocation

`core.UserFileImportValidation@1.0.0` cannot validate anything. `process()` calls
`path.join()` with **no arguments** (`services/ETL/Processors/UserImportFileValidation.ts:51`), which
resolves to `"."`. `fs.createReadStream('.')` is then pointed at a directory, which emits `EISDIR:
illegal operation on a directory, read`.

Three things then go wrong at once:

1. There is no `error` listener on the stream, so the emitted error has no handler.
2. `processLineByLine()` is invoked without `await` (`:67`) — a floating promise whose rejection
   nothing observes.
3. `resolve(true)` runs synchronously in the executor (`:80`), before any line could be read.

The `for await` loop over the readline interface therefore never sees a line, and the returned promise
is already `true`. A caller cannot detect the failure from the return value, and the failure surfaces
out-of-band as an unhandled stream error.

**Consequence:** the validation step must not be placed in a production import package. Packages that
include it throw. Validation currently happens in `UserFileImportPreview` and in the processors
themselves.

### A declared example is not necessarily a startable workflow

Registration is opt-in per file. `workflows/examples/index.ts:23-52` lists the 25 examples it loads;
`EtlDemo.yaml`, `InvokeChild.yaml` and `ListReactoryHomeFiles.yaml` sit in the same directory but are
absent from that array. They parse and they document a pattern, but `startWorkflow` cannot reach them.
The same pattern applies to `workflows/dev/index.ts` and `workflows/Support/index.ts` — a YAML file is
documentation until its stem appears in an index.

### SDL and resolvers have drifted

`forms/Workflow/SystemDashboard/graphql.ts` declares three mutations that **do not exist** in core's
schema or resolver map: `pauseWorkflowSystem`, `resumeWorkflowSystem`,
`reloadWorkflowConfigurations`. The schema has `pauseWorkflowInstance`, `resumeWorkflowInstance` and
`reloadSchedules` instead. A dashboard action bound to those form mutations will fail with a GraphQL
validation error. The `workflowSystemStatus` query on the same form is valid.

### Service declarations are inconsistent

- 28 of 40 services declare no `lifeCycle`, so their instantiation semantics are the registry default
  rather than an explicit choice.
- Three services declare neither `lifeCycle` nor `serviceType`: `core.EmailService@1.0.0`,
  `core.ReactoryModuleCompilerService@1.0.0` and `core.ReactoryTranslationService@1.0.0`.
- `core.EmailService@1.0.0` throws `ApiError('Not Implemented Yet')` when asked to resolve a custom
  sending service by FQN (`services/EmailService.ts:217`) — only the built-in providers work.
- `core.GoogleMapsService@1.0.0`'s `getExecutionContext()` and `setExecutionContext()` throw
  `Method not implemented.` (`services/location/GoogleMapsService.ts:8-13`). Any code path that treats
  it as a context-aware service will throw.

### Registry and naming

- Calendar services are namespaced `reactory.*` while living in `reactory-core` (§5).
- `DefaultUserOnboarding.yaml` uses nameSpace `reactory-core` while its neighbours in the same
  directory use `core` (`workflows/index.ts:12-17`).
- `core.SupportForm@1.0.0` is the only form in the support family with a versioned FQN; the others
  (`SupportTickets`, `SupportTicketsAdmin`, `SupportTicketDelete`) resolve through generated ids.

### What "Implemented" does not mean

Status `Implemented` states that the module loads and does its job. It does not state that every
declared surface is reachable: the three unexported CLI modules, the dead SystemDashboard mutations and
the always-failing validation processor are all reachable-by-declaration but broken in practice.

### Roadmap

Roadmap items are **not** recorded here. Per the documentation plan, roadmap content lives in the
single platform maturity ledger, never inside a module page, so that intent is never mistaken for
behaviour. That ledger does not exist in this repository yet. Known candidates raised by the evidence
above:

- Fix or remove `UserFileImportValidation`, and decide whether validation is a processor at all.
- Reconcile `forms/Workflow/SystemDashboard/graphql.ts` with `graph/types/System/Workflow.graphql`.
- Give every service definition an explicit `lifeCycle` and `serviceType`.
- Rename the `reactory.*` calendar services to `core.*`, or document why they are not.
- Export or delete `module-init`, `module-install` and `ProtoServerCli`.

---

## 10. Evidence index

| # | Claim | Evidence |
|---|---|---|
| 1 | Module identity, FQN, dependencies, priority | `src/modules/reactory-core/index.ts:14-20` |
| 2 | No client or server plugins | `src/modules/reactory-core/index.ts:32-33` |
| 3 | No gRPC service | `src/modules/reactory-core/index.ts:37` |
| 4 | No PDFs contributed | `src/modules/reactory-core/index.ts:39` |
| 5 | 8 feature flags, tenant-scoped | `src/modules/reactory-core/index.ts:42-155` |
| 6 | `auth-directive-strict` flag semantics | `src/modules/reactory-core/index.ts:135-155` |
| 7 | `forms-engine-v5` flag semantics | `src/modules/reactory-core/index.ts:120-133` |
| 8 | Registry entry, licence, module entry path | `src/modules/available.json` (`reactory-core`) |
| 9 | SDL module list (39 entries) | `src/modules/reactory-core/graph/types/index.ts:3-42` |
| 10 | Resolver map (32 resolvers) | `src/modules/reactory-core/resolvers/index.ts:35-68` |
| 11 | `@auth` signature and scope semantics | `src/modules/reactory-core/graph/directives/AuthDirective.ts:9-49` |
| 12 | `@auth` denial codes | `src/modules/reactory-core/graph/directives/AuthDirective.ts:135` |
| 13 | Anonymous-account detection | `src/modules/reactory-core/graph/directives/AuthDirective.ts:56-69` |
| 14 | Service registration list | `src/modules/reactory-core/services/index.ts:39-76` |
| 15 | `@service` decorator style | `src/modules/reactory-core/services/UserService.ts:43-60` |
| 16 | `static reactory` style | `src/modules/reactory-core/services/ReactoryAuditService.ts:649-662` |
| 17 | Plain object definition style | `src/modules/reactory-core/services/EmailService.ts:226-237` |
| 17a | `core.ReactoryExcelWriterService@1.0.0` defined outside the module | `src/excel/ExcelWriter.ts:109`, imported at `src/modules/reactory-core/services/index.ts:5` |
| 17b | `@service` definitions with no `id`, resolved from name/version/nameSpace | `src/modules/reactory-core/services/generators/module/ModuleGenerator.ts:10-35` |
| 18 | Calendar services use the `reactory` namespace | `src/modules/reactory-core/services/ReactoryCalendarService.ts:34-42` |
| 19 | `lifeCycle` declared on 15 definitions | `src/modules/reactory-core/services/**` (see generated §5) |
| 20 | `EmailService` custom-FQN path is unimplemented | `src/modules/reactory-core/services/EmailService.ts:217` |
| 21 | `GoogleMapsService` context methods throw | `src/modules/reactory-core/services/location/GoogleMapsService.ts:8-13` |
| 22 | ETL processor set (five, user-only) | `src/modules/reactory-core/services/ETL/Processors/index.ts:6-12` |
| 23 | `UserImportFileValidation` calls `path.join()` with no arguments | `src/modules/reactory-core/services/ETL/Processors/UserImportFileValidation.ts:51` |
| 24 | Import package orchestration | `src/modules/reactory-core/services/ETL/ReactoryPackageManager.ts:329-340` |
| 25 | `UserImport` GraphQL surface | `src/modules/reactory-core/graph/types/User/UserImport.graphql` |
| 26 | Form definition list | `src/modules/reactory-core/forms/index.ts:21-45` |
| 27 | Support form widget mapping | `src/modules/reactory-core/forms/Support/SupportRequest/index.ts:9-21` |
| 28 | Workflow loader drops invalid YAML silently | `src/modules/reactory-core/workflows/index.ts:18-20` |
| 29 | Workflow file list and namespaces | `src/modules/reactory-core/workflows/index.ts:11-17` |
| 30 | Engine smoke-test flow | `src/modules/reactory-core/workflows/examples/EngineHello.yaml` |
| 30a | `startWorkflow(workflowId: String!, input: WorkflowExecutionInput)` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1240` |
| 30b | `workflowInstance(id: String!)` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1138` |
| 30c | Version is split off at the last `@` in `workflowId` | `src/modules/reactory-core/services/Workflow/ReactoryWorkflowService.ts:1056-1066` |
| 30d | `WorkflowInstance` field set | `src/modules/reactory-core/graph/types/System/Workflow.graphql:346-363` |
| 31 | 37 YAML step implementation files | `src/modules/reactory-core/workflow/YamlFlow/steps/core/` |
| 32 | 38 step types registered, imperatively | `src/modules/reactory-core/workflow/YamlFlow/steps/registry/YamlStepRegistry.ts:310-525` |
| 33 | Scheduler lock model | `src/modules/reactory-core/workflow/Scheduler/SchedulerLock.model.ts` |
| 33a | Example loader names the flows it registers | `src/modules/reactory-core/workflows/examples/index.ts:23-52` |
| 33b | Three example files are absent from that list | `workflows/examples/EtlDemo.yaml`, `InvokeChild.yaml`, `ListReactoryHomeFiles.yaml` |
| 33c | Dev loader names its flows | `src/modules/reactory-core/workflows/dev/index.ts:18-29` |
| 33d | Support loader names its flows | `src/modules/reactory-core/workflows/Support/index.ts:32-38` |
| 34 | CLI exports (seven) | `src/modules/reactory-core/cli/index.ts:9-17` |
| 35 | Unexported CLI modules | `src/modules/reactory-core/cli/module/`, `cli/proto-srv/` |
| 36 | Express router mounts | `src/modules/reactory-core/routes/index.ts:7-11` |
| 37 | File SSE middleware | `src/modules/reactory-core/middleware/index.ts:3-5` |
| 38 | Mongo migrations (two) | `src/modules/reactory-core/migrations/mongo/` |
| 39 | TypeORM migrations (two) and manifest | `src/modules/reactory-core/migrations/typeorm/` |
| 40 | Schema governance on startup | `src/modules/reactory-core/models/index.ts:5` |
| 41 | `reactory_clients` collection and fields | `src/modules/reactory-core/models/ReactoryClient/model.ts:5`, `ReactoryClient/schema.ts` |
| 42 | `reactory_users` collection and fields | `src/modules/reactory-core/models/User.ts:685` |
| 43 | Organisations | `src/modules/reactory-core/models/Organization.ts:136` |
| 44 | Business units | `src/modules/reactory-core/models/BusinessUnit.ts:36` |
| 45 | Teams | `src/modules/reactory-core/models/Team.ts:39` |
| 46 | Files and remote copies | `src/modules/reactory-core/models/CoreFile.ts:283` |
| 47 | Templates | `src/modules/reactory-core/models/Template.ts:173` |
| 48 | Form submissions are TypeORM, not Mongo | `src/modules/reactory-core/models/ReactoryFormSubmission.ts:26` |
| 49 | Workflow system status query used by the dashboard | `src/modules/reactory-core/forms/Workflow/SystemDashboard/graphql.ts:4-47` |
| 50 | Dead mutations on the workflow dashboard form | `src/modules/reactory-core/forms/Workflow/SystemDashboard/graphql.ts:97-142` vs `graph/types/System/Workflow.graphql` |

### Reproducing the counts

```bash
node scripts/docs/generate-core-module-reference.js
```

The script parses `index.ts`, the service definitions, the SDL, the model registrations, the form
declarations, the workflow YAML and the migration directories. Every count in §2, §4, §5, §6 and §7 of
this page is asserted by `test/docs/module-documentation.test.ts`, which fails if the generated
reference is stale.
