import { CSTNode } from "types/compiler/cst";
import { createCST } from "../compiler/parser";
import { Token } from "@reactory/server-core/types/compiler/lexer";
import { TokenisationMap } from "./mocks/tokens";
import { 
  SingleLineHelloWorldProgramNode, 
  MultiLineWithConditionalProgramNode,
  MultiLineWithConditionalWithElseProgramNode,
  MultilineWithWhileLoopCSTProgramNode,
  MultiLineWithVariableAssignmentProgramNode
} from "./mocks/cst";
import Tokenize from '../compiler/parser/lexer';

describe('CST', () => {
  it('should create a CST node with type Program', () => {
    
    //given a token array
    const tokens: Token[] = TokenisationMap['@print("Hello, World!")'];

    //when we create a CST
    const cst = createCST(tokens);

    //then we expect the CST to have type Program
    expect(cst.type).toBe('Program');
    expect(cst).toEqual(SingleLineHelloWorldProgramNode);    
  });

  it('should create a CST node with if statement', () => { 
    const tokens = Tokenize(`
    if ($name == "John") {
      @print("Hello, John!")
    }
    `, { ignoreWhitespace: false, ignoreNewLines: false });

    const cst = createCST(tokens);

    expect(cst).toEqual(MultiLineWithConditionalProgramNode);
  });

  it('should create a CST node with an else statement', () => { 
    const tokens = Tokenize(`
    if ($name == "John") {
      @print("Hello, John!")
    } else {
      @print("Hello, Stranger!")
    }
    `, { ignoreWhitespace: false, ignoreNewLines: false });

    const cst = createCST(tokens);

    expect(cst).toEqual(MultiLineWithConditionalWithElseProgramNode);
  });

  it('should create a CST node with a variable assignment', () => { 
    const tokens = Tokenize(`
    $name = "John";
    `, { ignoreWhitespace: false, ignoreNewLines: false });

    const cst = createCST(tokens);

    expect(cst).toEqual(MultiLineWithVariableAssignmentProgramNode);
  });

  // it('should create a CST with a while loop', () => {   
  //   const tokens = Tokenize(`
  //   while ($i < 10) {
  //     @print($i)
  //     $i = $i + 1
  //   }
  //   `, { ignoreWhitespace: false, ignoreNewLines: false });

  //   const cst = createCST(tokens);

  //   expect(cst).toEqual(MultilineWithWhileLoopCSTProgramNode);
  // });
});