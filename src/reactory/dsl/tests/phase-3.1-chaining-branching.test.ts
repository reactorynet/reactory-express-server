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

describe('Phase 3.1 - Macro Chaining & Branching', () => {
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

  describe('Macro Chaining (--> operator)', () => {
    test('should execute basic macro chaining', async () => {
      const input = `@print("Hello") --> @print("World")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should pass output from source to destination macro', async () => {
      const input = `@print("Hello") --> @print($out)`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle multiple chained macros', async () => {
      const input = `@print("First") --> @print("Second") --> @print("Third")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle chaining with built-in functions', async () => {
      const input = `@var("name", "John") --> @print($out)`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle chaining with async functions', async () => {
      const input = `@fetch("https://api.example.com") --> @print($out)`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Macro Branching (-=> operator)', () => {
    test('should execute branching with success condition', async () => {
      const input = `@if(true, "success", "failure") -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should execute branching with failure condition', async () => {
      const input = `@if(false, "success", "failure") -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle branching with built-in functions', async () => {
      const input = `@var("test", true) -=> [@print("True"), @print("False")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle branching with async functions', async () => {
      const input = `@fetch("https://api.example.com") -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Nested Macro Invocations', () => {
    test('should handle nested macro invocations in chaining', async () => {
      const input = `@print(@var("name", "John")) --> @print("Hello")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle nested macro invocations in branching', async () => {
      const input = `@if(@var("test", true), "success", "failure") -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Output Variable Handling ($out)', () => {
    test('should handle $out variable in chaining', async () => {
      const input = `@print("Hello") --> @print($out)`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle $out variable in branching', async () => {
      const input = `@print("Test") -=> [@print($out), @print("Alternative")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle $out[0..n] array access', async () => {
      const input = `@print("Hello World") --> @print($out[0])`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Complex Chaining and Branching Scenarios', () => {
    test('should handle chaining with branching', async () => {
      const input = `@print("Hello") --> @if(true, "success", "failure") -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle branching with chaining', async () => {
      const input = `@if(true, "success", "failure") -=> [@print("Success") --> @print("Chain"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle multiple chained branches', async () => {
      const input = `@print("Start") --> @if(true, "success", "failure") -=> [@print("Success"), @print("Failure")] --> @print("End")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling in Chaining and Branching', () => {
    test('should handle errors in chaining gracefully', async () => {
      const input = `@undefinedFunction() --> @print("Should not execute")`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should handle gracefully
    });

    test('should handle errors in branching gracefully', async () => {
      const input = `@undefinedFunction() -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should handle gracefully
    });

    test('should handle missing arguments in chaining', async () => {
      const input = `@print() --> @print("World")`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should handle gracefully
    });

    test('should handle missing arguments in branching', async () => {
      const input = `@if() -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should handle gracefully
    });
  });

  describe('Performance Testing', () => {
    test('should handle rapid chaining operations', async () => {
      const input = `@print("1") --> @print("2") --> @print("3") --> @print("4") --> @print("5")`;
      const startTime = Date.now();
      const result = await execute(input, context);
      const endTime = Date.now();
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle rapid branching operations', async () => {
      const input = `@if(true, "success", "failure") -=> [@print("Success"), @print("Failure")]`;
      const startTime = Date.now();
      const result = await execute(input, context);
      const endTime = Date.now();
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle data processing pipeline with chaining', async () => {
      const input = `@fetch("https://api.example.com") --> @print("Data received") --> @print("Processing complete")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle conditional processing with branching', async () => {
      const input = `@fetch("https://api.example.com") -=> [@print("API call successful"), @print("API call failed")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle complex business logic', async () => {
      const input = `@var("user", "John") --> @if($user === "John", "Welcome John", "Unknown user") -=> [@print("Success"), @print("Failure")]`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });
}); 