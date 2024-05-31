import tokenize from "../compiler/parser/lexer";
import { Token, TokenType, TokenizerOptions } from "@reactory/server-core/types/compiler/lexer";
import TokenMocks from "./mocks/tokens";

const { 
  _01_VariableDeclaration,
  _02_PrintHelloWorld,
  _03_PrintNameVariable,
  _04_PrintNameAndHelloWorld,
  _05_PrintNameAndNumbers,
  _06_PrintNameConditionally,
  _07_PrintNameWithStringInterpolation,
  _08_PrintNameConditionallyMultiLine,
  _09_PrintNameInWhileLoop,
  _10_PrintNameInForLoop,
  _11_AskForNameInput,
  _12_SearchForName,
  _13_DisplayResults
} = TokenMocks._01_NameProgram

describe('Lexer', () => { 
  let options: TokenizerOptions = {
    ignoreComments: false,
    ignoreWhitespace: false,
    ignoreNewLines: false,
  };

  beforeEach(() => { 
    jest.clearAllMocks();
  });

  it('01. It should tokenize a variable declaration', () => {
    expect(
      tokenize(_01_VariableDeclaration.source, { 
        ...options, 
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/01 VariableDeclaration.rxs' 
      }))
      .toEqual(_01_VariableDeclaration.tokens);
  });

  it('02. It should tokenize a print hello world program', () => {    
    expect(
      tokenize(_02_PrintHelloWorld.source, { 
        ...options, 
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs' 
      }))
        .toEqual(_02_PrintHelloWorld.tokens);

  });

  it('03. It should tokenize a macro with a function and a variable param', () => {
    expect(
      tokenize(_03_PrintNameVariable.source, { 
        ...options, 
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs' 
      }))
        .toEqual(_03_PrintNameVariable.tokens);
  });

  it('04. It should tokenize a macro with a function with variable and string literal param', () => {
    expect(
      tokenize(_04_PrintNameAndHelloWorld.source, { 
        ...options, 
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs' 
      }))
        .toEqual(_04_PrintNameAndHelloWorld.tokens);
  });

  
  it('05. It should tokenize a macro with a function with a variable ', () => {    
    expect(
      tokenize(_05_PrintNameAndNumbers.source, { 
        ...options, 
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs' 
      }))
        .toEqual(_05_PrintNameAndNumbers.tokens);
  });
  
  it('06. It should tokenize a macro with a conditional', () => {
    expect(
      tokenize(_06_PrintNameConditionally.source, { 
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs'
        }))
        .toEqual(_06_PrintNameConditionally.tokens);
  });

  it('07. It should tokenize a macro with string interpolation', () => {    
    expect(
      tokenize(_07_PrintNameWithStringInterpolation.source, { 
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs'
      }))
      .toEqual(_07_PrintNameWithStringInterpolation.tokens);
  });

  it('08. It should tokenize a multi line macro with with a conditional', () => {  
    expect(
      tokenize(_08_PrintNameConditionallyMultiLine.source, { 
        ...options, 
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs'
      }))
        .toEqual(_08_PrintNameConditionallyMultiLine.tokens);
  });

  it('09. It should tokenize a multiline macro with a while loop', () => {    
    expect(
      tokenize(_09_PrintNameInWhileLoop.source, { 
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/09 PrintNameInWhileLoop.rxs'
      }))
        .toEqual(_09_PrintNameInWhileLoop.tokens);
  });

  it('10. It should tokenize a multiline macro with a for loop', () => {    
    expect(
      tokenize(_10_PrintNameInForLoop.source, {
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs'
      }))
        .toEqual(_10_PrintNameInForLoop.tokens);
  });

  it('11. It should tokenize a macro with a input', () => {    
    expect(
      tokenize(_11_AskForNameInput.source, {
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs'
      }))
        .toEqual(_11_AskForNameInput.tokens);
  });
  
  it('12. It should tokenize a macro with a search', () => {    
    expect(
      tokenize  (_12_SearchForName.source, {
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs'
      }))
        .toEqual(_12_SearchForName.tokens);
  });

  it('13. It should tokenize a macro with a search', () => {    
    expect(
      tokenize(_13_DisplayResults.source, {
        ...options,
        inputId: 'reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs'
      }))
        .toEqual(_13_DisplayResults.tokens);
  });
});