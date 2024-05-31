import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._08_PrintNameConditionallyMultiLine;
const tokens: Token[] = [
  {
    type: "IF",
    value: "if",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 3,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 1,
      column: 4,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 1,
      column: 5,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "COMPARISON_OPERATOR",
    value: "==",
    position: {
      line: 1,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"John\"",
    position: {
      line: 1,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 1,
      column: 20,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 1,
      column: 22,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 23,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: "  ",
    position: {
      line: 2,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 2,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 2,
      column: 3,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"Hello, John!\"",
    position: {
      line: 2,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 23,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 2,
      column: 24,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "CURLY_CLOSE",
    value: "}",
    position: {
      line: 3,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 3,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
    },
  },
];

export default {
  source,
  tokens
}