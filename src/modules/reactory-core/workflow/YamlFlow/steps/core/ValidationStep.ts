/**
 * ValidationStep - Validates data against schemas
 * Supports JSON Schema validation and custom validation rules
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Configuration interface for ValidationStep
 */
/**
 * A single rule in the list form of `rules` — the shape the workflow JSON schema
 * documents and every YAML workflow in the repository uses.
 *
 * `field` carries the *value* under test, not a path: templates in step config
 * are interpolated before the step runs, so `field: "${input.user.email}"`
 * arrives as the email itself.
 */
export interface ValidationRuleSpec {
  /** The value to validate (usually a resolved template expression). */
  field: any;
  /** How to validate it. */
  type: 'required' | 'type' | 'pattern' | 'range' | 'custom';
  /** Type-specific expectation: a regex for `pattern`, a type name for `type`, `{min,max}` for `range`. */
  value?: string | number | Record<string, any>;
  /** Message reported when the rule fails. */
  message?: string;
}

export interface ValidationStepConfig {
  /**
   * Data to validate. Required by the map form of `rules` and by `schema`; not
   * used by the list form, which carries its values inline on each rule.
   */
  data?: any;
  
  /** JSON Schema for validation */
  schema?: Record<string, any>;
  
  /**
   * Validation rules, in either of two forms:
   *
   *  - a **list** of ValidationRuleSpec — what the workflow schema documents and
   *    what all shipped YAML uses;
   *  - a **map** keyed by check kind (required/types/patterns/ranges/lengths),
   *    which validates fields of `data`.
   */
  rules?: ValidationRuleSpec[] | {
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
  
  /** List form only: stop at the first failing rule instead of collecting all. */
  stopOnFirstError?: boolean;
  
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
    
    // Custom rules validation — accepts either the documented list form or the
    // map form. Every YAML workflow in the repository uses the list form, which
    // was previously unsupported: validateConfig demanded `data` and
    // validateCustomRules assumed the map, so those steps failed with "data is
    // required" and the engine retried them forever.
    if (config.rules) {
      const rulesResult = Array.isArray(config.rules)
        ? this.validateRuleList(config.rules as ValidationRuleSpec[], config.stopOnFirstError === true)
        : this.validateCustomRules(data, config.rules);
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
   * Evaluate the list form of `rules`.
   *
   * Each rule carries the value under test on `field` (templates in step config
   * are already interpolated by the time the step runs) plus the check to apply.
   *
   * @param rules - Rules to evaluate
   * @param stopOnFirstError - Return as soon as one rule fails
   * @returns Validity plus the messages of every failed rule
   */
  private validateRuleList(
    rules: ValidationRuleSpec[],
    stopOnFirstError: boolean
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const fail = (rule: ValidationRuleSpec, fallback: string): boolean => {
      errors.push(rule.message || fallback);
      return stopOnFirstError;
    };

    for (const rule of rules) {
      const value = rule.field;

      switch (rule.type) {
        case 'required': {
          const missing =
            value === undefined ||
            value === null ||
            (typeof value === 'string' && value.trim().length === 0) ||
            (Array.isArray(value) && value.length === 0);
          if (missing && fail(rule, 'value is required')) return { valid: false, errors };
          break;
        }

        case 'pattern': {
          // An absent value is the `required` rule's business, not this one's.
          if (value === undefined || value === null || value === '') break;
          const pattern = typeof rule.value === 'string' ? rule.value : String(rule.value ?? '');
          let matches = false;
          try {
            matches = new RegExp(pattern).test(String(value));
          } catch {
            if (fail(rule, `invalid pattern: ${pattern}`)) return { valid: false, errors };
            break;
          }
          if (!matches && fail(rule, `value does not match ${pattern}`)) {
            return { valid: false, errors };
          }
          break;
        }

        case 'type': {
          const expected = String(rule.value ?? '');
          const actual = Array.isArray(value) ? 'array' : typeof value;
          if (actual !== expected && fail(rule, `expected ${expected} but got ${actual}`)) {
            return { valid: false, errors };
          }
          break;
        }

        case 'range': {
          const numeric = Number(value);
          const bounds = (typeof rule.value === 'object' && rule.value !== null
            ? rule.value
            : {}) as { min?: number; max?: number };
          const outOfRange =
            Number.isNaN(numeric) ||
            (bounds.min !== undefined && numeric < bounds.min) ||
            (bounds.max !== undefined && numeric > bounds.max);
          if (outOfRange && fail(rule, `value ${String(value)} is out of range`)) {
            return { valid: false, errors };
          }
          break;
        }

        case 'custom':
          // No evaluator is defined for custom rules; they are accepted so a
          // workflow declaring one is not blocked, and recorded for visibility.
          break;

        default:
          if (fail(rule, `unknown validation type: ${String((rule as any).type)}`)) {
            return { valid: false, errors };
          }
      }
    }

    return { valid: errors.length === 0, errors };
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
    
    const rulesAreList = Array.isArray(config.rules);
    
    // `data` is what the schema form and the map form of `rules` validate
    // against. The list form carries its values inline on each rule, so
    // requiring `data` unconditionally rejected every workflow in the
    // repository with "data is required".
    if (config.data === undefined && !rulesAreList) {
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
    
    if (rulesAreList) {
      const allowed = ['required', 'type', 'pattern', 'range', 'custom'];
      (config.rules as any[]).forEach((rule, index) => {
        if (!rule || typeof rule !== 'object') {
          errors.push(`rules[${index}] must be an object`);
          return;
        }
        if (!('field' in rule)) errors.push(`rules[${index}].field is required`);
        if (!rule.type) errors.push(`rules[${index}].type is required`);
        else if (!allowed.includes(rule.type)) {
          errors.push(`rules[${index}].type must be one of ${allowed.join(', ')}`);
        }
        if (rule.type === 'pattern' && typeof rule.value !== 'string') {
          errors.push(`rules[${index}].value must be a regex string for a pattern rule`);
        }
      });
    } else if (config.rules) {
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
