import { CSTElifBranchNode, CSTElseBranchNode, CSTIfControlNode, CSTNode, CSTOperatorNode, CSTSourceInfo } from "@reactory/server-core/types/compiler/cst";
import { TokenType, Token } from "@reactory/server-core/types/compiler/lexer";

/**
 * createCST takes an array of tokens and returns a CST
 * @param tokens 
 * @returns 
 */
export const createCST = (tokens: Token[], sourceInfo?: CSTSourceInfo): CSTNode => {
  
  // defines the current token index
  let currentTokenIndex = 0;

  // defines the global scope of the program
  let globalScope = {};

  // defines the current scope of the program
  let currentScope = {};



  /**
   * Returns the next token in the array and increments the current index
   * @returns 
   */
  const nextToken = (): Token => tokens[currentTokenIndex++];
  /**
   * Returns the current token in the array
   * @returns 
   */
  const currentToken = (): Token => tokens[currentTokenIndex - 1];
  /**
   * Returns the next token in the array without incrementing the current index
   * @returns 
   */
  const peekToken = (): Token => tokens[currentTokenIndex];


  /**
   * Parses a string interpolation token into a CST node
   * @param currentArgumentToken 
   * @returns 
   */
  const parseStringInterpolation = (currentArgumentToken: Token): CSTNode => {
    const stringInterpolationNode: CSTNode = {
      type: 'StringInterpolation',
      value: currentArgumentToken.value,
      children: [],
    };
    
    return stringInterpolationNode;
  }

  /**
   * Parses a macro invocation token into a CST node
   * @param currentToken 
   * @returns 
   */
  const parseMacroInvocation = (currentToken: Token): CSTNode => { 
    const macroTagNode: CSTNode = {
      type: 'MacroInvocation',
      value: currentToken.value,
      children: [],
    };
    const identifierToken = nextToken();

    if(identifierToken.type !== "IDENTIFIER") throw new Error(`Unexpected token type: ${identifierToken.type}, IDENTIFIER expected`);
    
    macroTagNode.children.push({
      type: 'MacroName',
      value: identifierToken.value,
      children: [],
    });

    const openParenToken = nextToken();
    if(openParenToken.type !== "PAREN_OPEN") throw new Error(`Unexpected token type: ${openParenToken.type}, PAREN_OPEN expected`);

    macroTagNode.children.push({
      type: 'MacroArguments',
      value: openParenToken.value,
      children: [],
    });

    let currentArgumentToken = nextToken();
    while(currentArgumentToken.type !== "PAREN_CLOSE") {
      const argumentNode: CSTNode = {
        type: 'MacroArgument',
        children: [],
      };

      macroTagNode.children[1].value += currentArgumentToken.value;

      switch(currentArgumentToken.type) {
        case "STRING_LITERAL": {
          argumentNode.type = "StringLiteral";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "EXECUTABLE_STRING_LITERAL": {
          argumentNode.type = "StringInterpolation";
          argumentNode.value = currentArgumentToken.value;
          argumentNode.children.push(parseStringInterpolation(currentArgumentToken));
          break;
        }
        case "VARIABLE": {
          argumentNode.type = "VariableIdentifier";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "MACRO_START": {
          argumentNode.type = "MacroInvocation";
          argumentNode.value = currentArgumentToken.value;
          argumentNode.children.push(parseMacroInvocation(currentArgumentToken));
          break;
        }
        default: {
          throw new Error(`Unexpected token type: ${currentArgumentToken.type}, STRING_LITERAL or VARIABLE expected`);
        }
      }
      macroTagNode.children[1].children.push(argumentNode);
      currentArgumentToken = nextToken();
    } 

    macroTagNode.children[1].value += currentArgumentToken.value;
    return macroTagNode;
  }

  const parseGrouping = (openingType: TokenType): CSTNode => { 
    const node: CSTNode = {
        type: 'Grouping',
        children: [],
    };
    let closingType: TokenType;

    // Determine the corresponding closing type
    switch(openingType) { 
        case "PAREN_OPEN":
            closingType = "PAREN_CLOSE";
            break;
        case "BRACKET_OPEN":
            closingType = "BRACKET_CLOSE";
            break;
        case "CURLY_OPEN":
            closingType = "CURLY_CLOSE";
            break;
        default:
            throw new Error(`Invalid opening type for grouping: ${openingType}`);
    }

    let next = nextToken();

    while (next && next.type !== closingType) { 
        // Check for another opening token and handle it recursively
        if (next.type === "PAREN_OPEN" || next.type === "BRACKET_OPEN" || next.type === "CURLY_OPEN") {
            const innerGroup = parseGrouping(next.type);
            node.children.push(innerGroup);
        } else if (next.type !== closingType) {
            // Call parseToken only for non-closing tokens
            const nextNode = parseToken(next);
            node.children.push(nextNode);
        }
        next = nextToken();
    }

    // If we exit the loop without finding the closing token, it's an error
    if (next && next.type !== closingType) {
        throw new Error(`Expected closing type ${closingType}, but found ${next.type}`);
    }

    return node;
}



  const parseChaining = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Chaining',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseBranching = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Branching',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseNesting = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Nesting',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseElifBranch = (): CSTElifBranchNode => { 
    const node: CSTElifBranchNode = {
      type: 'ElifBranch',
      condition: null,
      thenBranch: null,
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseElseBranch = (): CSTElseBranchNode => { 
    const node: CSTElseBranchNode = {
      type: 'ElseBranch',
      thenBranch: null,
      children: [],
    };

    // else branch has to have a then branch
    // and it has no condition to check
    // so we consume the next token until we find a CURLY_OPEN
    let token = nextToken();
    
    while(token.type !== "CURLY_OPEN") { 
      let next = peekToken();
      if(next.type !== "WHITESPACE" && next.type !== "CURLY_OPEN") {
        throw new Error(`Unexpected token type: ${next.type},only WHITESPACE or CURLY_OPEN permitted after ELSE @ ${token.position.line}:${token.position.column}`);        
      } 
      node.value += token.value;
      token = nextToken();      
    }

    // our token is now CURLY_OPEN
    // so we can parse the grouping to get the then branch node
    const thenBranchNode = parseGrouping("CURLY_OPEN");
    //once we have the then branch node, we can add it to the if control node
    node.thenBranch = thenBranchNode;
  
    return node;
  }


  const parseIfControl = (): CSTIfControlNode => { 
    const node: CSTIfControlNode = {
      type: 'IfControl',
      condition: null,
      thenBranch: null,
      elifBranches: [],
      elseBranch: null,
      value: null,
      children: [],      
    };
    let token = nextToken();
    // if control has to have a condition, which could make use of a comparison operator
    // i.e. if (a == b) { ... } or if (a) { ... } or if (a == b && c == d) { ... }
    // so our next token should be either a whitespace or a PAREN_OPEN
    // brackets are not optional
    
    // keep checking the next token until we have a opening bracket
    while(token.type !== "PAREN_OPEN") {       
      let next = peekToken();      
      if(next.type !== "WHITESPACE" && next.type !== "PAREN_OPEN") {        
        throw new Error(`Unexpected token type: ${next.type},only WHITESPACE or PAREN_OPEN permitted after IF @ ${token.position.line}:${token.position.column}`);        
      }
      token = nextToken();
    }

    // our token is now PAREN_OPEN
    // so we can parse the grouping to get the condition node
    const conditionNode = parseGrouping("PAREN_OPEN");
    //once we have the condition node, we can add it to the if control node
    node.condition = conditionNode;
    
    // now we need to parse the then branch
    // the next token should be a CURLY_OPEN or WHITESPACE
    
    token = nextToken();
    while(token.type !== "CURLY_OPEN") { 
      let next = peekToken();
      if(next.type !== "WHITESPACE" && next.type !== "CURLY_OPEN") {
        throw new Error(`Unexpected token type: ${next.type},only WHITESPACE or CURLY_OPEN permitted after IF condition @ ${token.position.line}:${token.position.column}`);        
      } 
      token = nextToken();
    }

    // our token is now CURLY_OPEN
    // so we can parse the grouping to get the then branch node
    const thenBranchNode = parseGrouping("CURLY_OPEN");
    //once we have the then branch node, we can add it to the if control node
    node.thenBranch = thenBranchNode;

    // now we need to parse the elif branches if any
    // the next token should be an ELIF, ELSE or WHITESPACE
    // we keep consuming tokens until we find an ELIF, ELSE or ANY other token but WHITESPACE
    token = nextToken();
    let controlFlowComplete = false;

    while(!controlFlowComplete) { 
      let next = peekToken();
      if(next !== null && next.type !== 'EOF') { 
        switch(token.type) {           
          case "ELIF": {
            node.elifBranches.push(parseElifBranch());
            break;
          }
          case "ELSE": { 
            node.elseBranch = parseElseBranch();
            break;
          }
          case "WHITESPACE": {
            node.children.push(parseWhitespace());
            break;
          }
          default: { 
            controlFlowComplete = true;
          }
        }
        token = nextToken();
      } else {
        controlFlowComplete = true;
      }
    }
    
    return node;
  }

  const parseSwitchControl = (): CSTNode => { 
    const node: CSTNode = {
      type: 'SwitchControl',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseTryCatch = (): CSTNode => { 
    const node: CSTNode = {
      type: 'TryCatch',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseWhileLoop = (): CSTNode => { 
    const node: CSTNode = {
      type: 'WhileLoop',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseLiteral = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Literal',
      children: [],
    };

    node.value = token.value;
    return node;
  }

  const parseIdentifier = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Identifier',
      children: [],
    };

    const token = nextToken();
    switch(token.type) {
      case "STRING_LITERAL": {
        node.type = "StringLiteral";
        node.value = token.value;
        break;
      }
      case "NUMBER_LITERAL": {
        node.type = "NumberLiteral";
        node.value = token.value;
        break;
      }
      case "BOOLEAN_LITERAL": { 
        node.type = "BooleanLiteral";
        node.value = token.value;
        break;
      }
      case "VARIABLE": {
        node.type = "VariableIdentifier";
        node.value = token.value;
        break;
      }
      case "MACRO_START": {
        node.type = "MacroInvocation";
        node.value = token.value;
        node.children.push(parseMacroInvocation(token));
        break;
      }
      case "PAREN_OPEN":
      case "CURLY_OPEN":
      case "BRACKET_OPEN":  {
        node.type = "Grouping";
        node.value = token.value;
        node.children.push(parseGrouping(token.type));
        break;
      }
      default: {
        throw new Error(`Unexpected token type: ${token.type}, STRING_LITERAL, NUMBER_LITERAL, BOOLEAN_LITERAL, VARIABLE, MACRO_START, PAREN_OPEN, or BRACKET_OPEN expected`);
      }
    }

    node.value = token.value;
    return node;
  }

  const parseOperator = (): CSTOperatorNode => { 
    const node: CSTOperatorNode = {
      type: 'Operator',
      operatorType: null,
      children: [],
    };
    const token = currentToken();
    node.value = token.value;
    switch(token.value) {
      case "!": 
      case "--":
      case "++": {
        node.operatorType = "Unary";
        break
      }
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
      case "^":
      case "&":
      case "|":
      case "~":
      case "<<":
      case ">>":
      case ">>>":
      case "&&":
      case "||":
      case "==":
      case "!=":
      case "===":
      case "!==":
      case "<":
      case ">":
      case "<=":
      case ">=":
      case "=>":
      case "=":
      case "+=":
      case "-=":
      case "*=":
      case "/=":
      case "%=":
      case "^=":
      case "&=":
      case "|=":
      case "~=": {
        node.operatorType = "Binary";
        break;
      }
    }
    return node;
  }

  const parsePunctuation = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Punctuation',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseWhitespace = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Whitespace',
      children: [],
    };
    const token = currentToken();
    node.value = token.value;
    return node;
  }

  const parseComment = (): CSTNode => { 
    const node: CSTNode = {
      type: 'Comment',
      children: [],
    };
    const token = nextToken();
    node.value = token.value;
    return node;
  }

  const parseVariableIdentifier = (): CSTNode => {
    const node: CSTNode = {
      type: 'VariableIdentifier',
      children: [],
    };
    const token = currentToken();
    node.value = token.value;
    return node;
  }

  const parseComparisonOperator = (): CSTNode => {
    const node: CSTNode = {
      type: 'ComparisonOperator',
      children: [],
    };
    const token = currentToken();
    node.value = token.value;
    return node;
  }

  const parseEOF = (): CSTNode => {     
    return null;
  }

  const parseToken = (token: Token): CSTNode => { 
    switch (token.type.toString()) {
      case "IDENTIFIER":
        return parseIdentifier();
      case "MACRO_START":
        return parseMacroInvocation(token);
        //case "PAREN_CLOSE":
        //case "BRACKET_CLOSE":
        //case "CURLY_CLOSE":
      case "BRACKET_OPEN":
      case "PAREN_OPEN":
      case "CURLY_OPEN":
        return parseGrouping(token.type);
      case "ARROW_CHAIN":
        return parseChaining();      
      case "COMPARISON_OPERATOR":
        return parseComparisonOperator();
      case "ARROW_BRANCH":
        return parseBranching();
      case "IF":
        return parseIfControl();
      case "SWITCH":
        return parseSwitchControl();
      case "TRY":
      case "CATCH":
      case "FINALLY":
        return parseTryCatch();
      case "WHILE_LOOP":
        return parseWhileLoop();
      case "STRING_LITERAL":
      case "BOOLEAN_LITERAL":
      case "HEXADECIMAL_LITERAL":
      case "LITERAL":
        return parseLiteral(token);
      case "ASSIGNMENT":
      case "OPERATOR":
        return parseOperator();
      case "PUNCTUATION":
      case "SEMICOLON":
        return parsePunctuation();
      case "VARIABLE":
        return parseVariableIdentifier();
      case "WHITESPACE":
        return parseWhitespace();
      case "COMMENT":
        return parseComment();
      case "NEWLINE":
        return parseWhitespace();
      case "EOF":
        return parseEOF();
      default:
        throw new Error(`Unexpected token type: ${token.type}`);
    }
  
  }

  // Create the root node
  const cst: CSTNode = {
    type: 'Program',
    children: [],
  };

  // parse the main program
  while (currentTokenIndex < tokens.length - 1) {
    const token = nextToken(); 
    //parse the token 
    const node = parseToken(token);
    if(node) cst.children.push(node);
  }

  return cst;
}