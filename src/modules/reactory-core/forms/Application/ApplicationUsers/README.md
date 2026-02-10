# Application Users Form

## Overview
The ApplicationUsers form provides a comprehensive interface for managing users within a specific ReactoryClient (Application). It features advanced search, filtering, pagination, and bulk operations.

## Features

### ✨ Core Capabilities
- **Advanced Search**: Real-time search by name, email, or other user attributes
- **Pagination**: Configurable page sizes (10, 25, 50, 100 users per page)
- **Sorting**: Sort by any column (name, email, last login, created date, etc.)
- **Row Selection**: Multi-select for bulk operations
- **Detail Panels**: Expandable rows showing detailed user information
- **Custom Toolbar**: Rich toolbar with search, filters, and actions

### 🔍 Search & Filtering
- **Text Search**: Search across name and email fields
- **Active/Inactive Filter**: Toggle between active and inactive users
- **Include Deleted**: Option to show soft-deleted users
- **Real-time Updates**: Search executes on Enter or button click

### 📊 Data Display
The table displays the following columns:
1. **User** - Avatar with full name
2. **Email** - Copyable email address
3. **Mobile** - Phone number (if available)
4. **Roles** - User roles within the application
5. **Status** - Active/Inactive badge
6. **Last Login** - Relative time (e.g., "2 days ago")
7. **Created** - User creation date

### ⚡ Actions
- **Row Actions**:
  - Edit user details
  - Enable/Disable user
  - View full profile
- **Toolbar Actions**:
  - Add new user
  - Export users (CSV/Excel)
  - Refresh data
  - Apply filters

## Usage

### Basic Usage

#### Mounting the Form
```typescript
// Via Navigation
reactory.navigate('/application/:clientId/users');

// Via Component Mount
<ReactoryForm 
  formDef="core.ApplicationUsers@1.0.0"
  formData={{}}
  formContext={{
    clientId: "507f1f77bcf86cd799439011"
  }}
/>
```

#### As a Widget
```typescript
// In uiSchema
{
  "ui:widget": "core.ApplicationUsers@1.0.0",
  "ui:options": {
    "clientId": "${formData.applicationId}"
  }
}
```

### GraphQL Query

The form uses the `ReactoryClientApplicationUsers` query:

```graphql
query ReactoryClientApplicationUsers(
  $clientId: String!
  $filter: ReactoryUserFilterInput
  $paging: PagingRequest
) {
  ReactoryClientApplicationUsers(
    clientId: $clientId
    filter: $filter
    paging: $paging
  ) {
    paging {
      page
      pageSize
      total
      hasNext
    }
    users {
      id
      firstName
      lastName
      email
      avatar
      mobileNumber
      memberships {
        id
        roles
        enabled
        lastLogin
        created
      }
      createdAt
      updatedAt
      lastLogin
    }
    totalUsers
  }
}
```

### Query Variables

```typescript
{
  clientId: "507f1f77bcf86cd799439011",  // Required
  filter: {
    searchString: "john",                  // Optional
    includeDeleted: false                  // Optional
  },
  paging: {
    page: 1,                               // Optional (default: 1)
    pageSize: 10                           // Optional (default: 10)
  }
}
```

## Components

### 1. ApplicationUsersToolbar
Custom toolbar component providing search and action buttons.

**Location**: `components/ApplicationUsersToolbar.tsx`

**Features**:
- Search bar with clear button
- Quick filter menu
- Bulk action buttons
- Export functionality
- Add user button

**Props**:
```typescript
interface ApplicationUsersToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    paging: IPagingResult;
    totalUsers?: number;
  };
  formData: any;
  query: string;
  queryVariables: any;
  onQueryChange?: (query: string, variables: any) => void;
  onRefresh?: () => void;
  selectedRows?: any[];
}
```

### 2. MaterialTableWidget
Uses the MaterialTableWidget with custom configuration.

**Features**:
- Remote data loading
- Server-side pagination
- Custom column renderers
- Row detail panels
- Action buttons per row

## Configuration

### Table Options
```typescript
{
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  selection: true,
  paging: true,
  remoteData: true,
  search: false  // Using custom toolbar search
}
```

### Column Configuration
Each column can use custom components:
- `UserAvatarWidget` - For user display with avatar
- `StatusBadgeWidget` - For status indicators
- `DateTimeComponent` - For date formatting
- `LabelComponent` - For copyable text

## Integration Examples

### 1. Adding to Application Dashboard

Update the Application form's uiSchema to include a tab:

```typescript
// In Application/uiSchema.ts
{
  users: {
    'ui:widget': 'TabPanel',
    'ui:options': {
      tabs: [
        // ... existing tabs
        {
          id: 'users-management',
          label: 'Users',
          icon: 'people',
          component: 'core.ApplicationUsers@1.0.0',
          props: {
            clientId: '${formData.overview.id}'
          }
        }
      ]
    }
  }
}
```

### 2. Standalone Page

Create a route in your client configuration:

```typescript
{
  path: '/applications/:clientId/users',
  componentFqn: 'core.ApplicationUsers@1.0.0',
  exact: true,
  public: false,
  roles: ['ADMIN']
}
```

### 3. Embedded Widget

Use within another form:

```typescript
{
  applicationUsers: {
    'ui:widget': 'core.ApplicationUsers@1.0.0',
    'ui:options': {
      clientId: '${props.applicationId}',
      defaultPageSize: 25,
      showToolbar: true
    }
  }
}
```

## API Reference

### Service Method
```typescript
// UserService.getUsersByClientMembership
const result = await userService.getUsersByClientMembership(
  clientId: string,
  paging?: { page?: number; pageSize?: number }
);

// Returns:
{
  paging: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  },
  users: IUserDocument[],
  totalUsers: number
}
```

### GraphQL Resolver
```typescript
// ReactoryClientResolver.clientApplicationUsers
@roles(["ADMIN"])
@query("ReactoryClientApplicationUsers")
async clientApplicationUsers(obj: any, args: any, context: IReactoryContext) {
  const { clientId, filter, paging } = args;
  const userService = context.getService("core.UserService@1.0.0");
  return userService.getUsersByClientMembership(clientId, paging);
}
```

## Customization

### Custom Columns
Add or modify columns in `uiSchema.ts`:

```typescript
{
  title: 'Custom Field',
  field: 'customField',
  width: 150,
  component: 'core.LabelComponent@1.0.0',
  props: {
    uiSchema: {
      'ui:options': {
        format: '${rowData.customField}'
      }
    }
  }
}
```

### Custom Actions
Add bulk actions in the toolbar:

```typescript
const handleBulkAction = useCallback((action: string) => {
  const selectedIds = selectedRows.map(row => row.id);
  // Perform bulk action
}, [selectedRows]);
```

### Custom Filters
Extend the filter menu in `ApplicationUsersToolbar.tsx`:

```typescript
<MenuItem onClick={() => {
  if (onQueryChange) {
    onQueryChange('applicationUsers', {
      ...queryVariables,
      filter: { 
        ...queryVariables?.filter, 
        customFilter: 'value' 
      }
    });
  }
}}>
  Custom Filter
</MenuItem>
```

## Performance Considerations

### Optimization Strategies
1. **Server-side Pagination**: All data loading is paginated
2. **Lazy Loading**: Users are loaded on-demand
3. **Debounced Search**: Search input is debounced to reduce API calls
4. **Efficient Queries**: Only necessary fields are fetched
5. **Index Usage**: Leverages MongoDB indexes on `memberships.clientId`

### Recommended Indexes
```javascript
// User collection
db.users.createIndex({ "memberships.clientId": 1 });
db.users.createIndex({ "email": 1 });
db.users.createIndex({ "lastName": 1, "firstName": 1 });
db.users.createIndex({ "lastLogin": -1 });
```

## Troubleshooting

### Common Issues

#### 1. No Users Displayed
**Problem**: Table shows "No records to display"
**Solutions**:
- Verify clientId is being passed correctly
- Check user memberships contain the clientId
- Ensure user has ADMIN role
- Check GraphQL query in Network tab

#### 2. Search Not Working
**Problem**: Search doesn't filter results
**Solutions**:
- Ensure `onQueryChange` prop is provided
- Check search query variables are being sent
- Verify backend search implementation
- Check for console errors

#### 3. Pagination Issues
**Problem**: Pagination buttons not working
**Solutions**:
- Verify `remoteData: true` is set
- Check paging variables are being sent
- Ensure backend returns correct paging metadata
- Check `hasNext` value in response

## File Structure

```
ApplicationUsers/
├── index.ts                          # Form definition
├── version.ts                        # Version number
├── schema.ts                         # JSON Schema
├── uiSchema.ts                       # UI Schema with table config
├── graphql.ts                        # GraphQL queries
├── modules/
│   └── index.ts                      # Module registration
└── components/
    └── ApplicationUsersToolbar.tsx   # Custom toolbar component
```

## Related Documentation

- [SupportTickets Form](../Support/SupportTickets/README.md) - Similar implementation pattern
- [UserService Documentation](../../services/UserService/README.md)
- [MaterialTableWidget](../../widgets/MaterialTableWidget/README.md)
- [GraphQL Schema](../../graph/types/System/ReactoryClient/README.md)

## Version History

### 1.0.0 (Current)
- Initial release
- Basic user listing with pagination
- Search and filter capabilities
- Custom toolbar
- Row actions and detail panels
- Multi-select support
