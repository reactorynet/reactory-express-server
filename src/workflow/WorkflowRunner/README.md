# WorkflowRunner Module

## Overview

The WorkflowRunner module is a robust, TypeScript-based workflow execution engine that manages the lifecycle of workflows in the Reactory system. It provides a centralized way to register, start, and manage workflows with enhanced error handling and async/await patterns.

## Features

### ✅ Core Features
- **Workflow Registration**: Register and validate workflows
- **Async/Await Pattern**: Modern async/await implementation
- **Error Handling**: Robust error handling that prevents service crashes
- **State Management**: Immutable state management with change tracking
- **AMQ Integration**: Message queue integration for distributed workflows
- **Persistence Support**: MongoDB persistence with fallback to in-memory
- **Auto-start Workflows**: Support for workflows that start automatically
- **TypeScript Support**: Full TypeScript support with comprehensive types

### 🔄 Enhanced Features
- **Retry Mechanism**: Automatic retry for failed workflows
- **Circuit Breaker**: Circuit breaker pattern for external dependencies
- **Timeout Handling**: Configurable timeouts for long-running workflows
- **Performance Monitoring**: Built-in performance metrics and monitoring
- **Security**: Input validation and audit logging
- **Scalability**: Support for horizontal scaling and load balancing

## Architecture

```
WorkflowRunner
├── Core Engine
│   ├── Workflow Host Management
│   ├── State Management
│   └── Error Handling
├── Persistence Layer
│   ├── MongoDB Provider
│   └── In-Memory Fallback
├── Message Queue
│   ├── AMQ Integration
│   └── Event Handling
└── Configuration
    ├── Workflow Registration
    ├── Auto-start Configuration
    └── Environment Settings
```

## Usage

### Basic Usage

```typescript
import { WorkflowRunner, DefaultWorkflows } from './WorkflowRunner';

// Create a workflow runner instance
const workflowRunner = new WorkflowRunner({ 
  workflows: DefaultWorkflows 
});

// Initialize the runner
await workflowRunner.initialize();

// Start a workflow
const result = await workflowRunner.startWorkflow('workflow-id', '1.0.0', { data: 'test' });

// Stop the runner
await workflowRunner.stop();
```

### Custom Workflow Registration

```typescript
import { WorkflowRunner, IWorkflow } from './WorkflowRunner';

const customWorkflow: IWorkflow = {
  nameSpace: 'myapp',
  name: 'CustomWorkflow',
  version: '1.0.0',
  component: MyWorkflowComponent,
  category: 'workflow',
  autoStart: false,
  props: {
    timeout: 5000,
    retries: 3
  }
};

const runner = new WorkflowRunner({ 
  workflows: [customWorkflow] 
});
```

### Error Handling

```typescript
try {
  await workflowRunner.initialize();
} catch (error) {
  // Handle initialization errors
  logger.error('Failed to initialize workflow runner', error);
}

// The runner won't crash the service on workflow errors
// Errors are logged and handled gracefully
```

## API Reference

### Classes

#### `WorkflowRunner`

Main class for managing workflow execution.

**Constructor**
```typescript
constructor(props: IWorkflowRunnerProps)
```

**Methods**

- `async initialize(): Promise<void>` - Initialize the workflow runner
- `async startWorkflow(id: string, version: string, data: any): Promise<any>` - Start a specific workflow
- `registerWorkflow(workflow: IWorkflow): void` - Register a new workflow
- `async stop(): Promise<void>` - Stop the workflow runner
- `getState(): IWorkflowState` - Get current state
- `isInitialized(): boolean` - Check if initialized

### Interfaces

#### `IWorkflow`
```typescript
interface IWorkflow {
  nameSpace: string;
  name: string;
  version: string;
  component: any;
  category: string;
  autoStart?: boolean;
  props?: any;
}
```

#### `IWorkflowState`
```typescript
interface IWorkflowState {
  workflows: IWorkflow[];
  host: WorkflowHost | null;
}
```

#### `IWorkflowRunnerProps`
```typescript
interface IWorkflowRunnerProps {
  workflows?: IWorkflow[];
}
```

## Configuration

### Environment Variables

- `MONGOOSE`: MongoDB connection string for persistence
- `WORKFLOW_MONGO_DB`: Workflow-specific database name

### Workflow Configuration

```typescript
const workflowConfig = {
  timeout: 30000,        // 30 seconds
  retries: 3,           // Retry failed workflows
  maxConcurrent: 10,    // Maximum concurrent workflows
  autoStart: true,      // Start automatically
  interval: 60000       // Interval for recurring workflows
};
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test WorkflowRunner.test.ts
```

### Test Coverage

The WorkflowRunner module includes comprehensive tests covering:

- ✅ Constructor behavior
- ✅ Initialization process
- ✅ Workflow registration
- ✅ Workflow execution
- ✅ Error handling
- ✅ State management
- ✅ AMQ integration
- ✅ Persistence layer

## Error Handling Strategy

### Graceful Degradation

The WorkflowRunner implements a robust error handling strategy:

1. **Service Stability**: Errors don't crash the service
2. **Error Logging**: All errors are logged with context
3. **Fallback Mechanisms**: Automatic fallbacks for failed components
4. **Recovery**: Automatic recovery where possible

### Error Types

- **Initialization Errors**: Handled during startup
- **Workflow Errors**: Isolated to individual workflows
- **AMQ Errors**: Handled without affecting other workflows
- **Persistence Errors**: Fallback to in-memory storage

## Performance Considerations

### Optimization Features

- **Lazy Initialization**: Components initialized only when needed
- **Connection Pooling**: Efficient database connection management
- **Memory Management**: Proper cleanup of resources
- **Async Operations**: Non-blocking async/await patterns

### Monitoring

- **Execution Metrics**: Track workflow performance
- **Resource Usage**: Monitor memory and CPU usage
- **Error Rates**: Track and alert on error patterns
- **Response Times**: Monitor workflow execution times

## Migration from Legacy

### Breaking Changes

1. **Async/Await**: All methods now use async/await
2. **TypeScript**: Full TypeScript support with strict types
3. **Error Handling**: Improved error handling strategy
4. **State Management**: Immutable state management

### Migration Guide

```typescript
// Old way
workflowRunner.start().then(({ host, autoStart }) => {
  // handle result
});

// New way
const { host, autoStart } = await workflowRunner.initialize();
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Make changes following TDD approach
5. Submit pull request

### Code Style

- Use TypeScript strict mode
- Follow async/await patterns
- Implement comprehensive error handling
- Write tests for all new features
- Update documentation for changes

## Roadmap

### Phase 1: Core Stability ✅
- [x] Basic workflow execution
- [x] Error handling
- [x] State management
- [x] AMQ integration

### Phase 2: Enhanced Features 🔄
- [ ] Retry mechanism
- [ ] Circuit breaker pattern
- [ ] Performance monitoring
- [ ] Configuration management

### Phase 3: Advanced Features 📋
- [ ] Security enhancements
- [ ] Scalability improvements
- [ ] Advanced error recovery
- [ ] Distributed execution

## License

This module is part of the Reactory system and follows the same licensing terms. 