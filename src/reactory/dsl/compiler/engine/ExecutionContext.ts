import ReactoryContextProvider from "@reactory/server-core/context/ReactoryContextProvider";


export type ValidHost = 'cli' | 'server' | 'mock';
/**
 * Execution context for the DSL
 */
class DSLExecutionContext  {
  context: Reactory.Server.IReactoryContext;
  host: ValidHost;
  state: Map<string, any> = new Map();
  functions: Map<string, Function> = new Map();


  constructor(context: Reactory.Server.IReactoryContext, host: ValidHost, state?: Map<string, any>) {
    this.context = context;
    this.host = host;
    this.setupFunctions();
    if (state) {
      this.state = state;
    }
  }

  setupFunctions() {
    this.functions.set('print', (args: any[]) => {
      const argsWithoutContext = args.slice(0, args.length - 1);
      console.log(...argsWithoutContext);
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

export const createContext = async (context: Partial<Reactory.Server.IReactoryContext> = {}, host: 'cli' | 'server' | 'mock'): Promise<DSLExecutionContext> => {
  const reactoryContext = await ReactoryContextProvider(null, { ...context, host });
  return new DSLExecutionContext(reactoryContext, host);
}

export default DSLExecutionContext;