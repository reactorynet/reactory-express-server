import {
  mockProgramNode,
  mockSimpleMacro,
  mockMacroGroup,
  mockMacroChain,
  mockMacroBranch,
  mockControlFlow,  
} from './mocks/ast';

import { createCST, createAST } from "../compiler/parser";
import { Token } from "@reactory/server-core/types/compiler/lexer";
import { TokenisationMap } from "./mocks/tokens";


// Mock functions (these would be replaced with actual implementations)
const parse = jest.fn((input: string) => {
  return mockProgramNode;
});
const executeMacro = jest.fn();
const evaluateCondition = jest.fn();
const executeControlFlow = jest.fn();

describe('AST', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid AST', () => {        
    // when we parse the input
    const cst = createCST(TokenisationMap['@print("Hello, World!")']);
    const ast = createAST(cst);    
    // and we expect the parse function to return the AST root
    expect(ast.type).toEqual('Program');
    expect(ast.body).toEqual([mockSimpleMacro]);
  });
});
