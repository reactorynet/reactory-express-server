# Configuration Management

## Overview

The Configuration Management system provides dynamic workflow configuration capabilities with validation, hot-reload, and environment-specific configurations. It enables runtime configuration changes without service restarts and ensures configuration integrity through comprehensive validation.

## Features

### Core Features
- **Dynamic Configuration Loading**: Load configurations from JSON and YAML files
- **Environment-Specific Configs**: Support for different environments (development, staging, production, test)
- **Hot Reload**: Automatic configuration updates when files change
- **Configuration Validation**: Comprehensive validation with custom schemas
- **Backup and Restore**: Automatic backup creation before configuration changes
- **Export/Import**: Export configurations in JSON or YAML format
- **Statistics and Monitoring**: Track configuration usage and statistics

### Advanced Features
- **File Size Limits**: Prevent oversized configuration files
- **Change Events**: Event-driven configuration change notifications
- **Dependency Validation**: Validate workflow dependencies
- **Security Integration**: Integrate with security configurations
- **Audit Trail**: Track configuration changes with user attribution

## Architecture

### Components

```
ConfigurationManager
├── ConfigLoader
│   ├── FileSystemLoader
│   ├── YAMLLoader
│   └── JSONLoader
├── ConfigValidator
│   ├── SchemaValidator
│   ├── DependencyValidator
│   └── SecurityValidator
├── ConfigStorage
│   ├── InMemoryStorage
│   ├── FileBackup
│   └── ChangeTracker
└── ConfigEvents
    ├── ChangeEmitter
    ├── HotReload
    └── StatisticsCollector
```

### Configuration Schema

```typescript
interface IWorkflowConfig {
  id: string;                    // Unique workflow identifier
  version: string;               // Semantic version
  nameSpace?: string;            // Namespace for organization
  enabled: boolean;              // Whether workflow is enabled
  maxRetries: number;            // Maximum retry attempts (0-10)
  timeout: number;               // Execution timeout in milliseconds
  priority: 'low' | 'normal' | 'high' | 'critical';
  concurrency: number;           // Concurrent execution limit (1-100)
  dependencies?: string[];       // Required workflow dependencies
  properties?: Record<string, any>; // Custom properties
  security?: {                   // Security configuration
    permissions: string[];
    allowedUsers: string[];
    allowedRoles: string[];
    requireAuth: boolean;
  };
  monitoring?: {                 // Monitoring configuration
    enabled: boolean;
    metrics: string[];
    alerts: string[];
  };
  validation?: {                 // Input/output validation
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    customValidators?: string[];
  };
}
```

## Usage

### Basic Configuration

```typescript
import { ConfigurationManager } from './ConfigurationManager';

const configManager = new ConfigurationManager({
  configPath: './config/workflows',
  environment: 'development',
  hotReload: true,
  validationStrict: true,
  backupConfigs: true,
  maxConfigSize: 1024 * 1024, // 1MB
  allowedEnvironments: ['development', 'staging', 'production', 'test']
});

await configManager.initialize();
```

### Adding Configuration

```typescript
const workflowConfig = {
  id: 'data-processing',
  version: '1.0.0',
  enabled: true,
  maxRetries: 3,
  timeout: 30000,
  priority: 'normal',
  concurrency: 5,
  properties: {
    environment: 'production',
    dataSource: 'database'
  },
  security: {
    permissions: ['workflow.execute'],
    allowedUsers: ['admin', 'data-engineer'],
    allowedRoles: ['admin', 'engineer'],
    requireAuth: true
  }
};

await configManager.addConfiguration(workflowConfig, 'admin');
```

### Updating Configuration

```typescript
const updates = {
  enabled: false,
  maxRetries: 5,
  properties: {
    environment: 'staging'
  }
};

await configManager.updateConfiguration(
  'data-processing',
  '1.0.0',
  updates,
  'admin'
);
```

### Retrieving Configuration

```typescript
// Get specific configuration
const config = configManager.getConfiguration('data-processing', '1.0.0');

// Get all configurations
const allConfigs = configManager.getAllConfigurations();

// Get configurations by environment
const prodConfigs = configManager.getConfigurationsByEnvironment('production');
```

### Validation

```typescript
const validation = configManager.validateConfiguration(workflowConfig);
if (validation.isValid) {
  console.log('Configuration is valid');
} else {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Export/Import

```typescript
// Export as JSON
const jsonExport = configManager.exportConfigurations('json');

// Export as YAML
const yamlExport = configManager.exportConfigurations('yaml');

// Reload configurations
await configManager.reloadConfigurations();
```

## Configuration Files

### JSON Configuration

```json
{
  "id": "email-notification",
  "version": "1.0.0",
  "enabled": true,
  "maxRetries": 3,
  "timeout": 60000,
  "priority": "high",
  "concurrency": 10,
  "properties": {
    "environment": "production",
    "emailProvider": "smtp",
    "templatePath": "/templates/email"
  },
  "security": {
    "permissions": ["workflow.execute", "email.send"],
    "allowedUsers": ["admin", "notifications"],
    "allowedRoles": ["admin", "operator"],
    "requireAuth": true
  },
  "monitoring": {
    "enabled": true,
    "metrics": ["execution_time", "success_rate", "error_count"],
    "alerts": ["high_error_rate", "timeout_exceeded"]
  }
}
```

### YAML Configuration

```yaml
id: "data-sync"
version: "1.0.0"
enabled: true
maxRetries: 5
timeout: 120000
priority: "critical"
concurrency: 3
properties:
  environment: "production"
  dataSource: "external-api"
  syncInterval: 3600
security:
  permissions:
    - "workflow.execute"
    - "data.access"
  allowedUsers:
    - "admin"
    - "data-sync"
  allowedRoles:
    - "admin"
    - "data-engineer"
  requireAuth: true
monitoring:
  enabled: true
  metrics:
    - "sync_duration"
    - "records_processed"
    - "error_rate"
  alerts:
    - "sync_failed"
    - "high_latency"
validation:
  inputSchema:
    type: "object"
    required: ["source", "destination"]
    properties:
      source:
        type: "string"
      destination:
        type: "string"
  outputSchema:
    type: "object"
    properties:
      recordsProcessed:
        type: "number"
      success:
        type: "boolean"
```

## Event Handling

### Configuration Change Events

```typescript
configManager.on('configurationChanged', (event) => {
  console.log('Configuration changed:', event);
  // event: {
  //   workflowId: string,
  //   version: string,
  //   changes: { added: string[], modified: string[], removed: string[] },
  //   timestamp: Date,
  //   user?: string
  // }
});

configManager.on('configurationAdded', (event) => {
  console.log('Configuration added:', event);
});

configManager.on('configurationRemoved', (event) => {
  console.log('Configuration removed:', event);
});
```

## Statistics and Monitoring

### Configuration Statistics

```typescript
const stats = configManager.getConfigurationStats();
console.log('Total configs:', stats.totalConfigs);
console.log('Enabled configs:', stats.enabledConfigs);
console.log('Disabled configs:', stats.disabledConfigs);
console.log('Environments:', stats.environments);
console.log('Priorities:', stats.priorities);
```

## Best Practices

### Configuration Organization

1. **Use Semantic Versioning**: Always version your configurations
2. **Environment Separation**: Keep different environments separate
3. **Namespace Usage**: Use namespaces for organization
4. **Documentation**: Include comments in configuration files

### Security Considerations

1. **Permission Validation**: Always validate permissions
2. **Input Sanitization**: Sanitize configuration inputs
3. **Access Control**: Implement proper access controls
4. **Audit Logging**: Log all configuration changes

### Performance Optimization

1. **File Size Limits**: Set appropriate file size limits
2. **Caching**: Cache frequently accessed configurations
3. **Lazy Loading**: Load configurations on demand
4. **Cleanup**: Regularly clean up old configurations

### Error Handling

1. **Validation Errors**: Handle validation errors gracefully
2. **File System Errors**: Handle file system errors
3. **Network Errors**: Handle network-related errors
4. **Recovery**: Implement recovery mechanisms

## Troubleshooting

### Common Issues

1. **Invalid Environment**: Ensure environment is in allowed list
2. **File Size Exceeded**: Check file size limits
3. **Validation Errors**: Review configuration schema
4. **Hot Reload Issues**: Check file permissions

### Debugging

```typescript
// Enable debug logging
configManager.on('debug', (message) => {
  console.log('Debug:', message);
});

// Check configuration status
console.log('Initialized:', configManager.isInitialized());
console.log('Stats:', configManager.getConfigurationStats());
```

## API Reference

### ConfigurationManager

#### Constructor
```typescript
new ConfigurationManager(config: IConfigurationManagerConfig)
```

#### Methods

- `initialize(): Promise<void>` - Initialize the configuration manager
- `loadConfigurations(): Promise<void>` - Load all configurations
- `getConfiguration(workflowId: string, version: string): IWorkflowConfig | undefined`
- `getAllConfigurations(): Map<string, IWorkflowConfig>`
- `getConfigurationsByEnvironment(environment: string): IWorkflowConfig[]`
- `addConfiguration(config: IWorkflowConfig, user?: string): Promise<void>`
- `updateConfiguration(workflowId: string, version: string, config: Partial<IWorkflowConfig>, user?: string): Promise<void>`
- `removeConfiguration(workflowId: string, version: string, user?: string): Promise<void>`
- `validateConfiguration(config: IWorkflowConfig): IConfigurationValidationResult`
- `reloadConfigurations(): Promise<void>`
- `exportConfigurations(format: 'json' | 'yaml'): string`
- `getConfigurationStats(): IConfigurationStats`
- `stop(): Promise<void>`
- `isInitialized(): boolean`

### Events

- `configurationChanged` - Emitted when configuration changes
- `configurationAdded` - Emitted when configuration is added
- `configurationRemoved` - Emitted when configuration is removed
- `debug` - Emitted for debug information

## Migration Guide

### From Static Configuration

1. **Convert Static Configs**: Convert static configurations to dynamic format
2. **Add Validation**: Add validation schemas to configurations
3. **Implement Hot Reload**: Enable hot reload for dynamic updates
4. **Add Monitoring**: Add monitoring and statistics collection

### From Other Configuration Systems

1. **Schema Mapping**: Map existing schemas to new format
2. **Environment Migration**: Migrate environment-specific configs
3. **Security Integration**: Integrate with security systems
4. **Testing**: Test configuration loading and validation

## Future Enhancements

1. **Database Storage**: Support for database-backed configurations
2. **Distributed Configuration**: Support for distributed configuration management
3. **Configuration Templates**: Template-based configuration generation
4. **Advanced Validation**: Support for custom validation rules
5. **Configuration Encryption**: Encrypt sensitive configuration data
6. **Configuration Versioning**: Advanced versioning and rollback capabilities 