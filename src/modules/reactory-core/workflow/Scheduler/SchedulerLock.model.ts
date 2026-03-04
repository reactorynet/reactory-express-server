import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Represents a distributed execution lock for a scheduled workflow.
 *
 * One document is created per (scheduleId, slotTime) pair when a pod wins
 * the right to execute a particular cron slot. The unique compound index
 * guarantees that only one pod can create the document — all other concurrent
 * `insertOne` calls receive a duplicate-key error (code 11000) and must skip
 * their execution.
 *
 * The `expiresAt` TTL index causes MongoDB to automatically remove stale lock
 * documents, so no manual cleanup is required.
 */
export interface ISchedulerLock extends Document {
  /** The schedule config ID (matches IScheduleConfig.id) */
  scheduleId: string;
  /**
   * The cron fire slot — current time with seconds and milliseconds zeroed.
   * Computed at trigger time so all pods racing on the same tick derive an
   * identical value.
   */
  slotTime: Date;
  /**
   * Identity of the pod that acquired this lock.
   * Defaults to REACTORY_POD_ID env var, then OS hostname + PID.
   */
  instanceId: string;
  /** Wall-clock time the lock was acquired */
  acquiredAt: Date;
  /**
   * MongoDB TTL field — the lock document is automatically deleted after this
   * timestamp, even if the pod crashed before finishing.
   */
  expiresAt: Date;
}

const SchedulerLockSchema = new Schema<ISchedulerLock>({
  scheduleId: { type: String, required: true },
  slotTime: { type: Date, required: true },
  instanceId: { type: String, required: true },
  acquiredAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

/**
 * Compound unique index: only one winner per (schedule, slot).
 * This is the core serialisation primitive — MongoDB enforces it atomically.
 */
SchedulerLockSchema.index({ scheduleId: 1, slotTime: 1 }, { unique: true });

export const SchedulerLockModel: Model<ISchedulerLock> =
  mongoose.models['SchedulerLock'] as Model<ISchedulerLock> ||
  mongoose.model<ISchedulerLock>('SchedulerLock', SchedulerLockSchema);
