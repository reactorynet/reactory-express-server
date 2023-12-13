import { 
  SingleLineHelloWorldASTProgramNode
} from './mocks/ast';

import { 
  SingleLineHelloWorldProgramNode,
  MultiLineWithConditionalProgramNode,
  SingleLineExpressionWithArithmaticProgramNode,
} from './mocks/cst';
import { createAST } from "../compiler/parser";

describe('AST', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid AST for @print("Hallo World!")', () => {            
    const ast = createAST(SingleLineHelloWorldProgramNode);
    ast.options.host = 'cli';
    // and we expect the parse function to return the AST root
    expect(ast.type).toEqual('Program');
    expect(ast).toEqual(SingleLineHelloWorldASTProgramNode);
  });

  it('should return a valid AST for an expression $i = $i + 1;', () => { 
    //given the CST 
    const cst = SingleLineExpressionWithArithmaticProgramNode;
    // when we create an AST
    const ast = createAST(cst);
    // then we expect the AST to be valid
    expect(ast).toEqual(SingleLineHelloWorldASTProgramNode);
  });
});
