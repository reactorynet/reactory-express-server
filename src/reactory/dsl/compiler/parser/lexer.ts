import { Token, Tokenizer, TokenType, TokenizerOptions } from '@reactory/server-core/types/compiler/lexer';

// Default options for the tokenizer
const DEFAULT_OPTIONS: TokenizerOptions = {
  ignoreWhitespace: false,
  ignoreComments: false,
  ignoreNewLines: false,
};

// The tokenizer function takes a string of macro code and returns an array of tokens
const tokenize: Tokenizer = (input: string, options: TokenizerOptions = DEFAULT_OPTIONS): Token[] => {
  const tokens: Token[] = [];
  let position = { line: 1, column: 1 };

  const { ignoreWhitespace, ignoreComments, ignoreNewLines } = options;
  
  /**
    ### Regex Breakdown:

    1. **`^`**: 
      - This asserts the start of a line or string.

    2. **`(?: ... )`**: 
      - This is a non-capturing group. It groups the included patterns together without creating a capturing group.

    3. **`(?!\n|\/\/|\/\*|\`)`**: 
      - This is a negative lookahead assertion. It ensures that the following characters do not match any of the patterns specified within the lookahead.
      - `\n`: Matches a newline character.
      - `\/\/`: Matches a double forward slash (`//`), typically used to start a single-line comment in many programming languages.
      - `\/\*`: Matches the start of a block comment (`/*`) in many programming languages.
      - `` ` ``: Matches a backtick character.

    4. **`[^\S\n]`**:
      - `[...]`: This is a character class.
      - `^\S`: This matches any character that is not a non-whitespace character (`\S`). In other words, it matches any whitespace character.
      - `\n`: This represents a newline character.
      - The combination `[^\S\n]` matches any whitespace character except for the newline character.

    ### Overall Explanation:
    This regular expression matches a line starting with a whitespace character (but not a newline), provided that the whitespace is not part of a single-line comment (`//`), a block comment opening (`/*`), or within backticks (`` ` ``). 
  */
  const NEW_LINE_PATTERN: [RegExp, TokenType] = [/^(?:(?!\n|\/\/|\/\*|`)[^\S\n])/, 'NEWLINE']

  // Regular expressions for the different tokens, ensure to include all necessary patterns
  const tokenPatterns: [RegExp, TokenType][] = [
    [/^[ \t\r\f\v]+/, 'WHITESPACE'], // Ignore whitespace
    [/^@/, 'MACRO_START'],
    [/^\(/, 'PAREN_OPEN'],
    [/^\)/, 'PAREN_CLOSE'],
    [/^\[/, 'BRACKET_OPEN'],
    [/^\]/, 'BRACKET_CLOSE'],
    [/^\{/, 'CURLY_OPEN'],
    [/^\}/, 'CURLY_CLOSE'],
    [/^,/, 'COMMA'],
    [/^;/, 'SEMICOLON'],    
    [/^-->/, 'ARROW_CHAIN'],
    [/^-=>/, 'ARROW_BRANCH'],
    [/^\$[a-zA-Z_]\w*/, 'VARIABLE'],
    [/^"[^"\\]*(\\.[^"\\]*)*"/, 'STRING_LITERAL'], // String literals with escape characters
    [/^\d+(\.\d+)?/, 'NUMBER_LITERAL'],
    [/^(?:&&|\|\|)/, 'LOGICAL_OPERATOR'],
    [/^(?:==|===|!=|<=|>=|<|>|<==>]|>==<|>==\||\|==<)/, 'COMPARISON_OPERATOR'],
    [/^=/, 'ASSIGNMENT'],
    [/^const\b/, 'CONST'],
    [/^let\b/, 'LET'],
    [/^var\b/, 'VAR'],
    [/^if\b/, 'IF'],
    [/^else\b/, 'ELSE'],
    [/^elif\b/, 'ELIF'],
    [/^for\b/, 'FOR'],
    [/^while\b/, 'WHILE'],
    [/^do\b/, 'DO'],
    [/^switch\b/, 'SWITCH'],
    [/^case\b/, 'CASE'],
    [/^break\b/, 'BREAK'],
    [/^continue\b/, 'CONTINUE'],
    [/^return\b/, 'RETURN'],
    [/^try\b/, 'TRY'],
    [/^catch\b/, 'CATCH'],
    [/^finally\b/, 'FINALLY'],
    [/^throw\b/, 'THROW'],
    [/^goto\b/, 'GOTO'],
    [/^with\b/, 'WITH'],
    [/^yield\b/, 'YIELD'],
    [/^async\b/, 'ASYNC'],
    [/^await\b/, 'AWAIT'],
    [/^true\b/, 'BOOLEAN_LITERAL'],
    [/^false\b/, 'BOOLEAN_LITERAL'],
    [/^acl\.required\b/, 'ACL_REQUIRED'],
    [/^acl\.denied\b/, 'ACL_DENIED'],
    [/^[a-zA-Z_]\w*/, 'IDENTIFIER'],
    // executable string literals
    [/^`[^`\\]*(\\.[^`\\]*)*`/, 'EXECUTABLE_STRING_LITERAL'],
    [/^\/\/.*/, 'COMMENT'], // Single line comments
    [/^\n/, 'NEWLINE'],
    // multi line comment support
    [/^\/\*/, 'COMMENT'],
    [/^\*\//, 'COMMENT'],
    // EOF
    [/^$/, 'EOF'],    
  ];

  // Function to update position
  const updatePosition = (text: string) => {
    for (let char of text) {
      if (char === '\n') {
        position.line++;
        position.column = 0;
      } else {
        position.column++;
      }
    }
  };

  while (input.length > 0) {
    let matched = false;

    for (const [pattern, type] of tokenPatterns) {
      const match = pattern.exec(input);
      if (match) {
        const [text] = match;

        switch(type)  {
          case 'NEWLINE': {
            if (ignoreNewLines === false) {
              tokens.push({ type, value: text, position: { ...position } });
            }
            break;
          }
          case 'WHITESPACE': {
            if (ignoreWhitespace === false) {
              tokens.push({ type, value: text, position: { ...position } });
            }
            break;
          }
          case 'COMMENT': {
            if (ignoreComments === false) {
              tokens.push({ type, value: text, position: { ...position } });
            }
            break;
          }
          default: {
            tokens.push({ type, value: text, position: { ...position } });
          }
        }
        updatePosition(text);
        input = input.slice(text.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      throw new Error(`Unexpected token at line ${position.line}, column ${position.column}`);
    }
  }

  // Add EOF token
  tokens.push({ type: 'EOF', value: '', position: { ...position } });

  return tokens;
};

export default tokenize;