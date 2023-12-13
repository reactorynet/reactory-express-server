import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._05_PrintNameAndNumbers;
const tokens: Token[] = [
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
];

export default {
  source,
  tokens
}