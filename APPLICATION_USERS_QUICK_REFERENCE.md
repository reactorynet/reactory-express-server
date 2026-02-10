# Application Users - Quick Reference

## Overview
Retrieve and display users who have memberships for a specific ReactoryClient (Application).

## GraphQL Query

### Basic Query
```graphql
query ReactoryClientWithId($id: String!) {
  ReactoryClientWithId(id: $id) {
    id
    name
    users {
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
      }
      totalUsers
    }
  }
}
```

### With Pagination
```graphql
query ReactoryClientWithId($id: String!) {
  ReactoryClientWithId(id: $id) {
    users(paging: { page: 2, pageSize: 20 }) {
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
      }
      totalUsers
    }
  }
}
```

## Service Usage

### TypeScript
```typescript
const userService = context.getService<Reactory.Service.IReactoryUserService>(
  "core.UserService@1.0.0"
);

const result = await userService.getUsersByClientMembership(
  clientId, 
  { page: 1, pageSize: 10 }
);

console.log(`Found ${result.totalUsers} users`);
console.log(`Current page: ${result.paging.page}/${Math.ceil(result.totalUsers / result.paging.pageSize)}`);
console.log(`Users:`, result.users);
```

## Component Usage

### ApplicationUsersPanel Component
The component expects data mapped to `formData`:

```typescript
interface ApplicationUsersPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: {
    users: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatar?: string;
    }>;
    totalUsers: number;
  };
  applicationId?: string;
  mode?: 'view' | 'edit';
}
```

### Usage in Forms
```typescript
// In uiSchema
{
  "ui:widget": "reactory.ApplicationUsersPanel@1.0.0",
  "ui:options": {
    "applicationId": "{{formData.overview.id}}"
  }
}
```

## Response Structure

```typescript
{
  paging: {
    page: 1,           // Current page number
    pageSize: 10,      // Items per page
    total: 25,         // Total count of users
    hasNext: true      // Whether there are more pages
  },
  users: [
    {
      id: "507f1f77bcf86cd799439011",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      avatar: "https://example.com/avatar.jpg"
    },
    // ... more users
  ],
  totalUsers: 25       // Total count (same as paging.total)
}
```

## Database Query Details

### Query Filter
Users are fetched based on their memberships array:
```javascript
{
  'memberships.clientId': ObjectId("507f1f77bcf86cd799439011"),
  deleted: { $ne: true }
}
```

### Sorting
Results are sorted alphabetically by:
1. Last Name (ascending)
2. First Name (ascending)

### Performance Recommendations
For optimal performance, ensure an index exists on the memberships field:
```javascript
db.users.createIndex({ "memberships.clientId": 1 })
```

## Pagination Defaults

| Parameter | Default Value |
|-----------|---------------|
| page      | 1             |
| pageSize  | 10            |

## Error Handling

The service method will throw an `ApiError` if:
- The database query fails
- Invalid clientId is provided
- Connection issues occur

```typescript
try {
  const result = await userService.getUsersByClientMembership(clientId, paging);
} catch (error) {
  console.error('Failed to fetch users:', error.message);
}
```

## Common Use Cases

### 1. Display all users for an application
```graphql
query {
  ReactoryClientWithId(id: "507f1f77bcf86cd799439011") {
    name
    users {
      totalUsers
      users {
        firstName
        lastName
        email
      }
    }
  }
}
```

### 2. Paginate through users
```typescript
let page = 1;
const pageSize = 20;
let hasMore = true;

while (hasMore) {
  const result = await userService.getUsersByClientMembership(
    clientId,
    { page, pageSize }
  );
  
  console.log(`Page ${page}:`, result.users);
  hasMore = result.paging.hasNext;
  page++;
}
```

### 3. Count users without fetching data
```typescript
const result = await userService.getUsersByClientMembership(
  clientId,
  { page: 1, pageSize: 1 }
);

console.log(`Total users: ${result.totalUsers}`);
```

## Related Files

- GraphQL Schema: `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql`
- User Schema: `src/modules/reactory-core/graph/types/User/User.graphql`
- Resolver: `src/modules/reactory-core/resolvers/System/ReactoryClientResolver.ts`
- Service: `src/modules/reactory-core/services/UserService.ts`
- Component: `src/modules/reactory-core/forms/Application/widgets/ApplicationUsersPanel.tsx`
- Form Query: `src/modules/reactory-core/forms/Application/graphql.ts`
