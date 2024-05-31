import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._03_PrintNameVariable;
const tokens: Token[] = [
  { 
    type: "MACRO_START", 
    value: "@", 
    position: { 
      line: 1, 
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs" 
    } 
  },
  { 
    type: "IDENTIFIER", 
    value: "print", 
    position: { 
      line: 1, 
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs"  
    } },
  { 
    type: "PAREN_OPEN", 
    value: "(", 
    position: 
    { 
      line: 1, 
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs"  
    } 
  },
  { 
    type: "VARIABLE", 
    value: "$name", 
    position: { 
      line: 1, 
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs"  
    } 
  },
  { 
    type: "PAREN_CLOSE", 
    value: ")", 
    position: { 
      line: 1, 
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs"  
    } 
  },
  { 
    type: "EOF", 
    value: "", 
    position: { 
      line: 1, 
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs"  
    } 
  },
];

export default {
  source,
  tokens
}