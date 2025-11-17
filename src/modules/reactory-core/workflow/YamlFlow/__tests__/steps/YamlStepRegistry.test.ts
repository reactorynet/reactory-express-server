/**
 * Test Suite for YAML Step Registry System
 * Phase 2: Basic Step Types - TDD Implementation
 * 
 * This test suite drives the development of:
 * - IYamlStep interface
 * - YamlStepRegistry class
 * - BaseYamlStep class
 * - Step execution framework
 */

import { YamlStepRegistry } from '../../steps/registry/YamlStepRegistry';
import { IYamlStep, StepExecutionContext, StepExecutionResult } from '../../steps/interfaces/IYamlStep';
import { BaseYamlStep } from '../../steps/base/BaseYamlStep';
import { YamlWorkflowDefinition, StepConfig } from '../../types/WorkflowDefinition';

describe('YamlStepRegistry', () => {
  let registry: YamlStepRegistry;

  beforeEach(() => {
    registry = new YamlStepRegistry();
  });

  describe('Step Registration', () => {
    it('should register a new step type', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        
        public async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
          return {
            success: true,
            outputs: { message: 'Test executed' },
            metadata: { executionTime: Date.now() }
          };
        }
      }

      registry.registerStep('test', TestStep);
      
      expect(registry.hasStep('test')).toBe(true);
      expect(registry.getRegisteredSteps()).toContain('test');
    });

    it('should throw error when registering duplicate step type', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        
        public async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      
      expect(() => {
        registry.registerStep('test', TestStep);
      }).toThrow('Step type "test" is already registered');
    });

    it('should allow overriding step type when force is true', () => {
      class TestStep1 extends BaseYamlStep {
        public readonly stepType = 'test';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: { version: 1 }, metadata: {} };
        }
      }

      class TestStep2 extends BaseYamlStep {
        public readonly stepType = 'test';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: { version: 2 }, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep1);
      registry.registerStep('test', TestStep2, { force: true });
      
      const StepClass = registry.getStepClass('test');
      const step = new StepClass('test-id', {});
      
      expect(step.stepType).toBe('test');
    });
  });

  describe('Step Retrieval', () => {
    it('should retrieve registered step class', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      const StepClass = registry.getStepClass('test');
      
      expect(StepClass).toBe(TestStep);
    });

    it('should throw error for unregistered step type', () => {
      expect(() => {
        registry.getStepClass('nonexistent');
      }).toThrow('Step type "nonexistent" is not registered');
    });

    it('should return list of all registered step types', () => {
      class TestStep1 extends BaseYamlStep {
        public readonly stepType = 'test1';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      class TestStep2 extends BaseYamlStep {
        public readonly stepType = 'test2';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test1', TestStep1);
      registry.registerStep('test2', TestStep2);
      
      const registeredSteps = registry.getRegisteredSteps();
      
      // Should include default core steps and our test steps
      expect(registeredSteps).toContain('test1');
      expect(registeredSteps).toContain('test2');
      expect(registeredSteps).toContain('log');
      expect(registeredSteps).toContain('delay');
      expect(registeredSteps).toContain('validation');
      expect(registeredSteps).toContain('dataTransformation');
      expect(registeredSteps).toContain('apiCall');
      expect(registeredSteps).toContain('cliCommand');
      expect(registeredSteps).toContain('fileOperation');
    });
  });

  describe('Step Creation', () => {
    it('should create step instance from registry', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      
      const stepConfig: StepConfig = {
        id: 'test-step-1',
        type: 'test',
        config: { message: 'Hello World' }
      };

      const step = registry.createStep(stepConfig);
      
      expect(step).toBeInstanceOf(TestStep);
      expect(step.id).toBe('test-step-1');
      expect(step.stepType).toBe('test');
      expect(step.config).toEqual({ message: 'Hello World' });
    });

    it('should throw error when creating step of unregistered type', () => {
      const stepConfig: StepConfig = {
        id: 'test-step-1',
        type: 'nonexistent',
        config: {}
      };

      expect(() => {
        registry.createStep(stepConfig);
      }).toThrow('Step type "nonexistent" is not registered');
    });
  });

  describe('Step Validation', () => {
    it('should validate step configuration before creation', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        
        public validateConfig(config: any): { valid: boolean; errors: string[] } {
          const errors: string[] = [];
          if (!config.requiredField) {
            errors.push('requiredField is mandatory');
          }
          return { valid: errors.length === 0, errors };
        }

        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      
      const invalidConfig: StepConfig = {
        id: 'test-step-1',
        type: 'test',
        config: {} // Missing requiredField
      };

      expect(() => {
        registry.createStep(invalidConfig);
      }).toThrow('Step configuration validation failed: requiredField is mandatory');
    });

    it('should create step when configuration is valid', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        
        public validateConfig(config: any): { valid: boolean; errors: string[] } {
          const errors: string[] = [];
          if (!config.requiredField) {
            errors.push('requiredField is mandatory');
          }
          return { valid: errors.length === 0, errors };
        }

        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      
      const validConfig: StepConfig = {
        id: 'test-step-1',
        type: 'test',
        config: { requiredField: 'value' }
      };

      const step = registry.createStep(validConfig);
      expect(step).toBeInstanceOf(TestStep);
    });
  });

  describe('Default Step Registration', () => {
    it('should register default core steps on instantiation', () => {
      // The registry should auto-register core step types
      const defaultSteps = ['log', 'delay', 'validation', 'dataTransformation'];
      
      for (const stepType of defaultSteps) {
        expect(registry.hasStep(stepType)).toBe(true);
      }
    });

    it('should register external integration steps', () => {
      const externalSteps = ['apiCall', 'cliCommand', 'fileOperation'];
      
      for (const stepType of externalSteps) {
        expect(registry.hasStep(stepType)).toBe(true);
      }
    });
  });

  describe('Registry State Management', () => {
    it('should clear all registered steps', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      expect(registry.getRegisteredSteps().length).toBeGreaterThan(0);
      
      registry.clear();
      // After clear, registry should have no steps (including default ones)
      expect(registry.getRegisteredSteps().length).toBe(0);
    });

    it('should unregister specific step type', () => {
      class TestStep extends BaseYamlStep {
        public readonly stepType = 'test';
        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      registry.registerStep('test', TestStep);
      expect(registry.hasStep('test')).toBe(true);
      
      registry.unregisterStep('test');
      expect(registry.hasStep('test')).toBe(false);
    });

    it('should throw error when unregistering non-existent step', () => {
      expect(() => {
        registry.unregisterStep('nonexistent');
      }).toThrow('Step type "nonexistent" is not registered');
    });
  });
});

describe('BaseYamlStep', () => {
  class TestStep extends BaseYamlStep {
    public readonly stepType = 'test';
    public async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
      return {
        success: true,
        outputs: { processedValue: context.inputs?.value || 'default' },
        metadata: { executionTime: Date.now() }
      };
    }
  }

  describe('Step Construction', () => {
    it('should create step with basic properties', () => {
      const config = { message: 'Hello World' };
      const step = new TestStep('test-id', config);
      
      expect(step.id).toBe('test-id');
      expect(step.stepType).toBe('test');
      expect(step.config).toEqual(config);
      expect(step.enabled).toBe(true); // default
    });

    it('should respect enabled flag from config', () => {
      const config = { enabled: false };
      const step = new TestStep('test-id', config);
      
      expect(step.enabled).toBe(false);
    });
  });

  describe('Step Execution', () => {
    it('should execute step with proper context', async () => {
      const step = new TestStep('test-id', {});
      const context: StepExecutionContext = {
        workflow: {
          id: 'workflow-1',
          instanceId: 'instance-1',
          nameSpace: 'testNameSpace',
          name: 'Test Workflow',
          version: '1.0.0'
        },
        inputs: { value: 'test-input' },
        variables: {},
        env: {},
        stepResults: {},
        logger: console
      };

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({ processedValue: 'test-input' });
      expect(result.metadata).toHaveProperty('executionTime');
    });

    it('should skip execution when step is disabled', async () => {
      const step = new TestStep('test-id', { enabled: false });
      const context: StepExecutionContext = {
        workflow: {
          id: 'workflow-1',
          instanceId: 'instance-1',
          nameSpace: 'testNameSpace',
          name: 'Test Workflow',
          version: '1.0.0'
        },
        inputs: {},
        variables: {},
        env: {},
        stepResults: {},
        logger: console
      };

      const result = await step.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.outputs).toEqual({});
    });

    it('should handle step execution errors gracefully', async () => {
      class FailingStep extends BaseYamlStep {
        public readonly stepType = 'failing';
        public async executeStep(): Promise<StepExecutionResult> {
          throw new Error('Step execution failed');
        }
      }

      const step = new FailingStep('failing-id', {});
      const context: StepExecutionContext = {
        workflow: {
          id: 'workflow-1',
          instanceId: 'instance-1',
          nameSpace: 'testNameSpace',
          name: 'Test Workflow',
          version: '1.0.0'
        },
        inputs: {},
        variables: {},
        env: {},
        stepResults: {},
        logger: console
      };

      const result = await step.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Step execution failed');
      expect(result.outputs).toEqual({});
    });
  });

  describe('Step Validation', () => {
    it('should validate configuration by default', () => {
      const step = new TestStep('test-id', {});
      const validation = step.validateConfig({});
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should allow custom validation in subclasses', () => {
      class ValidatingStep extends BaseYamlStep {
        public readonly stepType = 'validating';
        
        public validateConfig(config: any): { valid: boolean; errors: string[] } {
          const errors: string[] = [];
          if (!config.required) {
            errors.push('required field is missing');
          }
          return { valid: errors.length === 0, errors };
        }

        public async executeStep(): Promise<StepExecutionResult> {
          return { success: true, outputs: {}, metadata: {} };
        }
      }

      const step = new ValidatingStep('validating-id', {});
      const validation = step.validateConfig({});
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('required field is missing');
    });
  });
});
