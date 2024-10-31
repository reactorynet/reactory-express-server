import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._06_PrintNameConditionally;
const tokens: Token[] = [
  {
    type: "IF",
    value: "if",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 1,
      column: 3,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 1,
      column: 4,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "COMPARISON_OPERATOR",
    value: "==",
    position: {
      line: 1,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"John\"",
    position: {
      line: 1,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 1,
      column: 19,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 20,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 1,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 22,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 1,
      column: 23,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 1,
      column: 24,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 1,
      column: 29,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"Hello, John!\"",
    position: {
      line: 1,
      column: 30,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 1,
      column: 44,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 45,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "CURLY_CLOSE",
    value: "}",
    position: {
      line: 1,
      column: 46,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 47,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 2,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
    },
  },
];

export default {
  source,
  tokens
}