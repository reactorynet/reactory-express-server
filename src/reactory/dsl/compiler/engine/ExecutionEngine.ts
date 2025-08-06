import { 
  ASTNode, 
  MacroInvocationNode, 
  ProgramNode, 
  StringLiteralNode, 
  VariableNode,
  MacroChainNode,
  MacroBranchNode,
  MacroGroupNode,
  ConditionalExpressionNode,
  LoopNode,
  SwitchCaseNode,
  TryCatchStatementNode,
  BlockNode,
  NumberLiteralNode,
  BooleanLiteralNode
} from "@reactory/server-core/types/compiler/ast";
import { createCST, createAST, tokenize } from '../parser';
import DSLExecutionContext from "./ExecutionContext";
import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";

/**
 * Executes a program AST node.
 * @param programNode 
 * @param context 
 * @returns 
 */
export const executeProgram = async (programNode: ProgramNode, context: DSLExecutionContext) => {
  const results = [];
  for (const node of programNode.body) {
    try {
      const result = await executeNode(node, context);
      results.push(result);
    } catch (e) {
      context.context.error(e.message);
      return;
    }    
  }
  return results;
}

const executeMacro = async (macroNode: MacroInvocationNode, context: DSLExecutionContext) => { 
  const args = await Promise.all(macroNode.arguments.map(arg => executeNode(arg, context)));
  return context.executeFunction(macroNode.name, args);
}

const executeMacroChain = async (chainNode: MacroChainNode, context: DSLExecutionContext) => {
  // Execute the source macro first
  const sourceResult = await executeNode(chainNode.source, context);
  
  // Pass the result to the destination macro
  const destinationArgs = chainNode.destination.arguments;
  if (destinationArgs.length > 0) {
    // Replace the first argument with the source result
    destinationArgs[0] = { type: 'StringLiteral', value: sourceResult };
  }
  
  return await executeNode(chainNode.destination, context);
}

const executeMacroBranch = async (branchNode: MacroBranchNode, context: DSLExecutionContext) => {
  // Evaluate the condition
  const conditionResult = await executeNode(branchNode.condition, context);
  
  // Execute the appropriate branch based on the condition
  if (conditionResult) {
    return await executeNode(branchNode.successBranch, context);
  } else {
    return await executeNode(branchNode.failureBranch, context);
  }
}

const executeMacroGroup = async (groupNode: MacroGroupNode, context: DSLExecutionContext) => {
  const results = [];
  
  // Execute all nodes in the group
  for (const node of groupNode.body) {
    const result = await executeNode(node, context);
    results.push(result);
  }
  
  return results;
}

const executeConditional = async (conditionalNode: ConditionalExpressionNode, context: DSLExecutionContext) => {
  const testResult = await executeNode(conditionalNode.test, context);
  
  if (testResult) {
    return await executeNode(conditionalNode.consequent, context);
  } else if (conditionalNode.alternate) {
    return await executeNode(conditionalNode.alternate, context);
  }
  
  return null;
}

const executeLoop = async (loopNode: LoopNode, context: DSLExecutionContext) => {
  const results = [];
  
  while (true) {
    const testResult = await executeNode(loopNode.test, context);
    
    if (!testResult) {
      break;
    }
    
    // Execute the loop body
    for (const node of loopNode.body) {
      const result = await executeNode(node, context);
      results.push(result);
    }
  }
  
  return results;
}

const executeSwitchCase = async (switchNode: SwitchCaseNode, context: DSLExecutionContext) => {
  const discriminant = await executeNode(switchNode.discriminant, context);
  
  for (const caseNode of switchNode.cases) {
    const caseTest = await executeNode(caseNode.test, context);
    
    if (caseTest === discriminant) {
      // Execute the case body
      for (const node of caseNode.consequent) {
        await executeNode(node, context);
      }
      break;
    }
  }
}

const executeTryCatch = async (tryCatchNode: TryCatchStatementNode, context: DSLExecutionContext) => {
  try {
    // Execute the try block
    return await executeNode(tryCatchNode.tryBlock, context);
  } catch (error) {
    if (tryCatchNode.catchBlock) {
      // Execute the catch block
      return await executeNode(tryCatchNode.catchBlock, context);
    }
    throw error;
  } finally {
    if (tryCatchNode.finallyBlock) {
      // Execute the finally block
      await executeNode(tryCatchNode.finallyBlock, context);
    }
  }
}

const executeBlock = async (blockNode: BlockNode, context: DSLExecutionContext) => {
  const results = [];
  
  for (const node of blockNode.body) {
    const result = await executeNode(node, context);
    results.push(result);
  }
  
  return results;
}

const executeVariable = async (variableNode: VariableNode, context: DSLExecutionContext) => {

  if (variableNode.operation === 'declare') {
    const value = await executeNode(variableNode.right, context);
    context.set(variableNode.name, value);
    return value;
  }

  if(variableNode.operation === 'write') {
    const value = await executeNode(variableNode.right, context);
    context.set(variableNode.name, value);
    return value;
  }

  if(variableNode.operation === 'read') {
    return context.get(variableNode.name);
  }
}


const execute = async (input: string, context: DSLExecutionContext) => { 
  const tokens = tokenize(input, { ignoreWhitespace: false });
  let cst: CSTProgramNode = null;
  let ast: ProgramNode = null;
  try {
    cst = createCST(tokens) as CSTProgramNode;
  } catch (cstError) {
    context.context.error(cstError.message);
    throw cstError;
  }

  try {
    ast = createAST(cst);
  } catch (astConversionError) {
    context.context.error(astConversionError.message);
    throw astConversionError;
  }
  
  try {
    return await executeProgram(ast, context);
  } catch (e) {
    context.context.error(e.message);
    throw e;
  }
}

const executeNode = (node: ASTNode, context: DSLExecutionContext) => {
  switch (node.type) {
    case 'MacroInvocation':
      return executeMacro(node as MacroInvocationNode, context);
    case 'MacroChain':
      return executeMacroChain(node as MacroChainNode, context);
    case 'MacroBranch':
      return executeMacroBranch(node as MacroBranchNode, context);
    case 'MacroGroup':
      return executeMacroGroup(node as MacroGroupNode, context);
    case 'ConditionalExpression':
      return executeConditional(node as ConditionalExpressionNode, context);
    case 'Loop':
      return executeLoop(node as LoopNode, context);
    case 'SwitchCase':
      return executeSwitchCase(node as SwitchCaseNode, context);
    case 'TryCatchStatement':
      return executeTryCatch(node as TryCatchStatementNode, context);
    case 'Block':
      return executeBlock(node as BlockNode, context);
    case 'Variable': 
      return executeVariable(node as VariableNode, context);
    case 'StringLiteral':
      return (node as StringLiteralNode).value;
    case 'NumberLiteral':
      return (node as NumberLiteralNode).value;
    case 'BooleanLiteral':
      return (node as BooleanLiteralNode).value;
    default:
      throw new Error(`Unknown node type ${node.type}`);
  }
}

export default execute;

