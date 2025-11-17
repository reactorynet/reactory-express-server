# Workflow Routes API

This document describes the REST API endpoints for the Reactory Workflow Engine.

## Base URL

All workflow endpoints are prefixed with `/workflow`.

## Authentication

All endpoints require authentication using either:
- Bearer token in the Authorization header
- Client key and password in headers: `x-client-key` and `x-client-pwd`

## Endpoints Overview

### System Status
- `GET /workflow/status` - Get comprehensive system status

### Workflow Execution
- `POST /workflow/start/{workflowId}` - Start a new workflow instance

### Instance Management
- `GET /workflow/instance/{instanceId}` - Get workflow instance details
- `POST /workflow/instance/{instanceId}/pause` - Pause a workflow instance
- `POST /workflow/instance/{instanceId}/resume` - Resume a paused workflow instance
- `DELETE /workflow/instance/{instanceId}` - Cancel a workflow instance

### Schedule Management
- `GET /workflow/schedules` - List all workflow schedules
- `POST /workflow/schedules` - Create a new schedule (file-based)
- `GET /workflow/schedules/{scheduleId}` - Get schedule details
- `PUT /workflow/schedules/{scheduleId}` - Update a schedule (file-based)
- `DELETE /workflow/schedules/{scheduleId}` - Stop/delete a schedule
- `POST /workflow/schedules/{scheduleId}/start` - Start a schedule
- `POST /workflow/schedules/{scheduleId}/stop` - Stop a schedule
- `POST /workflow/schedules/reload` - Reload all schedules from files

### Monitoring & Audit
- `GET /workflow/audit` - Get audit logs with filtering and pagination
- `GET /workflow/metrics` - Get system metrics and statistics

### Configuration Management
- `GET /workflow/configs` - Get workflow configurations

## Usage Examples

### Starting a Workflow

```bash
curl -X POST http://localhost:4000/workflow/start/my-workflow \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputData": "test",
    "priority": "normal"
  }'
```

Response:
```json
{
  "instanceId": "abc123",
  "workflowId": "my-workflow",
  "version": "1",
  "status": "started",
  "timestamp": "2025-08-30T10:00:00.000Z"
}
```

### Getting System Status

```bash
curl -X GET http://localhost:4000/workflow/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "system": {
    "initialized": true,
    "status": "healthy",
    "timestamp": "2025-08-30T10:00:00.000Z"
  },
  "lifecycle": {
    "totalInstances": 150,
    "runningInstances": 5,
    "completedInstances": 140,
    "failedInstances": 5,
    "averageExecutionTime": 2500
  },
  "errors": [],
  "configuration": {
    "totalConfigurations": 10,
    "lastModified": "2025-08-30T09:00:00.000Z"
  },
  "security": {
    "totalAuditEntries": 1000,
    "securityEvents": 0,
    "lastAuditEntry": "2025-08-30T09:55:00.000Z"
  }
}
```

### Pausing a Workflow Instance

```bash
curl -X POST http://localhost:4000/workflow/instance/abc123/pause \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "instanceId": "abc123",
  "status": "paused",
  "timestamp": "2025-08-30T10:01:00.000Z"
}
```

### Getting Workflow Schedules

```bash
curl -X GET http://localhost:4000/workflow/schedules \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "schedules": [
    {
      "id": "daily-report",
      "config": {
        "id": "daily-report",
        "name": "Daily Report Generation",
        "workflow": {
          "id": "generate-reports",
          "version": "1.0"
        },
        "schedule": {
          "cron": "0 6 * * *",
          "timezone": "UTC",
          "enabled": true
        }
      },
      "lastRun": "2025-08-30T06:00:00.000Z",
      "nextRun": "2025-08-31T06:00:00.000Z",
      "runCount": 30,
      "errorCount": 0,
      "isRunning": false
    }
  ],
  "stats": {
    "totalSchedules": 1,
    "activeSchedules": 1,
    "totalRuns": 30,
    "totalErrors": 0,
    "lastRun": "2025-08-30T06:00:00.000Z"
  },
  "timestamp": "2025-08-30T10:00:00.000Z"
}
```

### Getting Audit Logs

```bash
curl -X GET "http://localhost:4000/workflow/audit?page=1&limit=10&action=start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "logs": [
    {
      "id": "audit-1",
      "userId": "user123",
      "action": "start",
      "resource": "workflow",
      "resourceId": "my-workflow",
      "details": {
        "version": "1",
        "inputData": "test"
      },
      "timestamp": "2025-08-30T10:00:00.000Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "curl/7.68.0"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "timestamp": "2025-08-30T10:00:00.000Z"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-08-30T10:00:00.000Z"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation failed)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error
- `501` - Not Implemented (for file-based operations)
- `503` - Service Unavailable (scheduler not initialized)

## Schedule Management Notes

Schedule creation, updates, and permanent deletion require file system access and are currently not supported via API. These operations return `501 Not Implemented` status with instructions on how to perform them:

1. **Creating Schedules**: Create YAML configuration files in the schedules directory
2. **Updating Schedules**: Modify the YAML configuration files
3. **Deleting Schedules**: Remove the YAML configuration files
4. **Applying Changes**: Use the `/workflow/schedules/reload` endpoint

### Schedule Configuration File Format

Create files with naming pattern `{schedule-id}-schedule.yaml` in the schedules directory:

```yaml
id: "daily-report"
name: "Daily Report Generation"
description: "Generate daily reports for all clients"

workflow:
  id: "generate-reports"
  version: "1.0"
  nameSpace: "reporting"

schedule:
  cron: "0 6 * * *"  # Daily at 6 AM
  timezone: "UTC"
  enabled: true

properties:
  reportTypes:
    - "sales"
    - "analytics"
  outputPath: "/reports/daily"

retry:
  attempts: 3
  delay: 300  # 5 minutes

timeout: 1800  # 30 minutes
maxConcurrent: 1
```

## Workflow Instance States

Workflow instances can be in the following states:
- `PENDING` - Waiting to start
- `RUNNING` - Currently executing
- `PAUSED` - Temporarily stopped
- `COMPLETED` - Finished successfully
- `FAILED` - Finished with error
- `CANCELLED` - Cancelled by user
- `CLEANING_UP` - Performing cleanup operations

## Workflow Priorities

Workflows can have the following priorities:
- `LOW` - Low priority execution
- `NORMAL` - Normal priority (default)
- `HIGH` - High priority execution
- `CRITICAL` - Critical priority execution

## Security Features

The workflow engine includes comprehensive security features:
- Authentication and authorization
- Input validation
- Rate limiting
- Audit logging
- Security event monitoring

All workflow operations are logged for compliance and security analysis.

## Development and Testing

To test the workflow routes locally:

1. Start the Reactory server:
   ```bash
   cd /path/to/reactory-express-server
   bin/start.sh
   ```

2. Use curl, Postman, or similar tools to test the endpoints
3. Check the swagger documentation at the API explorer

For development, refer to the workflow engine documentation in the `src/workflow/README.md` file for detailed architecture information.
