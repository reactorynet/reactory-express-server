import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._09_PrintNameInWhileLoop;
const tokens: Token[] = [
  {
    type: "WHILE",
    value: "while",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 1,
      column: 6,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$count",
    position: {
      line: 1,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "COMPARISON_OPERATOR",
    value: "<",
    position: {
      line: 1,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 15,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "NUMBER_LITERAL",
    value: "10",
    position: {
      line: 1,
      column: 16,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 1,
      column: 18,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 19,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 1,
      column: 20,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: "  ",
    position: {
      line: 2,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 2,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 2,
      column: 3,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "EXECUTABLE_STRING_LITERAL",
    value: "`Hello $name, $count`",
    position: {
      line: 2,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 30,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 2,
      column: 31,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "CURLY_CLOSE",
    value: "}",
    position: {
      line: 3,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 3,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 4,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs",
    },
  },
];

export default {
  source,
  tokens
}