import { CSTNode } from "types/compiler/cst";
import { createCST } from "../compiler/parser";
import { Token } from "@reactory/server-core/types/compiler/lexer";
import Tokens from "./mocks/tokens";
import { 
  NameProgram,
} from "./mocks/cst";
import Tokenize from '../compiler/parser/lexer';

const { 
  _01_NameProgram,
} = Tokens;

describe('CST', () => {
  // Basic test that ensure that the CST is created correctly and that
  // the root node is always Program
  it('Should create a CST node with type Program', () => {
    
    //given a token array
    const tokens: Token[] = _01_NameProgram._01_VariableDeclaration.tokens;

    //when we create a CST
    const cst = createCST(tokens);

    //then we expect the CST to have type Program
    expect(cst.type).toBe('Program');
  });

  it('Should create a valid CST for Name Program 01 VariableDeclaration', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._01_VariableDeclaration.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._01_VariableDeclaration);
  });

  it('Should create a valid CST for Name Program 02 PrintHelloWorld', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._02_PrintHelloWorld.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._02_PrintHelloWorld);
  });

  it('Should create a valid CST for Name Program 03 PrintNameVariable', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._03_PrintNameVariable.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._03_PrintNameVariable);
  });

  it('Should create a valid CST for Name Program 04 PrintNameAndHelloWorld', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._04_PrintNameAndHelloWorld.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._04_PrintNameAndHelloWorld);
  });

  it('Should create a valid CST for Name Program 05 PrintNameAndNumbers', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._05_PrintNameAndNumbers.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._05_PrintNameAndNumbers);
  });

  it('Should create a valid CST for Name Program 06 PrintNameConditionally', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._06_PrintNameConditionally.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._06_PrintNameConditionally);
  });

  it('Should create a valid CST for Name Program 07 PrintNameWithStringInterpolation', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._07_PrintNameWithStringInterpolation.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._07_PrintNameWithStringInterpolation);
  });

  it('Should create a valid CST for Name Program 08 PrintNameConditionallyMultiLine', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._08_PrintNameConditionallyMultiLine.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._08_PrintNameConditionallyMultiLine);
  });

  it('Should create a valid CST for Name Program 09 PrintNameInWhileLoop', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._09_PrintNameInWhileLoop.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._09_PrintNameInWhileLoop);
  });

  it('Should create a valid CST for Name Program 10 PrintNameInForLoop', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._10_PrintNameInForLoop.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._10_PrintNameInForLoop);
  });

  it('Should create a valid CST for Name Program 11 AskForNameInput', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._11_AskForNameInput.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._11_AskForNameInput);
  });

  it('Should create a valid CST for Name Program 12 SearchForName', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._12_SearchForName.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._12_SearchForName);
  });

  it('Should create a valid CST for Name Program 13 DisplayResults', () => {
    //given a token array 
    const tokens: Token[] = _01_NameProgram._13_DisplayResults.tokens;
    //when we create a CST
    const cst = createCST(tokens);
    // then we expect the CST to be equal to the mock CST
    expect(cst).toEqual(NameProgram._13_DisplayResults);
  });
});