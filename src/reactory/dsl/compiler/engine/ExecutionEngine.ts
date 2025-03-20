import { ASTNode, MacroInvocationNode, ProgramNode, StringLiteralNode, VariableNode } from "@reactory/server-core/types/compiler/ast";
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
  for (const node of programNode.body) {
    try {
      await executeNode(node, context);
    } catch (e) {
      context.context.error(e.message);
      return;
    }    
  }
}

const executeMacro = async (macroNode: MacroInvocationNode, context: DSLExecutionContext) => { 
  const args = await Promise.all(macroNode.arguments.map(arg => executeNode(arg, context)));
  context.executeFunction(macroNode.name, args);
}

const executeVariable = async (variableNode: VariableNode, context: DSLExecutionContext) => {

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
    await executeProgram(ast, context);
  } catch (e) {
    context.context.error(e.message);
    throw e;
  }
  
}

const executeNode = (node: ASTNode, context: DSLExecutionContext) => {
  switch (node.type) {
    case 'MacroInvocation':
      return executeMacro(node as MacroInvocationNode, context);
    case 'Variable': 
      return executeVariable(node as VariableNode, context);
    // case 'MacroChain':
    //   return executeMacroChain(node, context);
    // case 'MacroBranch':
    //   return executeMacroBranch(node, context);
    // case 'ControlFlow':
    //   return executeControlFlow(node, context);
    case 'StringLiteral':
      return (node as StringLiteralNode).value;
    default:
      throw new Error(`Unknown node type ${node.type}`);
  }
}

export default execute;

