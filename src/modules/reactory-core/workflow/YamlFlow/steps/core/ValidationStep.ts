/**
 * ValidationStep - Validates data against schemas
 * Supports JSON Schema validation and custom validation rules
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Configuration interface for ValidationStep
 */
export interface ValidationStepConfig {
  /** Data to validate (can use template variables) */
  data: any;
  
  /** JSON Schema for validation */
  schema?: Record<string, any>;
  
  /** Custom validation rules */
  rules?: {
    /** Required fields */
    required?: string[];
    
    /** Type validations */
    types?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>;
    
    /** Pattern validations for strings */
    patterns?: Record<string, string>;
    
    /** Range validations for numbers */
    ranges?: Record<string, { min?: number; max?: number }>;
    
    /** Length validations for strings/arrays */
    lengths?: Record<string, { min?: number; max?: number }>;
  };
  
  /** Whether to fail the workflow if validation fails */
  failOnError?: boolean;
  
  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for validating data against schemas and rules
 */
export class ValidationStep extends BaseYamlStep {
  public readonly stepType = 'validation';
  
  /**
   * Execute the validation step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as ValidationStepConfig;
    const failOnError = config.failOnError !== false; // Default to true
    
    // Resolve data templates
    const data = this.resolveDataTemplates(config.data, context);
    
    const validationResults: {
      schema?: { valid: boolean; errors: string[] };
      rules?: { valid: boolean; errors: string[] };
    } = {};
    
    let isValid = true;
    const allErrors: string[] = [];
    
    // JSON Schema validation
    if (config.schema) {
      const schemaResult = this.validateJsonSchema(data, config.schema);
      validationResults.schema = schemaResult;
      if (!schemaResult.valid) {
        isValid = false;
        allErrors.push(...schemaResult.errors);
      }
    }
    
    // Custom rules validation
    if (config.rules) {
      const rulesResult = this.validateCustomRules(data, config.rules);
      validationResults.rules = rulesResult;
      if (!rulesResult.valid) {
        isValid = false;
        allErrors.push(...rulesResult.errors);
      }
    }
    
    // Log validation results
    if (isValid) {
      context.logger.info(`Validation passed for data: ${JSON.stringify(data, null, 2)}`);
    } else {
      const errorMessage = `Validation failed: ${allErrors.join(', ')}`;
      if (failOnError) {
        context.logger.error(errorMessage);
      } else {
        context.logger.warn(errorMessage);
      }
    }
    
    // Return results
    if (!isValid && failOnError) {
      return {
        success: false,
        error: `Validation failed: ${allErrors.join(', ')}`,
        outputs: {
          validationResults,
          data,
          errors: allErrors
        },
        metadata: {
          validationType: this.getValidationType(config),
          errorCount: allErrors.length,
          failOnError
        }
      };
    }
    
    return {
      success: true,
      outputs: {
        valid: isValid,
        validationResults,
        data,
        errors: allErrors
      },
      metadata: {
        validationType: this.getValidationType(config),
        errorCount: allErrors.length,
        warningCount: isValid ? 0 : allErrors.length,
        failOnError
      }
    };
  }
  
  /**
   * Resolve template variables in data recursively
   * @param data - Data to resolve
   * @param context - Execution context
   * @returns Resolved data
   */
  private resolveDataTemplates(data: any, context: StepExecutionContext): any {
    if (typeof data === 'string') {
      return this.resolveTemplate(data, context);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.resolveDataTemplates(item, context));
    }
    
    if (data && typeof data === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        resolved[key] = this.resolveDataTemplates(value, context);
      }
      return resolved;
    }
    
    return data;
  }
  
  /**
   * Validate data against JSON Schema
   * @param data - Data to validate
   * @param schema - JSON Schema
   * @returns Validation result
   */
  private validateJsonSchema(data: any, schema: Record<string, any>): { valid: boolean; errors: string[] } {
    // Basic JSON Schema validation implementation
    // In a real implementation, you would use a library like Ajv
    const errors: string[] = [];
    
    try {
      this.validateSchemaProperty(data, schema, '', errors);
    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate a single schema property
   * @param value - Value to validate
   * @param schema - Schema for this property
   * @param path - Current path in the object
   * @param errors - Array to collect errors
   */
  private validateSchemaProperty(value: any, schema: any, path: string, errors: string[]): void {
    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        errors.push(`${path || 'root'}: expected type ${schema.type}, got ${actualType}`);
      }
    }
    
    // Required properties
    if (schema.required && Array.isArray(schema.required) && value && typeof value === 'object') {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          errors.push(`${path || 'root'}: missing required property '${requiredProp}'`);
        }
      }
    }
    
    // Object properties
    if (schema.properties && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in value) {
          this.validateSchemaProperty(value[propName], propSchema, `${path}.${propName}`, errors);
        }
      }
    }
    
    // Array items
    if (schema.items && Array.isArray(value)) {
      value.forEach((item, index) => {
        this.validateSchemaProperty(item, schema.items, `${path}[${index}]`, errors);
      });
    }
    
    // String pattern
    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`${path || 'root'}: string does not match pattern ${schema.pattern}`);
      }
    }
    
    // Number ranges
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path || 'root'}: value ${value} is less than minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path || 'root'}: value ${value} is greater than maximum ${schema.maximum}`);
      }
    }
  }
  
  /**
   * Validate data against custom rules
   * @param data - Data to validate
   * @param rules - Custom validation rules
   * @returns Validation result
   */
  private validateCustomRules(data: any, rules: ValidationStepConfig['rules']): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rules) {
      return { valid: true, errors };
    }
    
    // Required fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!this.getNestedValue(data, field)) {
          errors.push(`required field '${field}' is missing or empty`);
        }
      }
    }
    
    // Type validations
    if (rules.types) {
      for (const [field, expectedType] of Object.entries(rules.types)) {
        const value = this.getNestedValue(data, field);
        if (value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== expectedType) {
            errors.push(`field '${field}' should be ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
    
    // Pattern validations
    if (rules.patterns) {
      for (const [field, pattern] of Object.entries(rules.patterns)) {
        const value = this.getNestedValue(data, field);
        if (value && typeof value === 'string') {
          const regex = new RegExp(pattern);
          if (!regex.test(value)) {
            errors.push(`field '${field}' does not match pattern ${pattern}`);
          }
        }
      }
    }
    
    // Range validations
    if (rules.ranges) {
      for (const [field, range] of Object.entries(rules.ranges)) {
        const value = this.getNestedValue(data, field);
        if (typeof value === 'number') {
          if (range.min !== undefined && value < range.min) {
            errors.push(`field '${field}' value ${value} is less than minimum ${range.min}`);
          }
          if (range.max !== undefined && value > range.max) {
            errors.push(`field '${field}' value ${value} is greater than maximum ${range.max}`);
          }
        }
      }
    }
    
    // Length validations
    if (rules.lengths) {
      for (const [field, length] of Object.entries(rules.lengths)) {
        const value = this.getNestedValue(data, field);
        if (value && (typeof value === 'string' || Array.isArray(value))) {
          const actualLength = value.length;
          if (length.min !== undefined && actualLength < length.min) {
            errors.push(`field '${field}' length ${actualLength} is less than minimum ${length.min}`);
          }
          if (length.max !== undefined && actualLength > length.max) {
            errors.push(`field '${field}' length ${actualLength} is greater than maximum ${length.max}`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get nested value from object using dot notation
   * @param obj - Object to search
   * @param path - Dot-separated path
   * @returns Value or undefined
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Get validation type for metadata
   * @param config - Step configuration
   * @returns Validation type
   */
  private getValidationType(config: ValidationStepConfig): string {
    if (config.schema && config.rules) {
      return 'schema+rules';
    } else if (config.schema) {
      return 'schema';
    } else if (config.rules) {
      return 'rules';
    } else {
      return 'none';
    }
  }
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Must have data to validate
    if (config.data === undefined) {
      errors.push('data is required');
    }
    
    // Must have either schema or rules
    if (!config.schema && !config.rules) {
      errors.push('either schema or rules must be provided');
    }
    
    // Validate schema if provided
    if (config.schema && typeof config.schema !== 'object') {
      errors.push('schema must be an object');
    }
    
    // Validate rules if provided
    if (config.rules) {
      if (typeof config.rules !== 'object') {
        errors.push('rules must be an object');
      } else {
        // Validate rules structure
        const { required, types, patterns, ranges, lengths } = config.rules;
        
        if (required && !Array.isArray(required)) {
          errors.push('rules.required must be an array');
        }
        
        if (types && typeof types !== 'object') {
          errors.push('rules.types must be an object');
        }
        
        if (patterns && typeof patterns !== 'object') {
          errors.push('rules.patterns must be an object');
        }
        
        if (ranges && typeof ranges !== 'object') {
          errors.push('rules.ranges must be an object');
        }
        
        if (lengths && typeof lengths !== 'object') {
          errors.push('rules.lengths must be an object');
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
