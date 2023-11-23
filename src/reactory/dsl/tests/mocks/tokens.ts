import { Token } from "types/compiler/lexer";

const multiLineMacro = `
if ($name == "John") {
  @print("Hello, John!")
}
`;

const multiLineMacroTokens: Token[] = [
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 1,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 2,
      column: 0,
    },
  },
  {
    type: "IF",
    value: "if",
    position: {
      line: 2,
      column: 3,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 5,
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 6,
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 2,
      column: 7,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 12,
    },
  },
  {
    type: "COMPARISON_OPERATOR",
    value: "==",
    position: {
      line: 2,
      column: 13,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 15,
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"John\"",
    position: {
      line: 2,
      column: 16,
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 22,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 23,
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 2,
      column: 24,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 2,
      column: 25,
    },
  },
  {
    type: "WHITESPACE",
    value: "     ",
    position: {
      line: 3,
      column: 0,
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 3,
      column: 5,
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 3,
      column: 6,
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 3,
      column: 11,
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"Hello, John!\"",
    position: {
      line: 3,
      column: 12,
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 3,
      column: 26,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 3,
      column: 27,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 4,
      column: 0,
    },
  },
  {
    type: "CURLY_CLOSE",
    value: "}",
    position: {
      line: 4,
      column: 3,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 4,
      column: 4,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 5,
      column: 0,
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 5,
      column: 3,
    },
  },
]

export const MultineLineWithSingleLineComment: Token[] = [
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 1,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 2,
      column: 0,
    },
  },
  {
    type: "COMMENT",
    value: "// This is a comment.",
    position: {
      line: 2,
      column: 3,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 2,
      column: 24,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 3,
      column: 0,
    },
  },
  {
    type: "IF",
    value: "if",
    position: {
      line: 3,
      column: 3,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 5,
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 3,
      column: 6,
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 3,
      column: 7,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 12,
    },
  },
  {
    type: "COMPARISON_OPERATOR",
    value: "==",
    position: {
      line: 3,
      column: 13,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 15,
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"John\"",
    position: {
      line: 3,
      column: 16,
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 3,
      column: 22,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 23,
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 3,
      column: 24,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 3,
      column: 25,
    },
  },
  {
    type: "WHITESPACE",
    value: "     ",
    position: {
      line: 4,
      column: 0,
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 4,
      column: 5,
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 4,
      column: 6,
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 4,
      column: 11,
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"Hello, John!\"",
    position: {
      line: 4,
      column: 12,
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 4,
      column: 26,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 4,
      column: 27,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 5,
      column: 0,
    },
  },
  {
    type: "CURLY_CLOSE",
    value: "}",
    position: {
      line: 5,
      column: 3,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 5,
      column: 4,
    },
  },
  {
    type: "WHITESPACE",
    value: "   ",
    position: {
      line: 6,
      column: 0,
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 6,
      column: 3,
    },
  },
];

export const MultiLineWithMultiLineComment: Token[] = [];

export const TokenisationMap: { [key: string]: Token[] } = {
  'var name = "John";': [
    {
      type: "IDENTIFIER",
      value: "var",
      position: {
        line: 1,
        column: 1,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 4,
      },
    },
    {
      type: "IDENTIFIER",
      value: "name",
      position: {
        line: 1,
        column: 5,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 9,
      },
    },
    {
      type: "ASSIGNMENT",
      value: "=",
      position: {
        line: 1,
        column: 10,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 11,
      },
    },
    {
      type: "STRING_LITERAL",
      value: '"John"',
      position: {
        line: 1,
        column: 12,
      },
    },
    {
      type: "SEMICOLON",
      value: ";",
      position: {
        line: 1,
        column: 18,
      },
    },
    {
      type: "EOF",
      value: "",
      position: {
        line: 1,
        column: 19,
      },
    },
  ],
  '@print("Hello, World!")': [
    { type: "MACRO_START", value: "@", position: { line: 1, column: 1 } },
    { type: "IDENTIFIER", value: "print", position: { line: 1, column: 2 } },
    { type: "PAREN_OPEN", value: "(", position: { line: 1, column: 7 } },
    {
      type: "STRING_LITERAL",
      value: '"Hello, World!"',
      position: { line: 1, column: 8 },
    },
    { type: "PAREN_CLOSE", value: ")", position: { line: 1, column: 23 } },
    { type: "EOF", value: "", position: { line: 1, column: 24 } },
  ],
  "@print($name)": [
    { type: "MACRO_START", value: "@", position: { line: 1, column: 1 } },
    { type: "IDENTIFIER", value: "print", position: { line: 1, column: 2 } },
    { type: "PAREN_OPEN", value: "(", position: { line: 1, column: 7 } },
    { type: "VARIABLE", value: "$name", position: { line: 1, column: 8 } },
    { type: "PAREN_CLOSE", value: ")", position: { line: 1, column: 13 } },
    { type: "EOF", value: "", position: { line: 1, column: 14 } },
  ],
  '@print($name, "Hello, World!")': [
    { type: "MACRO_START", value: "@", position: { line: 1, column: 1 } },
    { type: "IDENTIFIER", value: "print", position: { line: 1, column: 2 } },
    { type: "PAREN_OPEN", value: "(", position: { line: 1, column: 7 } },
    { type: "VARIABLE", value: "$name", position: { line: 1, column: 8 } },
    { type: "COMMA", value: ",", position: { line: 1, column: 13 } },
    {
      type: "STRING_LITERAL",
      value: '"Hello, World!"',
      position: { line: 1, column: 15 },
    },
    { type: "PAREN_CLOSE", value: ")", position: { line: 1, column: 30 } },
    { type: "EOF", value: "", position: { line: 1, column: 31 } },
  ],
  "@print($name, 123)": [
    {
      type: "MACRO_START",
      value: "@",
      position: {
        line: 1,
        column: 1,
      },
    },
    {
      type: "IDENTIFIER",
      value: "print",
      position: {
        line: 1,
        column: 2,
      },
    },
    {
      type: "PAREN_OPEN",
      value: "(",
      position: {
        line: 1,
        column: 7,
      },
    },
    {
      type: "VARIABLE",
      value: "$name",
      position: {
        line: 1,
        column: 8,
      },
    },
    {
      type: "COMMA",
      value: ",",
      position: {
        line: 1,
        column: 13,
      },
    },
    {
      type: "NUMBER_LITERAL",
      value: "123",
      position: {
        line: 1,
        column: 15,
      },
    },
    {
      type: "PAREN_CLOSE",
      value: ")",
      position: {
        line: 1,
        column: 18,
      },
    },
    {
      type: "EOF",
      value: "",
      position: {
        line: 1,
        column: 19,
      },
    },
  ],
  '@if ($name == "John") { @print("Hello, John!") }': [
    {
      type: "MACRO_START",
      value: "@",
      position: {
        line: 1,
        column: 1,
      },
    },
    {
      type: "IF",
      value: "if",
      position: {
        line: 1,
        column: 2,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 4,
      },
    },
    {
      type: "PAREN_OPEN",
      value: "(",
      position: {
        line: 1,
        column: 5,
      },
    },
    {
      type: "VARIABLE",
      value: "$name",
      position: {
        line: 1,
        column: 6,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 11,
      },
    },
    {
      type: "COMPARISON_OPERATOR",
      value: "==",
      position: {
        line: 1,
        column: 12,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 14,
      },
    },
    {
      type: "STRING_LITERAL",
      value: '"John"',
      position: {
        line: 1,
        column: 15,
      },
    },
    {
      type: "PAREN_CLOSE",
      value: ")",
      position: {
        line: 1,
        column: 21,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 22,
      },
    },
    {
      type: "CURLY_OPEN",
      value: "{",
      position: {
        line: 1,
        column: 23,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 24,
      },
    },
    {
      type: "MACRO_START",
      value: "@",
      position: {
        line: 1,
        column: 25,
      },
    },
    {
      type: "IDENTIFIER",
      value: "print",
      position: {
        line: 1,
        column: 26,
      },
    },
    {
      type: "PAREN_OPEN",
      value: "(",
      position: {
        line: 1,
        column: 31,
      },
    },
    {
      type: "STRING_LITERAL",
      value: '"Hello, John!"',
      position: {
        line: 1,
        column: 32,
      },
    },
    {
      type: "PAREN_CLOSE",
      value: ")",
      position: {
        line: 1,
        column: 46,
      },
    },
    {
      type: "WHITESPACE",
      value: " ",
      position: {
        line: 1,
        column: 47,
      },
    },
    {
      type: "CURLY_CLOSE",
      value: "}",
      position: {
        line: 1,
        column: 48,
      },
    },
    {
      type: "EOF",
      value: "",
      position: {
        line: 1,
        column: 49,
      },
    },
  ],
  "@print(`Hello, @var($name)`)": [
    {
      type: "MACRO_START",
      value: "@",
      position: {
        line: 1,
        column: 1,
      },
    },
    {
      type: "IDENTIFIER",
      value: "print",
      position: {
        line: 1,
        column: 2,
      },
    },
    {
      type: "PAREN_OPEN",
      value: "(",
      position: {
        line: 1,
        column: 7,
      },
    },
    {
      type: "EXECUTABLE_STRING_LITERAL",
      value: "`Hello, @var($name)`",
      position: {
        line: 1,
        column: 8,
      },
    },
    {
      type: "PAREN_CLOSE",
      value: ")",
      position: {
        line: 1,
        column: 28,
      },
    },
    {
      type: "EOF",
      value: "",
      position: {
        line: 1,
        column: 29,
      },
    },
  ],
  "\n    if ($name == \"John\") {\n      @print(\"Hello, John!\")\n    }\n    ": multiLineMacroTokens,
};
