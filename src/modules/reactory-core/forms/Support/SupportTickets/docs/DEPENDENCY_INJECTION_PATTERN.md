# Dependency Injection Pattern for Server-Side Widgets

**Date:** December 23, 2025  
**Critical Pattern:** All server-side widgets MUST use dependency injection via `reactory.getComponents()`

## The Problem

Server-side widgets (components compiled on the server and delivered to the client) **cannot** use direct imports because:

1. They're compiled separately from the client bundle
2. The imports aren't available at compile time
3. Direct imports cause bundling conflicts

### ❌ Wrong Approach
```typescript
import React from 'react';
import { Box, Button } from '@mui/material';
import { MyComponent } from '@reactory/client-core/...';

export const MyWidget = ({ reactory }) => {
  const [state] = React.useState(false);
  return <Box><Button><MyComponent /></Button></Box>;
};
```

**Why this fails:**
- `React` isn't in scope when widget is compiled
- `@mui/material` isn't available in server compilation
- `MyComponent` path doesn't exist at compile time

## The Solution: Dependency Injection

### ✅ Correct Pattern

```typescript
import Reactory from '@reactory/reactory-core';

interface MyWidgetDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  MyComponent: any;
}

interface MyWidgetProps {
  reactory: Reactory.Client.IReactoryApi;
  // ... other props
}

const MyWidget = (props: MyWidgetProps) => {
  const { reactory } = props;

  // 1. Get ALL dependencies from registry
  const {
    React,
    Material,
    MyComponent
  } = reactory.getComponents<MyWidgetDependencies>([
    'react.React',              // React library
    'material-ui.Material',     // Material-UI components
    'core.MyComponent'          // Custom components
  ]);

  // 2. Extract Material-UI components
  const { MaterialCore } = Material;
  const { Box, Button, Icon, Typography } = MaterialCore;

  // 3. Check if dependencies loaded
  if (!React || !Material || !MyComponent) {
    return <div>Loading...</div>;
  }

  // 4. Use injected React for hooks
  const [state, setState] = React.useState(false);
  const memoValue = React.useMemo(() => ..., []);

  // 5. Use injected Material-UI components
  return (
    <Box>
      <Button onClick={() => setState(true)}>
        <Icon>add</Icon>
        Click Me
      </Button>
      <MyComponent value={state} />
    </Box>
  );
};

// 6. Define component metadata
const Definition: any = {
  name: 'MyWidget',
  nameSpace: 'core',
  version: '1.0.0',
  component: MyWidget,
  roles: ['USER']
}

// 7. Register with window.reactory.api
//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    MyWidget,
    ['My Widget', 'Tags'],  // Tags for search/categorization
    Definition.roles,
    true,                    // Replace if exists
    [],                      // Dependencies
    'widget'                 // Component type
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: MyWidget 
  });
}

export default MyWidget;
```

## Required Dependencies

### Core Dependencies (Always Needed)

| Dependency | Registry Key | Purpose | Extract As |
|------------|-------------|---------|-----------|
| React | `'react.React'` | React library | `const { React } = ...` |
| Material-UI | `'material-ui.Material'` | MUI components | `const { Material } = ...` |

### Material-UI Component Access

```typescript
const { Material } = reactory.getComponents([...]);
const { MaterialCore } = Material;

// Now extract specific components:
const {
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  Icon,
  Toolbar,
  AppBar,
  // ... any MUI component
} = MaterialCore;
```

### Custom Components

Register in `/src/components/index.tsx`:
```typescript
{
  nameSpace: 'core',
  name: 'MyComponent',
  version: '1.0.0',
  component: MyComponent
}
```

Access in widget:
```typescript
const { MyComponent } = reactory.getComponents(['core.MyComponent']);
```

## Step-by-Step Checklist

### When Creating a Server-Side Widget:

- [ ] Import ONLY `Reactory` from `'@reactory/reactory-core'`
- [ ] Define a `Dependencies` interface with all needed types
- [ ] Call `reactory.getComponents()` with all dependencies
- [ ] Include `'react.React'` for hooks
- [ ] Include `'material-ui.Material'` for UI components
- [ ] Extract `MaterialCore` from `Material`
- [ ] Add loading state check for dependencies
- [ ] Use injected `React` for all hooks (`React.useState`, etc.)
- [ ] Use injected Material-UI components (from `MaterialCore`)
- [ ] Define component `Definition` object with metadata
- [ ] Register via `window.reactory.api.registerComponent()`
- [ ] Raise `loaded` event via `window.reactory.api.amq.raiseReactoryPluginEvent()`
- [ ] Use `default export` (not named export)

### When Creating a Client-Side Component:

- [ ] Import directly: `import React from 'react'`
- [ ] Import directly: `import { Box } from '@mui/material'`
- [ ] Import directly: `import { MyComponent } from './MyComponent'`
- [ ] Register in `/src/components/index.tsx` if needed by server widgets
- [ ] Use named or default export as appropriate

## Real Example: SupportTicketsToolbar

### Dependencies Interface
```typescript
interface SupportTicketsToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  SearchBar: any;
  AdvancedFilterPanel: any;
}
```

### Dependency Resolution
```typescript
const {
  React,
  Material,
  QuickFilters,
  SearchBar,
  AdvancedFilterPanel,
} = reactory.getComponents<SupportTicketsToolbarDependencies>([
  'react.React',
  'material-ui.Material',
  'core.QuickFilters',
  'core.SearchBar',
  'core.AdvancedFilterPanel',
]);

const { MaterialCore } = Material;
const { Box, Button, Icon, Toolbar } = MaterialCore;
```

### Loading Check
```typescript
if (!QuickFilters || !SearchBar || !AdvancedFilterPanel) {
  return (
    <Toolbar sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Box>Loading filters...</Box>
    </Toolbar>
  );
}
```

### Using Injected Dependencies
```typescript
// React hooks - use injected React
const [state, setState] = React.useState(false);
const [open, setOpen] = React.useState(false);
const memoValue = React.useMemo(() => { ... }, [deps]);

// Material-UI components - use injected MaterialCore
return (
  <Box>
    <Toolbar>
      <Button onClick={() => setOpen(true)}>
        <Icon>filter_list</Icon>
      </Button>
    </Toolbar>
    <QuickFilters {...props} />
    <SearchBar {...props} />
    <AdvancedFilterPanel open={open} {...props} />
  </Box>
);
```

### Component Registration
```typescript
const Definition: any = {
  name: 'SupportTicketsToolbar',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketsToolbar,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketsToolbar,
    ['Support Tickets', 'Toolbar'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketsToolbar 
  });
}
```

## Common Patterns

### React Hooks
```typescript
const { React } = reactory.getComponents(['react.React']);

// All hooks use injected React
const [state, setState] = React.useState(initialValue);
const [count, setCount] = React.useState(0);
const memoValue = React.useMemo(() => compute(), [deps]);
const callback = React.useCallback(() => { ... }, [deps]);
const ref = React.useRef(null);

React.useEffect(() => {
  // effect logic
}, [deps]);
```

### Material-UI Components
```typescript
const { Material } = reactory.getComponents(['material-ui.Material']);
const { MaterialCore } = Material;
const { 
  Box, 
  Paper,
  Typography,
  Button,
  Icon,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  AppBar,
  Toolbar,
  Chip,
  Badge,
  Avatar,
  Grid,
  Stack,
  Divider,
} = MaterialCore;

return (
  <Paper>
    <AppBar>
      <Toolbar>
        <Typography variant="h6">Title</Typography>
      </Toolbar>
    </AppBar>
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* ... */}
      </Grid>
    </Box>
  </Paper>
);
```

### Custom Components
```typescript
const {
  StatusBadge,
  UserAvatar,
  RelativeTime,
  CountBadge
} = reactory.getComponents([
  'core.StatusBadge',
  'core.UserAvatar',
  'core.RelativeTime',
  'core.CountBadge'
]);

return (
  <Box>
    <StatusBadge status="open" />
    <UserAvatar user={user} />
    <RelativeTime date={date} />
    <CountBadge count={count} />
  </Box>
);
```

## Troubleshooting

### Error: "React is not defined"
❌ You imported React directly  
✅ Use `const { React } = reactory.getComponents(['react.React'])`

### Error: "Box is not defined"
❌ You imported from `@mui/material` directly  
✅ Use:
```typescript
const { Material } = reactory.getComponents(['material-ui.Material']);
const { MaterialCore } = Material;
const { Box } = MaterialCore;
```

### Error: "Component is not a function"
❌ Component not registered in `/src/components/index.tsx`  
✅ Add registration:
```typescript
{
  nameSpace: 'core',
  name: 'YourComponent',
  version: '1.0.0',
  component: YourComponent
}
```

### Widget shows "Loading..." forever
❌ Dependencies not registered or wrong registry key  
✅ Verify:
1. Component is registered in `index.tsx`
2. Registry key matches exactly (e.g., `'core.MyComponent'`)
3. Version is correct (e.g., `@1.0.0` in module name)

## Architecture Benefits

### ✅ Clean Separation
- Client bundle contains all base components
- Server widgets are isolated and independently compiled
- No bundling conflicts or duplicate dependencies

### ✅ Dynamic Loading
- Components can be hot-swapped
- Widgets load dependencies at runtime
- Version management possible

### ✅ Consistency
- Same pattern across all server widgets
- Predictable dependency resolution
- Easy to debug and maintain

### ✅ Type Safety
- TypeScript interfaces for dependencies
- Compile-time checking where possible
- IntelliSense support

## Summary

### Server-Side Widgets (in `forms/*/Widgets/` or `forms/*/components/`)

```typescript
import Reactory from '@reactory/reactory-core';
// NO other imports!

const MyWidget = (props) => {
  const { reactory } = props;
  const { React, Material, MyComponents } = reactory.getComponents([...]);
  // Use injected dependencies
};

const Definition: any = {
  name: 'MyWidget',
  nameSpace: 'core',
  version: '1.0.0',
  component: MyWidget,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    MyWidget,
    ['Tags'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: MyWidget 
  });
}

export default MyWidget;
```

### Client-Side Components (in `src/components/`)

```typescript
import React from 'react';
import { Box } from '@mui/material';
// Direct imports OK!

export const MyComponent = (props) => {
  const [state] = React.useState(false);
  return <Box>{state}</Box>;
};
```

### Registration (in `src/components/index.tsx`)

```typescript
import { MyComponent } from './path/to/MyComponent';

export const componentRegistery = [
  {
    nameSpace: 'core',
    name: 'MyComponent',
    version: '1.0.0',
    component: MyComponent
  }
];
```

---

**This pattern is MANDATORY for all server-side widgets.**  
**Never use direct imports in server-compiled widgets.**  
**Always use `reactory.getComponents()` for dependency injection.**  
**Always register with `window.reactory.api.registerComponent()`.**
