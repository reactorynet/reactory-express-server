import fs from 'fs';
import path from 'path';

/**
 * REACTORY-302016408.
 *
 * The launcher (`bin/reactory`) owns `--silent` / `--verbose`; it must not inject them
 * into the argv of the command it dispatches. The original defect was exactly that
 * injection: `--silent` was appended to every non-verbose invocation, so
 * `reactory demographics-seed` failed with `Unknown argument [--silent]` no matter what
 * the command did. This suite pins the launcher half of the contract so the fix cannot
 * be silently reverted (which a unit test of the parsers alone would not catch).
 *
 * It also pins the FILE MODE. During review the launcher content was correct but the
 * worktree file had been rewritten as 100644, so `./bin/reactory` exited 126
 * Permission denied — while `bash -n` and every content assertion still passed. A
 * content-only test cannot see that, so the executable bit is asserted here.
 */
const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const LAUNCHER = path.join(REPO_ROOT, 'bin', 'reactory');
const SHIM = path.join(REPO_ROOT, 'bin', 'cli.sh');

/** File modes are a POSIX concept; skip the mode assertions on Windows. */
const itPosix = process.platform === 'win32' ? it.skip : it;

describe('bin/reactory launcher argument contract', () => {
  let script: string;

  beforeAll(() => {
    if (!fs.existsSync(LAUNCHER)) {
      throw new Error(`Launcher script not found at ${LAUNCHER}`);
    }
    script = fs.readFileSync(LAUNCHER, 'utf8');
  });

  // ---------------------------------------------------------------------------
  // File mode (review B1)
  //
  // The ticket's headline criterion is that `bin/reactory demographics-seed` runs.
  // A non-executable launcher fails at the OS level before any of the argv logic
  // below is reached, so the mode is part of the contract, not a nicety.
  // POSIX-only: Windows has no execute bit in the same sense.
  // ---------------------------------------------------------------------------

  itPosix('is executable', () => {
    expect(fs.statSync(LAUNCHER).mode & 0o111).not.toBe(0);
  });

  itPosix('ships the cli.sh shim executable too', () => {
    expect(fs.statSync(SHIM).mode & 0o111).not.toBe(0);
  });

  itPosix('can actually be executed (not merely parsed)', () => {
    // `bash -n` and every string assertion pass on a 100644 file; only an execution
    // attempt proves the mode. No arguments makes the launcher print its help and
    // exit 0 BEFORE it resolves env files, node_modules or the database, so this
    // needs no configuration and cannot touch a tenant.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { spawnSync } = require('child_process');
    const result = spawnSync(LAUNCHER, [], { encoding: 'utf8', timeout: 20000 });

    expect(`${result.stderr || ''}`).not.toMatch(/Permission denied/i);
    expect(result.status).toBe(0);
    expect(`${result.stdout || ''}`).toMatch(/Reactory CLI/);
  });

  // ---------------------------------------------------------------------------
  // argv composition
  // ---------------------------------------------------------------------------

  it('dispatches the command followed by the caller arguments, and nothing else', () => {
    expect(script).toContain('CLI_ARGS=("$COMMAND" "${KWARGS[@]}")');
  });

  it('never appends --silent to the sub-command argv', () => {
    // The exact injection that broke every strict parser.
    expect(script).not.toMatch(/CLI_ARGS\+=\("--silent"\)/);
    expect(script).not.toMatch(/CLI_ARGS\+=\('--silent'\)/);
  });

  it('still accepts --silent as its own (launcher-level) flag, in both spellings', () => {
    // Both spellings matter. platformFlags.isLauncherReservedFlag() treats
    // `--silent` and `--silent=<value>` as the same reserved flag; if the launcher
    // matched only the bare form, `--silent=1 demographics-seed` would fall through
    // to the default branch and capture the FLAG TOKEN as the command name.
    expect(script).toMatch(/^\s*--silent\|--silent=\*\)$/m);
  });
});
