import { Token, Tokenizer, TokenType, TokenizerOptions } from '@reactory/server-core/types/compiler/lexer';

// Default options for the tokenizer
const DEFAULT_OPTIONS: TokenizerOptions = {
  ignoreWhitespace: false,
  ignoreComments: false,
  ignoreNewLines: false,
};

// The tokenizer function takes a string of macro code and returns an array of tokens
const tokenize: Tokenizer = (input: string, options: TokenizerOptions = DEFAULT_OPTIONS): Token[] => {
  const { ignoreWhitespace, ignoreComments, ignoreNewLines, inputId } = options;
  const tokens: Token[] = [];
  let position = { line: 1, column: 1, src: inputId };

  
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
    [/^\n/, 'NEWLINE'],
    [/^[ \t\r\f\v]+/, 'WHITESPACE'], // Ignore whitespace
    // place comments before operators to ensure that comments are matched first
    [/^\/\/.*/, 'COMMENT'], // Single line comments
    // multi line comment support
    [/^\/\*/, 'COMMENT'],
    [/^\*\//, 'COMMENT'],

    [/^-->/, 'ARROW_CHAIN'],
    [/^-=>/, 'ARROW_BRANCH'],
    [/^\+/, 'ARITHMETIC_OPERATOR'],
    [/^-/, 'ARITHMETIC_OPERATOR'],
    [/^\*/, 'ARITHMETIC_OPERATOR'],
    [/^\//, 'ARITHMETIC_OPERATOR'],
    [/^%/, 'ARITHMETIC_OPERATOR'],
    [/^\*\*/, 'ARITHMETIC_OPERATOR'],
    [/^@/, 'MACRO_START'],
    [/^\(/, 'PAREN_OPEN'],
    [/^\)/, 'PAREN_CLOSE'],
    [/^\[/, 'BRACKET_OPEN'],
    [/^\]/, 'BRACKET_CLOSE'],
    [/^\{/, 'CURLY_OPEN'],
    [/^\}/, 'CURLY_CLOSE'],
    [/^,/, 'COMMA'],
    [/^;/, 'SEMICOLON'],
    [/^\$[a-zA-Z_]\w*((\.\w+)|(\?\.\w+))*/, 'VARIABLE'],
    //[/^\$[a-zA-Z_]\w*/, 'VARIABLE'],
    [/^"[^"\\]*(\\.[^"\\]*)*"/, 'STRING_LITERAL'], // String literals with escape characters
    [/^\d+(\.\d+)?/, 'NUMBER_LITERAL'],
    [/^(?:&&|\|\|)/, 'LOGICAL_OPERATOR'],
    [/^(?:==|===|!=|<|>)/, 'COMPARISON_OPERATOR'],
    [/^(?:<=|>=)/, 'COMPARISON_OPERATOR'],
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
    [/^#/, 'DIRECTIVE'],
    // executable string literals
    [/^`[^`\\]*(\\.[^`\\]*)*`/, 'EXECUTABLE_STRING_LITERAL'],
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

  let workingInput = input; // don't mutate the input string

  while (workingInput.length > 0) {
    let matched = false;

    for (const [pattern, type] of tokenPatterns) {
      const match = pattern.exec(workingInput);
      let offset = 0;
      if (match) {
        let [text] = match;

        switch(type)  {
          case 'VARIABLE': {
            var components = text.split('.');
            if (components.length > 1) {
              tokens.push({ type, value: components[0], position: { ...position } });
              // ensure that the dot is also added as a token
              // loop through the remaining components and add them as tokens
              for (let i = 1; i < components.length; i++) {
                tokens.push({ type: 'DOT', value: '.', position: { ...position } });
                tokens.push({ type: 'IDENTIFIER', value: components[i], position: { ...position } });
              }              
            } else {
              tokens.push({ type, value: text, position: { ...position } });
            }
            break;
          }
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
          case 'DIRECTIVE': {
            // the directive token is represented by the # character 
            // and is followed by a directive name with options following the directive name
            // using spaces to separate the directive name and the options
            // i.e. # directiveName option1 option2 option3
            // the directive name and options are separated by spaces

            // we need to find the end of the directive
            // we can do this by looking for the first occurence of '\n'

            const endOfDirectiveIndex = workingInput.indexOf('\n');
            const directiveBlock = workingInput.slice(0, endOfDirectiveIndex);

            text = directiveBlock;
            offset = workingInput.startsWith('\n') ? 1 : 0;
            tokens.push({ type, value: directiveBlock, position: { ...position } });
            break;
          }
          case 'COMMENT': {
            // we need to determine the type of comment
            // whether it is a single line comment or a multi line comment
            // we can do this by looking at the first two characters
            // if the first two characters are '/*' then it is a multi line comment
            // otherwise it is a single line comment
            const isMultiLineComment = text.startsWith('/*');
            let commentBlock = '';

            if (isMultiLineComment === true) {
              // we need to find the end of the block comment
              // we can do this by looking for the first occurence of '*/'
              // we can then slice the text from the start of the comment to the end of the comment
              const endOfCommentIndex = workingInput.indexOf('*/');
              commentBlock = workingInput.slice(0, endOfCommentIndex + 2);
            } else {
              // we need to find the end of the line
              // we can do this by looking for the first occurence of '\n'
              // we can then slice the text from the start of the comment to the end of the comment
              const endOfCommentIndex = workingInput.indexOf('\n');
              if (endOfCommentIndex === -1) {
                // No newline found, take the rest of the input
                commentBlock = workingInput;
              } else {
                commentBlock = workingInput.slice(0, endOfCommentIndex);
              }
            }
            text = commentBlock;
            offset = 0; // No offset needed since we're not including the newline in the comment
            if (ignoreComments === false) {
              tokens.push({ type, value: commentBlock, position: { ...position } });
            }
            break;
          }
          default: {
            tokens.push({ type, value: text, position: { ...position } });
          }
        }
        updatePosition(text);
        workingInput = workingInput.slice(text.length + offset);
        matched = true;
        break;
      }
    }

    if (!matched) {
      throw new Error(`Unexpected token at line ${position.line}, column ${position.column}: "${workingInput.split('\n')[0]}"`);
    }
  }

  // Only remove trailing newlines if they come after the last meaningful token
  // and there are multiple consecutive newlines at the end
  let trailingNewlines = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].type === 'NEWLINE') {
      trailingNewlines++;
    } else {
      break;
    }
  }
  
  // If we have more than one trailing newline, remove the extra ones
  if (trailingNewlines > 1) {
    tokens.splice(tokens.length - trailingNewlines + 1);
  }

  // Reset position to the last valid token's position
  if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1];
    position = { ...lastToken.position };
    // Advance position to the end of the last token
    if (lastToken.value) {
      position.column += lastToken.value.length;
    }
  }

  // Add EOF token
  tokens.push({ type: 'EOF', value: '', position: { ...position } });

  return tokens;
};

export default tokenize;