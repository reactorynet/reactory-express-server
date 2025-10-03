/**
 * Core interfaces for YAML workflow step system
 * Defines the contract for all step implementations
 */

import { YamlWorkflowDefinition } from '../../types/WorkflowDefinition';

/**
 * Context provided to each step during execution
 */
export interface StepExecutionContext {
  /** Current workflow metadata */
  workflow: {
    id: string;
    instanceId: string;
    nameSpace: string;
    name: string;
    version: string;
  };
  
  /** Input data for this step */
  inputs: Record<string, any>;
  
  /** Workflow-level variables */
  variables: Record<string, any>;
  
  /** Environment variables */
  env: Record<string, any>;
  
  /** Results from previous steps */
  stepResults: Record<string, StepExecutionResult>;
  
  /** Logger instance */
  logger: {
    log: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  };
}

/**
 * Result returned by step execution
 */
export interface StepExecutionResult {
  /** Whether the step executed successfully */
  success: boolean;
  
  /** Output data from the step */
  outputs: Record<string, any>;
  
  /** Additional metadata about execution */
  metadata: Record<string, any>;
  
  /** Error message if execution failed */
  error?: string;
  
  /** Whether the step was skipped */
  skipped?: boolean;
  
  /** Stack trace if execution failed */
  stackTrace?: string;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** Optional warnings */
  warnings?: string[];
}

/**
 * Main interface that all YAML workflow steps must implement
 */
export interface IYamlStep {
  /** Unique identifier for this step instance */
  readonly id: string;
  
  /** Type of step (log, delay, etc.) */
  readonly stepType: string;
  
  /** Configuration for this step */
  readonly config: Record<string, any>;
  
  /** Whether this step is enabled */
  readonly enabled: boolean;
  
  /**
   * Execute the step with the given context
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  execute(context: StepExecutionContext): Promise<StepExecutionResult>;
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: Record<string, any>): ValidationResult;
}

/**
 * Constructor signature for step classes
 */
export interface StepConstructor {
  new (id: string, config: Record<string, any>): IYamlStep;
}

/**
 * Options for step registration
 */
export interface StepRegistrationOptions {
  /** Whether to force override an existing registration */
  force?: boolean;
  
  /** Description of the step type */
  description?: string;
  
  /** Version of the step implementation */
  version?: string;
}

/**
 * Step metadata for registry
 */
export interface StepMetadata {
  /** Step type identifier */
  stepType: string;
  
  /** Constructor function */
  constructor: StepConstructor;
  
  /** Registration options */
  options: StepRegistrationOptions;
  
  /** When it was registered */
  registeredAt: Date;
}
