// Token types specific to the macro language
export type TokenType =
  | 'IDENTIFIER'          // Matches macro names and variable names
  | 'MACRO_START'         // Matches '@' which denotes the start of a macro
  | 'PAREN_OPEN'          // Matches '('
  | 'PAREN_CLOSE'         // Matches ')'
  | 'BRACKET_OPEN'        // Matches '['
  | 'BRACKET_CLOSE'       // Matches ']'
  | 'CURLY_OPEN'          // Matches '{'
  | 'CURLY_CLOSE'         // Matches '}'
  | 'COMMA'               // Matches ','
  | 'SEMICOLON'           // Matches ';'
  | 'ARROW_CHAIN'         // Matches '-->'
  | 'ARROW_BRANCH'        // Matches '-=>'
  | 'VARIABLE'            // Matches '$' followed by a variable name
  | 'STRING_LITERAL'      // Matches string literals, e.g., "hello"
  | 'HEXADECIMAL_LITERAL' // Matches hexadecimal literals, e.g., '0x1234
  | 'BOOLEAN_LITERAL'     // Matches boolean literals, e.g., 'true', 'false'
  | 'EXECUTABLE_STRING_LITERAL' // Matches executable string literals, e.g., `hello ${name} or @print("hello")`
  | 'NUMBER_LITERAL'      // Matches numeric literals, e.g., 123, 45.67
  | 'LOGICAL_OPERATOR'    // Matches logical operators like '&&', '||'
  | 'COMPARISON_OPERATOR' // Matches comparison operators like '==', '!=', '<', '>'
  | 'ASSIGNMENT'          // Matches '='
  | 'EQUALS'              // Matches '==' or '==='
  | 'NOT_EQUALS'          // Matches '!=' or '!=='
  | 'NOT_OPERATOR'        // Matches '!'
  | 'ACL_REQUIRED'        // Matches acl.required
  | 'ACL_DENIED'          // Matches acl.denied
  | 'IF'                  // Matches 'if'
  | 'ELSE'                // Matches 'else'
  | 'ELIF'                // Matches 'elif'
  | 'FOR'                 // Matches 'for'
  | 'WHILE'               // Matches 'while'
  | 'DO'                  // Matches 'do'
  | 'GOTO'                // Matches 'goto'
  | 'WITH'                // Matches 'with'
  | 'YIELD'               // Matches 'yield'
  | 'ASYNC'               // Matches 'async'
  | 'AWAIT'               // Matches 'await'
  | 'SWITCH'              // Matches 'switch'
  | 'CASE'                // Matches 'case'
  | 'DEFAULT'             // Matches 'default'
  | 'BREAK'               // Matches 'break'
  | 'CONTINUE'            // Matches 'continue'
  | 'RETURN'              // Matches 'return'
  | 'TRY'                 // Matches 'try'
  | 'CATCH'               // Matches 'catch'
  | 'FINALLY'             // Matches 'finally'
  | 'THROW'               // Matches 'throw'
  | 'LOOP_WHILE'          // Matches 'while'
  | 'LOOP_FOR'            // Matches 'for'
  | 'CONST'               // Matches 'const'
  | 'LET'                 // Matches 'let'
  | 'VAR'                 // Matches 'var'
  | 'ERROR'               // Used to indicate lexical errors
  | 'KEYWORD'            
  | 'WHITESPACE'          // Matches whitespace
  | 'COMMENT'             // Matches comments
  | 'NEWLINE'             // Matches newlines
  | 'EOF';                // Matches end of file

// Token type definition
export interface Token {
  type: TokenType;
  value: string;
  position: {
    line: number;
    column: number;
  };
}

export interface TokenizerOptions {
  ignoreWhitespace?: boolean;
  ignoreComments?: boolean;
  ignoreNewLines?: boolean;
}

export type Tokenizer = (input: string, options: TokenizerOptions) => Token[];