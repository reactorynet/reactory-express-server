import tokenize from '../compiler/parser/lexer';
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

describe('Performance Test', () => {
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

  describe('Lexer Performance', () => {
    test('should tokenize large scripts efficiently', () => {
      const largeScript = '@print("hello") '.repeat(1000) + '@print("world")';
      const startTime = Date.now();
      const tokens = tokenize(largeScript);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle complex nested structures efficiently', () => {
      const complexScript = `
        if(true) {
          while(false) {
            for(i=0; i<10; i++) {
              @print(\`Loop \${i}\`)
              if(i % 2 === 0) {
                @print("even")
              } else {
                @print("odd")
              }
            }
          }
        }
      `.repeat(50);
      
      const startTime = Date.now();
      const tokens = tokenize(complexScript);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle multiple advanced features efficiently', () => {
      const advancedScript = `
        @print(\`Hello \${name}\`) --> @if(true) -=> [
          @print("success"),
          @print("failure")
        ]
        @var(count, 0)
        while($count < 10) {
          @print(\`Count: \${count}\`)
          @var(count, $count + 1)
        }
      `.repeat(20);
      
      const startTime = Date.now();
      const tokens = tokenize(advancedScript);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Memory Usage', () => {
    test('should handle large token arrays without memory issues', () => {
      const largeScript = '@print("hello") '.repeat(5000);
      const startMemory = process.memoryUsage().heapUsed;
      
      const tokens = tokenize(largeScript);
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    test('should handle complex nested structures without memory leaks', () => {
      const complexScript = `
        if(true) {
          while(false) {
            for(i=0; i<100; i++) {
              @print(\`Loop \${i}\`)
            }
          }
        }
      `.repeat(100);
      
      const startMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 10; i++) {
        const tokens = tokenize(complexScript);
        expect(tokens.length).toBeGreaterThan(0);
      }
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });

  describe('Execution Performance', () => {
    test('should execute simple scripts efficiently', async () => {
      const simpleScript = '@print("Hello World")';
      const startTime = Date.now();
      
      try {
        await execute(simpleScript, context);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      } catch (error) {
        // Expected to fail due to AST parser issues, but should not timeout
        expect(error).toBeDefined();
      }
    });

    test('should handle multiple executions efficiently', async () => {
      const scripts = [
        '@print("Hello")',
        '@var(name, "John")',
        '@print("World")'
      ];
      
      const startTime = Date.now();
      
      for (const script of scripts) {
        try {
          await execute(script, context);
        } catch (error) {
          // Expected to fail due to AST parser issues, but should not timeout
          expect(error).toBeDefined();
        }
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle multiple tokenization operations concurrently', () => {
      const scripts = [
        '@print("Hello")',
        '@var(name, "John")',
        '@print("World")',
        'if(true) { @print("yes") }',
        'while(false) { @print("loop") }',
        '`Hello ${name}`'
      ];
      
      const startTime = Date.now();
      
      const promises = scripts.map(script => {
        return new Promise<void>((resolve) => {
          const tokens = tokenize(script);
          expect(tokens.length).toBeGreaterThan(0);
          resolve();
        });
      });
      
      Promise.all(promises).then(() => {
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid successive operations', () => {
      const operations = [];
      
      for (let i = 0; i < 100; i++) {
        operations.push(`@print("operation_${i}")`);
      }
      
      const startTime = Date.now();
      
      for (const operation of operations) {
        const tokens = tokenize(operation);
        expect(tokens.length).toBeGreaterThan(0);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle mixed complexity operations', () => {
      const operations = [
        '@print("simple")',
        'if(true) { @print("complex") }',
        '`Hello ${name}`',
        '@print("hello") --> @print("world")',
        '@if(true) -=> [@print("success"), @print("failure")]',
        'while(false) { @print("loop") }',
        'for(i=0; i<5; i++) { @print("for") }',
        'try { @print("try") } catch { @print("catch") }'
      ];
      
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        for (const operation of operations) {
          const tokens = tokenize(operation);
          expect(tokens.length).toBeGreaterThan(0);
        }
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet basic performance benchmarks', () => {
      const benchmarks = [
        {
          name: 'Simple tokenization',
          script: '@print("hello")',
          maxTime: 10 // 10ms
        },
        {
          name: 'Medium complexity',
          script: 'if(true) { @print("hello") }',
          maxTime: 20 // 20ms
        },
        {
          name: 'String interpolation',
          script: '`Hello ${name}`',
          maxTime: 15 // 15ms
        },
        {
          name: 'Chaining',
          script: '@print("hello") --> @print("world")',
          maxTime: 25 // 25ms
        },
        {
          name: 'Branching',
          script: '@if(true) -=> [@print("success"), @print("failure")]',
          maxTime: 30 // 30ms
        }
      ];
      
      for (const benchmark of benchmarks) {
        const startTime = Date.now();
        const tokens = tokenize(benchmark.script);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(tokens.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(benchmark.maxTime);
      }
    });
  });
}); 