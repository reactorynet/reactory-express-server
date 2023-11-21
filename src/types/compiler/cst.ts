import { Token } from "./lexer";

// Define a type for all the possible node types in the CST
export type CSTNodeType =
  | 'AccessControlList'
  | 'Program'
  | 'Directive'
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

export type OperatorType = 'Assignment' 
  | 'Addition'
  | 'Subtraction' 
  | 'Multiplication' 
  | 'Division' 
  | 'Modulus' 
  | 'Exponentiation' 
  | 'LogicalAnd' 
  | 'LogicalOr' 
  | 'LogicalNot' 
  | 'BitwiseAnd' 
  | 'BitwiseOr' 
  | 'BitwiseNot' 
  | 'BitwiseXor' 
  | 'BitwiseLeftShift' 
  | 'BitwiseRightShift' 
  | 'BitwiseUnsignedRightShift' 
  | 'Equals' 
  | 'NotEquals' 
  | 'GreaterThan' 
  | 'GreaterThanOrEqual' 
  | 'LessThan' 
  | 'LessThanOrEqual';

export enum Operator {
  Assignment = 1,
  Addition = 2,
  Subtraction = 4,
  Multiplication = 8,
  Division = 16,
  Modulus = 32,
  Exponentiation = 64,
  LogicalAnd = 128,
  LogicalOr = 256,
  LogicalNot = 512,
  BitwiseAnd = 1024,
  BitwiseOr = 2048,
  BitwiseNot = 4096,
  BitwiseXor = 8192,
  BitwiseLeftShift = 16384,
  BitwiseRightShift = 32768,
  BitwiseUnsignedRightShift = 65536,
  Equals = 131072,
  NotEquals = 262144,
  GreaterThan = 524288,
  GreaterThanOrEqual = 1048576,
  LessThan = 2097152,
  LessThanOrEqual = 4194304,
  Unary = 8388608,
  Binary = 16777216,
  Ternary = 33554432,
}

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
  operator: Operator;
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

export interface CSTDirectiveNode extends CSTNode {
  type: 'Directive';
  // Value is the directive name eg import, export, use, etc.
}

// The root type for the CST
export type CSTChildNodeTypes =
  CSTNode |
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


export interface CSTParserState {
  [key: symbol]: any;
}

/**
 * Defines the context for the active CST parsing operation
 * 
 * This allows us to keep track of the current state of the parser
 * and to provide contextual information to the parser that will
 * assist converting Tokens into a CST node
 */
export interface CSTParsingContext {
  // The current token being processed
  currentToken: Token;
  // The index of the current token being processed
  currentTokenIndex: number;
  // The next token to be processed
  nextToken: Token;
  // The index of the next token to be processed
  nextTokenIndex: number;
  // The previous token that was processed
  previousToken: Token;
  // The index of the previous token that was processed
  previousTokenIndex: number;
  // The current CST node being processed
  currentNode: CSTNode;
  // The index of the current CST node being processed
  currentNodeIndex: number;
  // The parent CST node of the current CST node being processed
  parentNode: CSTNode;
  // The index of the parent CST node of the current CST node being processed
  parentNodeIndex: number;
  // The root CST node of the current CST node being processed
  rootNode: CSTNode;
  // The index of the root CST node of the current CST node being processed
  rootNodeIndex: number;
  // The source information for the input source code
  sourceInfo: CSTSourceInfo;
  // The current state of the parser
  state: CSTParserState;  
}