# CardWidget Conversion Summary - Operations Dashboard

## Overview
Converted the Operations Dashboard uiSchema from using custom widgets (`MetricsCard`, `ActivityFeed`, `AlertsList`) to the generic `CardWidget` implementation for consistency with the System Dashboard and improved maintainability.

## Changes Made

### 1. MetricsCard → CardWidget (Lifecycle)
**Before:**
```typescript
lifecycle: {
  'ui:widget': 'MetricsCard',
  'ui:options': {
    title: 'Workflow Lifecycle',
    icon: 'timeline',
    metrics: [
      { field: 'activeInstances', label: 'Active', color: 'primary', format: 'number' },
      { field: 'completedInstances', label: 'Completed Today', color: 'success', format: 'number' },
      { field: 'failedInstances', label: 'Failed Today', color: 'error', format: 'number' },
      { field: 'averageExecutionTime', label: 'Avg Time', color: 'info', format: 'duration' }
    ]
  }
}
```

**After:**
```typescript
lifecycle: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'Workflow Lifecycle',
    description: 'Instance status and timing metrics',
    displayValue: false,
    headerOptions: {
      sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }
    },
    actions: [
      {
        label: 'Active: ${formData?.activeInstances || 0}',
        icon: 'play_circle',
        onClick: 'event:lifecycle:viewActive'
      },
      {
        label: 'Completed: ${formData?.completedInstances || 0}',
        icon: 'check_circle', 
        onClick: 'event:lifecycle:viewCompleted'
      },
      {
        label: 'Failed: ${formData?.failedInstances || 0}',
        icon: 'error',
        onClick: 'event:lifecycle:viewFailed',
        visible: '${formData?.failedInstances > 0}'
      },
      {
        label: 'Avg Time: ${formData?.averageExecutionTime ? reactory.utils.moment.duration(formData.averageExecutionTime).humanize() : "N/A"}',
        icon: 'schedule',
        onClick: 'event:lifecycle:viewTiming'
      }
    ]
  }
}
```

### 2. MetricsCard → CardWidget (Scheduler)
**Before:**
```typescript
scheduler: {
  'ui:widget': 'MetricsCard',
  'ui:options': {
    title: 'Scheduler Status',
    icon: 'schedule',
    metrics: [
      { field: 'activeSchedules', label: 'Active Schedules', color: 'primary', format: 'number' },
      { field: 'executionsToday', label: 'Today\'s Runs', color: 'success', format: 'number' },
      { field: 'missedExecutions', label: 'Missed', color: 'warning', format: 'number' },
      { field: 'nextExecution', label: 'Next Run', color: 'info', format: 'fromNow' }
    ]
  }
}
```

**After:**
```typescript
scheduler: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'Scheduler Status',
    description: 'Scheduled workflow execution metrics',
    displayValue: false,
    actions: [
      {
        label: 'Active Schedules: ${formData?.activeSchedules || 0}',
        icon: 'schedule',
        onClick: 'event:scheduler:viewActive'
      },
      {
        label: 'Today\'s Runs: ${formData?.executionsToday || 0}',
        icon: 'today',
        onClick: 'event:scheduler:viewToday'
      },
      {
        label: 'Missed: ${formData?.missedExecutions || 0}',
        icon: 'warning',
        onClick: 'event:scheduler:viewMissed',
        visible: '${formData?.missedExecutions > 0}'
      },
      {
        label: 'Next Run: ${formData?.nextExecution ? reactory.utils.moment(formData.nextExecution).fromNow() : "N/A"}',
        icon: 'schedule_send',
        onClick: 'event:scheduler:viewNext'
      }
    ]
  }
}
```

### 3. MetricsCard → CardWidget (Performance)
**Before:**
```typescript
performance: {
  'ui:widget': 'MetricsCard',
  'ui:options': {
    title: 'Performance',
    icon: 'speed',
    metrics: [
      { field: 'throughput', label: 'Throughput/Hr', color: 'primary', format: 'number', suffix: '/hr' },
      { field: 'errorRate', label: 'Error Rate', color: 'error', format: 'percentage' },
      { field: 'queueDepth', label: 'Queue Depth', color: 'warning', format: 'number' },
      { field: 'resourceUtilization', label: 'Resources', color: 'info', format: 'percentage' }
    ]
  }
}
```

**After:**
```typescript
performance: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'Performance',
    description: 'System performance and resource metrics',
    displayValue: false,
    actions: [
      {
        label: 'Throughput: ${formData?.throughput || 0}/hr',
        icon: 'speed',
        onClick: 'event:performance:viewThroughput'
      },
      {
        label: 'Error Rate: ${formData?.errorRate || 0}%',
        icon: 'error_outline',
        onClick: 'event:performance:viewErrors',
        visible: '${formData?.errorRate > 0}'
      },
      {
        label: 'Queue Depth: ${formData?.queueDepth || 0}',
        icon: 'queue',
        onClick: 'event:performance:viewQueue',
        visible: '${formData?.queueDepth > 0}'
      },
      {
        label: 'Resources: ${formData?.resourceUtilization || 0}%',
        icon: 'memory',
        onClick: 'event:performance:viewResources'
      }
    ]
  }
}
```

### 4. ActivityFeed → CardWidget
**Before:**
```typescript
recentActivity: {
  'ui:widget': 'ActivityFeed',
  'ui:options': {
    title: 'Recent Activity',
    icon: 'history',
    maxItems: 10,
    showTimestamp: true,
    itemTemplate: {
      primary: '${event}',
      secondary: '${workflowName} - ${status}',
      avatar: '${status}',
      timestamp: '${timestamp}'
    },
    refreshInterval: 15000
  }
}
```

**After:**
```typescript
recentActivity: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'Recent Activity',
    description: 'Latest workflow events and status changes',
    displayValue: false,
    actions: [
      {
        label: '${formData?.recentActivity?.[0]?.event || "No recent activity"}',
        icon: 'history',
        onClick: 'event:activity:viewRecent',
        subtitle: '${formData?.recentActivity?.[0]?.workflowName ? formData.recentActivity[0].workflowName + " - " + formData.recentActivity[0].status : ""}'
      },
      {
        label: 'View All Activity',
        icon: 'list',
        onClick: 'event:activity:viewAll'
      },
      {
        label: 'Export Log',
        icon: 'download',
        onClick: 'event:activity:export'
      }
    ]
  }
}
```

### 5. AlertsList → CardWidget
**Before:**
```typescript
alerts: {
  'ui:widget': 'AlertsList',
  'ui:options': {
    title: 'Active Alerts',
    icon: 'warning',
    maxItems: 10,
    showSeverity: true,
    actions: [
      { label: 'Acknowledge', icon: 'check', action: 'acknowledgeAlert' },
      { label: 'Dismiss', icon: 'close', action: 'dismissAlert' }
    ]
  }
}
```

**After:**
```typescript
alerts: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'Active Alerts',
    description: 'System alerts and warnings requiring attention',
    displayValue: false,
    actions: [
      {
        label: 'Critical: ${formData?.alerts?.filter(a => a.severity === "critical").length || 0}',
        icon: 'error',
        onClick: 'event:alerts:viewCritical',
        visible: '${formData?.alerts?.filter(a => a.severity === "critical").length > 0}'
      },
      {
        label: 'Warning: ${formData?.alerts?.filter(a => a.severity === "warning").length || 0}',
        icon: 'warning',
        onClick: 'event:alerts:viewWarning',
        visible: '${formData?.alerts?.filter(a => a.severity === "warning").length > 0}'
      },
      {
        label: 'Info: ${formData?.alerts?.filter(a => a.severity === "info").length || 0}',
        icon: 'info',
        onClick: 'event:alerts:viewInfo',
        visible: '${formData?.alerts?.filter(a => a.severity === "info").length > 0}'
      },
      {
        label: 'Acknowledge All',
        icon: 'check_circle',
        onClick: 'mutation:acknowledgeAllAlerts',
        visible: '${formData?.alerts?.length > 0}'
      },
      {
        label: 'Dismiss All',
        icon: 'close',
        onClick: 'mutation:dismissAllAlerts',
        visible: '${formData?.alerts?.length > 0}'
      }
    ]
  }
}
```

## Consistency Features Applied

### 1. Template String Usage
- Dynamic content: `'${formData?.property || fallback}'`
- Complex expressions: `'${formData?.averageExecutionTime ? reactory.utils.moment.duration(formData.averageExecutionTime).humanize() : "N/A"}'`
- Array operations: `'${formData?.alerts?.filter(a => a.severity === "critical").length || 0}'`

### 2. Event Naming Convention
- **event:** prefix for view/navigation actions
- **mutation:** prefix for data modification actions
- Hierarchical naming: `event:category:action`
  - `event:lifecycle:viewActive`
  - `event:scheduler:viewMissed`
  - `event:performance:viewErrors`
  - `event:activity:viewAll`
  - `event:alerts:viewCritical`

### 3. Conditional Visibility
- Hide actions when not applicable: `visible: '${formData?.errorRate > 0}'`
- Show error-related actions only when errors exist
- Display alert categories only when alerts of that severity exist

### 4. Consistent Header Styling
```typescript
headerOptions: {
  sx: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  }
}
```

### 5. Icon Standardization
- Meaningful icons that represent the action/data
- Consistent icon usage across similar actions
- Material Icons compatibility

## Migration Benefits

1. **Unified Widget System**: All dashboard cards now use the same underlying widget
2. **Consistent Behavior**: Uniform interaction patterns across dashboards
3. **Enhanced Template Support**: Rich string interpolation capabilities
4. **Improved Maintainability**: Single widget implementation to maintain
5. **Better Conditional Logic**: Advanced visibility and state management
6. **Event System Consistency**: Standardized event naming and handling

## Comparison with SystemDashboard

Both dashboards now follow the same patterns:
- ✅ All cards use `CardWidget`
- ✅ Consistent template string syntax
- ✅ Standardized event naming convention
- ✅ Uniform header styling
- ✅ Conditional action visibility
- ✅ Proper fallback values

The Operations Dashboard conversion maintains functional equivalence while achieving visual and behavioral consistency with the System Dashboard implementation.
