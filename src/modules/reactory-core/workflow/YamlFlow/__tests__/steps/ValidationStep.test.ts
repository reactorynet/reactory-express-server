/**
 * ValidationStep — template resolution in list-form rules.
 *
 * The step used to evaluate `field` verbatim. That silently defeated the guard it
 * was written to be: `field: "${input.email}"` with `type: required` PASSES on the
 * unresolved token, because "${input.email}" is a non-empty string. These tests pin
 * the resolution, including that types survive it (a `range` rule must compare
 * numbers, not text).
 */

import { ValidationStep } from '../../steps/core/ValidationStep';
import { StepExecutionContext } from '../../steps/interfaces/IYamlStep';

function makeContext(inputs: Record<string, any> = {}, variables: Record<string, any> = {}): StepExecutionContext {
  return {
    inputs,
    workflowInputs: inputs,
    variables,
    env: {},
    stepResults: {},
    logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    workflow: { id: 'w', instanceId: 'i', nameSpace: 'ns', name: 'n', version: '1.0.0' },
  } as unknown as StepExecutionContext;
}

describe('ValidationStep rule templates', () => {
  it('resolves a templated field before applying a pattern rule', async () => {
    const step = new ValidationStep('validate', {
      rules: [{ field: '${input.currency}', type: 'pattern', value: '^[A-Z]{3}$', message: 'bad currency' }],
    });

    const pass = await step.execute(makeContext({ currency: 'GBP' }));
    expect(pass.success).toBe(true);

    const fail = await step.execute(makeContext({ currency: 'pounds' }));
    expect(fail.success).toBe(false);
    expect(fail.error).toContain('bad currency');
  });

  it('fails a required rule when the referenced input is missing', async () => {
    const step = new ValidationStep('validate', {
      rules: [{ field: '${input.batchId}', type: 'required', message: 'batchId is required' }],
    });

    // The regression: an unresolved "${input.batchId}" is a non-empty string, so the
    // rule used to pass and the workflow proceeded with no batch id at all.
    const result = await step.execute(makeContext({}));
    expect(result.success).toBe(false);
    expect(result.error).toContain('batchId is required');

    const ok = await step.execute(makeContext({ batchId: '2026_001' }));
    expect(ok.success).toBe(true);
  });

  it('preserves value types so type and range rules test the real value', async () => {
    const step = new ValidationStep('validate', {
      rules: [
        { field: '${input.amount}', type: 'type', value: 'number', message: 'amount must be numeric' },
        { field: '${input.amount}', type: 'range', value: { min: 1, max: 5000 }, message: 'amount out of range' },
        { field: '${input.rows}', type: 'type', value: 'array', message: 'rows must be an array' },
      ],
    });

    const ok = await step.execute(makeContext({ amount: 3200, rows: [{ rowId: '1' }] }));
    expect(ok.success).toBe(true);

    const tooBig = await step.execute(makeContext({ amount: 9000, rows: [] }));
    expect(tooBig.success).toBe(false);
    expect(tooBig.error).toContain('amount out of range');
  });

  it('resolves templates in the expectation as well as the field', async () => {
    const step = new ValidationStep('validate', {
      rules: [{ field: '${input.amount}', type: 'range', value: { min: '${input.floor}', max: 10000 } }],
    });
    // Bounds can come from workflow inputs, so `value` is resolved too.
    const result = await step.execute(makeContext({ amount: 50, floor: 100 }));
    expect(result.success).toBe(false);
  });

  it('resolves variables as well as inputs', async () => {
    const step = new ValidationStep('validate', {
      rules: [{ field: '${variables.summary.rowCount}', type: 'range', value: { min: 1 }, message: 'batch is empty' }],
    });

    const empty = await step.execute(makeContext({}, { summary: { rowCount: 0 } }));
    expect(empty.success).toBe(false);
    expect(empty.error).toContain('batch is empty');

    const ok = await step.execute(makeContext({}, { summary: { rowCount: 2 } }));
    expect(ok.success).toBe(true);
  });
});
