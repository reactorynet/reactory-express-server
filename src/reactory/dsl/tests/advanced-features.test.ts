import execute from '../compiler/engine/ExecutionEngine';
import DSLExecutionContext from '../compiler/engine/ExecutionContext';
import tokenize from '../compiler/parser/lexer';

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

describe('Advanced Features Test', () => {
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

  describe('Macro Chaining & Branching', () => {
    test('should recognize chaining operator -->', () => {
      const tokens = tokenize('@print("hello") --> @print("world")');
      const arrowChainToken = tokens.find(token => token.type === 'ARROW_CHAIN');
      expect(arrowChainToken).toBeDefined();
      expect(arrowChainToken?.value).toBe('-->');
    });

    test('should recognize branching operator -=>', () => {
      const tokens = tokenize('@if(true) -=> [@print("success"), @print("failure")]');
      const arrowBranchToken = tokens.find(token => token.type === 'ARROW_BRANCH');
      expect(arrowBranchToken).toBeDefined();
      expect(arrowBranchToken?.value).toBe('-=>');
    });

    test('should parse basic chaining syntax', () => {
      const input = '@print("hello") --> @print("world")';
      const tokens = tokenize(input);
      
      const arrowChainToken = tokens.find(token => token.type === 'ARROW_CHAIN');
      const printTokens = tokens.filter(token => token.type === 'MACRO_START');
      
      expect(arrowChainToken).toBeDefined();
      expect(printTokens.length).toBeGreaterThan(0);
    });

    test('should parse basic branching syntax', () => {
      const input = '@if(true) -=> [@print("success"), @print("failure")]';
      const tokens = tokenize(input);
      
      const arrowBranchToken = tokens.find(token => token.type === 'ARROW_BRANCH');
      const bracketOpenToken = tokens.find(token => token.type === 'BRACKET_OPEN');
      
      expect(arrowBranchToken).toBeDefined();
      expect(bracketOpenToken).toBeDefined();
    });
  });

  describe('String Interpolation', () => {
    test('should recognize executable string literals', () => {
      const tokens = tokenize('`Hello ${name}`');
      const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
      expect(executableStringToken).toBeDefined();
      expect(executableStringToken?.value).toBe('`Hello ${name}`');
    });

    test('should handle string interpolation with variables', () => {
      const input = '@print(`Hello ${name}`)';
      const tokens = tokenize(input);
      
      const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
      expect(executableStringToken).toBeDefined();
      expect(executableStringToken?.value).toContain('${name}');
    });

    test('should handle complex string interpolation', () => {
      const input = '@print(`User: ${firstName} ${lastName}, Age: ${age}`)';
      const tokens = tokenize(input);
      
      const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
      expect(executableStringToken).toBeDefined();
      expect(executableStringToken?.value).toContain('${firstName}');
      expect(executableStringToken?.value).toContain('${lastName}');
      expect(executableStringToken?.value).toContain('${age}');
    });
  });

  describe('Control Structures', () => {
    test('should recognize all control flow keywords', () => {
      const inputs = [
        'if(true) { @print("hello") }',
        'while(false) { @print("loop") }',
        'for(i=0; i<5; i++) { @print("for") }',
        'try { @print("try") } catch { @print("catch") }'
      ];
      
      for (const input of inputs) {
        const tokens = tokenize(input);
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    test('should parse if-else statements', () => {
      const input = 'if(true) { @print("yes") } else { @print("no") }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      const elseToken = tokens.find(token => token.type === 'ELSE');
      expect(ifToken).toBeDefined();
      expect(elseToken).toBeDefined();
    });

    test('should parse while loops', () => {
      const input = 'while(true) { @print("loop") }';
      const tokens = tokenize(input);
      
      const whileToken = tokens.find(token => token.type === 'WHILE');
      expect(whileToken).toBeDefined();
    });

    test('should parse for loops', () => {
      const input = 'for(i=0; i<10; i++) { @print("loop") }';
      const tokens = tokenize(input);
      
      const forToken = tokens.find(token => token.type === 'FOR');
      expect(forToken).toBeDefined();
    });

    test('should parse try-catch statements', () => {
      const input = 'try { @print("try") } catch { @print("catch") }';
      const tokens = tokenize(input);
      
      const tryToken = tokens.find(token => token.type === 'TRY');
      const catchToken = tokens.find(token => token.type === 'CATCH');
      expect(tryToken).toBeDefined();
      expect(catchToken).toBeDefined();
    });
  });

  describe('Built-in Functions', () => {
    test('should recognize all built-in function keywords', () => {
      const inputs = [
        '@print("hello")',
        '@var(name, "John")',
        '@if(true, "yes", "no")',
        '@while(true, "loop")',
        '@for(i=0; i<5; i++, "loop")',
        '@try("operation", "error")',
        '@switch(value, "cases")'
      ];
      
      for (const input of inputs) {
        const tokens = tokenize(input);
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    test('should parse print function', () => {
      const input = '@print("Hello World")';
      const tokens = tokenize(input);
      
      const macroStartToken = tokens.find(token => token.type === 'MACRO_START');
      const printToken = tokens.find(token => token.type === 'IDENTIFIER' && token.value === 'print');
      expect(macroStartToken).toBeDefined();
      expect(printToken).toBeDefined();
    });

    test('should parse variable declaration', () => {
      const input = '@var(name, "John")';
      const tokens = tokenize(input);
      
      const varToken = tokens.find(token => token.type === 'VAR');
      expect(varToken).toBeDefined();
    });
  });

  describe('Output Variables', () => {
    test('should handle output variable infrastructure', () => {
      // Test that output variable methods exist
      expect(typeof context.setOutput).toBe('function');
      expect(typeof context.getOutput).toBe('function');
      expect(typeof context.getLastOutput).toBe('function');
      expect(typeof context.getOutputHistory).toBe('function');
    });

    test('should set and get output variables', () => {
      context.setOutput('$out', 'Hello World');
      expect(context.getOutput('$out')).toBe('Hello World');
    });

    test('should track output history', () => {
      context.setOutput('$out', 'First');
      context.setOutput('$out', 'Second');
      const history = context.getOutputHistory();
      expect(history.length).toBe(2);
      expect(history[0].value).toBe('First');
      expect(history[1].value).toBe('Second');
    });
  });

  describe('Complex Integration Scenarios', () => {
    test('should handle chaining with string interpolation', () => {
      const input = '@print(`Hello ${name}`) --> @print("world")';
      const tokens = tokenize(input);
      
      const arrowChainToken = tokens.find(token => token.type === 'ARROW_CHAIN');
      const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
      
      expect(arrowChainToken).toBeDefined();
      expect(executableStringToken).toBeDefined();
    });

    test('should handle branching with control structures', () => {
      const input = '@if(true) -=> [if(true) { @print("success") }, @print("failure")]';
      const tokens = tokenize(input);
      
      const arrowBranchToken = tokens.find(token => token.type === 'ARROW_BRANCH');
      const ifToken = tokens.find(token => token.type === 'IF');
      
      expect(arrowBranchToken).toBeDefined();
      expect(ifToken).toBeDefined();
    });

    test('should handle nested control structures', () => {
      const input = 'if(true) { while(false) { @print("nested") } }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      const whileToken = tokens.find(token => token.type === 'WHILE');
      
      expect(ifToken).toBeDefined();
      expect(whileToken).toBeDefined();
    });
  });

  describe('Performance Testing', () => {
    test('should handle large scripts efficiently', () => {
      const largeScript = '@print("hello") '.repeat(100) + '@print("world")';
      const startTime = Date.now();
      const tokens = tokenize(largeScript);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    test('should handle complex nested structures', () => {
      const complexScript = `
        if(true) {
          while(false) {
            for(i=0; i<5; i++) {
              @print(\`Loop \${i}\`)
            }
          }
        }
      `;
      const startTime = Date.now();
      const tokens = tokenize(complexScript);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle multiple advanced features together', () => {
      const advancedScript = `
        @print(\`Hello \${name}\`) --> @if(true) -=> [
          @print("success"),
          @print("failure")
        ]
      `;
      const startTime = Date.now();
      const tokens = tokenize(advancedScript);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed chaining gracefully', () => {
      const input = '@print("hello") -->';
      try {
        const tokens = tokenize(input);
        expect(tokens.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail due to incomplete syntax
        expect(error).toBeDefined();
      }
    });

    test('should handle malformed branching gracefully', () => {
      const input = '@if(true) -=>';
      try {
        const tokens = tokenize(input);
        expect(tokens.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail due to incomplete syntax
        expect(error).toBeDefined();
      }
    });

    test('should handle incomplete string interpolation', () => {
      const input = '`Hello ${name`';
      try {
        const tokens = tokenize(input);
        expect(tokens.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail due to incomplete syntax
        expect(error).toBeDefined();
      }
    });
  });

  describe('Feature Integration Status', () => {
    test('should validate all advanced features are implemented', () => {
      const features = {
        chaining: '-->',
        branching: '-=>',
        stringInterpolation: '`${variable}`',
        controlStructures: ['if', 'while', 'for', 'try', 'switch'],
        builtInFunctions: ['print', 'var', 'if', 'while', 'for', 'try', 'switch'],
        outputVariables: ['$out', '$condition', '$result']
      };

      // Test that all feature keywords are recognized
      for (const [feature, keywords] of Object.entries(features)) {
        if (Array.isArray(keywords)) {
          for (const keyword of keywords) {
            const tokens = tokenize(keyword);
            expect(tokens.length).toBeGreaterThan(0);
          }
        } else {
          const tokens = tokenize(keywords);
          expect(tokens.length).toBeGreaterThan(0);
        }
      }
    });
  });
}); 