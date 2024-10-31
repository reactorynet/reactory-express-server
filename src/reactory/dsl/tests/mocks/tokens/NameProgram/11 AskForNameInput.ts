import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._11_AskForNameInput;
const tokens: Token[] = [
  {
    type: "DIRECTIVE",
    value: "# host web",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 2,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 5,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 2,
      column: 6,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 2,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "form",
    position: {
      line: 2,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"core-test.WhatIsYourName@1.0.0\"",
    position: {
      line: 2,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 46,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
    },
  },
  {
    type: 'EOF',
    value: '',
    position: {
      line: 2,
      column: 47,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs'
    }
  }
];

export default {
  source,
  tokens
}