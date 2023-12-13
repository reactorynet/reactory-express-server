import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';
const source = NameProgram._01_VariableDeclaration;
const tokens: Token[] = [
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
];

export default {
  source,
  tokens
}