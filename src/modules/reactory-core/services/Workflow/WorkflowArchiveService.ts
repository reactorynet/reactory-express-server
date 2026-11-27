/**
 * WorkflowArchiveService — Ticket C: purge workflow archives older than N days.
 *
 * WHY A SERVICE AND NOT `rm -rf`
 * ------------------------------
 * Recursive deletion through a shell with a configurable root is precisely where
 * a path bug becomes data loss. Every deletion here goes through
 * `assertSafeBucketPath` (inside the archive root, at least four segments deep,
 * not a symlink, not a protected name) and `deleteTreeContents`, which walks the
 * tree itself and unlinks symlinks instead of following them. No shell, no
 * interpolation, no `-rf`.
 *
 * THE CONTRACT
 * ------------
 *   purgeArchives({ olderThanDays = 180, dryRun = true, archiveRoot?, ... })
 *
 *   - dryRun defaults to TRUE and writes nothing at all (no lock, no purge log).
 *   - The purge window MUST be strictly greater than the archive window
 *     (`assertPurgeWindow`), or the run refuses before touching the tree.
 *   - Age comes from the bucket directory name (`YYYY-MM`, UTC), not mtime.
 *   - Every bucket is recorded in `archive/purge.log.ndjson` BEFORE it is
 *     deleted, so a mistaken run is auditable after the fact.
 *   - `manifest.index.json`, the archive root, the purge log and every
 *     definition directory survive every run.
 *
 * Filesystem only — no MongoDB access.
 *
 * Registered as `core.WorkflowArchiveService@1.0.0` and driven by
 * `core.PurgeWorkflowArchives@1.0.0`.
 */

import Reactory from '@reactorynet/reactory-core';
import fs from 'fs';
import path from 'path';
import { service } from '@reactory/server-core/application/decorators';
import { roles } from '@reactory/server-core/authentication/decorators';
import {
  BUCKET_LOCK_FILENAMES,
  DEFAULT_PURGE_OLDER_THAN_DAYS,
  PURGE_LOCK_FILENAME,
  PURGE_LOG_FILENAME,
  WorkflowArchiveRetentionError,
  appendPurgeLog,
  asBooleanParam,
  asPositiveIntegerParam,
  assertPurgeWindow,
  assertSafeBucketPath,
  computeCutoff,
  deleteTreeContents,
  formatBytes,
  measureTree,
  readBucketManifest,
  resolveArchiveRootPath,
  resolveArchiveWindowDays,
  resolveBucketAge,
  scanArchiveBuckets,
  scanOrphanedLogDirs,
  type IArchiveBucketCandidate,
  type IBucketAge,
} from './archiveRetention';

const SERVICE_ID = 'core.WorkflowArchiveService@1.0.0';

/**
 * A `${...}` template that the workflow engine could not resolve is delivered
 * verbatim. Treat it as "not supplied" for OPTIONAL parameters — never as a
 * literal path or number. (Required parameters stay strict: `olderThanDays`
 * still throws on anything that is not a positive integer.)
 */
function optionalParam(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text || /^\$\{[^}]+\}$/.test(text)) return undefined;
  return text;
}

export interface IPurgeArchivesParams {
  /**
   * Delete archive buckets whose data is older than this many days.
   * Default 180 (6 months). MUST be strictly greater than the archive window.
   */
  olderThanDays?: number | string;
  /** Report only. Default TRUE — a destructive purge must be opted into. */
  dryRun?: boolean | string;
  /** Absolute archive root. Defaults to `<REACTORY_DATA>/workflows/archive`. */
  archiveRoot?: string;
  /**
   * Also delete `catalog/<ns>/<name>/<ver>/logs/` directories that have no YAML
   * definition AND whose newest log is older than the cutoff. Default FALSE:
   * a live-but-temporarily-unregistered definition would lose its logs.
   */
  purgeOrphanedLiveLogs?: boolean | string;
  /**
   * The archive workflow's own window, in days. Defaults to
   * `REACTORY_WORKFLOW_ARCHIVE_DAYS` (30). Exists so the assertion can see the
   * configured archive window; raising it can only make the purge more careful.
   */
  archiveWindowDays?: number | string;
}

export interface IPurgeBucketRecord {
  /** Bucket path relative to the archive root (`ns/name/ver/2026-10`). */
  bucket: string;
  absolutePath: string;
  /** `YYYY-MM` when the directory name parsed, otherwise null. */
  bucketMonth: string | null;
  /** Where the age came from. `mtime` means a legacy/hand-placed directory. */
  ageSource: 'name' | 'mtime';
  /** End of the bucket's month (UTC) or its mtime for legacy directories. */
  effectiveDate: string;
  ageDays: number;
  bytes: number;
  files: number;
  instanceCount: number | null;
  archivedAt: string | null;
  status: 'would-delete' | 'deleted' | 'skipped';
  skippedReason?: string;
}

export interface IPurgeOrphanedLogRecord {
  /** Path relative to the workflow catalog. */
  path: string;
  absolutePath: string;
  bytes: number;
  files: number;
  newestMtime: string | null;
  status: 'would-delete' | 'deleted' | 'skipped';
  skippedReason?: string;
}

export interface IPurgeArchivesResult {
  success: boolean;
  message: string;
  dryRun: boolean;
  /** Cutoff instant (UTC ISO). Buckets whose data ends before it are eligible. */
  cutoff: string;
  olderThanDays: number;
  archiveWindowDays: number;
  /** Resolved, symlink-free archive root actually used. */
  archiveRoot: string;
  /** Eligible buckets (would-delete / deleted / skipped-with-reason). */
  buckets: IPurgeBucketRecord[];
  /** Total bytes of the buckets that are / would be removed. */
  bytes: number;
  /** Oldest / newest effective date among those buckets. */
  oldest: string | null;
  newest: string | null;
  deletedBuckets: number;
  deletedBytes: number;
  skipped: Array<{ path: string; reason: string }>;
  orphanedLiveLogs: {
    requested: boolean;
    dirs: IPurgeOrphanedLogRecord[];
    bytes: number;
    deletedDirs: number;
    deletedBytes: number;
  };
  /** Audit trail file (`<archiveRoot>/purge.log.ndjson`). */
  purgeLog: string;
  lock: { acquired: boolean; path: string };
  durationMs: number;
}

@service({
  id: SERVICE_ID,
  nameSpace: 'core',
  name: 'WorkflowArchiveService',
  version: '1.0.0',
  description:
    'Filesystem retention for workflow archives: lists and (optionally) deletes archive buckets older than a configurable window. dryRun defaults to true.',
  serviceType: 'workflow',
  secondaryTypes: ['maintenance', 'filesystem'],
})
class WorkflowArchiveService {
  private context: Reactory.Server.IReactoryContext;

  constructor(_props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    try {
      this.context?.log?.(`[WorkflowArchive] ${message}`, meta || {}, level, SERVICE_ID);
    } catch {
      /* logging must never break a workflow step */
    }
  }

  /**
   * Read-only preview. Same report as `purgeArchives({ dryRun: true })` and it
   * can never delete: the dry-run flag is forced.
   */
  @roles(['ADMIN', 'SYSTEM'])
  async listArchives(params: IPurgeArchivesParams = {}): Promise<IPurgeArchivesResult> {
    return this.purgeArchives({ ...(params || {}), dryRun: true });
  }

  /**
   * Purge archive buckets older than `olderThanDays`.
   *
   * Throws `WorkflowArchiveRetentionError` (refusing before any deletion) when:
   *  - the purge window is not strictly greater than the archive window,
   *  - the archive root escapes `<REACTORY_DATA>/workflows`,
   *  - another purge run holds the lock.
   */
  @roles(['ADMIN', 'SYSTEM'])
  async purgeArchives(params: IPurgeArchivesParams = {}): Promise<IPurgeArchivesResult> {
    const startedAt = Date.now();
    const input = params || {};

    const dryRun = asBooleanParam(input.dryRun, 'dryRun', true);
    const olderThanDays =
      input.olderThanDays === undefined || input.olderThanDays === null || input.olderThanDays === ''
        ? DEFAULT_PURGE_OLDER_THAN_DAYS
        : asPositiveIntegerParam(input.olderThanDays, 'olderThanDays');
    const archiveWindowDays = resolveArchiveWindowDays(optionalParam(input.archiveWindowDays));
    const purgeOrphanedLiveLogs = asBooleanParam(
      input.purgeOrphanedLiveLogs,
      'purgeOrphanedLiveLogs',
      false,
    );

    // C1 — refuse BEFORE resolving paths or touching the tree.
    assertPurgeWindow(olderThanDays, archiveWindowDays);

    // C3 — path-traversal guard. Also refuses `/`, `../../` and symlink escapes.
    const resolved = resolveArchiveRootPath({ archiveRoot: optionalParam(input.archiveRoot) });
    const now = new Date();
    const cutoff = computeCutoff(olderThanDays, now);
    const purgeLogPath = path.join(resolved.archiveRoot, PURGE_LOG_FILENAME);
    const lockPath = path.join(resolved.archiveRoot, PURGE_LOCK_FILENAME);

    const emptyResult = (message: string): IPurgeArchivesResult => ({
      success: true,
      message,
      dryRun,
      cutoff: cutoff.toISOString(),
      olderThanDays,
      archiveWindowDays,
      archiveRoot: resolved.archiveRoot,
      buckets: [],
      bytes: 0,
      oldest: null,
      newest: null,
      deletedBuckets: 0,
      deletedBytes: 0,
      skipped: [],
      orphanedLiveLogs: {
        requested: purgeOrphanedLiveLogs,
        dirs: [],
        bytes: 0,
        deletedDirs: 0,
        deletedBytes: 0,
      },
      purgeLog: purgeLogPath,
      lock: { acquired: false, path: lockPath },
      durationMs: Date.now() - startedAt,
    });

    if (!fs.existsSync(resolved.archiveRoot)) {
      // Nothing to purge. Do not create the tree: a dry run must not write, and a
      // real run with no archive root has nothing to do.
      return emptyResult(
        `No archive root at ${resolved.archiveRoot} — nothing to purge.`,
      );
    }

    // ── Run lock (C6) — real runs only; a dry run writes nothing. ────────────
    let lockHeld = false;
    if (!dryRun) {
      try {
        const fd = fs.openSync(lockPath, 'wx');
        fs.writeSync(
          fd,
          `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), olderThanDays })}\n`,
        );
        fs.closeSync(fd);
        lockHeld = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') {
          throw new WorkflowArchiveRetentionError(
            'PURGE_LOCKED',
            `Refusing to purge: another purge run holds ${lockPath}. If no purge is running, ` +
              'inspect that file and remove it before retrying.',
          );
        }
        throw error;
      }
    }

    const buckets: IPurgeBucketRecord[] = [];
    const skipped: Array<{ path: string; reason: string }> = [];
    let deletedBuckets = 0;
    let deletedBytes = 0;

    try {
      const scan = scanArchiveBuckets(resolved.archiveRoot);
      for (const ignoredEntry of scan.ignored) {
        skipped.push({ path: ignoredEntry.relativePath, reason: ignoredEntry.reason });
      }

      for (const candidate of scan.buckets) {
        const outcome = this.evaluateBucket({
          candidate,
          cutoff,
          now,
          dryRun,
          archiveRoot: resolved.archiveRoot,
          purgeLogPath,
          olderThanDays,
        });

        if (!outcome) continue; // not older than the cutoff — never touched

        buckets.push(outcome.record);
        if (outcome.record.status === 'deleted') {
          deletedBuckets += 1;
          deletedBytes += outcome.record.bytes;
        }
        if (outcome.record.status === 'skipped') {
          skipped.push({
            path: outcome.record.bucket,
            reason: outcome.record.skippedReason || 'skipped',
          });
        }
      }

      // ── C4 — orphaned live logs (opt-in only) ─────────────────────────────
      const orphaned: IPurgeArchivesResult['orphanedLiveLogs'] = {
        requested: purgeOrphanedLiveLogs,
        dirs: [],
        bytes: 0,
        deletedDirs: 0,
        deletedBytes: 0,
      };

      if (purgeOrphanedLiveLogs) {
        const candidates = scanOrphanedLogDirs(resolved.catalogRoot, cutoff);
        for (const orphan of candidates) {
          const record: IPurgeOrphanedLogRecord = {
            path: orphan.relativePath,
            absolutePath: orphan.logsPath,
            bytes: orphan.bytes,
            files: orphan.files,
            newestMtime: orphan.newestMtime,
            status: dryRun ? 'would-delete' : 'deleted',
          };

          if (!dryRun) {
            const refusal = this.guardOrphanLogDir(orphan.logsPath, resolved.catalogRoot);
            if (refusal) {
              record.status = 'skipped';
              record.skippedReason = refusal;
              skipped.push({ path: record.path, reason: refusal });
            } else {
              appendPurgeLog(purgeLogPath, {
                type: 'orphaned-logs',
                bucket: orphan.relativePath,
                instanceCount: null,
                bytes: orphan.bytes,
                archivedAt: null,
                files: orphan.files,
                newestMtime: orphan.newestMtime,
                deletedAt: new Date().toISOString(),
                cutoff: cutoff.toISOString(),
                olderThanDays,
              });
              deleteTreeContents(orphan.logsPath);
              fs.rmdirSync(orphan.logsPath);
              orphaned.deletedDirs += 1;
              orphaned.deletedBytes += orphan.bytes;
            }
          }

          if (record.status !== 'skipped') orphaned.bytes += orphan.bytes;
          orphaned.dirs.push(record);
        }
      }

      // ── Summary ───────────────────────────────────────────────────────────
      const eligible = buckets.filter((bucket) => bucket.status !== 'skipped');
      const bytes = eligible.reduce((total, bucket) => total + bucket.bytes, 0);
      const effectiveDates = eligible
        .map((bucket) => bucket.effectiveDate)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const oldest = effectiveDates.length > 0 ? effectiveDates[0] : null;
      const newest = effectiveDates.length > 0 ? effectiveDates[effectiveDates.length - 1] : null;

      const durationMs = Date.now() - startedAt;

      if (!dryRun) {
        appendPurgeLog(purgeLogPath, {
          type: 'run',
          dryRun: false,
          archiveRoot: resolved.archiveRoot,
          cutoff: cutoff.toISOString(),
          olderThanDays,
          archiveWindowDays,
          bucketsExamined: scan.buckets.length,
          bucketsDeleted: deletedBuckets,
          bytesDeleted: deletedBytes,
          orphanedLogDirsDeleted: orphaned.deletedDirs,
          orphanedLogBytesDeleted: orphaned.deletedBytes,
          purgeOrphanedLiveLogs,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
        });
      }

      const message = this.describe(dryRun, eligible.length, bytes, cutoff, orphaned);

      this.log(dryRun ? 'info' : 'warn', message, {
        archiveRoot: resolved.archiveRoot,
        cutoff: cutoff.toISOString(),
        buckets: eligible.length,
        bytes,
        orphanedLogDirs: orphaned.dirs.length,
      });

      return {
        success: true,
        message,
        dryRun,
        cutoff: cutoff.toISOString(),
        olderThanDays,
        archiveWindowDays,
        archiveRoot: resolved.archiveRoot,
        buckets,
        bytes,
        oldest,
        newest,
        deletedBuckets,
        deletedBytes,
        skipped,
        orphanedLiveLogs: orphaned,
        purgeLog: purgeLogPath,
        lock: { acquired: lockHeld, path: lockPath },
        durationMs,
      };
    } finally {
      if (lockHeld) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* the lock is advisory; a leftover file is reported on the next run */
        }
      }
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Decide one bucket's fate. Returns null when the bucket is younger than the
   * cutoff (it is then not even reported as a candidate).
   */
  private evaluateBucket(args: {
    candidate: IArchiveBucketCandidate;
    cutoff: Date;
    now: Date;
    dryRun: boolean;
    archiveRoot: string;
    purgeLogPath: string;
    olderThanDays: number;
  }): { record: IPurgeBucketRecord } | null {
    const { candidate, cutoff, now, dryRun, archiveRoot, purgeLogPath, olderThanDays } = args;

    let age: IBucketAge;
    try {
      age = resolveBucketAge(candidate.bucketPath, cutoff, now);
    } catch (error) {
      this.log('warn', `Could not determine the age of ${candidate.relativePath}: ${(error as Error)?.message}`, {
        bucket: candidate.relativePath,
      });
      return {
        record: {
          bucket: candidate.relativePath,
          absolutePath: candidate.bucketPath,
          bucketMonth: null,
          ageSource: 'mtime',
          effectiveDate: new Date(0).toISOString(),
          ageDays: -1,
          bytes: 0,
          files: 0,
          instanceCount: null,
          archivedAt: null,
          status: 'skipped',
          skippedReason: `unreadable: ${(error as Error)?.message || String(error)}`,
        },
      };
    }

    if (!age.olderThanCutoff) return null;

    if (age.ageSource === 'mtime') {
      // C2: only legacy/hand-placed directories reach this. Say so — mtime is not
      // an authoritative record and the operator should know the age was guessed.
      this.log(
        'warn',
        `Archive directory ${candidate.relativePath} does not parse as YYYY-MM; using filesystem mtime ` +
          `(${age.effectiveDate.toISOString()}) as its age.`,
        { bucket: candidate.relativePath, ageSource: age.ageSource },
      );
    }

    const measured = measureTree(candidate.bucketPath);
    const manifest = readBucketManifest(candidate.bucketPath);
    if (manifest.found && !manifest.parsed) {
      this.log('warn', `manifest.json in ${candidate.relativePath} could not be parsed: ${manifest.error}`, {
        bucket: candidate.relativePath,
      });
    }

    const record: IPurgeBucketRecord = {
      bucket: candidate.relativePath,
      absolutePath: candidate.bucketPath,
      bucketMonth: age.bucketMonth,
      ageSource: age.ageSource,
      effectiveDate: age.effectiveDate.toISOString(),
      ageDays: age.ageDays,
      bytes: measured.bytes,
      files: measured.files,
      instanceCount: manifest.instanceCount,
      archivedAt: manifest.archivedAt,
      status: dryRun ? 'would-delete' : 'deleted',
    };

    // C6 — never race an archive run writing into this bucket.
    const lockFile = BUCKET_LOCK_FILENAMES.find((name) =>
      fs.existsSync(path.join(candidate.bucketPath, name)),
    );
    if (lockFile) {
      record.status = 'skipped';
      record.skippedReason = `bucket holds ${lockFile}; an archive run may be writing it`;
      return { record };
    }

    if (dryRun) return { record };

    try {
      // Re-validate immediately before deleting; never trust the scan alone.
      const guard = assertSafeBucketPath(candidate.bucketPath, archiveRoot);

      // C3.1 — record the deletion BEFORE the bytes are gone.
      appendPurgeLog(purgeLogPath, {
        type: 'bucket',
        bucket: guard.relativePath,
        instanceCount: manifest.instanceCount,
        bytes: measured.bytes,
        archivedAt: manifest.archivedAt,
        bucketMonth: age.bucketMonth,
        ageSource: age.ageSource,
        files: measured.files,
        deletedAt: new Date().toISOString(),
        cutoff: cutoff.toISOString(),
        olderThanDays,
      });

      deleteTreeContents(guard.bucketPath);
      fs.rmdirSync(guard.bucketPath);
    } catch (error) {
      const reason = (error as Error)?.message || String(error);
      record.status = 'skipped';
      record.skippedReason = reason;
      this.log('error', `Refusing to delete ${candidate.relativePath}: ${reason}`, {
        bucket: candidate.relativePath,
      });
    }

    return { record };
  }

  /**
   * Re-check an orphaned `logs` directory immediately before deleting it: it
   * must still be exactly `<catalog>/<ns>/<name>/<ver>/logs`, still a real
   * directory, and its version directory must still have no YAML definition.
   */
  private guardOrphanLogDir(logsPath: string, catalogRoot: string): string | null {
    const relative = path.relative(path.resolve(catalogRoot), path.resolve(logsPath));
    const segments = relative.split(path.sep).filter(Boolean);

    if (
      !relative ||
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      return 'logs directory is outside the workflow catalog';
    }
    if (segments.length !== 4 || segments[segments.length - 1] !== 'logs') {
      return 'logs directory is not at catalog/<namespace>/<name>/<version>/logs';
    }

    const stats = fs.lstatSync(logsPath);
    if (stats.isSymbolicLink()) return 'logs directory is a symbolic link';
    if (!stats.isDirectory()) return 'logs path is not a directory';

    const versionDir = path.dirname(logsPath);
    const definitionPresent = fs
      .readdirSync(versionDir, { withFileTypes: true })
      .some((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name));
    if (definitionPresent) return 'a YAML definition appeared in the version directory';

    const realLogs = fs.realpathSync(logsPath);
    const realCatalog = fs.realpathSync(catalogRoot);
    const realRelative = path.relative(realCatalog, realLogs);
    if (
      !realRelative ||
      realRelative === '..' ||
      realRelative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(realRelative)
    ) {
      return 'logs directory resolves outside the workflow catalog';
    }

    return null;
  }

  private describe(
    dryRun: boolean,
    bucketCount: number,
    bytes: number,
    cutoff: Date,
    orphaned: IPurgeArchivesResult['orphanedLiveLogs'],
  ): string {
    const orphanNote = orphaned.requested
      ? ` Orphaned live log directories: ${orphaned.dirs.length} ` +
        `(${formatBytes(orphaned.bytes)})${dryRun ? ' would be deleted' : ` deleted, ${orphaned.deletedDirs} removed`}.`
      : '';

    if (dryRun) {
      return (
        `Dry run: ${bucketCount} archive bucket(s) (${formatBytes(bytes)}) older than ${cutoff.toISOString()} ` +
        `would be deleted; nothing was deleted.${orphanNote}`
      );
    }

    if (bucketCount === 0) {
      return `No archive buckets older than ${cutoff.toISOString()} were found.${orphanNote}`;
    }

    return `Deleted ${bucketCount} archive bucket(s), ${formatBytes(bytes)}, older than ${cutoff.toISOString()}.${orphanNote}`;
  }

  // ── Service lifecycle ─────────────────────────────────────────────────────

  async onStartup(): Promise<any> {
    this.log('info', 'WorkflowArchiveService ready (purge defaults to a dry run).');
    return Promise.resolve(true);
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }
}

export default WorkflowArchiveService;
