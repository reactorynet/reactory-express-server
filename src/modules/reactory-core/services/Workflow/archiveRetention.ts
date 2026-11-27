/**
 * Workflow archive retention helpers (Ticket C).
 *
 * The archive workflow (Ticket B) moves MongoDB workflow instances onto disk as
 * *buckets*:
 *
 *     <REACTORY_DATA>/workflows/archive/<ns>/<name>/<ver>/<YYYY-MM>/
 *
 * This module owns every decision the purge makes about such a tree. It is
 * deliberately free of Reactory context/service plumbing so the dangerous parts
 * (window ordering, path validation, age derivation, recursive deletion) can be
 * unit-tested against a throwaway directory.
 *
 * Two clocks
 * ----------
 *   archive workflow : 30 days   (MongoDB -> disk)   DEFAULT_ARCHIVE_WINDOW_DAYS
 *   purge workflow   : 180 days  (disk  -> deleted) DEFAULT_PURGE_OLDER_THAN_DAYS
 *
 * The purge window MUST be strictly greater than the archive window, otherwise
 * it deletes archives the archive workflow has not yet produced a replacement
 * for. `assertPurgeWindow` is that assertion and it is not optional.
 *
 * Age
 * ---
 * Age is taken from the DATE ENCODED IN THE BUCKET NAME, not from `mtime`.
 * `mtime` is changed by copy, rsync, restore-from-backup and any tool that
 * touches the tree, so a restored archive would look brand new and be retained
 * forever. Only directories whose name does not parse as `YYYY-MM`
 * (legacy/hand-placed) fall back to `mtime`, and the caller logs that.
 *
 * Nothing here talks to MongoDB. Filesystem only.
 */

import fs from 'fs';
import path from 'path';

/** Archive workflow window (`MongoDB -> disk`). Overridable with REACTORY_WORKFLOW_ARCHIVE_DAYS. */
export const DEFAULT_ARCHIVE_WINDOW_DAYS = 30;
/** Purge workflow window (`disk -> deleted`). Must be > the archive window. */
export const DEFAULT_PURGE_OLDER_THAN_DAYS = 180;
/** Environment key that configures the archive workflow's window (in days). */
export const ARCHIVE_WINDOW_ENV_KEY = 'REACTORY_WORKFLOW_ARCHIVE_DAYS';

/** A bucket directory name is the UTC month it holds: `2026-10`. */
export const BUCKET_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * `<ns>/<name>/<ver>/<YYYY-MM>` — anything shallower is a definition directory
 * (or the archive root itself) and must never be deleted.
 */
export const MIN_BUCKET_DEPTH = 4;

export const MANIFEST_FILENAME = 'manifest.json';
export const MANIFEST_INDEX_FILENAME = 'manifest.index.json';
export const PURGE_LOG_FILENAME = 'purge.log.ndjson';
export const PURGE_LOCK_FILENAME = '.purge.lock';
/** Lock files an in-progress archive run may hold inside a bucket (Ticket C6). */
export const BUCKET_LOCK_FILENAMES = ['.lock', '.archive.lock'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Error codes carried by `WorkflowArchiveRetentionError`. */
export type WorkflowArchiveRetentionErrorCode =
  | 'PURGE_WINDOW_NOT_GREATER'
  | 'INVALID_PARAMETER'
  | 'PATH_GUARD'
  | 'BUCKET_GUARD'
  | 'PURGE_LOCKED';

/**
 * A refusal. Every `PATH_GUARD` / `BUCKET_GUARD` / `PURGE_WINDOW_NOT_GREATER`
 * throw happens *before* a single byte is deleted — the service never catches
 * these and continues.
 */
export class WorkflowArchiveRetentionError extends Error {
  public readonly code: WorkflowArchiveRetentionErrorCode;

  constructor(code: WorkflowArchiveRetentionErrorCode, message: string) {
    super(message);
    this.name = 'WorkflowArchiveRetentionError';
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parameter coercion
//
// `service_invoke` renders every template value as a string, so a workflow that
// passes `dryRun: ${input.dryRun}` delivers "true"/"false" and `olderThanDays`
// arrives as "180". Coerce explicitly — and never let an unparseable value fall
// back to the destructive default by accident.
// ─────────────────────────────────────────────────────────────────────────────

export function asBooleanParam(value: unknown, name: string, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  throw new WorkflowArchiveRetentionError(
    'INVALID_PARAMETER',
    `Invalid value for ${name}: "${String(value)}". Expected a boolean (true/false).`,
  );
}

export function asPositiveIntegerParam(value: unknown, name: string): number {
  if (value === undefined || value === null || value === '') {
    throw new WorkflowArchiveRetentionError(
      'INVALID_PARAMETER',
      `${name} is required and must be a positive integer number of days.`,
    );
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new WorkflowArchiveRetentionError(
      'INVALID_PARAMETER',
      `Invalid value for ${name}: "${String(value)}". Expected a positive whole number of days.`,
    );
  }
  return parsed;
}

/** Resolve the archive workflow's window: explicit override → env → default (30). */
export function resolveArchiveWindowDays(override?: unknown): number {
  if (override !== undefined && override !== null && override !== '') {
    return asPositiveIntegerParam(override, 'archiveWindowDays');
  }
  const raw = process.env[ARCHIVE_WINDOW_ENV_KEY];
  if (raw === undefined || String(raw).trim() === '') return DEFAULT_ARCHIVE_WINDOW_DAYS;
  return asPositiveIntegerParam(raw, ARCHIVE_WINDOW_ENV_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// C1 — the two clocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Refuse a purge window that is not strictly greater than the archive window.
 *
 * Load-bearing: `olderThanDays: 30` with an archive window of 30 would delete a
 * month of archives as they are written, and `olderThanDays: 3` would delete
 * data that has not been reclaimed from the live set at all.
 */
export function assertPurgeWindow(olderThanDays: number, archiveWindowDays: number): void {
  if (!Number.isFinite(olderThanDays) || !Number.isFinite(archiveWindowDays)) {
    throw new WorkflowArchiveRetentionError(
      'INVALID_PARAMETER',
      `Cannot compare purge window (${olderThanDays}) with archive window (${archiveWindowDays}): both must be numbers.`,
    );
  }
  if (olderThanDays <= archiveWindowDays) {
    throw new WorkflowArchiveRetentionError(
      'PURGE_WINDOW_NOT_GREATER',
      `Refusing to purge: olderThanDays (${olderThanDays}) must be strictly greater than the archive window ` +
        `(${archiveWindowDays} days). The purge deletes what the archive workflow wrote; a window at or below ` +
        `the archive window would delete archives before the live data they represent has been reclaimed. ` +
        `Use a larger olderThanDays (default ${DEFAULT_PURGE_OLDER_THAN_DAYS}) or fix ${ARCHIVE_WINDOW_ENV_KEY}.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C2 — age
// ─────────────────────────────────────────────────────────────────────────────

/** UTC cutoff: `now - olderThanDays`. Never local time (bucket names are UTC). */
export function computeCutoff(olderThanDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - olderThanDays * DAY_MS);
}

export interface IBucketMonth {
  year: number;
  /** 1-12 */
  month: number;
  /** `YYYY-MM`, the exact directory name. */
  key: string;
  /** First instant of the month, UTC. */
  startUtc: Date;
  /** Last millisecond of the month, UTC. */
  endUtc: Date;
}

/** Parse `2026-10` → month window. Returns null for anything that is not a bucket name. */
export function parseBucketMonth(name: string): IBucketMonth | null {
  const match = BUCKET_MONTH_PATTERN.exec(String(name ?? '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const startMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  const endMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - 1;
  return {
    year,
    month,
    key: `${match[1]}-${match[2]}`,
    startUtc: new Date(startMs),
    endUtc: new Date(endMs),
  };
}

export interface IBucketAge {
  /** `name` when the directory name parsed as YYYY-MM, `mtime` for legacy dirs. */
  ageSource: 'name' | 'mtime';
  bucketMonth: string | null;
  /** The instant the bucket's data is considered to end (month end UTC, or mtime). */
  effectiveDate: Date;
  /** Whole days between the effective date and the cutoff's reference "now". */
  ageDays: number;
  /** True when the bucket's data ends before the cutoff. */
  olderThanCutoff: boolean;
}

/**
 * Derive a bucket's age.
 *
 * A `YYYY-MM` bucket is old when the WHOLE month it holds is older than the
 * cutoff (`endUtc < cutoff`). Using the month end rather than the month start
 * keeps the newest bucket alive for the extra days it legitimately holds data.
 */
export function resolveBucketAge(
  bucketPath: string,
  cutoff: Date,
  now: Date = new Date(),
): IBucketAge {
  const name = path.basename(bucketPath);
  const month = parseBucketMonth(name);

  if (month) {
    return {
      ageSource: 'name',
      bucketMonth: month.key,
      effectiveDate: month.endUtc,
      ageDays: Math.floor((now.getTime() - month.startUtc.getTime()) / DAY_MS),
      olderThanCutoff: month.endUtc.getTime() < cutoff.getTime(),
    };
  }

  const stats = fs.statSync(bucketPath);
  return {
    ageSource: 'mtime',
    bucketMonth: null,
    effectiveDate: stats.mtime,
    ageDays: Math.floor((now.getTime() - stats.mtime.getTime()) / DAY_MS),
    olderThanCutoff: stats.mtime.getTime() < cutoff.getTime(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// C3 — path validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve `target` to a real path even when it (or some of its parents) do not
 * exist yet: realpath the nearest existing ancestor and re-append the rest. This
 * is what makes a symlinked parent visible to the guard before anything is
 * created or deleted.
 */
export function realpathOfNearestExisting(target: string): string {
  const absolute = path.resolve(target);
  const missing: string[] = [];
  let cursor = absolute;

  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    missing.unshift(path.basename(cursor));
    cursor = parent;
  }

  let real: string;
  try {
    real = fs.realpathSync(cursor);
  } catch {
    real = cursor;
  }
  return missing.length > 0 ? path.join(real, ...missing) : real;
}

export interface IResolvedArchiveRoot {
  /** Absolute, symlink-resolved archive root. */
  archiveRoot: string;
  /** Absolute, symlink-resolved `<REACTORY_DATA>/workflows`. */
  workflowsRoot: string;
  /** Absolute, symlink-resolved `<REACTORY_DATA>/workflows/catalog`. */
  catalogRoot: string;
  /** The raw value the caller supplied (or the default). */
  requested: string;
}

/**
 * Validate a configurable archive root.
 *
 * Refuses:
 *  - when REACTORY_DATA is not set (cannot validate at all),
 *  - any root that does not resolve strictly inside `<REACTORY_DATA>/workflows`,
 *    including `/`, `../../`, and a symlink whose target escapes,
 *  - `<REACTORY_DATA>/workflows` itself (a bucket scan there would descend into
 *    the catalog),
 *  - anything inside `<REACTORY_DATA>/workflows/catalog` (live logs, not archives).
 */
export function resolveArchiveRootPath(
  params: { archiveRoot?: string; dataRoot?: string } = {},
): IResolvedArchiveRoot {
  const dataRoot = String(params.dataRoot ?? process.env.REACTORY_DATA ?? '').trim();
  if (!dataRoot) {
    throw new WorkflowArchiveRetentionError(
      'PATH_GUARD',
      'Cannot validate the archive root: REACTORY_DATA is not set. Set REACTORY_DATA to the Reactory data directory.',
    );
  }

  const workflowsRootRequested = path.resolve(dataRoot, 'workflows');
  if (!fs.existsSync(workflowsRootRequested)) {
    throw new WorkflowArchiveRetentionError(
      'PATH_GUARD',
      `Cannot validate the archive root: the workflows directory does not exist (${workflowsRootRequested}).`,
    );
  }
  const workflowsRoot = fs.realpathSync(workflowsRootRequested);
  const catalogRoot = realpathOfNearestExisting(path.join(workflowsRoot, 'catalog'));

  const requestedRaw = params.archiveRoot === undefined || params.archiveRoot === null
    ? ''
    : String(params.archiveRoot).trim();
  const requested = requestedRaw || path.join(workflowsRoot, 'archive');
  const archiveRoot = realpathOfNearestExisting(requested);

  const relation = path.relative(workflowsRoot, archiveRoot);
  const escapes =
    relation === '' ||
    relation === '..' ||
    relation.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relation);

  if (escapes) {
    throw new WorkflowArchiveRetentionError(
      'PATH_GUARD',
      `Refusing to use archiveRoot "${requested}" (resolved: ${archiveRoot}): it must be strictly inside ` +
        `${workflowsRoot}. A purge rooted outside the workflows tree could delete live data.`,
    );
  }

  const insideCatalog =
    archiveRoot === catalogRoot ||
    archiveRoot.startsWith(`${catalogRoot}${path.sep}`);

  if (insideCatalog) {
    throw new WorkflowArchiveRetentionError(
      'PATH_GUARD',
      `Refusing to use archiveRoot "${requested}": it resolves inside the workflow catalog (${catalogRoot}). ` +
        'Archive buckets live under the archive root, never inside the catalog.',
    );
  }

  if (!fs.existsSync(workflowsRoot)) {
    throw new WorkflowArchiveRetentionError(
      'PATH_GUARD',
      `Cannot validate the archive root: ${workflowsRoot} does not exist.`,
    );
  }

  // An archive root that exists but is not a directory cannot be scanned, and a
  // later `appendFileSync` into it would fail mid-run. Refuse up front.
  if (fs.existsSync(archiveRoot) && !fs.statSync(archiveRoot).isDirectory()) {
    throw new WorkflowArchiveRetentionError(
      'PATH_GUARD',
      `Refusing to use archiveRoot "${requested}": it exists but is not a directory.`,
    );
  }

  return { archiveRoot, workflowsRoot, catalogRoot, requested };
}

export interface IBucketPathCheck {
  bucketPath: string;
  relativePath: string;
  segments: string[];
}

/**
 * Per-bucket validation, repeated immediately before deletion (never trust the
 * scan alone — the tree may have changed since it was listed).
 *
 * Refuses: outside the archive root, shallower than MIN_BUCKET_DEPTH segments,
 * the archive root itself, a symlink (anywhere on the path), a non-directory, and
 * the protected names from C3.4.
 */
export function assertSafeBucketPath(bucketPath: string, archiveRoot: string): IBucketPathCheck {
  const root = path.resolve(archiveRoot);
  const absolute = path.resolve(bucketPath);
  const relativePath = path.relative(root, absolute);

  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new WorkflowArchiveRetentionError(
      'BUCKET_GUARD',
      `Refusing to delete "${absolute}": it is not inside the archive root (${root}).`,
    );
  }

  const segments = relativePath.split(path.sep).filter(Boolean);
  if (segments.length < MIN_BUCKET_DEPTH) {
    throw new WorkflowArchiveRetentionError(
      'BUCKET_GUARD',
      `Refusing to delete "${relativePath}": a bucket must be ${MIN_BUCKET_DEPTH} levels deep ` +
        '(<namespace>/<name>/<version>/<YYYY-MM>). That path is a definition directory or the archive root.',
    );
  }

  const base = segments[segments.length - 1];
  if ([MANIFEST_INDEX_FILENAME, PURGE_LOG_FILENAME, PURGE_LOCK_FILENAME].includes(base)) {
    throw new WorkflowArchiveRetentionError(
      'BUCKET_GUARD',
      `Refusing to delete "${relativePath}": ${base} is a protected file.`,
    );
  }

  const stats = fs.lstatSync(absolute);
  if (stats.isSymbolicLink()) {
    throw new WorkflowArchiveRetentionError(
      'BUCKET_GUARD',
      `Refusing to delete "${relativePath}": the bucket is a symbolic link.`,
    );
  }
  if (!stats.isDirectory()) {
    throw new WorkflowArchiveRetentionError(
      'BUCKET_GUARD',
      `Refusing to delete "${relativePath}": expected a directory.`,
    );
  }

  // Resolve the whole path: a symlinked ancestor could otherwise point the walk
  // outside the archive root even though the lexical path looks contained.
  const realBucket = fs.realpathSync(absolute);
  const realRoot = fs.realpathSync(root);
  const realRelative = path.relative(realRoot, realBucket);
  if (
    !realRelative ||
    realRelative === '..' ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    throw new WorkflowArchiveRetentionError(
      'BUCKET_GUARD',
      `Refusing to delete "${relativePath}": it resolves outside the archive root (${realBucket}).`,
    );
  }

  return { bucketPath: absolute, relativePath, segments };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanning and measuring
// ─────────────────────────────────────────────────────────────────────────────

export interface IArchiveBucketCandidate {
  /** Absolute path to the bucket directory. */
  bucketPath: string;
  /** Path relative to the archive root, `/`-free — stable for reports and logs. */
  relativePath: string;
  namespace: string;
  definitionName: string;
  version: string;
  /** Directory name (`2026-10`, or something legacy). */
  bucketName: string;
}

export interface IIgnoredEntry {
  relativePath: string;
  reason: string;
}

export interface IArchiveScan {
  buckets: IArchiveBucketCandidate[];
  ignored: IIgnoredEntry[];
}

const isDotEntry = (name: string): boolean => name.startsWith('.');

/**
 * Enumerate bucket directories: exactly `<root>/<ns>/<name>/<ver>/<leaf>`.
 *
 * The walk is depth-bounded rather than generic on purpose: it can never descend
 * into a bucket and mistake an instance directory for an archive bucket. Symlinks
 * are skipped (never followed) and reported.
 */
export function scanArchiveBuckets(archiveRoot: string): IArchiveScan {
  const buckets: IArchiveBucketCandidate[] = [];
  const ignored: IIgnoredEntry[] = [];

  const directories = (parent: string, relative: string): fs.Dirent[] => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(parent, { withFileTypes: true });
    } catch (error) {
      ignored.push({
        relativePath: relative,
        reason: `unreadable: ${(error as Error)?.message || String(error)}`,
      });
      return [];
    }

    return entries.filter((entry) => {
      if (isDotEntry(entry.name)) return false;
      if (entry.isSymbolicLink()) {
        ignored.push({ relativePath: path.join(relative, entry.name), reason: 'symbolic link' });
        return false;
      }
      return entry.isDirectory();
    });
  };

  for (const ns of directories(archiveRoot, '')) {
    for (const definition of directories(path.join(archiveRoot, ns.name), ns.name)) {
      for (const version of directories(path.join(archiveRoot, ns.name, definition.name), path.join(ns.name, definition.name))) {
        const versionDir = path.join(archiveRoot, ns.name, definition.name, version.name);
        const versionRelative = path.join(ns.name, definition.name, version.name);

        for (const leaf of directories(versionDir, versionRelative)) {
          buckets.push({
            bucketPath: path.join(versionDir, leaf.name),
            relativePath: path.join(versionRelative, leaf.name),
            namespace: ns.name,
            definitionName: definition.name,
            version: version.name,
            bucketName: leaf.name,
          });
        }
      }
    }
  }

  return { buckets, ignored };
}

export interface ITreeMeasurement {
  bytes: number;
  files: number;
}

/** Total size of the regular files under `root`. Symlinks are not followed. */
export function measureTree(root: string): ITreeMeasurement {
  let bytes = 0;
  let files = 0;

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files += 1;
        try {
          bytes += fs.statSync(full).size;
        } catch {
          /* a file that vanished mid-scan contributes 0 */
        }
      }
    }
  };

  walk(root);
  return { bytes, files };
}

/** Newest mtime under `root` (used to age legacy directories and log folders). */
export function newestMtime(root: string): Date | null {
  let newest: number | null = null;

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      try {
        const mtime = fs.statSync(full).mtime.getTime();
        if (newest === null || mtime > newest) newest = mtime;
      } catch {
        /* ignore */
      }
    }
  };

  walk(root);
  return newest === null ? null : new Date(newest);
}

export interface IBucketManifestFacts {
  found: boolean;
  parsed: boolean;
  instanceCount: number | null;
  archivedAt: string | null;
  declaredBytes: number | null;
  error?: string;
}

const firstFiniteNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
};

const firstIsoString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
      return String(value);
    }
  }
  return null;
};

/**
 * Read `manifest.json` for the audit record. Deliberately tolerant: Ticket B
 * owns the manifest shape, and a malformed manifest must not block a purge that
 * the operator asked for — the service logs the problem and measures the tree.
 */
export function readBucketManifest(bucketPath: string): IBucketManifestFacts {
  const manifestPath = path.join(bucketPath, MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    return { found: false, parsed: false, instanceCount: null, archivedAt: null, declaredBytes: null };
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = raw.trim() === '' ? {} : JSON.parse(raw);
    const instances = (manifest as any)?.instances;

    return {
      found: true,
      parsed: true,
      instanceCount: firstFiniteNumber(
        (manifest as any)?.instanceCount,
        (manifest as any)?.count,
        (manifest as any)?.totalInstances,
        Array.isArray(instances) ? instances.length : undefined,
      ),
      archivedAt: firstIsoString(
        (manifest as any)?.archivedAt,
        (manifest as any)?.archivedAtUtc,
        (manifest as any)?.createdAt,
      ),
      declaredBytes: firstFiniteNumber((manifest as any)?.bytes, (manifest as any)?.totalBytes),
    };
  } catch (error) {
    return {
      found: true,
      parsed: false,
      instanceCount: null,
      archivedAt: null,
      declaredBytes: null,
      error: (error as Error)?.message || String(error),
    };
  }
}

export interface IDeleteTreeResult {
  files: number;
  directories: number;
}

/**
 * Delete everything *inside* `target`, bottom-up, without following symlinks.
 * The target directory itself is left for the caller to remove, so the caller
 * controls the last, irreversible step.
 */
export function deleteTreeContents(target: string): IDeleteTreeResult {
  const result: IDeleteTreeResult = { files: 0, directories: 0 };

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        fs.unlinkSync(full);
        result.files += 1;
        continue;
      }
      if (entry.isDirectory()) {
        walk(full);
        fs.rmdirSync(full);
        result.directories += 1;
        continue;
      }
      fs.unlinkSync(full);
      result.files += 1;
    }
  };

  walk(target);
  return result;
}

/** Append one NDJSON record. Creates the file (never truncates). */
export function appendPurgeLog(logPath: string, record: Record<string, any>): void {
  fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, { encoding: 'utf8' });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${exponent === 0 ? value : Number(value.toFixed(2))} ${units[exponent]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// C4 — orphaned live logs (opt-in)
// ─────────────────────────────────────────────────────────────────────────────

export interface IOrphanedLogCandidate {
  /** Absolute path to the `logs` directory. */
  logsPath: string;
  /** Path relative to the workflows root, for reporting. */
  relativePath: string;
  bytes: number;
  files: number;
  newestMtime: string | null;
}

/**
 * Find `<workflows>/catalog/<ns>/<name>/<ver>/logs` directories whose version
 * directory holds NO YAML definition — definitions nothing will ever archive
 * through the workflow-driven path (Ticket C4).
 *
 * `logs` must be exactly four levels below `catalog`. A version directory that
 * still has a `.yaml`/`.yml` file is never a candidate, whatever its age.
 */
export function scanOrphanedLogDirs(
  catalogRoot: string,
  cutoff: Date,
): IOrphanedLogCandidate[] {
  const candidates: IOrphanedLogCandidate[] = [];
  if (!fs.existsSync(catalogRoot)) return candidates;

  const directories = (parent: string): fs.Dirent[] => {
    try {
      return fs.readdirSync(parent, { withFileTypes: true }).filter(
        (entry) => !isDotEntry(entry.name) && entry.isDirectory() && !entry.isSymbolicLink(),
      );
    } catch {
      return [];
    }
  };

  for (const ns of directories(catalogRoot)) {
    for (const definition of directories(path.join(catalogRoot, ns.name))) {
      for (const version of directories(path.join(catalogRoot, ns.name, definition.name))) {
        const versionDir = path.join(catalogRoot, ns.name, definition.name, version.name);
        const logsPath = path.join(versionDir, 'logs');

        let logStats: fs.Stats;
        try {
          logStats = fs.lstatSync(logsPath);
        } catch {
          continue;
        }
        if (!logStats.isDirectory() || logStats.isSymbolicLink()) continue;

        let hasDefinition = false;
        try {
          hasDefinition = fs
            .readdirSync(versionDir, { withFileTypes: true })
            .some(
              (entry) =>
                entry.isFile() && /\.ya?ml$/i.test(entry.name),
            );
        } catch {
          // An unreadable version directory cannot prove the definition is gone.
          hasDefinition = true;
        }
        if (hasDefinition) continue;

        const newest = newestMtime(logsPath);
        if (newest === null || newest.getTime() >= cutoff.getTime()) continue;

        const measured = measureTree(logsPath);
        candidates.push({
          logsPath,
          relativePath: path.relative(catalogRoot, logsPath),
          bytes: measured.bytes,
          files: measured.files,
          newestMtime: newest.toISOString(),
        });
      }
    }
  }

  return candidates;
}
