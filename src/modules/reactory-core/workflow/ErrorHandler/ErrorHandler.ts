import logger from '../../../../logging';

export enum ErrorCategory {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  RESOURCE = 'resource',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface IErrorContext {
  workflowId: string;
  version: string;
  scheduleId?: string;
  attempt: number;
  maxAttempts: number;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError: Error;
  metadata?: Record<string, any>;
}

export interface IRetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export interface ICircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // in milliseconds
  halfOpenMaxAttempts: number;
}

export interface ITimeoutConfig {
  defaultTimeout: number; // in milliseconds
  maxTimeout: number; // in milliseconds
  timeoutMultiplier: number;
}

export interface IWorkflowErrorStats {
  errorType: string;
  count: number;
  lastOccurrence: Date;
  workflowName?: string;
  message?: string;
  stack?: string;
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private config: ICircuitBreakerConfig;

  constructor(config: ICircuitBreakerConfig) {
    this.config = config;
  }

  public async execute<T>(
    operation: () => Promise<T>,
    context: IErrorContext
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker transitioning to HALF_OPEN for ${context.workflowId}`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${context.workflowId}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  public getState(): string {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }
}

export class ErrorHandler {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorStats: Map<string, IWorkflowErrorStats> = new Map();    

  constructor(
    private retryConfig: IRetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
    },
    private circuitBreakerConfig: ICircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      halfOpenMaxAttempts: 3,
    },
    private timeoutConfig: ITimeoutConfig = {
      defaultTimeout: 30000,
      maxTimeout: 300000,
      timeoutMultiplier: 1.5,
    }
  ) {}

  /**
   * Execute operation with retry logic and circuit breaker
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: IErrorContext
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(context.workflowId);
    let lastError: Error;

    for (let attempt = 1; attempt <= context.maxAttempts; attempt++) {
      try {
        const timeout = this.calculateTimeout(attempt);
        return await circuitBreaker.execute(
          () => this.executeWithTimeout(operation, timeout),
          { ...context, attempt }
        );
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === context.maxAttempts) {
          await this.handleError(lastError, { ...context, attempt });
          throw lastError;
        }

        // Wait before retry
        const delay = this.calculateDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle error with categorization and logging
   */
  private async handleError(error: Error, context: IErrorContext): Promise<void> {
    const categorizedError = this.categorizeError(error);
    const severity = this.determineSeverity(categorizedError, context);
    this.updateErrorStats(context.workflowId, categorizedError, error);
    this.logError(error, context, categorizedError, severity);
    await this.implementGracefulDegradation(context, categorizedError, severity);
  }

  /**
   * Categorize error based on error type and message
   */
  private categorizeError(error: Error): ErrorCategory {
    if (!error || !error.message) {
      return ErrorCategory.UNKNOWN;
    }

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('timeout') || name.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }

    if (message.includes('network') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorCategory.PERMISSION;
    }

    if (message.includes('resource') || message.includes('memory')) {
      return ErrorCategory.RESOURCE;
    }

    if (message.includes('system') || name.includes('system')) {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity based on context and error type
   */
  private determineSeverity(
    category: ErrorCategory,
    context: IErrorContext
  ): ErrorSeverity {
    // Critical errors for system-level issues
    if (category === ErrorCategory.SYSTEM) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for resource and permission issues
    if (category === ErrorCategory.RESOURCE || category === ErrorCategory.PERMISSION) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for network and timeout issues
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.TIMEOUT) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity for validation issues
    if (category === ErrorCategory.VALIDATION) {
      return ErrorSeverity.LOW;
    }

    // Default to medium for unknown errors
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Calculate exponential backoff delay with optional jitter
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );

    if (this.retryConfig.jitter) {
      const jitter = Math.random() * delay * 0.1; // 10% jitter
      return delay + jitter;
    }

    return delay;
  }

  /**
   * Calculate timeout based on attempt number
   */
  private calculateTimeout(attempt: number): number {
    return Math.min(
      this.timeoutConfig.defaultTimeout * Math.pow(this.timeoutConfig.timeoutMultiplier, attempt - 1),
      this.timeoutConfig.maxTimeout
    );
  }

  /**
   * Get or create circuit breaker for workflow
   */
  private getCircuitBreaker(workflowId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(workflowId)) {
      this.circuitBreakers.set(workflowId, new CircuitBreaker(this.circuitBreakerConfig));
    }
    return this.circuitBreakers.get(workflowId)!;
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(workflowId: string, category: ErrorCategory, error: Error): void {
    const stats = this.errorStats.get(workflowId) || { 
      count: 0, 
      lastOccurrence: new Date(),
      errorType: category,
      workflowName: workflowId,
      message: error.message,
      stack: error.stack
    };
    stats.count++;
    stats.lastOccurrence = new Date();
    this.errorStats.set(workflowId, stats);
  }

  /**
   * Log error with comprehensive context
   */
  private logError(
    error: Error,
    context: IErrorContext,
    category: ErrorCategory,
    severity: ErrorSeverity
  ): void {
    const logData = {
      workflowId: context.workflowId,
      version: context.version,
      scheduleId: context.scheduleId,
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
      category,
      severity,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: context.timestamp.toISOString(),
      metadata: context.metadata,
    };

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical workflow error', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity workflow error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity workflow error', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity workflow error', logData);
        break;
    }
  }

  /**
   * Implement graceful degradation based on error type
   */
  private async implementGracefulDegradation(
    context: IErrorContext,
    category: ErrorCategory,
    severity: ErrorSeverity
  ): Promise<void> {
    // For critical errors, implement immediate fallback
    if (severity === ErrorSeverity.CRITICAL) {
      logger.error(`Implementing critical error fallback for ${context.workflowId}`);
      // Could implement fallback workflows or emergency procedures
    }

    // For resource errors, implement resource cleanup
    if (category === ErrorCategory.RESOURCE) {
      logger.warn(`Implementing resource cleanup for ${context.workflowId}`);
      // Could implement memory cleanup, connection pool management, etc.
    }

    // For network errors, implement connection retry
    if (category === ErrorCategory.NETWORK) {
      logger.info(`Implementing network error handling for ${context.workflowId}`);
      // Could implement connection retry logic
    }
  }

  /**
   * Get error statistics for a workflow
   */
  public getErrorStats(workflowId: string): IWorkflowErrorStats | undefined {
    return this.errorStats.get(workflowId);
  }

  /**
   * Get circuit breaker state for a workflow
   */
  public getCircuitBreakerState(workflowId: string): string | undefined {
    const circuitBreaker = this.circuitBreakers.get(workflowId);
    return circuitBreaker?.getState();
  }

  /**
   * Reset circuit breaker for a workflow
   */
  public resetCircuitBreaker(workflowId: string): void {
    this.circuitBreakers.delete(workflowId);
    logger.info(`Reset circuit breaker for ${workflowId}`);
  }

  /**
   * Get all error statistics
   */
  public getAllErrorStats(): Map<string, IWorkflowErrorStats> {
    return new Map(this.errorStats);
  }

  /**
   * Clear error statistics
   */
  public clearErrorStats(): void {
    this.errorStats.clear();
    logger.info('Cleared all error statistics');
  }
} 