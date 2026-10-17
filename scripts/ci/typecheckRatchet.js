/**
 * Pure decision logic for the type-check ratchet (scripts/ci/typecheck-ratchet.js).
 *
 * Kept out of the CLI so the rules can be exercised by a test without running
 * `tsc` over the whole repository. Every function is pure: it takes tsc output
 * (or the parsed form of it) and returns a decision, so a caller can rehearse
 * "what would the gate do?" against a fixture.
 */
const { absentModuleIn } = require('./moduleConfiguration');

/** `<file>(<line>,<column>): error TS<code>: <message>` */
const ERROR_LINE = /^(.+?)\(\d+,\d+\): error TS\d+:/;
/** `Cannot find module '<specifier>'` — the shape an absent module leaves behind. */
const ABSENT_MODULE_LINE = /^(.+?)\(\d+,\d+\): error TS2307: Cannot find module '([^']+)'/;

const normalise = (file) => String(file).replace(/\\/g, '/');

/**
 * Count the errors tsc reported, per file. Only lines that start with a
 * file/line/column are errors; the "Found N errors" summary and the
 * "Errors  Files" table tsc prints in pretty mode are ignored.
 */
const parseTscOutput = (output) => {
  const counts = {};
  let total = 0;
  for (const line of String(output || '').split('\n')) {
    const match = ERROR_LINE.exec(line);
    if (!match) continue;
    const file = normalise(match[1]);
    counts[file] = (counts[file] || 0) + 1;
    total += 1;
  }
  return { counts, total };
};

/**
 * Files that cannot be type-checked meaningfully because they import a module
 * this checkout does not contain: `Map<file, module>`.
 *
 * The error the compiler reports for them is about the *checkout*, not about
 * the code, so both the check and the baseline refresh treat the file as
 * "not checked" rather than as regressions or improvements.
 */
const findSkippedFiles = (output, present) => {
  const skipped = new Map();
  for (const line of String(output || '').split('\n')) {
    const match = ABSENT_MODULE_LINE.exec(line);
    if (!match) continue;
    const module = absentModuleIn(match[2], present);
    if (module) skipped.set(normalise(match[1]), module);
  }
  return skipped;
};

/**
 * Whether a file's error count means anything in this checkout. Files that
 * import an absent module are not checkable, and neither are the files of an
 * absent module (they are not even on disk here).
 */
const isCheckable = (file, { skipped, present }) =>
  !skipped.has(file) && !absentModuleIn(file, present);

/**
 * Compare the current counts against the baseline.
 *
 * A file is a regression only when it has more errors than the baseline allows
 * *and* this checkout can actually check it. Fixing errors never fails; the
 * improvements are returned so the caller can tell the operator to ratchet
 * down.
 */
const compareWithBaseline = ({ counts, skipped, present, baseline }) => {
  const allowedByFile = (baseline && baseline.files) || {};
  const regressions = [];
  const improvements = [];

  for (const [file, count] of Object.entries(counts)) {
    if (!isCheckable(file, { skipped, present })) continue;
    const allowed = allowedByFile[file] || 0;
    if (count > allowed) regressions.push({ file, count, allowed });
  }

  for (const [file, allowed] of Object.entries(allowedByFile)) {
    if (!isCheckable(file, { skipped, present })) continue;
    const count = counts[file] || 0;
    if (count < allowed) improvements.push({ file, count, allowed });
  }

  return { regressions, improvements };
};

/**
 * Merge the current counts into a new baseline.
 *
 * Entries for files this checkout cannot check are *carried over* from the
 * previous baseline instead of being dropped. That is what makes `--update`
 * safe in a checkout that lacks modules: a server-only checkout cannot lower a
 * module's entries, and a full checkout can lower them all. It is also the only
 * way the documented refresh can ever run at all — some modules (reactory-email,
 * reactory-sms, reactory-whatsapp) are optional and absent from *every*
 * checkout, so refusing whenever a file imports one refused unconditionally.
 *
 * Files that can be checked are recorded exactly as they are now, which both
 * lowers improved entries and raises regressed ones.
 */
const mergeBaseline = ({ counts, skipped, present, previous }) => {
  const files = {};
  const preserved = {};

  for (const [file, count] of Object.entries(counts)) {
    if (!isCheckable(file, { skipped, present })) continue;
    files[file] = count;
  }

  for (const [file, allowed] of Object.entries((previous && previous.files) || {})) {
    if (isCheckable(file, { skipped, present })) continue;
    files[file] = allowed;
    preserved[file] = allowed;
  }

  const sorted = Object.fromEntries(Object.keys(files).sort().map((file) => [file, files[file]]));
  const total = Object.values(sorted).reduce((sum, count) => sum + count, 0);

  return { total, files: sorted, preserved };
};

module.exports = {
  parseTscOutput,
  findSkippedFiles,
  isCheckable,
  compareWithBaseline,
  mergeBaseline,
};
