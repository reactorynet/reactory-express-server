# Workflow GraphQL Schema - REST API Mapping

This document shows the 1:1 mapping between the REST API endpoints and the GraphQL schema.

## REST Endpoint to GraphQL Query/Mutation Mapping

### System Status
- **REST**: `GET /workflow/status`
- **GraphQL**: `query { workflowSystemStatus { ... } }`

### Workflow Registry
- **REST**: `GET /workflow/workflows`
- **GraphQL**: `query { workflows(filter: {...}, pagination: {...}) { ... } }`
- **GraphQL**: `query { workflowRegistry { workflows, stats } }`

### Workflow Details
- **REST**: `GET /workflow/workflows/:nameSpace/:name`
- **GraphQL**: `query { workflow(namespace: "...", name: "...") { ... } }`

### Workflow Execution
- **REST**: `POST /workflow/start/:workflowId`
- **GraphQL**: `mutation { startWorkflow(workflowId: "...", input: {...}) { ... } }`

### Instance Management
- **REST**: `GET /workflow/instance/:instanceId`
- **GraphQL**: `query { workflowInstance(id: "...") { ... } }`

- **REST**: `POST /workflow/instance/:instanceId/pause`
- **GraphQL**: `mutation { pauseWorkflowInstance(instanceId: "...") { ... } }`

- **REST**: `POST /workflow/instance/:instanceId/resume`
- **GraphQL**: `mutation { resumeWorkflowInstance(instanceId: "...") { ... } }`

- **REST**: `DELETE /workflow/instance/:instanceId`
- **GraphQL**: `mutation { cancelWorkflowInstance(instanceId: "...") { ... } }`

### Schedule Management
- **REST**: `GET /workflow/schedules`
- **GraphQL**: `query { workflowSchedules(pagination: {...}) { ... } }`

- **REST**: `POST /workflow/schedules`
- **GraphQL**: `mutation { createWorkflowSchedule(config: {...}) { ... } }`

- **REST**: `GET /workflow/schedules/:scheduleId`
- **GraphQL**: `query { workflowSchedule(id: "...") { ... } }`

- **REST**: `PUT /workflow/schedules/:scheduleId`
- **GraphQL**: `mutation { updateWorkflowSchedule(scheduleId: "...", updates: {...}) { ... } }`

- **REST**: `DELETE /workflow/schedules/:scheduleId`
- **GraphQL**: `mutation { deleteWorkflowSchedule(scheduleId: "...") { ... } }`

- **REST**: `POST /workflow/schedules/:scheduleId/start`
- **GraphQL**: `mutation { startSchedule(scheduleId: "...") { ... } }`

- **REST**: `POST /workflow/schedules/:scheduleId/stop`
- **GraphQL**: `mutation { stopSchedule(scheduleId: "...") { ... } }`

- **REST**: `POST /workflow/schedules/reload`
- **GraphQL**: `mutation { reloadSchedules { ... } }`

### Audit and Monitoring
- **REST**: `GET /workflow/audit`
- **GraphQL**: `query { workflowAuditLog(filter: {...}, pagination: {...}) { ... } }`

- **REST**: `GET /workflow/metrics`
- **GraphQL**: `query { workflowMetrics { ... } }`

### Configuration
- **REST**: `GET /workflow/configs`
- **GraphQL**: `query { workflowConfigurations { ... } }`

## Key Features Added to GraphQL Schema

### 1. **Complete Type System**
- All REST response models converted to GraphQL types
- Proper enum types for status values, actions, resources
- JSON scalar for flexible data structures
- DateTime scalar for proper date handling

### 2. **Input Types**
- Comprehensive input types for all mutations
- Filter input types for queries
- Pagination input type for consistent paging

### 3. **Pagination Support**
- Consistent pagination across all list queries
- PaginationInfo type for metadata
- Paginated response types for workflows, instances, schedules, audit logs

### 4. **Advanced Filtering**
- WorkflowFilterInput for filtering workflows by namespace, tags, status, etc.
- InstanceFilterInput for filtering instances by various criteria
- AuditFilterInput for filtering audit logs

### 5. **Error Handling**
- WorkflowOperationResult for operation outcomes
- ValidationResult with errors and warnings
- Proper error types embedded in responses

### 6. **Legacy Compatibility**
- Preserved original WorkflowResult and WorkflowInput types
- Legacy startWorkflowLegacy mutation for backward compatibility

### 7. **Rich Metadata**
- Complete workflow statistics
- System health information
- Security event tracking
- Resource requirements and notifications

## Benefits of GraphQL vs REST

1. **Single Request**: Client can request exactly the data needed in one request
2. **Type Safety**: Strong typing prevents runtime errors
3. **Introspection**: Self-documenting schema
4. **Flexibility**: Clients can compose queries for their specific needs
5. **Real-time**: Can be extended with subscriptions for live updates
6. **Versioning**: Schema evolution without breaking changes

## Example Queries

### Get System Status with Specific Fields
```graphql
query {
  workflowSystemStatus {
    system {
      initialized
      status
      timestamp
    }
    lifecycle {
      activeInstances
      completedInstances
      failedInstances
    }
  }
}
```

### Get Workflows with Filtering and Pagination
```graphql
query {
  workflows(
    filter: { namespace: "production", isActive: true }
    pagination: { page: 1, limit: 20, sort: "name" }
  ) {
    workflows {
      name
      namespace
      version
      description
      isActive
    }
    pagination {
      page
      pages
      total
    }
  }
}
```

### Start Workflow with Input
```graphql
mutation {
  startWorkflow(
    workflowId: "production/data-processing"
    input: {
      input: { dataset: "customer-data", format: "json" }
      tags: ["batch-processing", "analytics"]
      priority: 5
    }
  ) {
    id
    status
    startTime
    input
  }
}
```

### Get Workflow Instance Details
```graphql
query {
  workflowInstance(id: "inst-123") {
    id
    workflowName
    status
    progress
    startTime
    endTime
    duration
    steps {
      stepId
      name
      status
      duration
    }
    error {
      message
      code
    }
  }
}
```
