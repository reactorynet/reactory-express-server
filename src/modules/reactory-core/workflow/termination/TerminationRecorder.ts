/**
 * The one place that writes a termination reason, an interruption note, a
 * last-activity stamp or a worktree-salvage record onto a persisted workflow
 * instance.
 *
 * INVARIANTS (all of them are tested):
 *  1. NEVER THROWS. Recording a reason must never mask or replace the failure it
 *     is describing. Every public method catches and logs.
 *  2. NEVER LIES ABOUT A TRANSITION IT DID NOT MAKE. `recordTermination` re-reads
 *     the instance and refuses to write onto a run that is already settled:
 *       - status 2 (Complete) is never relabelled by anything, ever;
 *       - a terminal row that already has a `completeTime` is left alone unless
 *         the caller is explicitly the transition that produced it (`force`);
 *       - a run that has not terminated gets an *interruption* note, never a
 *         termination reason, because the engine will resume it and the reason
 *         would then be a stale lie on a later COMPLETE row.
 *  3. O(1) PER TRANSITION. One `getWorkflowInstance` + one `persistWorkflow` for a
 *     terminal transition. Nothing here scans the collection, and nothing here
 *     runs per step (the per-step heartbeat is an in-memory stamp on the object
 *     the engine is already persisting — see `stampLastActivity`).
 *  4. BACKWARD COMPATIBLE. Reads tolerate absent fields; writes only ever ADD
 *     keys inside `data.__reactory`, never rewrite the shape of `data`.
 *  5. PROVIDER AGNOSTIC. Uses only `IPersistenceProvider` methods, so Mongo,
 *     SQLite, Postgres and the in-memory provider all work unchanged.
 *  6. A QUEUED REASON IS NOT DISCARDED ON A FAILED APPLY. `drainOutbox` re-queues
 *     records whose write failed and only unlinks the files it fully dealt with.
 *
 * Sync vs async:
 *  - `cancel`, `dead-letter`, step/provider failure and graceful `stop()` all
 *    reach this class directly and are awaited — they have a live event loop.
 *  - `uncaughtException` / `unhandledRejection` do NOT: `src/express/server.ts`
 *    exits synchronously on an unhandled rejection. Those paths call
 *    `queueProcessTermination()` (synchronous file append) and the next boot
 *    calls `drainOutbox()`.
 */

import {
  IPersistenceProvider,
  WorkflowInstance,
} from '@reactorynet/workflow-es';
import {
  buildTerminationReason,
  hasUnresolvedSalvage,
  isEngineTerminalStatus,
  isTerminationReasonStatus,
  readSalvageRecord,
  readTerminationReason,
  TerminationReasonCode,
  TerminationReasonSource,
  truncateReasonMessage,
  IWorkflowSalvageRecord,
  INTERRUPTED_KEY,
  TERMINATION_KEY,
  SALVAGE_KEY,
  ensureMetaContainer,
  toDateOrNull,
} from './TerminationReason';
import {
  acknowledgeOutboxBatch,
  appendOutboxRecords,
  IOutboxBatch,
  ITerminationOutboxRecord,
  requeueOutboxRecords,
  takeOutboxRecords,
} from './TerminationOutbox';

/** Minimal logger shape (the Reactory winston instance satisfies it). */
export interface ITerminationRecorderLogger {
  debug?: (message: string, meta?: any) => void;
  info?: (message: string, meta?: any) => void;
  warn?: (message: string, meta?: any) => void;
  error?: (message: string, meta?: any) => void;
}

/** Input accepted by `recordTermination`. */
export interface ITerminationRecordInput {
  code?: TerminationReasonCode | string | null;
  message?: string | null;
  time?: Date | string | number | null;
  source?: TerminationReasonSource | null;
  /** Only for interruption notes. */
  pid?: number | null;
  signal?: string | null;
}

/**
 * Why a write did or did not land. Only `write-failed` is retryable; everything
 * else is a definitive answer that must NOT be retried (and must not hold a
 * queued record hostage).
 */
export type LifecycleWriteOutcome =
  | 'applied'
  | 'already-complete'
  | 'already-settled'
  | 'not-terminal'
  | 'not-found'
  | 'unsupported-data'
  | 'no-persistence'
  | 'write-failed';

export interface ILifecycleWriteResult {
  applied: boolean;
  outcome: LifecycleWriteOutcome;
  /** True only for a transient persistence failure — safe (and desirable) to retry. */
  retryable: boolean;
  /** The reason code that was (or would have been) written. */
  code?: TerminationReasonCode;
}

export interface IRecordTerminationOptions {
  /**
   * The caller IS the transition that made this instance terminal, and therefore
   * knows better than the persisted state (which the engine may not have written
   * yet — the dead-letter event is emitted before the status is persisted).
   *
   * Even with `force`, an instance whose persisted status is 2 (Complete) is
   * never relabelled.
   */
  force?: boolean;
  /**
   * Refuse to write unless the re-read status is terminal (3/4). Used by the
   * outbox drain, which must not accuse a live run of having terminated.
   */
  onlyIfTerminal?: boolean;
  /**
   * The caller knows the instance is (or is about to be) terminal and wants
   * `completeTime` stamped even if the re-read status is not terminal yet.
   *
   * Required for the dead-letter path: the engine emits
   * `workflow.dead-lettered` BEFORE it persists the dead-lettered status, so the
   * reload can still show Runnable even though the transition has happened.
   */
  terminal?: boolean;
  /** Override the completion timestamp (defaults to the reason time). */
  completeTime?: Date | null;
}

/** Input accepted by `recordSalvage`. */
export interface ISalvageRecordInput {
  worktreePath?: string | null;
  branch?: string | null;
  headSha?: string | null;
  dirty?: boolean | null;
  changedFileCount?: number | null;
  message?: string | null;
  required?: boolean;
  /** Set when the work was already committed (records the SHA, resolves the guard). */
  salvageSha?: string | null;
  /** Set when the work was already published (records the merge SHA). */
  publishedSha?: string | null;
}

/** Thrown by `assertSalvageClear` when a terminated run still owes salvage work. */
export class UnresolvedSalvageError extends Error {
  public readonly instanceId: string;
  public readonly salvage: IWorkflowSalvageRecord;

  constructor(instanceId: string, salvage: IWorkflowSalvageRecord) {
    super(
      `Workflow instance ${instanceId} terminated with unpublished work in ` +
      `${salvage.worktreePath || 'an unknown worktree'}` +
      `${salvage.branch ? ` on branch ${salvage.branch}` : ''}. ` +
      'Commit the work (recording the SHA) or acknowledge the salvage record before cleanup.',
    );
    this.name = 'UnresolvedSalvageError';
    this.instanceId = instanceId;
    this.salvage = salvage;
  }
}

/** True for the engine's optimistic-concurrency rejection (name-based: not re-exported). */
function isConcurrencyError(error: any): boolean {
  return !!error && (error.name === 'WorkflowConcurrencyError' || /concurrenc/i.test(String(error.message || '')));
}

/**
 * What a mutation callback decided.
 *
 *  - `null`                       -> accept the write, persist, report `applied`
 *  - a `LifecycleWriteOutcome`    -> abandon the write, report that outcome
 *  - `{ skip, persist: true }`    -> persist a CLEANUP (e.g. deleting a stale
 *                                    reason) but still report `skip`: the caller
 *                                    asked to record something and that did not
 *                                    happen, so `applied` would be a lie.
 */
type MutationInstruction =
  | LifecycleWriteOutcome
  | { skip: LifecycleWriteOutcome; persist: true }
  | null;

function result(outcome: LifecycleWriteOutcome, code?: TerminationReasonCode): ILifecycleWriteResult {
  return {
    applied: outcome === 'applied',
    outcome,
    retryable: outcome === 'write-failed',
    code,
  };
}

export class WorkflowInstanceLifecycleRecorder {
  private persistence: IPersistenceProvider | null;
  private readonly logger: ITerminationRecorderLogger;
  private readonly now: () => Date;

  constructor(options: {
    persistence?: IPersistenceProvider | null;
    logger?: ITerminationRecorderLogger;
    now?: () => Date;
  } = {}) {
    this.persistence = options.persistence || null;
    this.logger = options.logger || {};
    this.now = options.now || (() => new Date());
  }

  /** The runner swaps the provider when it (re)initialises. */
  public setPersistence(provider: IPersistenceProvider | null): void {
    this.persistence = provider || null;
  }

  public hasPersistence(): boolean {
    return !!this.persistence;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    try {
      const fn = this.logger[level];
      if (typeof fn === 'function') fn(message, meta);
    } catch {
      /* logging must never break recording */
    }
  }

  /**
   * Load an instance, apply `mutate`, and persist with one retry on optimistic
   * concurrency conflict.
   *
   * The retry re-loads and re-applies `mutate`, so a concurrent engine write can
   * never be clobbered by a stale copy of the document.
   *
   * `mutate` returns `null` to accept the write, or a skip token (the outcome to
   * report) to abandon it. Returning a skip token is how an already-settled
   * instance is protected: the instance is simply not persisted.
   */
  private async mutateInstance(
    instanceId: string,
    mutate: (instance: WorkflowInstance) => MutationInstruction,
    attempt = 0,
  ): Promise<ILifecycleWriteResult> {
    if (!this.persistence) return result('no-persistence');
    if (!instanceId) return result('not-found');

    try {
      const instance = await this.persistence.getWorkflowInstance(instanceId);
      if (!instance) {
        this.log('debug', `Cannot record lifecycle state for ${instanceId}: instance not found`);
        return result('not-found');
      }

      const instruction = mutate(instance);
      if (instruction === null) {
        await this.persistence.persistWorkflow(instance);
        return result('applied');
      }
      if (typeof instruction === 'string') {
        return result(instruction);
      }

      // Persist the cleanup, but do not claim the caller's write landed.
      await this.persistence.persistWorkflow(instance);
      return result(instruction.skip);
    } catch (error) {
      if (isConcurrencyError(error) && attempt < 1) {
        return this.mutateInstance(instanceId, mutate, attempt + 1);
      }
      this.log('warn', `Failed to record lifecycle state for ${instanceId} (best-effort, retryable)`, {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
      return result('write-failed');
    }
  }

  /** Load an instance (read-only). Returns null when unavailable. */
  private async loadInstance(instanceId: string): Promise<WorkflowInstance | null> {
    if (!this.persistence || !instanceId) return null;
    try {
      return (await this.persistence.getWorkflowInstance(instanceId)) || null;
    } catch {
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Termination reason
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Record why an instance terminated.
   *
   * The write is conditional on the transition — see the class comment. In short:
   * Complete (2) is never touched; a terminal row that already has a
   * `completeTime` is left alone unless `force`; a live row is refused unless the
   * caller forces the transition.
   *
   * Self-healing: when this is called for a COMPLETE row that still carries a
   * stale `termination` record (written by a drain that ran while the run was
   * live, before resume), the stale record is removed. That is what stops a
   * resumed-and-then-completed run from reporting a crash forever.
   */
  public async recordTermination(
    instanceId: string,
    input: ITerminationRecordInput,
    options: IRecordTerminationOptions = {},
  ): Promise<ILifecycleWriteResult> {
    const reason = buildTerminationReason(input, this.now());

    const outcome = await this.mutateInstance(instanceId, (instance) => {
      const meta = ensureMetaContainer((instance as any).data);
      if (!meta) {
        this.log('warn', `Cannot record termination reason for ${instanceId}: instance data is not an object`);
        return 'unsupported-data';
      }

      const status = (instance as any).status;
      // `options.terminal` matters for the dead-letter event: the engine emits it
      // BEFORE persisting the dead-lettered status, so the reload can still show
      // Runnable even though the transition has happened.
      const terminal = options.terminal === true || isEngineTerminalStatus(status);
      const completeTime = toDateOrNull((instance as any).completeTime);
      const existing = readTerminationReason(instance);

      // 1. A COMPLETE run is never relabelled — by a deploy, a crash, a cancel or
      //    anything else. This is the guarantee that stops every restart from
      //    rewriting finished runs as SHUTDOWN/CRASH.
      if (status === 2) {
        if (meta[TERMINATION_KEY]) {
          delete meta[TERMINATION_KEY];
          this.log('info', `Cleared a stale termination reason on completed instance ${instanceId}`);
          // Persist the cleanup, but report that no reason was written.
          return { skip: 'already-complete', persist: true };
        }
        return 'already-complete';
      }

      // 2. Callers that must not accuse a live run of having terminated.
      if (options.onlyIfTerminal && !terminal) {
        return 'not-terminal';
      }

      // 3. Already settled: terminal, finished, and (usually) attributed. Its
      //    reason is history; a restart must not overwrite it.
      if (!options.force && terminal && (completeTime || (existing && existing.code !== TerminationReasonCode.UNKNOWN))) {
        return 'already-settled';
      }

      // 4. A live run is only written when the caller IS the transition.
      if (!options.force && !terminal) {
        return 'not-terminal';
      }

      meta[TERMINATION_KEY] = {
        code: reason.code,
        message: truncateReasonMessage(reason.message),
        time: reason.time.toISOString(),
        source: reason.source || 'owner',
      };

      // A terminated instance is FINISHED. `completeTime: null` on a terminal
      // status breaks duration reporting and every never-finished query.
      if (terminal && !completeTime) {
        (instance as any).completeTime = toDateOrNull(options.completeTime) || reason.time;
      }

      return null;
    });

    if (outcome.applied) {
      this.log('info', `Recorded termination reason for ${instanceId}: ${reason.code}`, {
        instanceId,
        code: reason.code,
        source: reason.source,
      });
    } else if (outcome.outcome !== 'not-found') {
      this.log('debug', `Termination reason not written for ${instanceId}: ${outcome.outcome}`, {
        instanceId,
        code: reason.code,
      });
    }

    return { ...outcome, code: reason.code };
  }

  /**
   * Record that a run was INTERRUPTED by the process going down, without
   * claiming it terminated.
   *
   * Used for live in-flight instances at shutdown and by the outbox drain when
   * the engine will resume the instance. Never surfaced as a termination reason.
   */
  public async recordInterruption(
    instanceId: string,
    input: ITerminationRecordInput,
  ): Promise<ILifecycleWriteResult> {
    const reason = buildTerminationReason(input, this.now());

    const outcome = await this.mutateInstance(instanceId, (instance) => {
      const meta = ensureMetaContainer((instance as any).data);
      if (!meta) return 'unsupported-data';

      const status = (instance as any).status;
      // A finished run has nothing to interrupt; and a COMPLETE run must never be
      // annotated as if something went wrong.
      if (status === 2 || isEngineTerminalStatus(status)) return 'already-settled';

      meta[INTERRUPTED_KEY] = {
        code: reason.code,
        message: truncateReasonMessage(reason.message),
        time: reason.time.toISOString(),
        source: reason.source || 'process',
        pid: input.pid ?? process.pid,
        signal: input.signal ?? null,
      };
      return null;
    });

    if (outcome.applied) {
      this.log('warn', `Recorded interruption for live instance ${instanceId}: ${reason.code}`, {
        instanceId,
        code: reason.code,
      });
    }
    return { ...outcome, code: reason.code };
  }

  /**
   * Record the same reason against several instances (graceful shutdown, crash).
   * Runs in parallel; failures are logged and never propagate.
   */
  public async recordTerminationForMany(
    instanceIds: Iterable<string>,
    input: ITerminationRecordInput,
    options: IRecordTerminationOptions = {},
  ): Promise<{ recorded: number; attempted: number; outcomes: ILifecycleWriteResult[] }> {
    const ids = Array.from(instanceIds || []).filter((id) => typeof id === 'string' && id.length > 0);
    if (ids.length === 0) return { recorded: 0, attempted: 0, outcomes: [] };

    const results = await Promise.allSettled(
      ids.map((id) => this.recordTermination(id, input, options)),
    );
    const outcomes = results
      .filter((r): r is PromiseFulfilledResult<ILifecycleWriteResult> => r.status === 'fulfilled')
      .map((r) => r.value);
    return {
      recorded: outcomes.filter((o) => o.applied).length,
      attempted: ids.length,
      outcomes,
    };
  }

  /**
   * Same as `recordTerminationForMany` but writes interruption notes — the
   * correct call for instances that were still running when the process stopped.
   */
  public async recordInterruptionForMany(
    instanceIds: Iterable<string>,
    input: ITerminationRecordInput,
  ): Promise<{ recorded: number; attempted: number }> {
    const ids = Array.from(instanceIds || []).filter((id) => typeof id === 'string' && id.length > 0);
    if (ids.length === 0) return { recorded: 0, attempted: 0 };

    const results = await Promise.allSettled(ids.map((id) => this.recordInterruption(id, input)));
    const recorded = results.filter((r) => r.status === 'fulfilled' && r.value.applied).length;
    return { recorded, attempted: ids.length };
  }

  /**
   * SYNCHRONOUS crash path: queue a reason for every in-flight instance on disk,
   * so it survives the `process.exit()` that follows.
   *
   * Never throws. Returns the number of records queued.
   */
  public queueProcessTermination(
    instanceIds: Iterable<string>,
    input: ITerminationRecordInput & { signal?: string },
  ): number {
    const ids = Array.from(instanceIds || []).filter((id) => typeof id === 'string' && id.length > 0);
    if (ids.length === 0) return 0;

    const time = this.now().toISOString();
    const record = buildTerminationReason(input, new Date(time));
    const records: ITerminationOutboxRecord[] = ids.map((instanceId) => ({
      instanceId,
      code: record.code,
      message: record.message,
      time,
      source: record.source || 'process',
      pid: process.pid,
      signal: input.signal,
    }));

    const queued = appendOutboxRecords(records);
    if (queued > 0) {
      this.log('warn', `Queued ${queued} termination reason(s) to the crash outbox`, {
        code: record.code,
        signal: input.signal,
      });
    }
    return queued;
  }

  /**
   * Apply reasons queued by a process that died.
   *
   * Disposition per record (all reached by re-reading the instance, so the
   * decision is made from the persisted truth rather than from what the dead
   * process believed):
   *  - instance missing / data unusable      -> drop (nothing can ever be written)
   *  - status 2 (Complete)                   -> drop (it finished; nothing to say)
   *  - status 3/4 (Terminated / DeadLettered) -> record the reason + completeTime
   *  - still running (0/1)                   -> record an INTERRUPTION, never a
   *                                             termination reason: the engine will
   *                                             resume it
   *  - persistence write failed              -> RE-QUEUE the record and keep the
   *                                             draining files
   *
   * Only when every record reached a definitive disposition are the claimed files
   * unlinked. A transient database outage at boot therefore cannot discard the
   * reason the crash was supposed to capture.
   */
  public async drainOutbox(): Promise<{
    applied: number;
    attempted: number;
    interrupted: number;
    dropped: number;
    requeued: number;
  }> {
    const empty = { applied: 0, attempted: 0, interrupted: 0, dropped: 0, requeued: 0 };
    if (!this.persistence) return empty;

    let batch: IOutboxBatch;
    try {
      batch = takeOutboxRecords();
    } catch {
      return empty;
    }
    if (!batch || batch.records.length === 0) {
      // Nothing to apply: release any empty draining files we claimed.
      acknowledgeOutboxBatch(batch);
      return empty;
    }

    // Keep the newest record per instance: a crash loop can queue several.
    const newest = new Map<string, ITerminationOutboxRecord>();
    for (const record of batch.records) {
      const previous = newest.get(record.instanceId);
      if (!previous || String(record.time) >= String(previous.time)) {
        newest.set(record.instanceId, record);
      }
    }

    let applied = 0;
    let interrupted = 0;
    let dropped = 0;
    const retryable: ITerminationOutboxRecord[] = [];

    for (const record of newest.values()) {
      const instance = await this.loadInstance(record.instanceId);
      if (!instance) {
        dropped += 1;
        continue;
      }

      const input: ITerminationRecordInput = {
        code: record.code,
        message: `[process ${record.pid ?? '?'}${record.signal ? ` ${record.signal}` : ''}] ${record.message}`,
        time: record.time,
        source: record.source || 'process',
        pid: record.pid,
        signal: record.signal,
      };

      // COMPLETE is checked FIRST, deliberately: `isEngineTerminalStatus(2)` is
      // true, so testing the broad terminal predicate first would make this arm
      // unreachable (the earlier revision had exactly that dead branch). A
      // successful run has nothing to say about why it did not finish.
      if ((instance as any).status === 2) {
        dropped += 1;
      } else if (isEngineTerminalStatus((instance as any).status)) {
        const outcome = await this.recordTermination(record.instanceId, input, {
          // Not `force`: an already-settled terminal row keeps the reason it has.
          force: false,
          onlyIfTerminal: true,
        });
        if (outcome.applied) applied += 1;
        else if (outcome.retryable) retryable.push(record);
        else dropped += 1;
      } else {
        const outcome = await this.recordInterruption(record.instanceId, input);
        if (outcome.applied) interrupted += 1;
        else if (outcome.retryable) retryable.push(record);
        else dropped += 1;
      }
    }

    // Re-queue BEFORE unlinking: a failure here still leaves the draining file,
    // and a duplicate apply is a no-op because the writer refuses to touch a
    // settled instance.
    if (retryable.length > 0) {
      const requeued = requeueOutboxRecords(retryable);
      if (requeued > 0) {
        this.log('warn', `Kept ${requeued} termination reason(s) in the outbox for a later retry`);
      }
    }

    acknowledgeOutboxBatch(batch);

    if (applied + interrupted > 0) {
      this.log('warn', 'Applied queued reasons from a previous process', {
        applied,
        interrupted,
        dropped,
        requeued: retryable.length,
      });
    }

    return {
      applied,
      attempted: newest.size,
      interrupted,
      dropped,
      requeued: retryable.length,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Salvage
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Record that a terminated run has work that may need salvaging.
   *
   * The engine does not run `git` (that would be a layering violation: the
   * workflow engine has no business knowing about worktrees). It records the
   * facts the owner reported — path, branch, HEAD, dirty flag — and blocks
   * destructive cleanup until the record is resolved. See `assertSalvageClear`.
   */
  public async recordSalvage(
    instanceId: string,
    input: ISalvageRecordInput,
  ): Promise<IWorkflowSalvageRecord | null> {
    let saved: IWorkflowSalvageRecord | null = null;

    await this.mutateInstance(instanceId, (instance) => {
      const meta = ensureMetaContainer((instance as any).data);
      if (!meta) return 'unsupported-data';

      const previous = readSalvageRecord(instance);
      const next: IWorkflowSalvageRecord = {
        required: input.required !== undefined ? input.required === true : true,
        worktreePath: input.worktreePath ?? previous?.worktreePath ?? null,
        branch: input.branch ?? previous?.branch ?? null,
        headSha: input.headSha ?? previous?.headSha ?? null,
        dirty: input.dirty !== undefined ? input.dirty : previous?.dirty ?? null,
        changedFileCount: input.changedFileCount !== undefined
          ? input.changedFileCount
          : previous?.changedFileCount ?? null,
        message: input.message ?? previous?.message ?? null,
        recordedAt: previous?.recordedAt || this.now(),
        // Never resurrect a resolved record by re-recording it.
        acknowledgedAt: previous?.acknowledgedAt ?? null,
        acknowledgedBy: previous?.acknowledgedBy ?? null,
        salvageSha: input.salvageSha ?? previous?.salvageSha ?? null,
        publishedSha: input.publishedSha ?? previous?.publishedSha ?? null,
      };

      meta[SALVAGE_KEY] = {
        ...next,
        recordedAt: next.recordedAt.toISOString(),
        acknowledgedAt: next.acknowledgedAt ? next.acknowledgedAt.toISOString() : null,
      };
      saved = next;
      return null;
    });

    return saved;
  }

  /**
   * Resolve a salvage record. `salvageSha` records a commit that preserved the
   * work; `publishedSha` records a merge. Either, or an explicit acknowledgement,
   * unblocks cleanup.
   */
  public async acknowledgeSalvage(
    instanceId: string,
    input: {
      acknowledgedBy?: string | null;
      note?: string | null;
      salvageSha?: string | null;
      publishedSha?: string | null;
    } = {},
  ): Promise<IWorkflowSalvageRecord | null> {
    let saved: IWorkflowSalvageRecord | null = null;

    await this.mutateInstance(instanceId, (instance) => {
      const meta = ensureMetaContainer((instance as any).data);
      if (!meta) return 'unsupported-data';

      const previous = readSalvageRecord(instance);
      if (!previous) return 'not-found';

      const next: IWorkflowSalvageRecord = {
        ...previous,
        acknowledgedAt: this.now(),
        acknowledgedBy: input.acknowledgedBy || 'unknown',
        message: input.note ? `${previous.message ? `${previous.message} — ` : ''}${input.note}` : previous.message,
        salvageSha: input.salvageSha || previous.salvageSha || null,
        publishedSha: input.publishedSha || previous.publishedSha || null,
      };

      meta[SALVAGE_KEY] = {
        ...next,
        recordedAt: next.recordedAt.toISOString(),
        acknowledgedAt: next.acknowledgedAt ? next.acknowledgedAt.toISOString() : null,
      };
      saved = next;
      return null;
    });

    return saved;
  }

  /**
   * Auto-capture a salvage record from a terminated instance's own data.
   *
   * CONTRACT (what a publish-path workflow should put in its workflow data):
   *
   *   data.__reactory.worktree = {
   *     path: '/abs/path/to/worktree',   // or `worktreePath`
   *     branch: 'bug/REACTORY-...',
   *     headSha: '4856720',
   *     dirty: true,
   *     changedFileCount: 15
   *   }
   *
   *   data.__reactory.publish = { mergedSha: '…', prUrl: '…' }   // when published
   *
   * The engine never shells out to `git`: it records what the owner reported and
   * blocks destructive cleanup of the instance row until the record is resolved.
   * Returns null when the instance is not terminated or reported no worktree
   * (nothing to protect).
   */
  public async captureSalvageForTerminatedInstance(instanceId: string): Promise<IWorkflowSalvageRecord | null> {
    if (!this.persistence || !instanceId) return null;

    let instance: any;
    try {
      instance = await this.persistence.getWorkflowInstance(instanceId);
    } catch {
      return null;
    }
    if (!instance || !isTerminationReasonStatus((instance as any).status)) return null;

    const existing = readSalvageRecord(instance);
    if (existing) return existing;

    const data = instance.data && typeof instance.data === 'object' ? instance.data : {};
    const meta = data.__reactory && typeof data.__reactory === 'object' ? data.__reactory : {};
    const reported = meta.worktree || data.worktree || data.__worktree || null;
    if (!reported || typeof reported !== 'object') return null;

    const worktreePath = reported.path || reported.worktreePath || null;
    if (!worktreePath) return null;

    const publish = meta.publish || data.publish || null;
    const publishedSha = publish && typeof publish.mergedSha === 'string' ? publish.mergedSha : null;

    const dirty = typeof reported.dirty === 'boolean'
      ? reported.dirty
      : typeof reported.changedFileCount === 'number'
        ? reported.changedFileCount > 0
        : null;

    return this.recordSalvage(instanceId, {
      worktreePath,
      branch: reported.branch || null,
      headSha: reported.headSha || reported.sha || null,
      dirty,
      changedFileCount: typeof reported.changedFileCount === 'number' ? reported.changedFileCount : null,
      message: publishedSha
        ? `Work published as ${publishedSha}.`
        : 'Instance terminated before the publish path completed; the worktree may hold unpublished work.',
      publishedSha,
      // Only unpublished work with actual changes needs protecting.
      required: !publishedSha && dirty !== false,
    });
  }

  /** Read the salvage record (null when there is none). */
  public async getSalvage(instanceId: string): Promise<IWorkflowSalvageRecord | null> {
    const instance = await this.loadInstance(instanceId);
    return readSalvageRecord(instance);
  }

  /**
   * The guard a consumer must call before removing a worktree (or otherwise
   * discarding a terminated run's artefacts).
   *
   * @throws UnresolvedSalvageError when the record is required and unresolved.
   * @returns the record (possibly null when nothing was ever recorded).
   */
  public async assertSalvageClear(instanceId: string): Promise<IWorkflowSalvageRecord | null> {
    const record = await this.getSalvage(instanceId);
    if (hasUnresolvedSalvage(record)) {
      throw new UnresolvedSalvageError(instanceId, record as IWorkflowSalvageRecord);
    }
    return record;
  }
}
