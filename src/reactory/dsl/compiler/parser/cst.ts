import { CSTElifBranchNode, CSTElseBranchNode, CSTIfControlNode, CSTNode, CSTOperatorNode, CSTParsingContext, CSTSourceInfo, Operator } from "@reactory/server-core/types/compiler/cst";
import { TokenType, Token } from "@reactory/server-core/types/compiler/lexer";

/**
 * createCST takes an array of tokens and returns a CST
 * @param tokens 
 * @returns 
 */
export const createCST = (tokens: Token[], sourceInfo?: CSTSourceInfo): CSTNode => {
      
  // defines the current expression context
  // that tells us about the surrounding expressions
  // or tokens. This will help us to determine
  // how to parse the current token and return the 
  // appropriate CST node
  const currentExpressionContext: CSTParsingContext = { 
    currentToken: null,
    currentTokenIndex: 0,
    nextToken: null,
    nextTokenIndex: null,
    previousToken: null,
    previousTokenIndex: null,
    currentNode: null,
    currentNodeIndex: null,
    parentNode: null,
    parentNodeIndex: null,
    rootNode: null,
    rootNodeIndex: null,
    sourceInfo: sourceInfo,
    state: {},
    validate: () => true,
  };


  /**
   * Returns the next token in the array and increments the current index
   * @returns 
   */
  const nextToken = (): Token => tokens[currentExpressionContext.currentTokenIndex++];
  /**
   * Returns the current token in the array
   * @returns 
   */
  const currentToken = (): Token => tokens[currentExpressionContext.currentTokenIndex - 1];
  /**
   * Returns the next token in the array without incrementing the current index
   * @returns 
   */
  const peekToken = (): Token => tokens[currentExpressionContext.currentTokenIndex];


  /**
   * Parses a string interpolation token into a CST node
   * @param token 
   * @returns 
   */
  const parseStringInterpolation = (token: Token): CSTNode => {
    const stringInterpolationNode: CSTNode = {
      type: 'StringInterpolation',
      value: token.value,
      token: token,
      children: [],
    };
    
    return stringInterpolationNode;
  }

  /**
   * Parses a macro invocation token into a CST node
   * @param token 
   * @returns 
   */
  const parseMacroInvocation = (token: Token): CSTNode => { 
    const macroTagNode: CSTNode = {
      type: 'MacroInvocation',
      token: token,
      value: token.value,
      children: [],
    };
    const identifierToken = nextToken();

    if(identifierToken.type !== "IDENTIFIER") throw new Error(`Unexpected token type: ${identifierToken.type}, IDENTIFIER expected`);
    
    macroTagNode.children.push({
      type: 'MacroName',
      value: identifierToken.value,
      token: identifierToken,
      children: [],
    });

    // add the identifier token value to the macro tag node value
    // so that we can reconstruct the macro invocation string
    macroTagNode.value += identifierToken.value; 

    const openParenToken = nextToken();
    if(openParenToken.type !== "PAREN_OPEN") throw new Error(`Unexpected token type: ${openParenToken.type}, PAREN_OPEN expected`);

    macroTagNode.children.push({
      type: 'MacroArguments',
      value: openParenToken.value,
      token: openParenToken,
      children: [],
    });

    let currentArgumentToken = nextToken();
    while(currentArgumentToken.type !== "PAREN_CLOSE") {
      const argumentNode: CSTNode = {
        type: 'MacroArgument',
        token: currentArgumentToken,
        children: [],
      };

      macroTagNode.children[1].value += currentArgumentToken.value;

      switch(currentArgumentToken.type) {
        case "STRING_LITERAL": {
          argumentNode.type = "StringLiteral";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "NUMBER_LITERAL": {
          argumentNode.type = "NumberLiteral";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "BOOLEAN_LITERAL": {
          argumentNode.type = "BooleanLiteral";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "HEXADECIMAL_LITERAL": {
          argumentNode.type = "HexadecimalLiteral";
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
        case "COMMA": {
          argumentNode.type = "Punctuation";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "WHITESPACE": {
          argumentNode.type = "Whitespace";
          argumentNode.value = currentArgumentToken.value;
          break;
        }
        case "IDENTIFIER": {
          argumentNode.type = "Identifier";
          argumentNode.value = currentArgumentToken.value;
          argumentNode.children.push(parseIdentifier(currentArgumentToken));
          break;
        }
        default: {
          throw new Error(`Unexpected token type: ${currentArgumentToken.type}:COMMA, WHITESPACE, STRING_LITERAL or VARIABLE expected`);
        }
      }
      macroTagNode.children[1].children.push(argumentNode);
      currentArgumentToken = nextToken();
    } 

    macroTagNode.children[1].value += currentArgumentToken.value;
    return macroTagNode;
  }

  const parseGrouping = (groupingToken: Token): CSTNode => { 
    const { type: openingType } = groupingToken;

    const node: CSTNode = {
        type: 'Grouping',
        token: groupingToken,        
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
            const innerGroup = parseGrouping(next);
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

  const parseBranching = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Branching',
      token,
      children: [],
    };
    node.value = token.value;
    return node;
  }

  const parseNesting = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Nesting',
      children: [],
      token,
    };
    
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
    const thenBranchNode = parseGrouping(token);
    //once we have the then branch node, we can add it to the if control node
    node.thenBranch = thenBranchNode;
  
    return node;
  }


  const parseIfControl = (token: Token): CSTIfControlNode => { 
    const node: CSTIfControlNode = {
      type: 'IfControl',
      condition: null,
      thenBranch: null,
      elifBranches: [],
      elseBranch: null,
      value: null,
      children: [],
    };    
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
    const conditionNode = parseGrouping(token);
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
    const thenBranchNode = parseGrouping(token);
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
            node.children.push(parseWhitespace(token));
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

  const parseSwitchControl = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'SwitchControl',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseTryCatch = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'TryCatch',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseWhileLoop = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'WhileLoop',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseLiteral = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Literal',
      children: [],
    };

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
    }

    node.value = token.value;
    return node;
  }

  const parseIdentifier = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Identifier',
      children: [],
    };
    
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
        node.children.push(parseGrouping(token));
        break;
      }
      default: {
        throw new Error(`Unexpected token type: ${token.type}, STRING_LITERAL, NUMBER_LITERAL, BOOLEAN_LITERAL, VARIABLE, MACRO_START, PAREN_OPEN, or BRACKET_OPEN expected`);
      }
    }

    node.value = token.value;
    return node;
  }

  const parseOperator = (token: Token): CSTOperatorNode => { 
    const node: CSTOperatorNode = {
      type: 'Operator',
      operator: null,
      children: [],
    };    
    node.value = token.value;
    switch(token.value) {
      case "!":
        node.operator = Operator.Unary | Operator.LogicalNot;
        break;       
      case "--":
        node.operator = Operator.Assignment | Operator.Unary | Operator.Subtraction;
        break;
      case "++":
        node.operator = Operator.Assignment | Operator.Unary | Operator.Addition;
        break;
      case "+":
        node.operator = Operator.Binary | Operator.Addition;
        break;
      case "-":
        node.operator = Operator.Binary | Operator.Subtraction;
        break;
      case "*":
        node.operator = Operator.Binary | Operator.Multiplication;
        break;
      case "/":
        node.operator = Operator.Binary | Operator.Division;
        break;
      case "%":
        node.operator = Operator.Binary | Operator.Modulus;
        break;
      case "^":
        node.operator = Operator.Binary | Operator.Exponentiation;
        break;
      case "&":
        node.operator = Operator.Binary | Operator.BitwiseAnd;
        break;
      case "|":
        node.operator = Operator.Binary | Operator.BitwiseOr;
        break;
      case "~":
        node.operator = Operator.Unary | Operator.BitwiseNot;
        break;
      case "<<":
        node.operator = Operator.Binary | Operator.BitwiseLeftShift;
        break;
      case ">>":
        node.operator = Operator.Binary | Operator.BitwiseRightShift;
        break;
      case ">>>":
        node.operator = Operator.Binary | Operator.BitwiseUnsignedRightShift;
        break;
      case "&&":
        node.operator = Operator.Binary | Operator.LogicalAnd;
        break;
      case "||":
        node.operator = Operator.Binary | Operator.LogicalOr;
        break;
      case "==":
        node.operator = Operator.Binary | Operator.Equals;
        break;
      case "!=":
        node.operator = Operator.Binary | Operator.NotEquals;
        break;
      case "<":
        node.operator = Operator.Binary | Operator.LessThan;
        break;
      case ">":
        node.operator = Operator.Binary | Operator.GreaterThan;
        break;
      case "<=":
        node.operator = Operator.Binary | Operator.LessThanOrEqual;
        break;
      case ">=":
        node.operator = Operator.Binary | Operator.GreaterThanOrEqual;
        break;
      case "=":
        node.operator = Operator.Assignment;
        break;
      case "+=":
        node.operator = Operator.Assignment | Operator.Addition;
        break;
      case "-=":
        node.operator = Operator.Assignment | Operator.Subtraction;
        break;
      case "*=":
        node.operator = Operator.Assignment | Operator.Multiplication;
        break;
      case "/=":
        node.operator = Operator.Assignment | Operator.Division;
        break;
      case "%=":
        node.operator = Operator.Assignment | Operator.Modulus;
        break;
      case "^=":
        node.operator = Operator.Assignment | Operator.Exponentiation;
        break;
      case "&=":
        node.operator = Operator.Assignment | Operator.BitwiseAnd;
        break;
      case "|=":
        node.operator = Operator.Assignment | Operator.BitwiseOr;
        break;
      case "~=":
        node.operator = Operator.Assignment | Operator.BitwiseNot;
        break;
    }
    
    return node;
  }
    

  const parsePunctuation = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Punctuation',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseWhitespace = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Whitespace',
      children: [],
    };
    node.value = token.value;
    return node;
  }

  const parseNewLine = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Newline',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseComment = (token: Token): CSTNode => { 
    const node: CSTNode = {
      type: 'Comment',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseVariableIdentifier = (token: Token): CSTNode => {
    const node: CSTNode = {
      type: 'VariableIdentifier',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseComparisonOperator = (token: Token): CSTNode => {
    const node: CSTNode = {
      type: 'ComparisonOperator',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  const parseEOF = (_: Token): CSTNode => {     
    return null;
  }

  const parseToken = (token: Token): CSTNode => { 
    switch (token.type.toString()) {
      case "IDENTIFIER":
        return parseIdentifier(token);
      case "MACRO_START":
        return parseMacroInvocation(token);
        //case "PAREN_CLOSE":
        //case "BRACKET_CLOSE":
        //case "CURLY_CLOSE":
      case "BRACKET_OPEN":
      case "PAREN_OPEN":
      case "CURLY_OPEN":
        return parseGrouping(token);
      case "ARROW_CHAIN":
        return parseChaining();
      case "ARITHMETIC_OPERATOR":
          return parseOperator(token);
      case "COMPARISON_OPERATOR":
        return parseComparisonOperator(token);
      case "ARROW_BRANCH":
        return parseBranching(token);
      case "IF":
        return parseIfControl(token);
      case "SWITCH":
        return parseSwitchControl(token);
      case "TRY":
      case "CATCH":
      case "FINALLY":
        return parseTryCatch(token);
      case "WHILE":
        return parseWhileLoop(token);
      case "NUMBER_LITERAL":
      case "STRING_LITERAL":
      case "BOOLEAN_LITERAL":
      case "HEXADECIMAL_LITERAL":
      case "LITERAL":
        return parseLiteral(token);
      case "ASSIGNMENT":
      case "OPERATOR":
        return parseOperator(token);
      case "PUNCTUATION":
      case "SEMICOLON":
        return parsePunctuation(token);
      case "VARIABLE":
        return parseVariableIdentifier(token);
      case "WHITESPACE":
        return parseWhitespace(token);
      case "COMMENT":
        return parseComment(token);
      case "NEWLINE":
        return parseNewLine(token);
      case "EOF":
        return parseEOF(token);
      default:
        throw new Error(`Unexpected token type: ${token.type}`);
    }
  
  }

  // Create the root node
  const cst: CSTNode = {
    type: 'Program',
    token: null, // the root node has no token
    children: [],
  };

  // parse the main program
  while (currentExpressionContext.currentTokenIndex < tokens.length - 1) {
    const token = nextToken(); 
    //parse the token 
    const node = parseToken(token);
    if(node) cst.children.push(node);
  }

  return cst;
}