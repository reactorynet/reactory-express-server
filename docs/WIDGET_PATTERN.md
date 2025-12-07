# Reactory Widget Pattern Guide

## Overview

Reactory widgets follow a specific pattern that differs from standard React components. This is because widgets are **compiled at runtime** on the server and sent to the client. This document explains the Reactory widget pattern using the ApplicationCard as a reference.

## Key Differences from Standard React Components

### ❌ Standard React Pattern (Don't Use)
```typescript
import React from 'react';
import { Card, Button } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';

const MyComponent = () => {
  return <Card>...</Card>;
};

export default MyComponent;
```

### ✅ Reactory Widget Pattern (Use This)
```typescript
'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

const MyWidget = (props: MyWidgetProps) => {
  const { reactory } = props;
  
  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);
  
  const { Card, Button } = Material.MaterialCore;
  const { Language: LanguageIcon } = Material.MaterialIcons;
  
  return <Card>...</Card>;
};

// Component registration at the bottom
```

## Why This Pattern?

1. **Runtime Compilation**: Widgets are compiled by Rollup on the server at runtime
2. **Dynamic Loading**: Components are loaded dynamically based on form definitions
3. **Version Management**: Reactory manages component versions and dependencies
4. **Sandboxed Execution**: Widgets run in a controlled environment
5. **Hot Reloading**: Changes can be applied without full app restart

## Pattern Elements

### 1. 'use strict' Directive
```typescript
'use strict';
```
Always start widgets with strict mode for better error detection.

### 2. Type-Safe Component Imports Interface
```typescript
interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  ReactRouter?: Reactory.Routing.ReactRouter;
  StaticContent?: Reactory.Client.Components.StaticContentWidget;
}
```
Define an interface for the components you'll retrieve from the Reactory API.

### 3. Props Interface with Reactory API
```typescript
interface MyWidgetProps {
  reactory: Reactory.Client.IReactoryApi;  // ✅ Always include this
  formData?: any;
  schema?: Reactory.Schema.ISchema;
  uiSchema?: Reactory.Schema.IUISchema;
  idSchema?: Reactory.Schema.IDSchema;
  onChange?: (formData: any) => void;
}
```
The `reactory` prop is **mandatory** - it provides access to the Reactory API.

### 4. Get Components via Reactory API
```typescript
const MyWidget = (props: MyWidgetProps) => {
  const { reactory, formData } = props;
  
  // ✅ Get components dynamically
  const { React, Material, ReactRouter } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
    'react-router.ReactRouter',
  ]);
  
  // Destructure what you need
  const { useState, useEffect } = React;
  const { Card, Button, Box } = Material.MaterialCore;
  const { Language: LanguageIcon } = Material.MaterialIcons;
  const { useNavigate } = ReactRouter;
  
  // ... component logic
};
```

### 5. Component Registration
```typescript
const ComponentDefinition = {
  name: 'MyWidget',
  nameSpace: 'myapp',
  version: '1.0.0',
  component: MyWidget,
  roles: ['USER'],
  tags: ['widget', 'custom'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    MyWidget,
    [''],                          // Dependencies
    ComponentDefinition.roles,
    true,                          // Register immediately
    [],                           // Additional metadata
    'widget'                      // Component type
  );
  
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    fqn: FQN,
    componentFqn: FQN,
    component: MyWidget,
  });
}
```

## Available Component Packages

### react.React
```typescript
const { React } = reactory.getComponents(['react.React']);

// Available:
React.useState
React.useEffect
React.useCallback
React.useMemo
React.useRef
React.createElement
React.Fragment
// ... all React hooks and APIs
```

### material-ui.Material
```typescript
const { Material } = reactory.getComponents(['material-ui.Material']);

// Material.MaterialCore - Components
const {
  Box, Card, CardHeader, CardContent, CardActions,
  Button, IconButton, TextField, Typography,
  Grid, Paper, Divider, Avatar, Chip,
  List, ListItem, ListItemText, ListItemAvatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  // ... all MUI components
} = Material.MaterialCore;

// Material.MaterialIcons - Icons
const {
  Language, Email, Settings, People, Business,
  MoreVert, ArrowBack, Close, Check,
  // ... all Material icons
} = Material.MaterialIcons;
```

### react-router.ReactRouter
```typescript
const { ReactRouter } = reactory.getComponents(['react-router.ReactRouter']);

const {
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
  Link,
  Navigate,
} = ReactRouter;
```

### core.StaticContent
```typescript
const { StaticContent } = reactory.getComponents(['core.StaticContent']);

// Usage:
<StaticContent 
  slug="my-content-slug" 
  defaultValue={<p>Default text</p>} 
/>
```

## Common Component Requests

```typescript
// Minimal widget
reactory.getComponents([
  'react.React',
  'material-ui.Material',
]);

// Widget with navigation
reactory.getComponents([
  'react.React',
  'material-ui.Material',
  'react-router.ReactRouter',
]);

// Widget with static content
reactory.getComponents([
  'react.React',
  'material-ui.Material',
  'core.StaticContent',
]);

// Full-featured widget
reactory.getComponents([
  'react.React',
  'material-ui.Material',
  'react-router.ReactRouter',
  'core.StaticContent',
  'reactory.Form',  // For nested forms
]);
```

## Reactory API Features

### Navigation
```typescript
const { reactory } = props;

// Navigate to route
reactory.navigate('/path/to/route');

// Template navigation
reactory.navigate(
  reactory.utils.template('/applications/${id}')({ id: '123' })
);
```

### Translation (i18n)
```typescript
const { reactory } = props;

const text = reactory.i18n.t('namespace:key', { defaultValue: 'Default Text' });
const greeting = reactory.i18n.t('forms:greeting', { user: reactory.user });
```

### User & Permissions
```typescript
const { reactory } = props;

// Current user
const user = reactory.user;

// Check roles
if (reactory.hasRole(['ADMIN', 'MANAGER'])) {
  // Show admin features
}

// Check single role
if (reactory.hasRole('USER')) {
  // Show user features
}
```

### Utilities
```typescript
const { reactory } = props;

// Slugify
const slug = reactory.utils.slugify('My Application Name');
// => 'my-application-name'

// Template strings
const path = reactory.utils.template('/apps/${id}/view')({ id: '123' });
// => '/apps/123/view'

// Date formatting
const formatted = reactory.utils.humanDate.relativeTime(new Date());
// => '2 hours ago'
```

### API Calls
```typescript
const { reactory } = props;

// GraphQL query
const result = await reactory.graphqlQuery('MyQuery', { variables });

// REST API
const response = await reactory.http.get('/api/endpoint');
```

## Complete Widget Example

```typescript
'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  ReactRouter: Reactory.Routing.ReactRouter;
}

interface MyDashboardPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const MyDashboardPanel = (props: MyDashboardPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  // Get components
  const { React, Material, ReactRouter } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
    'react-router.ReactRouter',
  ]);

  // Destructure React
  const { useState, useEffect } = React;

  // Destructure Material-UI
  const {
    Card, CardHeader, CardContent,
    Box, Typography, Button,
  } = Material.MaterialCore;

  const { Dashboard: DashboardIcon } = Material.MaterialIcons;

  // Destructure Router
  const { useNavigate } = ReactRouter;
  const navigate = useNavigate();

  // State
  const [data, setData] = useState(formData || {});

  // Effects
  useEffect(() => {
    if (formData) {
      setData(formData);
    }
  }, [formData]);

  // Handlers
  const handleAction = () => {
    navigate(`/applications/${applicationId}/settings`);
  };

  // Render
  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader 
          avatar={<DashboardIcon />}
          title={reactory.i18n.t('myapp:dashboard.title', { defaultValue: 'Dashboard' })}
          subheader={data.name || 'No name'}
        />
        <CardContent>
          <Typography variant="body1">
            {data.description || 'No description'}
          </Typography>
          <Button onClick={handleAction} sx={{ mt: 2 }}>
            {reactory.i18n.t('myapp:dashboard.configure', { defaultValue: 'Configure' })}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

// Registration
const ComponentDefinition = {
  name: 'MyDashboardPanel',
  nameSpace: 'myapp',
  version: '1.0.0',
  component: MyDashboardPanel,
  roles: ['USER'],
  tags: ['dashboard', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    MyDashboardPanel,
    [''],
    ComponentDefinition.roles,
    true,
    [],
    'widget'
  );
  
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    fqn: FQN,
    componentFqn: FQN,
    component: MyDashboardPanel,
  });
}
```

## Best Practices

### ✅ Do's

1. **Always use 'use strict'**
2. **Get components via reactory.getComponents()**
3. **Define typed interfaces for component imports**
4. **Include reactory in props interface**
5. **Register component at the bottom**
6. **Use FQN format: namespace.Name@version**
7. **Raise loaded event after registration**
8. **Use reactory.i18n for translations**
9. **Use reactory.navigate for routing**
10. **Check permissions with reactory.hasRole()**

### ❌ Don'ts

1. **Don't import React directly**
2. **Don't import Material-UI directly**
3. **Don't use ES6 imports for dependencies**
4. **Don't forget component registration**
5. **Don't hardcode strings (use i18n)**
6. **Don't use window.location (use reactory.navigate)**
7. **Don't skip TypeScript types**
8. **Don't forget the 'use strict' directive**

## Debugging

### Check Component Registration
```typescript
// In browser console
window.reactory.api.getComponents('myapp.MyWidget@1.0.0');
```

### Check Available Components
```typescript
// List all registered components
window.reactory.api.listComponents();
```

### Check Reactory API
```typescript
// Verify reactory is available
console.log(window.reactory);

// Check user
console.log(window.reactory.api.user);

// Check permissions
console.log(window.reactory.api.hasRole(['ADMIN']));
```

## Comparison: ApplicationCard vs Standard Component

### ApplicationCard (Reactory Pattern) ✅
```typescript
'use strict';
const ApplicationCard = (props) => {
  const { reactory } = props;
  const { React, Material } = reactory.getComponents([...]);
  const { Card } = Material.MaterialCore;
  return <Card>...</Card>;
};
// Registration code...
```

### Standard Component ❌
```typescript
import React from 'react';
import { Card } from '@mui/material';
const ApplicationCard = () => {
  return <Card>...</Card>;
};
export default ApplicationCard;
```

The Reactory pattern is required because:
- Components are compiled at runtime
- Dependencies are injected dynamically
- Version management is centralized
- Components can be hot-reloaded

## Migration from Standard to Reactory

If you have a standard React component, follow these steps:

1. Remove all imports
2. Add 'use strict'
3. Add IComponentsImport interface
4. Add reactory to props
5. Get components via reactory.getComponents()
6. Add component registration
7. Test in Reactory environment

This ensures your widgets work correctly in the Reactory framework!

