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

describe('DSL Built-in Functions', () => {
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
      }))
    };
    context = new DSLExecutionContext(mockContext, 'mock');
  });

  describe('@print() macro', () => {
    test('should print arguments to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await context.executeFunction('print', ['Hello', 'World']);
      
      expect(consoleSpy).toHaveBeenCalledWith('Hello', 'World');
      expect(result).toBe('Hello World');
      
      consoleSpy.mockRestore();
    });

    test('should handle multiple arguments', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await context.executeFunction('print', ['Value:', 42, 'is', 'correct']);
      
      expect(consoleSpy).toHaveBeenCalledWith('Value:', 42, 'is', 'correct');
      expect(result).toBe('Value: 42 is correct');
      
      consoleSpy.mockRestore();
    });

    test('should handle empty arguments', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await context.executeFunction('print', []);
      
      expect(consoleSpy).toHaveBeenCalledWith();
      expect(result).toBe('');
      
      consoleSpy.mockRestore();
    });
  });

  describe('@var() macro', () => {
    test('should declare and set variables', async () => {
      const result = await context.executeFunction('var', ['testVar', 'testValue']);
      
      expect(result).toBe('testValue');
      expect(context.get('testVar')).toBe('testValue');
    });

    test('should handle different variable types', async () => {
      await context.executeFunction('var', ['stringVar', 'hello']);
      await context.executeFunction('var', ['numberVar', 42]);
      await context.executeFunction('var', ['boolVar', true]);
      await context.executeFunction('var', ['arrayVar', [1, 2, 3]]);
      
      expect(context.get('stringVar')).toBe('hello');
      expect(context.get('numberVar')).toBe(42);
      expect(context.get('boolVar')).toBe(true);
      expect(context.get('arrayVar')).toEqual([1, 2, 3]);
    });

    test('should overwrite existing variables', async () => {
      await context.executeFunction('var', ['testVar', 'initial']);
      await context.executeFunction('var', ['testVar', 'updated']);
      
      expect(context.get('testVar')).toBe('updated');
    });
  });

  describe('@if() macro', () => {
    test('should execute true block when condition is true', async () => {
      const result = await context.executeFunction('if', [true, 'success', 'failure']);
      
      expect(result).toBe('success');
    });

    test('should execute false block when condition is false', async () => {
      const result = await context.executeFunction('if', [false, 'success', 'failure']);
      
      expect(result).toBe('failure');
    });

    test('should return null when condition is false and no else block', async () => {
      const result = await context.executeFunction('if', [false, 'success']);
      
      expect(result).toBeNull();
    });

    test('should handle truthy/falsy values', async () => {
      expect(await context.executeFunction('if', [1, 'truthy', 'falsy'])).toBe('truthy');
      expect(await context.executeFunction('if', [0, 'truthy', 'falsy'])).toBe('falsy');
      expect(await context.executeFunction('if', ['hello', 'truthy', 'falsy'])).toBe('truthy');
      expect(await context.executeFunction('if', ['', 'truthy', 'falsy'])).toBe('falsy');
    });
  });

  describe('@while() macro', () => {
    test('should execute loop body while condition is true', async () => {
      const result = await context.executeFunction('while', [true, 'loop body']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle false condition', async () => {
      const result = await context.executeFunction('while', [false, 'loop body']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should return array of results', async () => {
      const result = await context.executeFunction('while', [true, 'iteration']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item === 'iteration')).toBe(true);
    });
  });

  describe('@for() macro', () => {
    test('should execute loop body for specified iterations', async () => {
      const result = await context.executeFunction('for', ['init', 'condition', 'increment', 'loop body']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // Mock implementation runs 3 times
    });

    test('should return array of results', async () => {
      const result = await context.executeFunction('for', ['init', 'condition', 'increment', 'iteration']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item === 'iteration')).toBe(true);
    });

    test('should handle different loop parameters', async () => {
      const result = await context.executeFunction('for', ['i=0', 'i<5', 'i++', 'body']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // Mock implementation limit
    });
  });

  describe('@try() macro', () => {
    test('should execute try block successfully', async () => {
      const result = await context.executeFunction('try', ['success result', null, null]);
      
      expect(result).toBe('success result');
    });

    test('should execute catch block when error occurs', async () => {
      const catchHandler = jest.fn((error: any) => `caught: ${error.message}`);
      const result = await context.executeFunction('try', [
        () => { throw new Error('test error'); },
        catchHandler,
        null
      ]);
      
      expect(catchHandler).toHaveBeenCalled();
      expect(result).toContain('caught: test error');
    });

    test('should execute finally block', async () => {
      const finallyHandler = jest.fn();
      await context.executeFunction('try', ['success', null, finallyHandler]);
      
      expect(finallyHandler).toHaveBeenCalled();
    });

    test('should execute finally block even when error occurs', async () => {
      const finallyHandler = jest.fn();
      const catchHandler = jest.fn((error: any) => 'caught');
      
      await context.executeFunction('try', [
        () => { throw new Error('test error'); },
        catchHandler,
        finallyHandler
      ]);
      
      expect(finallyHandler).toHaveBeenCalled();
      expect(catchHandler).toHaveBeenCalled();
    });
  });

  describe('@switch() macro', () => {
    test('should return matching case', async () => {
      const cases = {
        'case1': 'result1',
        'case2': 'result2',
        'default': 'default result'
      };
      
      const result = await context.executeFunction('switch', ['case1', cases]);
      
      expect(result).toBe('result1');
    });

    test('should return null for non-matching case', async () => {
      const cases = {
        'case1': 'result1',
        'case2': 'result2'
      };
      
      const result = await context.executeFunction('switch', ['case3', cases]);
      
      expect(result).toBeNull();
    });

    test('should handle different value types', async () => {
      const cases = {
        1: 'number case',
        'string': 'string case',
        true: 'boolean case'
      };
      
      expect(await context.executeFunction('switch', [1, cases])).toBe('number case');
      expect(await context.executeFunction('switch', ['string', cases])).toBe('string case');
      expect(await context.executeFunction('switch', [true, cases])).toBe('boolean case');
    });
  });

  describe('Integration Tests', () => {
    test('should combine multiple built-in functions', async () => {
      // Set up variables
      await context.executeFunction('var', ['name', 'John']);
      await context.executeFunction('var', ['age', 30]);
      
      // Use if with variables
      const result = await context.executeFunction('if', [
        context.get('age') > 18,
        'Adult',
        'Minor'
      ]);
      
      expect(result).toBe('Adult');
    });

    test('should use print with variables', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await context.executeFunction('var', ['message', 'Hello World']);
      await context.executeFunction('print', [context.get('message')]);
      
      expect(consoleSpy).toHaveBeenCalledWith('Hello World');
      
      consoleSpy.mockRestore();
    });

    test('should handle nested control structures', async () => {
      // Set up test data
      await context.executeFunction('var', ['count', 3]);
      
      // Simulate a loop with conditional logic
      const loopResult = await context.executeFunction('for', [
        'i=0',
        'i<count',
        'i++',
        await context.executeFunction('if', [true, 'iteration', 'skip'])
      ]);
      
      expect(Array.isArray(loopResult)).toBe(true);
      expect(loopResult.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing arguments gracefully', async () => {
      // Test with insufficient arguments
      expect(await context.executeFunction('var', ['name'])).toBeUndefined();
      expect(await context.executeFunction('get', [])).toBeUndefined();
    });

    test('should handle invalid function calls', async () => {
      await expect(context.executeFunction('nonexistent', [])).rejects.toThrow('Function nonexistent not found');
    });

    test('should handle try-catch with built-in functions', async () => {
      const result = await context.executeFunction('try', [
        () => context.executeFunction('print', ['success']),
        (error: any) => `Error: ${error.message}`,
        null
      ]);
      
      expect(result).toBe('success');
    });
  });
}); 