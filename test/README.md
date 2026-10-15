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
live database, a listening TCP port, a mail or queue provider. It is not broken – mocking
away the infrastructure it needs would leave nothing worth asserting – so it is excluded
by configuration, not quarantined. The suites are listed in `test/integrationSuites.js`
with the requirement that puts each one there; add an entry when a suite genuinely needs a
live dependency, and fix the suite instead when it only appears to.

Because the unit config is the base config, `bin/jest.sh` (which uses the default config
discovery) and `yarn test` run units only. To run the integration suites:

```sh
yarn test:integration                 # CI-safe; reads connection details from the environment
bin/jest.sh reactory local . --config jest.integration.config.ts   # local; loads .env via env-cmd
```

The integration suites read `MONGOOSE`, `REACTORY_POSTGRES_*`, `API_URI_ROOT` and the
Reactory client credentials from the environment. `.env` is git-ignored, so a local run
must load it (which `bin/jest.sh` does) and CI supplies the values as job env — see the
`integration` job in `.github/workflows/ci.yml`, currently run on demand.

`test/quarantine.json` is the other, unrelated mechanism: it lists suites that are
*broken* and are held out of `yarn test:ci` until they are fixed. A suite excluded because
of what it requires does not belong in that ledger.
