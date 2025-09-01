/**
 * Test Suite for YAML Workflow Execution Engine
 * Phase 3: Workflow Execution Engine - TDD Implementation
 * 
 * This test suite drives the development of:
 * - YamlWorkflowExecutor class
 * - Workflow runtime execution
 * - Step dependency resolution
 * - Execution context management
 * - Progress tracking and state management
 */

import { YamlWorkflowExecutor } from '../../execution/YamlWorkflowExecutor';
import { YamlStepRegistry } from '../../steps/registry/YamlStepRegistry';
import { YamlWorkflowDefinition, StepConfig } from '../../types/WorkflowDefinition';
import { 
  WorkflowExecutionResult, 
  WorkflowExecutionContext,
  ExecutionState,
  StepExecutionResult 
} from '../../execution/types/ExecutionTypes';

describe('YamlWorkflowExecutor', () => {
  let executor: YamlWorkflowExecutor;
  let stepRegistry: YamlStepRegistry;

  beforeEach(() => {
    stepRegistry = new YamlStepRegistry();
    executor = new YamlWorkflowExecutor(stepRegistry);
  });

  describe('Executor Construction', () => {
    it('should create executor with step registry', () => {
      expect(executor).toBeDefined();
      expect(executor.getStepRegistry()).toBe(stepRegistry);
    });

    it('should initialize with empty execution state', () => {
      const state = executor.getExecutionState();
      expect(state.status).toBe(ExecutionState.IDLE);
      expect(state.completedSteps).toEqual([]);
      expect(state.currentStep).toBeNull();
    });
  });

  describe('Workflow Validation', () => {
    it('should validate a basic workflow', async () => {
      const workflow: YamlWorkflowDefinition = {
        nameSpace: 'testNamespace',
        name: 'test-workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'log-step',
            type: 'log',
            config: {
              message: 'Hello World'
            }
          }
        ]
      };

      const validation = await executor.validateWorkflow(workflow);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should reject workflow with invalid step types', async () => {
      const workflow: YamlWorkflowDefinition = {
        nameSpace: 'testNamespace',
        name: 'invalid-workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'invalid-step',
            type: 'invalidType' as any,
            config: {}
          }
        ]
      };

      const validation = await executor.validateWorkflow(workflow);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('invalidType')
        })
      );
    });
  });

  describe('Simple Workflow Execution', () => {
    it('should execute single step workflow', async () => {
      const workflow: YamlWorkflowDefinition = {
        nameSpace: 'testNamespace',
        name: 'single-step',
        version: '1.0.0',
        steps: [
          {
            id: 'log-step',
            type: 'log',
            config: {
              message: 'Hello World',
              level: 'info'
            }
          }
        ]
      };

      const result = await executor.executeWorkflow(workflow);
      console.log('Execution result:', result);
      
      expect(result.success).toBe(true);
      expect(result.executedSteps).toHaveLength(1);
      expect(result.executedSteps[0].stepId).toBe('log-step');
      expect(result.executedSteps[0].success).toBe(true);
    });
  });
});
