/**
 * Synchronous, crash-safe outbox for termination reasons.
 *
 * WHY A FILE AND NOT JUST A DATABASE WRITE
 * ----------------------------------------
 * The fatal paths this ticket is about are exactly the paths where an
 * asynchronous database write cannot be trusted to finish:
 *
 *   - `src/express/server.ts` handles `unhandledRejection` with a synchronous
 *     `process.exit(0)`. Any promise we schedule inside that turn is dropped.
 *   - `uncaughtException` has no handler at all today, so Node prints the stack
 *     and exits — nothing asynchronous runs.
 *   - A V8 heap abort (`oom`) never reaches JavaScript at all; the best we can
 *     do is what was written to disk *before* the abort.
 *
 * So on those paths the recorder appends one line per in-flight instance with
 * `fs.appendFileSync` — synchronous, O(1), bounded — and
 * `WorkflowInstanceLifecycleRecorder.drainOutbox()` applies them to the instance
 * rows on the next boot. The reason survives the process, which is the whole
 * point: the live incident left a Terminated instance with no reason because
 * nothing wrote anything at all.
 *
 * DURABILITY MODEL (why records are never lost)
 * ---------------------------------------------
 *   append  ->  take: rename the live file to a UNIQUE `<path>.draining.<pid>.<ts>`
 *           ->  apply
 *           ->  requeue the records that could not be applied (append back to a
 *               fresh live file)
 *           ->  unlink ONLY the draining files this batch consumed.
 *
 * Guarantees:
 *  - A process killed mid-drain leaves its `.draining.<pid>.<ts>` file behind;
 *    the next drain unions every draining file with the live one. Because the
 *    draining name is unique, a later take() can never overwrite an earlier
 *    partial batch (a bug the single fixed `.draining` suffix had).
 *  - A record whose apply FAILED is re-queued before anything is unlinked, so a
 *    transient database outage at boot cannot discard the reason the crash was
 *    supposed to capture.
 *  - A record may be applied twice if the process dies between requeue and
 *    unlink. That is safe by construction: `recordTermination` refuses to touch
 *    an already-settled instance, so a duplicate is a no-op.
 */

import fs from 'fs';
import path from 'path';
import {
  TerminationReasonCode,
  TerminationReasonSource,
  truncateReasonMessage,
} from './TerminationReason';

/** One queued termination reason, as written to disk by a dying process. */
export interface ITerminationOutboxRecord {
  instanceId: string;
  code: TerminationReasonCode;
  message: string;
  /** ISO-8601 — the moment the process observed the condition. */
  time: string;
  source: TerminationReasonSource;
  pid?: number;
  /** Signal name when the record came from a signal/shutdown path. */
  signal?: string;
}

/** What a single take() consumed, so the caller can acknowledge exactly that. */
export interface IOutboxBatch {
  records: ITerminationOutboxRecord[];
  /** Draining files this batch owns. Only these may be unlinked. */
  files: string[];
}

/** Hard bounds so a crash loop can never fill the disk. */
const MAX_OUTBOX_BYTES = 5 * 1024 * 1024;
const MAX_RECORDS_PER_APPEND = 500;
/** Legacy fixed suffix, still honoured when reading leftovers. */
const LEGACY_DRAINING_SUFFIX = '.draining';
/** Unique per-take suffix prefix, so two batches can never overwrite each other. */
const DRAINING_PREFIX = '.draining.';

/**
 * Resolve the outbox path.
 *
 * `WORKFLOW_TERMINATION_OUTBOX` wins so tests (and an operator diagnosing a crash
 * loop) can point at a scratch file; otherwise the journal sits beside the other
 * workflow state under the platform data root.
 *
 * The fallback chain deliberately mirrors the rest of the server
 * (src/express/i18n/language.ts): APP_DATA_ROOT, then REACTORY_DATA, then the
 * sibling `reactory-data` checkout. It must NOT fall back to the OS temp
 * directory — /tmp is world-writable, and it is cleared on reboot or by
 * tmp-cleaners, i.e. exactly when the boot-time drain needs to recover the
 * records a dying process left behind.
 */
export function resolveOutboxPath(): string {
  const explicit = process.env.WORKFLOW_TERMINATION_OUTBOX;
  if (explicit && explicit.trim() !== '') {
    return explicit;
  }
  const root =
    process.env.APP_DATA_ROOT ||
    process.env.REACTORY_DATA ||
    path.resolve(process.cwd(), '../reactory-data');
  return path.join(root, 'workflows', 'termination-outbox.jsonl');
}

/**
 * Ensure the outbox directory exists. Best-effort: never throws.
 *
 * `mode: 0o700` is defence in depth: the journal holds instance ids and the
 * error text that killed the process, so other local users have no business
 * reading it. `recursive: true` does not chmod a directory that already exists,
 * so this hardens new roots without fighting an operator's existing layout.
 */
function ensureOutboxDirectory(filePath: string): boolean {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Trim the outbox to its newest records when it exceeds the size bound.
 *
 * Check, read and rewrite all go through ONE descriptor. Re-resolving the path
 * between them was both a time-of-check/time-of-use window and a real data-loss
 * bug: two processes sharing a data root could interleave here and drop a
 * concurrent append from a process that was in the middle of dying — the one
 * record this journal exists to keep. `O_NOFOLLOW` refuses to operate through a
 * symlink, and 0o600 keeps the file readable only by its owner.
 *
 * Still best-effort: a failure here must never escape into the fatal-handler path.
 */
function pruneIfOversized(filePath: string): void {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, fs.constants.O_RDWR | (fs.constants.O_NOFOLLOW ?? 0), 0o600);

    const stat = fs.fstatSync(fd);
    if (stat.size <= MAX_OUTBOX_BYTES) return;

    const lines = fs.readFileSync(fd, 'utf8').split('\n').filter((line) => line.trim() !== '');
    const keep = lines.slice(-MAX_RECORDS_PER_APPEND);
    const payload = `${keep.join('\n')}\n`;

    // Truncate first so a shorter payload cannot leave a stale tail behind, then
    // write at an explicit position (ftruncate does not rewind the descriptor).
    fs.ftruncateSync(fd, 0);
    fs.writeSync(fd, payload, 0, 'utf8');
  } catch {
    /* best-effort only */
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        /* best-effort only */
      }
    }
  }
}

/**
 * Append serialised records to the journal. There is intentionally no
 * "overwrite" mode: every caller appends, and a truncating write on this path
 * would be a way to lose a dying process's last record.
 *
 * `mode: 0o600` applies when the file is created; the journal carries instance
 * ids and fatal error text and must not be world-readable.
 */
function writeLines(filePath: string, records: ITerminationOutboxRecord[]): number {
  if (!Array.isArray(records) || records.length === 0) return 0;
  try {
    if (!ensureOutboxDirectory(filePath)) return 0;
    const bounded = records.slice(0, MAX_RECORDS_PER_APPEND);
    const payload = bounded
      .map((record) => JSON.stringify({ ...record, message: truncateReasonMessage(record.message) }))
      .join('\n');
    fs.appendFileSync(filePath, `${payload}\n`, { encoding: 'utf8', mode: 0o600 });
    pruneIfOversized(filePath);
    return bounded.length;
  } catch {
    return 0;
  }
}

/**
 * Append records synchronously.
 *
 * MUST NOT THROW: this runs inside an uncaught-exception / unhandled-rejection
 * handler, where a throw would replace the original fatal error with ours.
 *
 * @returns the number of records written (0 when the outbox is unusable).
 */
export function appendOutboxRecords(records: ITerminationOutboxRecord[]): number {
  return writeLines(resolveOutboxPath(), records);
}

/**
 * Re-queue records whose apply failed. Separate from `appendOutboxRecords` only
 * in intent — the durability guarantee is the same synchronous append.
 */
export function requeueOutboxRecords(records: ITerminationOutboxRecord[]): number {
  return writeLines(resolveOutboxPath(), records);
}

function parseRecord(line: string): ITerminationOutboxRecord | null {
  try {
    const parsed = JSON.parse(line) as Partial<ITerminationOutboxRecord>;
    if (!parsed || typeof parsed.instanceId !== 'string' || parsed.instanceId.trim() === '') {
      return null;
    }
    const code = Object.values(TerminationReasonCode).indexOf(parsed.code as TerminationReasonCode) !== -1
      ? (parsed.code as TerminationReasonCode)
      : TerminationReasonCode.UNKNOWN;
    return {
      instanceId: parsed.instanceId,
      code,
      message: typeof parsed.message === 'string' ? parsed.message : 'No message recorded.',
      time: typeof parsed.time === 'string' ? parsed.time : new Date().toISOString(),
      source: (parsed.source || 'process') as TerminationReasonSource,
      pid: typeof parsed.pid === 'number' ? parsed.pid : undefined,
      signal: typeof parsed.signal === 'string' ? parsed.signal : undefined,
    };
  } catch {
    return null;
  }
}

function readFileRecords(filePath: string): ITerminationOutboxRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map(parseRecord)
      .filter((record): record is ITerminationOutboxRecord => record !== null);
  } catch {
    return [];
  }
}

/**
 * Every leftover draining file (unique and legacy) sitting beside the outbox.
 * Best-effort: an unreadable directory yields no files.
 */
function listDrainingFiles(filePath: string): string[] {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    return fs
      .readdirSync(dir)
      .filter((name) => name === `${base}${LEGACY_DRAINING_SUFFIX}` || name.startsWith(`${base}${DRAINING_PREFIX}`))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

/**
 * Read every pending record (live file + every leftover draining file) WITHOUT
 * removing anything. Callers that successfully apply the records must call
 * `acknowledgeOutboxBatch()` / `clearOutbox()`.
 */
export function readOutboxRecords(): ITerminationOutboxRecord[] {
  const filePath = resolveOutboxPath();
  const stale = listDrainingFiles(filePath).flatMap(readFileRecords);
  return [...stale, ...readFileRecords(filePath)];
}

/**
 * Claim the current outbox for draining.
 *
 * The live file is renamed (not read-and-truncated) to a UNIQUE draining name so
 * a process killed during the apply step cannot lose the records, and so a later
 * take() cannot overwrite an earlier partial batch. Leftover draining files from
 * previous attempts are read (not claimed) — they stay on disk until their own
 * caller acknowledges them, and their records are re-queued on failure like any
 * other.
 */
export function takeOutboxRecords(): IOutboxBatch {
  const filePath = resolveOutboxPath();
  const leftovers = listDrainingFiles(filePath);
  const records: ITerminationOutboxRecord[] = [];
  const files: string[] = [];

  // Records already claimed by a previous, interrupted drain.
  for (const leftover of leftovers) {
    records.push(...readFileRecords(leftover));
    files.push(leftover);
  }

  try {
    if (fs.existsSync(filePath)) {
      const draining = `${filePath}${DRAINING_PREFIX}${process.pid}.${Date.now()}`;
      fs.renameSync(filePath, draining);
      records.push(...readFileRecords(draining));
      files.push(draining);
    }
  } catch {
    // Could not claim the live file: leave it in place and let the caller retry
    // on the next boot. Records already read from leftovers are still returned.
  }

  return { records, files };
}

/** Delete exactly the draining files a batch consumed. Best-effort: never throws. */
export function acknowledgeOutboxBatch(batch: IOutboxBatch | null | undefined): void {
  for (const file of batch?.files || []) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      /* best-effort only — a leftover is re-read and re-applied (idempotent) */
    }
  }
}

/** Delete the live outbox and every draining file. Used by tests and by reset. */
export function clearOutbox(): void {
  const filePath = resolveOutboxPath();
  for (const candidate of [filePath, ...listDrainingFiles(filePath)]) {
    try {
      if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
    } catch {
      /* best-effort only */
    }
  }
}
