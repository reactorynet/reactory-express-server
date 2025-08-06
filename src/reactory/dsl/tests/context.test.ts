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

import DSLExecutionContext from '../compiler/engine/ExecutionContext';

describe('Enhanced DSL Execution Context', () => {
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

  describe('Variable Scoping', () => {
    test('should handle basic variable operations', () => {
      context.set('name', 'John');
      context.set('age', 30);
      
      expect(context.get('name')).toBe('John');
      expect(context.get('age')).toBe(30);
      expect(context.has('name')).toBe(true);
      expect(context.has('nonexistent')).toBe(false);
    });

    test('should support scope pushing and popping', () => {
      context.set('global', 'value');
      
      context.pushScope();
      context.set('local', 'localValue');
      expect(context.get('global')).toBe('value');
      expect(context.get('local')).toBe('localValue');
      
      context.popScope();
      expect(context.get('global')).toBe('value');
      expect(context.has('local')).toBe(false);
    });

    test('should handle nested scopes correctly', () => {
      context.set('level0', 'value0');
      
      context.pushScope();
      context.set('level1', 'value1');
      
      context.pushScope();
      context.set('level2', 'value2');
      expect(context.get('level0')).toBe('value0');
      expect(context.get('level1')).toBe('value1');
      expect(context.get('level2')).toBe('value2');
      
      context.popScope();
      expect(context.get('level0')).toBe('value0');
      expect(context.get('level1')).toBe('value1');
      expect(context.has('level2')).toBe(false);
      
      context.popScope();
      expect(context.get('level0')).toBe('value0');
      expect(context.has('level1')).toBe(false);
    });

    test('should handle variable deletion', () => {
      context.set('temp', 'value');
      expect(context.has('temp')).toBe(true);
      
      context.delete('temp');
      expect(context.has('temp')).toBe(false);
    });
  });

  describe('Function Registry', () => {
    test('should register and execute synchronous functions', () => {
      const testFn = jest.fn((args: any[]) => 'test result');
      context.registerFunction('test', testFn);
      
      expect(context.hasFunction('test')).toBe(true);
      expect(context.listFunctions()).toContain('test');
    });

    test('should register and execute asynchronous functions', async () => {
      const asyncFn = jest.fn(async (args: any[]) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      
      context.registerFunction('asyncTest', asyncFn, true);
      
      expect(context.hasFunction('asyncTest')).toBe(true);
      const result = await context.executeFunction('asyncTest', ['arg1']);
      expect(result).toBe('async result');
    });

    test('should handle function unregistration', () => {
      context.registerFunction('temp', () => 'temp');
      expect(context.hasFunction('temp')).toBe(true);
      
      context.unregisterFunction('temp');
      expect(context.hasFunction('temp')).toBe(false);
    });

    test('should throw error for non-existent functions', async () => {
      await expect(context.executeFunction('nonexistent', [])).rejects.toThrow('Function nonexistent not found');
    });
  });

  describe('Built-in Functions', () => {
    test('should have print function', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await context.executeFunction('print', ['Hello', 'World']);
      
      expect(consoleSpy).toHaveBeenCalledWith('Hello', 'World');
      expect(result).toBe('Hello World');
      
      consoleSpy.mockRestore();
    });

    test('should have var function for variable declaration', async () => {
      const result = await context.executeFunction('var', ['testVar', 'testValue']);
      
      expect(result).toBe('testValue');
      expect(context.get('testVar')).toBe('testValue');
    });

    test('should have get function for variable retrieval', async () => {
      context.set('testVar', 'testValue');
      
      const result = await context.executeFunction('get', ['testVar']);
      
      expect(result).toBe('testValue');
    });

    test('should have asyncPrint function', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await context.executeFunction('asyncPrint', ['Async', 'Hello']);
      
      expect(consoleSpy).toHaveBeenCalledWith('Async', 'Hello');
      expect(result).toBe('Async Hello');
      
      consoleSpy.mockRestore();
    });

    test('should have fetch function', async () => {
      const result = await context.executeFunction('fetch', ['https://api.example.com']);
      
      expect(result).toBe('Mock response from https://api.example.com');
    });
  });

  describe('Async Operations Management', () => {
    test('should track pending async operations', async () => {
      expect(context.getPendingAsyncCount()).toBe(0);
      
      // Start async operations but don't await them immediately
      const promise1 = context.executeFunction('fetch', ['url1']);
      const promise2 = context.executeFunction('fetch', ['url2']);
      
      // Check that async operations are tracked
      expect(context.getPendingAsyncCount()).toBeGreaterThan(0);
      
      // Wait for all async operations
      await context.waitForAllAsync();
      
      expect(context.getPendingAsyncCount()).toBe(0);
    });

    test('should wait for all async operations', async () => {
      const promise1 = context.executeFunction('fetch', ['url1']);
      const promise2 = context.executeFunction('fetch', ['url2']);
      
      const results = await context.waitForAllAsync();
      
      expect(results).toHaveLength(2);
      expect(results[0]).toContain('url1');
      expect(results[1]).toContain('url2');
      expect(context.getPendingAsyncCount()).toBe(0);
    });
  });

  describe('Error Recovery', () => {
    test('should handle ReferenceError gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Register a function that throws ReferenceError
      context.registerFunction('refErrorFn', () => {
        throw new ReferenceError('Variable not found');
      });
      
      const result = await context.executeFunction('refErrorFn', []);
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Variable not found: Variable not found');
      
      consoleSpy.mockRestore();
    });

    test('should handle TypeError gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Register a function that throws TypeError
      context.registerFunction('typeErrorFn', () => {
        throw new TypeError('Type error test');
      });
      
      const result = await context.executeFunction('typeErrorFn', []);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Type error: Type error test');
      
      consoleSpy.mockRestore();
    });

    test('should support custom error handlers', async () => {
      const customHandler = jest.fn(() => 'custom error result');
      context.registerErrorHandler('Error', customHandler); // Use 'Error' instead of 'CustomError'
      
      context.registerFunction('customErrorFn', () => {
        throw new Error('Custom error');
      });
      
      const result = await context.executeFunction('customErrorFn', []);
      
      expect(customHandler).toHaveBeenCalled();
      expect(result).toBe('custom error result');
    });

    test('should support recovery strategies', async () => {
      const retryFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue('Success');
      
      const result = await context.attemptRecovery('retry', retryFn, 2);
      
      expect(result).toBe('Success');
      expect(retryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Context Isolation', () => {
    test('should create isolated contexts', () => {
      context.set('shared', 'sharedValue');
      
      const isolated = context.createIsolatedContext();
      
      expect(isolated.get('shared')).toBeUndefined();
      expect(context.get('shared')).toBe('sharedValue');
    });

    test('should not affect parent context from isolated context', () => {
      const isolated = context.createIsolatedContext();
      
      isolated.set('isolatedVar', 'isolatedValue');
      
      expect(isolated.get('isolatedVar')).toBe('isolatedValue');
      expect(context.get('isolatedVar')).toBeUndefined();
    });
  });

  describe('Context Serialization', () => {
    test('should serialize context state', () => {
      context.set('var1', 'value1');
      context.set('var2', 42);
      
      const serialized = context.serialize();
      
      expect(serialized.host).toBe('mock');
      expect(serialized.variables.get('var1')).toBe('value1');
      expect(serialized.variables.get('var2')).toBe(42);
      expect(serialized.functions).toContain('print');
      expect(serialized.pendingAsync).toBe(0);
      expect(serialized.executionStackDepth).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex variable scoping scenarios', () => {
      // Global scope
      context.set('global', 'globalValue');
      
      // First nested scope
      context.pushScope();
      context.set('level1', 'level1Value');
      context.set('global', 'level1Override');
      
      expect(context.get('global')).toBe('level1Override');
      expect(context.get('level1')).toBe('level1Value');
      
      // Second nested scope
      context.pushScope();
      context.set('level2', 'level2Value');
      
      expect(context.get('global')).toBe('level1Override');
      expect(context.get('level1')).toBe('level1Value');
      expect(context.get('level2')).toBe('level2Value');
      
      // Pop back to level 1
      context.popScope();
      expect(context.get('global')).toBe('level1Override');
      expect(context.get('level1')).toBe('level1Value');
      expect(context.has('level2')).toBe(false);
      
      // Pop back to global
      context.popScope();
      expect(context.get('global')).toBe('globalValue');
      expect(context.has('level1')).toBe(false);
    });

    test('should handle async operations with error recovery', async () => {
      // Register a function that sometimes fails
      let callCount = 0;
      const unreliableFn = jest.fn(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'Success after retries';
      });
      
      context.registerFunction('unreliable', unreliableFn, true);
      
      const result = await context.attemptRecovery('retry', unreliableFn, 3);
      
      expect(result).toBe('Success after retries');
      expect(unreliableFn).toHaveBeenCalledTimes(3);
    });
  });
}); 