import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';
const source = NameProgram._01_VariableDeclaration;
const tokens: Token[] = [
  {
    type: "VAR",
    value: "var",
    position: {
      line: 1,
      column: 1,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 4,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "IDENTIFIER",
    value: "name",
    position: {
      line: 1,
      column: 5,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 9,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 1,
      column: 10,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 1,
      column: 11,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "STRING_LITERAL",
    value: '"John"',
    position: {
      line: 1,
      column: 12,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 1,
      column: 18,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 1,
      column: 19,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs',
    },
  },
];

export default {
  source,
  tokens
}