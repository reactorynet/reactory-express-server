import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._04_PrintNameAndHelloWorld;
const tokens: Token[] = [
  { 
    type: "MACRO_START", 
    value: "@", 
    position: { 
      line: 1, 
      column: 1,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs' 
    } 
  },
  { 
    type: "IDENTIFIER", 
    value: "print", 
    position: { 
      line: 1, 
      column: 2,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs'  
    } 
  },
  { 
    type: "PAREN_OPEN", 
    value: "(", 
    position: { 
      line: 1, 
      column: 7,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs'  
    } 
  },
  { 
    type: "VARIABLE", 
    value: "$name", 
    position: { 
      line: 1, 
      column: 8,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs'  
    } 
  },
  { 
    type: "COMMA", 
    value: ",", 
    position: { 
      line: 1, 
      column: 13,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs'  
    } 
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: { 
      line: 1, 
      column: 14,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs',  
    },  
  },
  {
    type: "STRING_LITERAL",
    value: '"Hello, World!"',
    position: { 
      line: 1, 
      column: 15,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs',  
    },
  },
  { 
    type: "PAREN_CLOSE", 
    value: ")", 
    position: { 
      line: 1, 
      column: 30,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs'  
    } 
  },
  { 
    type: "EOF", 
    value: "", 
    position: { 
      line: 1, 
      column: 31,
      src: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs'  
    } 
  },
];

export default {
  source,
  tokens
}