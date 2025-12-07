# Data Resolution Patterns in Reactory Forms

## Overview

This document explains the two primary data resolution patterns used in Reactory forms, using the Applications (server-side) and Application (client-side) forms as examples.

## Pattern 1: Server-Side Resolution (Applications Form)

### When to Use
- Data is immediately available when form loads
- Data depends on server-side context (user, permissions, session)
- No need for dynamic data fetching
- List views with pre-computed data
- Static or rarely changing data

### Implementation

```typescript
// Applications/index.ts

interface IApplicationsFormData { 
  greeting: string, 
  applications: { id: string, title: string, avatar: string, url: string }[]
}

const getData = async (
  form: Reactory.Forms.IReactoryForm,
  args: any,
  context: Reactory.Server.IReactoryContext,
  info: any
): Promise<IApplicationsFormData> => {
  // Access server-side context
  let $ids = context.user.memberships.map((m) => m.clientId);
  
  // Query database directly
  const $apps = await ReactoryClient.find({ _id: { $in: $ids }}).exec();
  
  // Transform and return data
  return {
    greeting: i18n.t("forms:reactory.applications.properties.greeting", { user: context.user }),
    applications: $apps.map((a) => ({
      id: a._id.toString(),
      avatar: a.avatar,
      title: i18n.t(a.name, a.name),
      url: a.siteUrl,
      logo: getLogoUrl(a)
    }))
  };
};

const Applications: Reactory.Forms.IReactoryForm = {
  // ...
  defaultFormValue: getData,  // ✅ Function returns data
  schema,
  uiSchema,
  modules
};
```

### Data Flow

```
1. User requests form
   ↓
2. Server calls getData()
   ↓
3. Server queries database
   ↓
4. Server transforms data
   ↓
5. Server sends form + data to client
   ↓
6. Client renders form with data immediately
```

### Advantages
✅ Immediate data availability  
✅ No loading states needed  
✅ Server-side access control  
✅ Can use server-side i18n  
✅ Faster perceived performance  
✅ SEO-friendly (server-rendered data)

### Disadvantages
❌ Data is static after form loads  
❌ Requires server round-trip to refresh  
❌ Couples data logic to form definition  
❌ Less flexible for dynamic updates

## Pattern 2: Client-Side Resolution (Application Form)

### When to Use
- Data depends on user interaction (IDs, filters)
- Detail views that need specific records
- Forms that need real-time updates
- Data that changes frequently
- Progressive data loading

### Implementation

```typescript
// Application/graphql.ts

const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: {
    name: 'ReactoryClientById',
    text: `
      query ReactoryClientById($id: String!) {
        ReactoryClientById(id: $id) {
          id
          name
          key
          description
          avatar
          siteUrl
          version
          # ... more fields
        }
      }`,
    variables: {
      'props.applicationId': 'id',  // Maps prop to GraphQL variable
    },
    resultType: 'object',
    resultMap: {
      'id': 'overview.id',
      'name': 'overview.name',
      'key': 'overview.key',
      // Maps GraphQL response to form schema
    },
  },
};

// Application/index.ts
const Application: Reactory.Forms.IReactoryForm = {
  // ...
  argsSchema: {
    type: 'object',
    properties: {
      applicationId: {
        type: 'string',
        title: 'Application ID',
        description: 'Required to load application data',
      },
    },
    required: ['applicationId'],
  },
  graphql,  // ✅ GraphQL definition
  schema,
  uiSchema,
  modules
};
```

### Data Flow

```
1. User requests form with applicationId prop
   ↓
2. Client renders form skeleton
   ↓
3. Client executes GraphQL query
   ↓
4. Server resolves GraphQL query
   ↓
5. Server returns data
   ↓
6. Client maps data to form schema
   ↓
7. Client updates form with data
```

### Advantages
✅ Flexible data fetching  
✅ Can be refreshed on demand  
✅ Supports real-time updates  
✅ Decoupled from form definition  
✅ Can use GraphQL subscriptions  
✅ Better for detail views

### Disadvantages
❌ Requires loading states  
❌ Additional network round-trip  
❌ More complex error handling  
❌ Potential for loading flicker

## Comparison Table

| Aspect | Server-Side (defaultFormValue) | Client-Side (GraphQL) |
|--------|-------------------------------|----------------------|
| **Data Availability** | Immediate | After async fetch |
| **Loading State** | Not needed | Required |
| **Refresh** | Reload entire form | Re-execute query |
| **Real-time** | Not supported | Supported (subscriptions) |
| **Props Required** | None | Yes (for query variables) |
| **SEO** | Excellent | Limited |
| **Complexity** | Lower | Higher |
| **Flexibility** | Lower | Higher |
| **Best For** | Lists, static data | Details, dynamic data |

## Result Mapping

### Server-Side (Direct Assignment)

```typescript
// Data structure returned IS the form data
const getData = async (): Promise<IApplicationsFormData> => {
  return {
    greeting: "Hello",
    applications: [/* ... */]
  };
};
```

No mapping needed - return value matches schema directly.

### Client-Side (Result Mapping)

```typescript
// GraphQL response needs to be mapped to form schema
const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: {
    resultMap: {
      'id': 'overview.id',              // GraphQL field → Form field
      'name': 'overview.name',
      'ownerTeam': 'team.ownerTeam',
    },
  },
};
```

Maps flat or nested GraphQL response to form schema structure.

## Hybrid Approach

You can combine both patterns:

```typescript
const HybridForm: Reactory.Forms.IReactoryForm = {
  // Server-side provides initial data
  defaultFormValue: async (form, args, context) => ({
    metadata: {
      user: context.user.firstName,
      timestamp: new Date()
    }
  }),
  
  // Client-side fetches detailed data
  graphql: {
    query: {
      name: 'GetDetails',
      text: `query GetDetails($id: String!) { ... }`,
      // Client merges this data with defaultFormValue
    }
  }
};
```

## Best Practices

### For Server-Side Resolution

1. **Keep it Simple**: Direct database queries and simple transformations
2. **Use Context**: Leverage `context.user`, `context.i18n`, etc.
3. **Cache When Possible**: Cache expensive operations
4. **Security First**: Apply access control before returning data
5. **Return Full Data**: Include everything needed for the form

```typescript
const getData = async (form, args, context, info) => {
  // ✅ Use context for user-specific data
  const userId = context.user._id;
  
  // ✅ Apply access control
  if (!context.user.hasRole('ADMIN')) {
    throw new Error('Unauthorized');
  }
  
  // ✅ Return complete data structure
  return {
    field1: value1,
    field2: value2,
    nested: {
      field3: value3
    }
  };
};
```

### For Client-Side Resolution

1. **Define Args Schema**: Clearly specify required props
2. **Map Results**: Use resultMap for nested structures
3. **Handle Loading**: Show appropriate loading states
4. **Handle Errors**: Gracefully handle query failures
5. **Use Variables**: Map props to GraphQL variables

```typescript
const Application: Reactory.Forms.IReactoryForm = {
  // ✅ Define what props are required
  argsSchema: {
    type: 'object',
    properties: {
      applicationId: { type: 'string' }
    },
    required: ['applicationId']
  },
  
  graphql: {
    query: {
      // ✅ Map props to variables
      variables: {
        'props.applicationId': 'id'
      },
      
      // ✅ Map response to schema
      resultMap: {
        'id': 'overview.id',
        'name': 'overview.name'
      }
    }
  }
};
```

## Debugging

### Server-Side Issues

```typescript
const getData = async (form, args, context, info) => {
  try {
    console.log('User:', context.user.email);
    console.log('Args:', args);
    
    const data = await fetchData();
    console.log('Data:', data);
    
    return data;
  } catch (error) {
    console.error('getData error:', error);
    throw error;
  }
};
```

### Client-Side Issues

```typescript
// In browser console:
// 1. Check if query is executing
// Network tab → Look for GraphQL request

// 2. Check variables
// Query payload should include variables from props

// 3. Check response
// Response should match expected GraphQL schema

// 4. Check mapping
// Form data should match resultMap transformation
```

## Performance Considerations

### Server-Side
- Cache expensive operations
- Use database indexes
- Limit returned data
- Consider pagination

### Client-Side
- Use GraphQL field selection (only request needed fields)
- Implement pagination
- Use subscriptions for real-time data
- Cache query results (Apollo, URQL)

## Conclusion

Choose the right pattern based on your use case:

- **Server-Side**: List views, static data, immediate availability
- **Client-Side**: Detail views, dynamic data, real-time updates
- **Hybrid**: Complex forms with both static and dynamic needs

The Applications/Application pattern demonstrates both approaches working together seamlessly.

