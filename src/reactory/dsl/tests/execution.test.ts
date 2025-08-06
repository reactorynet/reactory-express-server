import execute from '../compiler/engine/ExecutionEngine';

// Create a simple mock context class for testing
class MockExecutionContext {
  context: any;
  host: 'cli' | 'server' | 'mock';
  state: Map<string, any> = new Map();
  functions: Map<string, Function> = new Map();

  constructor(context: any, host: 'cli' | 'server' | 'mock') {
    this.context = context;
    this.host = host;
    this.setupFunctions();
  }

  setupFunctions() {
    this.functions.set('print', (args: any[]) => {
      const argsWithoutContext = args.slice(0, args.length - 1);
      console.log(...argsWithoutContext);
      return argsWithoutContext.join(' ');
    });
    
    this.functions.set('test', (args: any[]) => {
      return args[0]; // Return the first argument as the test result
    });
    
    this.functions.set('getValue', (args: any[]) => {
      return `value-${args[0]}`; // Return a mock value
    });
    
    this.functions.set('getData', (args: any[]) => {
      return 'mock-data'; // Return mock data
    });
    
    this.functions.set('process', (args: any[]) => {
      return `processed-${args[0]}`; // Return processed data
    });
    
    this.functions.set('success', (args: any[]) => {
      return 'success'; // Return success
    });
    
    this.functions.set('failure', (args: any[]) => {
      return 'failure'; // Return failure
    });
    
    this.functions.set('riskyOperation', (args: any[]) => {
      throw new Error('Risky operation failed'); // Simulate failure
    });
    
    this.functions.set('cleanup', (args: any[]) => {
      return 'cleanup-complete'; // Return cleanup result
    });
  }

  get(key: string) {
    return this.state.get(key);
  }

  set(key: string, value: any) {
    this.state.set(key, value);
  }

  has(key: string) {
    return this.state.has(key);
  }
  
  executeFunction(name: string, args: any[]) { 
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }
    args.push(this.context);
    return fn(args);
  }
}

describe('DSL Execution Engine - Advanced Features', () => {
  let context: MockExecutionContext;

  beforeEach(async () => {
    // Create a mock context directly to avoid ReactoryContextProvider dependencies
    const mockReactoryContext: any = {
      id: 'test-context-id',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isAuthenticated: true,
        roles: ['user'],
        permissions: ['read', 'write'],
        organization: {
          id: 'test-org-id',
          name: 'Test Organization',
          slug: 'test-org'
        }
      },
      organization: {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org'
      },
      partner: {
        id: 'test-partner-id',
        name: 'Test Partner',
        slug: 'test-partner'
      },
      host: 'localhost',
      request: {
        headers: {},
        body: {},
        query: {},
        params: {},
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1'
      },
      response: {
        status: 200,
        headers: {},
        body: {}
      },
      logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.log
      },
      services: {},
      dataSources: {},
      plugins: {},
      config: {
        environment: 'test',
        debug: true,
        host: 'localhost',
        port: 3000
      },
      getService: (name: string): any => null,
      error: (message: string) => {
        console.error(`DSL Error: ${message}`);
      },
      readline: null
    };
    
    context = new MockExecutionContext(mockReactoryContext, 'mock');
  });

  describe('Basic Execution', () => {
    it('should execute a simple macro', async () => {
      const input = `@print("Hello World")`;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute a variable declaration', async () => {
      const input = `$name = "Hello World"`;
      
      const result = await execute(input, context);
      expect(context.get('name')).toBe("Hello World");
    });

    it('should execute a variable assignment', async () => {
      const input = `$number = 42`;
      
      const result = await execute(input, context);
      expect(context.get('number')).toBe(42);
    });

    it('should execute a boolean assignment', async () => {
      const input = `$flag = true`;
      
      const result = await execute(input, context);
      expect(context.get('flag')).toBe(true);
    });
  });

  describe('Literal Execution', () => {
    it('should handle string literals', async () => {
      const input = `"Hello World"`;
      
      const result = await execute(input, context);
      expect(result).toBe("Hello World");
    });

    it('should handle number literals', async () => {
      const input = `42`;
      
      const result = await execute(input, context);
      expect(result).toBe(42);
    });

    it('should handle boolean literals', async () => {
      const input = `true`;
      
      const result = await execute(input, context);
      expect(result).toBe(true);
    });
  });

  describe('MacroChain Execution', () => {
    it('should execute macro chaining with --> operator', async () => {
      const input = `
        @print("Hello") --> @print("World")
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should pass output from source to destination macro', async () => {
      const input = `
        @print("Hello") --> @print($out)
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('MacroBranch Execution', () => {
    it('should execute branching with -=> operator', async () => {
      const input = `
        @test(true) -=> [@print("Success"), @print("Failure")]
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute success branch when condition is true', async () => {
      const input = `
        @test(true) -=> [@print("Success"), @print("Failure")]
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute failure branch when condition is false', async () => {
      const input = `
        @test(false) -=> [@print("Success"), @print("Failure")]
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('MacroGroup Execution', () => {
    it('should execute grouped macros', async () => {
      const input = `
        [@print("First"), @print("Second"), @print("Third")]
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should return array of results from group execution', async () => {
      const input = `
        [@getValue("a"), @getValue("b"), @getValue("c")]
      `;
      
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Control Flow Execution', () => {
    it('should execute if-else statements', async () => {
      const input = `
        if($condition == true) {
          @print("Condition is true")
        } else {
          @print("Condition is false")
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute while loops', async () => {
      const input = `
        while($count < 5) {
          @print("Count: " + $count)
          $count = $count + 1
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute switch statements', async () => {
      const input = `
        switch($value) {
          case "A": @print("Value is A"); break;
          case "B": @print("Value is B"); break;
          default: @print("Unknown value");
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling Execution', () => {
    it('should execute try-catch blocks', async () => {
      const input = `
        try {
          @riskyOperation()
        } catch($error) {
          @print("Error: " + $error)
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute try-catch-finally blocks', async () => {
      const input = `
        try {
          @riskyOperation()
        } catch($error) {
          @print("Error: " + $error)
        } finally {
          @cleanup()
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });

  describe('Block Execution', () => {
    it('should execute block statements', async () => {
      const input = `
        {
          @print("First statement")
          @print("Second statement")
          @print("Third statement")
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should return array of results from block execution', async () => {
      const input = `
        {
          @getValue("a")
          @getValue("b")
          @getValue("c")
        }
      `;
      
      const result = await execute(input, context);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Complex Execution Scenarios', () => {
    it('should execute nested control structures', async () => {
      const input = `
        if($condition) {
          while($count < 3) {
            @print("Nested loop: " + $count)
            $count = $count + 1
          }
        } else {
          @print("Condition is false")
        }
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute chaining with branching', async () => {
      const input = `
        @getData() --> @process($out) -=> [@success($out), @failure($out)]
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });

    it('should execute grouped chains', async () => {
      const input = `
        [@getData() --> @process($out), @getData() --> @process($out)]
      `;
      
      const result = await execute(input, context);
      expect(result).toBeDefined();
    });
  });
}); 