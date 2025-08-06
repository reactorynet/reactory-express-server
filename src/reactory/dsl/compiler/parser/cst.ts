import { 
  CSTDirectiveNode, 
  CSTElifBranchNode, 
  CSTElseBranchNode, 
  CSTIfControlNode, 
  CSTNode, 
  CSTOperatorNode, 
  CSTParsingContext, 
  CSTProgramNode, 
  CSTSourceInfo, 
  CSTVariableDeclarationNode, 
} from "@reactory/server-core/types/compiler/cst";
import { Operator } from "@reactory/server-core/types/compiler/shared";
import { TokenType, Token } from "@reactory/server-core/types/compiler/lexer";


/**
 * createCST takes an array of tokens and returns a CST
 * @param tokens 
 * @returns 
 */
export const createCST = (tokens: Token[], sourceInfo?: CSTSourceInfo): CSTNode => {
  
  // Create the root node
  const cst: CSTProgramNode = {
    type: 'Program',
    token: null, // the root node has no token
    children: [],
    acl: null,
    directives: [],
    value: null,
  };

  // defines the current expression context
  // that tells us about the surrounding expressions
  // or tokens. This will help us to determine
  // how to parse the current token and return the 
  // appropriate CST node
  const context: CSTParsingContext = { 
    currentToken: null,
    currentTokenIndex: 0,
    nextToken: null,
    nextTokenIndex: null,
    previousToken: null,
    previousTokenIndex: null,
    currentNode: cst,
    currentNodeIndex: 0,
    parentNode: cst,
    parentNodeIndex: 0,
    rootNode: cst,
    rootNodeIndex: 0,
    sourceInfo: sourceInfo,
    state: {},
    activePath: '0', // the current path in the CST
    validate: () => true,
    children: [],
  };

  /**
   * Helper function to update the context
   * @param delta - the delta to apply to the context
   */
  const updateContext = (delta: Partial<CSTParsingContext>) => { 
    context.currentToken = delta.currentToken || context.currentToken;
    context.currentTokenIndex = delta.currentTokenIndex || context.currentTokenIndex;
    context.nextToken = delta.nextToken || context.nextToken;
    context.nextTokenIndex = delta.nextTokenIndex || context.nextTokenIndex;
    context.previousToken = delta.previousToken || context.previousToken;
    context.previousTokenIndex = delta.previousTokenIndex || context.previousTokenIndex;
    context.currentNode = delta.currentNode || context.currentNode;
    context.currentNodeIndex = delta.currentNodeIndex || context.currentNodeIndex;
    context.parentNode = delta.parentNode || context.parentNode;
    context.parentNodeIndex = delta.parentNodeIndex || context.parentNodeIndex;
    context.rootNode = delta.rootNode || context.rootNode;
    context.rootNodeIndex = delta.rootNodeIndex || context.rootNodeIndex;
    context.sourceInfo = delta.sourceInfo || context.sourceInfo;
    context.state = delta.state || context.state;
    context.children = delta.children || context.children;
  }


  /**
   * Returns the next token in the array and increments the current index
   * @returns 
   */
  const nextToken = (): Token => tokens[context.currentTokenIndex++];
  /**
   * Returns the current token in the array
   * @returns 
   */
  const currentToken = (): Token => tokens[context.currentTokenIndex - 1];
  /**
   * Returns the next token in the array without incrementing the current index
   * @returns 
   */
  const peekToken = (): Token => tokens[context.currentTokenIndex];

  /**
   * Returns the previous token in the stack from the reference
   * of the the current node index. uses the parent node as the 
   * reference point
   * @returns 
   */
  const previousNode = (_context: CSTParsingContext): CSTNode => {
    const { activePath } = _context;
    const pathParts = activePath.split(".");
    
    let item = _context.rootNode;
    pathParts.forEach((part, index) => { 
      if(index > 0) { 
        const itemIndex = parseInt(pathParts[pathParts.length - 1]);
        if(itemIndex > -1) {
          item = item.children[itemIndex - 1];
        }
      }
    });

    return item;
  };


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
        case "DOT": {
          argumentNode.children.push({
            type: 'PropertyAccess',
            token: currentArgumentToken,
            children: [],
          });

          break;
        }
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

    const oldParent = context.parentNode;
    updateContext({ parentNode: node, currentNodeIndex: 0, activePath: `${context.activePath}.0` });

        while (next && next.type !== closingType) { 
        // Check for another opening token and handle it recursively
        if (next.type === "PAREN_OPEN" || next.type === "BRACKET_OPEN" || next.type === "CURLY_OPEN") {
            const innerGroup = parseGrouping(next);
            node.children.push(innerGroup);
        } else {
            // Handle special cases that need proper parsing
            if (next.type === "MACRO_START") {
                // Call parseMacroInvocation for proper macro parsing
                const macroNode = parseMacroInvocation(next);
                if (macroNode) {
                    node.children.push(macroNode);
                }
            } else {
                // Only create simple nodes for other grouping tokens, don't call parseToken
                // which might consume additional tokens
                let nodeType: string;
                switch (next.type) {
                    case "VARIABLE":
                        nodeType = "VariableIdentifier";
                        break;
                    case "WHITESPACE":
                        nodeType = "Whitespace";
                        break;
                    case "COMPARISON_OPERATOR":
                        nodeType = "ComparisonOperator";
                        break;
                    case "STRING_LITERAL":
                        nodeType = "StringLiteral";
                        break;
                    case "NUMBER_LITERAL":
                        nodeType = "NumberLiteral";
                        break;
                    case "IDENTIFIER":
                        nodeType = "Identifier";
                        break;
                    case "NEWLINE":
                        nodeType = "Newline";
                        break;
                    default:
                        nodeType = next.type;
                }
                
                const nextNode: CSTNode = {
                    type: nodeType as any,
                    value: next.value,
                    children: [],
                };
                node.children.push(nextNode);
            }
        }
        next = nextToken();
        updateContext({ activePath: `${context.activePath}.${node.children.length}` })
    }

    // If we exit the loop without finding the closing token, it's an error
    if (!next || next.type !== closingType) {
        throw new Error(`Expected closing type ${closingType}, but found ${next ? next.type : 'EOF'}`);
    }

    // restore the old parent
    const pathParts = context.activePath.split(".");
    pathParts.pop();
    updateContext({ parentNode: oldParent, activePath: pathParts.join(".") });

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
    
    // Check if the next token is already PAREN_OPEN (no whitespace)
    let next = peekToken();
    if (next && next.type === "PAREN_OPEN") {
      token = nextToken(); // consume the PAREN_OPEN
    } else {
      // Skip whitespace and find the opening parenthesis
      token = nextToken();
      if (!token) {
        throw new Error(`Unexpected end of tokens while parsing IF control structure`);
      }
      
      while(token.type !== "PAREN_OPEN") {       
        if(token.type !== "WHITESPACE") {        
          throw new Error(`Unexpected token type: ${token.type}, only WHITESPACE or PAREN_OPEN permitted after IF @ ${token.position.line}:${token.position.column}`);        
        }
        token = nextToken();
        if (!token) {
          throw new Error(`Unexpected end of tokens while parsing IF control structure`);
        }
      }
    }

    // our token is now PAREN_OPEN
    // so we can parse the condition manually instead of using parseGrouping
    // which would consume all tokens until the end
    const conditionNode: CSTNode = {
      type: 'Grouping',
      token: token,
      children: [],
    };
    
    // Parse the condition tokens manually
    let conditionToken = nextToken();
    while (conditionToken && conditionToken.type !== "PAREN_CLOSE") {
      // Only create simple nodes for condition tokens, don't call parseToken
      // which might consume additional tokens
      let nodeType: string;
      switch (conditionToken.type) {
        case "VARIABLE":
          nodeType = "VariableIdentifier";
          break;
        case "WHITESPACE":
          nodeType = "Whitespace";
          break;
        case "COMPARISON_OPERATOR":
          nodeType = "ComparisonOperator";
          break;
        case "STRING_LITERAL":
          nodeType = "StringLiteral";
          break;
        case "NUMBER_LITERAL":
          nodeType = "NumberLiteral";
          break;
        default:
          nodeType = conditionToken.type;
      }
      
      const nextNode: CSTNode = {
        type: nodeType as any,
        value: conditionToken.value,
        children: [],
      };
      conditionNode.children.push(nextNode);
      conditionToken = nextToken();
    }
    
    // We've consumed the PAREN_CLOSE token, so we need to get the next token
    // for the body parsing
    if (conditionToken && conditionToken.type === "PAREN_CLOSE") {
      // We found the closing parenthesis and consumed it
      // The next call to nextToken() will get the token after PAREN_CLOSE
    }
    
    //once we have the condition node, we can add it to the if control node
    node.condition = conditionNode;
    
    // now we need to parse the then branch
    // the next token should be a CURLY_OPEN or WHITESPACE
    
    // Check if we have more tokens
    if (context.currentTokenIndex >= tokens.length) {
      throw new Error(`Unexpected end of tokens while parsing IF control structure`);
    }
    
    token = nextToken();
    if (!token) {
      throw new Error(`Unexpected end of tokens while parsing IF control structure`);
    }
    
    while(token.type !== "CURLY_OPEN") { 
      if(token.type !== "WHITESPACE") {
        throw new Error(`Unexpected token type: ${token.type}, only WHITESPACE or CURLY_OPEN permitted after IF condition @ ${token.position.line}:${token.position.column}`);        
      } 
      token = nextToken();
      if (!token) {
        throw new Error(`Unexpected end of tokens while parsing IF control structure`);
      }
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

    if(token && token.type !== "EOF")  {
      while(!controlFlowComplete) { 
        if(!token) {
          controlFlowComplete = true;
          break;
        }
        
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
    
    // For while loops, we need to create separate nodes for the condition and body
    // The expected structure is: WhileLoop node, then Grouping nodes for condition and body
    // So we just return the WhileLoop node and let the main parser handle the condition and body
    // But we need to skip the WHITESPACE token that might follow the WHILE token
    
    // Skip whitespace after WHILE
    let next = peekToken();
    if (next && next.type === "WHITESPACE") {
      nextToken(); // consume the whitespace
    }
    
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
      case "IDENTIFIER": 
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
      case "DOT": {
        const previous = previousNode(context);        
        if (previous.type === "Literal" || 
            previous.type === "VariableIdentifier" || 
            previous.type === "MacroInvocation") {
          // we are accessing a property
          node.type = "PropertyAccess";
          node.value = token.value;
          previous.children.push(node);
          return null;
        } 
        break;
      }
      default: {
        throw new Error(`Unexpected token type: ${token.type} ${token.value} found at:
        ${process.cwd()}/${token.position.src} @${token.position.line}:${token.position.column}
        STRING_LITERAL, NUMBER_LITERAL, BOOLEAN_LITERAL, VARIABLE, MACRO_START, PAREN_OPEN, or BRACKET_OPEN expected`);
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

  const parseVariableDeclaration = (token: Token): CSTVariableDeclarationNode => {

    if(token.type === "VAR" || token.type === "VARIABLE") { 
      const node: CSTVariableDeclarationNode = {
        type: 'VariableDeclaration',
        children: [],
      };
      node.value = token.value;
      node.readonly = token.value === "const";
        
      // process tokens until we find a SEMICOLON or EOF
      // and add to the children
      let next = nextToken();
      while(next && next.type !== "SEMICOLON" && next.type !== "EOF") {
        const parsedNode = parseToken(next);
        if (parsedNode) {
          node.children.push(parsedNode);
        }
        next = nextToken();
      }

      // If we found a semicolon, add it to children
      if (next && next.type === "SEMICOLON") {
        const semicolonNode = parseToken(next);
        if (semicolonNode) {
          node.children.push(semicolonNode);
        }
      }

      return node;

    } else {
      throw new Error(`Unexpected token type: ${token.type} found ${token.position.src}@${token.position.line}:${token.position.column}`);
    }
  }

  const parseComparisonOperator = (token: Token): CSTNode => {
    const node: CSTNode = {
      type: 'ComparisonOperator',
      children: [],
    };    
    node.value = token.value;
    return node;
  }

  /**
   * Parses a directive token into a CSTDirective node
   * @param token 
   * @returns 
   */
  const parseDirective = (token: Token): null => { 
    const directiveNode: CSTDirectiveNode = { 
      type: 'Directive',
      token: token,
      children: [],
      value: token.value,
      directiveType: null,
    }

    let directive = token.value.replace("#", "");
    const [ directiveText, ...rest ] = directive.split(" ");
    switch (directiveText) { 
      case "import": {
        directiveNode.directiveType = "import";
        directiveNode.value = rest.join(" ");
        break;
      }
      case "export": {
        directiveNode.directiveType = "export";
        directiveNode.value = rest.join(" ");
        break;
      }
      case "host": {
        directiveNode.directiveType = "host";
        directiveNode.value = rest.join(" ");
        break;
      }
      case "acl": {
        directiveNode.directiveType = "acl";
        directiveNode.value = rest.join(" ");
        break;
      }
      case "use": {
        directiveNode.directiveType = "use";
        directiveNode.value = rest.join(" ");
        break;
      }
    }
    cst.directives.push(directiveNode);

    return null; // we don't need to do anything with the directive token
  }

  const parseEOF = (_: Token): CSTNode => {     
    return null; // we don't need to do anything with the EOF token
  }

  const parseToken = (token: Token): CSTNode => { 
    switch (token.type.toString()) {
      case "IDENTIFIER":
        return parseIdentifier(token);
      case "DOT":
        return parseIdentifier(token);
      case "MACRO_START":
        return parseMacroInvocation(token);
      case "PAREN_CLOSE":
      case "BRACKET_CLOSE":
      case "CURLY_CLOSE":
        // These are handled by the grouping parser, just return null
        return null;
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
      case "FOR":
        return parseWhileLoop(token); // Use while loop parser for now
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
      case "COMMA":
        return parsePunctuation(token);
      case "VARIABLE":
      case "VAR":
        return parseVariableDeclaration(token);
      case "WHITESPACE":
        // we add the whitespace to the CST so that we can reconstruct the original source code
        // if needed. This is useful for debugging or generating source maps.
        return parseWhitespace(token); 
      case "COMMENT":
        return parseComment(token);
      case "NEWLINE":
        return parseNewLine(token);
      case "DIRECTIVE": 
        return parseDirective(token);
      case "EOF":
        return parseEOF(token);
      default:
        throw new Error(`Unexpected token type: ${token.type} found ${token.position.src}@${token.position.line}:${token.position.column}`);
    }
  }

  // parse the main program
  while (context.currentTokenIndex < tokens.length) {
    const token = nextToken(); 
    //parse the token 
    const node = parseToken(token);
    // ensure we only add nodes that have a type
    if(node && node.type) { 
      cst.children.push(node);  
      updateContext({ 
        currentNode: node, currentNodeIndex: cst.children.length - 1,
        activePath: `${context.activePath}.${cst.children.length - 1}`
      });
    }
  }

  return cst;
}