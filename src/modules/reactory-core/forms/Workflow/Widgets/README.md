# Workflow Widgets

This directory contains all the widget components used by the Workflow Registry Management form.

## Components

### 1. core.WorkflowDetailsPanel@1.0.0

Main detail panel component with tabbed interface for comprehensive workflow information.

**Features:**
- Header with workflow ID, status badges, and action buttons
- Statistics summary bar
- Tabbed interface with 6 tabs
- Real-time refresh support

**Tabs:**
1. **Overview** - Basic information and metadata
2. **Run History** - Recent execution history (up to 10 instances)
3. **Errors** - Error statistics and failed executions
4. **Schedule** - Scheduled executions for this workflow
5. **Launch** - Execute workflow with custom input
6. **Configuration** - Configuration details and dependencies

**Usage:**
```typescript
{
  componentMap: {
    DetailsPanel: "core.WorkflowDetailsPanel@1.0.0"
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'workflow'
  }
}
```

---

### 2. core.WorkflowOverview@1.0.0

Displays basic workflow information, statistics, and dependencies.

**Shows:**
- Workflow name, namespace, version
- Author and description
- Tags
- Active/Inactive status
- Execution statistics
- Creation/update timestamps
- Dependencies with visual cards

---

### 3. core.WorkflowInstanceHistory@1.0.0

Displays recent execution history with interactive table.

**Features:**
- Fetches last 10 instances via GraphQL
- Status badges with color coding
- Relative time displays
- Duration formatting
- Progress bars
- Click to view instance details
- Link to full instance management

**Auto-refresh:** Uses `refreshKey` prop for manual refresh

---

### 4. core.WorkflowErrors@1.0.0

Shows error statistics and failed execution information.

**Displays:**
- Total failed executions
- Success rate calculation
- Alert for error summary
- Links to instance management for details

---

### 5. core.WorkflowSchedule@1.0.0

Lists scheduled executions for the workflow.

**Features:**
- Fetches all schedules and filters by workflow
- Shows cron expression
- Enabled/disabled status
- Next execution time
- Create new schedule button
- Navigate to schedule management

**Empty State:** Shows "No Schedules" with create button

---

### 6. core.WorkflowLaunch@1.0.0

Execute workflow with custom input parameters.

**Features:**
- JSON input editor with validation
- Execute workflow mutation
- Real-time execution feedback
- Success/error alerts
- View instance after execution
- Loading states

**Input Format:** JSON object for workflow input parameters

---

### 7. core.WorkflowConfiguration@1.0.0

Displays configuration details and dependencies.

**Shows:**
- Basic settings (ID, status, author, dates)
- Runtime settings (timeout, retries, priority, parallelism)
- Dependencies with detailed cards
- Environment variables (if configured)

**Layout:** Responsive grid with organized sections

---

### 8. core.WorkflowManager@1.0.0

Workflow operation module (non-visual component).

**Methods:**
- `toggleWorkflow` - Activate/deactivate workflow
- `executeWorkflow` - Start workflow execution
- `viewInstances` - Navigate to filtered instances

**Usage:**
```typescript
const manager = reactory.getComponent('core.WorkflowManager@1.0.0');
await manager.toggleWorkflow({ workflow });
```

---

## Integration

### In WorkflowRegistryManagement Form

The widgets are integrated via the `modules` array:

```typescript
const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    id: 'core.WorkflowDetailsPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowDetailsPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  // ... other widgets
];
```

### In Grid UISchema

```typescript
{
  componentMap: {
    DetailsPanel: "core.WorkflowDetailsPanel@1.0.0"
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'workflow'
  }
}
```

---

## Data Flow

### 1. Detail Panel Opens
```
Grid Row Clicked → MaterialTable → DetailPanel Component
                                  → Receives `workflow` prop
                                  → Initializes tabs
```

### 2. Tab Navigation
```
User Clicks Tab → setActiveTab → ActiveTabComponent Rendered
                               → Component receives workflow prop
                               → Fetches data (if needed)
```

### 3. Refresh Flow
```
Refresh Button → setRefreshKey → refreshKey changes
              → Components re-fetch data
```

---

## GraphQL Queries Used

### WorkflowInstanceHistory
```graphql
query WorkflowInstances($filter: InstanceFilterInput, $pagination: PaginationInput) {
  workflowInstances(filter: $filter, pagination: $pagination) {
    instances {
      id
      status
      progress
      startTime
      endTime
      duration
      createdBy
      error { message code }
    }
  }
}
```

### WorkflowSchedule
```graphql
query WorkflowSchedules($pagination: PaginationInput) {
  workflowSchedules(pagination: $pagination) {
    schedules {
      id
      workflowName
      nameSpace
      cronExpression
      enabled
      nextExecution
      lastExecution
    }
  }
}
```

### WorkflowLaunch
```graphql
mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
  startWorkflow(workflowId: $workflowId, input: $input) {
    id
    workflowName
    nameSpace
    status
    startTime
  }
}
```

---

## Styling

All components use Material-UI theming for consistent appearance:

- **Background Colors:** `#fafafa` (headers), `#f5f5f5` (sections)
- **Border Colors:** `divider` from theme
- **Status Colors:** Consistent with Grid patterns
- **Typography:** Material variants (h6, subtitle1, body2, caption)
- **Spacing:** MUI sx prop with consistent padding/margin

---

## Error Handling

All components implement error handling:

1. **Try-Catch Blocks** - Wrap async operations
2. **Error States** - Display error messages to user
3. **Logging** - Use `reactory.log()` for debugging
4. **Notifications** - Use `reactory.createNotification()` for feedback

Example:
```typescript
try {
  const result = await reactory.graphqlQuery(...);
  setData(result.data);
} catch (err: any) {
  setError(err.message);
  reactory.log('Error fetching data', err, 'error');
  reactory.createNotification('Failed to load data', { type: 'error' });
}
```

---

## Loading States

Components with async data show loading indicators:

```typescript
const [loading, setLoading] = React.useState(true);

if (loading) {
  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
}
```

---

## Empty States

Components show informative empty states:

```typescript
if (items.length === 0) {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Icon sx={{ fontSize: 48, color: 'text.secondary' }}>icon_name</Icon>
      <Typography variant="h6" color="text.secondary">
        No Data
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Helpful message here
      </Typography>
    </Box>
  );
}
```

---

## Best Practices

1. **Props Validation** - Check for required props
2. **Loading States** - Always show loading indicators
3. **Error States** - Handle and display errors gracefully
4. **Empty States** - Provide helpful empty state messages
5. **Navigation** - Use `reactory.navigation()` for routing
6. **Notifications** - Provide user feedback for actions
7. **Refresh Support** - Implement `refreshKey` prop
8. **Consistent Styling** - Use MUI theme and sx prop
9. **Accessibility** - Use semantic HTML and ARIA labels
10. **TypeScript** - Define proper interfaces for props

---

## Testing Checklist

- [ ] Component renders without errors
- [ ] Loading state displays correctly
- [ ] Error state handles failures gracefully
- [ ] Empty state shows when no data
- [ ] Data fetches and displays correctly
- [ ] User actions trigger appropriate operations
- [ ] Notifications appear for success/error
- [ ] Navigation works correctly
- [ ] Refresh functionality updates data
- [ ] Mobile/responsive layout works

---

## Future Enhancements

1. **Real-time Updates** - WebSocket support for live data
2. **Advanced Filtering** - Filter instances by status, date range
3. **Bulk Operations** - Select and operate on multiple instances
4. **Export Functionality** - Export data to CSV/Excel
5. **Inline Editing** - Edit configuration inline
6. **Drag-and-Drop** - Reorder dependencies
7. **Search** - Search within tab data
8. **Pagination** - Add pagination to long lists
9. **Caching** - Cache frequently accessed data
10. **Optimistic Updates** - Update UI before server response

---

## File Structure

```
Workflow/
├── Widgets/
│   ├── types.ts                              # TypeScript interfaces
│   ├── core.WorkflowDetailsPanel.tsx         # Main detail panel
│   ├── core.WorkflowOverview.tsx             # Overview tab
│   ├── core.WorkflowInstanceHistory.tsx      # History tab
│   ├── core.WorkflowErrors.tsx               # Errors tab
│   ├── core.WorkflowSchedule.tsx             # Schedule tab
│   ├── core.WorkflowLaunch.tsx               # Launch tab
│   ├── core.WorkflowConfiguration.tsx        # Configuration tab
│   └── core.WorkflowManager.ts               # Operations module
└── WorkflowRegistryManagement/
    └── modules/
        └── index.ts                          # Module registration
```

---

## Support

For questions or issues:
- Review this README for component details
- Check the SupportTickets widgets for similar patterns
- Review the GRID_INTERFACE_GUIDE.md for grid integration
- Consult the Reactory API documentation
