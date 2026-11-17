# Mutation testing (Stryker)

Line coverage tells you which code the tests *executed*. It does not tell you
whether they would notice if that code were wrong. A suite that calls a
function and asserts nothing about its result gives 100% coverage and catches
nothing.

[StrykerJS](https://stryker-mutator.io/docs/stryker-js/introduction/) measures
the second thing. It makes small, deliberate changes to the source, called
**mutants** (it flips `>` to `>=`, replaces a condition with `true`, empties a
block, swaps `&&` for `||`, turns `a?.b` into `a.b`), and re-runs the tests that cover
each change:

| Status | Meaning | Counts as |
|---|---|---|
| **Killed** | at least one test failed: the tests pin this behaviour down | detected |
| **Timeout** | the mutant made the tests hang (usually an infinite loop) | detected |
| **Survived** | every covering test still passed: **a gap in the assertions** | undetected |
| **NoCoverage** | no test executes this code at all | undetected |
| CompileError / RuntimeError / Ignored | the mutant could not be evaluated | left out |

**Mutation score** = detected ÷ (detected + undetected).

## Running it

```bash
yarn test:mutation                                  # run Stryker on the scope, then check the baseline
yarn test:mutation --mutate src/utils/hash.ts       # one file
yarn test:mutation --mutate 'src/utils/hash.ts:40-60'  # a line range, for a quick look only
yarn test:mutation --force                          # ignore the incremental cache, re-test every mutant
yarn test:mutation --concurrency 4                  # fewer parallel jest processes (default: one per core, less one)
```

`--mutate` picks the files to mutate, not the tests to run: the suites are always
the ones in `testMatch`. To try a file outside the scope, add its suite to
`testMatch` first, or every mutant comes back NoCoverage. A measured file with no
baseline entry is allowed 0 undetected mutants, so expect the gate to report it.

```bash
yarn test:mutation:check                            # re-check the last report without running Stryker
yarn test:mutation:update-baseline                  # rewrite mutation-baseline.json from the last report
```

Anything after `yarn test:mutation` other than the ratchet's own flags is
passed to `stryker run`, so every [Stryker CLI
option](https://stryker-mutator.io/docs/stryker-js/configuration/) works.

Output, all under the git-ignored `reports/mutation/`:

- `mutation.html`: **start here**. An interactive report: each file with every
  surviving mutant shown inline as a diff against the source.
- `mutation.json`: the machine-readable report the ratchet reads.
- `stryker-incremental.json`: the incremental cache (see below).

A full run of the scope takes about **5 minutes** on an 18-core developer
machine; an incremental re-run after a small change takes seconds. `.stryker-tmp/` holds the sandboxes while it runs and is
removed afterwards.

## Reading a survived mutant

Open `reports/mutation/mutation.html`, pick a file, and click a red marker. For
example:

```diff
- if (attempts >= limit) {
+ if (attempts > limit) {
```

surviving means no test exercises `attempts === limit`. The fix is a test that
does, **not** a change to the code. A survivor is a question about the tests:
"what input would tell these two versions apart, and why don't we have it?"

Some survivors are **equivalent mutants**, changes that cannot alter
behaviour (for example mutating a log message, or `i < n` vs `i !== n` in a
loop that only ever counts up). Leave them in the baseline, or suppress one
with a comment on the line above that says why:

```ts
// Stryker disable next-line StringLiteral: log text, not behaviour
logger.debug('cache miss');
```

Use suppressions sparingly. A suppression that hides a real gap is worse than
a survivor, which at least stays visible.

## The baseline gate

`mutation-baseline.json` records, per file, how many undetected mutants
(Survived + NoCoverage) the file is allowed. After a Stryker run the ratchet
(`scripts/ci/mutation-ratchet.js`) compares every file **the run measured**:

- more undetected mutants than the allowance → **red** (`New undetected mutants in N file(s)`);
- fewer → reported as an improvement, **green**;
- a measured file with no entry → allowance 0, so any survivor is **red**.

Files the run did not measure (outside a `--mutate` subset) are not
compared. This mirrors the [type-check ratchet](./TYPECHECK_RATCHET.md), and
for the same reason the gate is per file rather than a global score: a global
score lets a change hide new untested code behind unrelated tests it adds
elsewhere, and a new survivor in a file somebody is improving would be lost
in the noise. Stryker's own `thresholds.break` is therefore off; `high` and
`low` only colour the report.

### Baseline (2026-11-14, Stryker 9.6.1)

The first full run measured 2,089 mutants. 1,186 were detected (1,176 killed, 10 timed out); 579 survived and 324 had no coverage. The same commit gives the same result mutant for mutant on a developer machine (17 workers) and in a CI-shaped checkout (3 workers). Sorted weakest first, so the top rows are where new tests pay off most:

| File | Mutants | Undetected (allowance) | Score |
|---|---:|---:|---:|
| `src/express/cors.ts` | 247 | 207 | 16.19% |
| `src/express/middleware/ReactoryClient.ts` | 250 | 175 | 30.00% |
| `src/application/decorators/telemetry/gauge.ts` | 63 | 30 | 52.38% |
| `src/utils/graph/mergeResolver.ts` | 131 | 61 | 53.44% |
| `src/exceptions/index.ts` | 369 | 153 | 58.54% |
| `src/authentication/oauth/token-crypto.ts` | 32 | 13 | 59.38% |
| `src/utils/hash.ts` | 60 | 23 | 61.67% |
| `src/express/middleware/ReactoryCors.ts` | 48 | 18 | 62.50% |
| `src/application/decorators/cache/cached.ts` | 78 | 28 | 64.10% |
| `src/authentication/password/PasswordHasher.ts` | 118 | 42 | 64.41% |
| `src/application/decorators/rateLimit/rateLimit.ts` | 147 | 43 | 70.75% |
| `src/application/decorators/telemetry/counter.ts` | 4 | 1 | 75.00% |
| `src/application/decorators/telemetry/histogram.ts` | 4 | 1 | 75.00% |
| `src/utils/url/subresourceIntegrity.ts` | 87 | 21 | 75.86% |
| `src/application/decorators/audit/audit.ts` | 162 | 37 | 77.16% |
| `src/application/decorators/telemetry/metric.ts` | 144 | 30 | 79.17% |
| `src/utils/string.ts` | 69 | 11 | 84.06% |
| `src/application/decorators/telemetry/traced.ts` | 22 | 3 | 86.36% |
| `src/authentication/oauth/token-store.ts` | 31 | 4 | 87.10% |
| `src/authentication/oauth/state.ts` | 23 | 2 | 91.30% |
| **All 20 files** | **2,089** | **903** | **56.77%** |

The weak spots are the request pipeline. `cors.ts` and `ReactoryClient.ts` account for 382 of the 903 undetected mutants, many of them NoCoverage (code paths no unit suite reaches), followed by the error sanitiser in `exceptions/index.ts`. `token-crypto.ts` has 12 NoCoverage mutants, almost all in `resolveMasterKey` (the env-var fallback chain and the "no key configured" error): the suite always passes a key explicitly, so the code that picks one in production is never run.

### Refreshing the baseline

`yarn test:mutation:update-baseline` rewrites the entries of every file in the
last report and **carries over** every other entry unchanged, so refreshing
after a single-file run is safe.

Refresh when:

- a file improved (the check printed it under `N file(s) improved`);
- the scope changed (files added to `mutate` in `stryker.config.mjs`); say so in the commit message;
- new survivors are accepted on purpose (for example equivalent mutants); say which in the commit message.

Do **not** refresh from a **line-range** run (`--mutate file.ts:10-20`): its
report holds only that range's mutants, so the file's entry would be
understated. `--update` warns when a file's mutant count dropped; revert and
refresh from a full run of the file if that was the cause.

The Stryker version is pinned (exact version in `package.json`) because the
counts depend on its mutators. Upgrading Stryker means a fresh full run and a
refreshed baseline in the same change.

## In CI

The `mutation` job in `.github/workflows/ci.yml` runs `yarn test:mutation` on
every pull request, every push to `master` and on manual runs, and fails on the
same rule as the local gate. Its step summary prints the ratchet's result, and
the `mutation-report` artifact holds `mutation.html` and `mutation.json`:
download it to see the surviving mutants of a red run.

A full run is about 50 CPU-minutes, too slow for every pull request on a
4-core runner, so the job uses Stryker's incremental mode:

| Event | What runs | Cache |
|---|---|---|
| push to `master`, manual run | every mutant (`--force`) | saves `stryker-incremental.json` |
| pull request | only mutants whose code or covering tests changed since the latest `master` run | restores it |

A pull request that touches nothing in the scope re-tests almost nothing and
takes a few minutes, most of it `yarn install`. Without a cache (the first
run, or after the cache expires: GitHub evicts caches unused for 7 days) the
pull request does a full run. With three workers (what a 4-core runner gets) a
full run took 11 minutes on a developer laptop; a hosted runner is slower, so
the job allows 60.

The forced `master` run keeps the cache honest: incremental mode trusts its
diff of code and tests, and a full run on every merge stops reused results
from going stale.

**A red `mutation` job** means a file in the scope now has more undetected
mutants than its baseline entry. Download the report, find the new survivors
in that file, and add the tests that kill them. If the survivors are
equivalent mutants, or the change is a deliberate scope change, refresh the
baseline in the pull request and say why in the commit message.

## Scope

Mutation testing costs one test run per mutant, so Stryker runs on a chosen
slice of the core, listed in `stryker.config.mjs`:

- `mutate`: the source files. They are security-sensitive or widely shared
  (password hashing, OAuth state and token storage, error sanitisation, CORS
  and client authentication, the method decorators, string/hash/SRI
  utilities, resolver merging) and each has a fast, self-contained unit suite.
- `jest.config.testMatch`: the suites that exercise them. The jest config is
  the unit config (`jest.config.ts`) with these overrides, so module mapping,
  the babel transform and `test/setup/init.ts` all apply as usual.

**Widening the scope.** Add the source to `mutate` and its suite to
`testMatch` together (a source without a suite yields only NoCoverage),
run `yarn test:mutation --mutate <file>`, look at the survivors and add the
tests they call for, then run `yarn test:mutation:update-baseline`.
A suite qualifies when it is a unit suite (no live database or port; not in
`test/integrationSuites.js`), runs in seconds, and passes in a server-only
checkout.

### The sandbox holds what CI holds

Stryker copies the project into `.stryker-tmp/` and mutates the copy.
`ignorePatterns` (built by `sandboxIgnorePatterns()` in `stryker.config.mjs`)
makes that copy hold what a CI checkout holds:

- from the root, only `src/`, `test/` and the configs the tests read
  (`build/`, `docker/` and `backups/` run to gigabytes);
- **nothing git ignores**, read from `git ls-files --ignored` on every run.

The second rule is what makes the baseline reproducible. Two kinds of ignored
file change the results:

- **Module repositories.** Every module except `reactory-core` is its own
  repository, ignored by this one. Without them, a suite that needs one skips
  itself in the sandbox exactly as it does in CI. For that reason
  `src/express/middleware/__tests__/ordering.test.ts` is not in the scope: it
  loads the context provider, which imports `reactory-telemetry`.
- **Local configuration.** The client configs under `src/data/clientConfigs`
  are ignored, and `cors.ts` reads them at import. When they were copied in,
  a developer machine reached code paths a CI checkout cannot, and the same
  commit scored 14 mutants better locally than in CI.

Untracked files that git does *not* ignore (a new suite you have not
committed yet) are copied as usual. Without git (an exported tree) the config
falls back to fixed rules for the modules and client configs.

A result should never depend on the machine. If a local run and CI disagree on
a mutant, look for an ignored file the code reads, or a test that depends on
wall-clock timing (fix it with a fixed clock, as `oauth/__tests__/state.test.ts`
does for the state TTL).

### Settings worth knowing

| Setting | Value | Why |
|---|---|---|
| `coverageAnalysis` | `perTest` | each mutant runs only the tests that executed it |
| `checkers` | none | types are advisory here (ts-jest diagnostics off, a large tsc backlog), so a TypeScript checker would reject mutants for pre-existing errors |
| `incremental` | on | a re-run only re-tests mutants whose code or covering tests changed; `--force` or deleting `reports/mutation/stryker-incremental.json` gives a clean run |
| `jest.config.detectOpenHandles` | off | several suites leave timers behind; detection stalls the run |
| `timeoutMS` | 10000 | headroom for the slower crypto suites (PBKDF2) under full parallel load |
| version | 9.6.1 | the latest Stryker that supports Node 20 (`.nvmrc`); Stryker 10 needs Node 22 |

## Modules

Each module under `src/modules` except `reactory-core` is its own repository,
and the server's own scope and CI never see them. A module cannot run Stryker
by itself either: it has no jest config, test setup or root `node_modules` of
its own, and its suites import the server core. So **the server runs it, and
the module owns the scope and the baseline**:

```bash
yarn test:mutation:module reactory-temporal                     # run Stryker on the module's scope, then check its baseline
yarn test:mutation:module reactory-temporal --mutate src/modules/reactory-temporal/services/X.ts   # one file
yarn test:mutation:module:check reactory-temporal               # re-check the last report
yarn test:mutation:module:update-baseline reactory-temporal     # rewrite the module's baseline from the last report
```

`--mutate` on the command line is relative to the server root, like every
other Stryker path; only the scope file is relative to the module.

### Opting a module in

Commit two files to the **module's** repository:

**`mutation.config.json`**, the scope, with paths relative to the module:

```json
{
  "mutate": ["services/TemporalClientService.ts", "services/TemporalEventBridgeService.ts"],
  "tests": ["services/__tests__/TemporalClientService.test.ts", "services/__tests__/TemporalEventBridgeService.test.ts"],
  "needs": []
}
```

| Field | Meaning |
|---|---|
| `mutate` | source files (globs allowed) to mutate |
| `tests` | the suites that exercise them (globs allowed). Each must import what it tests: Stryker runs only suites related to a mutated file, so a suite that only reads files from disk is never run |
| `needs` | other modules the suites load **at runtime**. `reactory-core` is always present. Usually empty: modules reach each other through `context.getService(...)` and type imports, which need nothing at runtime |

**`mutation-baseline.json`**, written by
`yarn test:mutation:module:update-baseline <name>` after the first run, keyed
by paths relative to the module. A first run without it reports every file as
`no entry`, which is expected.

The same rules apply as for the server scope: each suite must pass on its own
(Stryker refuses to start when a suite fails before any mutation), must not
need live infrastructure, and must not depend on wall-clock timing.

### What the module run does

`REACTORY_MUTATION_MODULE=<name>` (set by the scripts) switches
`stryker.config.mjs` into module mode (`scripts/ci/mutationModule.js`):

- the scope comes from the module's `mutation.config.json`;
- the sandbox is the server's (core, `reactory-core`, nothing git ignores)
  plus the module and each module in `needs`, each minus what its own
  repository ignores, **except its `node_modules`**: those hold the
  dependencies yarn could not hoist to the root, and the module's code
  resolves them first;
- reports and the incremental cache go to `reports/mutation/modules/<name>/`;
- the gate reads and writes `src/modules/<name>/mutation-baseline.json`.

The run refuses to start, with a message that says why, when the module is not
checked out, has no `mutation.config.json`, the file is malformed or points
outside the module, or a module in `needs` is missing. A missing dependency
would make suites skip or fail, so the numbers would depend on the machine.

### First module: reactory-temporal

| File | Mutants | Undetected | Score |
|---|---:|---:|---:|
| `services/TemporalEventBridgeService.ts` | 425 | 257 | 39.53% |
| `services/TemporalClientService.ts` | 349 | 185 | 46.99% |
| **Both** | **774** | **442** | **42.89%** |

A full run of the two files takes about 90 seconds.

### Modules in CI

The shared workflow `server-module-tests.yml` in `reactorynet/.github` runs a
module's unit suites and its mutation gate in the module's own repository. A
module calls it with a few lines (see `docs/server-module-tests.md` there); it
checks out this server, puts the module at `src/modules/<name>` with its
`needs` beside it, installs, and runs `yarn test:mutation:module <name>`
incrementally on pull requests and in full on pushes, like the server's own
`mutation` job. `reactory-temporal` is the first caller.

The workflow tests against this server's `master` by default and skips
mutation testing (with a warning) when the server it checked out has no
`test:mutation:module`, so callers can land before this change does.

## Troubleshooting

- **"Something went wrong in the initial test run"**: a suite in `testMatch`
  fails before any mutation. Stryker prints the failing test above the stack
  trace. A `Cannot find module '…/modules/reactory-…'` means the suite needs a
  module that the sandbox leaves out: take the suite out of the scope rather
  than widening `ignorePatterns`.
- **Out of memory / the machine crawls**: lower `--concurrency`.
- **A file shows only NoCoverage**: its suite is not in `testMatch`, or the
  suite mocks the module it is meant to test.
- **"No tests were found"**: no suite in `testMatch` imports a mutated file.
  Stryker runs only related suites, so a suite that checks files on disk
  without importing the code never runs.
- **Results look stale**: run with `--force`.
