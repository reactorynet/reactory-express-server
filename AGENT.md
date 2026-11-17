# Reactory Express Server -- Agent Context

## What Is This Project

The Reactory Express Server (`@reactory/server-core`) is the main backend for the Reactory platform. It is a Node.js/Express application that provides GraphQL APIs, REST endpoints, authentication (Passport.js with multiple strategies), multi-tenancy, role-based access control (RBAC), file management, PDF generation, Excel export, workflow engine, JIT module compilation, and a plugin/module system with 40+ modules.

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 24.x LTS (see `.nvmrc`)
- **Package manager**: Yarn
- **Server framework**: Express.js
- **API layer**: GraphQL (Apollo Server), REST (secondary)
- **Database**: MongoDB (Mongoose), PostgreSQL/MySQL/MSSQL (TypeORM, Tedious), Redis (ioredis), MeiliSearch
- **Authentication**: Passport.js (local, JWT, OAuth, Azure AD, Google, etc.)
- **Build**: Babel transpilation, Rollup (dev), Docker containerization
- **Testing**: Jest (via `bin/jest.sh`); StrykerJS mutation testing on a core slice (`yarn test:mutation`)
- **Containerization**: Docker (Dockerfile present)

## Project Structure

```
reactory-express-server/
  src/
    express/
      middleware/           # Authentication, logging, error handling middleware
    modules/                # 40+ pluggable modules (see Module Architecture below)
      reactory-core/        # Core server module
      reactory-azure/       # Azure integration
      reactory-aws/         # AWS integration (SNS)
      reactory-slack/       # Slack integration
      reactory-queue/       # Queue processing
      reactory-telemetry/   # Telemetry/observability
      reactory-reactor/     # AI-powered dev assistance
      reactory-email/       # Email services
      reactory-sms/         # SMS services
      reactory-whatsapp/    # WhatsApp integration
      reactory-kb/          # Knowledge base
      reactory-kyc/         # KYC/identity verification
      reactory-shop/        # E-commerce
      reactory-excel/       # Excel generation
      reactory-pdf-manager/ # PDF generation
      reactory-github/      # GitHub integration
      reactory-grafana/     # Grafana integration
      reactory-argocd/      # ArgoCD integration
      reactory-terraform/   # Terraform integration
      reactory-devops/      # DevOps tools
      reactory-meilisearch/ # MeiliSearch integration
      reactory-ms-sql/      # MS SQL Server
      reactory-ms-teams/    # MS Teams integration
      reactory-ms-azure/    # MS Azure services
      reactory-classroom/   # Classroom/education
      reactory-survey/      # Survey system
      ... (and more)
    data/
      clientConfigs/        # Per-client tenant configurations
  config/                   # Per-environment configs (includes Terraform/K8s)
  bin/
    start.sh                # Start server in development mode
    start-otel.sh           # Start server with OpenTelemetry
    jest.sh                 # Run tests
    reactory                # Run Reactory CLI commands (the CLI entry point)
    cli.sh                  # DEPRECATED shim -> bin/reactory
  build/                    # Build output
  certificates/             # SSL certificates
  docker/                   # Docker configuration
  Dockerfile                # Container build definition
  templates/                # Document/email templates
  test/                     # Test files
```

## Module Architecture

Each module in `src/modules/` follows this structure:

```
src/modules/<module-name>/
  index.ts              # ReactoryModuleDefinition - registers all module components
  routes/               # Express route definitions
  controllers/          # Request handlers
  services/             # Business logic
  models/               # Database models (Mongoose/TypeORM)
  forms/                # Form schema definitions (JSON Schema)
  graph/                # GraphQL type definitions and resolvers
  views/                # Server-side views (if any)
  cli/                  # CLI command definitions
```

The `index.ts` exports a `ReactoryModuleDefinition` that brings together all the module's components for automatic registration with the server.

## Development Commands

```bash
# Start the server (ALWAYS use this, not yarn start or npm start)
bin/start.sh

# Start with OpenTelemetry enabled
bin/start-otel.sh

# Run tests (config_key: development/staging/production, env_key: local/docker/ci)
bin/jest.sh <config_key> <env_key> [jest-options]
bin/jest.sh reactory local                          # Default test run
bin/jest.sh reactory local --watch                  # Watch mode
bin/jest.sh reactory local --testPathPattern=Feature # Specific test
bin/jest.sh reactory local --coverage               # Coverage report

# Run CLI commands (bin/reactory is the single CLI entry point; bin/cli.sh is a
# deprecated shim that forwards to it). Runs from any working directory.
# Launcher flags (--silent/--verbose) are NOT forwarded to the command; see
# src/reactory/cli/CLI.md -> "Argument contract: who owns --silent" before adding a CLI.
bin/reactory <command> [options]
bin/reactory workflow stats
bin/reactory workflow start core.MyWorkflow@1.0.0 --input='{"foo":1}'

# Package management
yarn install       # Install dependencies
yarn               # Same as above
```

## Coding Conventions

- Use TypeScript for all source files
- Use ES6+ syntax with async/await for asynchronous code
- Prefer GraphQL for APIs; REST endpoints only when necessary
- Use `express.Router()` for route grouping
- Separate route definitions, controllers, and business logic
- Use middleware for authentication, validation, and error handling
- Avoid business logic in route handlers -- delegate to services
- Return appropriate HTTP status codes and JSON responses
- Use dependency injection where appropriate
- Write modular, reusable, and testable code
- Add JSDoc comments for exported functions and classes
- Use environment variables for configuration and secrets
- Validate all incoming request data
- Handle errors using custom error classes and middleware
- Write unit and integration tests for new features

## Design Patterns

- **Modules**: Self-contained feature units in `src/modules/` with their own routes, services, models, forms, and GraphQL definitions
- **Dependency Injection**: Services and repositories are injected into controllers for loose coupling
- **Middleware**: Common concerns (auth, logging, error handling) live in `src/express/middleware`
- **Multi-tenancy**: Per-client configurations in `src/data/clientConfigs/`
- **GraphQL-first**: Primary API surface is GraphQL; REST is secondary

## Security

- Never commit secrets or credentials to the repository
- Sanitize and validate all user input
- Use HTTPS in production
- Implement proper authentication and authorization via Passport.js
- Keep `.env` and config files out of version control

## Environment Variables

```bash
REACTORY_SERVER    # Path to this project
REACTORY           # Root workspace directory (also aliased as REACTORY_HOME)
REACTORY_CLIENT    # Path to reactory-pwa-client
REACTORY_CORE      # Path to reactory-core
REACTORY_NATIVE    # Path to reactory-native
REACTORY_DATA      # Path to reactory-data
REACTORY_PLUGINS   # Path to reactory-data/plugins
```

## Microsoft Graph: the Azure module and the legacy shim (AZ-19)

The Microsoft Graph surface is being moved to the `reactory-azure` module, which registers
`azure.*` services under the module FQN `core.ReactoryAzure@1.0.0`. That module is a separate
repository checked out at `src/modules/reactory-azure`, and it is **inert until the server is
restarted** - the running process loaded its service list before the module existed.

### What AZ-19 changed in this repository

| File | Change |
|---|---|
| `src/modules/reactory-core/resolvers/Emails/UserEmails.ts` | `O365.getEmails(token, filter)` replaced by `context.getService('azure.AzureMailService@1.0.0').listMessages(userId, options)`. The resolver passes the **user id** - never a token - and maps the normalised `IMailPage.items` back onto the nine `Email` keys the old `object-mapper` spec produced. |
| `src/modules/reactory-core/services/EmailService.ts` | The dead `@reactory/server-modules/reactory-azure/services/graph` import removed; the only `O365` use left is inside a commented-out `case 'microsoft'`. |

**Credentials are resolved by the service, not by the resolver.** `getToken(userId)` in
`azure.AzureAuthService@1.0.0` reads a vaulted `AzureToken` row first (refreshed 60 s before
expiry) and, when **no row exists at all**, falls back to the legacy bridge: the User
document's `getAuthentication('microsoft').props.accessToken`. That token is the one
`ProfileResolver` refreshes through `isTokenValid`, so a user who signed in before the Azure
module existed keeps reading mail without re-consenting. The bridge itself never refreshes and
never caches, and a 401 on a legacy-sourced call raises `LegacyTokenExpired` (not
`InvalidAuthenticationToken`), which a caller must read as "reconnect", not "revoked".
A row that exists and is **revoked** is terminal: it never falls through to the legacy token.

### Why `resolvers/User/ProfileResolver.ts` stays on the shim

Its call is `MSGraph.getUserDetails(msauth.props.accessToken, { imageSize, profileImage })`,
where `msauth` is the **User document's** Microsoft authentication, refreshed by the local
(non-exported) `isTokenValid` closure. This is a **live sign-in path**: every Microsoft sign-in
today reads the profile through it. Migrating it onto `azure.AzureAuthService` would point it at
a token store that is empty until the new OAuth flow has run for that user, which breaks sign-in
for every existing account - and this environment has no Azure tenant in which the replacement
could be proven. It is therefore deliberately left on the shim.

A consequence to keep in mind: the shim is deprecated but **load-bearing**. `reactory-core`
imports it eagerly, so it cannot be deleted, and neither can
`src/modules/reactory-azure/types.d.ts`.

### The shim retirement gate

`src/modules/reactory-azure/services/graph.ts` and `types.d.ts` may be deleted **only after the
owner** has:

1. restarted the express server, so `core.ReactoryAzure@1.0.0` is actually registered and its
   16 services resolve (until then every `azure.*` FQN is unresolvable);
2. signed in through the Microsoft provider on that running server;
3. confirmed `refreshProfileData` still returns the same profile - the migrated replacement for
   `MSGraph.getUserDetails` (including `avatar` when `skipImage` is false) must be shown
   equivalent on a real sign-in;
4. exercised `userEmails` for **both** a vaulted user and a user whose token still lives on the
   User document (the legacy bridge path), and seen the same `Email` rows from both.

Until all four are confirmed, the acceptance invariant is:

```bash
# exactly one line expected - ProfileResolver.ts:6
grep -rn --include='*.ts' 'reactory-azure/services/grap[h]' src
```

`--include='*.ts'` and the bracket expression `grap[h]` are both required: without them the
search also matches the azure module's own `docs/*.md`, including the text of this criterion.

When the gate opens, delete the shim, delete `types.d.ts`, drop the `getClientWithToken`
provider method, and remove the header comment in `services/graph.ts` that names its three
importers - in that order, in one change, with the sign-in walk-through recorded in the PR.

## Testing

- Tests are **environment-specific**: you must pass a config key and environment key
- Use `bin/jest.sh` (not `yarn test` or `npm test` directly)
- TDD plans are required before writing tests -- create `<testfile>_plan.md` alongside test files
- Minimum 80% code coverage target for new code
- Test file structure: `src/feature/__tests__/feature.test.ts` + `feature_plan.md`
- ALWAYS Validate file typescript changes using by `npx tsc --noEmit`

### Mutation testing (Stryker)

Coverage says a line ran; mutation testing says whether the tests would notice if it were
wrong. StrykerJS (`stryker.config.mjs`) mutates the source (flips conditions, swaps operators,
empties blocks) and re-runs the covering tests; a mutant the tests still pass on has
**survived** and marks an assertion gap. Full guide: `docs/MUTATION_TESTING.md`.

```bash
yarn test:mutation                              # Stryker on the configured scope + baseline gate
yarn test:mutation --mutate src/path/file.ts    # one file
yarn test:mutation:check                        # re-check the last report, no Stryker run
yarn test:mutation:update-baseline              # rewrite mutation-baseline.json from the last report
```

The report to read is `reports/mutation/mutation.html` (survivors shown inline as diffs).

When to use it:

- **After writing or changing tests for a file in the scope** (`mutate` in `stryker.config.mjs`):
  run `yarn test:mutation --mutate <file>`. The gate fails if the file now has more undetected
  mutants (Survived + NoCoverage) than its entry in `mutation-baseline.json`.
- **To judge a new suite you wrote**: `--mutate <the source file>` shows which behaviours the
  suite asserts on and which it only executes. `--mutate` does not pick tests: a file outside
  the scope needs its suite added to `jest.config.testMatch` in `stryker.config.mjs` first,
  or every mutant reports NoCoverage (and, having no baseline entry, fails the gate). Treat each survivor as a missing
  test case and add the test; do not change the source to make a mutant die.
- **Before adding a file to the scope**: add the source to `mutate` and its suite to
  `jest.config.testMatch` together, kill what survivors you reasonably can, then refresh the
  baseline and say so in the commit message.

Rules:

- The gate is a **per-file ratchet**, like `yarn typecheck` (`docs/TYPECHECK_RATCHET.md`).
  Refresh the baseline only after a file improved, the scope changed, or survivors are accepted
  deliberately (equivalent mutants), and say which in the commit message. Never refresh from a
  line-range run (`--mutate file.ts:10-20`): its counts are partial.
- Suppress an equivalent mutant only with a reason:
  `// Stryker disable next-line <Mutator>: <why it cannot change behaviour>`.
- Suites in the scope must be unit suites that pass in a server-only checkout. Stryker's sandbox
  leaves out everything git ignores (all modules but `reactory-core`, local client configs), so a
  suite that imports another module fails the initial run (that is why
  `src/express/middleware/__tests__/ordering.test.ts` is excluded).
- Results must not depend on the machine. A test that relies on wall-clock timing makes mutants
  flip between Killed and Survived; pin time with a mocked clock instead.
- Stryker is pinned to 9.6.1 (the latest that supports Node 20); upgrading it changes mutant
  counts, so upgrade and refresh the baseline in one change.
- A full scope run takes a few minutes and uses one jest process per core (less one); pass
  `--concurrency <n>` on a smaller machine. Re-runs are incremental (`--force` for a clean run).
- **Modules** (separate repositories under `src/modules`) opt in with a `mutation.config.json`
  (`mutate`, `tests`, `needs`, paths relative to the module) and keep their own
  `mutation-baseline.json`, both committed to the module's repository. Run them from the server
  root: `yarn test:mutation:module <name>`, `yarn test:mutation:module:update-baseline <name>`.
  `needs` lists other modules the suites load at runtime; it is usually empty because modules
  reach each other through `getService` and type imports. See "Modules" in
  `docs/MUTATION_TESTING.md`. In CI a module calls the shared workflow
  `reactorynet/.github/.github/workflows/server-module-tests.yml@master` (unit suites + mutation
  gate inside a server checkout); `reactory-temporal` is the first caller.
- CI runs the same gate in the `mutation` job (`.github/workflows/ci.yml`): incrementally on pull
  requests from the cache the last `master` run saved, fully (`--force`) on pushes to `master`.
  When it is red, download the `mutation-report` artifact and read `mutation.html` for the new
  survivors in the failing file; fix them with tests, or refresh the baseline in the PR with the
  reason in the commit message.

## Dependencies on Other Projects

- **reactory-core**: Provides all TypeScript type definitions (installed as `.tgz` file dependency)
- **reactory-data**: Provides fonts, themes, i18n, templates, workflow schedules, and plugin runtime at `$REACTORY_DATA`
