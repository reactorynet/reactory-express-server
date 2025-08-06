# WorkflowScheduler Documentation

## Overview

The WorkflowScheduler provides cron-like scheduling capabilities for workflows in the Reactory system. It allows you to define schedules in YAML files and automatically execute workflows at specified intervals.

## Features

### ✅ Core Features
- **Cron Expression Support**: Full cron expression support for flexible scheduling
- **YAML Configuration**: Easy-to-read YAML files for schedule definitions
- **Timezone Support**: Configurable timezone for each schedule
- **Retry Logic**: Automatic retry with configurable attempts and delays
- **Concurrency Control**: Limit concurrent executions per schedule
- **Error Handling**: Robust error handling and logging
- **Statistics**: Comprehensive statistics and monitoring
- **Hot Reload**: Reload schedules without restarting the service

### 🔄 Advanced Features
- **Timeout Management**: Configurable timeouts for long-running workflows
- **Property Injection**: Pass custom properties to scheduled workflows
- **Execution Tracking**: Track run counts, errors, and execution times
- **Graceful Shutdown**: Proper cleanup on service shutdown

## Configuration

### Schedule Directory

By default, schedules are loaded from:
```
{APP_DATA_ROOT}/workflows/*-schedule.yaml
```

You can configure the directory using the `APP_DATA_ROOT` environment variable.

### YAML Configuration Format

Each schedule file should follow this structure:

```yaml
id: "unique-schedule-id"
name: "Human Readable Name"
description: "Optional description of what this schedule does"
workflow:
  id: "workflow.namespace.WorkflowName"
  version: "1.0.0"
  namespace: "optional-namespace"
schedule:
  cron: "0 2 * * *"  # Cron expression
  timezone: "UTC"     # Optional, defaults to UTC
  enabled: true       # Optional, defaults to true
properties:
  # Custom properties passed to the workflow
  customProperty: "value"
  anotherProperty: 123
retry:
  attempts: 3         # Number of retry attempts
  delay: 300          # Delay between retries in seconds
timeout: 3600         # Timeout in seconds (optional)
maxConcurrent: 1      # Maximum concurrent executions (optional)
```

### Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 2 * * *` | Daily at 2 AM UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1-5` | Weekdays at 9 AM UTC |
| `0 0 1 * *` | First day of each month |
| `*/15 * * * *` | Every 15 minutes |
| `0 12 * * 0` | Sundays at noon UTC |

## Usage

### Basic Usage

```typescript
import { WorkflowRunner, WorkflowScheduler } from './WorkflowRunner';

// Create workflow runner
const workflowRunner = new WorkflowRunner({ workflows: DefaultWorkflows });
await workflowRunner.initialize();

// Access the scheduler
const scheduler = workflowRunner.getScheduler();
if (scheduler) {
  // Get statistics
  const stats = scheduler.getStats();
  console.log(`Active schedules: ${stats.activeSchedules}`);
  
  // Reload schedules
  await scheduler.reloadSchedules();
}
```

### API Reference

#### WorkflowScheduler

**Constructor**
```typescript
constructor(workflowRunner: WorkflowRunner)
```

**Methods**

- `async initialize(): Promise<void>` - Initialize the scheduler
- `async startSchedule(scheduleId: string): Promise<void>` - Start a specific schedule
- `async stopSchedule(scheduleId: string): Promise<void>` - Stop a specific schedule
- `async reloadSchedules(): Promise<void>` - Reload all schedules from files
- `async stop(): Promise<void>` - Stop the scheduler
- `getStats(): ISchedulerStats` - Get scheduler statistics
- `getSchedules(): Map<string, IScheduledWorkflow>` - Get all schedules
- `getSchedule(scheduleId: string): IScheduledWorkflow | undefined` - Get specific schedule
- `isInitialized(): boolean` - Check if initialized

#### Interfaces

**IScheduleConfig**
```typescript
interface IScheduleConfig {
  id: string;
  name: string;
  description?: string;
  workflow: {
    id: string;
    version: string;
    namespace?: string;
  };
  schedule: {
    cron: string;
    timezone?: string;
    enabled?: boolean;
  };
  properties?: Record<string, any>;
  retry?: {
    attempts: number;
    delay: number;
  };
  timeout?: number;
  maxConcurrent?: number;
}
```

**IScheduledWorkflow**
```typescript
interface IScheduledWorkflow {
  config: IScheduleConfig;
  task: any;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  isRunning: boolean;
}
```

**ISchedulerStats**
```typescript
interface ISchedulerStats {
  totalSchedules: number;
  activeSchedules: number;
  totalRuns: number;
  totalErrors: number;
  lastRun?: Date;
}
```

## Examples

### Daily Cleanup Schedule

```yaml
# daily-cleanup-schedule.yaml
id: "daily-cleanup"
name: "Daily Cleanup Workflow"
description: "Runs daily cleanup tasks at 2 AM UTC"
workflow:
  id: "reactory.CleanupWorkflow"
  version: "1.0.0"
  namespace: "reactory"
schedule:
  cron: "0 2 * * *"
  timezone: "UTC"
  enabled: true
properties:
  cleanupType: "daily"
  retentionDays: 30
  dryRun: false
retry:
  attempts: 3
  delay: 300
timeout: 3600
maxConcurrent: 1
```

### Hourly Monitoring Schedule

```yaml
# hourly-monitoring-schedule.yaml
id: "hourly-monitoring"
name: "Hourly System Monitoring"
description: "Runs system health checks every hour"
workflow:
  id: "reactory.MonitoringWorkflow"
  version: "1.0.0"
  namespace: "reactory"
schedule:
  cron: "0 * * * *"
  timezone: "UTC"
  enabled: true
properties:
  checkType: "system-health"
  alertOnFailure: true
  metricsCollection: true
retry:
  attempts: 2
  delay: 60
timeout: 300
maxConcurrent: 1
```

### Weekly Report Schedule

```yaml
# weekly-report-schedule.yaml
id: "weekly-report"
name: "Weekly Report Generation"
description: "Generates weekly reports every Monday at 9 AM"
workflow:
  id: "reactory.ReportWorkflow"
  version: "1.0.0"
  namespace: "reactory"
schedule:
  cron: "0 9 * * 1"
  timezone: "America/New_York"
  enabled: true
properties:
  reportType: "weekly"
  includeCharts: true
  emailRecipients: ["admin@company.com"]
retry:
  attempts: 2
  delay: 1800
timeout: 7200
maxConcurrent: 1
```

## Error Handling

### Retry Logic

The scheduler implements automatic retry logic:

1. **Attempt Configuration**: Set number of retry attempts in YAML
2. **Delay Configuration**: Set delay between retries in seconds
3. **Exponential Backoff**: Consider implementing exponential backoff for production
4. **Error Logging**: All errors are logged with context

### Error Types

- **Schedule Loading Errors**: Invalid YAML, missing files
- **Cron Validation Errors**: Invalid cron expressions
- **Workflow Execution Errors**: Workflow failures, timeouts
- **System Errors**: File system, memory, network issues

### Best Practices

1. **Use Descriptive IDs**: Make schedule IDs unique and descriptive
2. **Set Appropriate Timeouts**: Avoid infinite timeouts
3. **Configure Retries**: Set reasonable retry attempts and delays
4. **Monitor Statistics**: Regularly check scheduler statistics
5. **Test Schedules**: Test schedules in development before production

## Monitoring

### Statistics

The scheduler provides comprehensive statistics:

```typescript
const stats = scheduler.getStats();
console.log({
  totalSchedules: stats.totalSchedules,
  activeSchedules: stats.activeSchedules,
  totalRuns: stats.totalRuns,
  totalErrors: stats.totalErrors,
  lastRun: stats.lastRun,
});
```

### Logging

The scheduler logs important events:

- Schedule initialization
- Schedule start/stop
- Workflow execution start/completion
- Error conditions
- Statistics updates

### Health Checks

Monitor scheduler health:

```typescript
const isHealthy = scheduler.isInitialized() && 
                  scheduler.getStats().totalErrors < maxErrors;
```

## Troubleshooting

### Common Issues

1. **Schedules Not Running**
   - Check if scheduler is initialized
   - Verify cron expressions are valid
   - Check timezone settings
   - Ensure workflows exist and are registered

2. **Workflow Execution Failures**
   - Check workflow logs
   - Verify workflow properties
   - Check timeout settings
   - Review retry configuration

3. **File Loading Issues**
   - Verify file permissions
   - Check YAML syntax
   - Ensure file naming convention (*-schedule.yaml)
   - Check APP_DATA_ROOT configuration

### Debug Mode

Enable debug logging to troubleshoot:

```typescript
// Set log level to debug
process.env.LOG_LEVEL = 'debug';
```

## Migration Guide

### From Manual Scheduling

If you're migrating from manual scheduling:

1. **Create YAML Files**: Convert existing schedules to YAML format
2. **Update Workflows**: Ensure workflows accept scheduled properties
3. **Test Schedules**: Verify schedules work in development
4. **Deploy Gradually**: Roll out schedules incrementally
5. **Monitor Closely**: Watch for any issues during migration

### Configuration Migration

```typescript
// Old manual approach
setInterval(() => {
  workflowRunner.startWorkflow('workflow.id', '1.0.0', data);
}, 60000);

// New scheduled approach
// Create YAML file with cron: "0 * * * *"
```

## Performance Considerations

### Resource Usage

- **Memory**: Each schedule consumes minimal memory
- **CPU**: Cron parsing and task management
- **File I/O**: YAML file reading on startup/reload
- **Network**: Workflow execution calls

### Optimization Tips

1. **Batch Schedules**: Group related schedules
2. **Use Appropriate Timeouts**: Avoid long-running schedules
3. **Monitor Memory**: Watch for memory leaks
4. **Limit Concurrency**: Set appropriate maxConcurrent values
5. **Regular Cleanup**: Monitor and clean up old schedules

## Security Considerations

### File Permissions

- Ensure schedule files have appropriate permissions
- Restrict access to schedule directory
- Use secure file paths

### Workflow Security

- Validate workflow inputs
- Sanitize properties passed to workflows
- Implement proper authentication/authorization

### Network Security

- Use secure connections for workflow execution
- Implement proper error handling
- Log security-relevant events

## Future Enhancements

### Planned Features

- **Dynamic Scheduling**: Runtime schedule modification
- **Dependency Management**: Schedule dependencies
- **Advanced Cron**: Extended cron syntax support
- **Web UI**: Web interface for schedule management
- **Metrics Integration**: Prometheus/Grafana integration
- **Alerting**: Schedule failure alerts
- **Backup/Restore**: Schedule configuration backup

### Contributing

To contribute to the scheduler:

1. Follow the existing code style
2. Add comprehensive tests
3. Update documentation
4. Submit pull requests

## License

This scheduler is part of the Reactory system and follows the same licensing terms. 