import { acquireMasterLock, MasterLockRepository } from "../MasterLock";

const createRepository = (): jest.Mocked<MasterLockRepository> => ({
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
});

describe("MasterLock", () => {
  it("acquires a lock when this pod wins the atomic update", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate.mockResolvedValue({ ownerId: "pod-a" });

    const lock = await acquireMasterLock(
      "client-seed",
      { instanceId: "pod-a", heartbeatIntervalMs: 0 },
      repository
    );

    expect(lock).not.toBeNull();
    expect(lock?.ownerId).toBe("pod-a");
    expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "client-seed" }),
      expect.objectContaining({ $set: expect.objectContaining({ ownerId: "pod-a" }) }),
      expect.objectContaining({ upsert: true })
    );
  });

  it("skips execution when another pod owns the lock", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate.mockResolvedValue({ ownerId: "pod-b" });

    await expect(
      acquireMasterLock("client-seed", { instanceId: "pod-a", heartbeatIntervalMs: 0 }, repository)
    ).resolves.toBeNull();
  });

  it("uses a generated pod identity and default lease settings when omitted", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate.mockImplementation(async (_filter, update) => ({
      ownerId: (update.$set as { ownerId: string }).ownerId,
    }));

    const lock = await acquireMasterLock("client-seed", {}, repository);

    expect(lock?.ownerId).toEqual(expect.any(String));
    await lock?.release();
  });

  it("treats a duplicate-key race as a non-master result", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate.mockRejectedValue({ code: 11000 });

    await expect(
      acquireMasterLock("client-seed", { instanceId: "pod-a", heartbeatIntervalMs: 0 }, repository)
    ).resolves.toBeNull();
  });

  it("renews and releases only the owning pod lock", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate
      .mockResolvedValueOnce({ ownerId: "pod-a" })
      .mockResolvedValueOnce({ ownerId: "pod-a" });

    const lock = await acquireMasterLock(
      "client-seed",
      { instanceId: "pod-a", heartbeatIntervalMs: 0 },
      repository
    );

    await expect(lock?.renew()).resolves.toBe(true);
    await lock?.release();

    expect(repository.findOneAndUpdate).toHaveBeenLastCalledWith(
      { name: "client-seed", ownerId: "pod-a" },
      expect.objectContaining({ $set: expect.objectContaining({ expiresAt: expect.any(Date) }) }),
      { new: true }
    );
    expect(repository.deleteOne).toHaveBeenCalledWith({ name: "client-seed", ownerId: "pod-a" });
  });

  it("becomes inactive when renewal no longer finds this pod lock", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate
      .mockResolvedValueOnce({ ownerId: "pod-a" })
      .mockResolvedValueOnce(null);

    const lock = await acquireMasterLock(
      "client-seed",
      { instanceId: "pod-a", heartbeatIntervalMs: 0 },
      repository
    );

    await expect(lock?.renew()).resolves.toBe(false);
    await lock?.release();

    expect(lock?.isActive).toBe(false);
    await expect(lock?.renew()).resolves.toBe(false);
    expect(repository.deleteOne).not.toHaveBeenCalled();
  });

  it("propagates unexpected datastore failures", async () => {
    const repository = createRepository();
    const error = new Error("database unavailable");
    repository.findOneAndUpdate.mockRejectedValue(error);

    await expect(
      acquireMasterLock("client-seed", { instanceId: "pod-a", heartbeatIntervalMs: 0 }, repository)
    ).rejects.toThrow(error);
  });

  it("marks the lock inactive when its heartbeat renewal fails", async () => {
    const repository = createRepository();
    repository.findOneAndUpdate
      .mockResolvedValueOnce({ ownerId: "pod-a" })
      .mockRejectedValueOnce(new Error("database unavailable"));
    const unref = jest.fn();
    const setIntervalSpy = jest
      .spyOn(global, "setInterval")
      .mockImplementation((callback: TimerHandler) => {
        callback();
        return { unref } as unknown as NodeJS.Timeout;
      });

    const lock = await acquireMasterLock(
      "client-seed",
      { instanceId: "pod-a", heartbeatIntervalMs: 1 },
      repository
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(unref).toHaveBeenCalled();
    expect(lock?.isActive).toBe(false);
    setIntervalSpy.mockRestore();
  });
});