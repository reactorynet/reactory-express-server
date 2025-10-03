/**
 * TypeScript interfaces for YAML workflow definitions
 * Generated from WorkflowSchema.json for type safety
 */

export interface YamlWorkflowDefinition {
  nameSpace: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  metadata?: WorkflowMetadata;
  inputs?: Record<string, InputParameter>;
  outputs?: Record<string, OutputParameter>;
  variables?: Record<string, any>;
  steps: WorkflowStep[];
}

export interface WorkflowMetadata {
  timeout?: number;
  retryPolicy?: RetryPolicy;
  security?: SecuritySettings;
}

export interface WorkflowStep {
  id: string;
  name?: string;
  description?: string;
  type: StepType;
  enabled?: boolean;
  continueOnError?: boolean;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  inputs?: Record<string, any>;
  outputs?: Record<string, string>;
  condition?: string;
  dependsOn?: string | string[];
  config?: StepConfig;
  steps?: WorkflowStep[]; // For nested steps in control flow
}

export type StepType = 
  | 'log'
  | 'delay'
  | 'validation'
  | 'dataTransformation'
  | 'apiCall'
  | 'cliCommand'
  | 'fileOperation'
  | 'conditional'
  | 'parallel'
  | 'forEach'
  | 'while'
  | 'custom';

export interface StepConfig {
  [key: string]: any;
}

// Step-specific configurations
export interface LogStepConfig extends StepConfig {
  message: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  data?: Record<string, any>;
}

export interface DelayStepConfig extends StepConfig {
  duration: number;
  reason?: string;
}

export interface ValidationStepConfig extends StepConfig {
  rules: ValidationRule[];
  stopOnFirstError?: boolean;
}

export interface DataTransformationStepConfig extends StepConfig {
  transformations: DataTransformation[];
}

export interface ApiCallStepConfig extends StepConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | object;
  authentication?: Authentication;
  expectedStatusCodes?: number[];
}

export interface CliCommandStepConfig extends StepConfig {
  command: string;
  arguments?: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  expectedExitCodes?: number[];
}

export interface FileOperationStepConfig extends StepConfig {
  operation: 'read' | 'write' | 'copy' | 'move' | 'delete' | 'exists' | 'mkdir';
  source?: string;
  destination?: string;
  content?: string;
  encoding?: string;
  overwrite?: boolean;
}

export interface ConditionalStepConfig extends StepConfig {
  condition: string;
  thenSteps?: WorkflowStep[];
  elseSteps?: WorkflowStep[];
}

export interface ParallelStepConfig extends StepConfig {
  maxConcurrency?: number;
  failFast?: boolean;
  branches?: ParallelBranch[];
}

export interface ParallelBranch {
  name: string;
  steps: WorkflowStep[];
}

export interface ForEachStepConfig extends StepConfig {
  items: string;
  itemVariable?: string;
  indexVariable?: string;
  maxConcurrency?: number;
  steps: WorkflowStep[];
}

export interface WhileStepConfig extends StepConfig {
  condition: string;
  maxIterations?: number;
  steps: WorkflowStep[];
}

// Parameter definitions
export interface InputParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
  validation?: ParameterValidation;
}

export interface OutputParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  source: string;
}

export interface ParameterValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
}

// Validation and transformation types
export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'pattern' | 'range' | 'custom';
  value?: string | number | object;
  message?: string;
}

export interface DataTransformation {
  operation: 'map' | 'filter' | 'reduce' | 'sort' | 'group' | 'merge' | 'extract' | 'custom';
  source?: string;
  target?: string;
  config?: Record<string, any>;
}

// Authentication types
export interface Authentication {
  type: 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2';
  config?: Record<string, any>;
}

// Retry and security policies
export interface RetryPolicy {
  maxAttempts?: number;
  backoffStrategy?: 'fixed' | 'exponential' | 'linear';
  initialDelay?: number;
  maxDelay?: number;
  retryOnErrors?: string[];
}

export interface SecuritySettings {
  requiresAuthentication?: boolean;
  permissions?: string[];
  roles?: string[];
}

// Execution context interfaces
export interface WorkflowExecutionContext {
  workflowId: string;
  instanceId: string;
  userId?: string;
  inputs: Record<string, any>;
  variables: Record<string, any>;
  stepResults: Record<string, StepExecutionResult>;
  metadata: {
    startTime: Date;
    currentStepId?: string;
    executionPath: string[];
  };
}

export interface StepExecutionResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  outputs?: Record<string, any>;
  error?: ExecutionError;
  retryCount?: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// Parameter substitution types
export interface ParameterSubstitutionContext {
  env: Record<string, string>;
  workflow: {
    id: string;
    instanceId: string;
    nameSpace: string;
    name: string;
    version: string;
  };
  input: Record<string, any>;
  variables: Record<string, any>;
  step: {
    id: string;
    type: string;
    outputs?: Record<string, any>;
  };
  outputs: Record<string, any>;
}

// Parse result types
export interface ParseResult {
  success: boolean;
  workflow?: YamlWorkflowDefinition;
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
  severity: 'error' | 'warning';
}

export interface ParseWarning extends ParseError {
  severity: 'warning';
}

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  value?: any;
  expected?: any;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

// Registry types
export interface WorkflowRegistryEntry {
  nameSpace: string;
  name: string;
  version: string;
  definition: YamlWorkflowDefinition;
  registeredAt: Date;
  registeredBy?: string;
  metadata?: {
    filePath?: string;
    checksum?: string;
    lastModified?: Date;
  };
}

export interface StepRegistryEntry {
  type: string;
  name: string;
  description?: string;
  implementation: YamlStepImplementation;
  schema?: object;
  registeredAt: Date;
}

export interface YamlStepImplementation {
  execute(
    config: StepConfig,
    context: WorkflowExecutionContext,
    stepContext: StepExecutionContext
  ): Promise<StepExecutionResult>;
  
  validate?(config: StepConfig): ValidationResult;
  
  getSchema?(): object;
}

export interface StepExecutionContext {
  stepId: string;
  stepType: string;
  inputs: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  logger: any; // Reactory logger interface
  services: any; // Reactory services
}

// Builder types
export interface YamlWorkflowBuilderOptions {
  validateSchema?: boolean;
  strictMode?: boolean;
  allowCustomSteps?: boolean;
  parameterSubstitution?: boolean;
}

export interface BuildResult {
  success: boolean;
  workflowBuilder?: any; // Reactory WorkflowBuilder instance
  errors: BuildError[];
  warnings: BuildWarning[];
}

export interface BuildError {
  code: string;
  message: string;
  stepId?: string;
  path?: string;
}

export interface BuildWarning extends BuildError {
  severity: 'warning';
}

// Export utility types
export type StepConfigMap = {
  log: LogStepConfig;
  delay: DelayStepConfig;
  validation: ValidationStepConfig;
  dataTransformation: DataTransformationStepConfig;
  apiCall: ApiCallStepConfig;
  cliCommand: CliCommandStepConfig;
  fileOperation: FileOperationStepConfig;
  conditional: ConditionalStepConfig;
  parallel: ParallelStepConfig;
  forEach: ForEachStepConfig;
  while: WhileStepConfig;
  custom: StepConfig;
};

export type StepConfigForType<T extends StepType> = T extends keyof StepConfigMap 
  ? StepConfigMap[T] 
  : StepConfig;
