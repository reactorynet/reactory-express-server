import os from "os";
import { MasterLockModel } from "./MasterLock.model";

export interface MasterLockRepository {
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<{ ownerId: string } | null>;
  deleteOne(filter: Record<string, unknown>): Promise<unknown>;
}

export interface MasterLockOptions {
  instanceId?: string;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
}

const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 60 * 1000;

const defaultInstanceId = () =>
  process.env.REACTORY_POD_ID || `${os.hostname()}-${process.pid}`;

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 11000;

export class MasterLock {
  private readonly leaseDurationMs: number;
  private readonly heartbeatIntervalMs: number;
  private heartbeat?: NodeJS.Timeout;
  private active = true;

  public constructor(
    private readonly repository: MasterLockRepository,
    public readonly name: string,
    public readonly ownerId: string,
    options: MasterLockOptions
  ) {
    this.leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.startHeartbeat();
  }

  public get isActive(): boolean {
    return this.active;
  }

  public async renew(): Promise<boolean> {
    if (!this.active) {
      return false;
    }

    const lock = await this.repository.findOneAndUpdate(
      { name: this.name, ownerId: this.ownerId },
      { $set: { expiresAt: new Date(Date.now() + this.leaseDurationMs) } },
      { new: true }
    );

    this.active = lock?.ownerId === this.ownerId;
    if (!this.active) {
      this.stopHeartbeat();
    }

    return this.active;
  }

  public async release(): Promise<void> {
    this.stopHeartbeat();
    if (!this.active) {
      return;
    }

    this.active = false;
    await this.repository.deleteOne({ name: this.name, ownerId: this.ownerId });
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalMs <= 0) {
      return;
    }

    this.heartbeat = setInterval(() => {
      void this.renew().catch(() => {
        this.active = false;
        this.stopHeartbeat();
      });
    }, this.heartbeatIntervalMs);
    this.heartbeat.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }
}

export const acquireMasterLock = async (
  name: string,
  options: MasterLockOptions = {},
  repository: MasterLockRepository = MasterLockModel as unknown as MasterLockRepository
): Promise<MasterLock | null> => {
  const ownerId = options.instanceId || defaultInstanceId();
  const now = new Date();
  const leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;

  try {
    const lock = await repository.findOneAndUpdate(
      {
        name,
        $or: [{ expiresAt: { $lte: now } }, { ownerId }],
      },
      {
        $set: {
          ownerId,
          acquiredAt: now,
          expiresAt: new Date(now.getTime() + leaseDurationMs),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (lock?.ownerId !== ownerId) {
      return null;
    }

    return new MasterLock(repository, name, ownerId, options);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return null;
    }
    throw error;
  }
};