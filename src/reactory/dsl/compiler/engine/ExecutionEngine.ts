import { ASTNode, MacroInvocationNode, ProgramNode, StringLiteralNode } from "@reactory/server-core/types/compiler/ast";
import { createCST, createAST, tokenize } from '../parser';
import ExecutionContext from "./ExecutionContext";

const executeProgram = async (programNode: ProgramNode, context: ExecutionContext) => {
  for (const node of programNode.body) {
    await executeNode(node, context);
  }
}

const executeMacro = async (macroNode: MacroInvocationNode, context: ExecutionContext) => { 
  const args = await Promise.all(macroNode.arguments.map(arg => executeNode(arg, context)));
  context.executeFunction(macroNode.name, args);
}

const execute = async (input: string, context: ExecutionContext) => { 
  const tokens = tokenize(input, { ignoreWhitespace: false });
  const cst = createCST(tokens);
  const ast = createAST(cst);
  await executeProgram(ast, context);
}

const executeNode = (node: ASTNode, context: ExecutionContext) => {
  switch (node.type) {
    case 'MacroInvocation':
      return executeMacro(node as MacroInvocationNode, context);
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
