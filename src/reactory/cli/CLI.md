# Reactory CLI Documentation

## Overview
The Reactory CLI provides a set of commands to manage and interact with the Reactory platform. This document outlines the available commands and their usage.

> **CLI authors:** read [Argument contract: who owns `--silent`](#argument-contract-who-owns---silent)
> before adding or changing a command. It is the rule that keeps `bin/reactory` and
> sub-command parsers from disagreeing about flags.

## Commands

### General Options
- `-h, --help`
  - Description: Displays the help message.
  
- `-l, --list [module]`
  - Description: Lists commands available. Providing a module will filter results to that specific module.

### Configuration Options
- `--cname`
  - Description: Specifies the configuration name.
  - Default: `reactory`
  
- `--cenv`
  - Description: Specifies the environment name.
  - Default: `local`
  
### Command-Specific Options
- `-p, --partner`
  - Description: The partner to use for the command.
  
- `-u, --user`
  - Description: The user to use for the command.
  
- `-pwd, --password`
  - Description: The password to use for the command.

### Listing available modules
- `--modules`
  - Description: Lists all the modules available.

## Usage Example
To start the Reactory AI bot reactor and use the command line, use the following command:

```sh
cli.sh reactor -p=reactory -u=reactory@local -pwd=Password123! --cenv=local --cname=reactory
```

This command will:
- Use `reactor` as the command.
- Set the partner to `reactory`.
- Use `reactory@local` as the user.
- Set `Password123!` as the password.
- Specify `local` as the environment.
- Use `reactory` as the configuration name.

## Argument contract: who owns `--silent`

**The launcher owns its own flags. A command never sees them.**

| Flag | Owner | Meaning |
|---|---|---|
| `--silent` | `bin/reactory` | quiet launcher output (the default) |
| `--verbose`, `-v` | `bin/reactory` | launcher diagnostics (config / env / argv echo) |
| `--cname=`, `--cenv=`, `--debug`, `--watch`, `--bun` | `bin/reactory` | launcher / runtime selection |

### The rules

1. **The launcher does not forward its own flags.** The argv handed to the CLI module is the
   command followed by the caller's arguments — nothing else (`CLI_ARGS=("$COMMAND" "${KWARGS[@]}")`
   in `bin/reactory`). Until REACTORY-302016408 the launcher appended `--silent` to every
   non-verbose run, which made every strict parser reject the documented plain invocation
   (`reactory demographics-seed` → `Unknown argument [--silent]`). Do not reintroduce it.

   This was also load-bearing by accident: a value-less flag used to abort only because the
   trailing `--silent` was rejected as unknown. Removing the injection removed that guard, so
   a flag whose value is missing must now be rejected on its own merits —
   `--organizationIds` with no value is a hard `ArgumentError`, not "no filter".
   `--organizationId` (a typo) must still fail with `Unknown argument`.
2. **Commands strip launcher-reserved flags before parsing.** Call
   `stripLauncherFlags(vargs)` from
   `src/modules/reactory-core/cli/shared/platformFlags.ts` as the first thing a parser does.
   It drops **only** `LAUNCHER_RESERVED_FLAGS` (`--silent`), so strict parsers stay strict:
   `--organizationId` (a typo) must still fail with `Unknown argument`.
3. **Do not silence machine-readable output.** `--silent` describes the launcher's chatter,
   not the command's result. A command whose product is a JSON/YAML summary on stdout keeps
   printing it when the launcher is quiet — a silent run must not erase the data an
   operator or pipeline consumes.
4. **`--verbose` is the launcher's too — do not special-case it.** `-v` / `--verbose` are
   consumed by `bin/reactory` and never forwarded, so `bin/reactory <command> --verbose`
   works without the command knowing the flag. A command may still *declare* its own
   `--verbose` (schema-gen, service-gen, security and workflow do), but only a direct
   `npx babel-node src/reactory/cli/index.ts <command> --verbose` reaches it; never make
   essential behaviour depend on it. Commands that do **not** declare it must reject it like
   any other unknown flag — do not add a private exception (that is the inconsistency
   REACTORY-302016408 removed from `demographics-seed`).

### Family audit (REACTORY-302016408)

Regression tests for this contract:
`cli/shared/__tests__/launcherContract.test.ts` (launcher argv + executable bit),
`cli/shared/__tests__/platformFlags.test.ts` (the helper), and
`cli/shared/__tests__/familyLauncherFlags.test.ts` (csv2json / schema-gen / service-gen).

Every command reachable from `bin/reactory` that parses argv was audited for the
launcher-injects-a-flag / parser-rejects-it mismatch. Commands with no argv parser or no
implementation are listed too, so the "what did we check" question has one answer:

| Command | Parser | Before the fix | After |
|---|---|---|---|
| `demographics-seed` | strict — `DemographicsCli` | **broken**: plain invocation failed with `Unknown argument [--silent]` | strips launcher flags; rejects `-v`/`--verbose` like its siblings |
| `demographics-legacy-migrate` | strict — `LegacyDemographicsMigrationCli` | **broken**: same failure | strips launcher flags |
| `schema-gen` | strict — `SchemaGen` | **broken**: same failure (the `--silent` token also defeated the "no arguments" guard) | strips launcher flags |
| `service-gen` | strict — `ServiceGen` | **broken**: same failure | strips launcher flags |
| `csv2json` | strict — `csv2json` | **broken**: same failure | strips launcher flags |
| `workflow` | tolerant — `WorkflowCli` ignores unknown flags | worked by luck; typos are silently ignored | documented; left tolerant (an explicit per-command decision) |
| `security` | tolerant — `SecurityCli` ignores unknown flags | worked by luck | documented |
| `service-keys` | no argv parser — reads a positional object | not affected | documented |
| `init-system` | `InitializeSystemUser` reads env only | not affected | documented |
| `protobuf` | `ProtoServerCli` stub, ignores argv | not affected | documented |
| `module-gen` | **no implementation** — `cli/module/module-init.ts` / `module-install.ts` are empty (0-byte) files, yet `bin/reactory` advertises the alias | not affected (nothing to parse) | documented; the alias resolves to no registered command — a separate defect, see below |

Known separate defect, out of scope here: `module-gen` is advertised in `bin/reactory`'s help
and handled by `map_command`, but no command is registered for it, so invoking it cannot
succeed regardless of flags. Recorded rather than silently omitted.

### Adding a new CLI command — checklist

1. Parse your own arguments; reject anything you did not declare.
2. Start the parser with `stripLauncherFlags(vargs)` so a launcher flag can never be reported
   as a typo.
3. Do **not** invent your own `--silent`; if you need quiet output, name it explicitly and
   document the trade-off (always keep the machine-readable result on stdout).
4. Add a test that the *documented plain invocation* parses (`parseMyArgs([])`).
5. Add a test that an unknown flag still fails.