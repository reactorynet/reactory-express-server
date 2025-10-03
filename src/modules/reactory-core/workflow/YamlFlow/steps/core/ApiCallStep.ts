/**
 * ApiCallStep - Makes HTTP API calls
 * Supports various HTTP methods, headers, authentication, and response processing
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Configuration interface for ApiCallStep
 */
export interface ApiCallStepConfig {
  /** URL to call */
  url: string;
  
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body (for POST/PUT/PATCH) */
  body?: any;
  
  /** Query parameters */
  params?: Record<string, string>;
  
  /** Authentication configuration */
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    headerName?: string;
  };
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Whether to follow redirects */
  followRedirects?: boolean;
  
  /** Response processing */
  response?: {
    /** Expected status codes (default: 200-299) */
    expectedStatus?: number[];
    
    /** How to parse response body */
    bodyType?: 'json' | 'text' | 'buffer';
    
    /** Extract specific fields from response */
    extract?: string[];
  };
  
  /** Retry configuration */
  retry?: {
    /** Maximum number of retries */
    maxRetries?: number;
    
    /** Delay between retries in milliseconds */
    delay?: number;
    
    /** Status codes that should trigger a retry */
    retryOnStatus?: number[];
  };
  
  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for making HTTP API calls
 */
export class ApiCallStep extends BaseYamlStep {
  public readonly stepType = 'apiCall';
  
  /**
   * Execute the API call step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as ApiCallStepConfig;
    
    // Resolve template variables
    const resolvedConfig = this.resolveConfigTemplates(config, context);
    
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = resolvedConfig.retry?.maxRetries || 0;
    
    while (attempt <= maxRetries) {
      try {
        context.logger.debug(`Making API call (attempt ${attempt + 1}): ${resolvedConfig.method || 'GET'} ${resolvedConfig.url}`);
        
        const response = await this.makeHttpRequest(resolvedConfig, context);
        const duration = Date.now() - startTime;
        
        // Check if status code is expected
        const expectedStatus = resolvedConfig.response?.expectedStatus || this.getDefaultExpectedStatus();
        if (!expectedStatus.includes(response.status)) {
          throw new Error(`Unexpected status code: ${response.status}. Expected: ${expectedStatus.join(', ')}`);
        }
        
        // Process response
        const processedResponse = await this.processResponse(response, resolvedConfig);
        
        context.logger.info(`API call completed successfully: ${response.status} in ${duration}ms`);
        
        return {
          success: true,
          outputs: {
            response: processedResponse,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            url: resolvedConfig.url,
            method: resolvedConfig.method || 'GET'
          },
          metadata: {
            duration,
            attempts: attempt + 1,
            statusCode: response.status,
            responseSize: processedResponse.body ? JSON.stringify(processedResponse.body).length : 0
          }
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.warn(`API call attempt ${attempt + 1} failed: ${errorMessage}`);
        
        // Check if we should retry
        if (attempt < maxRetries && this.shouldRetry(error, resolvedConfig)) {
          attempt++;
          const delay = resolvedConfig.retry?.delay || 1000;
          context.logger.info(`Retrying API call in ${delay}ms...`);
          await this.delay(delay);
          continue;
        }
        
        // All retries exhausted or error not retryable
        const duration = Date.now() - startTime;
        context.logger.error(`API call failed after ${attempt + 1} attempts: ${errorMessage}`);
        
        return {
          success: false,
          error: errorMessage,
          outputs: {
            url: resolvedConfig.url,
            method: resolvedConfig.method || 'GET',
            attempts: attempt + 1
          },
          metadata: {
            duration,
            attempts: attempt + 1,
            finalError: errorMessage
          }
        };
      }
    }
    
    // This should never be reached
    throw new Error('Unexpected error in API call execution');
  }
  
  /**
   * Make the actual HTTP request
   * @param config - Resolved configuration
   * @param context - Execution context
   * @returns Response object
   */
  private async makeHttpRequest(config: ApiCallStepConfig, context: StepExecutionContext): Promise<Response> {
    const url = new URL(config.url);
    
    // Add query parameters
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        url.searchParams.append(key, value);
      }
    }
    
    // Prepare headers
    const headers = new Headers();
    
    // Add default headers
    headers.set('User-Agent', 'Reactory-Workflow/1.0');
    
    // Add custom headers
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        headers.set(key, value);
      }
    }
    
    // Add authentication headers
    if (config.auth) {
      this.addAuthHeaders(headers, config.auth);
    }
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method: config.method || 'GET',
      headers,
    };
    
    // Add body for methods that support it
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method || 'GET')) {
      if (typeof config.body === 'string') {
        requestOptions.body = config.body;
      } else {
        requestOptions.body = JSON.stringify(config.body);
        headers.set('Content-Type', 'application/json');
      }
    }
    
    // Set timeout
    if (config.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), config.timeout);
      requestOptions.signal = controller.signal;
    }
    
    // Make the request
    return await fetch(url.toString(), requestOptions);
  }
  
  /**
   * Add authentication headers
   * @param headers - Headers object
   * @param auth - Auth configuration
   */
  private addAuthHeaders(headers: Headers, auth: ApiCallStepConfig['auth']): void {
    if (!auth) return;
    
    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headers.set('Authorization', `Bearer ${auth.token}`);
        }
        break;
      
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = btoa(`${auth.username}:${auth.password}`);
          headers.set('Authorization', `Basic ${credentials}`);
        }
        break;
      
      case 'api-key':
        if (auth.apiKey) {
          const headerName = auth.headerName || 'X-API-Key';
          headers.set(headerName, auth.apiKey);
        }
        break;
    }
  }
  
  /**
   * Process the HTTP response
   * @param response - Raw response
   * @param config - Configuration
   * @returns Processed response
   */
  private async processResponse(response: Response, config: ApiCallStepConfig): Promise<any> {
    const result: any = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
    
    // Parse body based on configuration
    const bodyType = config.response?.bodyType || 'json';
    
    try {
      switch (bodyType) {
        case 'json':
          result.body = await response.json();
          break;
        
        case 'text':
          result.body = await response.text();
          break;
        
        case 'buffer':
          result.body = await response.arrayBuffer();
          break;
        
        default:
          result.body = await response.text();
      }
    } catch (error) {
      // If parsing fails, store as text
      result.body = await response.text();
      result.parseError = error instanceof Error ? error.message : String(error);
    }
    
    // Extract specific fields if requested
    if (config.response?.extract && result.body && typeof result.body === 'object') {
      const extracted: Record<string, any> = {};
      for (const field of config.response.extract) {
        extracted[field] = this.getNestedValue(result.body, field);
      }
      result.extracted = extracted;
    }
    
    return result;
  }
  
  /**
   * Check if error should trigger a retry
   * @param error - Error that occurred
   * @param config - Configuration
   * @returns Whether to retry
   */
  private shouldRetry(error: any, config: ApiCallStepConfig): boolean {
    // Don't retry if no retry config
    if (!config.retry) return false;
    
    // Check for network errors (usually worth retrying)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    // Check for timeout errors
    if (error.name === 'AbortError') {
      return true;
    }
    
    // Check for specific status codes
    if (config.retry.retryOnStatus && error.message.includes('status code:')) {
      const statusMatch = error.message.match(/status code: (\d+)/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1]);
        return config.retry.retryOnStatus.includes(status);
      }
    }
    
    return false;
  }
  
  /**
   * Get default expected status codes
   * @returns Array of expected status codes
   */
  private getDefaultExpectedStatus(): number[] {
    return [200, 201, 202, 203, 204, 205, 206, 207, 208, 226];
  }
  
  /**
   * Resolve template variables in configuration
   * @param config - Configuration to resolve
   * @param context - Execution context
   * @returns Resolved configuration
   */
  private resolveConfigTemplates(config: ApiCallStepConfig, context: StepExecutionContext): ApiCallStepConfig {
    const resolved: ApiCallStepConfig = { ...config };
    
    // Resolve URL
    resolved.url = this.resolveTemplate(config.url, context);
    
    // Resolve headers
    if (config.headers) {
      resolved.headers = {};
      for (const [key, value] of Object.entries(config.headers)) {
        resolved.headers[key] = this.resolveTemplate(value, context);
      }
    }
    
    // Resolve query parameters
    if (config.params) {
      resolved.params = {};
      for (const [key, value] of Object.entries(config.params)) {
        resolved.params[key] = this.resolveTemplate(value, context);
      }
    }
    
    // Resolve auth values
    if (config.auth) {
      resolved.auth = { ...config.auth };
      if (config.auth.token) {
        resolved.auth.token = this.resolveTemplate(config.auth.token, context);
      }
      if (config.auth.username) {
        resolved.auth.username = this.resolveTemplate(config.auth.username, context);
      }
      if (config.auth.password) {
        resolved.auth.password = this.resolveTemplate(config.auth.password, context);
      }
      if (config.auth.apiKey) {
        resolved.auth.apiKey = this.resolveTemplate(config.auth.apiKey, context);
      }
    }
    
    // Resolve body if it's a string
    if (typeof config.body === 'string') {
      resolved.body = this.resolveTemplate(config.body, context);
    }
    
    return resolved;
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
   * Delay execution
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    if (!config.url || typeof config.url !== 'string') {
      errors.push('url is required and must be a string');
    } else {
      // Basic URL validation
      try {
        new URL(config.url);
      } catch {
        errors.push('url must be a valid URL');
      }
    }
    
    // Method validation
    if (config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(config.method)) {
      errors.push('method must be one of: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS');
    }
    
    // Headers validation
    if (config.headers && typeof config.headers !== 'object') {
      errors.push('headers must be an object');
    }
    
    // Auth validation
    if (config.auth) {
      if (typeof config.auth !== 'object') {
        errors.push('auth must be an object');
      } else {
        if (!config.auth.type || !['bearer', 'basic', 'api-key'].includes(config.auth.type)) {
          errors.push('auth.type must be one of: bearer, basic, api-key');
        }
        
        switch (config.auth.type) {
          case 'bearer':
            if (!config.auth.token) {
              errors.push('auth.token is required for bearer authentication');
            }
            break;
          
          case 'basic':
            if (!config.auth.username || !config.auth.password) {
              errors.push('auth.username and auth.password are required for basic authentication');
            }
            break;
          
          case 'api-key':
            if (!config.auth.apiKey) {
              errors.push('auth.apiKey is required for api-key authentication');
            }
            break;
        }
      }
    }
    
    // Timeout validation
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('timeout must be a positive number');
    }
    
    // Retry validation
    if (config.retry) {
      if (typeof config.retry !== 'object') {
        errors.push('retry must be an object');
      } else {
        if (config.retry.maxRetries && (typeof config.retry.maxRetries !== 'number' || config.retry.maxRetries < 0)) {
          errors.push('retry.maxRetries must be a non-negative number');
        }
        
        if (config.retry.delay && (typeof config.retry.delay !== 'number' || config.retry.delay < 0)) {
          errors.push('retry.delay must be a non-negative number');
        }
        
        if (config.retry.retryOnStatus && !Array.isArray(config.retry.retryOnStatus)) {
          errors.push('retry.retryOnStatus must be an array');
        }
      }
    }
    
    // Response validation
    if (config.response) {
      if (typeof config.response !== 'object') {
        errors.push('response must be an object');
      } else {
        if (config.response.bodyType && !['json', 'text', 'buffer'].includes(config.response.bodyType)) {
          errors.push('response.bodyType must be one of: json, text, buffer');
        }
        
        if (config.response.expectedStatus && !Array.isArray(config.response.expectedStatus)) {
          errors.push('response.expectedStatus must be an array');
        }
        
        if (config.response.extract && !Array.isArray(config.response.extract)) {
          errors.push('response.extract must be an array');
        }
      }
    }
    
    // Warnings
    if (config.timeout && config.timeout > 30000) {
      warnings.push('timeout is very long (>30s), this may cause workflow delays');
    }
    
    if (config.retry?.maxRetries && config.retry.maxRetries > 5) {
      warnings.push('maxRetries is very high (>5), this may cause long execution times');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
