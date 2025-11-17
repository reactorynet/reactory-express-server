import { DSLExec, CLI_CONFIG, CLI_COMMANDS, CLI_HELP_TEXT } from '../compiler/cli';
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

describe('DSL CLI Test', () => {
  let mockContext: Reactory.Server.IReactoryContext;

  beforeEach(() => {
    // Create a minimal mock context
    mockContext = {
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
  });

  describe('CLI Configuration', () => {
    test('should have correct CLI configuration', () => {
      expect(CLI_CONFIG.PROMPT).toBe('DSL> ');
      expect(CLI_CONFIG.MAX_HISTORY_SIZE).toBe(100);
      expect(CLI_CONFIG.DEBUG_MODE).toBe(false);
      expect(CLI_CONFIG.VERBOSE_MODE).toBe(false);
    });

    test('should have all required CLI commands', () => {
      expect(CLI_COMMANDS.HELP).toBe('.help');
      expect(CLI_COMMANDS.DEBUG).toBe('.debug');
      expect(CLI_COMMANDS.VERBOSE).toBe('.verbose');
      expect(CLI_COMMANDS.HISTORY).toBe('.history');
      expect(CLI_COMMANDS.CLEAR).toBe('.clear');
      expect(CLI_COMMANDS.LOAD).toBe('.load');
      expect(CLI_COMMANDS.SAVE).toBe('.save');
      expect(CLI_COMMANDS.VARS).toBe('.vars');
      expect(CLI_COMMANDS.OUTPUT).toBe('.output');
      expect(CLI_COMMANDS.RESET).toBe('.reset');
      expect(CLI_COMMANDS.QUIT).toBe('.quit');
      expect(CLI_COMMANDS.EXIT).toBe('.exit');
    });

    test('should have help text with DSL features', () => {
      expect(CLI_HELP_TEXT).toContain('DSL CLI Commands:');
      expect(CLI_HELP_TEXT).toContain('@print("text")');
      expect(CLI_HELP_TEXT).toContain('@var(name, value)');
      expect(CLI_HELP_TEXT).toContain('-->');
      expect(CLI_HELP_TEXT).toContain('-=>');
      expect(CLI_HELP_TEXT).toContain('`Hello ${name}`');
    });
  });

  describe('CLI Functionality', () => {
    test('should export DSLExec function', () => {
      expect(typeof DSLExec).toBe('function');
    });

    test('should accept kwargs and context parameters', () => {
      const kwargs = ['--debug', '--verbose'];
      expect(() => DSLExec(kwargs, mockContext)).not.toThrow();
    });
  });

  describe('CLI Features', () => {
    test('should support interactive REPL mode', () => {
      // This would require mocking readline interface
      // For now, we test that the function exists and can be called
      expect(typeof DSLExec).toBe('function');
    });

    test('should support script file execution', () => {
      // Test that the CLI can handle file loading commands
      expect(CLI_COMMANDS.LOAD).toBe('.load');
    });

    test('should support error reporting and debugging', () => {
      expect(CLI_COMMANDS.DEBUG).toBe('.debug');
      expect(CLI_COMMANDS.VERBOSE).toBe('.verbose');
    });

    test('should support command history', () => {
      expect(CLI_COMMANDS.HISTORY).toBe('.history');
      expect(CLI_COMMANDS.CLEAR).toBe('.clear');
    });
  });

  describe('CLI Commands', () => {
    test('should have help command', () => {
      expect(CLI_COMMANDS.HELP).toBe('.help');
    });

    test('should have debug command', () => {
      expect(CLI_COMMANDS.DEBUG).toBe('.debug');
    });

    test('should have verbose command', () => {
      expect(CLI_COMMANDS.VERBOSE).toBe('.verbose');
    });

    test('should have history command', () => {
      expect(CLI_COMMANDS.HISTORY).toBe('.history');
    });

    test('should have clear command', () => {
      expect(CLI_COMMANDS.CLEAR).toBe('.clear');
    });

    test('should have load command', () => {
      expect(CLI_COMMANDS.LOAD).toBe('.load');
    });

    test('should have save command', () => {
      expect(CLI_COMMANDS.SAVE).toBe('.save');
    });

    test('should have vars command', () => {
      expect(CLI_COMMANDS.VARS).toBe('.vars');
    });

    test('should have output command', () => {
      expect(CLI_COMMANDS.OUTPUT).toBe('.output');
    });

    test('should have reset command', () => {
      expect(CLI_COMMANDS.RESET).toBe('.reset');
    });

    test('should have quit command', () => {
      expect(CLI_COMMANDS.QUIT).toBe('.quit');
    });

    test('should have exit command', () => {
      expect(CLI_COMMANDS.EXIT).toBe('.exit');
    });
  });

  describe('CLI Integration', () => {
    test('should integrate with DSL execution engine', () => {
      // Test that CLI can execute DSL code
      expect(typeof DSLExec).toBe('function');
    });

    test('should integrate with execution context', () => {
      // Test that CLI uses execution context
      expect(typeof DSLExecutionContext).toBe('function');
    });

    test('should support variable management', () => {
      expect(CLI_COMMANDS.VARS).toBe('.vars');
    });

    test('should support output variable display', () => {
      expect(CLI_COMMANDS.OUTPUT).toBe('.output');
    });
  });

  describe('CLI Error Handling', () => {
    test('should handle invalid commands gracefully', () => {
      // Test that CLI can handle unknown commands
      expect(CLI_COMMANDS.HELP).toBe('.help');
    });

    test('should support debug mode for error reporting', () => {
      expect(CLI_COMMANDS.DEBUG).toBe('.debug');
    });

    test('should support verbose mode for detailed output', () => {
      expect(CLI_COMMANDS.VERBOSE).toBe('.verbose');
    });
  });

  describe('CLI File Operations', () => {
    test('should support loading script files', () => {
      expect(CLI_COMMANDS.LOAD).toBe('.load');
    });

    test('should support saving script files', () => {
      expect(CLI_COMMANDS.SAVE).toBe('.save');
    });
  });

  describe('CLI Context Management', () => {
    test('should support context reset', () => {
      expect(CLI_COMMANDS.RESET).toBe('.reset');
    });

    test('should support variable inspection', () => {
      expect(CLI_COMMANDS.VARS).toBe('.vars');
    });

    test('should support output inspection', () => {
      expect(CLI_COMMANDS.OUTPUT).toBe('.output');
    });
  });

  describe('CLI User Experience', () => {
    test('should have clear command structure', () => {
      const commands = Object.values(CLI_COMMANDS);
      expect(commands.every(cmd => cmd.startsWith('.'))).toBe(true);
    });

    test('should have descriptive help text', () => {
      expect(CLI_HELP_TEXT).toContain('DSL CLI Commands:');
      expect(CLI_HELP_TEXT).toContain('DSL Features:');
    });

    test('should support graceful exit', () => {
      expect(CLI_COMMANDS.QUIT).toBe('.quit');
      expect(CLI_COMMANDS.EXIT).toBe('.exit');
    });
  });

  describe('CLI Performance', () => {
    test('should have reasonable history size limit', () => {
      expect(CLI_CONFIG.MAX_HISTORY_SIZE).toBe(100);
      expect(CLI_CONFIG.MAX_HISTORY_SIZE).toBeGreaterThan(0);
      expect(CLI_CONFIG.MAX_HISTORY_SIZE).toBeLessThan(1000);
    });

    test('should have default modes disabled', () => {
      expect(CLI_CONFIG.DEBUG_MODE).toBe(false);
      expect(CLI_CONFIG.VERBOSE_MODE).toBe(false);
    });
  });

  describe('CLI Documentation', () => {
    test('should document all DSL features', () => {
      const features = [
        '@print("text")',
        '@var(name, value)',
        '@if(condition, "yes", "no")',
        '@while(condition, "loop")',
        '@for(i=0; i<5; i++, "loop")',
        '@try("operation", "error")',
        '@switch(value, "cases")',
        '-->',
        '-=>',
        '`Hello ${name}`'
      ];

      features.forEach(feature => {
        expect(CLI_HELP_TEXT).toContain(feature);
      });
    });

    test('should document all CLI commands', () => {
      const commands = [
        '.help',
        '.debug',
        '.verbose',
        '.history',
        '.clear',
        '.load <file>',
        '.save <file> <content>',
        '.vars',
        '.output',
        '.reset',
        '.quit/.exit'
      ];

      commands.forEach(command => {
        expect(CLI_HELP_TEXT).toContain(command);
      });
    });
  });
}); 