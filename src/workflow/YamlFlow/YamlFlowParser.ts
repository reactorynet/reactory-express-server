/**
 * YAML Flow Parser
 * 
 * Main parser class that orchestrates YAML parsing, validation, and parameter substitution
 * for declarative workflow definitions.
 */

import { readFileSync } from 'fs';
import { YamlValidator } from './validators/YamlValidator';
import { ParameterSubstitution } from './parsers/ParameterSubstitution';
import {
  YamlWorkflowDefinition,
  ParseResult,
  ParameterSubstitutionContext,
  ValidationResult,
  YamlWorkflowBuilderOptions
} from './types/WorkflowDefinition';

export class YamlFlowParser {
  private validator: YamlValidator;
  private options: YamlWorkflowBuilderOptions;

  constructor(options: YamlWorkflowBuilderOptions = {}) {
    this.validator = new YamlValidator();
    this.options = {
      validateSchema: true,
      strictMode: true,
      allowCustomSteps: false,
      parameterSubstitution: true,
      ...options
    };
  }

  /**
   * Parse YAML workflow from string content
   */
  public parseFromString(
    yamlContent: string,
    context?: Partial<ParameterSubstitutionContext>
  ): ParseResult {
    try {
      // Parse and validate YAML
      const parseResult = this.validator.parseAndValidate(yamlContent, context);
      
      if (!parseResult.success || !parseResult.workflow) {
        return parseResult;
      }

      let workflow = parseResult.workflow;

      // Apply parameter substitution if enabled
      if (this.options.parameterSubstitution && context) {
        const substitutionResult = this.applyParameterSubstitution(workflow, context);
        if (substitutionResult.errors.length > 0) {
          parseResult.errors.push(...substitutionResult.errors);
          parseResult.success = false;
          return parseResult;
        }
        workflow = substitutionResult.workflow;
      }

      // Perform additional validation based on options
      if (this.options.validateSchema) {
        const additionalValidation = this.performAdditionalValidation(workflow);
        parseResult.errors.push(...additionalValidation.errors.map(e => ({ ...e, severity: 'error' as const })));
        parseResult.warnings.push(...additionalValidation.warnings.map(w => ({ ...w, severity: 'warning' as const })));
        
        if (additionalValidation.errors.length > 0) {
          parseResult.success = false;
        }
      }

      parseResult.workflow = workflow;
      return parseResult;

    } catch (error) {
      return {
        success: false,
        errors: [
          {
            code: 'PARSER_ERROR',
            message: `Failed to parse YAML workflow: ${error.message}`,
            severity: 'error'
          }
        ],
        warnings: []
      };
    }
  }

  /**
   * Parse YAML workflow from file
   */
  public parseFromFile(
    filePath: string,
    context?: Partial<ParameterSubstitutionContext>
  ): ParseResult {
    try {
      const yamlContent = readFileSync(filePath, 'utf8');
      const result = this.parseFromString(yamlContent, context);
      
      // Add file path to errors and warnings for better debugging
      result.errors.forEach(error => {
        if (!error.path) {
          error.path = filePath;
        }
      });
      
      result.warnings.forEach(warning => {
        if (!warning.path) {
          warning.path = filePath;
        }
      });
      
      return result;

    } catch (error) {
      return {
        success: false,
        errors: [
          {
            code: 'FILE_READ_ERROR',
            message: `Failed to read YAML file '${filePath}': ${error.message}`,
            path: filePath,
            severity: 'error'
          }
        ],
        warnings: []
      };
    }
  }

  /**
   * Validate YAML workflow without full parsing
   */
  public validateOnly(
    yamlContent: string,
    context?: Partial<ParameterSubstitutionContext>
  ): ValidationResult {
    const parseResult = this.validator.parseAndValidate(yamlContent, context);
    
    return {
      valid: parseResult.success,
      errors: parseResult.errors.map(e => ({
        code: e.code,
        message: e.message,
        path: e.path || 'unknown',
        value: undefined as any
      })),
      warnings: parseResult.warnings.map(w => ({
        code: w.code,
        message: w.message,
        path: w.path || 'unknown',
        value: undefined as any,
        severity: 'warning' as const
      }))
    };
  }

  /**
   * Create a parameter substitution context with default values
   */
  public createSubstitutionContext(
    workflowId: string,
    instanceId: string,
    workflow: YamlWorkflowDefinition,
    inputs?: Record<string, any>
  ): ParameterSubstitutionContext {
    return {
      env: process.env as Record<string, string>,
      workflow: {
        id: workflowId,
        instanceId: instanceId,
        nameSpace: workflow.nameSpace,
        name: workflow.name,
        version: workflow.version
      },
      input: inputs || {},
      variables: workflow.variables || {},
      step: {
        id: 'parser-context',
        type: 'parser',
        outputs: {}
      },
      outputs: {}
    };
  }

  /**
   * Get detailed workflow information
   */
  public getWorkflowInfo(workflow: YamlWorkflowDefinition): WorkflowInfo {
    const stepCount = this.countSteps(workflow.steps);
    const stepTypes = this.extractStepTypes(workflow.steps);
    const dependencies = this.extractDependencies(workflow.steps);
    const substitutionExpressions = ParameterSubstitution.extractExpressions(workflow);

    return {
      nameSpace: workflow.nameSpace,
      name: workflow.name,
      version: workflow.version,
      description: workflow.description,
      author: workflow.author,
      tags: workflow.tags || [],
      stepCount,
      stepTypes,
      dependencies,
      hasInputs: Object.keys(workflow.inputs || {}).length > 0,
      hasOutputs: Object.keys(workflow.outputs || {}).length > 0,
      hasVariables: Object.keys(workflow.variables || {}).length > 0,
      hasParameterSubstitutions: substitutionExpressions.length > 0,
      substitutionExpressions,
      complexity: this.calculateComplexity(workflow)
    };
  }

  /**
   * Extract all step IDs from workflow (including nested steps)
   */
  public extractStepIds(workflow: YamlWorkflowDefinition): string[] {
    const stepIds: string[] = [];
    this.collectStepIdsRecursive(workflow.steps, stepIds);
    return stepIds;
  }

  /**
   * Check if workflow has circular dependencies
   */
  public hasCircularDependencies(workflow: YamlWorkflowDefinition): boolean {
    const dependencies = this.extractDependencies(workflow.steps);
    return this.detectCircularDependencies(dependencies);
  }

  /**
   * Apply parameter substitution to workflow
   */
  private applyParameterSubstitution(
    workflow: YamlWorkflowDefinition,
    context: Partial<ParameterSubstitutionContext>
  ): { workflow: YamlWorkflowDefinition; errors: any[] } {
    const fullContext = this.createSubstitutionContext(
      context.workflow?.id || 'substitution-workflow',
      context.workflow?.instanceId || 'substitution-instance',
      workflow,
      context.input
    );

    const result = ParameterSubstitution.substitute(workflow, fullContext, this.options.strictMode);
    
    return {
      workflow: result.result,
      errors: result.errors
    };
  }

  /**
   * Perform additional validation beyond schema validation
   */
  private performAdditionalValidation(workflow: YamlWorkflowDefinition): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow)) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Workflow contains circular dependencies',
        path: 'steps',
        severity: 'error'
      });
    }

    // Check for unused inputs (if not already done in semantic validation)
    for (const [inputName, inputParam] of Object.entries(workflow.inputs || {})) {
      if (inputParam.required) {
        const isUsed = ParameterSubstitution.hasSubstitutionPatterns(workflow) &&
                      JSON.stringify(workflow).includes(`\${input.${inputName}}`);
        
        if (!isUsed) {
          warnings.push({
            code: 'UNUSED_REQUIRED_INPUT',
            message: `Required input '${inputName}' is not used in workflow`,
            path: `inputs.${inputName}`,
            severity: 'warning'
          });
        }
      }
    }

    // Check for steps with no inputs or outputs
    this.validateStepConnectivity(workflow.steps, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Count total steps including nested steps
   */
  private countSteps(steps: any[]): number {
    let count = steps.length;
    
    for (const step of steps) {
      if (step.steps) {
        count += this.countSteps(step.steps);
      }
      if (step.config?.thenSteps) {
        count += this.countSteps(step.config.thenSteps);
      }
      if (step.config?.elseSteps) {
        count += this.countSteps(step.config.elseSteps);
      }
      if (step.config?.branches) {
        for (const branch of step.config.branches) {
          if (branch.steps) {
            count += this.countSteps(branch.steps);
          }
        }
      }
    }
    
    return count;
  }

  /**
   * Extract all step types used in workflow
   */
  private extractStepTypes(steps: any[]): string[] {
    const types = new Set<string>();
    
    for (const step of steps) {
      types.add(step.type);
      
      if (step.steps) {
        this.extractStepTypes(step.steps).forEach(type => types.add(type));
      }
      if (step.config?.thenSteps) {
        this.extractStepTypes(step.config.thenSteps).forEach(type => types.add(type));
      }
      if (step.config?.elseSteps) {
        this.extractStepTypes(step.config.elseSteps).forEach(type => types.add(type));
      }
      if (step.config?.branches) {
        for (const branch of step.config.branches) {
          if (branch.steps) {
            this.extractStepTypes(branch.steps).forEach(type => types.add(type));
          }
        }
      }
    }
    
    return Array.from(types);
  }

  /**
   * Extract step dependencies
   */
  private extractDependencies(steps: any[]): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {};
    
    for (const step of steps) {
      if (step.dependsOn) {
        dependencies[step.id] = Array.isArray(step.dependsOn) ? step.dependsOn : [step.dependsOn];
      }
      
      // Recursively extract from nested steps
      if (step.steps) {
        Object.assign(dependencies, this.extractDependencies(step.steps));
      }
      if (step.config?.thenSteps) {
        Object.assign(dependencies, this.extractDependencies(step.config.thenSteps));
      }
      if (step.config?.elseSteps) {
        Object.assign(dependencies, this.extractDependencies(step.config.elseSteps));
      }
      if (step.config?.branches) {
        for (const branch of step.config.branches) {
          if (branch.steps) {
            Object.assign(dependencies, this.extractDependencies(branch.steps));
          }
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(dependencies: Record<string, string[]>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true; // Back edge found - cycle detected
      }
      
      if (visited.has(stepId)) {
        return false; // Already processed this node
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const deps = dependencies[stepId] || [];
      for (const depId of deps) {
        if (hasCycle(depId)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const stepId of Object.keys(dependencies)) {
      if (!visited.has(stepId)) {
        if (hasCycle(stepId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Recursively collect step IDs
   */
  private collectStepIdsRecursive(steps: any[], stepIds: string[]): void {
    for (const step of steps) {
      stepIds.push(step.id);
      
      if (step.steps) {
        this.collectStepIdsRecursive(step.steps, stepIds);
      }
      if (step.config?.thenSteps) {
        this.collectStepIdsRecursive(step.config.thenSteps, stepIds);
      }
      if (step.config?.elseSteps) {
        this.collectStepIdsRecursive(step.config.elseSteps, stepIds);
      }
      if (step.config?.branches) {
        for (const branch of step.config.branches) {
          if (branch.steps) {
            this.collectStepIdsRecursive(branch.steps, stepIds);
          }
        }
      }
    }
  }

  /**
   * Validate step connectivity and isolation
   */
  private validateStepConnectivity(steps: any[], warnings: any[]): void {
    for (const step of steps) {
      // Check for isolated steps (no inputs, outputs, or dependencies)
      const hasInputs = step.inputs && Object.keys(step.inputs).length > 0;
      const hasOutputs = step.outputs && Object.keys(step.outputs).length > 0;
      const hasDependencies = step.dependsOn;
      
      if (!hasInputs && !hasOutputs && !hasDependencies && step.type !== 'log') {
        warnings.push({
          code: 'ISOLATED_STEP',
          message: `Step '${step.id}' appears to be isolated (no inputs, outputs, or dependencies)`,
          path: `steps[${step.id}]`,
          severity: 'warning'
        });
      }
      
      // Recursively validate nested steps
      if (step.steps) {
        this.validateStepConnectivity(step.steps, warnings);
      }
      if (step.config?.thenSteps) {
        this.validateStepConnectivity(step.config.thenSteps, warnings);
      }
      if (step.config?.elseSteps) {
        this.validateStepConnectivity(step.config.elseSteps, warnings);
      }
      if (step.config?.branches) {
        for (const branch of step.config.branches) {
          if (branch.steps) {
            this.validateStepConnectivity(branch.steps, warnings);
          }
        }
      }
    }
  }

  /**
   * Calculate workflow complexity score
   */
  private calculateComplexity(workflow: YamlWorkflowDefinition): WorkflowComplexity {
    const stepCount = this.countSteps(workflow.steps);
    const stepTypes = this.extractStepTypes(workflow.steps);
    const dependencies = this.extractDependencies(workflow.steps);
    const substitutions = ParameterSubstitution.extractExpressions(workflow);

    const score = (
      stepCount * 1 +
      stepTypes.length * 2 +
      Object.keys(dependencies).length * 3 +
      substitutions.length * 1 +
      (workflow.inputs ? Object.keys(workflow.inputs).length : 0) * 1 +
      (workflow.outputs ? Object.keys(workflow.outputs).length : 0) * 1
    );

    let level: 'low' | 'medium' | 'high' | 'very-high';
    if (score <= 10) level = 'low';
    else if (score <= 25) level = 'medium';
    else if (score <= 50) level = 'high';
    else level = 'very-high';

    return {
      score,
      level,
      factors: {
        stepCount,
        stepTypeVariety: stepTypes.length,
        dependencyCount: Object.keys(dependencies).length,
        substitutionCount: substitutions.length,
        inputCount: workflow.inputs ? Object.keys(workflow.inputs).length : 0,
        outputCount: workflow.outputs ? Object.keys(workflow.outputs).length : 0
      }
    };
  }
}

// Additional interfaces
export interface WorkflowInfo {
  nameSpace: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags: string[];
  stepCount: number;
  stepTypes: string[];
  dependencies: Record<string, string[]>;
  hasInputs: boolean;
  hasOutputs: boolean;
  hasVariables: boolean;
  hasParameterSubstitutions: boolean;
  substitutionExpressions: string[];
  complexity: WorkflowComplexity;
}

export interface WorkflowComplexity {
  score: number;
  level: 'low' | 'medium' | 'high' | 'very-high';
  factors: {
    stepCount: number;
    stepTypeVariety: number;
    dependencyCount: number;
    substitutionCount: number;
    inputCount: number;
    outputCount: number;
  };
}