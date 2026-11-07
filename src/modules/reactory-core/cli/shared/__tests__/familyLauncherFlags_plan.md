# Test plan — family launcher-flag handling (REACTORY-302016408)

## Behaviour under test
`csv2json`, `schema-gen` and `service-gen` call `stripLauncherFlags()` before parsing, so
a launcher-forwarded `--silent` cannot be reported as an unknown argument — while a genuine
unknown flag still errors. Review finding N2: these three were fixed by inspection only.

## Cases (table-driven, one row per command)
1. `['--silent']` → the command's own "No arguments provided" error, exit 1, and no error
   message mentions `--silent`.
2. `['--silent', '--bogus']` → `Unknown argument: --bogus` (the strip does not launder a real
   typo).
3. `['--bogus']` → same error without `--silent`, pinning unchanged strictness.

## Why only error paths
Each case exits before any file I/O, so the suite needs no CSV/CSV-map fixture, no output
directory and no database. It proves the call site, which is what the review asked for.

## Out of scope
Happy-path generation for these three commands (pre-existing gap, tracked separately).
