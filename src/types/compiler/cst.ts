// Define a type for all the possible node types in the CST
export type CSTNodeType =
  | 'AccessControlList'
  | 'Program'
  | 'MacroInvocation'
  | 'MacroName'
  | 'MacroArguments'
  | 'MacroArgument'
  | 'Assignment'
  | 'StringInterpolation'
  | 'StringLiteral'
  | 'HexadecimalLiteral'
  | 'NumberLiteral'
  | 'BooleanLiteral'
  | 'Grouping'
  | 'Chaining'
  | 'Branching'
  | 'Nesting'
  | 'IfControl'
  | 'ElifBranch'
  | 'ElseBranch'
  | 'SwitchControl'
  | 'TryCatch'
  | 'TryBlock'
  | 'CatchBlock'
  | 'FinallyBlock'
  | 'WhileLoop'
  | 'Literal'
  | 'Identifier'
  | 'Operator'
  | 'ComparisonOperator'
  | 'Punctuation'
  | 'VariableIdentifier'
  | 'Whitespace'
  | 'Comment'
  | 'Newline'
  | 'EOF';

export type OperatorType = 'Assignment' | 'Addition' | 'Subtraction' | 'Multiplication' | 'Division' | 'Modulus' | 'Exponentiation' | 'LogicalAnd' | 'LogicalOr' | 'LogicalNot' | 'BitwiseAnd' | 'BitwiseOr' | 'BitwiseNot' | 'BitwiseXor' | 'BitwiseLeftShift' | 'BitwiseRightShift' | 'BitwiseUnsignedRightShift' | 'Equals' | 'NotEquals' | 'GreaterThan' | 'GreaterThanOrEqual' | 'LessThan' | 'LessThanOrEqual' | 'Ternary' | 'Nary';

// Defines meta data information about the input source code
export type CSTSourceInfo = {
  length: number;
  lines: number;
  path: string;
}

// The base type for all CST nodes
export interface CSTNode {
  type: CSTNodeType;
  value?: string; // For literals, identifiers, operators, etc.
  children?: CSTNode[];
  [key: symbol]: CSTNode | CSTNode[] | string | undefined;
}

// Specific CST Node interfaces can then be extended for each type of node
export interface CSTGroupingNode extends CSTNode {
  type: 'Grouping';
  open: CSTNode; // '(' or '['
  close: CSTNode; // ')' or ']'
}

export interface CSTChainingNode extends CSTNode {
  type: 'Chaining';
  // For chaining, there will be a sequence of macro invocations or groups connected by chaining operators
  sequence: CSTNode[];
}

export interface CSTBranchingNode extends CSTNode {
  type: 'Branching';
  condition: CSTNode;
  successBranch: CSTNode;
  failureBranch: CSTNode;
}

export interface CSTNestingNode extends CSTNode {
  type: 'Nesting';
  outer: CSTNode;
  inner: CSTNode[];
}

export interface CSTElifBranchNode extends CSTNode { 
  type: 'ElifBranch';
  condition: CSTNode;
  thenBranch: CSTNode;
}

export interface CSTElseBranchNode extends CSTNode {
  type: 'ElseBranch';
  thenBranch: CSTNode;
}

export interface CSTIfControlNode extends CSTNode {
  type: 'IfControl';
  condition: CSTNode;
  thenBranch: CSTNode;
  elifBranches?: CSTElifBranchNode[]; // An array of elif branches, if any
  elseBranch?: CSTElseBranchNode; // The else branch, if present
}

export interface CSTSwitchControlNode extends CSTNode {
  type: 'SwitchControl';
  discriminant: CSTNode;
  cases: CSTNode[];
}

export interface CSTTryCatchNode extends CSTNode {
  type: 'TryCatch';
  tryBlock: CSTNode;
  catchBlock: CSTNode;
}

export interface CSTWhileLoopNode extends CSTNode {
  type: 'WhileLoop';
  condition: CSTNode;
  body: CSTNode;
}

export interface CSTLiteralNode extends CSTNode {
  type: 'Literal';
  // Value is a string representation of the literal (e.g., "5", "'hello world'", "true")
}

export interface CSTStringLiteralNode extends CSTNode {
  type: 'StringLiteral';
  // Value is the string literal (e.g., "hello world")
}

export interface CSTNumberLiteralNode extends CSTNode {
  type: 'NumberLiteral';
  // Value is the numeric literal (e.g., 5, 3.14)
}

export interface CSTBooleanLiteralNode extends CSTNode {
  type: 'BooleanLiteral';
  // Value is the boolean literal (e.g., true, false)
}

export interface CSTHexadecimalLiteralNode extends CSTNode {
  type: 'HexadecimalLiteral';
  // Value is the hexadecimal literal (e.g., 0x1234)
}

export interface CSTIdentifierNode extends CSTNode {
  type: 'Identifier';
  // Value is the name of the identifier
}

export interface CSTOperatorNode extends CSTNode {
  type: 'Operator';
  operator: OperatorType;
  // Value is the operator symbol (e.g., '+', '-', '/', '*', '&&', '=', '||', '!')
}

export interface CSTComparisonOperationNode extends CSTNode {
  type: 'ComparisonOperator';
  // Values is the comparison symbol (e.g., '>', '<=', '>=', '<>', '===', '==')
  
}

export interface CSTPunctuationNode extends CSTNode {
  type: 'Punctuation';
  // Value is the punctuation symbol (e.g., ',', ';', '{', '}')
}

export interface CSTWhitespaceNode extends CSTNode {
  type: 'Whitespace';
  // Value could be ' ', '\t', '\n', etc.
}

export interface CSTAssignmentNode extends CSTNode {
  type: 'Assignment';
  left: CSTNode;
  right: CSTNode;
}


export interface CSTAccessControlListNode extends CSTNode {
  type: 'AccessControlList';
  allowed?: CSTNode[]; // An array of allowed identifiers
  denied?: CSTNode[]; // An array of denied identifiers
  // Value is the acl operator (e.g., 'acl.required', 'acl.denied')

}

// The root type for the CST
export type CSTChildNodeTypes =
  CSTAssignmentNode |
  CSTGroupingNode | 
  CSTChainingNode | 
  CSTBranchingNode | 
  CSTNestingNode | 
  CSTIfControlNode | 
  CSTSwitchControlNode | 
  CSTTryCatchNode | 
  CSTWhileLoopNode | 
  CSTLiteralNode | 
  CSTStringLiteralNode | 
  CSTNumberLiteralNode | 
  CSTBooleanLiteralNode | 
  CSTHexadecimalLiteralNode | 
  CSTIdentifierNode | 
  CSTOperatorNode | 
  CSTComparisonOperationNode | 
  CSTPunctuationNode | 
  CSTWhitespaceNode | 
  CSTAccessControlListNode;

export interface CSTProgramNode extends CSTNode {
  type: 'Program';
  children: CSTChildNodeTypes[];
  acl?: CSTNode;  
}
