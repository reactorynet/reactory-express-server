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
      tokenize(_01_VariableDeclaration.source, options))
        .toEqual(_01_VariableDeclaration.tokens);
  });

  it('02. It should tokenize a print hello world program', () => {    
    expect(
      tokenize(_02_PrintHelloWorld.source, options))
        .toEqual(_02_PrintHelloWorld.tokens);

  });

  it('03. It should tokenize a macro with a function and a variable param', () => {
    expect(
      tokenize(_03_PrintNameVariable.source, options))
        .toEqual(_03_PrintNameVariable.tokens);
  });

  // it('04. It should tokenize a macro with a function with variable and string literal param', () => {
  //   expect(
  //     tokenize(_04_PrintNameAndHelloWorld.source, options))
  //       .toEqual(_04_PrintNameAndHelloWorld.tokens);
  // });

  
  // it('05. It should tokenize a macro with a function with a variable ', () => {    
  //   expect(
  //     tokenize(_05_PrintNameAndNumbers.source, options))
  //       .toEqual(_05_PrintNameAndNumbers.tokens);
  // });
  
  // it('06. It should tokenize a macro with a conditional', () => {
  //   expect(
  //     tokenize(_06_PrintNameConditionally.source, options))
  //       .toEqual(_06_PrintNameConditionally.tokens);
  // });

  // it('07. It should tokenize a macro with string interpolation', () => {    
  //   expect(
  //     tokenize(_07_PrintNameWithStringInterpolation.source, options))
  //       .toEqual(_07_PrintNameWithStringInterpolation.tokens);
  // });

  // it('08. It should tokenize a multi line macro with with a conditional', () => {  
  //   expect(
  //     tokenize(_08_PrintNameConditionallyMultiLine.source, options))
  //       .toEqual(_08_PrintNameConditionallyMultiLine.tokens);
  // });

  // it('09. It should tokenize a multiline macro with a while loop', () => {    
  //   expect(
  //     tokenize(_09_PrintNameInWhileLoop.source, options))
  //       .toEqual(_09_PrintNameInWhileLoop.tokens);
  // });

  // it('10. It should tokenize a multiline macro with a for loop', () => {    
  //   expect(
  //     tokenize(_10_PrintNameInForLoop.source, options))
  //       .toEqual(_10_PrintNameInForLoop.tokens);
  // });

  // it('11. It should tokenize a macro with a input', () => {    
  //   expect(
  //     tokenize(_11_AskForNameInput.source, options))
  //       .toEqual(_11_AskForNameInput.tokens);
  // });

  // it('12. It should tokenize a macro with a search', () => {    
  //   expect(
  //     tokenize(_12_SearchForName.source, options))
  //       .toEqual(_12_SearchForName.tokens);
  // });

  // it('13. It should tokenize a macro with a search', () => {    
  //   expect(
  //     tokenize(_13_DisplayResults.source, options))
  //       .toEqual(_13_DisplayResults.tokens);
  // });
});