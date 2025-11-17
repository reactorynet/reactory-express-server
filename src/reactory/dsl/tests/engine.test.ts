import { NameProgramASTProgramNode } from '../tests/mocks/ast';

// Create a simple mock execution context for testing
class MockDSLExecutionContext {
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
    return fn(args);
  }
}

// Simple mock AST execution function
const executeAST = async (programNode: any, context: MockDSLExecutionContext) => {
  for (const node of programNode.body) {
    try {
      await executeNode(node, context);
    } catch (e) {
      context.context.error(e.message);
      return;
    }    
  }
}

const executeNode = async (node: any, context: MockDSLExecutionContext) => {
  switch (node.type) {
    case 'MacroInvocation':
      return executeMacro(node, context);
    case 'Variable': 
      return executeVariable(node, context);
    case 'StringLiteral':
      // Remove quotes from string literals
      return node.value.replace(/^"|"$/g, '');
    default:
      throw new Error(`Unknown node type ${node.type}`);
  }
}

const executeMacro = async (macroNode: any, context: MockDSLExecutionContext) => { 
  const args = await Promise.all(macroNode.arguments.map((arg: any) => executeNode(arg, context)));
  context.executeFunction(macroNode.name, args);
}

const executeVariable = async (variableNode: any, context: MockDSLExecutionContext) => {
  if (variableNode.operation === 'declare') {
    const value = await executeNode(variableNode.right, context);
    context.set(variableNode.name, value);
  }

  if(variableNode.operation === 'write') {
    const value = await executeNode(variableNode.right, context);
    context.set(variableNode.name, value);
  }

  if(variableNode.operation === 'read') {
    return context.get(variableNode.name);
  }
}

describe('Macro Execution Engine', () => { 

  it('should execute an AST with a variable declaration', async () => { 
    const mockContext = {
      error: (msg: string) => console.error(msg)
    };
    const context = new MockDSLExecutionContext(mockContext, 'mock');
    await executeAST(NameProgramASTProgramNode._01_VariableDeclaration, context);
    expect(context.get('name')).toEqual('John');
  });
});