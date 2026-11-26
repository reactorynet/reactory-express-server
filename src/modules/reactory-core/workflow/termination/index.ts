/**
 * Termination-reason recording, salvage records and engine last-activity.
 *
 * Root cause this module exists for: a Terminated instance used to be
 * indistinguishable between crash / cancel / timeout / provider failure /
 * shutdown — it carried no reason, no completeTime and no error at all.
 */
export {
  TerminationReasonCode,
  REACTORY_META_NAMESPACE,
  TERMINATION_KEY,
  LAST_ACTIVITY_KEY,
  SALVAGE_KEY,
  INTERRUPTED_KEY,
  MAX_REASON_MESSAGE_LENGTH,
  isEngineTerminalStatus,
  isTerminationReasonStatus,
  ensureMetaContainer,
  readMetaContainer,
  toDateOrNull,
  truncateReasonMessage,
  readTerminationReason,
  readInterruption,
  readSalvageRecord,
  readLastActivity,
  stampLastActivity,
  hasUnresolvedSalvage,
  classifyTerminationError,
  classifyDeadLetterReason,
  describeTerminationForStatus,
  buildTerminationReason,
  type ITerminationReason,
  type ITerminationReasonDto,
  type IWorkflowInterruption,
  type IWorkflowSalvageRecord,
  type TerminationReasonSource,
} from './TerminationReason';

export {
  WorkflowInstanceLifecycleRecorder,
  UnresolvedSalvageError,
  type ITerminationRecorderLogger,
  type ITerminationRecordInput,
  type IRecordTerminationOptions,
  type ISalvageRecordInput,
  type ILifecycleWriteResult,
  type LifecycleWriteOutcome,
} from './TerminationRecorder';

export {
  appendOutboxRecords,
  requeueOutboxRecords,
  takeOutboxRecords,
  acknowledgeOutboxBatch,
  readOutboxRecords,
  clearOutbox,
  resolveOutboxPath,
  type ITerminationOutboxRecord,
  type IOutboxBatch,
} from './TerminationOutbox';
