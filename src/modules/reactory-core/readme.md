# reactory-core

The foundational server module for the Reactory platform: the user/organisation/tenancy model, files
and CDN, templates and email, SQL/search/cache services, the workflow engine host, the core GraphQL
schema and resolvers, the CLI and the migrations.

**FQN:** `core.ReactoryServer@1.0.0` · **nameSpace:** `core` · **priority:** `0` · **dependencies:** none

## Documentation

The canonical documentation for this module is **not** in this file. Read it here:

- **[Module page](https://github.com/reactorynet/reactory-docs/blob/master/06-modules/reactory-core/README.md)** — purpose, status, data model, operations,
  limitations and the evidence index.
- **[Generated reference](https://github.com/reactorynet/reactory-docs/blob/master/07-reference/modules/reactory-core.md)** — every service, GraphQL type,
  root field, form, workflow, CLI command, feature flag and migration, with `file:line`.

Both live in the `reactory-docs` repository, which owns narrative documentation; this
repository keeps only contributor detail. There is no `docs/06-modules/` or
`docs/07-reference/` here — do not create one. If the two disagree, the module page wins.

This README is contributor-oriented only: how to work in the module. Behaviour claims belong on the
module page.

## Layout

```
reactory-core/
  index.ts        module definition — the reference implementation of IReactoryModule
  graph/          SDL modules, the @auth directive, resolvers
  resolvers/      GraphQL resolver map
  services/       business logic, registered through index.ts
  models/         mongoose schemas and TypeORM entities
  forms/          ReactoryForm definitions rendered by the PWA client
  workflows/      YAML flows + the CleanCache code workflow
  workflow/       the workflow engine (lifecycle, scheduler, security, YAML steps)
  migrations/     mongo and TypeORM migrations
  cli/            CLI command definitions
  routes/         Express routers (/support, /workflow, /useraccount)
  middleware/     file SSE transport
  data/           translations
```

## Build, test, verify

```bash
# unit tests for this module
./bin/jest.sh reactory local 'src/modules/reactory-core'

# a single suite
./bin/jest.sh reactory local 'UserService'

# typecheck (ratchet against typecheck-baseline.json)
yarn typecheck
```

## Regenerating the reference

The tables in the generated reference are parsed from this directory, but the generator and
the output both live in `reactory-docs`. After changing a service definition, an SDL file, a
form, a workflow or the module's feature flags, run this **in the `reactory-docs` checkout**
with `REACTORY_SERVER_ROOT` pointing here:

```bash
node scripts/generate-core-module-reference.js           # regenerate
node scripts/generate-core-module-reference.js --check    # exit 1 if stale
node scripts/verify-docs.js --require-source             # full documentation guard
```

Commit the regenerated `07-reference/modules/reactory-core.md` and
`06-modules/index.md` in `reactory-docs` alongside the change that caused them. A stale table
is a CI failure there, not a review comment here.

## Conventions

- Services declare `id`, `nameSpace`, `name`, `version`, `dependencies` and — ideally — `lifeCycle`
  and `serviceType`. Two declaration styles exist (`@service({...})` and a `static reactory` object);
  prefer the decorator in new code.
- Dependencies are injected by `{ id, alias }`; the alias is the property name on the instance.
- A tenant is a `ReactoryClient`. Tenant-scoped queries filter by `context.partner._id`.
- `@auth(roles, scope, orgArg, buArg)` is the only directive. Strict denial is the default; do not
  add ad-hoc role checks to resolvers that already carry `@auth`.
- A form that only needs to capture data declares a `submission` block rather than a GraphQL mutation —
  see `services/FormSubmission/README.md`.
