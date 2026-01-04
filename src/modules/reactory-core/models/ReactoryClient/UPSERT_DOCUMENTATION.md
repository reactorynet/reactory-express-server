# ReactoryClient Configuration Upsert Documentation

## Overview

This document describes the comprehensive upsert process for ReactoryClient configurations, which includes proper route synchronization, error handling, logging, and telemetry integration.

## Key Features

### 1. Route Synchronization

The new implementation includes a dedicated `synchronizeRoutes` function that:

- **Compares existing routes with configuration routes** using deep equality checks
- **Identifies changes**: Added, Updated, Removed, and Unchanged routes
- **Preserves route keys** for consistent identification
- **Provides detailed results** with counts and error tracking
- **Logs all operations** at appropriate levels (info, debug, error)

#### Route Comparison Logic

```typescript
// Routes are compared by their 'key' property (falls back to 'path' if no key)
const routeKey = configRoute.key || configRoute.path;

// Deep equality check (excluding metadata fields like _id)
const hasChanges = !isEqual(
  { ...existingRoute, _id: undefined, id: undefined },
  { ...configRoute, _id: undefined, id: undefined }
);
```

#### Route Sync Results

```typescript
interface RouteSyncResult {
  added: number;       // New routes from config
  updated: number;     // Routes with changes
  removed: number;     // Routes no longer in config
  unchanged: number;   // Routes that are identical
  errors: Array<{      // Any errors during sync
    routeKey: string;
    error: any;
  }>;
}
```

### 2. Telemetry Integration

The system now tracks comprehensive metrics for monitoring and debugging:

#### Metrics Tracked

| Metric Name | Type | Description |
|------------|------|-------------|
| `client_config_upsert_total` | Counter | Total client configuration upserts |
| `client_config_upsert_duration_seconds` | Histogram | Duration of upsert operations |
| `client_config_upsert_errors_total` | Counter | Total upsert errors |
| `client_route_sync_total` | Counter | Total route synchronizations |
| `client_route_sync_duration_seconds` | Histogram | Duration of route sync operations |
| `client_route_sync_errors_total` | Counter | Route synchronization errors |
| `client_menu_sync_total` | Counter | Menu synchronization operations |
| `client_menu_sync_errors_total` | Counter | Menu synchronization errors |
| `client_component_install_total` | Counter | Component installations |
| `client_component_install_duration_seconds` | Histogram | Component install duration |
| `client_user_creation_total` | Counter | Users created during config |
| `client_user_creation_errors_total` | Counter | User creation errors |

#### Metric Attributes

Each metric includes contextual attributes for filtering and analysis:

```typescript
// Example: Route sync counter attributes
{
  clientKey: "reactory",
  added: "3",
  updated: "5",
  removed: "1",
  hasErrors: "false"
}

// Example: Error counter attributes
{
  clientKey: "reactory",
  operation: "update",
  errorType: "validation_failed"
}
```

### 3. Enhanced Error Handling

#### Graceful Degradation

The system implements non-blocking error handling:

```typescript
// Route errors don't stop the entire upsert
try {
  await synchronizeRoutes(clientDocument, routes, telemetry);
} catch (routeError) {
  logger.error("Failed to synchronize routes", routeError);
  // Continue with other operations
}
```

#### Error Tracking

Errors are collected and reported at multiple levels:

1. **Individual Route Errors**: Captured in `RouteSyncResult.errors`
2. **Component Errors**: Tracked during component installation
3. **User Creation Errors**: Logged with user email context
4. **Client Configuration Errors**: Reported in `clientsFailed` result

#### Error Types Tracked

- `validation_failed`: Schema validation errors
- `update_failed`: Database update errors
- `creation_failed`: New document creation errors
- `processing_error`: Individual item processing errors
- `sync_failed`: Synchronization operation failures
- `general_failure`: Uncategorized errors
- `missing_fields`: Required field validation

### 4. Comprehensive Logging

#### Log Levels

- **INFO**: Major operations (starting upsert, completion, counts)
- **DEBUG**: Detailed operations (individual route updates, field changes)
- **WARN**: Non-critical issues (validation warnings, skipped items)
- **ERROR**: Critical failures (operation failures, exceptions)

#### Log Context

All logs include relevant context:

```typescript
logger.info(
  `Route synchronization complete for ${clientDocument.name}: ` +
  `${result.added} added, ${result.updated} updated, ` +
  `${result.removed} removed, ${result.unchanged} unchanged, ` +
  `${result.errors.length} errors`,
  { duration }
);
```

### 5. Performance Tracking

All major operations track duration:

```typescript
const startTime = Date.now();
// ... perform operation ...
const duration = (Date.now() - startTime) / 1000;

logger.info(`Operation completed in ${duration.toFixed(2)}s`);
telemetry.operationDuration.record(duration, { context });
```

## Usage

### Basic Upsert

```typescript
import ReactoryClientModel from './models/ReactoryClient';

// With telemetry context
const clientDocument = await ReactoryClientModel.upsertFromConfig(
  clientConfig,
  context  // Reactory context with telemetry
);

// Without telemetry (still works)
const clientDocument = await ReactoryClientModel.upsertFromConfig(
  clientConfig
);
```

### Startup Process

```typescript
// Called during server startup
const result = await ReactoryClientModel.onStartup(context);

console.log(`${result.clientsLoaded.length} clients configured`);
console.log(`${result.clientsFailed.length} clients failed`);
```

## Configuration Structure

### Client Config with Routes

```typescript
const clientConfig = {
  key: 'my-client',
  name: 'My Client',
  routes: [
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: true,
      exact: true,
      roles: ['ANON', 'USER'],
      componentFqn: 'core.Home@1.0.0',
      componentProps: {
        // props for component
      },
      args: [
        {
          key: 'theme',
          value: { type: 'string', theme: 'light' }
        }
      ]
    },
    // ... more routes
  ],
  menus: [
    // menu definitions
  ],
  components: [
    // component definitions
  ],
  users: [
    // user definitions
  ]
};
```

## Monitoring and Debugging

### Viewing Telemetry Metrics

If your Reactory instance is configured with Prometheus/OpenTelemetry:

```bash
# View all client config metrics
curl http://localhost:9090/metrics | grep client_

# View route sync metrics
curl http://localhost:9090/metrics | grep route_sync

# View error metrics
curl http://localhost:9090/metrics | grep _errors_total
```

### Debugging Route Issues

To debug route synchronization issues:

1. **Check logs** for route-specific entries:
   ```
   grep "Route.*has changes" server.log
   grep "Adding new route" server.log
   grep "Route.*removed" server.log
   ```

2. **Examine telemetry** for error patterns:
   ```
   client_route_sync_errors_total{clientKey="my-client"}
   ```

3. **Review sync results** in the log output:
   ```
   Route synchronization complete: 3 added, 5 updated, 1 removed, 20 unchanged
   ```

## Migration Guide

### From Old Implementation

The old implementation did not handle routes at all. To migrate:

1. **Add routes to your client configs**:
   ```typescript
   // In clientConfigs/my-client/index.ts
   import routes from './routes';
   
   export default {
     // ... other config
     routes: routes,  // Add this line
   };
   ```

2. **Restart the server** - routes will be synchronized automatically

3. **Verify synchronization** by checking logs:
   ```
   grep "Route synchronization complete" server.log
   ```

### Updating Existing Routes

Simply modify your route configuration files and restart:

```typescript
// clientConfigs/my-client/routes/index.ts
export default [
  {
    key: 'home',
    path: '/',
    // ... update any fields
    componentFqn: 'core.NewHome@2.0.0',  // Updated component
  }
];
```

On next startup:
- Changed routes will be detected and updated
- New routes will be added
- Removed routes will be deleted
- Unchanged routes will be preserved

## Best Practices

### 1. Always Use Route Keys

```typescript
// Good - explicit key
{
  key: 'user-profile',
  path: '/profile/:userId',
  // ...
}

// Acceptable - path used as key
{
  path: '/about',
  // ...
}
```

### 2. Test Configuration Changes

Before deploying configuration changes:

1. Validate your config structure
2. Check for duplicate route keys
3. Ensure all referenced components exist
4. Test in development environment first

### 3. Monitor Telemetry

Set up alerts for:
- High error rates: `client_config_upsert_errors_total`
- Long durations: `client_config_upsert_duration_seconds > 5`
- Route sync failures: `client_route_sync_errors_total > 0`

### 4. Review Logs After Updates

After deploying config changes:

```bash
# Check for errors
grep "ERROR" server.log | grep -i "client\|route"

# Check sync results
grep "Route synchronization complete" server.log

# Check overall results
grep "Client startup process completed" server.log
```

## Troubleshooting

### Routes Not Updating

**Symptom**: Routes remain unchanged after config update

**Causes**:
1. Configuration not properly exported
2. Server not restarted
3. Validation errors preventing save

**Solution**:
```bash
# Check if routes are in the config
grep -A 5 "routes:" clientConfigs/*/index.ts

# Check for validation errors
grep "Validation.*error" server.log

# Verify upsert was called
grep "comprehensive upsert" server.log
```

### High Error Rates

**Symptom**: Many errors in telemetry/logs

**Investigation**:
```bash
# Find error types
grep "errorType" server.log | sort | uniq -c

# Check specific client
grep "clientKey=\"problematic-client\"" server.log

# Review validation errors
grep "validation.*error" server.log -A 10
```

### Performance Issues

**Symptom**: Slow startup or upsert operations

**Investigation**:
```typescript
// Check operation durations in logs
grep "duration_seconds" server.log

// Review component counts
grep "Installing.*components" server.log

// Check database performance
// (use MongoDB profiling or logs)
```

## Future Enhancements

Potential improvements for future versions:

1. **Incremental Updates**: Only process changed clients
2. **Parallel Processing**: Upsert multiple clients concurrently
3. **Rollback Support**: Revert to previous configuration on failure
4. **Dry-Run Mode**: Preview changes without applying them
5. **Configuration Versioning**: Track config history
6. **Route Validation**: Verify component FQNs exist before sync

## Related Documentation

- [ReactoryClient Schema](./schema.ts)
- [ReactoryClient Methods](./methods.ts)
- [Telemetry System](../../../../modules/reactory-telemetry/README.md)
- [Client Configuration Guide](../../../../data/clientConfigs/README.md)

