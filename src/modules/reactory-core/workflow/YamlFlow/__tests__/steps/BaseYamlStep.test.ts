/**
 * Unit tests for BaseYamlStep.resolveTemplate — the shared `${...}` template
 * resolver used by every YAML step (cli_command, log, set_variable, etc.).
 */

import { BaseYamlStep } from '../../steps/base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult } from '../../steps/interfaces/IYamlStep';

class ProbeStep extends BaseYamlStep {
  public readonly stepType = 'probe';

  protected async executeStep(): Promise<StepExecutionResult> {
    return { success: true, outputs: {} };
  }

  public resolve(template: string, context: StepExecutionContext): string {
    return this.resolveTemplate(template, context);
  }
}

function makeContext(overrides: Partial<StepExecutionContext> = {}): StepExecutionContext {
  return {
    inputs: {},
    workflowInputs: {},
    variables: {},
    env: {},
    stepResults: {},
    workflow: { id: 't', instanceId: 't', nameSpace: 'test', name: 'probe', version: '1.0.0' },
    logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    ...overrides,
  } as any;
}

describe('BaseYamlStep.resolveTemplate', () => {
  const step = new ProbeStep('probe1', {});

  it('resolves a bare variable key: ${myVar}', () => {
    const context = makeContext({ variables: { clientDir: '/repo/client' } } as any);
    expect(step.resolve('${clientDir}', context)).toBe('/repo/client');
  });

  it('resolves the dotted ${variables.myVar} form (matches ${input.x} / ${steps.x.y} convention)', () => {
    const context = makeContext({ variables: { clientDir: '/repo/client' } } as any);
    expect(step.resolve('${variables.clientDir}', context)).toBe('/repo/client');
  });

  it('resolves nested paths under ${variables.a.b}', () => {
    const context = makeContext({ variables: { config: { region: 'eu' } } } as any);
    expect(step.resolve('${variables.config.region}', context)).toBe('eu');
  });

  it('leaves unresolved ${variables.x} templates untouched instead of throwing', () => {
    const context = makeContext({ variables: {} } as any);
    expect(step.resolve('${variables.missing}', context)).toBe('${variables.missing}');
  });

  it('resolves ${steps.X.outputs.Y} against the step result outputs (explicit convention)', () => {
    const context = makeContext({
      stepResults: {
        getBranch: { success: true, outputs: { stdout: 'master\n' }, metadata: {} },
      },
    } as any);
    expect(step.resolve('${steps.getBranch.outputs.stdout}', context)).toBe('master\n');
  });

  it('resolves the ${steps.X.Y} shorthand against outputs', () => {
    const context = makeContext({
      stepResults: {
        forecast: { success: true, outputs: { content: 'sunny' }, metadata: {} },
      },
    } as any);
    expect(step.resolve('${steps.forecast.content}', context)).toBe('sunny');
  });

  it('resolves ${steps.X.success} and ${steps.X.metadata.Z} from the step-result shape', () => {
    const context = makeContext({
      stepResults: {
        build: { success: true, outputs: {}, metadata: { duration: 42 } },
      },
    } as any);
    expect(step.resolve('${steps.build.success}', context)).toBe('true');
    expect(step.resolve('${steps.build.metadata.duration}', context)).toBe('42');
  });

  it('leaves an unresolved ${steps.X.outputs.Y} template intact', () => {
    const context = makeContext({
      stepResults: {
        getBranch: { success: true, outputs: { stdout: 'master' }, metadata: {} },
      },
    } as any);
    expect(step.resolve('${steps.getBranch.outputs.missing}', context)).toBe(
      '${steps.getBranch.outputs.missing}',
    );
  });

  it('still resolves ${input.x} and ${steps.x.y} alongside ${variables.x} in the same string', () => {
    const context = makeContext({
      workflowInputs: { client: 'reactory', env: 'local' },
      variables: { clientDir: '/repo/client' },
    } as any);
    expect(
      step.resolve("Building client '${input.client}' (${input.env}) in ${variables.clientDir}", context),
    ).toBe("Building client 'reactory' (local) in /repo/client");
  });

  it('resolves logical OR (||) expressions with literals and variables', () => {
    const context = makeContext({
      workflowInputs: { model: 'gpt-4' },
      env: { MY_TEST_UNIQUE_ENV_VAR_THAT_DOES_NOT_EXIST: 'gemini-2.5-pro' }
    } as any);

    // 1. Resolves first truthy operand
    expect(step.resolve('${input.model || env.MY_TEST_UNIQUE_ENV_VAR_THAT_DOES_NOT_EXIST || "claude-3-5-sonnet"}', context)).toBe('gpt-4');

    // 2. Falls back to second operand when first is missing
    const contextNoModel = makeContext({
      workflowInputs: {},
      env: { MY_TEST_UNIQUE_ENV_VAR_THAT_DOES_NOT_EXIST: 'gemini-2.5-pro' }
    } as any);
    expect(step.resolve('${input.model || env.MY_TEST_UNIQUE_ENV_VAR_THAT_DOES_NOT_EXIST || "claude-3-5-sonnet"}', contextNoModel)).toBe('gemini-2.5-pro');

    // 3. Falls back to literal when first and second are missing
    const contextEmpty = makeContext({
      workflowInputs: {},
      env: {}
    } as any);
    expect(step.resolve('${input.model || env.MY_TEST_UNIQUE_ENV_VAR_THAT_DOES_NOT_EXIST || "claude-3-5-sonnet"}', contextEmpty)).toBe('claude-3-5-sonnet');
    expect(step.resolve("${input.model || env.MY_TEST_UNIQUE_ENV_VAR_THAT_DOES_NOT_EXIST || 'claude-3-5-sonnet'}", contextEmpty)).toBe('claude-3-5-sonnet');
  });
});
