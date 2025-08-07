# Security Enhancements

## Overview

The Security Enhancements system provides comprehensive security capabilities for workflow execution, including permission management, audit logging, input validation, rate limiting, and security event monitoring. It ensures secure workflow execution while maintaining detailed audit trails and preventing security threats.

## Features

### Core Security Features
- **Permission Management**: Role-based and user-based access control
- **Audit Logging**: Comprehensive audit trail for all security events
- **Input Validation**: XSS protection and suspicious pattern detection
- **Rate Limiting**: Prevent abuse through request throttling
- **Security Event Monitoring**: Real-time security event detection and response

### Advanced Security Features
- **User Management**: Add, remove, and manage users and roles
- **Workflow Permissions**: Granular permissions per workflow
- **Session Management**: Secure session handling with timeouts
- **Security Statistics**: Comprehensive security metrics and reporting
- **Event Resolution**: Security event tracking and resolution

## Architecture

### Security Components

```
SecurityManager
├── PermissionManager
│   ├── UserManager
│   ├── RoleManager
│   └── WorkflowPermissionManager
├── AuditLogger
│   ├── EventCollector
│   ├── LogFormatter
│   └── RetentionManager
├── InputValidator
│   ├── XSSProtector
│   ├── SchemaValidator
│   └── PatternDetector
├── RateLimiter
│   ├── TokenBucket
│   ├── SlidingWindow
│   └── IPBasedLimiter
└── SecurityMonitor
    ├── EventDetector
    ├── AlertManager
    └── StatisticsCollector
```

### Security Data Models

```typescript
interface IUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  active: boolean;
  lastLogin?: Date;
}

interface IWorkflowPermission {
  workflowId: string;
  version: string;
  permissions: string[];
  allowedUsers: string[];
  allowedRoles: string[];
  requireAuth: boolean;
  ipWhitelist?: string[];
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

interface IAuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  sessionId?: string;
}

interface ISecurityEvent {
  id: string;
  timestamp: Date;
  type: 'permission_denied' | 'rate_limit_exceeded' | 'suspicious_activity' | 'authentication_failure' | 'authorization_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  username?: string;
  ipAddress?: string;
  details: Record<string, any>;
  resolved: boolean;
  resolution?: string;
}
```

## Usage

### Basic Security Setup

```typescript
import { SecurityManager } from './SecurityManager';

const securityManager = new SecurityManager({
  auditLogEnabled: true,
  auditLogRetention: 90, // days
  securityEventsEnabled: true,
  rateLimitingEnabled: true,
  inputValidationEnabled: true,
  encryptionEnabled: false,
  allowedOrigins: ['*'],
  maxRequestSize: 1024 * 1024, // 1MB
  sessionTimeout: 30 * 60 * 1000 // 30 minutes
});

await securityManager.initialize();
```

### Permission Checking

```typescript
// Check if user can execute workflow
const hasPermission = await securityManager.checkWorkflowPermission(
  'user123',
  'data-processing',
  '1.0.0',
  'execute'
);

if (hasPermission) {
  // Execute workflow
  await workflowRunner.startWorkflow('data-processing', '1.0.0', data);
} else {
  // Handle permission denied
  throw new Error('Insufficient permissions');
}
```

### Input Validation

```typescript
// Validate and sanitize input data
const validation = securityManager.validateInput(data, schema);

if (validation.isValid) {
  // Use sanitized data
  const sanitizedData = validation.sanitizedData || data;
  await processWorkflow(sanitizedData);
} else {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Rate Limiting

```typescript
// Check rate limit for user
const rateLimitInfo = securityManager.checkRateLimit('user123', 10, 60000);

if (rateLimitInfo.current <= rateLimitInfo.limit) {
  // Process request
  await processRequest();
} else {
  // Rate limit exceeded
  throw new Error('Rate limit exceeded');
}
```

### Audit Logging

```typescript
// Log security event
await securityManager.logAuditEvent(
  'user123',
  'workflow_start',
  'workflow',
  'data-processing@1.0.0',
  {
    result: 'success',
    duration: 1500,
    recordsProcessed: 1000
  },
  '192.168.1.100',
  'Mozilla/5.0'
);
```

### Security Event Monitoring

```typescript
// Create security event
securityManager.createSecurityEvent(
  'permission_denied',
  'medium',
  {
    userId: 'user123',
    workflowId: 'sensitive-workflow',
    reason: 'insufficient_permissions',
    ipAddress: '192.168.1.100'
  },
  'user123'
);

// Get unresolved security events
const unresolvedEvents = securityManager.getSecurityEvents({ resolved: false });

// Resolve security event
securityManager.resolveSecurityEvent(
  'event-id-123',
  'User permissions updated'
);
```

## Security Configuration

### User Management

```typescript
// Add user
const newUser: IUser = {
  id: 'newuser',
  username: 'newuser',
  email: 'newuser@example.com',
  roles: ['user'],
  permissions: ['workflow.execute'],
  active: true
};

securityManager.addUser(newUser);

// Remove user
securityManager.removeUser('inactive-user');
```

### Workflow Permission Management

```typescript
// Add workflow permission
const permission: IWorkflowPermission = {
  workflowId: 'sensitive-workflow',
  version: '1.0.0',
  permissions: ['workflow.execute', 'data.access'],
  allowedUsers: ['admin', 'data-engineer'],
  allowedRoles: ['admin', 'engineer'],
  requireAuth: true,
  rateLimit: {
    requests: 10,
    window: 60000 // 1 minute
  }
};

securityManager.addWorkflowPermission(permission);

// Remove workflow permission
securityManager.removeWorkflowPermission('workflow-id', '1.0.0');
```

## Security Patterns

### Permission-Based Access Control

```typescript
// Check multiple permission levels
const checkWorkflowAccess = async (userId: string, workflowId: string, version: string) => {
  // Check basic execution permission
  const canExecute = await securityManager.checkWorkflowPermission(
    userId, workflowId, version, 'execute'
  );

  if (!canExecute) {
    return { allowed: false, reason: 'insufficient_permissions' };
  }

  // Check specific permissions
  const user = securityManager.getUser(userId);
  const hasDataAccess = user.permissions.includes('data.access');
  const hasAdminAccess = user.roles.includes('admin');

  return {
    allowed: true,
    canAccessData: hasDataAccess,
    isAdmin: hasAdminAccess
  };
};
```

### Input Validation with Schema

```typescript
const validateWorkflowInput = (data: any) => {
  const schema = {
    type: 'object',
    required: ['source', 'destination'],
    properties: {
      source: {
        type: 'string',
        pattern: '^[a-zA-Z0-9._-]+$'
      },
      destination: {
        type: 'string',
        pattern: '^[a-zA-Z0-9._-]+$'
      },
      options: {
        type: 'object',
        properties: {
          timeout: {
            type: 'number',
            minimum: 1000,
            maximum: 300000
          }
        }
      }
    }
  };

  return securityManager.validateInput(data, schema);
};
```

### Rate Limiting Strategy

```typescript
const applyRateLimiting = (userId: string, action: string) => {
  // Different limits for different actions
  const limits = {
    'workflow.execute': { requests: 10, window: 60000 },
    'workflow.create': { requests: 5, window: 300000 },
    'data.access': { requests: 100, window: 60000 }
  };

  const limit = limits[action] || { requests: 10, window: 60000 };
  return securityManager.checkRateLimit(userId, limit.requests, limit.window);
};
```

### Comprehensive Audit Trail

```typescript
const auditWorkflowExecution = async (
  userId: string,
  workflowId: string,
  version: string,
  data: any,
  result: any
) => {
  // Log workflow start
  await securityManager.logAuditEvent(
    userId,
    'workflow_start',
    'workflow',
    `${workflowId}@${version}`,
    {
      inputSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    }
  );

  // Log workflow completion
  await securityManager.logAuditEvent(
    userId,
    'workflow_complete',
    'workflow',
    `${workflowId}@${version}`,
    {
      success: result.success,
      duration: result.duration,
      recordsProcessed: result.recordsProcessed
    }
  );
};
```

## Security Monitoring

### Real-Time Security Events

```typescript
// Monitor security events
securityManager.on('securityEvent', (event) => {
  console.log('Security event detected:', event);
  
  if (event.severity === 'critical') {
    // Immediate response for critical events
    sendAlert('Critical security event detected', event);
  }
  
  if (event.type === 'rate_limit_exceeded') {
    // Handle rate limiting violations
    handleRateLimitViolation(event);
  }
});

// Monitor audit events
securityManager.on('auditEvent', (event) => {
  console.log('Audit event:', event);
  
  if (!event.success) {
    // Handle failed operations
    handleFailedOperation(event);
  }
});
```

### Security Statistics

```typescript
const getSecurityOverview = () => {
  const stats = securityManager.getSecurityStats();
  
  return {
    totalUsers: stats.totalUsers,
    activeUsers: stats.activeUsers,
    totalPermissions: stats.totalWorkflowPermissions,
    auditLogEntries: stats.auditLogEntries,
    securityEvents: stats.securityEvents,
    unresolvedEvents: stats.unresolvedSecurityEvents,
    securityScore: calculateSecurityScore(stats)
  };
};
```

## Best Practices

### Security Configuration

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Role-Based Access**: Use roles for permission management
3. **Regular Audits**: Review permissions and access logs regularly
4. **Session Management**: Implement proper session timeouts

### Input Validation

1. **Always Validate**: Validate all input data
2. **Sanitize Input**: Sanitize data to prevent XSS
3. **Schema Validation**: Use schemas for structured validation
4. **Pattern Detection**: Monitor for suspicious patterns

### Rate Limiting

1. **Appropriate Limits**: Set reasonable rate limits
2. **User-Based Limits**: Implement per-user rate limiting
3. **IP-Based Limits**: Consider IP-based rate limiting
4. **Gradual Escalation**: Escalate limits gradually

### Audit Logging

1. **Comprehensive Logging**: Log all security-relevant events
2. **Structured Logs**: Use structured logging format
3. **Retention Policy**: Implement log retention policies
4. **Secure Storage**: Store logs securely

### Security Monitoring

1. **Real-Time Monitoring**: Monitor security events in real-time
2. **Alert Thresholds**: Set appropriate alert thresholds
3. **Incident Response**: Have incident response procedures
4. **Regular Reviews**: Regularly review security metrics

## Troubleshooting

### Common Security Issues

1. **Permission Denied**: Check user permissions and roles
2. **Rate Limit Exceeded**: Review rate limiting configuration
3. **Input Validation Errors**: Check input data format
4. **Security Event Flood**: Review event generation logic

### Debugging Security Issues

```typescript
// Check user permissions
const user = securityManager.getUser('user123');
console.log('User permissions:', user.permissions);
console.log('User roles:', user.roles);

// Check workflow permissions
const workflowPerms = securityManager.getWorkflowPermissions('workflow-id');
console.log('Workflow permissions:', workflowPerms);

// Check rate limit status
const rateLimit = securityManager.checkRateLimit('user123', 10, 60000);
console.log('Rate limit status:', rateLimit);

// Get recent audit logs
const recentLogs = securityManager.getAuditLogs({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
});
console.log('Recent audit logs:', recentLogs);
```

## API Reference

### SecurityManager

#### Constructor
```typescript
new SecurityManager(config: ISecurityManagerConfig)
```

#### Methods

- `initialize(): Promise<void>` - Initialize the security manager
- `checkWorkflowPermission(userId: string, workflowId: string, version: string, action?: string): Promise<boolean>`
- `validateInput(data: any, schema?: Record<string, any>): IInputValidationResult`
- `checkRateLimit(identifier: string, limit: number, window: number): IRateLimitInfo`
- `logAuditEvent(userId: string | undefined, action: string, resource: string, resourceId: string, details: Record<string, any>, ipAddress?: string, userAgent?: string): Promise<void>`
- `createSecurityEvent(type: ISecurityEvent['type'], severity: ISecurityEvent['severity'], details: Record<string, any>, userId?: string): void`
- `addUser(user: IUser): void`
- `removeUser(userId: string): void`
- `addWorkflowPermission(permission: IWorkflowPermission): void`
- `removeWorkflowPermission(workflowId: string, version: string): void`
- `getAuditLogs(filter?: IAuditLogFilter): IAuditLogEntry[]`
- `getSecurityEvents(filter?: ISecurityEventFilter): ISecurityEvent[]`
- `resolveSecurityEvent(eventId: string, resolution: string): void`
- `getSecurityStats(): ISecurityStats`
- `stop(): Promise<void>`
- `isInitialized(): boolean`

### Events

- `auditEvent` - Emitted for audit log entries
- `securityEvent` - Emitted for security events
- `permissionDenied` - Emitted when permission is denied
- `rateLimitExceeded` - Emitted when rate limit is exceeded

## Migration Guide

### From Basic Authentication

1. **User Migration**: Migrate existing users to new user model
2. **Permission Mapping**: Map existing permissions to new system
3. **Role Assignment**: Assign appropriate roles to users
4. **Testing**: Test permission checking and validation

### From Static Security

1. **Dynamic Permissions**: Convert static permissions to dynamic
2. **Audit Implementation**: Implement comprehensive audit logging
3. **Rate Limiting**: Add rate limiting for API endpoints
4. **Monitoring**: Add security event monitoring

## Future Enhancements

1. **Multi-Factor Authentication**: Support for MFA
2. **OAuth Integration**: Integrate with OAuth providers
3. **Encryption**: Encrypt sensitive data at rest and in transit
4. **Advanced Threat Detection**: Machine learning-based threat detection
5. **Compliance Reporting**: Generate compliance reports
6. **Security Automation**: Automated security response actions 