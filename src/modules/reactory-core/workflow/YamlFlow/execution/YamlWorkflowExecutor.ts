/**
 * YAML Workflow Execution Engine
 * Handles execution of YAML-defined workflows with step dependencies,
 * progress tracking, and error handling
 */

import { YamlStepRegistry } from '../steps/registry/YamlStepRegistry';
import { YamlWorkflowDefinition, StepConfig } from '../types/WorkflowDefinition';
import { IYamlStep, StepExecutionContext } from '../steps/interfaces/IYamlStep';
import {
  WorkflowExecutionResult,
  WorkflowExecutionContext,
  WorkflowValidationResult,
  ExecutionOptions,
  ExecutionState,
  ExecutionStateSnapshot,
  ProgressEvent,
  ProgressEventType,
  StepExecutionRecord,
  DependencyResolutionResult,
  StepCreationError
} from './types/ExecutionTypes';

/**
 * Main workflow execution engine
 */
export class YamlWorkflowExecutor {
  private stepRegistry: YamlStepRegistry;
  private currentState: ExecutionStateSnapshot;
  private isCancelled: boolean = false;
  
  constructor(stepRegistry: YamlStepRegistry) {
    this.stepRegistry = stepRegistry;
    this.currentState = this.createInitialState();
  }
  
  /**
   * Get the step registry used by this executor
   */
  public getStepRegistry(): YamlStepRegistry {
    return this.stepRegistry;
  }
  
  /**
   * Get current execution state
   */
  public getExecutionState(): ExecutionStateSnapshot {
    return { ...this.currentState };
  }
  
  /**
   * Validate workflow before execution
   */
  public async validateWorkflow(workflow: YamlWorkflowDefinition): Promise<WorkflowValidationResult> {
    const errors: Array<{ message: string; path?: string; code?: string; stepId?: string }> = [];
    
    try {
      // Validate basic workflow structure
      if (!workflow.steps || workflow.steps.length === 0) {
        errors.push({ message: 'Workflow must contain at least one step', path: 'steps' });
      }
      
      // Check for duplicate step IDs
      const stepIds = new Set<string>();
      for (const step of workflow.steps) {
        if (stepIds.has(step.id)) {
          errors.push({ 
            message: `Duplicate step ID: ${step.id}`, 
            stepId: step.id 
          });
        }
        stepIds.add(step.id);
      }
      
      // Validate step types exist in registry
      for (const step of workflow.steps) {
        if (!this.stepRegistry.hasStep(step.type)) {
          errors.push({ 
            message: `Unknown step type: ${step.type}`, 
            stepId: step.id 
          });
        }
      }
      
      // Validate dependencies exist
      for (const step of workflow.steps) {
        if (step.dependsOn) {
          const dependencies = Array.isArray(step.dependsOn) ? step.dependsOn : [step.dependsOn];
          for (const dependency of dependencies) {
            if (!stepIds.has(dependency)) {
              errors.push({ 
                message: `Step '${step.id}' depends on non-existent step '${dependency}'`, 
                stepId: step.id 
              });
            }
          }
        }
      }
      
      // Check for circular dependencies
      const depResult = this.resolveDependencies(workflow.steps);
      if (!depResult.valid) {
        errors.push(...depResult.errors.map(e => ({ 
          message: e.message, 
          stepId: e.stepId 
        })));
      }
      
      // Validate individual step configurations
      for (const step of workflow.steps) {
        try {
          if (this.stepRegistry.hasStep(step.type)) {
            // Create StepConfig from WorkflowStep
            const stepConfig: StepConfig = {
              id: step.id,
              type: step.type,
              config: step.config || {}
            };
            const stepInstance = this.stepRegistry.createStep(stepConfig);
            const validation = stepInstance.validateConfig(stepConfig.config || {});
            if (!validation.valid) {
              errors.push(...validation.errors.map(e => ({ 
                message: `Step '${step.id}': ${e}`, 
                stepId: step.id 
              })));
            }
          }
        } catch (error) {
          errors.push({ 
            message: `Step '${step.id}' configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            stepId: step.id 
          });
        }
      }
      
    } catch (error) {
      errors.push({ 
        message: `Workflow validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflow: YamlWorkflowDefinition, 
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();
    
    // Reset cancellation flag
    this.isCancelled = false;
    
    // Update state to running
    this.updateState({
      status: ExecutionState.RUNNING,
      executionId,
      startTime,
      totalSteps: workflow.steps.length,
      progress: 0,
      currentStep: null,
      completedSteps: [],
      failedSteps: []
    });
    
    // Emit progress event
    this.emitProgress(options.onProgress, {
      type: 'workflow_started',
      timestamp: startTime,
      progress: 0,
      message: `Starting workflow: ${workflow.name}`
    });
    
    try {
      // Validate workflow first
      if (!options.dryRun) {
        const validation = await this.validateWorkflow(workflow);
        if (!validation.valid) {
          const error = new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
          return this.createFailureResult(executionId, startTime, [], error);
        }
      }
      
      // Resolve execution order
      const depResult = this.resolveDependencies(workflow.steps);
      if (!depResult.valid) {
        const error = new Error(`Dependency resolution failed: ${depResult.errors.map(e => e.message).join(', ')}`);
        return this.createFailureResult(executionId, startTime, [], error);
      }
      
      // Create execution context
      const context = this.createExecutionContext(workflow, executionId, startTime, options);
      
      // Execute steps in order
      const executedSteps: StepExecutionRecord[] = [];
      const errors: Array<{ stepId: string; message: string; stack?: string; code?: string }> = [];
      
      for (const stepId of depResult.executionOrder) {
        // Check for cancellation
        if (this.isCancelled) {
          this.updateState({ status: ExecutionState.CANCELLED });
          return this.createCancelledResult(executionId, startTime, executedSteps);
        }
        
        const stepConfig = workflow.steps.find((s: any) => s.id === stepId)!;
        
        // Update current step
        this.updateState({ currentStep: stepId });
        
        // Emit step started event
        this.emitProgress(options.onProgress, {
          type: 'step_started',
          timestamp: new Date(),
          progress: (executedSteps.length / workflow.steps.length) * 100,
          step: { id: stepId, type: stepConfig.type },
          message: `Starting step: ${stepId}`
        });
        
        try {
          const stepResult = await this.executeStep(stepConfig, context, options.dryRun);
          executedSteps.push(stepResult);
          
          if (stepResult.success) {
            // Update context with step outputs
            context.stepOutputs[stepId] = stepResult.outputs;
            this.updateState({ 
              completedSteps: [...this.currentState.completedSteps, stepId],
              progress: ((executedSteps.length / workflow.steps.length) * 100)
            });
            
            // Emit step completed event
            this.emitProgress(options.onProgress, {
              type: 'step_completed',
              timestamp: new Date(),
              progress: (executedSteps.length / workflow.steps.length) * 100,
              step: { id: stepId, type: stepConfig.type },
              message: `Completed step: ${stepId}`
            });
          } else {
            this.updateState({ 
              failedSteps: [...this.currentState.failedSteps, stepId]
            });
            
            errors.push({
              stepId,
              message: stepResult.error?.message || 'Step execution failed',
              stack: stepResult.error?.stack,
              code: stepResult.error?.code
            });
            
            // Emit step failed event
            this.emitProgress(options.onProgress, {
              type: 'step_failed',
              timestamp: new Date(),
              progress: (executedSteps.length / workflow.steps.length) * 100,
              step: { id: stepId, type: stepConfig.type },
              message: `Failed step: ${stepId} - ${stepResult.error?.message}`
            });
            
            // Stop execution unless continueOnError is set
            if (!options.continueOnError) {
              break;
            }
          }
        } catch (error) {
          const stepError = {
            stepId,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          };
          
          errors.push(stepError);
          
          // Create failed step record
          const failedStepRecord: StepExecutionRecord = {
            stepId,
            stepType: stepConfig.type,
            success: false,
            outputs: {},
            metadata: {
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
              executionId
            },
            error: stepError
          };
          
          executedSteps.push(failedStepRecord);
          this.updateState({ 
            failedSteps: [...this.currentState.failedSteps, stepId]
          });
          
          // Stop execution unless continueOnError is set
          if (!options.continueOnError) {
            break;
          }
        }
      }
      
      // Determine final result
      const endTime = new Date();
      const success = errors.length === 0 && !this.isCancelled;
      
      if (success) {
        this.updateState({ 
          status: ExecutionState.COMPLETED,
          progress: 100,
          currentStep: null
        });
        
        this.emitProgress(options.onProgress, {
          type: 'workflow_completed',
          timestamp: endTime,
          progress: 100,
          message: `Workflow completed successfully: ${workflow.name}`
        });
      } else {
        this.updateState({ 
          status: ExecutionState.FAILED,
          currentStep: null
        });
        
        this.emitProgress(options.onProgress, {
          type: 'workflow_failed',
          timestamp: endTime,
          progress: (executedSteps.length / workflow.steps.length) * 100,
          message: `Workflow failed: ${workflow.name}`
        });
      }
      
      // Create result
      return {
        success,
        executedSteps,
        outputs: this.aggregateOutputs(executedSteps),
        metadata: {
          executionId,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          totalSteps: workflow.steps.length,
          completedSteps: executedSteps.filter(s => s.success).length,
          failedSteps: executedSteps.filter(s => !s.success).length
        },
        error: errors.length > 0 ? errors[0] : undefined,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return this.createFailureResult(executionId, startTime, [], error instanceof Error ? error : new Error('Unknown error'));
    }
  }
  
  /**
   * Cancel current execution
   */
  public cancelExecution(): void {
    this.isCancelled = true;
  }
  
  /**
   * Execute a single step
   */
  private async executeStep(
    stepConfig: any, // WorkflowStep from YamlWorkflowDefinition
    workflowContext: WorkflowExecutionContext,
    dryRun: boolean = false
  ): Promise<StepExecutionRecord> {
    const startTime = new Date();
    
    try {
      // Convert WorkflowStep to StepConfig
      const config: StepConfig = {
        id: stepConfig.id,
        type: stepConfig.type,
        config: stepConfig.config || {}
      };
      
      // Create step instance
      const step = this.stepRegistry.createStep(config);
      
      if (dryRun) {
        // In dry run mode, just validate
        const validation = step.validateConfig(config.config || {});
        return {
          stepId: stepConfig.id,
          stepType: stepConfig.type,
          success: validation.valid,
          outputs: {},
          metadata: {
            startTime,
            endTime: new Date(),
            duration: 0,
            executionId: workflowContext.workflow.executionId
          },
          error: validation.valid ? undefined : {
            message: validation.errors.join(', ')
          }
        };
      }
      
      // Create step execution context
      const stepContext: StepExecutionContext = {
        inputs: workflowContext.inputs,
        variables: {},
        env: workflowContext.environment,
        stepResults: {}, // Convert stepOutputs to stepResults format
        logger: {
          log: (message: string, ...args: any[]) => console.log(message, ...args),
          error: (message: string, ...args: any[]) => console.error(message, ...args),
          warn: (message: string, ...args: any[]) => console.warn(message, ...args),
          info: (message: string, ...args: any[]) => console.info(message, ...args),
          debug: (message: string, ...args: any[]) => console.debug(message, ...args)
        },
        workflow: {
          id: workflowContext.workflow.executionId,
          instanceId: workflowContext.workflow.executionId,
          nameSpace: workflowContext.workflow.namespace,
          name: workflowContext.workflow.name,
          version: workflowContext.workflow.version
        }
      };
      
      // Execute step
      const result = await step.execute(stepContext);
      const endTime = new Date();
      
      return {
        stepId: stepConfig.id,
        stepType: stepConfig.type,
        success: result.success,
        outputs: result.outputs,
        metadata: {
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          executionId: workflowContext.workflow.executionId
        },
        error: result.success ? undefined : {
          message: result.error || 'Step execution failed'
        }
      };
      
    } catch (error) {
      const endTime = new Date();
      return {
        stepId: stepConfig.id,
        stepType: stepConfig.type,
        success: false,
        outputs: {},
        metadata: {
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          executionId: workflowContext.workflow.executionId
        },
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }
  
  /**
   * Resolve step dependencies and determine execution order
   */
  private resolveDependencies(steps: any[]): DependencyResolutionResult {
    const stepMap = new Map(steps.map(s => [s.id, s]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const executionOrder: string[] = [];
    const errors: Array<{ message: string; stepId: string; dependency?: string }> = [];
    
    const visit = (stepId: string): void => {
      if (visiting.has(stepId)) {
        errors.push({
          message: `Circular dependency detected involving step '${stepId}'`,
          stepId
        });
        return;
      }
      
      if (visited.has(stepId)) {
        return;
      }
      
      visiting.add(stepId);
      
      const step = stepMap.get(stepId);
      if (step?.dependsOn) {
        const dependencies = Array.isArray(step.dependsOn) ? step.dependsOn : [step.dependsOn];
        for (const dep of dependencies) {
          if (!stepMap.has(dep)) {
            errors.push({
              message: `Step '${stepId}' depends on non-existent step '${dep}'`,
              stepId,
              dependency: dep
            });
          } else {
            visit(dep);
          }
        }
      }
      
      visiting.delete(stepId);
      visited.add(stepId);
      executionOrder.push(stepId);
    };
    
    // Visit all steps
    for (const step of steps) {
      if (!visited.has(step.id)) {
        visit(step.id);
      }
    }
    
    return {
      executionOrder,
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Create execution context for workflow
   */
  private createExecutionContext(
    workflow: YamlWorkflowDefinition,
    executionId: string,
    startTime: Date,
    options: ExecutionOptions
  ): WorkflowExecutionContext {
    return {
      inputs: { ...workflow.inputs, ...options.inputs },
      environment: { ...process.env, ...options.environment },
      stepOutputs: {},
      workflow: {
        name: workflow.name,
        namespace: workflow.nameSpace,
        version: workflow.version,
        executionId
      },
      execution: {
        startTime,
        totalSteps: workflow.steps.length,
        completedSteps: []
      }
    };
  }
  
  /**
   * Emit progress event
   */
  private emitProgress(
    callback: ((event: ProgressEvent) => void) | undefined,
    event: Omit<ProgressEvent, 'timestamp'> & { timestamp: Date }
  ): void {
    if (callback) {
      callback(event as ProgressEvent);
    }
  }
  
  /**
   * Aggregate outputs from executed steps
   */
  private aggregateOutputs(executedSteps: StepExecutionRecord[]): Record<string, any> {
    const outputs: Record<string, any> = {};
    
    for (const step of executedSteps) {
      if (step.success && Object.keys(step.outputs).length > 0) {
        outputs[step.stepId] = step.outputs;
      }
    }
    
    return outputs;
  }
  
  /**
   * Create initial execution state
   */
  private createInitialState(): ExecutionStateSnapshot {
    return {
      status: ExecutionState.IDLE,
      currentStep: null,
      completedSteps: [],
      failedSteps: [],
      startTime: null,
      progress: 0,
      totalSteps: 0,
      executionId: null
    };
  }
  
  /**
   * Update execution state
   */
  private updateState(updates: Partial<ExecutionStateSnapshot>): void {
    this.currentState = { ...this.currentState, ...updates };
  }
  
  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create failure result
   */
  private createFailureResult(
    executionId: string,
    startTime: Date,
    executedSteps: StepExecutionRecord[],
    error: Error
  ): WorkflowExecutionResult {
    const endTime = new Date();
    
    this.updateState({ 
      status: ExecutionState.FAILED,
      currentStep: null
    });
    
    return {
      success: false,
      executedSteps,
      outputs: {},
      metadata: {
        executionId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0
      },
      error: {
        message: error.message,
        stack: error.stack
      }
    };
  }
  
  /**
   * Create cancelled result
   */
  private createCancelledResult(
    executionId: string,
    startTime: Date,
    executedSteps: StepExecutionRecord[]
  ): WorkflowExecutionResult {
    const endTime = new Date();
    
    return {
      success: false,
      cancelled: true,
      executedSteps,
      outputs: this.aggregateOutputs(executedSteps),
      metadata: {
        executionId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        totalSteps: executedSteps.length,
        completedSteps: executedSteps.filter(s => s.success).length,
        failedSteps: executedSteps.filter(s => !s.success).length
      }
    };
  }
}
