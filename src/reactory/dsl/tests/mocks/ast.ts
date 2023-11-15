import {
  StringLiteralNode,
  BlockNode,
  ConditionalExpressionNode,
  NumberLiteralNode,
  VariableNode,
  MacroInvocationNode,
  MacroChainNode,
  MacroBranchNode,
  ProgramNode,
} from '../../../../types/compiler/ast';
// Mocks for Literal values
export const mockNumberLiteral: NumberLiteralNode = {
  type: 'NumberLiteral',
  value: 42,
};

export const mockStringLiteral: StringLiteralNode = {
  type: 'StringLiteral',
  value: "\"Hello, World!\"",
};

// Mock for Variable
export const mockVariable: VariableNode = {
  type: 'Variable',
  name: '$result',
};

// Mock for a simple Macro
export const mockSimpleMacro: MacroInvocationNode = {
  type: 'MacroInvocation',
  name: 'print',
  arguments: [mockStringLiteral],
};

// Mock for a Macro with a variable and literal as parameters
export const mockMacroWithVariable: MacroInvocationNode = {
  type: 'MacroInvocation',
  name: 'add',
  arguments: [mockNumberLiteral, mockVariable],
};

// Mock for a Macro Group
export const mockMacroGroup: BlockNode = {
  type: 'Block',
  body: [mockSimpleMacro, mockMacroWithVariable],
};

// Mock for a Macro Chain
export const mockMacroChain: MacroChainNode = {
  type: 'MacroChain',
  source: mockSimpleMacro,
  destination: mockMacroWithVariable,
};

// Mock for Macro Branching
export const mockMacroBranch: MacroBranchNode = {
  type: 'MacroBranch',
  condition: mockVariable, // This could be a more complex expression in a real case
  failureBranch: mockSimpleMacro,
  successBranch: mockMacroWithVariable,  
};

// Mock for a Control Flow
export const mockControlFlow: ConditionalExpressionNode = {
  type: 'ConditionalExpression',
  controlType: 'if',
  test: mockVariable,
  consequent: mockSimpleMacro,
  alternate: mockMacroWithVariable,
};

// Mock for the AST Root
export const mockProgramNode: ProgramNode = {
  type: 'Program',
  body: [mockSimpleMacro],
};
