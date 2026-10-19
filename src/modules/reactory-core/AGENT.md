# reactory-core — agent context

Repo-local working context for agents editing this module. Behaviour documentation lives in the central
docs corpus, not here:

- **[Module page](../../../docs/06-modules/reactory-core/README.md)** — purpose, status, data model,
  operations, limitations, evidence index.
- **[Generated reference](../../../docs/07-reference/modules/reactory-core.md)** — services, GraphQL
  surface, forms, workflows, CLI, feature flags, migrations. Generated; never hand-edited.

If this file and the module page disagree, **the module page is right.**

## Identity

| Field | Value |
|---|---|
| `id` | `reactory-core` |
| `nameSpace` | `core` |
| `name` | `ReactoryServer` |
| `version` | `1.0.0` |
| FQN | `core.ReactoryServer@1.0.0` |
| `priority` | `0` — loads first |
| `dependencies` | none |

`index.ts` is the reference implementation of `Reactory.Server.IReactoryModule`. Every extension point
it contributes — and the four it leaves empty (`clientPlugins`, `serverPlugins`, `grpc`, `pdfs`) — is
listed in §2 of the generated reference.

## Before you change something

1. **Adding a service?** Add it to `services/index.ts`. A file that is not in that array is dead code.
   Give it `lifeCycle` and `serviceType`; do not rely on the defaults.
2. **Adding SDL?** Add the file to the module list in `graph/types/index.ts`, or it will never load.
3. **Adding a resolver?** Add the resolver object to the array in `resolvers/index.ts`. SDL and resolvers
   are maintained separately, so a field with no resolver is possible and will fail at runtime.
4. **Adding a form?** Add it to `forms/index.ts` and set `registerAsComponent: true` if the client must
   resolve it by FQN.
5. **Adding a workflow?** Drop the YAML in `workflows/` and add an entry to `WORKFLOW_FILES` in
   `workflows/index.ts`. Note the loader **drops invalid YAML silently** — check the registry after
   adding one.
6. **Changing any of the above?** Re-run `node scripts/docs/generate-core-module-reference.js` and
   commit the regenerated reference. `test/docs/module-documentation.test.ts` enforces it.

## Conventions

- Dependency injection is declared, not imported: `{ id: 'core.X@1.0.0', alias: 'x' }` and the instance
  arrives as `this.x`.
- Tenancy: a tenant is a `ReactoryClient`; `context.partner` is the resolved document. Every query that
  returns tenant data must filter on it.
- Authorisation: use the `@auth(roles, scope, orgArg, buArg)` directive in SDL. Do not add resolver-level
  role checks alongside it. Denial throws `UNAUTHENTICATED` or `FORBIDDEN`.
- Mongo for documents, TypeORM for `reactory_audit`, `reactory_form_submission`, `reactory_user_sessions`,
  `reactory_rate_limits` and the calendar tables. Check which before writing a query.
- Services in this directory may be namespaced `reactory.*` rather than `core.*` — resolve by declared
  FQN, not by path.

## Commands

```bash
./bin/jest.sh reactory local 'src/modules/reactory-core'   # module tests
./bin/jest.sh reactory local 'UserService'                 # one suite
yarn typecheck                                            # ratchet check
node scripts/docs/generate-core-module-reference.js        # regenerate docs tables
```

## Known traps

All verified against the current tree; details and evidence in §9 of the module page.

- `services/ETL/Processors/UserImportFileValidation.ts` calls `path.join()` with no arguments and
  cannot succeed. Do not add it to an import package.
- `forms/Workflow/SystemDashboard/graphql.ts` declares `pauseWorkflowSystem`,
  `resumeWorkflowSystem` and `reloadWorkflowConfigurations`; none exist in the schema.
- `cli/module/module-init.ts`, `cli/module/module-install.ts` and `cli/proto-srv/ProtoServerCli.ts` are
  not exported from `cli/index.ts`, so they are unreachable from the `reactory` binary.
