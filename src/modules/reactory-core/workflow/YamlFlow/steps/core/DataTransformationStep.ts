/**
 * DataTransformationStep - Transform and manipulate data
 * Supports filtering, mapping, aggregation, and custom transformations
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Configuration interface for DataTransformationStep
 */
export interface DataTransformationStepConfig {
  /** Input data to transform */
  input: any;
  
  /** Array of transformations to apply in sequence */
  transformations: Array<{
    /** Type of transformation */
    type: 'filter' | 'map' | 'sort' | 'group' | 'aggregate' | 'merge' | 'extract' | 'custom';
    
    /** Configuration for the transformation */
    config: Record<string, any>;
  }>;
  
  /** Output variable name to store result */
  outputVariable?: string;
  
  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for transforming and manipulating data
 */
export class DataTransformationStep extends BaseYamlStep {
  public readonly stepType = 'dataTransformation';
  
  /**
   * Execute the data transformation step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as DataTransformationStepConfig;
    
    // Resolve input data
    let data = this.resolveDataTemplates(config.input, context);
    
    const transformationResults: Array<{
      type: string;
      inputSize: number;
      outputSize: number;
      duration: number;
    }> = [];
    
    // Apply transformations in sequence
    for (const transformation of config.transformations) {
      const startTime = Date.now();
      const inputSize = this.getDataSize(data);
      
      try {
        data = await this.applyTransformation(data, transformation, context);
        
        const outputSize = this.getDataSize(data);
        const duration = Date.now() - startTime;
        
        transformationResults.push({
          type: transformation.type,
          inputSize,
          outputSize,
          duration
        });
        
        context.logger.debug(`Applied ${transformation.type} transformation: ${inputSize} -> ${outputSize} items in ${duration}ms`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`Transformation ${transformation.type} failed: ${errorMessage}`);
        
        return {
          success: false,
          error: `Transformation ${transformation.type} failed: ${errorMessage}`,
          outputs: {
            input: config.input,
            output: data,
            transformationResults
          },
          metadata: {
            totalTransformations: config.transformations.length,
            completedTransformations: transformationResults.length,
            failedAt: transformation.type
          }
        };
      }
    }
    
    // Store in output variable if specified
    if (config.outputVariable) {
      context.variables[config.outputVariable] = data;
    }
    
    return {
      success: true,
      outputs: {
        input: config.input,
        output: data,
        transformationResults
      },
      metadata: {
        totalTransformations: config.transformations.length,
        completedTransformations: transformationResults.length,
        totalDuration: transformationResults.reduce((sum, r) => sum + r.duration, 0),
        outputVariable: config.outputVariable
      }
    };
  }
  
  /**
   * Apply a single transformation to data
   * @param data - Input data
   * @param transformation - Transformation configuration
   * @param context - Execution context
   * @returns Transformed data
   */
  private async applyTransformation(
    data: any, 
    transformation: DataTransformationStepConfig['transformations'][0], 
    context: StepExecutionContext
  ): Promise<any> {
    switch (transformation.type) {
      case 'filter':
        return this.applyFilter(data, transformation.config);
      
      case 'map':
        return this.applyMap(data, transformation.config);
      
      case 'sort':
        return this.applySort(data, transformation.config);
      
      case 'group':
        return this.applyGroup(data, transformation.config);
      
      case 'aggregate':
        return this.applyAggregate(data, transformation.config);
      
      case 'merge':
        return this.applyMerge(data, transformation.config, context);
      
      case 'extract':
        return this.applyExtract(data, transformation.config);
      
      case 'custom':
        return this.applyCustom(data, transformation.config, context);
      
      default:
        throw new Error(`Unknown transformation type: ${transformation.type}`);
    }
  }
  
  /**
   * Apply filter transformation
   * @param data - Input data
   * @param config - Filter configuration
   * @returns Filtered data
   */
  private applyFilter(data: any, config: Record<string, any>): any {
    if (!Array.isArray(data)) {
      throw new Error('Filter transformation requires array input');
    }
    
    const { condition, field, value, operator = 'equals' } = config;
    
    if (condition) {
      // Custom condition (simplified - in real implementation would use a proper expression evaluator)
      return data.filter((item: any) => {
        // Basic condition evaluation - replace with proper expression parser
        return this.evaluateCondition(item, condition);
      });
    }
    
    if (field) {
      return data.filter((item: any) => {
        const itemValue = this.getNestedValue(item, field);
        return this.compareValues(itemValue, value, operator);
      });
    }
    
    throw new Error('Filter transformation requires either condition or field+value');
  }
  
  /**
   * Apply map transformation
   * @param data - Input data
   * @param config - Map configuration
   * @returns Mapped data
   */
  private applyMap(data: any, config: Record<string, any>): any {
    if (!Array.isArray(data)) {
      throw new Error('Map transformation requires array input');
    }
    
    const { fields, expression } = config;
    
    if (fields) {
      // Map specific fields
      return data.map((item: any) => {
        const mapped: Record<string, any> = {};
        for (const [newField, sourceField] of Object.entries(fields)) {
          mapped[newField] = this.getNestedValue(item, sourceField as string);
        }
        return mapped;
      });
    }
    
    if (expression) {
      // Apply expression to each item (simplified implementation)
      return data.map((item: any) => {
        return this.evaluateExpression(expression, item);
      });
    }
    
    throw new Error('Map transformation requires either fields or expression');
  }
  
  /**
   * Apply sort transformation
   * @param data - Input data
   * @param config - Sort configuration
   * @returns Sorted data
   */
  private applySort(data: any, config: Record<string, any>): any {
    if (!Array.isArray(data)) {
      throw new Error('Sort transformation requires array input');
    }
    
    const { field, order = 'asc' } = config;
    
    return [...data].sort((a: any, b: any) => {
      const aVal = this.getNestedValue(a, field);
      const bVal = this.getNestedValue(b, field);
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  /**
   * Apply group transformation
   * @param data - Input data
   * @param config - Group configuration
   * @returns Grouped data
   */
  private applyGroup(data: any, config: Record<string, any>): any {
    if (!Array.isArray(data)) {
      throw new Error('Group transformation requires array input');
    }
    
    const { field } = config;
    const groups: Record<string, any[]> = {};
    
    for (const item of data) {
      const groupKey = String(this.getNestedValue(item, field));
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    }
    
    return groups;
  }
  
  /**
   * Apply aggregate transformation
   * @param data - Input data
   * @param config - Aggregate configuration
   * @returns Aggregated data
   */
  private applyAggregate(data: any, config: Record<string, any>): any {
    if (!Array.isArray(data)) {
      throw new Error('Aggregate transformation requires array input');
    }
    
    const { operations } = config;
    const result: Record<string, any> = {};
    
    for (const [outputField, operation] of Object.entries(operations)) {
      const { type, field } = operation as any;
      
      switch (type) {
        case 'count':
          result[outputField] = data.length;
          break;
        
        case 'sum':
          result[outputField] = data.reduce((sum, item) => {
            const value = this.getNestedValue(item, field);
            return sum + (typeof value === 'number' ? value : 0);
          }, 0);
          break;
        
        case 'avg':
          const sum = data.reduce((sum, item) => {
            const value = this.getNestedValue(item, field);
            return sum + (typeof value === 'number' ? value : 0);
          }, 0);
          result[outputField] = data.length > 0 ? sum / data.length : 0;
          break;
        
        case 'min':
          result[outputField] = Math.min(...data.map(item => this.getNestedValue(item, field)).filter(v => typeof v === 'number'));
          break;
        
        case 'max':
          result[outputField] = Math.max(...data.map(item => this.getNestedValue(item, field)).filter(v => typeof v === 'number'));
          break;
        
        default:
          throw new Error(`Unknown aggregation type: ${type}`);
      }
    }
    
    return result;
  }
  
  /**
   * Apply merge transformation
   * @param data - Input data
   * @param config - Merge configuration
   * @param context - Execution context
   * @returns Merged data
   */
  private applyMerge(data: any, config: Record<string, any>, context: StepExecutionContext): any {
    const { with: mergeWith, on: joinField } = config;
    
    // Resolve merge data from context
    const mergeData = this.resolveDataTemplates(mergeWith, context);
    
    if (!Array.isArray(data) || !Array.isArray(mergeData)) {
      throw new Error('Merge transformation requires both inputs to be arrays');
    }
    
    if (joinField) {
      // Inner join on field
      return data.map(item => {
        const matchValue = this.getNestedValue(item, joinField);
        const match = mergeData.find(mergeItem => this.getNestedValue(mergeItem, joinField) === matchValue);
        return match ? { ...item, ...match } : item;
      });
    } else {
      // Simple concatenation
      return [...data, ...mergeData];
    }
  }
  
  /**
   * Apply extract transformation
   * @param data - Input data
   * @param config - Extract configuration
   * @returns Extracted data
   */
  private applyExtract(data: any, config: Record<string, any>): any {
    const { fields, path } = config;
    
    if (path) {
      return this.getNestedValue(data, path);
    }
    
    if (fields && Array.isArray(fields)) {
      const result: Record<string, any> = {};
      for (const field of fields) {
        result[field] = this.getNestedValue(data, field);
      }
      return result;
    }
    
    throw new Error('Extract transformation requires either path or fields');
  }
  
  /**
   * Apply custom transformation
   * @param data - Input data
   * @param config - Custom configuration
   * @param context - Execution context
   * @returns Transformed data
   */
  private applyCustom(data: any, config: Record<string, any>, context: StepExecutionContext): any {
    const { function: functionName, args = [] } = config;
    
    // This is a simplified implementation
    // In a real system, you would have a registry of custom transformation functions
    switch (functionName) {
      case 'unique':
        if (Array.isArray(data)) {
          const field = args[0];
          if (field) {
            const seen = new Set();
            return data.filter(item => {
              const value = this.getNestedValue(item, field);
              if (seen.has(value)) return false;
              seen.add(value);
              return true;
            });
          } else {
            return [...new Set(data)];
          }
        }
        return data;
      
      case 'flatten':
        if (Array.isArray(data)) {
          return data.flat(args[0] || 1);
        }
        return data;
      
      default:
        throw new Error(`Unknown custom function: ${functionName}`);
    }
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
   * Get data size (number of items for arrays, 1 for other types)
   * @param data - Data to measure
   * @returns Size
   */
  private getDataSize(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    return 1;
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
   * Compare two values using an operator
   * @param left - Left value
   * @param right - Right value
   * @param operator - Comparison operator
   * @returns Comparison result
   */
  private compareValues(left: any, right: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
      case '==':
        return left == right;
      
      case 'strict_equals':
      case '===':
        return left === right;
      
      case 'not_equals':
      case '!=':
        return left != right;
      
      case 'less_than':
      case '<':
        return left < right;
      
      case 'less_than_or_equal':
      case '<=':
        return left <= right;
      
      case 'greater_than':
      case '>':
        return left > right;
      
      case 'greater_than_or_equal':
      case '>=':
        return left >= right;
      
      case 'contains':
        return String(left).includes(String(right));
      
      case 'starts_with':
        return String(left).startsWith(String(right));
      
      case 'ends_with':
        return String(left).endsWith(String(right));
      
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }
  
  /**
   * Evaluate a simple condition (simplified implementation)
   * @param item - Item to evaluate
   * @param condition - Condition string
   * @returns Evaluation result
   */
  private evaluateCondition(item: any, condition: string): boolean {
    // This is a very simplified implementation
    // In a real system, you would use a proper expression parser
    
    // Basic pattern: field operator value
    const match = condition.match(/^(\w+)\s*(==|!=|<|<=|>|>=)\s*(.+)$/);
    if (match) {
      const [, field, operator, valueStr] = match;
      const itemValue = this.getNestedValue(item, field);
      let value: any = valueStr;
      
      // Try to parse as number or boolean
      if (/^\d+(\.\d+)?$/.test(valueStr)) {
        value = parseFloat(valueStr);
      } else if (valueStr === 'true' || valueStr === 'false') {
        value = valueStr === 'true';
      } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
        value = valueStr.slice(1, -1);
      }
      
      return this.compareValues(itemValue, value, operator);
    }
    
    return false;
  }
  
  /**
   * Evaluate a simple expression (simplified implementation)
   * @param expression - Expression string
   * @param item - Item context
   * @returns Evaluation result
   */
  private evaluateExpression(expression: string, item: any): any {
    // This is a very simplified implementation
    // In a real system, you would use a proper expression evaluator
    
    // Replace field references with actual values
    return expression.replace(/\$\{([^}]+)\}/g, (match, fieldPath) => {
      const value = this.getNestedValue(item, fieldPath);
      return JSON.stringify(value);
    });
  }
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (config.input === undefined) {
      errors.push('input is required');
    }
    
    if (!config.transformations) {
      errors.push('transformations is required');
    } else if (!Array.isArray(config.transformations)) {
      errors.push('transformations must be an array');
    } else if (config.transformations.length === 0) {
      warnings.push('no transformations specified');
    } else {
      // Validate each transformation
      config.transformations.forEach((transformation: any, index: number) => {
        if (!transformation.type) {
          errors.push(`transformation[${index}] is missing type`);
        } else if (!['filter', 'map', 'sort', 'group', 'aggregate', 'merge', 'extract', 'custom'].includes(transformation.type)) {
          errors.push(`transformation[${index}] has invalid type: ${transformation.type}`);
        }
        
        if (!transformation.config || typeof transformation.config !== 'object') {
          errors.push(`transformation[${index}] is missing or invalid config`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
