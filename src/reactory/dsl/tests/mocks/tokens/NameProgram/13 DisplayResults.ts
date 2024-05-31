import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._13_DisplayResults ;
const tokens: Token[] = [
  {
    type: "DIRECTIVE",
    value: "# host cli",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 2,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "show",
    position: {
      line: 2,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 5,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "result",
    position: {
      line: 2,
      column: 6,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 2,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
    },
  },
]

export default {
  source,
  tokens
}