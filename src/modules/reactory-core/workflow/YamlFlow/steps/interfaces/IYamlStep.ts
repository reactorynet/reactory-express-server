/**
 * Core interfaces for YAML workflow step system.
 * Re-exports from shared @reactorynet/reactory-core types for backward compatibility.
 */

import Reactory from '@reactorynet/reactory-core';

// Re-export from shared types — all existing imports continue to work
export type StepExecutionContext = Reactory.Workflow.IStepExecutionContext;
export type StepExecutionResult = Reactory.Workflow.IYamlStepExecutionResult;
export type ValidationResult = Reactory.Workflow.IStepValidationResult;
export type IYamlStep = Reactory.Workflow.IYamlStep;
export type StepConstructor = Reactory.Workflow.IStepConstructor;
export type StepRegistrationOptions = Reactory.Workflow.IStepRegistrationOptions;
export type StepMetadata = Reactory.Workflow.IStepMetadata;
