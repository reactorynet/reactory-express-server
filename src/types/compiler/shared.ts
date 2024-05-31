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