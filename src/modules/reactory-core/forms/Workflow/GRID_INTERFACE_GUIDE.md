# High-Quality ReactoryForm Grid Interface Guide

This guide documents the patterns and best practices for creating high-quality Grid interfaces using ReactoryForm schemas, based on the SupportTickets form and applied to Workflow management forms.

## Overview

The ReactoryForm Grid interface provides a powerful, flexible way to display and manage tabular data with rich interactions, filtering, sorting, and detailed views. This guide demonstrates the complete pattern used across all high-quality grid forms in the system.

## Core Structure

### 1. Form Definition (index.ts)

```typescript
import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema, ListUiSchema } from './uiSchema';
import graphql from './graphql';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = "FormName";
const nameSpace = "core";

const FormDefinition: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema: GridUISchema,
  uiSchemas: [
    { 
      id: 'default',
      description: 'Grid Schema',
      icon: 'table',
      key: 'default',
      title: 'Paginated Table',
      uiSchema: GridUISchema
    },
    {
      id: 'list',
      description: 'List',
      icon: 'list',
      key: 'list',
      title: 'Infinite List',
      uiSchema: ListUiSchema
    }
  ],
  uiFramework: 'material',
  avatar: `${ENVIRONMENT.CDN_ROOT}themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase(),
  registerAsComponent: true,
  title: 'Form Title',
  description: 'Form description',
  backButton: true,
  uiSupport: ['material'],
  graphql,
  roles: ['ADMIN', 'USER']
}
```

**Key Features:**
- Multiple UI schemas for different view types (Grid, List)
- Schema selector in toolbar for switching views
- Avatar/icon support
- Role-based access control
- Back button support

### 2. Schema Definition (schema.ts)

```typescript
import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Form Title',
  properties: {
    message: {
      type: 'string'
    },
    items: {
      type: 'array',
      title: 'Items',
      items: {
        type: 'object',
        title: 'Item ${formData.id}',
        properties: {
          // Define all item properties here
          id: { type: 'string', title: 'ID' },
          // ... more properties
        }
      }
    }
  }
}

const SchemaResolver = async (
  form: Reactory.Forms.IReactoryForm, 
  args: any, 
  context: Reactory.Server.IReactoryContext, 
  info: any
): Promise<Reactory.Schema.AnySchema> => {
  const { i18n, user } = context;
  
  return schema;
}

export default SchemaResolver;
```

### 3. UI Schema Definition (uiSchema.ts)

The UI Schema is the heart of the Grid interface. It defines:

#### Base UI Schema Structure

```typescript
const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: "div",
    showSubmit: false,
    showRefresh: true,
    toolbarPosition: "top",
    toolbarStyle: {
      display: 'flex',
      justifyContent: 'flex-end'
    },
    showSchemaSelectorInToolbar: true,
    schemaSelector: {
      variant: 'icon-button',
    }
  },
  'ui:title': null,  
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      items: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],  
};
```

#### MaterialTableWidget Options

```typescript
const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: true,
  allowDelete: true,
  search: true,
  
  // Add/Delete Button Configuration
  addButtonProps: {
    icon: 'add',
    tooltip: 'Add new item',
    onClick: 'component.fqn/action'
  },
  deleteButtonProps: {
    icon: 'delete',
    tooltip: 'Delete item',
    onClick: 'component.fqn/deleteAction'
  },
  
  // Column Definitions
  columns: [
    // See Column Patterns section below
  ],
  
  // Data Configuration
  remoteData: true,
  query: 'queryName',
  
  // Styling
  rowStyle: {},
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  },
  
  // Conditional Row Styling
  conditionalRowStyling: [
    {
      field: 'status',
      condition: 'FAILED',
      style: {
        backgroundColor: '#ffebee',
        borderLeft: '4px solid #f44336'
      }
    }
  ],
  
  // Table Options
  options: {
    selection: true,
    search: true,
    searchFieldAlignment: 'left',
    grouping: true,
    filtering: true,
    exportButton: true,
    exportAllData: true,
    columnsButton: true,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    emptyRowsWhenPaging: false,
    debounceInterval: 500,
    thirdSortClick: false,
    padding: 'default',
    detailPanelType: 'single',
    showDetailPanelIcon: true,
    detailPanelColumnAlignment: 'left',
  },
  
  // Header Styling
  headerStyle: {
    backgroundColor: '#f5f5f5',
    fontWeight: 600,
    fontSize: '0.875rem',
    borderBottom: '2px solid #e0e0e0'
  },
  
  // Event Handling
  refreshEvents: [
    { name: "event.name" }
  ],
  
  // Row Actions
  actions: [
    // See Actions section below
  ],
  
  // Detail Panel
  componentMap: {
    DetailsPanel: "component.fqn"
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'item',    
  },
  
  // Data Mapping
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'items': 'data'
  },
  variables: {
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
  }
}
```

## Column Patterns

### 1. Copyable ID Column

```typescript
{
  title: 'ID',
  field: 'id',
  width: 180,
  component: 'core.LabelComponent@1.0.0',
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'body2',
        format: '${rowData.id.substring(0, 8)}...',
        copyToClipboard: true,
        copyValue: '${rowData.id}',
        style: {
          fontFamily: 'monospace',
          fontWeight: 600,
          color: '#1976d2'
        }
      }
    }
  },
  cellStyle: {
    fontFamily: 'monospace'
  }
}
```

### 2. Status Badge Column

```typescript
{
  title: 'Status',
  field: 'status',
  width: 140,
  component: 'StatusBadgeWidget',
  propsMap: {
    'rowData.status': 'value'
  },
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'filled',
        size: 'small',
        colorMap: {
          'ACTIVE': '#4caf50',
          'INACTIVE': '#757575',
          'ERROR': '#f44336'
        },
        iconMap: {
          'ACTIVE': 'check_circle',
          'INACTIVE': 'cancel',
          'ERROR': 'error'
        },
        labelFormat: '${value}'
      }
    }
  },
  defaultSort: 'desc'
}
```

### 3. Progress Bar Column

```typescript
{
  title: 'Progress',
  field: 'progress',
  width: 150,
  component: 'ProgressBarWidget',
  propsMap: {
    'rowData.progress': 'value',
    'rowData.status': 'status'
  },
  props: {
    uiSchema: {
      'ui:options': {
        showPercentage: true,
        variant: 'determinate',
        size: 'medium',
        colorByStatus: {
          'RUNNING': 'primary',
          'COMPLETED': 'success',
          'FAILED': 'error'
        }
      }
    }
  }
}
```

### 4. Relative Time Column

```typescript
{
  title: 'Created',
  field: 'createdAt',
  width: 150,
  component: 'RelativeTimeWidget',
  propsMap: {
    'rowData.createdAt': 'date'
  },
  props: {
    uiSchema: {
      'ui:options': {
        format: 'relative',
        tooltip: true,
        tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
        autoRefresh: true,
        refreshInterval: 60000
      }
    }
  },
  type: 'datetime',
  defaultSort: 'desc'
}
```

### 5. User Avatar Column

```typescript
{
  title: 'Created By',
  field: 'createdBy',
  width: 180,
  component: 'UserAvatarWidget',
  propsMap: {
    'rowData.createdBy': 'user'
  },
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'chip',
        size: 'small',
        showEmail: true
      }
    }
  }
}
```

### 6. Count Badge Column

```typescript
{
  title: 'Comments',
  field: 'comments',
  width: 100,
  align: 'center',
  component: 'CountBadgeWidget',
  propsMap: {
    'rowData.comments': 'formData'
  },
  props: {
    uiSchema: {
      'ui:options': {
        icon: 'comment',
        showZero: true,
        color: 'primary',
        singularLabel: 'comment',
        pluralLabel: 'comments'
      }
    }
  }
}
```

### 7. Chip Array Column (Tags)

```typescript
{
  title: 'Tags',
  field: 'tags',
  width: 180,
  component: 'ChipArrayWidget',
  propsMap: {
    'rowData.tags': 'values'
  },
  props: {
    uiSchema: {
      'ui:options': {
        size: 'small',
        variant: 'outlined',
        color: 'default',
        maxDisplay: 2
      }
    }
  }
}
```

### 8. Duration Column

```typescript
{
  title: 'Duration',
  field: 'duration',
  width: 120,
  component: 'DurationWidget',
  propsMap: {
    'rowData.duration': 'milliseconds'
  },
  props: {
    uiSchema: {
      'ui:options': {
        format: 'humanized',
        emptyText: 'N/A'
      }
    }
  },
  type: 'numeric'
}
```

## Row Actions

Actions are displayed as icons in each row and can trigger various operations:

```typescript
{
  key: 'view',
  icon: 'visibility',
  title: 'View Details',
  tooltip: 'View item details',
  event: {
    name: 'viewDetails',
    via: 'component',
    component: 'component.fqn',
    paramsMap: {
      'rowData': 'item'
    }
  }
}
```

### Action with Confirmation

```typescript
{
  key: 'delete',
  icon: 'delete',
  title: 'Delete',
  tooltip: 'Delete this item',
  confirmation: {
    key: 'confirm',
    acceptTitle: 'DELETE',
    cancelTitle: 'CANCEL',
    content: 'Are you sure you want to delete ${rowData.name}?',
    title: 'Delete Item?',
  },
  event: {
    name: 'deleteItem',
    via: 'component',
    component: 'component.fqn',
    paramsMap: {
      'rowData.id': 'itemId'
    }
  }
}
```

### Conditional Action (disabled based on row data)

```typescript
{
  key: 'pause',
  icon: 'pause',
  title: 'Pause',
  tooltip: 'Pause execution',
  disabled: '${rowData.status !== "RUNNING"}',
  event: {
    name: 'pauseItem',
    via: 'component',
    component: 'component.fqn',
    paramsMap: {
      'rowData.id': 'itemId'
    }
  }
}
```

## Conditional Row Styling

Apply visual indicators based on row data:

```typescript
conditionalRowStyling: [
  // Highlight failed items
  {
    field: 'status',
    condition: 'FAILED',
    style: {
      backgroundColor: '#ffebee',
      borderLeft: '4px solid #f44336'
    }
  },
  
  // Highlight running items
  {
    field: 'status',
    condition: 'RUNNING',
    style: {
      backgroundColor: '#e3f2fd',
      borderLeft: '4px solid #2196f3'
    }
  },
  
  // Complex condition using function
  {
    field: 'progress',
    condition: (value: any, rowData: any) => {
      return value > 0 && value < 100 && rowData.status === 'RUNNING';
    },
    style: {
      backgroundColor: '#fff8e1'
    }
  },
  
  // Fade inactive items
  {
    field: 'isActive',
    condition: 'false',
    style: {
      opacity: 0.6,
      backgroundColor: '#f5f5f5'
    }
  }
]
```

## GraphQL Integration (graphql.ts)

```typescript
import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    queryName: {
      name: 'QueryName',
      text: `query QueryName($filter: FilterInput, $pagination: PaginationInput) {
        queryName(filter: $filter, pagination: $pagination) {
          items {
            id
            field1
            field2
            // ... all required fields
          }
          pagination {
            page
            pages
            limit
            total
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging.page': 'pagination.page',
        'paging.total': 'pagination.total',
        'paging.pageSize': 'pagination.limit',
        'items': 'data'
      }
    }
  },
  
  mutation: {
    deleteItem: {
      name: 'DeleteItem',
      text: `mutation DeleteItem($itemId: String!) {
        deleteItem(itemId: $itemId) {
          success
          message
        }
      }`,
      variables: {
        'itemId': 'itemId'
      },
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    }
  }
}

export default graphql;
```

## List View Alternative

Provide an alternative list view for mobile/compact displays:

```typescript
const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {      
  primaryText: '${item.name}',
  secondaryText: '${item.description}',
  showAvatar: false,
  showTitle: true,
  showLabel: false,    
  allowAdd: true,
  secondaryAction: {      
    action: 'mount',
    componentFqn: 'component.fqn',
    propsMap: {
      'item.status': 'status',
      'item': 'item'
    },
    props: {
      useCase: 'list'
    },
  },
  remoteData: true,
  query: 'queryName',
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'items': 'data'
  },
  variables: {
    'search': 'filter.searchString',
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize',
  },
  title: 'Items',
  jss: {
    root: {
      display: 'flex',
      flexDirection: 'column',
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    list: {
      minWidth: '70%',
      margin: 'auto',
      maxHeight: '80%',
      minHeight: '80%',
    }
  }
}

export const ListUiSchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  items: {
    'ui:widget': 'MaterialListWidget',
    'ui:title': null,
    'ui:options': ListUIOptions as Reactory.Schema.IUISchemaOptions,
  },
}
```

## Available Widgets

### Core Widgets
- `core.LabelComponent@1.0.0` - Flexible text display with formatting
- `StatusBadgeWidget` - Status badges with colors and icons
- `RelativeTimeWidget` - Relative time display (e.g., "2 hours ago")
- `UserAvatarWidget` - User avatar with optional email/name
- `CountBadgeWidget` - Count display with badges
- `ChipArrayWidget` - Array of chips for tags
- `ProgressBarWidget` - Progress bar with percentage
- `DurationWidget` - Duration display (humanized)
- `PercentageWidget` - Percentage display with color thresholds
- `CronExpressionWidget` - Cron expression with description
- `ExecutionProgressWidget` - Execution counter with progress

### Custom Component Props

Components receive props through two mechanisms:

1. **Direct Props**: Static configuration
```typescript
props: {
  uiSchema: {
    'ui:options': {
      variant: 'body2',
      showEmail: true
    }
  }
}
```

2. **Props Mapping**: Dynamic data from row
```typescript
propsMap: {
  'rowData.status': 'status',
  'rowData.user': 'user'
}
```

## Best Practices

### 1. Column Width Management
- Use fixed widths for better layout control
- Reserve more space for primary content columns
- Use narrower widths for icons, badges, and counts

### 2. Color Consistency
Use Material Design color palette consistently:
- Success: `#4caf50` (green)
- Error/Critical: `#f44336` (red)
- Warning: `#ff9800` (orange)
- Info/Primary: `#2196f3` (blue)
- Disabled/Inactive: `#757575` (gray)

### 3. Icon Selection
Use Material Icons that clearly represent the action or state:
- `check_circle` - Success/Complete
- `error` - Error/Failed
- `pause_circle` - Paused
- `play_circle` - Running/Active
- `cancel` - Cancelled/Inactive
- `schedule` - Scheduled/Pending

### 4. Performance
- Enable `remoteData` for large datasets
- Set appropriate `debounceInterval` for search (500ms)
- Use `emptyRowsWhenPaging: false` for cleaner pagination
- Implement server-side pagination

### 5. User Experience
- Always provide tooltips for actions
- Use confirmation dialogs for destructive actions
- Show clear status indicators with color coding
- Enable column visibility toggle (`columnsButton: true`)
- Support data export (`exportButton: true`)
- Use conditional row styling for important states

### 6. Accessibility
- Use semantic color coding
- Provide clear tooltips
- Use appropriate ARIA labels
- Ensure keyboard navigation works
- Test with screen readers

## Example Implementations

The following forms demonstrate these patterns:

1. **SupportTickets** (`core.SupportTickets@1.0.0`)
   - Complete example with user avatars, status badges, count badges
   - Multiple view schemas (Grid and List)
   - Rich action set with confirmations

2. **WorkflowRegistryManagement** (`core.WorkflowRegistryManagement@1.0.0`)
   - Registry management with namespace badges
   - Copyable workflow IDs
   - Statistics display with percentage widgets
   - Conditional styling for inactive workflows

3. **WorkflowInstanceManagement** (`core.WorkflowInstanceManagement@1.0.0`)
   - Instance lifecycle management
   - Progress bars for running workflows
   - Relative time displays with auto-refresh
   - Conditional actions based on instance state
   - Rich conditional row styling

4. **WorkflowScheduleManagement** (`core.WorkflowScheduleManagement@1.0.0`)
   - Schedule management with cron expressions
   - Next execution countdown
   - Execution progress tracking
   - Enable/disable toggle actions

## Summary

This guide provides a complete pattern for creating high-quality Grid interfaces in ReactoryForm. Key principles:

1. **Modular Structure** - Separate concerns (schema, uiSchema, graphql)
2. **Rich Column Types** - Use specialized widgets for different data types
3. **Visual Feedback** - Status badges, progress bars, conditional styling
4. **User Actions** - Row actions with confirmations and conditional display
5. **Data Integration** - GraphQL queries with proper mapping
6. **Multiple Views** - Grid and List alternatives
7. **Responsive Design** - Proper column sizing and layout

Follow these patterns to create consistent, high-quality grid interfaces across your application.
