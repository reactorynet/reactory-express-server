# YAML Workflow System - Test-Driven Development Plan

## Overview

This TDD plan implements the YAML-based workflow definition system following a red-green-refactor approach. Each feature will be developed with tests first, ensuring quality and maintainability from the start.

## Development Phases

### Phase 1: Core Infrastructure (Weeks 1-2)

#### 1.1 YAML Schema Definition and Validation

**Test File**: `src/workflow/yaml/__tests__/YAMLWorkflowSchema.test.ts`

```typescript
describe('YAML Workflow Schema Validation', () => {
  describe('Basic Workflow Structure', () => {
    test('should validate minimal workflow definition', () => {
      const yaml = `
        version: "1.0.0"
        metadata:
          name: "test-workflow"
          namespace: "test"
        workflow:
          steps:
            - id: "step1"
              type: "log"
              config:
                message: "Hello World"
      `;
      expect(validateYAMLWorkflow(yaml)).toEqual({ valid: true, errors: [] });
    });

    test('should reject workflow without required fields', () => {
      const yaml = `
        version: "1.0.0"
        # Missing metadata and workflow
      `;
      const result = validateYAMLWorkflow(yaml);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('metadata is required');
      expect(result.errors).toContain('workflow is required');
    });

    test('should validate metadata fields', () => {
      // Test cases for name, namespace, version validation
    });

    test('should validate step structure', () => {
      // Test cases for step id, type, config validation
    });
  });

  describe('Parameter Substitution', () => {
    test('should resolve environment variables', () => {
      const yaml = `
        config:
          environment:
            API_URL: "\${env.API_URL}"
      `;
      process.env.API_URL = 'https://api.example.com';
      const result = parseYAMLWorkflow(yaml);
      expect(result.config.environment.API_URL).toBe('https://api.example.com');
    });

    test('should resolve workflow variables', () => {
      // Test \${workflow.id}, \${workflow.instanceId}, etc.
    });

    test('should resolve input variables', () => {
      // Test \${input.fieldName}
    });

    test('should resolve step output variables', () => {
      // Test \${step.stepId.output.field}
    });
  });
});
```

**Implementation Files**:
- `src/workflow/yaml/schema/WorkflowSchema.json` - JSON Schema definition
- `src/workflow/yaml/validators/YAMLValidator.ts` - Schema validation logic
- `src/workflow/yaml/parsers/ParameterSubstitution.ts` - Parameter resolution

#### 1.2 YAML Parser Implementation

**Test File**: `src/workflow/yaml/__tests__/YAMLWorkflowParser.test.ts`

```typescript
describe('YAMLWorkflowParser', () => {
  let parser: YAMLWorkflowParser;

  beforeEach(() => {
    parser = new YAMLWorkflowParser();
  });

  describe('Parsing Valid YAML', () => {
    test('should parse simple workflow with one step', async () => {
      const yaml = `
        version: "1.0.0"
        metadata:
          name: "simple-workflow"
          namespace: "test"
        workflow:
          steps:
            - id: "log-step"
              type: "log"
              config:
                message: "Hello World"
      `;
      
      const result = await parser.parse(yaml);
      expect(result.metadata.name).toBe('simple-workflow');
      expect(result.workflow.steps).toHaveLength(1);
      expect(result.workflow.steps[0].type).toBe('log');
    });

    test('should parse workflow with multiple steps', async () => {
      // Test sequential steps
    });

    test('should parse workflow with conditional steps', async () => {
      // Test conditional logic
    });

    test('should parse workflow with parallel steps', async () => {
      // Test parallel execution
    });
  });

  describe('Error Handling', () => {
    test('should report syntax errors with line numbers', async () => {
      const invalidYaml = `
        version: "1.0.0"
        metadata:
          name: invalid-workflow
          namespace: test
        workflow
          steps:  # Missing colon
      `;
      
      await expect(parser.parse(invalidYaml)).rejects.toThrow(/line 6/);
    });

    test('should report validation errors', async () => {
      const invalidStructure = `
        version: "1.0.0"
        metadata:
          name: ""  # Empty name
      `;
      
      await expect(parser.parse(invalidStructure)).rejects.toThrow(/name cannot be empty/);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle deeply nested workflows', async () => {
      // Test complex nesting
    });

    test('should parse workflows with all step types', async () => {
      // Test comprehensive workflow
    });
  });
});
```

**Implementation Files**:
- `src/workflow/yaml/parsers/YAMLWorkflowParser.ts` - Main parser class
- `src/workflow/yaml/types/WorkflowDefinition.ts` - TypeScript interfaces
- `src/workflow/yaml/errors/ParseError.ts` - Custom error classes

#### 1.3 Step Registry System

**Test File**: `src/workflow/yaml/__tests__/YAMLStepRegistry.test.ts`

```typescript
describe('YAMLStepRegistry', () => {
  let registry: YAMLStepRegistry;

  beforeEach(() => {
    registry = new YAMLStepRegistry();
  });

  describe('Step Registration', () => {
    test('should register built-in step types', () => {
      registry.registerBuiltInSteps();
      
      expect(registry.hasStep('log')).toBe(true);
      expect(registry.hasStep('delay')).toBe(true);
      expect(registry.hasStep('api-call')).toBe(true);
      expect(registry.hasStep('validation')).toBe(true);
    });

    test('should register custom step type', () => {
      const customStep: YAMLStepDefinition = {
        type: 'custom-step',
        description: 'Custom step for testing',
        configSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        implementation: CustomStepImplementation
      };
      
      registry.registerStep(customStep);
      expect(registry.hasStep('custom-step')).toBe(true);
    });

    test('should validate step configuration against schema', () => {
      registry.registerBuiltInSteps();
      
      const validConfig = { message: 'Hello World' };
      expect(registry.validateStepConfig('log', validConfig)).toEqual({ valid: true });
      
      const invalidConfig = { message: 123 }; // Should be string
      const result = registry.validateStepConfig('log', invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('message must be a string');
    });
  });

  describe('Step Resolution', () => {
    test('should resolve step implementation', () => {
      registry.registerBuiltInSteps();
      const implementation = registry.getStepImplementation('log');
      expect(implementation).toBeDefined();
      expect(implementation.prototype).toBeInstanceOf(StepBody);
    });

    test('should throw error for unknown step type', () => {
      expect(() => registry.getStepImplementation('unknown-step'))
        .toThrow('Step type "unknown-step" not found');
    });
  });

  describe('Step Metadata', () => {
    test('should provide step documentation', () => {
      registry.registerBuiltInSteps();
      const metadata = registry.getStepMetadata('api-call');
      
      expect(metadata.description).toBeDefined();
      expect(metadata.configSchema).toBeDefined();
      expect(metadata.examples).toBeDefined();
    });

    test('should list all registered steps', () => {
      registry.registerBuiltInSteps();
      const steps = registry.listSteps();
      
      expect(steps).toContain('log');
      expect(steps).toContain('delay');
      expect(steps).toContain('api-call');
    });
  });
});
```

**Implementation Files**:
- `src/workflow/yaml/registry/YAMLStepRegistry.ts` - Step registry implementation
- `src/workflow/yaml/steps/interfaces/YAMLStepDefinition.ts` - Step definition interface
- `src/workflow/yaml/steps/base/BaseYAMLStep.ts` - Base step implementation

### Phase 2: Basic Step Types (Weeks 3-4)

#### 2.1 Core Step Implementations

**Test File**: `src/workflow/yaml/__tests__/steps/CoreSteps.test.ts`

```typescript
describe('Core YAML Steps', () => {
  describe('LogStep', () => {
    test('should log message with correct level', async () => {
      const config = {
        message: 'Test log message',
        level: 'info'
      };
      
      const step = new LogStep();
      const context = createMockStepContext();
      const consoleSpy = jest.spyOn(console, 'log');
      
      step.configure(config);
      await step.run(context);
      
      expect(consoleSpy).toHaveBeenCalledWith('Test log message');
    });

    test('should support parameter substitution in message', async () => {
      const config = {
        message: 'Processing \${input.itemName}',
        level: 'info'
      };
      
      const context = createMockStepContext({
        workflowData: { itemName: 'customer-data' }
      });
      
      const step = new LogStep();
      step.configure(config);
      await step.run(context);
      
      // Verify substitution occurred
    });
  });

  describe('DelayStep', () => {
    test('should delay execution for specified duration', async () => {
      const config = { duration: 100 }; // 100ms
      
      const step = new DelayStep();
      const context = createMockStepContext();
      
      const startTime = Date.now();
      await step.run(context);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    test('should support dynamic duration from workflow data', async () => {
      const config = { duration: '\${input.delayMs}' };
      
      const context = createMockStepContext({
        workflowData: { delayMs: 50 }
      });
      
      const step = new DelayStep();
      step.configure(config);
      
      const startTime = Date.now();
      await step.run(context);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('ValidationStep', () => {
    test('should validate data against JSON schema', async () => {
      const config = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number', minimum: 0 }
          },
          required: ['name']
        },
        data: '\${input.userData}'
      };
      
      const context = createMockStepContext({
        workflowData: { 
          userData: { name: 'John', age: 30 }
        }
      });
      
      const step = new ValidationStep();
      step.configure(config);
      const result = await step.run(context);
      
      expect(result).toEqual(ExecutionResult.next());
    });

    test('should fail validation for invalid data', async () => {
      const config = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        },
        data: '\${input.userData}'
      };
      
      const context = createMockStepContext({
        workflowData: { 
          userData: { age: 30 } // Missing required 'name'
        }
      });
      
      const step = new ValidationStep();
      step.configure(config);
      
      await expect(step.run(context)).rejects.toThrow('Validation failed');
    });
  });

  describe('DataTransformationStep', () => {
    test('should execute JavaScript transformation', async () => {
      const config = {
        script: `
          data.customers.forEach(customer => {
            customer.fullName = customer.firstName + ' ' + customer.lastName;
          });
        `,
        inputPath: 'input.customers',
        outputPath: 'output.transformedCustomers'
      };
      
      const context = createMockStepContext({
        workflowData: {
          customers: [
            { firstName: 'John', lastName: 'Doe' },
            { firstName: 'Jane', lastName: 'Smith' }
          ]
        }
      });
      
      const step = new DataTransformationStep();
      step.configure(config);
      await step.run(context);
      
      expect(context.workflowData.transformedCustomers[0].fullName).toBe('John Doe');
      expect(context.workflowData.transformedCustomers[1].fullName).toBe('Jane Smith');
    });

    test('should handle transformation errors gracefully', async () => {
      const config = {
        script: 'throw new Error("Transformation failed");',
        inputPath: 'input.data'
      };
      
      const context = createMockStepContext();
      const step = new DataTransformationStep();
      step.configure(config);
      
      await expect(step.run(context)).rejects.toThrow('Transformation failed');
    });
  });
});
```

#### 2.2 External Integration Steps

**Test File**: `src/workflow/yaml/__tests__/steps/ExternalSteps.test.ts`

```typescript
describe('External Integration Steps', () => {
  describe('APICallStep', () => {
    test('should make successful GET request', async () => {
      const config = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer \${env.API_TOKEN}'
        },
        timeout: 5000
      };
      
      // Mock HTTP client
      const mockResponse = { data: [{ id: 1, name: 'John' }] };
      jest.spyOn(httpClient, 'request').mockResolvedValue(mockResponse);
      
      const step = new APICallStep();
      const context = createMockStepContext();
      
      step.configure(config);
      const result = await step.run(context);
      
      expect(result).toEqual(ExecutionResult.next());
      expect(step.response).toEqual(mockResponse);
    });

    test('should handle API errors with retry logic', async () => {
      const config = {
        url: 'https://api.example.com/users',
        method: 'GET',
        retry: {
          maxAttempts: 3,
          delay: 100,
          backoff: 'exponential'
        }
      };
      
      // Mock API failure then success
      jest.spyOn(httpClient, 'request')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });
      
      const step = new APICallStep();
      const context = createMockStepContext();
      
      step.configure(config);
      const result = await step.run(context);
      
      expect(result).toEqual(ExecutionResult.next());
      expect(httpClient.request).toHaveBeenCalledTimes(3);
    });

    test('should timeout long-running requests', async () => {
      const config = {
        url: 'https://slow-api.example.com/data',
        method: 'GET',
        timeout: 100
      };
      
      // Mock slow response
      jest.spyOn(httpClient, 'request').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      
      const step = new APICallStep();
      const context = createMockStepContext();
      
      step.configure(config);
      
      await expect(step.run(context)).rejects.toThrow('Request timeout');
    });
  });

  describe('CLICommandStep', () => {
    test('should execute CLI command successfully', async () => {
      const config = {
        command: 'Csv2Json',
        args: [
          '--source=/path/to/input.csv',
          '--output=/path/to/output.json'
        ],
        timeout: 30000
      };
      
      // Mock CLI execution
      const mockResult = {
        exitCode: 0,
        stdout: 'Conversion completed successfully',
        stderr: ''
      };
      jest.spyOn(cliExecutor, 'execute').mockResolvedValue(mockResult);
      
      const step = new CLICommandStep();
      const context = createMockStepContext();
      
      step.configure(config);
      const result = await step.run(context);
      
      expect(result).toEqual(ExecutionResult.next());
      expect(cliExecutor.execute).toHaveBeenCalledWith('Csv2Json', config.args);
    });

    test('should handle CLI command failures', async () => {
      const config = {
        command: 'NonExistentCommand',
        args: []
      };
      
      const mockResult = {
        exitCode: 1,
        stdout: '',
        stderr: 'Command not found'
      };
      jest.spyOn(cliExecutor, 'execute').mockResolvedValue(mockResult);
      
      const step = new CLICommandStep();
      const context = createMockStepContext();
      
      step.configure(config);
      
      await expect(step.run(context)).rejects.toThrow('Command failed with exit code 1');
    });

    test('should support parameter substitution in arguments', async () => {
      const config = {
        command: 'DataProcessor',
        args: [
          '--input=\${input.sourcePath}',
          '--output=\${env.OUTPUT_DIR}/\${workflow.instanceId}.json'
        ]
      };
      
      const context = createMockStepContext({
        workflowData: { sourcePath: '/data/input.csv' },
        workflowInstance: { id: 'wf-123' }
      });
      
      const step = new CLICommandStep();
      step.configure(config);
      
      const expectedArgs = [
        '--input=/data/input.csv',
        '--output=/output/wf-123.json'
      ];
      
      // Verify parameter substitution
    });
  });

  describe('FileOperationStep', () => {
    test('should read file contents', async () => {
      const config = {
        operation: 'read',
        source: '/path/to/file.txt',
        outputPath: 'output.fileContents'
      };
      
      jest.spyOn(fs, 'readFile').mockResolvedValue('File contents');
      
      const step = new FileOperationStep();
      const context = createMockStepContext();
      
      step.configure(config);
      await step.run(context);
      
      expect(context.workflowData.fileContents).toBe('File contents');
    });

    test('should write file contents', async () => {
      const config = {
        operation: 'write',
        destination: '/path/to/output.txt',
        content: '\${input.data}'
      };
      
      const context = createMockStepContext({
        workflowData: { data: 'Hello World' }
      });
      
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      
      const step = new FileOperationStep();
      step.configure(config);
      await step.run(context);
      
      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/output.txt', 'Hello World');
    });

    test('should copy files', async () => {
      const config = {
        operation: 'copy',
        source: '/path/to/source.txt',
        destination: '/path/to/destination.txt'
      };
      
      jest.spyOn(fs, 'copyFile').mockResolvedValue(undefined);
      
      const step = new FileOperationStep();
      const context = createMockStepContext();
      
      step.configure(config);
      await step.run(context);
      
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/path/to/source.txt',
        '/path/to/destination.txt'
      );
    });
  });
});
```

**Implementation Files**:
- `src/workflow/yaml/steps/core/LogStep.ts`
- `src/workflow/yaml/steps/core/DelayStep.ts`
- `src/workflow/yaml/steps/core/ValidationStep.ts`
- `src/workflow/yaml/steps/core/DataTransformationStep.ts`
- `src/workflow/yaml/steps/external/APICallStep.ts`
- `src/workflow/yaml/steps/external/CLICommandStep.ts`
- `src/workflow/yaml/steps/external/FileOperationStep.ts`

### Phase 3: Advanced Features (Weeks 5-6)

#### 3.1 Control Flow Steps

**Test File**: `src/workflow/yaml/__tests__/steps/ControlFlowSteps.test.ts`

```typescript
describe('Control Flow Steps', () => {
  describe('ConditionalStep', () => {
    test('should execute "then" branch when condition is true', async () => {
      const config = {
        condition: '\${input.value} > 10',
        then: 'execute-positive-path',
        else: 'execute-negative-path'
      };
      
      const context = createMockStepContext({
        workflowData: { value: 15 }
      });
      
      const step = new ConditionalStep();
      step.configure(config);
      const result = await step.run(context);
      
      expect(result.nextStepId).toBe('execute-positive-path');
    });

    test('should execute "else" branch when condition is false', async () => {
      const config = {
        condition: '\${input.value} > 10',
        then: 'execute-positive-path',
        else: 'execute-negative-path'
      };
      
      const context = createMockStepContext({
        workflowData: { value: 5 }
      });
      
      const step = new ConditionalStep();
      step.configure(config);
      const result = await step.run(context);
      
      expect(result.nextStepId).toBe('execute-negative-path');
    });

    test('should handle complex conditions', async () => {
      const config = {
        condition: '\${input.status} === "active" && \${input.count} > 0',
        then: 'process-active-items',
        else: 'skip-processing'
      };
      
      // Test various combinations
    });
  });

  describe('ParallelStep', () => {
    test('should execute all branches in parallel', async () => {
      const config = {
        branches: [
          {
            id: 'branch1',
            steps: [
              { type: 'delay', config: { duration: 100 } },
              { type: 'log', config: { message: 'Branch 1 complete' } }
            ]
          },
          {
            id: 'branch2', 
            steps: [
              { type: 'delay', config: { duration: 50 } },
              { type: 'log', config: { message: 'Branch 2 complete' } }
            ]
          }
        ],
        waitForAll: true
      };
      
      const step = new ParallelStep();
      const context = createMockStepContext();
      
      const startTime = Date.now();
      step.configure(config);
      await step.run(context);
      const endTime = Date.now();
      
      // Should complete in ~100ms (longest branch), not 150ms (sequential)
      expect(endTime - startTime).toBeLessThan(150);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    test('should handle branch failures gracefully', async () => {
      const config = {
        branches: [
          {
            id: 'success-branch',
            steps: [{ type: 'log', config: { message: 'Success' } }]
          },
          {
            id: 'failure-branch',
            steps: [{ type: 'api-call', config: { url: 'invalid-url' } }]
          }
        ],
        continueOnFailure: true
      };
      
      // Test partial failure scenarios
    });
  });

  describe('ForEachStep', () => {
    test('should iterate over array items', async () => {
      const config = {
        items: '\${input.customers}',
        steps: [
          {
            type: 'log',
            config: {
              message: 'Processing customer: \${item.name}'
            }
          }
        ]
      };
      
      const context = createMockStepContext({
        workflowData: {
          customers: [
            { name: 'John', id: 1 },
            { name: 'Jane', id: 2 }
          ]
        }
      });
      
      const step = new ForEachStep();
      step.configure(config);
      await step.run(context);
      
      // Verify each item was processed
    });

    test('should support parallel iteration', async () => {
      const config = {
        items: '\${input.items}',
        parallel: true,
        maxConcurrency: 3,
        steps: [
          {
            type: 'delay',
            config: { duration: 100 }
          }
        ]
      };
      
      // Test parallel execution performance
    });
  });

  describe('WhileStep', () => {
    test('should loop while condition is true', async () => {
      const config = {
        condition: '\${data.counter} < 5',
        steps: [
          {
            type: 'data-transformation',
            config: {
              script: 'data.counter += 1;'
            }
          }
        ]
      };
      
      const context = createMockStepContext({
        workflowData: { counter: 0 }
      });
      
      const step = new WhileStep();
      step.configure(config);
      await step.run(context);
      
      expect(context.workflowData.counter).toBe(5);
    });

    test('should prevent infinite loops with max iterations', async () => {
      const config = {
        condition: 'true', // Always true
        maxIterations: 10,
        steps: [
          {
            type: 'log',
            config: { message: 'Iteration' }
          }
        ]
      };
      
      const step = new WhileStep();
      const context = createMockStepContext();
      
      step.configure(config);
      await expect(step.run(context)).rejects.toThrow('Maximum iterations exceeded');
    });
  });
});
```

#### 3.2 YAML to WorkflowBuilder Converter

**Test File**: `src/workflow/yaml/__tests__/YAMLWorkflowBuilder.test.ts`

```typescript
describe('YAMLWorkflowBuilder', () => {
  let builder: YAMLWorkflowBuilder;
  let registry: YAMLStepRegistry;

  beforeEach(() => {
    registry = new YAMLStepRegistry();
    registry.registerBuiltInSteps();
    builder = new YAMLWorkflowBuilder(registry);
  });

  describe('Simple Sequential Workflows', () => {
    test('should convert simple YAML workflow to WorkflowBuilder', async () => {
      const yamlWorkflow = {
        metadata: {
          name: 'test-workflow',
          namespace: 'test'
        },
        workflow: {
          steps: [
            {
              id: 'step1',
              type: 'log',
              config: { message: 'Hello' },
              onSuccess: 'step2'
            },
            {
              id: 'step2',
              type: 'log',
              config: { message: 'World' }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      
      expect(workflowClass.prototype.id).toBe('test-workflow');
      expect(workflowClass.prototype.version).toBe(1);
      
      // Test workflow execution
      const workflow = new workflowClass();
      const mockBuilder = createMockWorkflowBuilder();
      workflow.build(mockBuilder);
      
      // Verify WorkflowBuilder calls
      expect(mockBuilder.startWith).toHaveBeenCalledWith(expect.any(Function));
      expect(mockBuilder.then).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle step input/output mapping', async () => {
      const yamlWorkflow = {
        metadata: { name: 'data-workflow', namespace: 'test' },
        workflow: {
          steps: [
            {
              id: 'transform',
              type: 'data-transformation',
              config: { script: 'data.result = data.input * 2;' },
              input: {
                mapping: { input: 'workflow.startData.value' }
              },
              output: {
                mapping: { result: 'workflow.transformedValue' }
              }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      
      // Test input/output mapping
    });
  });

  describe('Control Flow Conversion', () => {
    test('should convert conditional workflow', async () => {
      const yamlWorkflow = {
        metadata: { name: 'conditional-workflow', namespace: 'test' },
        workflow: {
          steps: [
            {
              id: 'condition',
              type: 'conditional',
              config: {
                condition: '\${input.value} > 10',
                then: 'high-value',
                else: 'low-value'
              }
            },
            {
              id: 'high-value',
              type: 'log',
              config: { message: 'High value detected' }
            },
            {
              id: 'low-value',
              type: 'log',
              config: { message: 'Low value detected' }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      
      // Verify conditional structure
    });

    test('should convert parallel workflow', async () => {
      const yamlWorkflow = {
        metadata: { name: 'parallel-workflow', namespace: 'test' },
        workflow: {
          steps: [
            {
              id: 'parallel-processing',
              type: 'parallel',
              config: {
                branches: [
                  {
                    id: 'branch1',
                    steps: [
                      { type: 'log', config: { message: 'Branch 1' } }
                    ]
                  },
                  {
                    id: 'branch2',
                    steps: [
                      { type: 'log', config: { message: 'Branch 2' } }
                    ]
                  }
                ]
              }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      
      // Verify parallel structure
    });

    test('should convert foreach workflow', async () => {
      const yamlWorkflow = {
        metadata: { name: 'foreach-workflow', namespace: 'test' },
        workflow: {
          steps: [
            {
              id: 'process-items',
              type: 'foreach',
              config: {
                items: '\${input.items}',
                steps: [
                  {
                    type: 'log',
                    config: { message: 'Processing: \${item}' }
                  }
                ]
              }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      
      // Verify foreach structure
    });
  });

  describe('Error Handling Integration', () => {
    test('should integrate with existing ErrorHandler', async () => {
      const yamlWorkflow = {
        metadata: { name: 'error-handling-workflow', namespace: 'test' },
        config: {
          maxRetries: 3,
          retryDelay: 1000
        },
        workflow: {
          steps: [
            {
              id: 'risky-operation',
              type: 'api-call',
              config: {
                url: 'https://unreliable-api.com/data'
              },
              retry: {
                maxAttempts: 2,
                delay: 500
              },
              onFailure: 'handle-error'
            },
            {
              id: 'handle-error',
              type: 'error-handler',
              config: {
                category: 'APIError',
                severity: 'medium'
              }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      
      // Verify error handling integration
    });
  });

  describe('Complex Workflow Scenarios', () => {
    test('should handle deeply nested workflows', async () => {
      // Test complex nesting scenarios
    });

    test('should preserve workflow metadata and configuration', async () => {
      const yamlWorkflow = {
        metadata: {
          name: 'complex-workflow',
          namespace: 'production',
          version: '2.1.0',
          description: 'Complex workflow for testing',
          tags: ['test', 'complex']
        },
        config: {
          timeout: 300000,
          priority: 5,
          parallelism: 3
        },
        workflow: {
          steps: [
            {
              id: 'step1',
              type: 'log',
              config: { message: 'Starting' }
            }
          ]
        }
      };
      
      const workflowClass = builder.buildWorkflow(yamlWorkflow);
      const instance = new workflowClass();
      
      expect(instance.id).toBe('complex-workflow');
      expect(instance.namespace).toBe('production');
      expect(instance.description).toBe('Complex workflow for testing');
    });
  });
});
```

**Implementation Files**:
- `src/workflow/yaml/builder/YAMLWorkflowBuilder.ts` - Main builder class
- `src/workflow/yaml/steps/control/ConditionalStep.ts`
- `src/workflow/yaml/steps/control/ParallelStep.ts`
- `src/workflow/yaml/steps/control/ForEachStep.ts`
- `src/workflow/yaml/steps/control/WhileStep.ts`

### Phase 4: Integration and End-to-End Testing (Week 7)

#### 4.1 Full Integration Tests

**Test File**: `src/workflow/yaml/__tests__/integration/YAMLWorkflowIntegration.test.ts`

```typescript
describe('YAML Workflow Integration', () => {
  let workflowRunner: WorkflowRunner;
  let host: WorkflowHost;

  beforeEach(async () => {
    workflowRunner = WorkflowRunner.getInstance();
    host = await workflowRunner.start();
  });

  afterEach(async () => {
    await workflowRunner.stop();
  });

  describe('End-to-End Workflow Execution', () => {
    test('should execute complete YAML workflow', async () => {
      const yamlDefinition = `
        version: "1.0.0"
        metadata:
          name: "e2e-test-workflow"
          namespace: "integration"
          
        workflow:
          steps:
            - id: "start"
              type: "log"
              config:
                message: "Starting E2E test workflow"
              onSuccess: "fetch-data"
              
            - id: "fetch-data"
              type: "api-call"
              config:
                url: "https://jsonplaceholder.typicode.com/users/1"
                method: "GET"
              output:
                mapping:
                  userData: "step.response.data"
              onSuccess: "process-data"
              
            - id: "process-data"
              type: "data-transformation"
              config:
                script: |
                  data.userData.processed = true;
                  data.userData.processedAt = new Date().toISOString();
              onSuccess: "complete"
              
            - id: "complete"
              type: "log"
              config:
                message: "Workflow completed successfully"
      `;
      
      const workflow = await YAMLWorkflowLoader.loadFromString(yamlDefinition);
      host.registerWorkflow(workflow);
      
      const instanceId = await host.startWorkflow('e2e-test-workflow', 1, {});
      
      // Wait for completion
      await waitForWorkflowCompletion(instanceId, 10000);
      
      const instance = await workflowRunner.getWorkflowInstance(instanceId);
      expect(instance.status).toBe(WorkflowStatus.Complete);
      expect(instance.data.userData.processed).toBe(true);
    });

    test('should handle workflow with error recovery', async () => {
      const yamlDefinition = `
        version: "1.0.0"
        metadata:
          name: "error-recovery-workflow"
          namespace: "integration"
          
        config:
          maxRetries: 2
          retryDelay: 100
          
        workflow:
          steps:
            - id: "risky-operation"
              type: "api-call"
              config:
                url: "https://httpstat.us/500"  # Always returns 500
                method: "GET"
              retry:
                maxAttempts: 3
                delay: 50
              onFailure: "recovery"
              
            - id: "recovery"
              type: "log"
              config:
                message: "Recovered from failure"
      `;
      
      const workflow = await YAMLWorkflowLoader.loadFromString(yamlDefinition);
      host.registerWorkflow(workflow);
      
      const instanceId = await host.startWorkflow('error-recovery-workflow', 1, {});
      await waitForWorkflowCompletion(instanceId, 10000);
      
      const instance = await workflowRunner.getWorkflowInstance(instanceId);
      expect(instance.status).toBe(WorkflowStatus.Complete);
      
      // Verify recovery step was executed
    });

    test('should execute parallel branches correctly', async () => {
      const yamlDefinition = `
        version: "1.0.0"
        metadata:
          name: "parallel-workflow"
          namespace: "integration"
          
        workflow:
          steps:
            - id: "parallel-processing"
              type: "parallel"
              config:
                branches:
                  - id: "branch1"
                    steps:
                      - type: "delay"
                        config:
                          duration: 100
                      - type: "log"
                        config:
                          message: "Branch 1 completed"
                  - id: "branch2"
                    steps:
                      - type: "delay"
                        config:
                          duration: 50
                      - type: "log"
                        config:
                          message: "Branch 2 completed"
                waitForAll: true
              onSuccess: "complete"
              
            - id: "complete"
              type: "log"
              config:
                message: "All branches completed"
      `;
      
      const startTime = Date.now();
      const workflow = await YAMLWorkflowLoader.loadFromString(yamlDefinition);
      host.registerWorkflow(workflow);
      
      const instanceId = await host.startWorkflow('parallel-workflow', 1, {});
      await waitForWorkflowCompletion(instanceId, 5000);
      const endTime = Date.now();
      
      // Should complete in ~100ms (parallel), not 150ms (sequential)
      expect(endTime - startTime).toBeLessThan(200);
      
      const instance = await workflowRunner.getWorkflowInstance(instanceId);
      expect(instance.status).toBe(WorkflowStatus.Complete);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large YAML workflows efficiently', async () => {
      // Create workflow with 100 steps
      const steps = Array.from({ length: 100 }, (_, i) => ({
        id: `step-${i}`,
        type: 'log',
        config: { message: `Step ${i}` },
        onSuccess: i < 99 ? `step-${i + 1}` : undefined
      }));
      
      const yamlWorkflow = {
        metadata: { name: 'large-workflow', namespace: 'performance' },
        workflow: { steps }
      };
      
      const startTime = Date.now();
      const workflow = YAMLWorkflowBuilder.buildWorkflow(yamlWorkflow);
      const buildTime = Date.now() - startTime;
      
      expect(buildTime).toBeLessThan(1000); // Should build in < 1 second
      
      host.registerWorkflow(workflow);
      
      const execStartTime = Date.now();
      const instanceId = await host.startWorkflow('large-workflow', 1, {});
      await waitForWorkflowCompletion(instanceId, 30000);
      const execTime = Date.now() - execStartTime;
      
      expect(execTime).toBeLessThan(10000); // Should execute in < 10 seconds
    });

    test('should handle concurrent YAML workflow executions', async () => {
      const yamlDefinition = `
        version: "1.0.0"
        metadata:
          name: "concurrent-workflow"
          namespace: "performance"
          
        workflow:
          steps:
            - id: "work"
              type: "delay"
              config:
                duration: 100
            - id: "complete"
              type: "log"
              config:
                message: "Workflow \${workflow.instanceId} completed"
      `;
      
      const workflow = await YAMLWorkflowLoader.loadFromString(yamlDefinition);
      host.registerWorkflow(workflow);
      
      // Start 50 concurrent instances
      const promises = Array.from({ length: 50 }, async (_, i) => {
        const instanceId = await host.startWorkflow('concurrent-workflow', 1, {});
        await waitForWorkflowCompletion(instanceId, 5000);
        return instanceId;
      });
      
      const startTime = Date.now();
      const instanceIds = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(instanceIds).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete concurrently
    });
  });

  describe('Compatibility Tests', () => {
    test('should coexist with StepBody-based workflows', async () => {
      // Register traditional StepBody workflow
      class TraditionalStep extends StepBody {
        run(context: StepExecutionContext): Promise<ExecutionResult> {
          console.log('Traditional step executed');
          return ExecutionResult.next();
        }
      }
      
      class TraditionalWorkflow implements WorkflowBase<any> {
        id = 'traditional-workflow';
        version = 1;
        
        build(builder: WorkflowBuilder<any>) {
          builder.startWith(TraditionalStep);
        }
      }
      
      host.registerWorkflow(TraditionalWorkflow);
      
      // Register YAML workflow
      const yamlDefinition = `
        version: "1.0.0"
        metadata:
          name: "yaml-workflow"
          namespace: "compatibility"
        workflow:
          steps:
            - id: "yaml-step"
              type: "log"
              config:
                message: "YAML step executed"
      `;
      
      const yamlWorkflow = await YAMLWorkflowLoader.loadFromString(yamlDefinition);
      host.registerWorkflow(yamlWorkflow);
      
      // Execute both types
      const traditionalId = await host.startWorkflow('traditional-workflow', 1, {});
      const yamlId = await host.startWorkflow('yaml-workflow', 1, {});
      
      await Promise.all([
        waitForWorkflowCompletion(traditionalId, 5000),
        waitForWorkflowCompletion(yamlId, 5000)
      ]);
      
      // Both should complete successfully
      const traditionalInstance = await workflowRunner.getWorkflowInstance(traditionalId);
      const yamlInstance = await workflowRunner.getWorkflowInstance(yamlId);
      
      expect(traditionalInstance.status).toBe(WorkflowStatus.Complete);
      expect(yamlInstance.status).toBe(WorkflowStatus.Complete);
    });
  });
});
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up project structure and testing framework
- [ ] Implement YAML schema validation
- [ ] Create basic parser infrastructure
- [ ] Write tests for schema validation and parsing

### Week 2: Core Components
- [ ] Complete YAML parser implementation
- [ ] Build step registry system
- [ ] Create parameter substitution engine
- [ ] Write comprehensive parser tests

### Week 3: Basic Steps
- [ ] Implement core step types (log, delay, validation, transformation)
- [ ] Create external integration steps (API, CLI, file operations)
- [ ] Write step execution tests
- [ ] Add step configuration validation

### Week 4: Step Registry and Validation
- [ ] Complete step registry with metadata
- [ ] Add step validation and error handling
- [ ] Implement step dependency resolution
- [ ] Write comprehensive step tests

### Week 5: Control Flow
- [ ] Implement conditional execution steps
- [ ] Create parallel execution framework
- [ ] Add loop and iteration support
- [ ] Write control flow tests

### Week 6: Workflow Builder
- [ ] Create YAML to WorkflowBuilder converter
- [ ] Implement complex workflow patterns
- [ ] Add error handling integration
- [ ] Write workflow builder tests

### Week 7: Integration
- [ ] Complete end-to-end integration testing
- [ ] Performance testing and optimization
- [ ] Compatibility testing with existing workflows
- [ ] Write integration test suite

### Week 8: Polish and Documentation
- [ ] Code review and refactoring
- [ ] Performance optimization
- [ ] Documentation and examples
- [ ] Deployment preparation

## Quality Gates

Each phase must meet these criteria before proceeding:

### Code Quality
- [ ] 95%+ test coverage
- [ ] All tests passing
- [ ] No critical SonarQube issues
- [ ] TypeScript strict mode compliance

### Performance
- [ ] YAML parsing < 10ms for typical workflows
- [ ] Memory usage increase < 20%
- [ ] Execution performance within 5% of StepBody workflows

### Functionality
- [ ] All specified features implemented
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] Examples provided

## Risk Mitigation

### Technical Risks
1. **Performance degradation**: Continuous benchmarking, early optimization
2. **Memory leaks**: Regular memory profiling, cleanup procedures
3. **Security vulnerabilities**: Input validation, sandboxing, security review

### Process Risks
1. **Scope creep**: Strict phase boundaries, feature freeze periods
2. **Integration issues**: Continuous integration, early compatibility testing
3. **Quality issues**: Automated testing, mandatory code review

This TDD plan ensures systematic development of the YAML workflow system with high quality and reliability while maintaining compatibility with existing infrastructure.
