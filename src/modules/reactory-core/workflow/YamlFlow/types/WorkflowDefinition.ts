/**
 * TypeScript interfaces for YAML workflow definitions.
 * Re-exports from shared @reactorynet/reactory-core types for backward compatibility.
 */

import Reactory from '@reactorynet/reactory-core';

// Core workflow definition types
export type YamlWorkflowDefinition = Reactory.Workflow.IYamlWorkflowDefinition;
export type WorkflowMetadata = Reactory.Workflow.IWorkflowMetadata;
export type WorkflowStep = Reactory.Workflow.IYamlWorkflowStep;
export type StepType = Reactory.Workflow.StepType;
export type StepConfig = Reactory.Workflow.IStepConfig;
export type StepCreationParams = Reactory.Workflow.IStepCreationParams;

// Step-specific configurations
export type LogStepConfig = Reactory.Workflow.ILogStepConfig;
export type DelayStepConfig = Reactory.Workflow.IDelayStepConfig;
export type ValidationStepConfig = Reactory.Workflow.IValidationStepConfig;
export type DataTransformationStepConfig = Reactory.Workflow.IDataTransformationStepConfig;
export type ApiCallStepConfig = Reactory.Workflow.IApiCallStepConfig;
export type CliCommandStepConfig = Reactory.Workflow.ICliCommandStepConfig;
export type FileOperationStepConfig = Reactory.Workflow.IFileOperationStepConfig;
export type ConditionalStepConfig = Reactory.Workflow.IConditionalStepConfig;
export type ParallelStepConfig = Reactory.Workflow.IParallelStepConfig;
export type ParallelBranch = Reactory.Workflow.IParallelBranch;
export type ForEachStepConfig = Reactory.Workflow.IForEachStepConfig;
export type WhileStepConfig = Reactory.Workflow.IWhileStepConfig;

// Parameter types
export type InputParameter = Reactory.Workflow.IInputParameter;
export type OutputParameter = Reactory.Workflow.IOutputParameter;
export type ParameterValidation = Reactory.Workflow.IParameterValidation;

// Supporting types
export type ValidationRule = Reactory.Workflow.IValidationRule;
export type DataTransformation = Reactory.Workflow.IDataTransformation;
export type Authentication = Reactory.Workflow.IAuthentication;
export type RetryPolicy = Reactory.Workflow.IRetryPolicy;
export type SecuritySettings = Reactory.Workflow.ISecuritySettings;

// Designer metadata types
export type Position = Reactory.Workflow.IPosition;
export type Size = Reactory.Workflow.ISize;
export type DesignerMetadata = Reactory.Workflow.IDesignerMetadata;
export type ConnectionDesignerMetadata = Reactory.Workflow.IConnectionDesignerMetadata;
export type DesignerNote = Reactory.Workflow.IDesignerNote;
export type DesignerGroup = Reactory.Workflow.IDesignerGroup;
export type StepDesignerMetadata = Reactory.Workflow.IStepDesignerMetadata;
export type PortDesignerMetadata = Reactory.Workflow.IPortDesignerMetadata;

// Execution context interfaces (from WorkflowDefinition.ts original)
export type WorkflowExecutionContext = Reactory.Workflow.IExecutorWorkflowContext;
export type StepExecutionResult = Reactory.Workflow.IStepExecutionRecord;

// Parameter substitution types
// Note: IParameterSubstitutionContext was in the original but is not heavily used.
// If needed, it can be referenced directly via Reactory.Workflow namespace.

// Parse/validation result types
export type ParseResult = {
  success: boolean;
  workflow?: YamlWorkflowDefinition;
  errors: ParseError[];
  warnings: ParseWarning[];
};

export type ParseError = {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
  severity: 'error' | 'warning';
};

export type ParseWarning = ParseError & {
  severity: 'warning';
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
};

export type ValidationError = {
  code: string;
  message: string;
  path: string;
  value?: any;
  expected?: any;
};

export type ValidationWarning = ValidationError & {
  severity: 'warning';
};

// Registry types
export type WorkflowRegistryEntry = {
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
};

export type StepRegistryEntry = {
  type: string;
  name: string;
  description?: string;
  implementation: YamlStepImplementation;
  schema?: object;
  registeredAt: Date;
};

export type YamlStepImplementation = {
  execute(
    config: StepConfig,
    context: WorkflowExecutionContext,
    stepContext: StepExecutionContext
  ): Promise<StepExecutionResult>;
  validate?(config: StepConfig): ValidationResult;
  getSchema?(): object;
};

export type StepExecutionContext = {
  stepId: string;
  stepType: string;
  inputs: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  logger: any;
  services: any;
};

// Builder types
export type YamlWorkflowBuilderOptions = {
  validateSchema?: boolean;
  strictMode?: boolean;
  allowCustomSteps?: boolean;
  parameterSubstitution?: boolean;
};

export type BuildResult = {
  success: boolean;
  workflowBuilder?: any;
  errors: BuildError[];
  warnings: BuildWarning[];
};

export type BuildError = {
  code: string;
  message: string;
  stepId?: string;
  path?: string;
};

export type BuildWarning = BuildError & {
  severity: 'warning';
};

// Step config type map
export type StepConfigMap = Reactory.Workflow.StepConfigMap;
export type StepConfigForType<T extends StepType> = Reactory.Workflow.StepConfigForType<T>;
