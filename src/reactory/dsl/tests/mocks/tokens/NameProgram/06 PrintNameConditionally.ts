import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._06_PrintNameConditionally;
const tokens: Token[] = [
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
    value: "    ",
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
      column: 4,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 6,
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 7,
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 2,
      column: 8,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 13,
    },
  },
  {
    type: "COMPARISON_OPERATOR",
    value: "==",
    position: {
      line: 2,
      column: 14,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 16,
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"John\"",
    position: {
      line: 2,
      column: 17,
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 23,
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 24,
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 2,
      column: 25,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 2,
      column: 26,
    },
  },
  {
    type: "WHITESPACE",
    value: "      ",
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
      column: 6,
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 3,
      column: 7,
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 3,
      column: 12,
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"Hello, John!\"",
    position: {
      line: 3,
      column: 13,
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 3,
      column: 27,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 3,
      column: 28,
    },
  },
  {
    type: "WHITESPACE",
    value: "    ",
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
      column: 4,
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 4,
      column: 5,
    },
  },
  {
    type: "WHITESPACE",
    value: "    ",
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
      column: 4,
    },
  },
];

export default {
  source,
  tokens
}