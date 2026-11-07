# Test plan — platformFlags (REACTORY-302016408)

## Behaviour under test
`stripLauncherFlags` / `isLauncherReservedFlag` implement the launcher/sub-command
argument contract: a launcher-owned `--silent` is dropped before a sub-command
parses its argv, while every other flag (including typos) is preserved so the
parser can still fail loudly.

## Cases
1. `--silent` is the only reserved flag; `-v` / `--verbose` are not reserved
   (commands own that decision).
2. `isLauncherReservedFlag` matches `--silent` and `--silent=<value>` only — not
   `--silentfoo`, `--silently`, `--verbose`.
3. `stripLauncherFlags` preserves order/values, removes `--silent` from the
   start/middle/end, does not mutate its input, keeps unknown flags.
4. Missing/non-array/non-string input does not throw.

## Out of scope
Launcher behaviour itself (covered by `launcherContract.test.ts`), and each
command's own parser (covered by that command's suite).
