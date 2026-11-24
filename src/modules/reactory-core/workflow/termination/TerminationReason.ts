/**
 * Termination reason model — the "why" that a Terminated workflow instance must
 * always carry.
 *
 * WHY THIS EXISTS
 * ---------------
 * A `ProcessAITicket` run (instance 6ae999c2738d66f0ebd7a2b5) ended at
 * `status: 3 (Terminated)` with 41/43 steps complete, 0 failed steps,
 * `completeTime: null`, and `getWorkflowErrors() -> 0`. Nothing anywhere
 * recorded *why*. The investigation went to hot-reload, PM2 and file watchers
 * because "Terminated with no error" reads as an external event, while the
 * actual cause was never persisted. Meanwhile the agent kept writing files for
 * another 2.5 hours after the engine's last recorded step.
 *
 * Two things had to become true:
 *
 *  1. Every path that reaches a terminal status records a machine-readable
 *     cause (this file's enum), a message and a timestamp. `unknown` is an
 *     acceptable VALUE — silence is not.
 *  2. A consumer can tell "the engine is stuck" from "the engine lost track of
 *     a run that is still doing work" — hence `lastActivity`.
 *
 * STORAGE
 * -------
 * The reason is written into the instance's own `data` blob under the reserved
 * `__reactory` namespace:
 *
 *     data.__reactory.termination = { code, message, time, source }
 *     data.__reactory.lastActivity = "<ISO-8601>"
 *     data.__reactory.salvage     = { ...worktree salvage record... }
 *
 * `data` is the only field every persistence provider (Mongo, SQLite, Postgres,
 * memory) round-trips verbatim, so this needs no schema migration, no downtime,
 * and works unchanged on the ~4.4GB append-only `workflows` collection. All
 * reads tolerate the field being absent — documents written before this feature
 * existed must never throw and must never be reported as "no reason" (see
 * `readTerminationReason` / `describeTerminationForStatus`).
 *
 * The helpers in this file are PURE (no I/O, no persistence, no logging) so the
 * read layer, the recorder and the unit tests can share exactly one definition
 * of what a valid reason looks like.
 */

/** Machine-readable cause of a terminal transition. */
export enum TerminationReasonCode {
  /** The process died on an uncaught exception / unhandled rejection. */
  CRASH = 'crash',
  /** Ran out of memory (heap limit / ENOMEM). */
  OOM = 'oom',
  /** An operator (or the platform) cancelled the run. */
  CANCELLED = 'cancelled',
  /** A step or the run exceeded its deadline. */
  TIMEOUT = 'timeout',
  /** An upstream provider (model, HTTP API, database) failed. */
  PROVIDER_ERROR = 'provider-error',
  /** The process was asked to stop (SIGTERM / SIGINT / graceful shutdown). */
  SHUTDOWN = 'shutdown',
  /** Terminal, but the engine could not attribute a cause. Never silent. */
  UNKNOWN = 'unknown',
}

/** Where the reason was captured, so a reader knows how much to trust it. */
export type TerminationReasonSource =
  | 'cancel'
  | 'timeout'
  | 'dead-letter'
  | 'provider'
  | 'step'
  | 'process'
  | 'shutdown'
  | 'owner'
  | 'derived';

/** A recorded termination reason as persisted on the instance. */
export interface ITerminationReason {
  code: TerminationReasonCode;
  message: string;
  time: Date;
  source?: TerminationReasonSource;
}

/**
 * A recorded termination reason as it travels over GraphQL. `time` stays a Date
 * because the GraphQL DateTime scalar serialises it; the persisted form is an
 * ISO string (see `readTerminationReason`).
 */
export interface ITerminationReasonDto {
  code: TerminationReasonCode;
  message: string;
  time: Date;
  source: TerminationReasonSource;
  /**
   * False when the reason was synthesised on read because the instance reached a
   * terminal status without one being recorded (a row written before this
   * feature, or a path that predates the fix). Such a reason is still a real
   * answer — "the engine does not know" — but a consumer may want to treat it
   * differently from an attributed cause.
   */
  recorded: boolean;
}

/**
 * Enough information for a consumer to salvage work left behind by a terminated
 * run. The engine deliberately does NOT run `git`: it records the facts and
 * blocks destructive cleanup until someone acknowledges them (see
 * `WorkflowLifecycleManager.assertSalvageClear` and the guard in the retention
 * sweeper).
 */
export interface IWorkflowSalvageRecord {
  /** True when work exists that is believed to be unpublished. */
  required: boolean;
  /** Absolute path of the git worktree the run was working in, when known. */
  worktreePath?: string | null;
  /** Branch the work should be committed to, when known. */
  branch?: string | null;
  /** SHA the worktree was at when the record was taken, when known. */
  headSha?: string | null;
  /** Whether the worktree had uncommitted changes when the record was taken. */
  dirty?: boolean | null;
  /** Number of changed files observed, when known. */
  changedFileCount?: number | null;
  /** Free-text detail for the operator (e.g. why it could not be published). */
  message?: string | null;
  recordedAt: Date;
  /** Set when a consumer acknowledged the record (allows cleanup). */
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  /** Set when the work was committed and the commit recorded. */
  salvageSha?: string | null;
  /** Set when the work was successfully published (PR merged). */
  publishedSha?: string | null;
}

/** Reserved key inside the instance `data` blob. */
export const REACTORY_META_NAMESPACE = '__reactory';
export const TERMINATION_KEY = 'termination';
export const LAST_ACTIVITY_KEY = 'lastActivity';
export const SALVAGE_KEY = 'salvage';
/**
 * A run that was INTERRUPTED (process crash / shutdown) but not terminated.
 *
 * The engine resumes Runnable instances after a restart, so writing a
 * termination reason for one is a lie the read layer would later repeat on a
 * COMPLETE row. `interrupted` records what the process saw without claiming the
 * run ended.
 */
export const INTERRUPTED_KEY = 'interrupted';

/** Engine statuses that mean "this instance is finished" (Complete=2, Terminated=3, DeadLettered=4). */
const ENGINE_TERMINAL_STATUSES: ReadonlyArray<number> = [2, 3, 4];

/** Truncation bound so a pathological stack/message can never bloat the instance row. */
export const MAX_REASON_MESSAGE_LENGTH = 2000;

const VALID_CODES: ReadonlyArray<string> = Object.values(TerminationReasonCode);

/** True when an engine status code is terminal (Complete / Terminated / DeadLettered). */
export function isEngineTerminalStatus(status: number | null | undefined): boolean {
  return typeof status === 'number' && ENGINE_TERMINAL_STATUSES.indexOf(status) !== -1;
}

/**
 * True only for the statuses that mean "this run did NOT finish successfully"
 * (Terminated = 3, DeadLettered = 4).
 *
 * A termination reason answers "why did this run not complete", so it is
 * meaningless for status 2. Gating on this predicate — not on
 * `isEngineTerminalStatus` — is what stops every successful run from reporting a
 * fabricated `unknown` ("the process died before it could write one").
 * DeadLettered is included because it is displayed as TERMINATED and, without a
 * reason, is exactly the silent row this ticket is about.
 */
export function isTerminationReasonStatus(status: number | null | undefined): boolean {
  return status === 3 || status === 4;
}

/**
 * Return the reserved metadata container on a workflow `data` object, creating
 * it when it is absent. Tolerates a non-object `data` (legacy/odd rows) by
 * returning `null` — callers must treat `null` as "cannot record".
 */
export function ensureMetaContainer(data: any): Record<string, any> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const existing = data[REACTORY_META_NAMESPACE];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as Record<string, any>;
  }
  data[REACTORY_META_NAMESPACE] = {};
  return data[REACTORY_META_NAMESPACE] as Record<string, any>;
}

/** Read the reserved metadata container without creating it. */
export function readMetaContainer(data: any): Record<string, any> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const existing = data[REACTORY_META_NAMESPACE];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as Record<string, any>;
  }
  return null;
}

/** Coerce anything date-ish (Date | ISO string | epoch ms) to a Date, else null. */
export function toDateOrNull(value: any): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isFinite(fromNumber.getTime()) ? fromNumber : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

/** Truncate a message to the persisted bound. */
export function truncateReasonMessage(message: unknown): string {
  const text = typeof message === 'string' ? message : String(message ?? '');
  return text.length > MAX_REASON_MESSAGE_LENGTH
    ? `${text.slice(0, MAX_REASON_MESSAGE_LENGTH)}…`
    : text;
}

/**
 * Read the termination reason persisted on an instance, tolerating every
 * pre-fix shape:
 *  - no `data` / no `__reactory` / no `termination`  -> null
 *  - a code that is not in the enum                  -> coerced to UNKNOWN, the
 *    raw value preserved in the message
 *  - a string timestamp                              -> Date
 */
export function readTerminationReason(instance: any): ITerminationReason | null {
  const meta = readMetaContainer(instance?.data);
  const raw = meta ? meta[TERMINATION_KEY] : null;
  if (!raw || typeof raw !== 'object') return null;

  const rawCode = typeof raw.code === 'string' ? raw.code : '';
  const code = VALID_CODES.indexOf(rawCode) !== -1
    ? (rawCode as TerminationReasonCode)
    : TerminationReasonCode.UNKNOWN;

  const baseMessage = typeof raw.message === 'string' && raw.message.length > 0
    ? raw.message
    : 'No termination message was recorded.';
  const message = code === TerminationReasonCode.UNKNOWN && rawCode && rawCode !== TerminationReasonCode.UNKNOWN
    ? `${baseMessage} (unrecognised recorded code: ${rawCode})`
    : baseMessage;

  const time = toDateOrNull(raw.time) || toDateOrNull(instance?.completeTime) || toDateOrNull(instance?.createTime);
  if (!time) return null;

  const source: TerminationReasonSource = typeof raw.source === 'string'
    ? (raw.source as TerminationReasonSource)
    : 'derived';

  return { code, message, time, source };
}

/**
 * A process-level interruption recorded against a run that was NOT terminated.
 *
 * Deliberately a separate field from `termination`: the engine will resume the
 * instance on the next boot, so claiming it terminated would leave a false
 * `crash`/`shutdown` reason on a run that later completes. Read helpers below
 * never surface it as a termination reason.
 */
export interface IWorkflowInterruption {
  code: TerminationReasonCode;
  message: string;
  time: Date;
  source: TerminationReasonSource;
  pid?: number;
  signal?: string;
}

/** Read the interruption note, when one was recorded. Tolerant of absence. */
export function readInterruption(instance: any): IWorkflowInterruption | null {
  const meta = readMetaContainer(instance?.data);
  const raw = meta ? meta[INTERRUPTED_KEY] : null;
  if (!raw || typeof raw !== 'object') return null;

  const time = toDateOrNull(raw.time);
  if (!time) return null;
  const rawCode = typeof raw.code === 'string' ? raw.code : '';
  const code = VALID_CODES.indexOf(rawCode) !== -1
    ? (rawCode as TerminationReasonCode)
    : TerminationReasonCode.UNKNOWN;

  return {
    code,
    message: typeof raw.message === 'string' ? raw.message : 'No message recorded.',
    time,
    source: (raw.source || 'process') as TerminationReasonSource,
    pid: typeof raw.pid === 'number' ? raw.pid : undefined,
    signal: typeof raw.signal === 'string' ? raw.signal : undefined,
  };
}

/** True when a salvage record still needs someone to deal with it. */
export function hasUnresolvedSalvage(record: IWorkflowSalvageRecord | null | undefined): boolean {
  if (!record || record.required !== true) return false;
  if (record.publishedSha) return false;
  if (record.salvageSha) return false;
  if (record.acknowledgedAt) return false;
  return true;
}

/**
 * Read the salvage record persisted on an instance. Tolerant of absence and of
 * partial/legacy shapes.
 */
export function readSalvageRecord(instance: any): IWorkflowSalvageRecord | null {
  const meta = readMetaContainer(instance?.data);
  const raw = meta ? meta[SALVAGE_KEY] : null;
  if (!raw || typeof raw !== 'object') return null;

  const recordedAt = toDateOrNull(raw.recordedAt) || toDateOrNull(instance?.createTime);
  if (!recordedAt) return null;

  return {
    required: raw.required === true,
    worktreePath: typeof raw.worktreePath === 'string' ? raw.worktreePath : null,
    branch: typeof raw.branch === 'string' ? raw.branch : null,
    headSha: typeof raw.headSha === 'string' ? raw.headSha : null,
    dirty: typeof raw.dirty === 'boolean' ? raw.dirty : null,
    changedFileCount: typeof raw.changedFileCount === 'number' ? raw.changedFileCount : null,
    message: typeof raw.message === 'string' ? raw.message : null,
    recordedAt,
    acknowledgedAt: toDateOrNull(raw.acknowledgedAt),
    acknowledgedBy: typeof raw.acknowledgedBy === 'string' ? raw.acknowledgedBy : null,
    salvageSha: typeof raw.salvageSha === 'string' ? raw.salvageSha : null,
    publishedSha: typeof raw.publishedSha === 'string' ? raw.publishedSha : null,
  };
}

/**
 * Latest point in time at which the ENGINE made progress on an instance.
 *
 * This is the field that separates the two failure modes the ticket calls out:
 *
 *   engine stuck                  -> lastActivity is recent, no step transitions
 *   engine lost track of the run  -> lastActivity is hours old while the agent
 *                                    kept writing files
 *
 * The value is the newest of:
 *  - `data.__reactory.lastActivity` (stamped by every YAML step transition, and
 *    persisted by the engine's own write — no extra database write per step),
 *  - every execution pointer's `endTime` / `startTime`,
 *  - the instance `createTime`.
 *
 * Deriving the maximum makes this correct for code workflows (which never go
 * through `YamlStepBody`) and for rows written before the stamp existed.
 */
export function readLastActivity(instance: any): Date | null {
  let latest: Date | null = null;
  const consider = (value: any): void => {
    const candidate = toDateOrNull(value);
    if (candidate && (!latest || candidate.getTime() > latest.getTime())) {
      latest = candidate;
    }
  };

  const meta = readMetaContainer(instance?.data);
  if (meta) consider(meta[LAST_ACTIVITY_KEY]);

  const pointers = Array.isArray(instance?.executionPointers) ? instance.executionPointers : [];
  for (const pointer of pointers) {
    consider(pointer?.endTime);
    consider(pointer?.startTime);
  }

  consider(instance?.createTime);
  return latest;
}

/**
 * Stamp the engine's last-activity time on a live instance, in memory.
 *
 * Called from `YamlStepBody.run()` — i.e. on the object the engine is about to
 * persist anyway — so this costs one object write and ZERO extra database
 * writes. Never throws: losing a heartbeat must never fail a step.
 */
export function stampLastActivity(instance: any, at: Date = new Date()): boolean {
  try {
    const meta = ensureMetaContainer(instance?.data);
    if (!meta) return false;
    meta[LAST_ACTIVITY_KEY] = at.toISOString();
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort classification of an error caught at the process boundary or
 * reported by the engine, so a crash is not always filed as `unknown`.
 *
 * Deliberately message-driven: the engine and the provider SDKs do not share an
 * error taxonomy, and `code`/`name` are inconsistent across them. Anything that
 * matches nothing is a `crash` (the process died) rather than `unknown` (nobody
 * even tried to attribute it).
 */
export function classifyTerminationError(error: any): TerminationReasonCode {
  const rawMessage = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === 'string'
      ? error
      : `${error?.message ?? ''}`;
  const message = rawMessage.toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();

  if (
    message.includes('heap out of memory') ||
    message.includes('javascript heap') ||
    message.includes('allocation failed') ||
    message.includes('enomem') ||
    code === 'enomem'
  ) {
    return TerminationReasonCode.OOM;
  }

  if (
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('deadline exceeded') ||
    code === 'etimedout'
  ) {
    return TerminationReasonCode.TIMEOUT;
  }

  // HTTP status codes only count when they are actually an HTTP status. A bare
  // /429|502|503/ match turned unrelated messages ("step 503 failed validation",
  // a source line containing 429) into an ATTRIBUTED provider-error — a silent
  // wrong cause in the exact field this ticket exists to make trustworthy.
  const httpStatus = /\b(429|502|503)\b/.test(message) &&
    /(status|http|api|gateway|unavailable|response|upstream)/.test(message);

  if (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('service unavailable') ||
    message.includes('bad gateway') ||
    message.includes('overloaded') ||
    message.includes('api error') ||
    message.includes('model error') ||
    message.includes('provider') ||
    httpStatus ||
    code === 'econnrefused' ||
    code === 'econnreset'
  ) {
    return TerminationReasonCode.PROVIDER_ERROR;
  }

  return TerminationReasonCode.CRASH;
}

/**
 * Map the engine's dead-letter `reason` (+ the step's last error message) onto a
 * termination code. Dead-lettered instances are displayed as TERMINATED, so
 * without this mapping they are exactly the "no reason" rows this ticket is
 * about.
 */
export function classifyDeadLetterReason(
  engineReason: string | null | undefined,
  errorMessage: string | null | undefined,
): { code: TerminationReasonCode; message: string } {
  const detail = errorMessage && errorMessage.trim() !== '' ? errorMessage : '';
  const label = engineReason || 'unspecified';

  if (detail) {
    const classified = classifyTerminationError(detail);
    // A dead-letter is normally a step/provider failure. `classifyTerminationError`
    // returns CRASH for unmatched text, but a dead-lettered run did not crash the
    // process — it exhausted its retry budget. Keep provider/timeout/OOM
    // attributions, otherwise report the failure as a provider error.
    const code = classified === TerminationReasonCode.CRASH
      ? TerminationReasonCode.PROVIDER_ERROR
      : classified;
    return { code, message: `Dead-lettered (${label}): ${detail}` };
  }

  return {
    code: TerminationReasonCode.UNKNOWN,
    message: `Dead-lettered (${label}) with no recorded step error.`,
  };
}

/**
 * Synthesise a reason for a terminal instance that has none recorded.
 *
 * This is the "silence is not acceptable" guarantee. It runs at READ time so it
 * also covers the rows that are already terminated in production (the four of
 * six recent instances with `completeTime: null`), which no amount of new write
 * paths can retroactively fix.
 */
export function describeTerminationForStatus(
  engineStatus: number,
  completeTime: Date | null,
  lastActivity: Date | null,
  createTime: Date | null,
): ITerminationReasonDto | null {
  // Status 2 (Complete) is NOT a termination: a successful run has no "why did it
  // not finish", and synthesising one made 100% of successful runs report "the
  // process may have died", destroying the field's value as a filter. Only 3/4.
  if (!isTerminationReasonStatus(engineStatus)) return null;

  const time = completeTime || lastActivity || createTime || new Date();
  const statusLabel = engineStatus === 4
    ? 'DeadLettered (displayed as Terminated)'
    : 'Terminated';

  return {
    code: TerminationReasonCode.UNKNOWN,
    message:
      `Instance reached ${statusLabel} without a recorded termination reason. ` +
      'It predates termination-reason recording, or the process died before the reason could be written.',
    time,
    source: 'derived',
    recorded: false,
  };
}

/**
 * Normalise a caller-supplied reason into a persisted shape. Never throws.
 */
export function buildTerminationReason(
  input: {
    code?: TerminationReasonCode | string | null;
    message?: string | null;
    time?: Date | string | number | null;
    source?: TerminationReasonSource | null;
  },
  now: Date = new Date(),
): ITerminationReason {
  const rawCode = typeof input?.code === 'string' ? input.code : '';
  const code = VALID_CODES.indexOf(rawCode) !== -1
    ? (rawCode as TerminationReasonCode)
    : TerminationReasonCode.UNKNOWN;

  return {
    code,
    message: truncateReasonMessage(input?.message || 'No message supplied.'),
    time: toDateOrNull(input?.time) || now,
    source: (input?.source || 'owner') as TerminationReasonSource,
  };
}
