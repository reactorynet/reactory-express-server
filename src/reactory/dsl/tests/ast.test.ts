
import { 
  NameProgramASTProgramNode
} from './mocks/ast';
import {
  NameProgram as NameProgramCSTProgramNode
} from './mocks/cst';

const {
  _01_VariableDeclaration: _01_VariableDeclarationAST
} = NameProgramASTProgramNode;

const {
  _01_VariableDeclaration: _01_VariableDeclarationCST
} = NameProgramCSTProgramNode;

import { createAST } from "../compiler/parser";
import { CSTProgramNode } from 'types/compiler/cst';

describe('AST', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an AST from a CST', () => {
    // when creating the AST from the given _01_VariableDeclarationCST
    const ast = createAST(_01_VariableDeclarationCST as CSTProgramNode);
    // then we
    expect(ast).toEqual(_01_VariableDeclarationAST);
  });
});
