# Application Users Implementation Summary

## Overview
This implementation adds functionality to retrieve users who have memberships for a specific ReactoryClient (Application). The ApplicationUsersPanel component can now display users associated with a particular application.

## Changes Made

### 1. GraphQL Schema Updates

#### File: `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql`
- Added `users` field to the `ReactoryClient` type
- The field accepts optional paging parameters and returns a `UserList` type
```graphql
users(paging: PagingRequest): UserList
```

#### File: `src/modules/reactory-core/graph/types/User/User.graphql`
- Added new `UserList` type definition with the following fields:
  - `paging`: PagingResult - Pagination metadata
  - `users`: [User] - Array of user objects
  - `totalUsers`: Int - Total count of users (ignoring pagination)

### 2. Resolver Updates

#### File: `src/modules/reactory-core/resolvers/System/ReactoryClientResolver.ts`
- Added `users` property resolver to the `ReactoryClientResolver` class
- The resolver calls the UserService method `getUsersByClientMembership` to fetch users
- Automatically passes the client ID and paging parameters

### 3. Service Layer Updates

#### File: `src/modules/reactory-core/services/UserService.ts`
- Added new method: `getUsersByClientMembership(clientId, paging)`
- Implementation details:
  - Queries the User collection for users with matching clientId in their memberships array
  - Excludes deleted users
  - Supports pagination with configurable page size (default: 10)
  - Returns sorted results by lastName, firstName
  - Includes complete paging metadata (page, pageSize, total, totalPages, hasNext, hasPrev)

### 4. TypeScript Type Definitions

#### File: `reactory-core/src/types/index.d.ts`
- Added method signature to `IReactoryUserService` interface
- Method returns a Promise with paging, users array, and totalUsers count

### 5. Form Configuration Updates

#### File: `src/modules/reactory-core/forms/Application/graphql.ts`
- Extended the `ReactoryClientWithId` query to include the `users` field
- Added result mapping for users data:
  - `users.users` → mapped to form data
  - `users.totalUsers` → total user count
  - `users.paging` → pagination metadata

## Data Flow

1. **Query Execution**: When the ApplicationUsersPanel component loads, it executes the `ReactoryClientWithId` GraphQL query with the application ID
2. **Resolver Invocation**: The `ReactoryClientResolver.users` property resolver is invoked
3. **Service Call**: The resolver calls `UserService.getUsersByClientMembership(clientId, paging)`
4. **Database Query**: The service queries the User collection where `memberships.clientId` matches the application ID
5. **Result Mapping**: Results are mapped to the form data structure defined in graphql.ts
6. **Component Rendering**: The ApplicationUsersPanel receives the users array and displays them

## Usage Example

### GraphQL Query
```graphql
query ReactoryClientWithId($id: String!) {
  ReactoryClientWithId(id: $id) {
    id
    name
    users(paging: { page: 1, pageSize: 10 }) {
      paging {
        page
        pageSize
        total
        totalPages
        hasNext
        hasPrev
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

### Programmatic Service Call
```typescript
const userService = context.getService<Reactory.Service.IReactoryUserService>("core.UserService@1.0.0");
const result = await userService.getUsersByClientMembership(clientId, { page: 1, pageSize: 10 });
// result = { paging: {...}, users: [...], totalUsers: 25 }
```

## Component Integration

The `ApplicationUsersPanel` component expects data in the following structure:
```typescript
{
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  }>,
  totalUsers: number
}
```

This data is automatically populated via the form's graphql configuration and result mapping.

## Database Schema

The implementation relies on the User model's `memberships` array structure:
```typescript
memberships: [{
  clientId: ObjectId (ref: 'ReactoryClient'),
  organizationId: ObjectId (ref: 'Organization'),
  businessUnitId: ObjectId (ref: 'BusinessUnit'),
  enabled: Boolean,
  roles: [String],
  lastLogin: Date,
  created: Date
}]
```

## Performance Considerations

- The query uses MongoDB's `countDocuments()` for accurate total counts
- Results are paginated to prevent loading large datasets
- Indexes on `memberships.clientId` would improve query performance
- Default page size is 10, but can be customized via paging parameters

## Future Enhancements

Potential improvements could include:
1. Filtering users by role within the membership
2. Filtering by enabled/disabled status
3. Searching users by name or email
4. Sorting options (by name, email, last login, etc.)
5. Including membership details (roles, last login) in the result
