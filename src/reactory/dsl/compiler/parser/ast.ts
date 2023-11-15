import { CSTNode } from "../../../../types/compiler/cst";
import { ASTNode, ExpressionNode, MacroInvocationNode, ProgramNode, StringLiteralNode } from '../../../../types/compiler/ast';
import { TokenType, Token } from "../../../../types/compiler/lexer";


export const createAST = (cst: CSTNode): ProgramNode => { 

  const parseProgram = (node: CSTNode): ProgramNode => { 
    const programNode: ProgramNode = {
      type: 'Program',
      body: [],
    };
    node.children.forEach(child => {
      const astNode = parseNode(child);
      programNode.body.push(astNode);
    });

    return programNode;
  }

  const parseMacroInvocation = (node: CSTNode): ASTNode => { 
    const macroInvocationNode: MacroInvocationNode = {
      type: 'MacroInvocation',
      name: null,
      arguments: [],
    };
    
    if(node.children.length < 1) throw new Error(`Macro name expected, none found in ${node.value}`);

    //first child is the macro name
    const macroNameNode = node.children[0];
    if(macroNameNode.type !== "MacroName") throw new Error(`Macro name expected, none found in ${macroNameNode.value}`);

    macroInvocationNode.name = macroNameNode.value;
    if(node.children.length > 1) {
      // add arguments if any
      for(let i = 1; i < node.children.length; i++) {
        const argumentNode = node.children[i];
        if(argumentNode.type !== "MacroArguments") throw new Error(`Macro arguments expected, none found in ${argumentNode.value}`);
        argumentNode.children.forEach(argument => {
          const astNode = parseNode(argument) as ExpressionNode;
          const validArgumentNodeTypes = [
            'StringLiteral',
            'StringInterpolation',
            'NumberLiteral',
            'BooleanLiteral',
            'Variable',
            'BinaryExpression',
            'UnaryExpression',
            'ConditionalExpression',
            'MacroInvocation',
            'MacroChain',
            'MacroBranch',
          ];
          if(!validArgumentNodeTypes.includes(astNode.type)) throw new Error(`Unexpected argument type: ${astNode.type}`);
          macroInvocationNode.arguments.push(astNode);
        });
      }
    }

    return macroInvocationNode;
  };

  const parseStringLiteral = (node: CSTNode): StringLiteralNode => {
    const stringLiteralNode: StringLiteralNode = {
      type: 'StringLiteral',
      value: node.value,
    };

    return stringLiteralNode;
  }
 

  const parseNode = (node: CSTNode): ASTNode => { 
    switch (node.type.toString()) {
      case "Program":
        return parseProgram(node);
      case "MacroInvocation":
        return parseMacroInvocation(node);
      // case "MacroArguments":
      //   return parseMacroArguments(node);
      // case "MacroArgument":
      //   return parseMacroArgument(node);
      // case "StringInterpolation":
      //   return parseStringInterpolation(node);
      case "StringLiteral":
        return parseStringLiteral(node);
      // case "Grouping":
      //   return parseGrouping(node);
      // case "Chaining":
      //   return parseChaining(node);
      // case "Branching":
      //   return parseBranching(node);
      // case "Nesting":
      //   return parseNesting(node);
      // case "IfControl":
      //   return parseIfControl(node);
      // case "SwitchControl":
      //   return parseSwitchControl(node);
      // case "TryCatch":
      //   return parseTryCatch(node);
      // case "WhileLoop":
      //   return parseWhileLoop(node);
      // case "Literal":
      //   return parseLiteral(node);
      // case "Identifier":
      //   return parseIdentifier(node);
      // case "Operator":
      //   return parseOperator(node);
      // case "Punctuation":
      //   return parsePunctuation(node);
      // case "VariableIdentifier":
      //   return parseVariableIdentifier(node);
      // case "Whitespace":
      //   return parseWhitespace(node);
      // case "Comment":
      //   return parseComment(node);
      // case "Newline":
      //   return parseNewline(node);
      // case "EOF":
      //   return parseEOF(node);
      default:
        throw new Error(`Unexpected token type: ${node.type}`);
    }
  }
  
  const node = parseNode(cst);
  if(node.type !== "Program") throw new Error(`Unexpected node type: ${node.type}`);
  return node as ProgramNode;
};
