# ReactoryForm Grid Interface - Quick Reference

## Essential Column Patterns

### Copyable ID
```typescript
{
  title: 'ID',
  field: 'id',
  width: 180,
  component: 'core.LabelComponent@1.0.0',
  props: {
    uiSchema: {
      'ui:options': {
        format: '${rowData.id}',
        copyToClipboard: true,
        style: { fontFamily: 'monospace', fontWeight: 600, color: '#1976d2' }
      }
    }
  }
}
```

### Status Badge
```typescript
{
  title: 'Status',
  field: 'status',
  component: 'StatusBadgeWidget',
  propsMap: { 'rowData.status': 'value' },
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'filled',
        size: 'small',
        colorMap: { 'ACTIVE': '#4caf50', 'INACTIVE': '#757575' },
        iconMap: { 'ACTIVE': 'check_circle', 'INACTIVE': 'cancel' }
      }
    }
  }
}
```

### Progress Bar
```typescript
{
  title: 'Progress',
  field: 'progress',
  component: 'ProgressBarWidget',
  propsMap: { 'rowData.progress': 'value' },
  props: {
    uiSchema: {
      'ui:options': { showPercentage: true, variant: 'determinate' }
    }
  }
}
```

### Relative Time
```typescript
{
  title: 'Created',
  field: 'createdAt',
  component: 'RelativeTimeWidget',
  propsMap: { 'rowData.createdAt': 'date' },
  props: {
    uiSchema: {
      'ui:options': {
        format: 'relative',
        tooltip: true,
        tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
        autoRefresh: true
      }
    }
  }
}
```

### User Avatar
```typescript
{
  title: 'User',
  field: 'user',
  component: 'UserAvatarWidget',
  propsMap: { 'rowData.user': 'user' },
  props: {
    uiSchema: {
      'ui:options': { variant: 'chip', size: 'small', showEmail: true }
    }
  }
}
```

### Count Badge
```typescript
{
  title: 'Comments',
  field: 'comments',
  component: 'CountBadgeWidget',
  propsMap: { 'rowData.comments': 'formData' },
  props: {
    uiSchema: {
      'ui:options': {
        icon: 'comment',
        showZero: true,
        singularLabel: 'comment',
        pluralLabel: 'comments'
      }
    }
  }
}
```

### Chip Array (Tags)
```typescript
{
  title: 'Tags',
  field: 'tags',
  component: 'ChipArrayWidget',
  propsMap: { 'rowData.tags': 'values' },
  props: {
    uiSchema: {
      'ui:options': { size: 'small', variant: 'outlined', maxDisplay: 3 }
    }
  }
}
```

## Common Actions

### View Action
```typescript
{
  key: 'view',
  icon: 'visibility',
  title: 'View Details',
  tooltip: 'View details',
  event: {
    name: 'viewDetails',
    via: 'component',
    component: 'component.fqn',
    paramsMap: { 'rowData': 'item' }
  }
}
```

### Delete Action (with confirmation)
```typescript
{
  key: 'delete',
  icon: 'delete',
  title: 'Delete',
  confirmation: {
    key: 'confirm',
    acceptTitle: 'DELETE',
    cancelTitle: 'CANCEL',
    content: 'Delete ${rowData.name}?',
    title: 'Confirm Delete'
  },
  event: {
    name: 'deleteItem',
    via: 'component',
    component: 'component.fqn',
    paramsMap: { 'rowData.id': 'itemId' }
  }
}
```

### Conditional Action
```typescript
{
  key: 'pause',
  icon: 'pause',
  title: 'Pause',
  disabled: '${rowData.status !== "RUNNING"}',
  event: { /* ... */ }
}
```

## Conditional Row Styling

```typescript
conditionalRowStyling: [
  {
    field: 'status',
    condition: 'FAILED',
    style: {
      backgroundColor: '#ffebee',
      borderLeft: '4px solid #f44336'
    }
  },
  {
    field: 'isActive',
    condition: 'false',
    style: { opacity: 0.6 }
  }
]
```

## Color Reference

| Status | Hex | Use |
|--------|-----|-----|
| Success | `#4caf50` | Active, Completed, Success |
| Error | `#f44336` | Failed, Error, Critical |
| Warning | `#ff9800` | Paused, Warning, High |
| Info | `#2196f3` | Running, Info, Primary |
| Inactive | `#757575` | Disabled, Inactive, Cancelled |

## Icon Reference

| Use | Icon |
|-----|------|
| Success | `check_circle` |
| Error | `error` |
| Running | `play_circle` |
| Paused | `pause_circle` |
| Cancelled | `cancel` |
| Pending | `schedule` |
| View | `visibility` |
| Edit | `edit` |
| Delete | `delete` |
| Add | `add` |

## Base UI Schema Template

```typescript
const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: "div",
    showSubmit: false,
    showRefresh: true,
    toolbarPosition: "top",
    showSchemaSelectorInToolbar: true,
    schemaSelector: { variant: 'icon-button' }
  },
  'ui:title': null,
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { items: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 } }
  ]
};
```

## MaterialTable Options Template

```typescript
const MaterialTableUIOptions = {
  showLabel: false,
  allowAdd: true,
  allowDelete: true,
  search: true,
  columns: [ /* ... */ ],
  remoteData: true,
  query: 'queryName',
  rowStyle: {},
  altRowStyle: { backgroundColor: '#fafafa' },
  selectedRowStyle: { backgroundColor: '#e3f2fd' },
  conditionalRowStyling: [ /* ... */ ],
  options: {
    selection: true,
    search: true,
    grouping: true,
    filtering: true,
    exportButton: true,
    columnsButton: true,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100]
  },
  headerStyle: {
    backgroundColor: '#f5f5f5',
    fontWeight: 600,
    borderBottom: '2px solid #e0e0e0'
  },
  actions: [ /* ... */ ],
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'items': 'data'
  },
  variables: {
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize'
  }
};
```

## Checklist for New Grid Forms

- [ ] Create folder with: index.ts, schema.ts, uiSchema.ts, graphql.ts, version.ts
- [ ] Define BaseUISchema with form toolbar config
- [ ] Define MaterialTableUIOptions with columns
- [ ] Add at least 3 visual column types (badge, time, etc.)
- [ ] Add conditional row styling for important states
- [ ] Add row actions with confirmations for destructive ops
- [ ] Define List view alternative
- [ ] Create GraphQL queries with pagination
- [ ] Create GraphQL mutations for actions
- [ ] Add refresh events for real-time updates
- [ ] Export from parent index.ts
- [ ] Test with empty, small, and large datasets
- [ ] Verify all actions work correctly
- [ ] Check mobile/responsive layout
