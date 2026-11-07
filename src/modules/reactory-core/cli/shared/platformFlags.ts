/**
 * REACTORY-302016408 — the launcher/sub-command argument contract.
 *
 * `bin/reactory` (the single CLI entry point, see bin/REACTORY_EXECUTABLE_USAGE.md)
 * used to append `--silent` to *every* sub-command's argv unless the caller passed
 * `--verbose`. Strict sub-command parsers - correctly - reject flags they do not
 * know, so the documented plain invocation could never succeed:
 *
 *   $ bin/reactory demographics-seed
 *   [ArgumentError] Unknown argument [--silent].
 *   Supported: --organizationIds <ids>, -h, --help
 *
 * The launcher no longer forwards its own output flags (see
 * `src/reactory/cli/CLI.md`, "Argument contract"), which fixes the class of bug at
 * the source. A sub-command must nevertheless not depend on *which* launcher invoked
 * it: an already-deployed older `bin/reactory`, a YAML job `args:` list, the
 * `bin/cli.sh` shim, or a direct
 * `babel-node src/reactory/cli/index.ts <command> --silent` all reach the same
 * component. Every sub-command therefore strips the reserved launcher flags before
 * parsing them.
 *
 * This is deliberately NOT a permissive catch-all: only the flags listed in
 * `LAUNCHER_RESERVED_FLAGS` are dropped. Any other unknown flag still fails loudly,
 * so a typo (e.g. `--organizationId`) keeps its strict, safe behaviour.
 *
 * Deliberately NOT reserved: `-v` / `--verbose`. Several commands (schema-gen,
 * service-gen, security, workflow) declare and honour them, so whether they mean
 * anything is a per-command decision, not a launcher one.
 */

/**
 * Flags owned by the CLI launcher. They control the launcher's own diagnostics and
 * are never part of a sub-command's argument contract, so a sub-command ignores them
 * rather than reporting them as an unknown argument.
 */
export const LAUNCHER_RESERVED_FLAGS: ReadonlySet<string> = new Set(['--silent']);

/**
 * True when `token` is a launcher-reserved flag. Accepts both the bare `--silent`
 * and the `--silent=<value>` spelling.
 */
export const isLauncherReservedFlag = (token: string): boolean => {
  if (typeof token !== 'string' || token.length === 0) return false;
  const eq = token.indexOf('=');
  const flag = eq === -1 ? token : token.slice(0, eq);
  return LAUNCHER_RESERVED_FLAGS.has(flag);
};

/**
 * The argument list a sub-command parser should see: the caller's arguments minus any
 * launcher-reserved flag. Non-mutating. A non-array input yields an empty list, because
 * the interactive REPL and YAML job definitions are not guaranteed to pass one.
 */
export const stripLauncherFlags = (vargs: string[] = []): string[] => {
  if (!Array.isArray(vargs)) return [];
  return vargs.filter((token) => !isLauncherReservedFlag(`${token}`));
};
