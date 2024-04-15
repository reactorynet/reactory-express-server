import { CSTNode, CSTProgramNode } from "./cst";
import { Operator, OperatorType } from "./shared";

export type ASTNodeType =
  | 'Program'               // Represents the root of the program
  | 'MacroInvocation'       // Represents a macro invocation, including its name and arguments
  | 'MacroChain'            // Represents a chain of macro invocations  
  | 'MacroBranch'           // Represents a branching macro invocation  
  | 'MacroGroup'            // Represents a group of macro invocations
  | 'Expression'            // General type for expressions (could be literals, identifiers, operations)
  | 'StringLiteral'         // Represents a string literal, including interpolated parts
  | 'StringInterpolation'   // Represents an interpolated part of a string literal  
  | 'NumberLiteral'         // Represents a numeric literal
  | 'BooleanLiteral'        // Represents a boolean literal
  | 'HexLiteral'
  | 'Variable'              // Represents a variable identifier
  | 'BinaryExpression'      // Represents a binary operation (e.g., addition, comparison)
  | 'UnaryExpression'       // Represents a unary operation (e.g., negation, logical NOT)
  | 'ConditionalExpression' // Represents 'if-else' conditional logic
  | 'Loop'                  // Represents loop constructs like 'while'
  | 'SwitchCase'            // Represents a 'switch' statement
  | 'Case'                  // Represents a 'case' statement
  | 'TryCatchStatement'     // Represents 'try-catch-finally' error handling
  | 'Catch'                 // Represents a 'catch' block
  | 'Block'                 // Represents a block of statements
  | 'FunctionDeclaration'   // Represents the declaration of a function/macro
  | 'ParameterList'         // Represents a list of parameters for a function/macro
  | 'FunctionDeclaration'   // Represents the declaration of a function/macro
  | 'FunctionBody'          // Represents the body of a function/macro
  | 'FunctionCall'          // Represents a function/macro call
  | 'Assignment'            // Represents an assignment to a variable
  | 'Operation'             // Represenet an operation on a variable
  | 'Sequence'              // Represents a sequence of operations or statements
  | 'Comment';              // Represents a comment

  export type ExpressionNodeType =
  | 'StringLiteral'
  | 'StringInterpolation'
  | 'NumberLiteral'
  | 'BooleanLiteral'
  | 'HexLiteral'
  | 'Variable'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'ConditionalExpression'
  | 'MacroInvocation'
  | 'MacroChain'
  | 'MacroBranch'
export interface ASTNode {  
  type: ASTNodeType;
  next?: ASTNode;
  cst?: CSTNode[];
}



export interface MacroInvocationNode extends ASTNode {
  type: 'MacroInvocation';
  name: string;
  arguments: ExpressionNode[];
}

export interface MacroChainNode extends ASTNode {
  type: 'MacroChain';
  source: MacroInvocationNode;
  destination: MacroInvocationNode;
}

export interface MacroBranchNode extends ASTNode {
  type: 'MacroBranch';
  condition: ExpressionNode;
  successBranch: ASTNode;
  failureBranch: ASTNode;
}

export interface MacroGroupNode extends ASTNode {
  type: 'MacroGroup';
  body: ASTNode[];
}

export interface FunctionCallNode extends ASTNode {
  type: 'FunctionCall';
  name: string;
  arguments: ExpressionNode[];
}

export interface ExpressionNode extends ASTNode {
  type: ExpressionNodeType;
}

export interface StringLiteralNode extends ExpressionNode {
  type: 'StringLiteral';
  value: string;
}

export interface NumberLiteralNode extends ExpressionNode {
  type: 'NumberLiteral';
  value: number;
}

export interface HexLiteralNode extends ExpressionNode {
  typoe: 'HexLiteral';
  value: string;
}

export interface BooleanLiteralNode extends ExpressionNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export type LiteralNode = StringLiteralNode | NumberLiteralNode | BooleanLiteralNode;

export type VariableOperation = "read" | "write" | "declare" | "delete";
export interface VariableNode extends ASTNode {
  type: 'Variable';
  name: string;  
  right: LiteralNode | ExpressionNode | FunctionDeclarationNode;
  operation: VariableOperation;
  operator?: Operator;
}

export interface BinaryExpressionNode extends ExpressionNode {
  type: 'BinaryExpression';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends ExpressionNode {
  type: 'UnaryExpression';
  operator: string;  
  argument: ExpressionNode;
}

export interface ConditionalExpressionNode extends ExpressionNode {
  type: 'ConditionalExpression';
  controlType: 'if' | 'switch' | 'while' | 'for' | 'do' | 'ternary';
  test: ExpressionNode;
  consequent: ASTNode;
  alternate?: ASTNode;
}

export interface LoopNode extends ASTNode {
  type: 'Loop';
  test: ExpressionNode;
  body: ASTNode[];
}

export interface CaseNode extends ASTNode {
  type: 'Case';
  test: ExpressionNode;
  consequent: ASTNode[];
}

export interface SwitchCaseNode extends ASTNode {
  type: 'SwitchCase';
  discriminant: ExpressionNode;
  cases: CaseNode[];
}

export interface CatchNode extends ASTNode {
  type: 'Catch';
  param: VariableNode;
  body: ASTNode[];
}

export interface TryCatchStatementNode extends ASTNode {
  type: 'TryCatchStatement';
  tryBlock: BlockNode;
  catchBlock?: CatchNode;
  finallyBlock?: BlockNode;
}

export interface BlockNode extends ASTNode {
  type: 'Block';
  body: ASTNode[];
}

export interface CommentNode extends ASTNode {
  type: 'Comment';
  value: string;
}

export interface FunctionDeclarationNode extends ASTNode { 
  type: 'FunctionDeclaration';
  name: string;
  params: VariableNode[];
  body: KnownASTBodyNodes[];
}

export type KnownASTBodyNodes = CommentNode | VariableNode | 
  FunctionCallNode | FunctionDeclarationNode | MacroInvocationNode | 
  MacroChainNode | MacroBranchNode | MacroGroupNode | ExpressionNode | 
  LoopNode | SwitchCaseNode | TryCatchStatementNode | BlockNode;

export interface ProgramNode extends ASTNode {
  type: 'Program';
  body: KnownASTBodyNodes[];
  options?: {
    strict?: boolean;
    version?: string;
    mode?: 'workflow' | 'script';
    host?: 'server' | 'web' | 'mobile' | 'cli' | 'desktop';
  }
}

/**
 * Converst a CSTProgramNode into an AST.
 * 
 * It may throw an error if the CST is invalid.
 */
export type CST2AST = (node: CSTProgramNode) => ProgramNode;

/**
 * Context used during the conversion from CST to AST.
 */
export type CST2ASTContext = { 
  activeAST: ASTNode;
  activeCST: CSTNode;
  parent: ASTNode;
};