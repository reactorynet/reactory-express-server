import { Token } from "./lexer";
import { Operator, OperatorType } from "./shared";
// Define a type for all the possible node types in the CST
export type CSTNodeType =
  | 'AccessControlList'
  | 'Program'
  | 'ImportDirective'
  | 'ExportDirective'
  | 'HostDirective'
  | 'UseDirective'
  | 'Directive'
  | 'PropertyAccess'
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
  | 'ObjectLiteral'
  | 'NullLiteral'
  | 'UndefinedLiteral'
  | 'TableLiteral'
  | 'ServiceLiteral'
  | 'ComponentLiteral'
  | 'FunctionLiteral'
  | 'Grouping'
  | 'Chaining'
  | 'Branching'
  | 'Nesting'
  | 'IfControl'
  | 'ElifBranch'
  | 'ElseBranch'
  | 'SwitchControl'
  | 'SelectBlock'
  | 'TableBlock'
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
  | 'VariableDeclaration'
  | 'VariableIdentifier'
  | 'TypeIdentifier'
  | 'ComponentIdentifier'
  | 'Whitespace'
  | 'Comment'
  | 'Newline'
  | 'EOF';


// Defines meta data information about the input source code
export type CSTSourceInfo = {
  length: number;
  lines: number;
  path: string;
}

// The base type for all CST nodes
export interface CSTNode {
  type: CSTNodeType;
  /**
   * The token that was used to create this node.
   * It is stored on the node for debugging purposes.
   */
  token?: Token;
  value?: string; // For literals, identifiers, operators, etc.
  children?: CSTNode[];
  next?: CSTNode;
  [key: symbol]: CSTNode | CSTNode[] | string | undefined;
}

// Specific CST Node interfaces can then be extended for each type of node
export interface CSTGroupingNode extends CSTNode {
  type: 'Grouping';
  children: CSTChildNodeTypes[];
  open?: CSTNode; // '(' or '['
  close?: CSTNode; // ')' or ']'
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

export interface CSTTypeIdentifierNode extends CSTNode { 
  type: 'TypeIdentifier';
  identifier: CSTNode;
  typeArguments?: CSTNode[];
}

export interface CSTComponentIdentifierNode extends CSTNode { 
  type: 'ComponentIdentifier';
  identifier: string;
  componentType?: string;
}


export interface CSTVariableIdentifierNode extends CSTNode { 
  type: 'VariableIdentifier';
  identifier: CSTNode;
  variableType?: CSTTypeIdentifierNode;
}

export interface CSTNullLiteralNode extends CSTNode { }

export interface CSTUndefinedLiteralNode extends CSTNode { }

export interface CSTTableLiteralNode extends CSTNode { }

export interface CSTServiceLiteralNode extends CSTNode { }

export interface CSTComponentLiteralNode extends CSTNode { }



export type ValidVariableChildren = 
  CSTWhitespaceNode |
  CSTVariableIdentifierNode |
  CSTOperatorNode | 
  CSTStringLiteralNode |
  CSTNumberLiteralNode |
  CSTBooleanLiteralNode | 
  CSTObjectLiteralNode |
  CSTNullLiteralNode |
  CSTUndefinedLiteralNode | 
  CSTTableLiteralNode |
  CSTServiceLiteralNode |
  CSTComponentLiteralNode
export interface CSTVariableDeclarationNode extends CSTNode { 
  type: 'VariableDeclaration';
  children: ValidVariableChildren[]
  readonly?: boolean; 
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

export interface CSTObjectLiteralNode extends CSTNode {
  type: 'ObjectLiteral';
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
  // Value could be ' ', '\t', '\v', etc.
}

export interface CSTCommentNode extends CSTNode {
  type: 'Comment';
  // Value is the comment text
}

export interface CSTNewlineNode extends CSTNode {
  type: 'Newline';
  // Value is the newline character
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
  directiveType: 'import' | 'export' | 'host' | 'acl' | 'use'
}

// The root type for the CST
export type CSTChildNodeTypes =
  CSTNode |
  CSTOperatorNode |
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
  CSTOperatorNode |
  CSTStringLiteralNode | 
  CSTNumberLiteralNode | 
  CSTBooleanLiteralNode | 
  CSTHexadecimalLiteralNode | 
  CSTIdentifierNode |
  CSTVariableDeclarationNode |
  CSTVariableIdentifierNode | 
  CSTOperatorNode | 
  CSTComparisonOperationNode | 
  CSTPunctuationNode |
  CSTCommentNode |
  CSTNewlineNode | 
  CSTWhitespaceNode | 
  CSTAccessControlListNode;

export interface CSTProgramNode extends CSTNode {
  type: 'Program';
  children: CSTChildNodeTypes[];
  acl?: CSTNode;
  directives?: CSTNode[];  
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
  // The path to the current node in the CST
  // this will be a string of the form "rootNodeIndex.parentNodeIndex.currentNodeIndex"
  // e.g., "0.1.2" would be the path to the third child of the second child of the root node
  activePath: string;
  // Validates the CST Root Node
  validate: () => boolean;
  // child context
  children?: CSTParsingContext[];
}