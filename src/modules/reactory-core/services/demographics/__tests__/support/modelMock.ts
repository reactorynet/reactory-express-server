/**
 * ORG-040 test support: mongoose model doubles for `legacyDemographicsMongoSource`.
 *
 * These live beside the suites but under `__tests__/support/`, which
 * `jest.config.ts` excludes from test discovery. They are required lazily from
 * inside `jest.mock` factories (the factories are hoisted, so they must not
 * close over module-scope consts).
 *
 * Every model double exposes the read entry points the adapter uses
 * (`find`/`findOne`/`countDocuments`) *and* the write entry points it must never
 * use. The write spies exist so a test can assert the legacy adapter is
 * genuinely read-only rather than merely "not obviously writing".
 */

export interface IQueryChain {
  lean: jest.Mock;
  exec: jest.Mock;
}

/** A mongoose query chain stub: `.lean().exec()` (and `.exec()` alone). */
export const createQueryChain = (result: any): IQueryChain => {
  const chain: any = {};
  chain.exec = jest.fn().mockResolvedValue(result);
  chain.lean = jest.fn().mockReturnValue(chain);
  return chain as IQueryChain;
};

export interface IModelMock {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  countDocuments: jest.Mock;
  // Write entry points. None of these may be called by the adapter.
  create: jest.Mock;
  insertMany: jest.Mock;
  insertOne: jest.Mock;
  updateOne: jest.Mock;
  updateMany: jest.Mock;
  replaceOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
  deleteOne: jest.Mock;
  deleteMany: jest.Mock;
  bulkWrite: jest.Mock;
  save: jest.Mock;
}

/** A fresh model double. */
export const createModelMock = (): IModelMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  insertMany: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  replaceOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
  bulkWrite: jest.fn(),
  save: jest.fn(),
});

/** The write method names asserted against, in one place. */
export const WRITE_METHODS: ReadonlyArray<keyof IModelMock> = [
  'create',
  'insertMany',
  'insertOne',
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
  'bulkWrite',
  'save',
];
