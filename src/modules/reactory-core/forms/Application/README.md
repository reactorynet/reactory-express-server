# Application Dashboard Form

## Overview

The Application Dashboard form is a comprehensive, tabbed interface for viewing and managing a Reactory application. It provides organized access to all aspects of an application including overview information, settings, users, organizations, roles, themes, and statistics.

## Form Structure

### Schema (`schema.ts`)

The schema defines the data structure for the application dashboard, organized into logical sections that correspond to tabs:

- **overview**: Basic application information (name, key, description, URLs, email settings, etc.)
- **settings**: Application configuration and menu definitions
- **users**: User list and total count
- **organizations**: Organization list and total count
- **roles**: Role definitions and total count
- **themes**: Theme configurations and active theme
- **statistics**: Usage metrics (active users, sessions, average duration, last activity)

### UI Schema (`uiSchema.ts`)

The UI schema uses the `TabbedLayout` field to organize the form into tabs. Each tab is mapped to a custom widget panel:

1. **Overview Tab**: Displays basic application information
2. **Settings Tab**: Shows application configuration
3. **Users Tab**: Lists application users
4. **Organizations Tab**: Shows organizations
5. **Roles Tab**: Displays roles and permissions
6. **Themes Tab**: Theme management
7. **Statistics Tab**: Usage metrics and analytics

### GraphQL Definition (`graphql.ts`)

The form uses GraphQL to fetch application data by ID. The query structure:

- **Query Name**: `ReactoryClientById`
- **Input**: Application ID (passed via props as `applicationId`)
- **Result Mapping**: Maps GraphQL response to form data structure

### Widgets

Custom React widgets for each tab panel:

1. **ApplicationOverviewPanel**: Displays application details with cards for basic info and email/auth settings
2. **ApplicationSettingsPanel**: Shows configuration and menus
3. **ApplicationUsersPanel**: Lists users with avatars and email
4. **ApplicationOrganizationsPanel**: Displays organizations
5. **ApplicationRolesPanel**: Shows roles and descriptions
6. **ApplicationThemesPanel**: Theme cards with color swatches
7. **ApplicationStatisticsPanel**: Metric cards with icons

## Usage

### Props Required

The form requires an `applicationId` prop to function:

```typescript
{
  applicationId: "string" // The ID of the ReactoryClient to load
}
```

### Integration Example

```typescript
import { ReactoryForm } from '@reactory/client-core/components';

const ApplicationDashboard = ({ applicationId }) => {
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

### Routing

The form supports tab routing via query parameters:

```
/applications/{applicationId}?tab=overview
/applications/{applicationId}?tab=settings
/applications/{applicationId}?tab=users
/applications/{applicationId}?tab=organizations
/applications/{applicationId}?tab=roles
/applications/{applicationId}?tab=themes
/applications/{applicationId}?tab=statistics
```

## Comparison with Applications Form

### Applications Form (Plural)
- **Purpose**: List all applications available to the user
- **Data Resolution**: Server-side via `defaultFormValue` function
- **Layout**: Grid layout with application cards
- **Navigation**: Links to individual application dashboards

### Application Form (Singular)
- **Purpose**: Detailed view of a single application
- **Data Resolution**: Client-side via GraphQL query
- **Layout**: Tabbed layout with specialized panels
- **Navigation**: Tab-based navigation within the application

## Data Flow

1. **Form Load**: Form receives `applicationId` prop
2. **GraphQL Query**: Executes `ReactoryClientById` query with the ID
3. **Data Mapping**: Maps GraphQL response to form schema using `resultMap`
4. **Render**: Each tab panel receives its section of the mapped data
5. **Tab Navigation**: Router updates query parameter when tabs change

## Extending the Form

### Adding a New Tab

1. **Update Schema**: Add a new property to the schema
   ```typescript
   myNewSection: {
     type: "object",
     properties: { /* ... */ }
   }
   ```

2. **Update UI Schema**: Add tab definition
   ```typescript
   "ui:tab-layout": [
     // ... existing tabs
     {
       field: "myNewSection",
       icon: "my_icon",
       title: "My Section",
     }
   ]
   ```

3. **Create Widget**: Create a new panel component
   ```typescript
   // widgets/MyNewSectionPanel.tsx
   const MyNewSectionPanel: React.FC = ({ formData }) => {
     // Implementation
   };
   ```

4. **Register Widget**: Add to widgetMap in index.ts
   ```typescript
   widgetMap: [
     // ... existing widgets
     {
       componentFqn: 'reactory.MyNewSectionPanel@1.0.0',
       widget: 'MyNewSectionPanel',
     }
   ]
   ```

5. **Add Module**: Register in modules/index.ts
   ```typescript
   {
     id: 'reactory.MyNewSectionPanel@1.0.0',
     src: fileAsString(path.resolve(__dirname, `../widgets/MyNewSectionPanel.tsx`)),
     compiler: 'rollup',
     fileType: 'tsx'
   }
   ```

### Updating GraphQL Query

To add new fields to the query:

1. Update the query text in `graphql.ts`
2. Add corresponding result mappings
3. Ensure the backend GraphQL resolver returns the new fields

## Best Practices

1. **Keep Panels Focused**: Each panel should handle one logical section
2. **Use Material-UI Components**: Maintain consistent styling
3. **Handle Loading States**: Show appropriate feedback while data loads
4. **Error Handling**: Gracefully handle missing or invalid data
5. **Responsive Design**: Ensure panels work on all screen sizes
6. **TypeScript Types**: Define proper interfaces for props and data

## Troubleshooting

### Data Not Loading
- Verify `applicationId` is being passed correctly
- Check GraphQL query is executing (network tab)
- Ensure backend resolver is returning data

### Tabs Not Switching
- Verify router integration is working
- Check console for routing errors
- Ensure `ui:tab-options` is configured correctly

### Widget Not Rendering
- Verify widget is registered in widgetMap
- Check module is included in modules array
- Look for compilation errors in console

## Related Forms

- **Applications** (`reactory.MyApplications`): List view of all applications
- **ApplicationCard**: Widget used in Applications list view

