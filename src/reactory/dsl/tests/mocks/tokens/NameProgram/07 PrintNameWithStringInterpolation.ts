import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._07_PrintNameWithStringInterpolation
const tokens: Token[] = [
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 1,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 1,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
    },
  },
  {
    type: "EXECUTABLE_STRING_LITERAL",
    value: "`Hello $name`",
    position: {
      line: 1,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 1,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 1,
      column: 22,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
    },
  },
];

export default {
  source,
  tokens
}