

export type ValidHost = 'cli' | 'server' | 'mock';
/**
 * Execution context for the DSL
 */
class ExecutionContext  {
  context: Reactory.Server.IReactoryContext;
  host: ValidHost;
  state: Map<string, any> = new Map();
  functions: Map<string, Function> = new Map();


  constructor(context: Reactory.Server.IReactoryContext, host: ValidHost) {
    this.context = context;
    this.host = host;
    this.setupFunctions();
  }

  setupFunctions() {
    this.functions.set('print', (args: any[]) => {
      console.log(...args);
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
    args.push(context);
    return fn(args);
  }
}

export const createContext = (context: Reactory.Server.IReactoryContext, host: 'cli' | 'server' | 'mock') => {
  return new ExecutionContext(context, host);
}

export default ExecutionContext;