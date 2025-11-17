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

// Placeholder exports for components to be implemented in Phase 2-4
// export { YamlFlowRegistry } from './YamlFlowRegistry';
// export { YamlFlowBuilder } from './YamlFlowBuilder';

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