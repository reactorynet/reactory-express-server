import execute from '../compiler/engine/ExecutionEngine';
import DSLExecutionContext from '../compiler/engine/ExecutionContext';

// Mock the ReactoryContextProvider to avoid external dependencies
jest.mock('@reactory/server-core/context/ReactoryContextProvider', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'mock-context',
    partner: 'mock-partner',
    host: 'cli',
    user: null,
    organization: null,
    getService: jest.fn(() => null),
    getData: jest.fn(() => ({})),
    getValue: jest.fn(() => ({})),
    getGraphQLContext: jest.fn(() => ({})),
    getRequest: jest.fn(() => ({})),
    getResponse: jest.fn(() => ({})),
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  }))
}));

describe('Output Variables Test', () => {
  let context: DSLExecutionContext;

  beforeEach(() => {
    // Create a minimal mock context
    const mockContext = {
      id: 'test-context',
      partner: 'test-partner',
      host: 'cli' as const,
      user: null,
      organization: null,
      getService: jest.fn(() => null),
      getData: jest.fn(() => ({})),
      getValue: jest.fn(() => ({})),
      getGraphQLContext: jest.fn(() => ({})),
      getRequest: jest.fn(() => ({})),
      getResponse: jest.fn(() => ({})),
      getLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      })),
      error: jest.fn((message: string) => {
        console.error(`DSL Error: ${message}`);
      })
    };
    context = new DSLExecutionContext(mockContext, 'mock');
  });

  describe('Output Variable Methods', () => {
    test('should set and get output variables', () => {
      context.setOutput('$out', 'Hello World');
      expect(context.getOutput('$out')).toBe('Hello World');
    });

    test('should get last output', () => {
      context.setOutput('$out', 'First');
      context.setOutput('$out', 'Second');
      expect(context.getLastOutput()).toBe('Second');
    });

    test('should get output at specific index', () => {
      context.setOutput('$out', 'First');
      context.setOutput('$out', 'Second');
      context.setOutput('$out', 'Third');
      expect(context.getOutputAtIndex(0)).toBe('First');
      expect(context.getOutputAtIndex(1)).toBe('Second');
      expect(context.getOutputAtIndex(2)).toBe('Third');
    });

    test('should get output history', () => {
      context.setOutput('$out', 'First');
      context.setOutput('$out', 'Second');
      const history = context.getOutputHistory();
      expect(history.length).toBe(2);
      expect(history[0].value).toBe('First');
      expect(history[1].value).toBe('Second');
    });

    test('should clear outputs', () => {
      context.setOutput('$out', 'Test');
      context.clearOutputs();
      expect(context.getOutput('$out')).toBeUndefined();
      expect(context.getOutputHistory().length).toBe(0);
    });
  });

  describe('Output Variables in Execution', () => {
    test('should store output from basic macro execution', async () => {
      const input = `@print("Hello World")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
      // The output should be stored in the context
      expect(context.getLastOutput()).toBeDefined();
    });

    test('should handle output variables in chaining context', async () => {
      // This test verifies that the infrastructure is ready for chaining
      const input = `@print("Hello")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
      // When chaining is fully implemented, this should work
      expect(context.getOutput('$out')).toBeDefined();
    });

    test('should handle output variables in branching context', async () => {
      // This test verifies that the infrastructure is ready for branching
      const input = `@if(true, "success", "failure")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
      // When branching is fully implemented, this should work
      expect(context.getOutput('$condition')).toBeDefined();
    });
  });

  describe('Output Variable Edge Cases', () => {
    test('should handle undefined output', () => {
      expect(context.getOutput('$undefined')).toBeUndefined();
    });

    test('should handle negative index', () => {
      context.setOutput('$out', 'Test');
      expect(context.getOutputAtIndex(-1)).toBeUndefined();
    });

    test('should handle out of bounds index', () => {
      context.setOutput('$out', 'Test');
      expect(context.getOutputAtIndex(10)).toBeUndefined();
    });

    test('should handle empty history', () => {
      expect(context.getLastOutput()).toBeUndefined();
      expect(context.getOutputHistory().length).toBe(0);
    });
  });

  describe('Output Variable Integration', () => {
    test('should maintain output across multiple executions', async () => {
      const input1 = `@print("First")`;
      const input2 = `@print("Second")`;
      
      await execute(input1, context);
      const firstOutput = context.getLastOutput();
      
      await execute(input2, context);
      const secondOutput = context.getLastOutput();
      
      expect(firstOutput).toBeDefined();
      expect(secondOutput).toBeDefined();
      expect(firstOutput).not.toBe(secondOutput);
    });

    test('should handle multiple output variables', () => {
      context.setOutput('$out', 'Output 1');
      context.setOutput('$condition', true);
      context.setOutput('$result', 'Success');
      
      expect(context.getOutput('$out')).toBe('Output 1');
      expect(context.getOutput('$condition')).toBe(true);
      expect(context.getOutput('$result')).toBe('Success');
    });
  });
}); 