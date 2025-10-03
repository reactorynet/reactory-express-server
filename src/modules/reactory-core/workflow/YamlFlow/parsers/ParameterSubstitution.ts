/**
 * Parameter Substitution Engine for YAML Workflows
 * 
 * Supports substitution patterns:
 * - ${env.VARIABLE_NAME} - Environment variables
 * - ${workflow.property} - Workflow properties (id, instanceId, nameSpace, name, version)
 * - ${input.parameterName} - Input parameters
 * - ${variables.variableName} - Workflow variables
 * - ${step.stepId.outputName} - Step outputs
 * - ${outputs.outputName} - Workflow outputs
 */

import { ParameterSubstitutionContext, ParseError } from '../types/WorkflowDefinition';

export class ParameterSubstitution {
  private static readonly SUBSTITUTION_PATTERN = /\$\{([^}]+)\}/g;
  private static readonly PATH_SEPARATOR = '.';

  /**
   * Substitute parameters in a value (string, object, or array)
   */
  public static substitute(
    value: any,
    context: ParameterSubstitutionContext,
    strict: boolean = true
  ): { result: any; errors: ParseError[] } {
    const errors: ParseError[] = [];

    try {
      const result = this.substituteRecursive(value, context, strict, errors);
      return { result, errors };
    } catch (error) {
      errors.push({
        code: 'SUBSTITUTION_ERROR',
        message: `Failed to substitute parameters: ${error.message}`,
        severity: 'error'
      });
      return { result: value, errors };
    }
  }

  /**
   * Substitute parameters in a string value
   */
  public static substituteString(
    text: string,
    context: ParameterSubstitutionContext,
    strict: boolean = true
  ): { result: string; errors: ParseError[] } {
    const errors: ParseError[] = [];
    
    try {
      const result = text.replace(this.SUBSTITUTION_PATTERN, (match, expression) => {
        const substitutionResult = this.evaluateExpression(expression.trim(), context, strict);
        
        if (substitutionResult.error) {
          // Always record errors, even in non-strict mode
          errors.push(substitutionResult.error);
          
          if (strict || substitutionResult.value === undefined) {
            return strict ? match : '';
          }
        }
        
        return this.formatValue(substitutionResult.value);
      });

      return { result, errors };
    } catch (error) {
      errors.push({
        code: 'STRING_SUBSTITUTION_ERROR',
        message: `Failed to substitute string: ${error.message}`,
        severity: 'error'
      });
      return { result: text, errors };
    }
  }

  /**
   * Check if a value contains substitution patterns
   */
  public static hasSubstitutionPatterns(value: any): boolean {
    if (typeof value === 'string') {
      // Create a new regex instance without global flag for testing
      return /\$\{([^}]+)\}/.test(value);
    }
    
    if (Array.isArray(value)) {
      return value.some(item => this.hasSubstitutionPatterns(item));
    }
    
    if (value && typeof value === 'object') {
      return Object.values(value).some(val => this.hasSubstitutionPatterns(val));
    }
    
    return false;
  }

  /**
   * Extract all substitution expressions from a value
   */
  public static extractExpressions(value: any): string[] {
    const expressions: string[] = [];
    this.extractExpressionsRecursive(value, expressions);
    return [...new Set(expressions)]; // Remove duplicates
  }

  /**
   * Validate all expressions in a value against a context
   */
  public static validateExpressions(
    value: any,
    context: ParameterSubstitutionContext
  ): ParseError[] {
    const expressions = this.extractExpressions(value);
    const errors: ParseError[] = [];

    for (const expression of expressions) {
      const result = this.evaluateExpression(expression, context, true);
      if (result.error) {
        errors.push(result.error);
      }
    }

    return errors;
  }

  /**
   * Recursively substitute parameters in any value type
   */
  private static substituteRecursive(
    value: any,
    context: ParameterSubstitutionContext,
    strict: boolean,
    errors: ParseError[]
  ): any {
    if (typeof value === 'string') {
      const result = this.substituteString(value, context, strict);
      errors.push(...result.errors);
      return result.result;
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.substituteRecursive(item, context, strict, errors));
    }
    
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Substitute in both key and value
        const substitutedKey = this.substituteRecursive(key, context, strict, errors);
        const substitutedValue = this.substituteRecursive(val, context, strict, errors);
        result[substitutedKey] = substitutedValue;
      }
      return result;
    }
    
    return value;
  }

  /**
   * Extract expressions recursively from any value type
   */
  private static extractExpressionsRecursive(value: any, expressions: string[]): void {
    if (typeof value === 'string') {
      const matches = value.matchAll(this.SUBSTITUTION_PATTERN);
      for (const match of matches) {
        expressions.push(match[1].trim());
      }
    } else if (Array.isArray(value)) {
      value.forEach(item => this.extractExpressionsRecursive(item, expressions));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => {
        this.extractExpressionsRecursive(key, expressions);
        this.extractExpressionsRecursive(val, expressions);
      });
    }
  }

  /**
   * Evaluate a single substitution expression
   */
  private static evaluateExpression(
    expression: string,
    context: ParameterSubstitutionContext,
    strict: boolean
  ): { value?: any; error?: ParseError } {
    try {
      const parts = expression.split(this.PATH_SEPARATOR);
      if (parts.length === 0) {
        return {
          error: {
            code: 'INVALID_EXPRESSION',
            message: `Empty expression`,
            severity: 'error'
          }
        };
      }

      const source = parts[0];
      const path = parts.slice(1);

      let sourceValue: any;

      switch (source) {
        case 'env':
          sourceValue = context.env;
          break;
        case 'workflow':
          sourceValue = context.workflow;
          break;
        case 'input':
          sourceValue = context.input;
          break;
        case 'variables':
          sourceValue = context.variables;
          break;
        case 'step':
          sourceValue = this.resolveStepReference(path, context);
          return { value: sourceValue };
        case 'outputs':
          sourceValue = context.outputs;
          break;
        default:
          return {
            error: {
              code: 'UNKNOWN_SOURCE',
              message: `Unknown substitution source: ${source}`,
              severity: 'error'
            }
          };
      }

      const value = this.resolvePath(sourceValue, path);
      
      if (value === undefined) {
        const error = {
          code: 'UNDEFINED_REFERENCE',
          message: `Undefined reference: ${expression}`,
          severity: strict ? 'error' : 'warning'
        } as ParseError;
        
        if (strict) {
          return { error };
        } else {
          // In non-strict mode, return undefined value but still record the error
          return { value: undefined, error };
        }
      }

      return { value };
    } catch (error) {
      return {
        error: {
          code: 'EXPRESSION_EVALUATION_ERROR',
          message: `Failed to evaluate expression '${expression}': ${error.message}`,
          severity: 'error'
        }
      };
    }
  }

  /**
   * Resolve step output reference (step.stepId.outputName)
   */
  private static resolveStepReference(
    path: string[],
    context: ParameterSubstitutionContext
  ): any {
    if (path.length < 2) {
      throw new Error('Step reference requires at least stepId and outputName');
    }

    const stepId = path[0];
    const outputName = path[1];
    const subPath = path.slice(2);

    // First check if we're referencing the current step
    if (stepId === context.step.id) {
      if (context.step.outputs && outputName in context.step.outputs) {
        return this.resolvePath(context.step.outputs[outputName], subPath);
      }
    }

    // Look in step results
    const stepResult = context.stepResults?.[stepId];
    if (stepResult && stepResult.outputs && outputName in stepResult.outputs) {
      return this.resolvePath(stepResult.outputs[outputName], subPath);
    }

    return undefined;
  }

  /**
   * Resolve a dot-notation path in an object
   */
  private static resolvePath(obj: any, path: string[]): any {
    let current = obj;
    
    for (const part of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      if (typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Format a value for string substitution
   */
  private static formatValue(value: any): string {
    if (value === null) {
      return 'null';
    }
    
    if (value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * Create a minimal context for testing
   */
  public static createTestContext(overrides: Partial<ParameterSubstitutionContext> = {}): ParameterSubstitutionContext {
    return {
      env: process.env as Record<string, string>,
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
        type: 'test',
        outputs: {}
      },
      outputs: {},
      stepResults: {},
      ...overrides
    };
  }

  /**
   * Escape substitution patterns in a string (for literal use)
   */
  public static escapeSubstitutionPatterns(text: string): string {
    return text.replace(/\$\{/g, '\\${');
  }

  /**
   * Unescape substitution patterns in a string
   */
  public static unescapeSubstitutionPatterns(text: string): string {
    return text.replace(/\\\$\{/g, '${');
  }
}
