/**
 * Registry for managing YAML workflow step types
 * Handles registration, creation, and validation of step implementations
 */

import { 
  IYamlStep, 
  StepConstructor, 
  StepMetadata, 
  StepRegistrationOptions 
} from '../interfaces/IYamlStep';
import { StepConfig } from '../../types/WorkflowDefinition';

// Import core step implementations
import { LogStep } from '../core/LogStep';
import { DelayStep } from '../core/DelayStep';
import { ValidationStep } from '../core/ValidationStep';
import { DataTransformationStep } from '../core/DataTransformationStep';
import { ApiCallStep } from '../core/ApiCallStep';
import { CliCommandStep } from '../core/CliCommandStep';
import { FileOperationStep } from '../core/FileOperationStep';

/**
 * Central registry for all YAML workflow step types
 * Manages step registration, creation, and validation
 */
export class YamlStepRegistry {
  /** Map of step type to metadata */
  private steps: Map<string, StepMetadata> = new Map();
  
  /**
   * Constructor - automatically registers default core steps
   */
  constructor() {
    this.registerDefaultSteps();
  }
  
  /**
   * Register a new step type
   * @param stepType - Unique identifier for the step type
   * @param constructor - Constructor function for the step class
   * @param options - Registration options
   */
  public registerStep(
    stepType: string, 
    constructor: StepConstructor, 
    options: StepRegistrationOptions = {}
  ): void {
    if (this.steps.has(stepType) && !options.force) {
      throw new Error(`Step type "${stepType}" is already registered`);
    }
    
    const metadata: StepMetadata = {
      stepType,
      constructor,
      options,
      registeredAt: new Date()
    };
    
    this.steps.set(stepType, metadata);
  }
  
  /**
   * Check if a step type is registered
   * @param stepType - Step type to check
   * @returns True if registered
   */
  public hasStep(stepType: string): boolean {
    return this.steps.has(stepType);
  }
  
  /**
   * Get the constructor for a registered step type
   * @param stepType - Step type to get
   * @returns Constructor function
   */
  public getStepClass(stepType: string): StepConstructor {
    const metadata = this.steps.get(stepType);
    if (!metadata) {
      throw new Error(`Step type "${stepType}" is not registered`);
    }
    return metadata.constructor;
  }
  
  /**
   * Get list of all registered step types
   * @returns Array of step type names
   */
  public getRegisteredSteps(): string[] {
    return Array.from(this.steps.keys()).sort();
  }
  
  /**
   * Create a step instance from configuration
   * @param stepConfig - Step configuration
   * @returns Created step instance
   */
  public createStep(stepConfig: StepConfig): IYamlStep {
    const StepClass = this.getStepClass(stepConfig.type);
    const step = new StepClass(stepConfig.id, stepConfig.config || {});
    
    // Validate configuration if the step supports it
    if (typeof step.validateConfig === 'function') {
      const validation = step.validateConfig(stepConfig.config || {});
      if (!validation.valid) {
        throw new Error(
          `Step configuration validation failed: ${validation.errors.join(', ')}`
        );
      }
    }
    
    return step;
  }
  
  /**
   * Get metadata for a registered step type
   * @param stepType - Step type to get metadata for
   * @returns Step metadata
   */
  public getStepMetadata(stepType: string): StepMetadata {
    const metadata = this.steps.get(stepType);
    if (!metadata) {
      throw new Error(`Step type "${stepType}" is not registered`);
    }
    return { ...metadata }; // Return copy to prevent modification
  }
  
  /**
   * Unregister a step type
   * @param stepType - Step type to unregister
   */
  public unregisterStep(stepType: string): void {
    if (!this.steps.has(stepType)) {
      throw new Error(`Step type "${stepType}" is not registered`);
    }
    this.steps.delete(stepType);
  }
  
  /**
   * Clear all registered steps
   */
  public clear(): void {
    this.steps.clear();
  }
  
  /**
   * Get registry statistics
   * @returns Registry statistics
   */
  public getStats(): {
    totalSteps: number;
    coreSteps: number;
    customSteps: number;
    stepsByType: Record<string, number>;
  } {
    const allSteps = Array.from(this.steps.keys());
    const coreSteps = ['log', 'delay', 'validation', 'dataTransformation', 'apiCall', 'cliCommand', 'fileOperation'];
    
    return {
      totalSteps: allSteps.length,
      coreSteps: allSteps.filter(step => coreSteps.includes(step)).length,
      customSteps: allSteps.filter(step => !coreSteps.includes(step)).length,
      stepsByType: allSteps.reduce((acc, step) => {
        acc[step] = 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
  
  /**
   * Register all default core step types
   * @private
   */
  private registerDefaultSteps(): void {
    // Core workflow steps
    this.registerStep('log', LogStep, {
      description: 'Log messages during workflow execution',
      version: '1.0.0'
    });
    
    this.registerStep('delay', DelayStep, {
      description: 'Add delays between workflow steps',
      version: '1.0.0'
    });
    
    this.registerStep('validation', ValidationStep, {
      description: 'Validate data against schemas',
      version: '1.0.0'
    });
    
    this.registerStep('dataTransformation', DataTransformationStep, {
      description: 'Transform and manipulate data',
      version: '1.0.0'
    });
    
    // External integration steps
    this.registerStep('apiCall', ApiCallStep, {
      description: 'Make HTTP API calls',
      version: '1.0.0'
    });
    
    this.registerStep('cliCommand', CliCommandStep, {
      description: 'Execute command line operations',
      version: '1.0.0'
    });
    
    this.registerStep('fileOperation', FileOperationStep, {
      description: 'Perform file system operations',
      version: '1.0.0'
    });
  }
}
