import ReactoryContextProvider from "@reactory/server-core/context/ReactoryContextProvider";

// Mock the logging system for testing
const mockLogging = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.log
};

export type ValidHost = 'cli' | 'server' | 'mock';

/**
 * Variable scope for DSL execution
 */
class VariableScope {
  private variables: Map<string, any> = new Map();
  private parent: VariableScope | null = null;

  constructor(parent?: VariableScope) {
    this.parent = parent || null;
  }

  set(key: string, value: any): void {
    this.variables.set(key, value);
  }

  get(key: string): any {
    if (this.variables.has(key)) {
      return this.variables.get(key);
    }
    if (this.parent) {
      return this.parent.get(key);
    }
    return undefined;
  }

  has(key: string): boolean {
    if (this.variables.has(key)) {
      return true;
    }
    if (this.parent) {
      return this.parent.has(key);
    }
    return false;
  }

  delete(key: string): boolean {
    return this.variables.delete(key);
  }

  clear(): void {
    this.variables.clear();
  }

  getLocalVariables(): Map<string, any> {
    return new Map(this.variables);
  }
}

/**
 * Function registry for DSL execution
 */
class FunctionRegistry {
  private functions: Map<string, Function> = new Map();
  private asyncFunctions: Map<string, Function> = new Map();

  register(name: string, fn: Function, isAsync: boolean = false): void {
    if (isAsync) {
      this.asyncFunctions.set(name, fn);
    } else {
      this.functions.set(name, fn);
    }
  }

  get(name: string): Function | undefined {
    return this.functions.get(name) || this.asyncFunctions.get(name);
  }

  isAsync(name: string): boolean {
    return this.asyncFunctions.has(name);
  }

  has(name: string): boolean {
    return this.functions.has(name) || this.asyncFunctions.has(name);
  }

  unregister(name: string): boolean {
    const syncRemoved = this.functions.delete(name);
    const asyncRemoved = this.asyncFunctions.delete(name);
    return syncRemoved || asyncRemoved;
  }

  clear(): void {
    this.functions.clear();
    this.asyncFunctions.clear();
  }

  listFunctions(): string[] {
    return [...this.functions.keys(), ...this.asyncFunctions.keys()];
  }
}

/**
 * Error recovery mechanism for DSL execution
 */
class ErrorRecovery {
  private errorHandlers: Map<string, Function> = new Map();
  private recoveryStrategies: Map<string, Function> = new Map();

  registerErrorHandler(errorType: string, handler: Function): void {
    this.errorHandlers.set(errorType, handler);
  }

  registerRecoveryStrategy(strategyName: string, strategy: Function): void {
    this.recoveryStrategies.set(strategyName, strategy);
  }

  handleError(error: Error, context: any): any {
    // Try constructor name first
    let errorType = error.constructor.name;
    let handler = this.errorHandlers.get(errorType);
    
    // If not found, try the error name property
    if (!handler && error.name) {
      errorType = error.name;
      handler = this.errorHandlers.get(errorType);
    }
    

    
    if (handler) {
      return handler(error, context);
    }
    
    // Default error handling
    console.error(`DSL Error: ${error.message}`);
    throw error;
  }

  attemptRecovery(strategyName: string, context: any, ...args: any[]): any {
    const strategy = this.recoveryStrategies.get(strategyName);
    if (strategy) {
      return strategy(context, ...args);
    }
    throw new Error(`Recovery strategy '${strategyName}' not found`);
  }
}

/**
 * Execution context for the DSL
 */
class DSLExecutionContext  {
  context: Reactory.Server.IReactoryContext;
  host: ValidHost;
  private currentScope: VariableScope;
  private functionRegistry: FunctionRegistry;
  private errorRecovery: ErrorRecovery;
  private executionStack: VariableScope[] = [];
  private asyncOperations: Promise<any>[] = [];


  constructor(context: Reactory.Server.IReactoryContext, host: ValidHost, state?: Map<string, any>) {
    this.context = context;
    this.host = host;
    this.currentScope = new VariableScope();
    this.functionRegistry = new FunctionRegistry();
    this.errorRecovery = new ErrorRecovery();
    
    // Initialize with provided state if available
    if (state) {
      for (const [key, value] of state) {
        this.currentScope.set(key, value);
      }
    }
    
    this.setupFunctions();
    this.setupErrorHandlers();
  }

  /**
   * Setup default functions
   */
  setupFunctions() {
    // Synchronous functions
    this.functionRegistry.register('print', (args: any[]) => {
      const argsWithoutContext = args.slice(0, args.length - 1);
      console.log(...argsWithoutContext);
      return argsWithoutContext.join(' ');
    });

    this.functionRegistry.register('var', (args: any[]) => {
      const [name, value] = args;
      this.currentScope.set(name, value);
      return value;
    });

    this.functionRegistry.register('get', (args: any[]) => {
      const [name] = args;
      return this.currentScope.get(name);
    });

    // Async functions
    this.functionRegistry.register('asyncPrint', async (args: any[]) => {
      const argsWithoutContext = args.slice(0, args.length - 1);
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async
      console.log(...argsWithoutContext);
      return argsWithoutContext.join(' ');
    }, true);

    this.functionRegistry.register('fetch', async (args: any[]) => {
      const [url] = args;
      // Simulate async fetch
      await new Promise(resolve => setTimeout(resolve, 200));
      return `Mock response from ${url}`;
    }, true);
  }

  /**
   * Setup error handlers
   */
  setupErrorHandlers() {
    this.errorRecovery.registerErrorHandler('ReferenceError', (error: Error) => {
      console.warn(`Variable not found: ${error.message}`);
      return undefined;
    });

    this.errorRecovery.registerErrorHandler('TypeError', (error: Error) => {
      console.warn(`Type error: ${error.message}`);
      return null;
    });

    this.errorRecovery.registerErrorHandler('Error', (error: Error) => {
      console.warn(`General error: ${error.message}`);
      return undefined;
    });

    this.errorRecovery.registerRecoveryStrategy('retry', async (context: any, fn: Function, maxRetries: number = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
      }
    });
  }

  /**
   * Variable scoping methods
   */
  get(key: string): any {
    return this.currentScope.get(key);
  }

  set(key: string, value: any): void {
    this.currentScope.set(key, value);
  }

  has(key: string): boolean {
    return this.currentScope.has(key);
  }

  delete(key: string): boolean {
    return this.currentScope.delete(key);
  }

  /**
   * Scope management
   */
  pushScope(): void {
    this.executionStack.push(this.currentScope);
    this.currentScope = new VariableScope(this.currentScope);
  }

  popScope(): void {
    if (this.executionStack.length > 0) {
      this.currentScope = this.executionStack.pop()!;
    }
  }

  /**
   * Function registry methods
   */
  registerFunction(name: string, fn: Function, isAsync: boolean = false): void {
    this.functionRegistry.register(name, fn, isAsync);
  }

  unregisterFunction(name: string): boolean {
    return this.functionRegistry.unregister(name);
  }

  hasFunction(name: string): boolean {
    return this.functionRegistry.has(name);
  }

  listFunctions(): string[] {
    return this.functionRegistry.listFunctions();
  }

  /**
   * Enhanced function execution with async support
   */
  async executeFunction(name: string, args: any[]): Promise<any> {
    const fn = this.functionRegistry.get(name);
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    try {
      args.push(this.context);
      
      if (this.functionRegistry.isAsync(name)) {
        const promise = fn(args);
        this.asyncOperations.push(promise);
        return await promise;
      } else {
        const result = fn(args);
        return result;
      }
    } catch (error) {
      return this.errorRecovery.handleError(error as Error, this.context);
    }
  }

  /**
   * Async operations management
   */
  async waitForAllAsync(): Promise<any[]> {
    const results = await Promise.all(this.asyncOperations);
    this.asyncOperations = [];
    return results;
  }

  getPendingAsyncCount(): number {
    return this.asyncOperations.length;
  }

  /**
   * Error recovery methods
   */
  registerErrorHandler(errorType: string, handler: Function): void {
    this.errorRecovery.registerErrorHandler(errorType, handler);
  }

  registerRecoveryStrategy(strategyName: string, strategy: Function): void {
    this.errorRecovery.registerRecoveryStrategy(strategyName, strategy);
  }

  attemptRecovery(strategyName: string, ...args: any[]): any {
    return this.errorRecovery.attemptRecovery(strategyName, this.context, ...args);
  }

  /**
   * Context isolation
   */
  createIsolatedContext(): DSLExecutionContext {
    const isolatedContext = new DSLExecutionContext(this.context, this.host);
    isolatedContext.currentScope = new VariableScope(); // Fresh scope
    return isolatedContext;
  }

  /**
   * Context serialization for debugging
   */
  serialize(): any {
    return {
      host: this.host,
      variables: this.currentScope.getLocalVariables(),
      functions: this.listFunctions(),
      pendingAsync: this.getPendingAsyncCount(),
      executionStackDepth: this.executionStack.length
    };
  }
}

export const createContext = async (context: Partial<Reactory.Server.IReactoryContext> = {}, host: 'cli' | 'server' | 'mock'): Promise<DSLExecutionContext> => {
  let reactoryContext: Reactory.Server.IReactoryContext;
  
  if (host === 'mock') {
    // Use the provided context directly for mock testing
    reactoryContext = context as Reactory.Server.IReactoryContext;
  } else {
    try {
      // Use the ReactoryContextProvider for real contexts
      reactoryContext = await ReactoryContextProvider(null, { ...context, host });
    } catch (error) {
      // Fallback to mock context if ReactoryContextProvider fails
      console.warn('ReactoryContextProvider failed, using mock context:', error.message);
      reactoryContext = context as Reactory.Server.IReactoryContext;
    }
  }
  
  return new DSLExecutionContext(reactoryContext, host);
}

export default DSLExecutionContext;