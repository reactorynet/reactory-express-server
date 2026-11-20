/**
 * R1/R3 — the workflow query index bootstrap, tested on the real boot path.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * `WorkflowRunner.ts` destructures `MONGOOSE` from `process.env` **when the
 * module is loaded**:
 *
 *     const { MONGOOSE, WORKFLOW_PERSISTENCE_PROVIDER = 'mongo', ... } = process.env;
 *
 * So `getPersistenceProvider()` only takes the Mongo branch if MONGOOSE was set
 * before the import ran. Setting it in a `beforeEach` (as the first version of
 * these tests did) is too late: the module has already captured `undefined`.
 *
 * Those tests passed locally only because the developer shell had MONGOOSE
 * exported from `.env`, and failed in CI, where the `test` job does not set it.
 * The assignment below runs before every import in this file, so the guard no
 * longer depends on the launching environment.
 *
 * Run standalone without the variable to confirm:
 *     env -u MONGOOSE npx jest WorkflowRunner.indexBootstrap
 */

process.env.MONGOOSE = process.env.MONGOOSE || 'mongodb://localhost:27017/workflow-index-bootstrap-test';
process.env.WORKFLOW_PERSISTENCE_PROVIDER = 'mongo';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WorkflowRunner } = require('../WorkflowRunner');

jest.mock('../../../../../amq', () => ({
  onWorkflowEvent: jest.fn(),
  raiseWorkFlowEvent: jest.fn(),
}));

jest.mock('../../../../../logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@reactorynet/workflow-es', () => ({
  configureWorkflow: jest.fn(() => ({
    useLogger: jest.fn(),
    usePersistence: jest.fn(),
    allowSingleNodeProviders: jest.fn(),
    useQueueManager: jest.fn(),
    useLockManager: jest.fn(),
    getHost: jest.fn(() => ({
      registerWorkflow: jest.fn(),
      start: jest.fn(),
      startWorkflow: jest.fn(),
      stop: jest.fn(),
      publishEvent: jest.fn(),
      terminateWorkflow: jest.fn(),
    })),
  })),
  WorkflowHost: jest.fn(),
  StepBody: class MockStepBody {},
  ExecutionResult: { next: jest.fn() },
  WorkflowStatus: { Runnable: 0, Suspended: 1, Complete: 2, Terminated: 3, DeadLettered: 4 },
  LogLevel: { Debug: 0, Info: 1, Warn: 2, Error: 3 },
}));

jest.mock('@reactorynet/workflow-es-mongodb', () => ({
  MongoDBPersistence: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MongoDBPersistence } = require('@reactorynet/workflow-es-mongodb');

const makeContext = () => ({ modules: [], log: jest.fn() } as any);

/**
 * A stand-in provider exposing the one surface the bootstrap touches.
 * `createIndex` is a spy so we can assert the index was actually requested.
 */
const makeProvider = () => {
  const createIndex = jest.fn().mockResolvedValue('idx_workflows_status_pointer_status');
  return {
    connect: Promise.resolve(),
    close: jest.fn(),
    workflowCollection: { createIndex },
    __createIndex: createIndex,
  };
};

describe('WorkflowRunner — workflow query index bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has MONGOOSE visible to the module at load time', () => {
    // Guards the guard: if this ever fails, every test below is meaningless
    // because getPersistenceProvider() would take the "not set" branch.
    expect(process.env.MONGOOSE).toBeTruthy();
  });

  it('creates the pointer-status index on the REAL boot path', async () => {
    const provider = makeProvider();
    (MongoDBPersistence as unknown as jest.Mock).mockImplementation(() => provider);

    const runner = new WorkflowRunner({ workflows: [] }, makeContext());

    // Exactly what initialize() awaits - before any assignment to this.persistence.
    await (runner as any).getPersistenceProvider();

    expect(provider.__createIndex).toHaveBeenCalledWith(
      { status: 1, 'executionPointers.status': 1 },
      expect.objectContaining({ name: 'idx_workflows_status_pointer_status' })
    );
  });

  it('creates the index through initialize() as well', async () => {
    const provider = makeProvider();
    (MongoDBPersistence as unknown as jest.Mock).mockImplementation(() => provider);

    const runner = new WorkflowRunner({ workflows: [] }, makeContext());
    await runner.initialize();

    expect(provider.__createIndex).toHaveBeenCalledTimes(1);
  });

  it('does not fail the boot when the provider has no collection', async () => {
    (MongoDBPersistence as unknown as jest.Mock).mockImplementation(() => ({
      connect: Promise.resolve(),
      close: jest.fn(),
    }));

    const runner = new WorkflowRunner({ workflows: [] }, makeContext());

    await expect((runner as any).getPersistenceProvider()).resolves.toBeTruthy();
  });
});
