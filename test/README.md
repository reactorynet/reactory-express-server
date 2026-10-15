# Testing Reactory Server and Reactory Modules
Each module should manage tests in the module code base. This means all tests for core is contained within src/modules/core/**. The recommended approach is to have your test in the same component folder. i.e. if you have a component in src/modules/foo/bar called baz.ts, you shoud have a test specification in the same folder called baz.spec.ts

## Executing tests
Use the `bin/jest.sh <config name> <environment name> <pattern>` command to execute tests. So if you want to run specific unit tests in your foo module you will execute the following command `bin/jest.sh <config name> <environment name> foo/`

## Unit and integration suites

There are two jest projects, and they do not overlap:

| Project | Config | Command | Contains |
|---|---|---|---|
| Unit | `jest.config.ts` | `yarn test`, `yarn test:ci` | everything except the integration suites |
| Integration | `jest.integration.config.ts` | `yarn test:integration` | only the integration suites |

An **integration suite** is one that needs infrastructure the unit pass does not have: a
live database, a listening TCP port, a mail or queue provider. It is not necessarily
broken – mocking away the infrastructure it needs would leave nothing worth asserting –
so it is excluded by configuration, not quarantined. The suites are listed in
`test/integrationSuites.js` with the requirement that puts each one there; add an entry
when a suite genuinely needs a live dependency, and fix the suite instead when it only
appears to. A suite can be both integration and broken; broken ones are also listed in
`test/quarantine.json`, which is a separate mechanism.

Because the unit config is the base config, `bin/jest.sh` (which uses the default config
discovery) and `yarn test` run units only. To run the integration suites:

```sh
yarn test:integration
```

> ### ⚠️ Read this before running the integration suites
>
> **They are not safe to point at a database you care about.** They run against whatever
> `MONGOOSE` and the `REACTORY_POSTGRES_*` variables resolve to – in a dev checkout that
> is the `.env` database – and `seed_apex.test.ts` is destructive: it resets the passwords
> of real accounts (including `werner.weber@gmail.com`) to `password123`, and deletes
> markbook rows. Point them at a disposable database.
>
> `seed_apex.test.ts` also currently **fails against an empty database** (it inserts a
> classroom row without the `clientKey` that the tenancy migration makes `NOT NULL`), and
> is therefore still listed in `test/quarantine.json`. See that entry.
>
> `GoogleStrategy.spec.ts` boots the whole ReactoryServer and binds port 4000. If that port
> is taken the server calls `process.exit(-1)`, which — because `test:integration` runs
> `--runInBand` for the shared database — kills the whole run rather than just that suite.
> Free the port first.

Neither suite is a pull-request gate. The CI `integration` job (.github/workflows/ci.yml)
runs them on demand via `workflow_dispatch`; note that the `test` job runs on a dispatch
too, so read the `integration` job's own result rather than the workflow conclusion.

`test/quarantine.json` lists suites that are **broken** and are held out of `yarn test:ci`
until they are fixed. A suite excluded because of what it requires does not belong in that
ledger – unless it is broken as well.
