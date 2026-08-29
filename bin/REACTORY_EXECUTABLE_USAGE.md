# Reactory CLI — usage guide

## One entry point

**`bin/reactory` is the CLI.** It is also the package's npm `bin` entry
(`package.json` → `"bin": { "reactory": "./bin/reactory" }`).

`bin/cli.sh` is a **deprecated shim** that forwards to it and prints a notice on stderr.
It is retained only so deployed images and existing muscle memory keep working, and will
be removed in a future release. Set `REACTORY_SUPPRESS_DEPRECATION=1` to silence the
notice in scripts.

> Earlier revisions of this guide recommended `bin/cli.sh`. That advice is obsolete —
> `bin/reactory` is a strict superset and `cli.sh` had several defects (see below).

## Usage

```bash
bin/reactory <command> [options]

# Workflow operations
bin/reactory workflow stats
bin/reactory workflow start core.MyWorkflow@1.0.0 --input='{"foo": 1}'
bin/reactory workflow get <instanceId> -o json

# Code generation
bin/reactory service-gen -c ./service.yaml -o ./generated
bin/reactory module-gen --name MyModule --namespace myapp

# Help
bin/reactory help
```

Quote arguments containing spaces as usual — both launchers now preserve argument
boundaries exactly, so JSON payloads survive intact.

## Global options

| Option | Meaning |
|---|---|
| `--cname=<name>` | Configuration name (default `reactory`, or `$REACTORY_CONFIG_NAME`) |
| `--cenv=<env>` | Configuration environment (default `local`, or `$REACTORY_CONFIG_ENV`) |
| `--debug` | Attach the Node inspector |
| `--watch` | Run under nodemon |
| `--verbose`, `-v` | Verbose logging (quiet by default) |

## Command aliases

`bin/reactory` maps hyphenated names to the registered PascalCase command:

| Typed | Resolves to |
|---|---|
| `service-gen` | `ServiceGen` |
| `module-gen` | `ModuleGen` |
| `schema-gen` | `SchemaGen` |
| `csv2json` | `Csv2Json` |
| `init-system` | `InitializeSystemUser` |

PascalCase also works directly. Commands registered by modules (e.g. `workflow`) are
resolved by stem or feature action and need no mapping.

## Why `cli.sh` was retired

| | `cli.sh` (before the shim) | `bin/reactory` |
|---|---|---|
| Runs from any working directory | ✗ — relative paths, project root only | ✓ |
| `REACTORY_CONFIG_NAME` / `_ENV` | ✗ | ✓ |
| `--debug` | ✗ — set `NODE_DEBUG_OPTIONS`, never used it | ✓ |
| `help` / usage output | ✗ | ✓ |
| Command aliases | ✗ | ✓ |
| Exit-code propagation | fragile (`$?` read after `fi`) | ✓ |
| npm `bin` entry | ✗ | ✓ |

Both scripts previously shared two defects, now fixed:

- **Neither ran anything.** The CLI took the command from `argv[0]`, but `cli.sh` omitted
  the `--` separator (leaving babel's own flags in front) and `bin/reactory` prepended
  `--silent`. The command resolved to `null`, `MultiStageJobRunner` skipped the job, and
  the process printed `Goodbye.` and exited **0** — a silent no-op. The CLI now resolves
  the first non-flag token as the command and exits `1` with `No command found in
  arguments: …` when there is none.
- **Arguments containing spaces were split.** Both built their argument list as an
  unquoted string, so `--input='{"id": 1}'` arrived as two fragments and failed with
  `Unexpected end of JSON input`. Both now use bash arrays.

## Install globally

```bash
cd <repo root>
npm link      # or: yarn link
reactory workflow stats
```

## Packaging

`bin/build.bin.rsync` ships both `reactory` and the `cli.sh` shim into the built image.
**If you remove `cli.sh`, remove its manifest entry in the same commit** — and never drop
`reactory` from the manifest, or the shim in the image will forward to a missing file.
