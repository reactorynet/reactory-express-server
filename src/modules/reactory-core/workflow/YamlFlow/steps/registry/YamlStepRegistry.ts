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
import { StepCreationParams } from '../../types/WorkflowDefinition';

// Import core step implementations
import { ApiCallStep } from '../core/ApiCallStep';
import { CliCommandStep } from '../core/CliCommandStep';
import { ConditionStep } from '../core/ConditionStep';
import { DataTransformationStep } from '../core/DataTransformationStep';
import { DelayStep } from '../core/DelayStep';
import { EndStep } from '../core/EndStep';
import { FileOperationStep } from '../core/FileOperationStep';
import { ForEachStep } from '../core/ForEachStep';
import { LogStep } from '../core/LogStep';
import { GraphQLMutationStep } from '../core/GraphQLMutationStep';
import { ServiceInvokeStep } from '../core/ServiceInvokeStep';
import { InvokeWorkflowStep } from '../core/InvokeWorkflowStep';
import { TelemetryStep } from '../core/TelemetryStep';
import { ValidationStep } from '../core/ValidationStep';
import { StartStep } from '../core/StartStep';
import { TaskStep } from '../core/TaskStep';
import { ParallelStep } from '../core/ParallelStep';
import { WhileStep } from '../core/WhileStep';
import { CustomStep } from '../core/CustomStep';
import { JoinStep } from '../core/JoinStep';
import { GraphQLStep } from '../core/GraphQLStep';
import { GRPCStep } from '../core/GRPCStep';
import { UserActivityStep } from '../core/UserActivityStep';
import { GraphQLQueryStep } from '../core/GraphQLQueryStep';
import { EmailStep } from '../core/EmailStep';
import { TodoStep } from '../core/TodoStep';
import { SearchStep } from '../core/SearchStep';
import { SetVariableStep } from '../core/SetVariableStep';
import { MongoQueryStep } from '../core/MongoQueryStep';
import { MongoWriteStep } from '../core/MongoWriteStep';
import { UserLookupStep } from '../core/UserLookupStep';
import { MySqlStep } from '../core/MySqlStep';
import { PostgresSQLStep } from '../core/PostgresSQLStep';
import { MSSQLStep } from '../core/MSSQLStep';
import { CrossInstanceVariableStep } from '../core/CrossInstanceVariableStep';
import { PythonScriptStep } from '../core/PythonScriptStep';
import {
  IWorkflowStepDesignerDefinition,
  IWorkflowStepCatalogEntry,
} from '../../types/StepDesignerDefinition';

/** Registry metadata extended with the optional designer definition + source. */
type RegisteredStepMetadata = StepMetadata & {
  definition?: IWorkflowStepDesignerDefinition;
  source?: 'core' | 'module';
};

/**
 * Central registry for all YAML workflow step types
 * Manages step registration, creation, and validation
 */
export class YamlStepRegistry {
  /** Map of step type to metadata */
  private steps: Map<string, RegisteredStepMetadata> = new Map();
  
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
    options: StepRegistrationOptions = {},
    definition?: IWorkflowStepDesignerDefinition,
    source: 'core' | 'module' = 'core'
  ): void {
    if (this.steps.has(stepType) && !options.force) {
      throw new Error(`Step type "${stepType}" is already registered`);
    }

    const metadata: RegisteredStepMetadata = {
      stepType,
      constructor,
      options,
      registeredAt: new Date(),
      definition,
      source,
    };

    this.steps.set(stepType, metadata);
  }

  /**
   * Return the catalog of all registered step types, including any designer
   * definitions modules contributed. Surfaced to the Visual Workflow Designer
   * via the `workflowStepCatalog` GraphQL query so module steps render in the UI.
   */
  public getStepCatalog(): IWorkflowStepCatalogEntry[] {
    return Array.from(this.steps.values())
      .map((m) => ({
        stepType: m.stepType,
        description: m.options?.description,
        version: m.options?.version,
        source: m.source || 'core',
        definition: m.definition,
      }))
      .sort((a, b) => a.stepType.localeCompare(b.stepType));
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
   * Create a step instance from creation parameters.
   *
   * Resolves the effective `config` and `inputs` from the creation params,
   * then instantiates the step class with both values.
   *
   * @param params - Step creation parameters
   * @returns Created step instance
   */
  public createStep(params: StepCreationParams): IYamlStep {
    const { config, inputs } = this.resolveConfigAndInputs(params);
    // BaseYamlStep accepts an optional third `inputs` argument; the published
    // IStepConstructor type only declares (id, config), so widen it here.
    const StepClass = this.getStepClass(params.type) as new (
      id: string,
      config: Record<string, any>,
      inputs?: Record<string, any>
    ) => IYamlStep;
    const step = new StepClass(params.id, config, inputs);

    // Validate configuration if the step supports it
    if (typeof step.validateConfig === 'function') {
      const validation = step.validateConfig(config);
      if (!validation.valid) {
        throw new Error(
          `Step configuration validation failed: ${validation.errors.join(', ')}`
        );
      }
    }

    return step;
  }

  /**
   * Resolve the effective config and inputs for a step.
   *
   * `config` = static, step-type-specific configuration
   * `inputs` = dynamic parameters with variable substitution
   *
   * For backward compatibility, if only `inputs` is provided (e.g. from
   * the YAML designer which stores config in the `inputs` field as a JSON
   * string), it is treated as `config`.
   */
  private resolveConfigAndInputs(params: StepCreationParams): {
    config: Record<string, any>;
    inputs: Record<string, any>;
  } {
    let config: Record<string, any> = {};
    let inputs: Record<string, any> = {};

    // Resolve config
    if (
      params.config &&
      typeof params.config === 'object' &&
      Object.keys(params.config).length > 0
    ) {
      config = params.config;
    }

    // Resolve inputs
    const rawInputs = params.inputs;
    if (rawInputs != null) {
      if (typeof rawInputs === 'string') {
        try {
          const parsed = JSON.parse(rawInputs);
          if (parsed && typeof parsed === 'object') {
            // If config is empty, treat parsed inputs as config (backward compat)
            if (Object.keys(config).length === 0) {
              config = parsed;
            } else {
              inputs = parsed;
            }
          }
        } catch {
          // Not valid JSON — store as raw wrapper in inputs
          inputs = { raw: rawInputs };
        }
      } else if (typeof rawInputs === 'object') {
        // If config is empty, treat object inputs as config (backward compat)
        if (Object.keys(config).length === 0) {
          config = rawInputs;
        } else {
          inputs = rawInputs;
        }
      }
    }

    return { config, inputs };
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
    const coreSteps = ['log', 'delay', 'validation', 'data_transformation', 'api_call', 'cli_command', 'file_operation'];
    
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
    
    this.registerStep('data_transformation', DataTransformationStep, {
      description: 'Transform and manipulate data',
      version: '1.0.0'
    });
    
    // External integration steps
    this.registerStep('api_call', ApiCallStep, {
      description: 'Make HTTP API calls',
      version: '1.0.0'
    });
    
    this.registerStep('cli_command', CliCommandStep, {
      description: 'Execute command line operations',
      version: '1.0.0'
    });
    
    this.registerStep('file_operation', FileOperationStep, {
      description: 'Perform file system operations',
      version: '1.0.0'
    });

    // Control flow steps
    this.registerStep('start', StartStep, {
      description: 'Workflow entry point',
      version: '1.0.0'
    });

    this.registerStep('end', EndStep, {
      description: 'Workflow exit point',
      version: '1.0.0'
    });

    this.registerStep('condition', ConditionStep, {
      description: 'Conditional branching',
      version: '1.0.0'
    });

    this.registerStep('for_each', ForEachStep, {
      description: 'Iterate over a collection',
      version: '1.0.0'
    });

    // Service integration steps
    this.registerStep('service_invoke', ServiceInvokeStep, {
      description: 'Invoke a Reactory service method',
      version: '1.0.0'
    });

    // Workflow composition — invoke another workflow
    this.registerStep('invoke_workflow', InvokeWorkflowStep, {
      description: 'Start (and optionally await) another workflow',
      version: '1.0.0'
    });

    // Task step
    this.registerStep('task', TaskStep, {
      description: 'Generic task execution',
      version: '1.0.0'
    });

    // Parallel execution step
    this.registerStep('parallel', ParallelStep, {
      description: 'Execute branches concurrently',
      version: '1.0.0'
    });

    // While loop step
    this.registerStep('while', WhileStep, {
      description: 'Loop with condition evaluation',
      version: '1.0.0'
    });

    // Custom catch-all step
    this.registerStep('custom', CustomStep, {
      description: 'Custom user-defined step logic',
      version: '1.0.0'
    });

    // Join step (parallel branch synchronization)
    this.registerStep('join', JoinStep, {
      description: 'Wait for parallel branches to complete',
      version: '1.0.0'
    });

    // GraphQL step
    this.registerStep('graphql', GraphQLStep, {
      description: 'Execute GraphQL query or mutation',
      version: '1.0.0'
    });

    this.registerStep('graphql_mutate', GraphQLMutationStep, {
      description: 'Executes a GraphqlQL Mutation',
      version: '1.0.0'
    });

    this.registerStep('graphql_query', GraphQLQueryStep, {
      description: 'Execute a graphql Query',
      version: '1.0.0',
    });    

    // gRPC step
    this.registerStep('grpc', GRPCStep, {
      description: 'Execute gRPC service call',
      version: '1.0.0'
    });

    // User activity step
    this.registerStep('user_activity', UserActivityStep, {
      description: 'Pause workflow for user interaction',
      version: '1.0.0'
    });

    // Telemetry step
    this.registerStep('telemetry', TelemetryStep, {
      description: 'Emit metrics and trace data',
      version: '1.0.0'
    });

    // Variable management step
    this.registerStep('set_variable', SetVariableStep, {
      description: 'Set, get or delete workflow-scoped variables',
      version: '1.0.0'
    });

    // Notification step
    this.registerStep('email', EmailStep, {
      description: 'Send email via the Reactory email service',
      version: '1.0.0'
    });

    // Todo / task tracking step
    this.registerStep('todo', TodoStep, {
      description: 'Create, update and query workflow to-do items',
      version: '1.0.0'
    });

    // Search step (MeiliSearch)
    this.registerStep('search', SearchStep, {
      description: 'Search, index and manage MeiliSearch indexes',
      version: '1.0.0'
    });

    // MongoDB data-access steps
    this.registerStep('mongo_query', MongoQueryStep, {
      description: 'Query MongoDB (find / findOne / aggregate / count)',
      version: '1.0.0'
    });

    this.registerStep('mongo_write', MongoWriteStep, {
      description: 'Write to MongoDB (insert / update / delete)',
      version: '1.0.0'
    });

    // User lookup step
    this.registerStep('user_lookup', UserLookupStep, {
      description: 'Look up a Reactory user by id, email or username',
      version: '1.0.0'
    });

    // Relational database steps (via core.ReactorySQLService)
    this.registerStep('mysql', MySqlStep, {
      description: 'Execute a MySQL query',
      version: '1.0.0'
    });

    this.registerStep('postgres', PostgresSQLStep, {
      description: 'Execute a PostgreSQL query',
      version: '1.0.0'
    });

    this.registerStep('mssql', MSSQLStep, {
      description: 'Execute a Microsoft SQL Server query',
      version: '1.0.0'
    });

    // ETL steps
    this.registerStep('cross_instance_variable', CrossInstanceVariableStep, {
      description: 'Set, get or delete persistent cross-instance variables (global or workflow scoped)',
      version: '1.0.0'
    });

    this.registerStep('python_script', PythonScriptStep, {
      description: 'Execute inline Python scripts or external Python files with ETL JSON data integration',
      version: '1.0.0'
    });
  }
}
