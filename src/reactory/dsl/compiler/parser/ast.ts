import { CSTNode, CSTOperatorNode, CSTProgramNode } from "@reactory/server-core/types/compiler/cst";
import { 
  ASTNode, 
  BooleanLiteralNode, 
  CST2ASTContext, 
  ExpressionNode, 
  HexLiteralNode, 
  MacroInvocationNode, 
  NumberLiteralNode, 
  ProgramNode, 
  StringLiteralNode, 
  VariableNode 
} from '@reactory/server-core/types/compiler/ast';
import { TokenType, Token } from "@reactory/server-core/types/compiler/lexer";



export const createAST = (cst: CSTProgramNode): ProgramNode => { 
  
  let programNode: ProgramNode = {
    type: 'Program',
    options: {
      strict: false,
      version: '0.0.1',
      mode: 'script',
    },
    body: [],
  };

  const context: CST2ASTContext = { 
    activeAST: null,
    activeCST: null,
    parent: null,
  };

  const setActiveCSTNode = (node: CSTNode): void => { 
    context.activeCST = node;
  }

  const setActiveASTNode = (node: ASTNode): void => { 
    context.activeAST = node;
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

  const parseNumberLiteral = (node: CSTNode): NumberLiteralNode => { 
    const numberLiteralNode: NumberLiteralNode = {
      type: 'NumberLiteral',
      value: node.value,
    };

    return numberLiteralNode;
  }

  const parseBooleanLiteral = (node: CSTNode): BooleanLiteralNode => { 
    const booleanLiteralNode: BooleanLiteralNode = {
      type: 'BooleanLiteral',
      value: node.value,
    };

    return booleanLiteralNode;
  }

  const parseHexadecimalLiteral = (node: CSTNode): HexLiteralNode => {
    const hexNode: HexLiteralNode = {
      type: 'HexLiteral',
      value: node.value,
    };

    return hexNode;
  }

  const parseLiteral = (node: CSTNode): LiteralNode  => { 
    if(node.type === "StringLiteral") return parseStringLiteral(node);
    if(node.type === "NumberLiteral") return parseNumberLiteral(node);
    if(node.type === "BooleanLiteral") return parseBooleanLiteral(node);
    if(node.type === "HexadecimalLiteral") return parseHexadecimalLiteral(node);
    throw new Error(`Unexpected literal type: ${node.type}`);
  }
 
  const parseVariableIdentifier = (node: CSTNode): VariableNode => { 
    const variableNode: VariableNode = {
      type: 'Variable',
      name: node.value,
    };

    const {
      activeCST,
      activeAST,
    } = context;

    // we need to check if the variable is a valid identifier
    // a valid identifier is a variable that starts with a $ and is followed by a letter or underscore
    const firstChar = node.value[0];
    const secondChar = node.value[1];
    const validFirstChar = firstChar === "$";
    const validSecondChar = secondChar.match(/[a-zA-Z_]/);
    if(!validFirstChar || !validSecondChar) throw new Error(`Invalid variable identifier: ${node.value}`);

    // check if we are currently parsing an expression
    // an expression can be a variable assignment or a variable operation
    // i.e. $i+=1, $i-=1, $i*=1, $i/=1, $i%=1, $i = $i + 1 
    // if not we look ahead to see if we are parsing an expression
    // if we are not parsing an expression we return the variable node
    // if find a valid punctuation we return the variable node, 
    // i.e. $i; or $i\n will return the variable node
    // if we find an invalid punctuation we throw an error
    // i.e. $i+1 will throw an error

    if(activeCST === null) { 
      // no active node, we are not parsing an expression yet
      // we need to look ahead to see if we are parsing an expression

    }

    return variableNode;
  }

  /**
   * A directive is a comment that starts with a # and is followed by a keyword
   * 
   * These are used to provide the compiler with additional information
   * when compiling the program and executing it.
   * @param node 
   * @returns 
   */
  const parseDirective = (node: CSTNode): null => {
    if(node.type === "Directive") {

      if (node.value.startsWith("#runat")) { 
        programNode.options.host = node.value.split(" ")[1] as any;
      }

      if(node.value.startsWith("#strict")) {
        programNode.options.strict = true;
      }

      if(node.value.startsWith("#mode")) {
        programNode.options.mode = node.value.split(" ")[1] as any;
      }

      if(node.value.startsWith("#version")) {
        programNode.options.version = node.value.split(" ")[1];
      }
    }
    return null;
  }

  const parseOperator = (node: CSTOperatorNode): null => {
    return null;
  }

  /**
   * Whitespace is removed from the program as it has no semantic meaning
   * @param node 
   * @returns 
   */
  const parseWhitespace = (node: CSTProgramNode): CSTProgramNode => { 
    return null;    
  }

  /**
   * Comments are removed from the program as they have no semantic meaning.
   * 
   * TODO: Comments will be used to generate documentation for the program,
   * but for now they are removed.
   * @param node 
   * @returns 
   */
  const parseComments = (node: CSTNode): null => { 
    return null;
  }

  const chainNodes = (node: CSTNode): CSTNode => { 
    // we work through the children of the node and chain them together
    // we start with the first child and chain it to the second child
    // we then chain the result to the third child and so on
    // we return the last chained node
    // if there are no children we return the node
    if(node.children.length === 0) return node;
    node.children.forEach((child, idx) => {
      if(idx < node.children.length - 1) { 
        const nextChild = node.children[idx + 1];
        node.children[idx].next = nextChild;
        if(child.children.length > 0) child = chainNodes(child);
      }
    });
    return node;
  }

  const processNewLines = (node: CSTProgramNode): CSTNode => { 
    // any newline that is not preceded by a comment or a newline is removed
    // any newline that is preceded by a statement / identifier / variable is removed 
    // and replaced with a semicolon to terminate the statement

    // if we have no children we return the node
    // if we have children we iterate through them

    if(node.children.length === 0) return node;
    node.children.forEach((child, idx) => {
      if(idx < node.children.length - 1) { 
        const nextChild = node.children[idx + 1];
        if(child.type === "Newline" && nextChild.type === "Newline") { 
          // we have two consecutive newlines
          // we remove the first one
          node.children.splice(idx, 1);
        }
      }
    });
  };

  /**
   * Parse punctionation
   * @param node 
   * @returns 
   */
  const parsePunctuation = (node: CSTNode): null => { 
    return null;
  }

  /**
   * Parses a CSTNode into an ASTNode
   * @param node 
   * @returns 
   */
  const parseNode = (node: CSTNode): ASTNode => {            
    switch (node.type.toString()) {      
      case "MacroInvocation":
        return parseMacroInvocation(node);
      // case "MacroArguments":
      //   return parseMacroArguments(node);
      // case "MacroArgument":
      //   return parseMacroArgument(node);
      // case "StringInterpolation":
      //   return parseStringInterpolation(node);
      case "NumberLiteral":
      case "BooleanLiteral":
      case "HexadecimalLiteral":
      case "StringLiteral":
        return parseLiteral(node);        
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
      // case "Identifier":
      //   return parseIdentifier(node);
      case "Operator":
        return parseOperator(node as CSTOperatorNode);
      case "Punctuation":
        return parsePunctuation(node);
      case "VariableIdentifier":
         return parseVariableIdentifier(node);
      case "Whitespace":
          return null;
      case "Comment":
        return parseComments(node);
      // case "Newline":
      //   return parseNewline(node);
      // case "EOF":
      //   return parseEOF(node);
      default: {
        const { 
          token
        } = node;

        let srcLocation = '';
        if(token && token.position) {
          const {
            src
          } = token.position;          
          srcLocation = `at line ${token.position.line} column ${token.position.column} in ${src || 'input stream'}`;
        } 

        throw new Error(`Unexpected token type: ${node.type} ${srcLocation}`);
      }

    }
  }

  /**
   * Converts a CSTProgramNode into an ASTProgramNode
   * @param node 
   * @returns 
   */
  const parseProgram = (node: CSTProgramNode): ProgramNode => {
    if(node.type !== "Program") throw new Error(`Unexpected node type: ${node.type}. Expected "Program"`);
    setActiveCSTNode(node as CSTProgramNode);
    setActiveASTNode(programNode);

    node.children.forEach(child => {
      const astNode = parseNode(child);
      if(astNode) programNode.body.push(astNode);
    });

    return programNode;
  }


  try {
    return parseProgram(cst);
  } catch (conversionException) { 
    throw conversionException;
  }  
};


