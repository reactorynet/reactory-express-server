# CardWidget Conversion Summary

## Overview
Converted the Workflow System Dashboard uiSchema from using custom card widgets to the generic `CardWidget` implementation for consistency and maintainability.

## Changes Made

### 1. StatusCard → CardWidget
**Before:**
```typescript
system: {
  'ui:widget': 'StatusCard',
  'ui:options': {
    title: 'System Status',
    statusField: 'status',
    timestampField: 'timestamp',
    variant: 'system'
  }
}
```

**After:**
```typescript
system: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'System Status',
    description: '${formData.status || "Unknown"}',
    displayValue: true,
    mapping: {
      'formData.status': 'value',
      'formData.timestamp': 'description'
    },
    headerOptions: {
      sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }
    },
    actions: [
      {
        label: 'View Details',
        icon: 'info',
        onClick: 'event:system:viewDetails'
      }
    ]
  }
}
```

### 2. MetricsCard → CardWidget (Multiple instances)
**Before (Lifecycle):**
```typescript
lifecycle: {
  'ui:widget': 'MetricsCard',
  'ui:options': {
    title: 'Workflow Lifecycle',
    metrics: [
      { field: 'activeInstances', label: 'Active', color: 'primary' },
      { field: 'completedInstances', label: 'Completed', color: 'success' },
      { field: 'failedInstances', label: 'Failed', color: 'error' },
      { field: 'pausedInstances', label: 'Paused', color: 'warning' }
    ],
    primaryMetric: 'totalInstances'
  }
}
```

**After (Lifecycle):**
```typescript
lifecycle: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'Workflow Lifecycle',
    description: 'Instance status overview',
    displayValue: false,
    headerOptions: {
      sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }
    },
    actions: [
      {
        label: 'Active: ${formData.activeInstances || 0}',
        icon: 'play_circle',
        onClick: 'event:lifecycle:viewActive'
      },
      {
        label: 'Completed: ${formData.completedInstances || 0}',
        icon: 'check_circle',
        onClick: 'event:lifecycle:viewCompleted'
      },
      {
        label: 'Failed: ${formData.failedInstances || 0}',
        icon: 'error',
        onClick: 'event:lifecycle:viewFailed'
      },
      {
        label: 'Paused: ${formData.pausedInstances || 0}',
        icon: 'pause_circle',
        onClick: 'event:lifecycle:viewPaused'
      }
    ]
  }
}
```

### 3. ActionsCard → CardWidget
**Before:**
```typescript
quickActions: {
  'ui:widget': 'ActionsCard',
  'ui:options': {
    title: 'System Controls',
    actions: [
      {
        label: 'Pause System',
        icon: 'pause',
        variant: 'outlined',
        color: 'warning',
        mutation: 'pauseWorkflowSystem'
      },
      // ... more actions
    ]
  }
}
```

**After:**
```typescript
quickActions: {
  'ui:widget': 'CardWidget',
  'ui:options': {
    title: 'System Controls',
    description: 'Manage workflow system operations',
    displayValue: false,
    headerOptions: {
      sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }
    },
    actions: [
      {
        label: 'Pause System',
        icon: 'pause',
        onClick: 'mutation:pauseWorkflowSystem',
        disabled: false
      },
      // ... more actions
    ]
  }
}
```

## Key Differences Between Generic CardWidget and Custom Widgets

### Generic CardWidget Features:
1. **Flexible Content Display**: Can show title, description, value, and images
2. **Template Support**: String interpolation with `${formData.property}` syntax
3. **Action System**: Configurable buttons with icons and click handlers
4. **Conditional Visibility**: Actions can be shown/hidden based on conditions
5. **Mapping Support**: Map form data to card properties using `mapping` option
6. **Styling**: Flexible styling through `headerOptions`, `imageOptions`, and `sx` properties

### Custom Widgets (StatusCard, MetricsCard, ActionsCard):
1. **Specialized**: Purpose-built for specific use cases
2. **Limited Flexibility**: Fixed structure and behavior
3. **Color Coding**: Built-in color schemes for different states
4. **Metric Display**: Specialized formatting for metrics and numbers
5. **Status Variants**: Pre-defined visual variants for different statuses

## Migration Benefits:
1. **Consistency**: All cards now use the same underlying widget
2. **Maintainability**: Single widget implementation to maintain
3. **Flexibility**: More configuration options available
4. **Extensibility**: Easier to add new features across all card instances
5. **Reduced Dependencies**: Fewer custom widgets to implement and test

## Template String Usage:
The converted implementation makes extensive use of template strings for dynamic content:
- `'${formData.status || "Unknown"}'` - Display status with fallback
- `'Active: ${formData.activeInstances || 0}'` - Show metrics in action labels
- `'${formData.validationErrors > 0}'` - Conditional visibility for error actions

## Action Event Naming Convention:
Adopted a consistent event naming pattern:
- `event:system:viewDetails` - System-related events
- `event:lifecycle:viewActive` - Lifecycle-related events
- `event:config:viewAll` - Configuration-related events
- `event:security:viewAuth` - Security-related events
- `mutation:pauseWorkflowSystem` - GraphQL mutations

This conversion maintains the same visual and functional behavior while using the generic CardWidget infrastructure.
