# Application Forms Integration Guide

## Overview

This guide explains the relationship between the **Applications** (plural) and **Application** (singular) forms in the Reactory framework.

## Form Comparison

| Feature | Applications Form | Application Form |
|---------|------------------|------------------|
| **Purpose** | List all available applications | Detailed view of single application |
| **ID** | `reactory-my-applications` | `reactory-application` |
| **Name** | `MyApplications` | `Application` |
| **Data Resolution** | Server-side (`defaultFormValue`) | Client-side (GraphQL) |
| **Layout** | Grid with cards | Tabbed interface |
| **Input Required** | None (uses user context) | `applicationId` prop |
| **Navigation** | Links to Application form | Tab-based internal navigation |

## Data Flow

```
User Login
    ↓
Applications Form (List View)
    ↓ (User clicks application card)
Application Form (Detail View)
    ↓ (Loads data via GraphQL)
Tabbed Interface
```

## Integration Pattern

### Step 1: Link from Applications to Application

Update the `ApplicationCard` widget in the Applications form to link to the Application dashboard:

```typescript
// In Applications/widgets/ApplicationCard.tsx
const handleMoreClick = () => {
  const { id } = application;
  reactory.navigate(`/applications/${id}`);
};
```

The `moreRoute` in the Applications uiSchema already handles this:

```typescript
// Applications/uiSchema.ts
items: {
  'ui:widget': 'core.ApplicationCard@1.0.0',
  'ui:options': {
    moreRoute: "/applications/${id}"  // ✅ Already configured
  }
}
```

### Step 2: Route Configuration

Add the route in your application router:

```typescript
// Example router configuration
{
  path: '/applications/:applicationId',
  component: () => (
    <ReactoryForm
      formDef={{
        nameSpace: 'reactory',
        name: 'Application',
        version: '1.0.0'
      }}
      props={(match) => ({
        applicationId: match.params.applicationId
      })}
    />
  )
}
```

### Step 3: Back Navigation

Add a back button in the Application form to return to the Applications list:

```typescript
// In ApplicationOverviewPanel.tsx
import { IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const handleBack = () => {
  reactory.navigate('/applications');
};

// In render:
<IconButton onClick={handleBack}>
  <ArrowBack />
</IconButton>
```

## Example Usage

### Applications Form (List)

```typescript
import { ReactoryForm } from '@reactory/client-core/components';

const ApplicationsList = () => {
  return (
    <ReactoryForm
      formDef={{
        nameSpace: 'reactory',
        name: 'MyApplications',
        version: '1.0.0'
      }}
    />
  );
};
```

### Application Form (Detail)

```typescript
import { ReactoryForm } from '@reactory/client-core/components';
import { useParams } from 'react-router-dom';

const ApplicationDetail = () => {
  const { applicationId } = useParams();
  
  return (
    <ReactoryForm
      formDef={{
        nameSpace: 'reactory',
        name: 'Application',
        version: '1.0.0'
      }}
      props={{ applicationId }}
    />
  );
};
```

## Data Resolution Differences

### Applications Form (Server-Side)

```typescript
// Applications/index.ts
const getData = async (
  form: Reactory.Forms.IReactoryForm,
  args: any,
  context: Reactory.Server.IReactoryContext,
  info: any
): Promise<IApplicationsFormData> => {
  // Server resolves data
  let $ids = context.user.memberships.map((m) => m.clientId);
  const $apps = await ReactoryClient.find({ _id: { $in: $ids }}).exec();
  
  return {
    greeting: i18n.t("forms:reactory.applications.properties.greeting"),
    applications: $apps.map(/* transform */)
  };
};

// Form definition
const Applications: Reactory.Forms.IReactoryForm = {
  // ...
  defaultFormValue: getData,  // ✅ Server-side resolution
};
```

**Advantages:**
- Data available immediately on form load
- No loading state needed
- Server can apply access control
- Faster initial render

### Application Form (Client-Side GraphQL)

```typescript
// Application/graphql.ts
const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: {
    name: 'ReactoryClientById',
    text: `query ReactoryClientById($id: String!) { ... }`,
    variables: {
      'props.applicationId': 'id',  // ✅ Uses prop as variable
    },
    resultMap: {
      'id': 'overview.id',
      'name': 'overview.name',
      // Map GraphQL response to form schema
    },
  },
};
```

**Advantages:**
- Flexible data fetching
- Can be refreshed on demand
- Supports real-time updates
- Decoupled from form definition

## Tab Navigation

The Application form uses router-based tab navigation:

```typescript
// Application/uiSchema.ts
"ui:tab-options": {
  useRouter: true,
  path: "/applications/${formContext.props.applicationId}?tab=${tab_id}",
}
```

This enables:
- Direct links to specific tabs
- Browser back/forward navigation
- Bookmarkable tab states

Example URLs:
- `/applications/123?tab=overview`
- `/applications/123?tab=users`
- `/applications/123?tab=settings`

## Testing

### Test Applications Form

```bash
# Navigate to applications list
curl http://localhost:3000/api/forms/reactory/MyApplications/1.0.0
```

### Test Application Form

```bash
# Navigate to specific application
curl http://localhost:3000/api/forms/reactory/Application/1.0.0?applicationId=123
```

## Best Practices

1. **Use Applications for Discovery**: Users browse available applications
2. **Use Application for Management**: Users manage specific application details
3. **Consistent Navigation**: Always provide a way back to the list
4. **Loading States**: Handle loading and error states in Application form
5. **Permissions**: Ensure users can only view applications they have access to
6. **Caching**: Consider caching application data to improve performance

## Troubleshooting

### Application card doesn't link to detail view
- Check `moreRoute` in Applications uiSchema
- Verify router configuration includes `/applications/:applicationId`
- Check ApplicationCard click handler implementation

### Application detail view shows no data
- Verify `applicationId` is being passed as prop
- Check GraphQL query is executing (network tab)
- Ensure backend resolver `ReactoryClientById` exists
- Check user has permission to view the application

### Tabs don't switch
- Verify `useRouter: true` in ui:tab-options
- Check router is properly configured
- Ensure query parameter is being updated

## Related Documentation

- [Applications Form README](../Applications/README.md)
- [Application Form README](./README.md)
- [Reactory Forms Documentation](../../../docs/forms.md)
- [TabbedLayout Field](../../../docs/fields/TabbedLayout.md)

