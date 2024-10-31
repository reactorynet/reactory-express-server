import NameProgram from "@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram";
import { Token } from "@reactory/server-core/types/compiler/lexer";

const source = NameProgram._02_PrintHelloWorld;
const tokens: Token[] = [
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "print",
    position: {
      line: 1,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 1,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: '"Hello, World!"',
    position: {
      line: 1,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
    },
  },
  { 
    type: "PAREN_CLOSE",
    value: ")", 
    position: { 
      line: 1, 
      column: 23,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs',  
    }, 
  },
  { 
    type: "EOF", 
    value: "", 
    position: { 
      line: 1, 
      column: 24,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs',  
    } 
  },
];

export default {
  source,
  tokens,
};
