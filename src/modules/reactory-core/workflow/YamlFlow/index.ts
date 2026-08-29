/**
 * YAML Workflow System - Main Entry Point
 * 
 * Phase 1: Core Infrastructure Implementation
 * 
 * This module provides declarative workflow definitions using YAML format,
 * inspired by the reactor-ingest-catalog.yaml pattern but designed specifically
 * for the Reactory workflow engine.
 */

// Core components
export { YamlFlowParser, WorkflowInfo, WorkflowComplexity } from './YamlFlowParser';
export { YamlValidator } from './validators/YamlValidator';
export { ParameterSubstitution } from './parsers/ParameterSubstitution';

// Type definitions
export * from './types/WorkflowDefinition';

// Step registry and base step
export { YamlStepRegistry } from './steps/registry/YamlStepRegistry';
export { BaseYamlStep } from './steps/base/BaseYamlStep';

// YAML → workflow-es bridge. This is the active execution path: YAML workflows
// are translated into workflow-es WorkflowBase classes and run on the durable
// engine (control flow, persistence, replay, scheduling).
export {
  buildYamlWorkflowClass,
  engineWorkflowId,
  yamlDefinitionFingerprintSeed,
} from './YamlFlowBuilder';
export { YamlStepBody, NoOpStepBody } from './execution/YamlStepBody';
export type { YamlWorkflowData } from './execution/YamlStepBody';
export {
  configureYamlFlowRuntime,
  createWorkflowContext,
  getYamlStepRegistry,
} from './execution/YamlFlowRuntime';

// NOTE: YamlWorkflowExecutor (the former standalone flat-topological runner) is
// retained only for design-time validation (used by the GraphQL resolver). The
// runtime execution path is the engine bridge above.
export { YamlWorkflowExecutor } from './execution/YamlWorkflowExecutor';

/**
 * Version information
 */
export const YAML_WORKFLOW_VERSION = '1.0.0';
export const SUPPORTED_SCHEMA_VERSION = '1.0.0';

/**
 * Default configuration options
 */
export const DEFAULT_YAML_WORKFLOW_OPTIONS = {
  validateSchema: true,
  strictMode: true,
  allowCustomSteps: false,
  parameterSubstitution: true
};

/**
 * Quick start helper function for parsing YAML workflows
 */
export function parseYamlWorkflow(yamlContent: string, options = DEFAULT_YAML_WORKFLOW_OPTIONS) {
  const { YamlFlowParser } = require('./YamlFlowParser');
  const parser = new YamlFlowParser(options);
  return parser.parseFromString(yamlContent);
}

/**
 * Quick start helper function for validating YAML workflows
 */
export function validateYamlWorkflow(yamlContent: string, options = DEFAULT_YAML_WORKFLOW_OPTIONS) {
  const { YamlFlowParser } = require('./YamlFlowParser');
  const parser = new YamlFlowParser(options);
  return parser.validateOnly(yamlContent);
}