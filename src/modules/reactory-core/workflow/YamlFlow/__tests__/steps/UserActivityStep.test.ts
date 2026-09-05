/**
 * UserActivityStep — the human approval gate.
 *
 * This step is the join between the workflow engine and the task UI:
 *   step → Task document → userWorkflowTasks query → TaskExecutionDialog →
 *   completeWorkflowTask mutation → workflow.task.completed event → step resumes.
 *
 * Four things had to be true for that to work, and none of them were:
 *   1. the task must actually be created (the model import path was wrong, so the
 *      dynamic import threw and the catch downgraded it to a warning);
 *   2. the task must record the real instance id (it recorded context.executionId,
 *      which does not exist, so completeWorkflowTask could never signal);
 *   3. the step must SUSPEND (it returned metadata nobody read and ran straight on);
 *   4. the wake-up must be correlated by TASK ID (signalling by step id cannot match
 *      a named step, whose pointer carries the name rather than the YAML id).
 */

const mockSaved: any[] = [];
let mockPending: any = null;

jest.mock('../../../../models/Task', () => {
  class FakeTask {
    _id = { toString: () => 'task-abc123' };
    constructor(fields: Record<string, any>) {
      Object.assign(this, fields);
    }
    async save() {
      mockSaved.push(this);
      return this;
    }
    static findOne = jest.fn(() => ({ exec: async () => mockPending }));
  }
  return { __esModule: true, default: FakeTask };
});

jest.mock('../../../../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(({ email }: any) => ({
      exec: async () => (email === 'checker@reactory.net' ? { _id: 'user-checker' } : null),
    })),
  },
}));

import { UserActivityStep, TASK_COMPLETED_EVENT } from '../../steps/core/UserActivityStep';
import { StepExecutionContext } from '../../steps/interfaces/IYamlStep';

function makeContext(opts: {
  supportsSuspend?: boolean;
  eventPublished?: boolean;
  eventData?: any;
  stepResults?: Record<string, any>;
  user?: any;
  inputs?: Record<string, any>;
  variables?: Record<string, any>;
  noReactoryContext?: boolean;
} = {}): StepExecutionContext {
  const logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return {
    inputs: opts.inputs || {},
    workflowInputs: opts.inputs || {},
    variables: opts.variables || {},
    env: {},
    stepResults: opts.stepResults || {},
    logger,
    workflow: {
      id: 'ns.Approval@1.0.0',
      instanceId: 'instance-42',
      nameSpace: 'ns',
      name: 'Approval',
      version: '1.0.0',
      tenantId: 'acme',
    },
    reactoryContext: opts.noReactoryContext
      ? undefined
      : {
          user: opts.user === null ? undefined : opts.user || { _id: 'user-starter' },
          partner: { key: 'acme' },
          hasFeature: () => false,
          getService: () => null,
        },
    control: {
      supportsSuspend: opts.supportsSuspend !== false,
      eventPublished: opts.eventPublished === true,
      eventData: opts.eventData,
    },
  } as unknown as StepExecutionContext;
}

describe('UserActivityStep human gate', () => {
  beforeEach(() => {
    mockSaved.length = 0;
    mockPending = null;
    jest.clearAllMocks();
  });

  it('creates a task and suspends on it, correlated by task id', async () => {
    const step = new UserActivityStep('approveBatch', {
      activityType: 'approval',
      message: 'Approve batch ${input.batchId}',
      fqn: 'core.WorkflowTaskApproval@1.0.0',
      props: { currency: 'GBP' },
      propsMap: { amount: 'variables.batchSummary.totalAmount' },
    });

    const context = makeContext({
      inputs: { batchId: '2026_001' },
      variables: { batchSummary: { totalAmount: 6050 } },
    });
    const result = await step.execute(context);

    expect(result.success).toBe(true);
    expect(mockSaved).toHaveLength(1);

    const task = mockSaved[0];
    expect(task.title).toBe('Approve batch 2026_001');
    expect(task.status).toBe('pending');
    expect(task.workflowStatus).toBe('awaiting_input');
    expect(task.componentFqn).toBe('core.WorkflowTaskApproval@1.0.0');
    // The REAL engine instance id — completeWorkflowTask needs it to resume.
    expect(task.instanceId).toBe('instance-42');
    expect(task.stepId).toBe('approveBatch');
    expect(task.workflowId).toBe('ns.Approval@1.0.0');

    // ...and the gate actually suspends, keyed on the task.
    expect(result.control?.waitForEvent).toEqual({
      eventName: TASK_COMPLETED_EVENT,
      eventKey: 'task-abc123',
    });
    expect(result.outputs.taskId).toBe('task-abc123');
    expect(result.outputs.status).toBe('pending');
  });

  it('renders component props from static props and propsMap', async () => {
    const step = new UserActivityStep('approveBatch', {
      activityType: 'approval',
      fqn: 'core.WorkflowTaskApproval@1.0.0',
      props: { currency: 'GBP' },
      propsMap: { amount: 'variables.batchSummary.totalAmount' },
    });

    await step.execute(
      makeContext({ variables: { batchSummary: { totalAmount: 6050 } } }),
    );

    // These become the props the UI renders the approval card with.
    expect(mockSaved[0].componentProps).toMatchObject({ currency: 'GBP', amount: '6050' });
  });

  it('re-uses the pending task when the step re-runs before suspending', async () => {
    mockPending = { _id: { toString: () => 'task-existing' } };
    const step = new UserActivityStep('approveBatch', { activityType: 'approval' });

    const result = await step.execute(makeContext());

    // An engine retry must not raise a second approval for the same gate.
    expect(mockSaved).toHaveLength(0);
    expect(result.outputs.taskId).toBe('task-existing');
    expect(result.control?.waitForEvent?.eventKey).toBe('task-existing');
  });

  it('resumes with the user response once the task is completed', async () => {
    const step = new UserActivityStep('approveBatch', { activityType: 'approval' });

    const result = await step.execute(
      makeContext({
        eventPublished: true,
        eventData: {
          approved: true,
          comment: 'looks fine',
          // Stamped by completeWorkflowTask from the authenticated context.
          completedBy: 'user-checker',
          completedByEmail: 'checker@reactory.net',
          completedAt: '2026-09-05T06:54:45.179Z',
        },
        stepResults: { approveBatch: { success: true, outputs: { taskId: 'task-abc123' }, metadata: {} } },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.control).toBeUndefined();
    expect(result.outputs.status).toBe('completed');
    // The common approval shape is surfaced so YAML can branch without unpacking.
    expect(result.outputs.approved).toBe(true);
    // The approver identity must survive to the workflow — it is what a downstream
    // signal or audit record attributes the approval to.
    expect(result.outputs.completedBy).toBe('user-checker');
    expect(result.outputs.completedByEmail).toBe('checker@reactory.net');
    expect(result.outputs.completedAt).toBe('2026-09-05T06:54:45.179Z');
    expect(result.outputs.response).toMatchObject({ comment: 'looks fine' });
    // No second task on resume.
    expect(mockSaved).toHaveLength(0);
  });

  it('resolves an email assignee to a user id', async () => {
    const step = new UserActivityStep('approveBatch', {
      activityType: 'approval',
      assignee: '${input.approverEmail}',
    });

    await step.execute(makeContext({ inputs: { approverEmail: 'checker@reactory.net' } }));
    expect(mockSaved[0].user).toBe('user-checker');
  });

  it('falls back to the workflow starter when no assignee is configured', async () => {
    const step = new UserActivityStep('approveBatch', { activityType: 'approval' });
    await step.execute(makeContext({ user: { _id: 'user-starter' } }));
    expect(mockSaved[0].user).toBe('user-starter');
  });

  it('fails when no assignee can be determined', async () => {
    const step = new UserActivityStep('approveBatch', { activityType: 'approval' });
    const result = await step.execute(makeContext({ user: null }));

    // A gate with no owner is not a gate — better to fail than to raise a task
    // nobody can see.
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/could not determine an assignee/i);
  });

  it('does not wait — but warns loudly — on an executor that cannot suspend', async () => {
    const step = new UserActivityStep('approveBatch', { activityType: 'approval' });
    const context = makeContext({ supportsSuspend: false });
    const result = await step.execute(context);

    expect(result.success).toBe(true);
    expect(result.control).toBeUndefined();
    expect(mockSaved).toHaveLength(1); // the task is still actionable
    expect((context.logger.warn as jest.Mock)).toHaveBeenCalledWith(
      expect.stringMatching(/cannot suspend/i),
    );
  });

  it('fails the step when the task cannot be created', async () => {
    const TaskModel = require('../../../../models/Task').default;
    TaskModel.findOne = jest.fn(() => ({
      exec: async () => {
        throw new Error('mongo down');
      },
    }));

    const step = new UserActivityStep('approveBatch', { activityType: 'approval' });
    const result = await step.execute(makeContext());

    // Previously this was swallowed as a warning and the workflow proceeded as
    // though the gate had been passed — the approved path running unapproved.
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Could not create the user task/);
  });
});
