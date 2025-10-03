# Enhanced Error Handling

## Overview

The WorkflowRunner now includes comprehensive error handling capabilities with retry mechanisms, circuit breaker patterns, timeout handling, and error categorization. This ensures robust workflow execution even in challenging environments.

## Features

### ✅ Implemented Features

1. **Retry Mechanism with Exponential Backoff**
   - Configurable retry attempts
   - Exponential backoff with jitter
   - Maximum delay limits
   - Per-workflow retry tracking

2. **Circuit Breaker Pattern**
   - Three states: CLOSED, OPEN, HALF_OPEN
   - Configurable failure thresholds
   - Automatic recovery timeouts
   - Per-workflow circuit breakers

3. **Timeout Handling**
   - Configurable timeouts per attempt
   - Exponential timeout increases
   - Maximum timeout limits
   - Automatic timeout detection

4. **Error Categorization**
   - Network errors
   - Timeout errors
   - Validation errors
   - Permission errors
   - Resource errors
   - System errors

5. **Error Severity Levels**
   - Critical: System-level issues
   - High: Resource and permission issues
   - Medium: Network and timeout issues
   - Low: Validation issues

6. **Graceful Degradation**
   - Automatic fallback mechanisms
   - Resource cleanup
   - Connection retry logic
   - Service stability maintenance

## Architecture

```
ErrorHandler
├── CircuitBreaker
│   ├── State Management (CLOSED/OPEN/HALF_OPEN)
│   ├── Failure Tracking
│   └── Recovery Logic
├── Retry Logic
│   ├── Exponential Backoff
│   ├── Jitter Addition
│   └── Attempt Tracking
├── Timeout Management
│   ├── Per-Attempt Timeouts
│   ├── Exponential Increases
│   └── Maximum Limits
└── Error Processing
    ├── Categorization
    ├── Severity Assessment
    ├── Statistics Tracking
    └── Graceful Degradation
```

## Configuration

### Default Configuration

```typescript
const defaultRetryConfig: IRetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,        // 1 second
  maxDelay: 30000,        // 30 seconds
  backoffMultiplier: 2,   // Double each attempt
  jitter: true,           // Add random jitter
};

const defaultCircuitBreakerConfig: ICircuitBreakerConfig = {
  failureThreshold: 5,    // Open after 5 failures
  recoveryTimeout: 60000, // 1 minute recovery
  halfOpenMaxAttempts: 3, // Allow 3 attempts in half-open
};

const defaultTimeoutConfig: ITimeoutConfig = {
  defaultTimeout: 30000,  // 30 seconds
  maxTimeout: 300000,     // 5 minutes
  timeoutMultiplier: 1.5, // Increase by 50% each attempt
};
```

### Custom Configuration

```typescript
import { ErrorHandler } from './ErrorHandler';

const customErrorHandler = new ErrorHandler(
  {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitter: false,
  },
  {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    halfOpenMaxAttempts: 2,
  },
  {
    defaultTimeout: 60000,
    maxTimeout: 600000,
    timeoutMultiplier: 2,
  }
);
```

## Usage

### Basic Usage

```typescript
import { WorkflowRunner } from './WorkflowRunner';

const workflowRunner = new WorkflowRunner({ workflows: DefaultWorkflows });
await workflowRunner.initialize();

// Enhanced error handling is automatically applied
const result = await workflowRunner.startWorkflow('workflow.id', '1.0.0', data);
```

### Error Statistics

```typescript
// Get error statistics for a specific workflow
const stats = workflowRunner.getErrorStats('workflow.id');
console.log({
  errorCount: stats?.count,
  lastError: stats?.lastError,
});

// Get all error statistics
const allStats = workflowRunner.getAllErrorStats();
console.log('Total workflows with errors:', allStats.size);

// Clear error statistics
workflowRunner.clearErrorStats();
```

### Circuit Breaker Management

```typescript
// Get circuit breaker state
const state = workflowRunner.getCircuitBreakerState('workflow.id');
console.log('Circuit breaker state:', state); // 'CLOSED', 'OPEN', 'HALF_OPEN'

// Reset circuit breaker
workflowRunner.resetCircuitBreaker('workflow.id');
```

## Error Categories

### Network Errors
- **Detection**: Error messages containing "network", "connection"
- **Severity**: Medium
- **Handling**: Retry with exponential backoff
- **Example**: `Network connection failed`

### Timeout Errors
- **Detection**: Error messages containing "timeout"
- **Severity**: Medium
- **Handling**: Increase timeout for next attempt
- **Example**: `Operation timed out after 30000ms`

### Validation Errors
- **Detection**: Error messages containing "validation", "invalid"
- **Severity**: Low
- **Handling**: Log and continue
- **Example**: `Invalid input validation failed`

### Permission Errors
- **Detection**: Error messages containing "permission", "unauthorized"
- **Severity**: High
- **Handling**: Immediate failure, no retry
- **Example**: `Permission denied for workflow execution`

### Resource Errors
- **Detection**: Error messages containing "resource", "memory"
- **Severity**: High
- **Handling**: Resource cleanup and retry
- **Example**: `Memory allocation failed`

### System Errors
- **Detection**: Error messages containing "system"
- **Severity**: Critical
- **Handling**: Immediate fallback, no retry
- **Example**: `System configuration error`

## Retry Logic

### Exponential Backoff

The retry mechanism uses exponential backoff with the following formula:

```
delay = min(baseDelay * (backoffMultiplier ^ (attempt - 1)), maxDelay)
```

**Example with default settings:**
- Attempt 1: 1000ms
- Attempt 2: 2000ms
- Attempt 3: 4000ms
- Attempt 4: 8000ms
- Attempt 5: 16000ms
- Attempt 6: 30000ms (capped at maxDelay)

### Jitter

When jitter is enabled, a random value is added to prevent thundering herd:

```
jitter = random() * delay * 0.1  // 10% jitter
finalDelay = delay + jitter
```

## Circuit Breaker States

### CLOSED State
- **Description**: Normal operation
- **Behavior**: All operations are allowed
- **Transition**: Opens after failure threshold is reached

### OPEN State
- **Description**: Circuit is open, operations are blocked
- **Behavior**: All operations fail immediately
- **Transition**: Transitions to HALF_OPEN after recovery timeout

### HALF_OPEN State
- **Description**: Testing if service has recovered
- **Behavior**: Limited operations are allowed
- **Transition**: 
  - Success: Transitions to CLOSED
  - Failure: Transitions back to OPEN

## Timeout Management

### Per-Attempt Timeouts

Timeouts increase with each retry attempt:

```
timeout = min(defaultTimeout * (timeoutMultiplier ^ (attempt - 1)), maxTimeout)
```

**Example with default settings:**
- Attempt 1: 30000ms
- Attempt 2: 45000ms
- Attempt 3: 67500ms
- Attempt 4: 101250ms
- Attempt 5: 151875ms
- Attempt 6: 300000ms (capped at maxTimeout)

## Error Logging

### Comprehensive Logging

All errors are logged with detailed context:

```typescript
{
  workflowId: "workflow.id",
  version: "1.0.0",
  scheduleId: "daily-cleanup",
  attempt: 2,
  maxAttempts: 3,
  category: "network",
  severity: "medium",
  error: {
    name: "NetworkError",
    message: "Connection failed",
    stack: "Error stack trace..."
  },
  timestamp: "2024-01-01T12:00:00.000Z",
  metadata: {
    data: "workflow data..."
  }
}
```

### Severity-Based Logging

- **Critical**: `logger.error()` - System-level issues
- **High**: `logger.error()` - Resource and permission issues
- **Medium**: `logger.warn()` - Network and timeout issues
- **Low**: `logger.info()` - Validation issues

## Graceful Degradation

### Critical Errors
- Immediate fallback workflows
- Emergency procedures
- System alerts

### Resource Errors
- Memory cleanup
- Connection pool management
- Resource allocation retry

### Network Errors
- Connection retry logic
- Alternative endpoints
- Network timeout adjustments

## Monitoring and Alerting

### Error Statistics

Track error patterns and trends:

```typescript
const stats = workflowRunner.getAllErrorStats();
for (const [workflowId, errorStats] of stats) {
  console.log(`${workflowId}: ${errorStats.count} errors, last: ${errorStats.lastError}`);
}
```

### Circuit Breaker Monitoring

Monitor circuit breaker states:

```typescript
const workflows = ['workflow1', 'workflow2', 'workflow3'];
for (const workflowId of workflows) {
  const state = workflowRunner.getCircuitBreakerState(workflowId);
  if (state === 'OPEN') {
    console.warn(`Circuit breaker OPEN for ${workflowId}`);
  }
}
```

### Health Checks

```typescript
function isWorkflowHealthy(workflowId: string): boolean {
  const stats = workflowRunner.getErrorStats(workflowId);
  const circuitState = workflowRunner.getCircuitBreakerState(workflowId);
  
  return !stats || stats.count < 5; // Healthy if < 5 errors
}
```

## Best Practices

### Configuration

1. **Set Appropriate Timeouts**
   - Base timeout on workflow complexity
   - Consider external service dependencies
   - Account for network latency

2. **Configure Retry Attempts**
   - 3-5 attempts for most workflows
   - More attempts for critical workflows
   - Fewer attempts for validation errors

3. **Adjust Circuit Breaker Settings**
   - Lower threshold for critical services
   - Higher threshold for stable services
   - Monitor and adjust based on patterns

### Error Handling

1. **Categorize Errors Properly**
   - Use descriptive error messages
   - Include relevant context
   - Distinguish between transient and permanent errors

2. **Monitor Error Patterns**
   - Track error frequencies
   - Identify problematic workflows
   - Adjust configurations based on data

3. **Implement Fallbacks**
   - Design fallback workflows
   - Plan for service degradation
   - Test error scenarios

### Performance

1. **Optimize Timeouts**
   - Start with conservative timeouts
   - Adjust based on actual performance
   - Consider service level agreements

2. **Monitor Resource Usage**
   - Track memory usage during retries
   - Monitor circuit breaker overhead
   - Optimize based on usage patterns

3. **Scale Gracefully**
   - Implement horizontal scaling
   - Use load balancing
   - Monitor system capacity

## Troubleshooting

### Common Issues

1. **Workflows Stuck in Retry Loop**
   - Check error categorization
   - Verify timeout settings
   - Review circuit breaker configuration

2. **Circuit Breakers Always Open**
   - Check failure threshold settings
   - Verify recovery timeout
   - Monitor underlying service health

3. **High Error Rates**
   - Review error categorization
   - Check external service health
   - Verify workflow configurations

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
// Set log level to debug
process.env.LOG_LEVEL = 'debug';

// Monitor specific workflow
const stats = workflowRunner.getErrorStats('problematic-workflow');
console.log('Error stats:', stats);
```

## Migration Guide

### From Basic Error Handling

**Before:**
```typescript
try {
  await workflowRunner.startWorkflow(id, version, data);
} catch (error) {
  logger.error('Workflow failed', error);
  throw error;
}
```

**After:**
```typescript
// Enhanced error handling is automatic
const result = await workflowRunner.startWorkflow(id, version, data);
```

### Configuration Migration

**Before:**
```typescript
// No retry configuration
```

**After:**
```typescript
const workflowRunner = new WorkflowRunner({
  workflows: DefaultWorkflows,
  // Enhanced error handling is built-in
});
```

## Future Enhancements

### Planned Features

1. **Advanced Circuit Breaker**
   - Sliding window counters
   - Success rate thresholds
   - Custom state transitions

2. **Distributed Error Handling**
   - Cross-service error tracking
   - Distributed circuit breakers
   - Global error statistics

3. **Machine Learning Integration**
   - Predictive error detection
   - Dynamic timeout adjustment
   - Intelligent retry strategies

4. **Advanced Monitoring**
   - Real-time error dashboards
   - Predictive alerting
   - Performance analytics

## API Reference

### ErrorHandler

```typescript
class ErrorHandler {
  constructor(
    retryConfig?: IRetryConfig,
    circuitBreakerConfig?: ICircuitBreakerConfig,
    timeoutConfig?: ITimeoutConfig
  );

  executeWithRetry<T>(
    operation: () => Promise<T>,
    context: IErrorContext
  ): Promise<T>;

  getErrorStats(workflowId: string): { count: number; lastError: Date } | undefined;
  getCircuitBreakerState(workflowId: string): string | undefined;
  resetCircuitBreaker(workflowId: string): void;
  getAllErrorStats(): Map<string, { count: number; lastError: Date }>;
  clearErrorStats(): void;
}
```

### CircuitBreaker

```typescript
class CircuitBreaker {
  constructor(config: ICircuitBreakerConfig);

  execute<T>(
    operation: () => Promise<T>,
    context: IErrorContext
  ): Promise<T>;

  getState(): string;
  getFailureCount(): number;
}
```

### Interfaces

```typescript
interface IErrorContext {
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

interface IRetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface ICircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxAttempts: number;
}

interface ITimeoutConfig {
  defaultTimeout: number;
  maxTimeout: number;
  timeoutMultiplier: number;
}
```

## License

This enhanced error handling is part of the Reactory system and follows the same licensing terms. 