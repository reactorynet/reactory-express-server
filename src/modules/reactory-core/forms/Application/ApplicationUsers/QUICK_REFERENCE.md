# ApplicationUsers Form - Quick Reference

## Basic Usage

### Navigate to Form
```typescript
reactory.navigate(`/application/${clientId}/users`);
```

### Mount as Component
```tsx
<ReactoryForm 
  formDef="core.ApplicationUsers@1.0.0"
  formData={{}}
  formContext={{ clientId: "abc123" }}
/>
```

### Use as Widget
```typescript
{
  "ui:widget": "core.ApplicationUsers@1.0.0",
  "ui:options": {
    "clientId": "${formData.applicationId}"
  }
}
```

## GraphQL Query

```graphql
query ReactoryClientApplicationUsers(
  $clientId: String!
  $filter: ReactoryUserFilterInput
  $paging: PagingRequest
) {
  ReactoryClientApplicationUsers(clientId: $clientId, filter: $filter, paging: $paging) {
    paging { page pageSize total hasNext }
    users { id firstName lastName email avatar mobileNumber ... }
    totalUsers
  }
}
```

## Query Variables

```typescript
{
  clientId: "507f1f77bcf86cd799439011",  // Required
  filter: {
    searchString: "john doe",
    includeDeleted: false
  },
  paging: {
    page: 1,
    pageSize: 10
  }
}
```

## Service Method

```typescript
const userService = context.getService("core.UserService@1.0.0");
const result = await userService.getUsersByClientMembership(
  clientId,
  { page: 1, pageSize: 10 }
);
```

## Table Columns

1. **User** - Avatar + Name
2. **Email** - Copyable
3. **Mobile** - Phone number
4. **Roles** - User roles
5. **Status** - Active/Inactive
6. **Last Login** - Relative time
7. **Created** - Date

## Features

- ✅ Search by name/email
- ✅ Pagination (10, 25, 50, 100)
- ✅ Multi-select rows
- ✅ Row detail panels
- ✅ Custom toolbar
- ✅ Filter active/inactive
- ✅ Export (coming soon)
- ✅ Bulk actions

## Customization

### Add Custom Column
```typescript
// In uiSchema.ts columns array
{
  title: 'Custom',
  field: 'customField',
  width: 150,
  component: 'core.LabelComponent@1.0.0'
}
```

### Add Custom Action
```typescript
// In uiSchema.ts actions array
{
  icon: 'star',
  tooltip: 'Custom Action',
  onClick: (event, rowData) => {
    console.log('Action:', rowData);
  }
}
```

### Add Filter
```typescript
// In ApplicationUsersToolbar.tsx
<MenuItem onClick={() => {
  onQueryChange('applicationUsers', {
    ...queryVariables,
    filter: { customFilter: 'value' }
  });
}}>
  Custom Filter
</MenuItem>
```

## Props (Toolbar Component)

```typescript
{
  reactory: IReactoryApi;
  data: {
    data: any[];
    paging: IPagingResult;
    totalUsers: number;
  };
  queryVariables: any;
  onQueryChange: (query: string, vars: any) => void;
  onRefresh: () => void;
  selectedRows: any[];
}
```

## Form Definition

```typescript
{
  id: 'core.ApplicationUsers@1.0.0',
  name: 'ApplicationUsers',
  nameSpace: 'core',
  version: '1.0.0',
  roles: ['ADMIN'],
  registerAsComponent: true
}
```

## Files

```
ApplicationUsers/
├── index.ts           # Form definition
├── schema.ts          # JSON Schema
├── uiSchema.ts        # UI config + columns
├── graphql.ts         # GraphQL queries
├── components/
│   └── ApplicationUsersToolbar.tsx
└── modules/
    └── index.ts       # Component registration
```

## Common Tasks

### Change Page Size
```typescript
paging: { page: 1, pageSize: 25 }
```

### Search Users
```typescript
filter: { searchString: "john" }
```

### Show Deleted Users
```typescript
filter: { includeDeleted: true }
```

### Navigate on Row Click
```typescript
onRowClick: (event, rowData) => {
  reactory.navigate(`/users/${rowData.id}`);
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No users shown | Check clientId prop |
| Search not working | Verify onQueryChange prop |
| Pagination broken | Check remoteData: true |
| Roles not displayed | Check memberships array |

## Performance Tips

1. Use indexes on `memberships.clientId`
2. Limit page size for large datasets
3. Use server-side pagination
4. Debounce search input
5. Cache query results

## Related Components

- `ApplicationUsersToolbar` - Custom toolbar
- `UserAvatarWidget` - User display
- `StatusBadgeWidget` - Status badges
- `MaterialTableWidget` - Base table

## API Endpoints

- **Query**: `ReactoryClientApplicationUsers`
- **Service**: `core.UserService@1.0.0`
- **Method**: `getUsersByClientMembership()`

## Security

- **Required Role**: `ADMIN`
- **Context**: Authenticated users only
- **Filtering**: Only returns users with membership

## Next Steps

1. Test with your clientId
2. Customize columns as needed
3. Add custom actions
4. Implement export functionality
5. Add bulk operations
