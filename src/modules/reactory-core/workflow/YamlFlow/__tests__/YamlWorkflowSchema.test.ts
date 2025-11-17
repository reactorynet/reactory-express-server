/**
 * Test Suite for YAML Workflow Schema Validation
 * Phase 1: Core Infrastructure Tests
 */

import { YamlValidator } from '../validators/YamlValidator';
import { ParameterSubstitution } from '../parsers/ParameterSubstitution';
import { YamlWorkflowDefinition, ParameterSubstitutionContext } from '../types/WorkflowDefinition';

describe('YamlWorkflowSchema', () => {
  let validator: YamlValidator;

  beforeEach(() => {
    validator = new YamlValidator();
  });

  describe('Schema Validation', () => {
    it('should validate a minimal valid workflow', () => {
      const minimalWorkflow: YamlWorkflowDefinition = {
        nameSpace: 'testNameSpace',
        name: 'testWorkflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: {
              message: 'Hello World'
            }
          }
        ]
      };

      const result = validator.validateSchema(minimalWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow missing required fields', () => {
      const invalidWorkflow = {
        nameSpace: 'testNameSpace',
        // Missing name, version, and steps
      };

      const result = validator.validateSchema(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('name'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('version'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('steps'))).toBe(true);
    });

    it('should validate nameSpace follows camelCase convention', () => {
      const workflowWithBadNameSpace: YamlWorkflowDefinition = {
        nameSpace: 'TestNameSpace', // Should start with lowercase
        name: 'testWorkflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: { message: 'test' }
          }
        ]
      };

      const result = validator.validateSemantics(workflowWithBadNameSpace);
      expect(result.warnings.some(w => w.code === 'NAMESPACE_CONVENTION')).toBe(true);
    });

    it('should reject invalid version format', () => {
      const workflowWithBadVersion: YamlWorkflowDefinition = {
        nameSpace: 'testNameSpace',
        name: 'testWorkflow',
        version: '1.0', // Should be x.y.z
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: { message: 'test' }
          }
        ]
      };

      const result = validator.validateSemantics(workflowWithBadVersion);
      expect(result.errors.some(e => e.code === 'INVALID_VERSION_FORMAT')).toBe(true);
    });

    it('should validate step types', () => {
      const validStepTypes: any[] = [
        'log', 'delay', 'validation', 'dataTransformation',
        'apiCall', 'cliCommand', 'fileOperation', 'conditional',
        'parallel', 'forEach', 'while', 'custom'
      ];

      for (const stepType of validStepTypes) {
        const workflow: YamlWorkflowDefinition = {
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0',
          steps: [
            {
              id: 'step1',
              type: stepType,
              config: stepType === 'log' ? { message: 'test' } : {}
            }
          ]
        };

        const result = validator.validateSchema(workflow);
        if (!result.valid) {
          console.log(`❌ Step type ${stepType} failed validation:`, JSON.stringify(result.errors, null, 2));
        }
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid step type', () => {
      const workflowWithInvalidStepType = {
        nameSpace: 'testNameSpace',
        name: 'testWorkflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            type: 'invalidStepType',
            config: {}
          }
        ]
      };

      const result = validator.validateSchema(workflowWithInvalidStepType);
      console.log('❌ Invalid step type validation result:', JSON.stringify(result, null, 2));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('invalidStepType'))).toBe(true);
    });

    it('should detect duplicate step IDs', () => {
      const workflowWithDuplicateSteps: YamlWorkflowDefinition = {
        nameSpace: 'testNameSpace',
        name: 'testWorkflow',
        version: '1.0.0',
        steps: [
          {
            id: 'duplicateId',
            type: 'log',
            config: { message: 'step 1' }
          },
          {
            id: 'duplicateId',
            type: 'log',
            config: { message: 'step 2' }
          }
        ]
      };

      const result = validator.validateSemantics(workflowWithDuplicateSteps);
      expect(result.errors.some(e => e.code === 'DUPLICATE_STEP_ID')).toBe(true);
    });

    it('should validate step dependencies', () => {
      const workflowWithInvalidDependency: YamlWorkflowDefinition = {
        nameSpace: 'testNameSpace',
        name: 'testWorkflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            type: 'log',
            dependsOn: 'nonExistentStep',
            config: { message: 'test' }
          }
        ]
      };

      const result = validator.validateSemantics(workflowWithInvalidDependency);
      expect(result.errors.some(e => e.code === 'INVALID_DEPENDENCY')).toBe(true);
    });

    it('should validate timeout values', () => {
      const workflowWithInvalidTimeout: YamlWorkflowDefinition = {
        nameSpace: 'testNameSpace',
        name: 'testWorkflow',
        version: '1.0.0',
        metadata: {
          timeout: 500 // Should be at least 1000ms
        },
        steps: [
          {
            id: 'step1',
            type: 'log',
            timeout: 50, // Should be at least 100ms
            config: { message: 'test' }
          }
        ]
      };

      const result = validator.validateSemantics(workflowWithInvalidTimeout);
      expect(result.errors.some(e => e.code === 'INVALID_TIMEOUT')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_STEP_TIMEOUT')).toBe(true);
    });
  });

  describe('YAML Parsing', () => {
    it('should parse valid YAML workflow', () => {
      const yamlContent = `
nameSpace: testNameSpace
name: testWorkflow
version: 1.0.0
description: A test workflow
steps:
  - id: step1
    type: log
    config:
      message: Hello World
      level: info
`;

      const result = validator.parseAndValidate(yamlContent);
      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.nameSpace).toBe('testNameSpace');
      expect(result.workflow?.steps).toHaveLength(1);
    });

    it('should handle YAML parse errors', () => {
      const invalidYaml = `
nameSpace: testNameSpace
name: testWorkflow
version: 1.0.0
steps:
  - id: step1
    type: log
    config:
      message: "unclosed quote
`;

      const result = validator.parseAndValidate(invalidYaml);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === 'YAML_PARSE_ERROR')).toBe(true);
    });

    it('should validate complex workflow structure', () => {
      const complexYaml = `
nameSpace: testNameSpace
name: complexWorkflow
version: 1.0.0
description: Complex workflow with multiple step types
author: Test Author
tags:
  - test
  - complex
inputs:
  inputParam:
    type: string
    required: true
    description: Test input parameter
outputs:
  result:
    type: string
    source: step.finalStep.result
variables:
  tempVar: "initial value"
metadata:
  timeout: 30000
  retryPolicy:
    maxAttempts: 3
    backoffStrategy: exponential
steps:
  - id: step1
    name: Log Step
    type: log
    config:
      message: "Starting workflow with input: \${input.inputParam}"
      level: info
  - id: step2
    name: Delay Step
    type: delay
    dependsOn: step1
    config:
      duration: 1000
      reason: "Wait before processing"
  - id: step3
    name: Conditional Step
    type: conditional
    dependsOn: step2
    config:
      condition: "\${input.inputParam} != ''"
      thenSteps:
        - id: step3a
          type: log
          config:
            message: "Processing input"
      elseSteps:
        - id: step3b
          type: log
          config:
            message: "No input provided"
  - id: finalStep
    name: Final Step
    type: log
    dependsOn: step3
    outputs:
      result: "Workflow completed"
    config:
      message: "Workflow finished"
`;

      const result = validator.parseAndValidate(complexYaml);
      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.steps).toHaveLength(4);
      expect(result.workflow?.inputs?.inputParam).toBeDefined();
      expect(result.workflow?.outputs?.result).toBeDefined();
    });
  });

  describe('Parameter Substitution Validation', () => {
    it('should validate parameter substitutions in workflow', () => {
      const context: ParameterSubstitutionContext = {
        env: { NODE_ENV: 'test' },
        workflow: {
          id: 'test-workflow',
          instanceId: 'test-instance',
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0'
        },
        input: { testInput: 'value' },
        variables: { testVar: 'varValue' },
        step: {
          id: 'current-step',
          type: 'log',
          outputs: {}
        },
        outputs: {}
      };

      const yamlWithSubstitutions = `
nameSpace: testNameSpace
name: testWorkflow
version: 1.0.0
steps:
  - id: step1
    type: log
    config:
      message: "Environment: \${env.NODE_ENV}, Input: \${input.testInput}, Variable: \${variables.testVar}"
`;

      const result = validator.parseAndValidate(yamlWithSubstitutions, context);
      expect(result.success).toBe(true);
    });

    it('should detect invalid parameter references', () => {
      const context: ParameterSubstitutionContext = {
        env: {},
        workflow: {
          id: 'test-workflow',
          instanceId: 'test-instance',
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0'
        },
        input: {},
        variables: {},
        step: {
          id: 'current-step',
          type: 'log',
          outputs: {}
        },
        outputs: {}
      };

      const yamlWithInvalidRefs = `
nameSpace: testNameSpace
name: testWorkflow
version: 1.0.0
steps:
  - id: step1
    type: log
    config:
      message: "Invalid ref: \${input.nonExistentParam}"
`;

      const result = validator.parseAndValidate(yamlWithInvalidRefs, context);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Step Configuration Validation', () => {
    describe('LogStep Configuration', () => {
      it('should validate log step configuration', () => {
        const workflow: YamlWorkflowDefinition = {
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0',
          steps: [
            {
              id: 'logStep',
              type: 'log',
              config: {
                message: 'Test message',
                level: 'info',
                data: { key: 'value' }
              }
            }
          ]
        };

        const result = validator.validateSchema(workflow);
        expect(result.valid).toBe(true);
      });

      it('should require message in log step', () => {
        const workflow = {
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0',
          steps: [
            {
              id: 'logStep',
              type: 'log',
              config: {
                level: 'info'
                // Missing required message
              }
            }
          ]
        };

        const result = validator.validateSchema(workflow);
        expect(result.valid).toBe(false);
      });
    });

    describe('DelayStep Configuration', () => {
      it('should validate delay step configuration', () => {
        const workflow: YamlWorkflowDefinition = {
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0',
          steps: [
            {
              id: 'delayStep',
              type: 'delay',
              config: {
                duration: 5000,
                reason: 'Wait for external system'
              }
            }
          ]
        };

        const result = validator.validateSchema(workflow);
        expect(result.valid).toBe(true);
      });
    });

    describe('ApiCallStep Configuration', () => {
      it('should validate API call step configuration', () => {
        const workflow: YamlWorkflowDefinition = {
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0',
          steps: [
            {
              id: 'apiStep',
              type: 'apiCall',
              config: {
                url: 'https://api.example.com/data',
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer ${env.API_TOKEN}'
                },
                expectedStatusCodes: [200, 201]
              }
            }
          ]
        };

        const result = validator.validateSchema(workflow);
        expect(result.valid).toBe(true);
      });
    });

    describe('ConditionalStep Configuration', () => {
      it('should validate conditional step configuration', () => {
        const workflow: YamlWorkflowDefinition = {
          nameSpace: 'testNameSpace',
          name: 'testWorkflow',
          version: '1.0.0',
          steps: [
            {
              id: 'conditionalStep',
              type: 'conditional',
              config: {
                condition: '${input.shouldProcess} === true',
                thenSteps: [
                  {
                    id: 'thenStep',
                    type: 'log',
                    config: { message: 'Condition is true' }
                  }
                ],
                elseSteps: [
                  {
                    id: 'elseStep',
                    type: 'log',
                    config: { message: 'Condition is false' }
                  }
                ]
              }
            }
          ]
        };

        const result = validator.validateSchema(workflow);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Parameter Substitution Engine', () => {
    let context: ParameterSubstitutionContext;

    beforeEach(() => {
      context = ParameterSubstitution.createTestContext({
        env: { NODE_ENV: 'test', API_KEY: 'secret' },
        input: { userName: 'testUser', count: 5 },
        variables: { tempData: { items: ['a', 'b', 'c'] } },
        step: {
          id: 'currentStep',
          type: 'log',
          outputs: { result: 'success' }
        }
      });
    });

    it('should substitute environment variables', () => {
      const result = ParameterSubstitution.substituteString(
        'Environment: ${env.NODE_ENV}',
        context
      );
      expect(result.result).toBe('Environment: test');
      expect(result.errors).toHaveLength(0);
    });

    it('should substitute workflow properties', () => {
      const result = ParameterSubstitution.substituteString(
        'Workflow: ${workflow.nameSpace}/${workflow.name}',
        context
      );
      expect(result.result).toBe('Workflow: testNameSpace/testWorkflow');
      expect(result.errors).toHaveLength(0);
    });

    it('should substitute input parameters', () => {
      const result = ParameterSubstitution.substituteString(
        'User: ${input.userName}, Count: ${input.count}',
        context
      );
      expect(result.result).toBe('User: testUser, Count: 5');
      expect(result.errors).toHaveLength(0);
    });

    it('should substitute complex objects', () => {
      const input = {
        message: 'Hello ${input.userName}',
        config: {
          apiKey: '${env.API_KEY}',
          count: '${input.count}'
        }
      };

      const result = ParameterSubstitution.substitute(input, context);
      expect(result.result.message).toBe('Hello testUser');
      expect(result.result.config.apiKey).toBe('secret');
      expect(result.result.config.count).toBe('5');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing references in strict mode', () => {
      const result = ParameterSubstitution.substituteString(
        'Missing: ${input.nonExistent}',
        context,
        true
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('UNDEFINED_REFERENCE');
    });

    it('should handle missing references in non-strict mode', () => {
      const result = ParameterSubstitution.substituteString(
        'Missing: ${input.nonExistent}',
        context,
        false
      );
      expect(result.result).toBe('Missing: ');
      expect(result.errors).toHaveLength(1);
    });

    it('should detect substitution patterns', () => {
      expect(ParameterSubstitution.hasSubstitutionPatterns('${env.TEST}')).toBe(true);
      expect(ParameterSubstitution.hasSubstitutionPatterns('no patterns here')).toBe(false);
      expect(ParameterSubstitution.hasSubstitutionPatterns(['${input.test}', 'normal'])).toBe(true);
      expect(ParameterSubstitution.hasSubstitutionPatterns({ key: '${var.test}' })).toBe(true);
    });

    it('should extract expressions from values', () => {
      const expressions = ParameterSubstitution.extractExpressions({
        message: '${env.NODE_ENV} and ${input.userName}',
        nested: {
          value: '${variables.tempData}'
        }
      });

      expect(expressions).toContain('env.NODE_ENV');
      expect(expressions).toContain('input.userName');
      expect(expressions).toContain('variables.tempData');
      expect(expressions).toHaveLength(3);
    });
  });
});
