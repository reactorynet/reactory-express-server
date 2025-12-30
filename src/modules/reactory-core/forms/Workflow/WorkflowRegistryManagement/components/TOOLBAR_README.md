# Workflow Registry Toolbar

Custom toolbar component for the Workflow Registry Management grid with Quick Filters, Search, and Advanced Filters.

## Overview

The `WorkflowRegistryToolbar` provides a rich filtering and search experience for workflow management, following the same pattern as `SupportTicketsToolbar`.

## Features

### 1. Search Bar
- **Full-text search** across multiple fields:
  - Workflow name
  - Namespace
  - Description
  - Author
  - Version
  - Tags (array search)
- **Debounced input** (300ms) for performance
- **Help tooltip** with search hints
- **Real-time filtering** as you type

### 2. Quick Filters (6 predefined filters)

#### Active Workflows
- **Icon**: `check_circle`
- **Color**: Success (green)
- **Filter**: `isActive === true`
- **Badge**: Count of active workflows

#### Inactive Workflows
- **Icon**: `cancel`
- **Color**: Default (gray)
- **Filter**: `isActive === false`
- **Badge**: Count of inactive workflows

#### Has Errors
- **Icon**: `error`
- **Color**: Error (red)
- **Filter**: `statistics.failedExecutions > 0`
- **Badge**: Count of workflows with failed executions

#### Never Run
- **Icon**: `play_disabled`
- **Color**: Warning (orange)
- **Filter**: `statistics.totalExecutions === 0`
- **Badge**: Count of workflows never executed

#### Scheduled
- **Icon**: `schedule`
- **Color**: Info (blue)
- **Filter**: `hasSchedule === true`
- **Badge**: Count of workflows with schedules

#### Recently Updated
- **Icon**: `update`
- **Color**: Primary (blue)
- **Filter**: `updatedAt >= 24 hours ago`
- **Badge**: Count of workflows updated in last 24h

### 3. Advanced Filters Panel

Opens a slide-out panel with detailed filtering options:

#### Status
- **Type**: Select (single choice)
- **Options**: Active, Inactive
- **Field**: `isActive`

#### Namespace
- **Type**: Multi-select
- **Options**: Core, Reactory, Custom, System
- **Field**: `nameSpace`
- **Supports**: Multiple namespace selection

#### Tags
- **Type**: Text input (comma-separated)
- **Field**: `tags`
- **Behavior**: Searches within tags array

#### Workflow Name
- **Type**: Text input
- **Field**: `name`
- **Behavior**: Contains match (case-insensitive)

#### Author
- **Type**: Text input
- **Field**: `author`
- **Behavior**: Contains match (case-insensitive)

#### Has Errors (Boolean)
- **Type**: Checkbox
- **Field**: `statistics.failedExecutions`
- **Behavior**: When checked, shows only workflows with errors

#### Never Executed (Boolean)
- **Type**: Checkbox
- **Field**: `statistics.totalExecutions`
- **Behavior**: When checked, shows only workflows never run

## Integration

### In uiSchema.ts

```typescript
const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false, // Disabled - handled by toolbar
  // Custom toolbar component
  components: {
    Toolbar: 'core.WorkflowRegistryToolbar@1.0.0'
  },
  // ... rest of options
}
```

### In modules/index.ts

```typescript
{
  compilerOptions: {},
  id: 'core.WorkflowRegistryToolbar@1.0.0',
  src: fileAsString(path.resolve(__dirname, `../components/WorkflowRegistryToolbar.tsx`)),
  compiler: 'rollup',
  fileType: 'tsx'
}
```

## Dependencies

The toolbar requires these reusable components:

### 1. core.QuickFilters@1.0.0
Generic quick filter button component used in multiple toolbars.

**Props:**
- `filters`: Array of filter definitions
- `onFilterChange`: Callback with active filter IDs
- `variant`: 'buttons' | 'chips'
- `multiSelect`: boolean (false for radio-style behavior)

### 2. core.SearchBar@1.0.0
Generic search bar with debouncing and help tooltip.

**Props:**
- `placeholder`: string
- `onSearch`: Callback with search text
- `initialValue`: string
- `debounceDelay`: number (ms)
- `showHelpTooltip`: boolean
- `helpText`: string
- `fullWidth`: boolean

### 3. core.AdvancedFilterPanel@1.0.0
Slide-out panel for advanced filtering options.

**Props:**
- `open`: boolean
- `onClose`: () => void
- `fields`: Array of field definitions
- `onFilterChange`: Callback with active filters
- `showPresets`: boolean

## Filter Logic

### Quick Filters
- **Single selection**: Only one quick filter can be active at a time
- **Badge counts**: Dynamically calculated from current data
- **Operators supported**:
  - `eq`: Equals
  - `gt`: Greater than
  - `gte`: Greater than or equal
  - `in`: In array
  - `is-null`: Is null/undefined

### Advanced Filters
- **Multiple simultaneous filters**: All filters applied with AND logic
- **Type-specific handling**:
  - **Text**: Contains match (case-insensitive)
  - **Select**: Exact match
  - **Multi-select**: In array
  - **Boolean**: Special logic for computed fields
  - **Date-range**: Greater than/less than comparisons

### Search
- **Global search**: Searches across all configured fields
- **Case-insensitive**: All searches ignore case
- **Array support**: Searches within tags array
- **Partial match**: Uses `includes()` for text matching

## Props Interface

```typescript
interface WorkflowRegistryToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    paging: {
      hasNext: boolean;
      hasPrevious: boolean;
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    selected?: any[] | null;    
  };
  onDataChange?: (filteredData: any[]) => void;
  searchText?: string;
  onSearchChange?: (text: string) => void;
  // Additional optional callbacks...
}
```

## Data Flow

```
User Input → Toolbar Component → Filter/Search Logic → onDataChange → Table Update
```

### 1. Search Flow
```
User types → SearchBar (debounced) → handleSearch
         → Filter originalData → onDataChange(filtered)
         → Table re-renders with filtered data
```

### 2. Quick Filter Flow
```
User clicks filter → QuickFilters → handleQuickFilterChange
                 → Apply filter operator → onDataChange(filtered)
                 → Table re-renders
```

### 3. Advanced Filter Flow
```
User opens panel → Selects filters → Clicks Apply
                → handleAdvancedFilterChange → onDataChange(filtered)
                → Table re-renders
```

## State Management

### Component State
- `advancedPanelOpen`: Boolean - controls advanced filter panel visibility
- `originalData`: Stored on mount - used as base for filtering

### Computed State
- `counts`: Badge counts for quick filters (React.useMemo)

### Parent State
- `searchText`: Optional controlled search text
- `data`: Current table data (filtered or unfiltered)
- `selected`: Currently selected rows

## Styling

```typescript
<Toolbar
  sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 2,
    p: 2,          
  }}
>
```

- **Layout**: Vertical flex layout with 2-unit gap
- **Padding**: 2-unit padding on all sides
- **Background**: Inherits from theme
- **Responsive**: Adapts to container width

## Usage Example

The toolbar is automatically integrated when you set:

```typescript
components: {
  Toolbar: 'core.WorkflowRegistryToolbar@1.0.0'
}
```

The MaterialTable widget will:
1. Render the toolbar at the top
2. Pass necessary props (data, callbacks)
3. Handle filtered data automatically
4. Update pagination based on filtered results

## Comparison to SupportTicketsToolbar

### Similarities
✅ Same component structure
✅ Same filter architecture
✅ Same dependencies (QuickFilters, SearchBar, AdvancedFilterPanel)
✅ Same props interface pattern
✅ Same data flow logic
✅ Same styling approach

### Differences
🔄 **Quick Filters**: Workflow-specific (Active, Has Errors, Never Run, etc.)
🔄 **Advanced Filters**: Workflow-specific fields (namespace, tags, statistics)
🔄 **Search Fields**: Adapted for workflow data model
🔄 **Badge Counts**: Calculated from workflow statistics
🔄 **Filter Operators**: Additional support for nested statistics fields

## Testing

### Quick Filters
- [ ] Click "Active" - shows only active workflows
- [ ] Click "Inactive" - shows only inactive workflows
- [ ] Click "Has Errors" - shows workflows with failed executions
- [ ] Click "Never Run" - shows workflows never executed
- [ ] Click "Scheduled" - shows workflows with schedules
- [ ] Click "Recently Updated" - shows workflows updated in last 24h
- [ ] Badge counts update correctly
- [ ] Only one quick filter active at a time

### Search
- [ ] Search by workflow name
- [ ] Search by namespace
- [ ] Search by description
- [ ] Search by author
- [ ] Search by version
- [ ] Search by tag
- [ ] Debouncing works (300ms delay)
- [ ] Clear search restores full data

### Advanced Filters
- [ ] Panel opens on button click
- [ ] Status filter works
- [ ] Namespace multi-select works
- [ ] Tags search works
- [ ] Name search works
- [ ] Author search works
- [ ] Has Errors checkbox works
- [ ] Never Executed checkbox works
- [ ] Multiple filters combine with AND logic
- [ ] Clear filters restores full data
- [ ] Panel closes properly

### Integration
- [ ] Toolbar renders in table
- [ ] Filtered data updates table
- [ ] Pagination adjusts to filtered count
- [ ] Performance acceptable with large datasets
- [ ] No console errors

## Performance Considerations

### Optimization Techniques
1. **React.useMemo**: Badge counts computed only when data changes
2. **React.useCallback**: Event handlers memoized to prevent re-renders
3. **Debounced Search**: 300ms delay prevents excessive filtering
4. **originalData Reference**: Stored once, reused for filtering

### Best Practices
- Filter logic runs client-side for instant feedback
- For very large datasets (>1000 items), consider server-side filtering
- Badge counts calculated efficiently with single pass
- Array operations optimized with early returns

## Troubleshooting

### Toolbar Not Appearing
**Issue**: Toolbar doesn't render

**Solutions**:
1. Check module registration in `modules/index.ts`
2. Verify `components.Toolbar` set in uiSchema
3. Check browser console for component load errors
4. Restart server to recompile modules

### Dependencies Not Loading
**Issue**: "Loading filters..." message persists

**Solutions**:
1. Verify QuickFilters, SearchBar, AdvancedFilterPanel are registered
2. Check component FQNs match exactly
3. Review browser console for registration errors
4. Ensure components load before form

### Filtering Not Working
**Issue**: Filters don't affect table data

**Solutions**:
1. Check `onDataChange` callback is provided by parent
2. Verify data structure matches filter field paths
3. Review filter operators match data types
4. Check console for JavaScript errors in filter logic

### Badge Counts Wrong
**Issue**: Badge numbers don't match actual counts

**Solutions**:
1. Verify data structure has required fields
2. Check filter logic in `counts` useMemo
3. Ensure `data.data` array is populated
4. Review conditional logic in count calculations

## Future Enhancements

1. **Saved Filters**: Save and restore filter combinations
2. **Filter Presets**: Predefined filter sets (e.g., "Critical Workflows")
3. **Export Filtered Data**: Export current filtered view
4. **Filter History**: Remember recent filters
5. **Filter Sharing**: Share filter configurations via URL
6. **Advanced Operators**: More comparison operators (regex, etc.)
7. **Visual Filter Builder**: Drag-and-drop filter construction
8. **Filter Templates**: Reusable filter patterns
9. **Real-time Updates**: Auto-refresh filtered data
10. **Analytics**: Track popular filters

## Summary

The WorkflowRegistryToolbar provides a powerful, user-friendly filtering experience that matches the SupportTickets pattern while being customized for workflow management needs. It supports quick filters for common scenarios, full-text search across all fields, and advanced filtering for complex queries.

Key advantages:
- ✅ Instant client-side filtering
- ✅ Intuitive UI with badges and tooltips
- ✅ Flexible filter combinations
- ✅ Reusable components
- ✅ Performant with large datasets
- ✅ Consistent with application patterns
