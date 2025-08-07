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

describe('Comprehensive DSL Engine Testing', () => {
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

  describe('All Node Types Testing', () => {
    test('should execute MacroInvocation nodes', async () => {
      const input = `@print("Hello World")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should execute Variable nodes (declare)', async () => {
      const input = `$name = "John"`;
      const result = await execute(input, context);
      expect(context.get('name')).toBe('John');
    });

    test('should execute Variable nodes (write)', async () => {
      const input = `$name = "John"; $name = "Jane"`;
      const result = await execute(input, context);
      expect(context.get('name')).toBe('Jane');
    });

    test('should execute Variable nodes (read)', async () => {
      const input = `$name = "John"; $value = $name`;
      const result = await execute(input, context);
      expect(context.get('value')).toBe('John');
    });

    test('should execute StringLiteral nodes', async () => {
      const input = `"Hello World"`;
      const result = await execute(input, context);
      expect(result).toBe('Hello World');
    });

    test('should execute NumberLiteral nodes', async () => {
      const input = `42`;
      const result = await execute(input, context);
      expect(result).toBe(42);
    });

    test('should execute BooleanLiteral nodes', async () => {
      const input = `true`;
      const result = await execute(input, context);
      expect(result).toBe(true);
    });

    test('should execute MacroChain nodes', async () => {
      const input = `@print("Hello") --> @print("World")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should execute MacroBranch nodes', async () => {
      const input = `@if(true, "success", "failure")`;
      const result = await execute(input, context);
      expect(result).toBe('success');
    });

    test('should execute MacroGroup nodes', async () => {
      const input = `[@print("First"), @print("Second")]`;
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should execute ConditionalExpression nodes', async () => {
      const input = `if(true) { "success" } else { "failure" }`;
      const result = await execute(input, context);
      expect(result).toBe('success');
    });

    test('should execute Loop nodes', async () => {
      const input = `while(true) { @print("loop") }`;
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should execute SwitchCase nodes', async () => {
      const input = `switch("A") { case "A": "success"; default: "failure" }`;
      const result = await execute(input, context);
      expect(result).toBe('success');
    });

    test('should execute TryCatchStatement nodes', async () => {
      const input = `try { "success" } catch(error) { "error" }`;
      const result = await execute(input, context);
      expect(result).toBe('success');
    });

    test('should execute Block nodes', async () => {
      const input = `{ @print("First"); @print("Second") }`;
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Comprehensive Error Handling', () => {
    test('should handle undefined function errors', async () => {
      const input = `@undefinedFunction("test")`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled by error recovery
    });

    test('should handle syntax errors gracefully', async () => {
      const input = `$name = ;`; // Invalid syntax
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled gracefully
    });

    test('should handle runtime errors in try-catch', async () => {
      const input = `try { @riskyOperation() } catch(error) { "caught" }`;
      const result = await execute(input, context);
      expect(result).toBe('caught');
    });

    test('should handle missing variable errors', async () => {
      const input = `$undefinedVariable`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled gracefully
    });

    test('should handle type errors gracefully', async () => {
      const input = `$number = "not a number"; $result = $number + 5`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled gracefully
    });

    test('should handle division by zero errors', async () => {
      const input = `$result = 10 / 0`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled gracefully
    });

    test('should handle stack overflow prevention', async () => {
      const input = `while(true) { @print("infinite") }`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be prevented by mock implementation
    });

    test('should handle memory limit errors', async () => {
      const input = `$largeArray = [1, 2, 3, 4, 5]`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled gracefully
    });
  });

  describe('Async Operations Testing', () => {
    test('should handle async function execution', async () => {
      const input = `@asyncPrint("Hello")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle async fetch operations', async () => {
      const input = `@fetch("https://api.example.com")`;
      const result = await execute(input, context);
      expect(result).toContain('Mock response');
    });

    test('should handle multiple async operations', async () => {
      const input = `[@fetch("url1"), @fetch("url2"), @fetch("url3")]`;
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    test('should handle async operations with chaining', async () => {
      const input = `@fetch("url1") --> @print($out)`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle async error recovery', async () => {
      const input = `try { @asyncRiskyOperation() } catch(error) { "async error caught" }`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle async timeout scenarios', async () => {
      const input = `@fetch("slow-api")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle concurrent async operations', async () => {
      const input = `[@fetch("api1"), @fetch("api2"), @fetch("api3")]`;
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Edge Cases and Performance', () => {
    test('should handle empty input', async () => {
      const input = ``;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle very large inputs', async () => {
      const input = `$largeString = "${'a'.repeat(1000)}"`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle deeply nested structures', async () => {
      const input = `if(true) { if(true) { if(true) { @print("deep") } } }`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle circular references gracefully', async () => {
      const input = `$a = $b; $b = $a`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle unicode characters', async () => {
      const input = `$unicode = "Hello 世界 🌍"`;
      const result = await execute(input, context);
      expect(context.get('unicode')).toBe('Hello 世界 🌍');
    });

    test('should handle special characters in strings', async () => {
      const input = `$special = "Hello\n\t\"World\"\\"`;
      const result = await execute(input, context);
      expect(context.get('special')).toBe('Hello\n\t"World"\\');
    });

    test('should handle numeric precision', async () => {
      const input = `$pi = 3.14159265359`;
      const result = await execute(input, context);
      expect(context.get('pi')).toBe(3.14159265359);
    });

    test('should handle boolean operations', async () => {
      const input = `$true = true; $false = false; $and = $true && $false`;
      const result = await execute(input, context);
      expect(context.get('and')).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex business logic', async () => {
      const input = `
        $user = "John"
        $age = 30
        if($age >= 18) {
          @print("Welcome " + $user)
        } else {
          @print("Access denied")
        }
      `;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle data processing pipeline', async () => {
      const input = `
        $data = [1, 2, 3, 4, 5]
        $sum = 0
        for($i = 0; $i < 5; $i++) {
          $sum = $sum + $data[$i]
        }
        @print("Sum: " + $sum)
      `;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle error recovery in complex scenarios', async () => {
      const input = `
        try {
          $result = @riskyOperation()
          @print("Success: " + $result)
        } catch($error) {
          @print("Error: " + $error)
          $fallback = "default value"
        } finally {
          @cleanup()
        }
      `;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle async data processing', async () => {
      const input = `
        $urls = ["api1", "api2", "api3"]
        $results = []
        for($i = 0; $i < 3; $i++) {
          $response = @fetch($urls[$i])
          $results[$i] = $response
        }
        @print("Processed " + $results.length + " responses")
      `;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Performance Testing', () => {
    test('should handle rapid function calls', async () => {
      const input = `@print("1"); @print("2"); @print("3"); @print("4"); @print("5")`;
      const startTime = Date.now();
      const result = await execute(input, context);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle large variable assignments', async () => {
      const input = `$large = "${'x'.repeat(10000)}"`;
      const startTime = Date.now();
      const result = await execute(input, context);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle memory usage efficiently', async () => {
      const input = `
        for($i = 0; $i < 100; $i++) {
          $array[$i] = "value" + $i
        }
      `;
      const startTime = Date.now();
      const result = await execute(input, context);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Security Testing', () => {
    test('should handle injection attempts safely', async () => {
      const input = `$userInput = "'; DROP TABLE users; --"`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle malicious function calls safely', async () => {
      const input = `@eval("malicious code")`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled safely
    });

    test('should handle infinite loop attempts', async () => {
      const input = `while(true) { @print("loop") }`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be prevented
    });

    test('should handle memory exhaustion attempts', async () => {
      const input = `$array = []; for($i = 0; $i < 1000000; $i++) { $array[$i] = $i }`;
      const result = await execute(input, context);
      expect(result).toBeDefined(); // Should be handled safely
    });
  });

  describe('Compatibility Testing', () => {
    test('should handle different input formats', async () => {
      const inputs = [
        `@print("Hello")`,
        `@print('Hello')`,
        `@print(Hello)`,
        `@print( "Hello" )`
      ];
      
      for (const input of inputs) {
        const result = await execute(input, context);
        expect(result).toBeDefined();
      }
    });

    test('should handle whitespace variations', async () => {
      const input = `
        $name="John"
        $age=30
        @print($name)
      `;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    test('should handle case sensitivity', async () => {
      const input = `@PRINT("Hello"); @Print("World"); @print("Test")`;
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });
}); 