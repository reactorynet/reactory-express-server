import Ajv from 'ajv';
import yaml from 'yaml';
import { 
 readFileSync
} from 'fs';
import {
 join 
} from 'path';
import { 
  YamlWorkflowDefinition, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  ParseResult,
  ParseError,
  ParameterSubstitutionContext
} from '../types/WorkflowDefinition';
import { ParameterSubstitution } from '../parsers/ParameterSubstitution';

export class YamlValidator {
  private ajv: any;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true
    });
    
    // Load and compile schema
    this.loadSchema();
  }

  /**
   * Parse and validate a YAML workflow string
   */
  public parseAndValidate(
    yamlContent: string,
    context?: Partial<ParameterSubstitutionContext>
  ): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    try {
      // Parse YAML
      const document = yaml.parseDocument(yamlContent);

      if (document.errors.length > 0) {
        for (const error of document.errors) {
          errors.push({
            code: 'YAML_PARSE_ERROR',
            message: error.message,
            line: (error as any).linePos?.start?.line,
            column: (error as any).linePos?.start?.col,
            severity: 'error'
          });
        }
      }

      if (document.warnings.length > 0) {
        for (const warning of document.warnings) {
          warnings.push({
            code: 'YAML_PARSE_WARNING',
            message: warning.message,
            line: (warning as any).linePos?.start?.line,
            column: (warning as any).linePos?.start?.col,
            severity: 'warning'
          });
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors,
          warnings: warnings.filter(w => w.severity === 'warning') as any
        };
      }

      const workflow = document.toJSON() as YamlWorkflowDefinition;

      // Validate against JSON schema
      const schemaValidation = this.validateSchema(workflow);
      errors.push(...schemaValidation.errors.map(e => ({ ...e, severity: 'error' as const })));
      warnings.push(...schemaValidation.warnings.map(w => ({ ...w, severity: 'warning' as const })));

      if (schemaValidation.valid) {
        // Perform semantic validation
        const semanticValidation = this.validateSemantics(workflow);
        errors.push(...semanticValidation.errors.map(e => ({ ...e, severity: 'error' as const })));
        warnings.push(...semanticValidation.warnings.map(w => ({ ...w, severity: 'warning' as const })));

        // Validate parameter substitutions if context provided
        if (context) {
          const fullContext = this.createFullContext(workflow, context);
          const substitutionValidation = this.validateParameterSubstitutions(workflow, fullContext);
          errors.push(...substitutionValidation.errors.map(e => ({ ...e, severity: 'error' as const })));
          warnings.push(...substitutionValidation.warnings.map(w => ({ ...w, severity: 'warning' as const })));
        }
      }

      return {
        success: errors.length === 0,
        workflow: errors.length === 0 ? workflow : undefined,
        errors,
        warnings: warnings.filter(w => w.severity === 'warning') as any
      };

    } catch (error) {
      errors.push({
        code: 'PARSE_ERROR',
        message: `Failed to parse YAML: ${error.message}`,
        severity: 'error'
      });

      return {
        success: false,
        errors,
        warnings: warnings.filter(w => w.severity === 'warning') as any
      };
    }
  }

  /**
   * Validate workflow definition against JSON schema
   */
  public validateSchema(workflow: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const valid = this.ajv.validate(this.schema, workflow);

    if (!valid && this.ajv.errors) {
      for (const error of this.ajv.errors) {
        const validationError: ValidationError = {
          code: 'SCHEMA_VALIDATION_ERROR',
          message: this.formatAjvError(error),
          path: error.instancePath || error.schemaPath || 'unknown',
          value: error.data,
          expected: error.schema
        };

        // Categorize some errors as warnings
        if (this.isWarningLevel(error)) {
          warnings.push({ ...validationError, severity: 'warning' });
        } else {
          errors.push(validationError);
        }
      }
    }

    return { valid, errors, warnings };
  }

  /**
   * Validate workflow semantics beyond JSON schema
   */
  public validateSemantics(workflow: YamlWorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate nameSpace follows camelCase convention
    if (!/^[a-z][a-zA-Z0-9]*$/.test(workflow.nameSpace)) {
      warnings.push({
        code: 'NAMESPACE_CONVENTION',
        message: 'nameSpace should follow camelCase convention (start with lowercase letter)',
        path: 'nameSpace',
        value: workflow.nameSpace,
        severity: 'warning'
      });
    }

    // Validate step IDs are unique
    const stepIds = new Set<string>();
    const duplicateStepIds = new Set<string>();
    
    this.collectStepIds(workflow.steps, stepIds, duplicateStepIds);
    
    for (const duplicateId of duplicateStepIds) {
      errors.push({
        code: 'DUPLICATE_STEP_ID',
        message: `Duplicate step ID: ${duplicateId}`,
        path: 'steps',
        value: duplicateId
      });
    }

    // Validate step dependencies
    for (const step of workflow.steps) {
      this.validateStepDependencies(step, stepIds, errors);
    }

    // Validate input/output references
    this.validateInputOutputReferences(workflow, errors, warnings);

    // Validate conditional expressions syntax
    this.validateConditionalExpressions(workflow.steps, errors);

    // Validate timeout values
    this.validateTimeouts(workflow, errors);

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(workflow.version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning format (x.y.z)',
        path: 'version',
        value: workflow.version
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate parameter substitutions in workflow
   */
  public validateParameterSubstitutions(
    workflow: YamlWorkflowDefinition,
    context: ParameterSubstitutionContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const substitutionErrors = ParameterSubstitution.validateExpressions(workflow, context);
      
      for (const error of substitutionErrors) {
        errors.push({
          code: error.code,
          message: error.message,
          path: error.path || 'unknown',
          value: undefined
        });
      }
    } catch (error) {
      errors.push({
        code: 'SUBSTITUTION_VALIDATION_ERROR',
        message: `Failed to validate parameter substitutions: ${error.message}`,
        path: 'workflow'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load and compile JSON schema
   */
  private loadSchema(): void {
    try {
      const schemaPath = join(__dirname, '../schema/WorkflowSchema.json');
      const schemaContent = readFileSync(schemaPath, 'utf8');
      this.schema = JSON.parse(schemaContent);
      this.ajv.compile(this.schema);
    } catch (error) {
      throw new Error(`Failed to load workflow schema: ${error.message}`);
    }
  }

  /**
   * Format AJV validation error for better readability
   */
  private formatAjvError(error: any): string {
    const path = error.instancePath || error.schemaPath || 'root';
    
    switch (error.keyword) {
      case 'required':
        return `Missing required property '${error.params?.missingProperty}' at ${path}`;
      case 'type':
        return `Invalid type at ${path}: expected ${error.params?.type}, got ${typeof error.data}`;
      case 'enum':
        return `Invalid value at ${path}: must be one of [${error.params?.allowedValues?.join(', ')}]`;
      case 'pattern':
        return `Invalid format at ${path}: does not match pattern ${error.params?.pattern}`;
      case 'minItems':
        return `Array at ${path} must have at least ${error.params?.limit} items`;
      case 'maxItems':
        return `Array at ${path} must have at most ${error.params?.limit} items`;
      case 'minimum':
        return `Value at ${path} must be >= ${error.params?.limit}`;
      case 'maximum':
        return `Value at ${path} must be <= ${error.params?.limit}`;
      default:
        return `Validation error at ${path}: ${error.message}`;
    }
  }

  /**
   * Determine if an AJV error should be treated as a warning
   */
  private isWarningLevel(error: any): boolean {
    // Some validation errors can be treated as warnings
    const warningKeywords = ['format', 'pattern'];
    return warningKeywords.includes(error.keyword);
  }

  /**
   * Recursively collect all step IDs and identify duplicates
   */
  private collectStepIds(
    steps: any[], 
    stepIds: Set<string>, 
    duplicates: Set<string>
  ): void {
    for (const step of steps) {
      if (step.id) {
        if (stepIds.has(step.id)) {
          duplicates.add(step.id);
        } else {
          stepIds.add(step.id);
        }
      }

      // Recursively check nested steps
      if (step.steps) {
        this.collectStepIds(step.steps, stepIds, duplicates);
      }
      
      // Check conditional steps
      if (step.config?.thenSteps) {
        this.collectStepIds(step.config.thenSteps, stepIds, duplicates);
      }
      if (step.config?.elseSteps) {
        this.collectStepIds(step.config.elseSteps, stepIds, duplicates);
      }
      
      // Check parallel branches
      if (step.config?.branches) {
        for (const branch of step.config.branches) {
          if (branch.steps) {
            this.collectStepIds(branch.steps, stepIds, duplicates);
          }
        }
      }
    }
  }

  /**
   * Validate step dependencies exist
   */
  private validateStepDependencies(
    step: any, 
    allStepIds: Set<string>, 
    errors: ValidationError[]
  ): void {
    if (step.dependsOn) {
      const dependencies = Array.isArray(step.dependsOn) ? step.dependsOn : [step.dependsOn];
      
      for (const depId of dependencies) {
        if (!allStepIds.has(depId)) {
          errors.push({
            code: 'INVALID_DEPENDENCY',
            message: `Step '${step.id}' depends on non-existent step '${depId}'`,
            path: `steps[${step.id}].dependsOn`,
            value: depId
          });
        }
      }
    }
  }

  /**
   * Validate input/output parameter references
   */
  private validateInputOutputReferences(
    workflow: YamlWorkflowDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const inputParams = new Set(Object.keys(workflow.inputs || {}));
    const outputParams = new Set(Object.keys(workflow.outputs || {}));

    // Check if required inputs are referenced
    for (const [name, param] of Object.entries(workflow.inputs || {})) {
      if (param.required && !this.isParameterReferenced(workflow, `input.${name}`)) {
        warnings.push({
          code: 'UNUSED_REQUIRED_INPUT',
          message: `Required input parameter '${name}' is not referenced in workflow`,
          path: `inputs.${name}`,
          value: name,
          severity: 'warning'
        });
      }
    }

    // Validate output source expressions
    for (const [name, output] of Object.entries(workflow.outputs || {})) {
      if (!this.isValidOutputSource(output.source, workflow)) {
        errors.push({
          code: 'INVALID_OUTPUT_SOURCE',
          message: `Output '${name}' has invalid source expression: ${output.source}`,
          path: `outputs.${name}.source`,
          value: output.source
        });
      }
    }
  }

  /**
   * Check if a parameter is referenced in the workflow
   */
  private isParameterReferenced(workflow: YamlWorkflowDefinition, paramPath: string): boolean {
    const workflowStr = JSON.stringify(workflow);
    return workflowStr.includes(`\${${paramPath}}`);
  }

  /**
   * Validate if an output source expression is valid
   */
  private isValidOutputSource(source: string, workflow: YamlWorkflowDefinition): boolean {
    // Basic validation - could be enhanced with expression parser
    const validPrefixes = ['step.', 'variables.', 'input.', 'workflow.'];
    return validPrefixes.some(prefix => source.startsWith(prefix));
  }

  /**
   * Validate conditional expressions syntax
   */
  private validateConditionalExpressions(steps: any[], errors: ValidationError[]): void {
    for (const step of steps) {
      if (step.condition) {
        // Basic syntax validation - could be enhanced with expression parser
        if (!this.isValidConditionalExpression(step.condition)) {
          errors.push({
            code: 'INVALID_CONDITIONAL_EXPRESSION',
            message: `Invalid conditional expression in step '${step.id}': ${step.condition}`,
            path: `steps[${step.id}].condition`,
            value: step.condition
          });
        }
      }

      // Recursively validate nested steps
      if (step.steps) {
        this.validateConditionalExpressions(step.steps, errors);
      }
    }
  }

  /**
   * Basic conditional expression validation
   */
  private isValidConditionalExpression(expression: string): boolean {
    // Basic validation - should contain valid operators and operands
    const basicPattern = /^[\w\s\.\$\{\}\|\&\!\=\<\>\(\)]+$/;
    return basicPattern.test(expression) && expression.trim().length > 0;
  }

  /**
   * Validate timeout values are reasonable
   */
  private validateTimeouts(workflow: YamlWorkflowDefinition, errors: ValidationError[]): void {
    if (workflow.metadata?.timeout && workflow.metadata.timeout < 1000) {
      errors.push({
        code: 'INVALID_TIMEOUT',
        message: 'Workflow timeout should be at least 1000ms (1 second)',
        path: 'metadata.timeout',
        value: workflow.metadata.timeout
      });
    }

    // Validate step timeouts
    this.validateStepTimeouts(workflow.steps, errors);
  }

  /**
   * Recursively validate step timeout values
   */
  private validateStepTimeouts(steps: any[], errors: ValidationError[]): void {
    for (const step of steps) {
      if (step.timeout && step.timeout < 100) {
        errors.push({
          code: 'INVALID_STEP_TIMEOUT',
          message: `Step '${step.id}' timeout should be at least 100ms`,
          path: `steps[${step.id}].timeout`,
          value: step.timeout
        });
      }

      // Recursively validate nested steps
      if (step.steps) {
        this.validateStepTimeouts(step.steps, errors);
      }
    }
  }

  /**
   * Create full substitution context from workflow and partial context
   */
  private createFullContext(
    workflow: YamlWorkflowDefinition,
    partial: Partial<ParameterSubstitutionContext>
  ): ParameterSubstitutionContext {
    return {
      env: process.env as Record<string, string>,
      workflow: {
        id: partial.workflow?.id || 'validation-workflow',
        instanceId: partial.workflow?.instanceId || 'validation-instance',
        nameSpace: workflow.nameSpace,
        name: workflow.name,
        version: workflow.version
      },
      input: partial.input || {},
      variables: workflow.variables || {},
      step: partial.step || {
        id: 'validation-step',
        type: 'validation',
        outputs: {}
      },
      outputs: partial.outputs || {},
      ...partial
    };
  }
}
