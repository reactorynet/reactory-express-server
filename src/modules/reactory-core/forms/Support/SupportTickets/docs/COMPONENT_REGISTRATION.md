# Component Registration via window.reactory.api

**Date:** December 23, 2025  
**Additional Fix:** Added proper component registration pattern

## The Issue

Server-side widgets must self-register with the Reactory component registry at runtime using `window.reactory.api.registerComponent()` and raise a `loaded` event. This wasn't implemented in the initial SupportTicketsToolbar.

## The Pattern

All server-side widgets follow this pattern:

```typescript
const MyWidget = (props) => {
  // Component implementation
};

// 1. Define component metadata
const Definition: any = {
  name: 'MyWidget',
  nameSpace: 'core',
  version: '1.0.0',
  component: MyWidget,
  roles: ['USER']
}

// 2. Register with window.reactory.api
//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,    // 'core'
    Definition.name,         // 'MyWidget'
    Definition.version,      // '1.0.0'
    MyWidget,                // Component reference
    ['Tags', 'For', 'Search'], // Tags for categorization
    Definition.roles,        // ['USER']
    true,                    // Replace if exists
    [],                      // Dependencies
    'widget'                 // Component type
  );
  
  // 3. Raise loaded event
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: MyWidget 
  });
}

export default MyWidget;
```

## Added to SupportTicketsToolbar

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
    ['Support Tickets', 'Toolbar'],  // Searchable tags
    Definition.roles,
    true,                             // Replace existing
    [],                               // No additional deps
    'widget'                          // Component type
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketsToolbar 
  });
}

export default SupportTicketsToolbar;
```

## Why This Matters

### Runtime Registration
- **Dynamic Loading:** Widget registers itself when loaded in browser
- **Version Management:** Different versions can coexist
- **Hot Reload:** Widget can be replaced at runtime

### Event System
- **Lifecycle Tracking:** System knows when components are loaded
- **Dependency Resolution:** Other components can wait for dependencies
- **Debugging:** Can track component loading order and success

### Component Discovery
- **Searchable Tags:** Makes widget discoverable via tags
- **Role-Based Access:** Respects user roles
- **Type Classification:** Categorized as 'widget' for filtering

## registerComponent API

```typescript
window.reactory.api.registerComponent(
  nameSpace: string,      // Namespace (e.g., 'core', 'custom')
  name: string,          // Component name
  version: string,       // Semantic version
  component: React.ComponentType,  // Component reference
  tags: string[],        // Search/categorization tags
  roles: string[],       // Required roles (e.g., ['USER', 'ADMIN'])
  replace: boolean,      // Replace if already registered
  dependencies: string[], // Additional dependencies
  type: string          // Component type (e.g., 'widget', 'form', 'view')
)
```

## raiseReactoryPluginEvent API

```typescript
window.reactory.api.amq.raiseReactoryPluginEvent(
  eventType: string,     // Event type (e.g., 'loaded', 'unloaded')
  payload: {
    componentFqn: string,  // Fully qualified name: 'namespace.Name@version'
    component: React.ComponentType,  // Component reference
    ...additionalData
  }
)
```

## Component Lifecycle

1. **Server compiles widget** → JavaScript bundle created
2. **Client loads bundle** → Code executes in browser
3. **Registration check** → `if (window?.reactory?.api)` evaluates
4. **Component registers** → `registerComponent()` adds to registry
5. **Event raised** → `raiseReactoryPluginEvent('loaded')` notifies system
6. **Widget available** → Can be accessed via `reactory.getComponents()`

## All Support Widgets Follow This Pattern

| Widget | Registration | Event | Status |
|--------|-------------|-------|--------|
| core.SupportTicketDetailPanel | ✅ | ✅ | Correct |
| core.SupportTicketOverview | ✅ | ✅ | Correct |
| core.SupportTicketComments | ✅ | ✅ | Correct |
| core.SupportTicketAttachments | ✅ | ✅ | Correct |
| core.SupportTicketActivity | ✅ | ✅ | Correct |
| core.SupportTicketRelated | ✅ | ✅ | Correct |
| core.SupportTicketsToolbar | ✅ | ✅ | **Fixed** |

## Verification

### Check Registration in Browser Console
```javascript
// Check if component is registered
window.reactory.api.getComponent('core', 'SupportTicketsToolbar', '1.0.0')
// Should return: SupportTicketsToolbar component

// List all core components
window.reactory.api.getComponents(['core.*'])
```

### Check Event System
```javascript
// Listen for plugin events
window.reactory.api.amq.subscribe('plugin.loaded', (event) => {
  console.log('Plugin loaded:', event.componentFqn);
});
```

## Double Export Issue

The user fixed a duplicate export issue:
```typescript
// ❌ Before (duplicate export)
export default SupportTicketsToolbar;

export default SupportTicketsToolbar;

// ✅ After (single export)
export default SupportTicketsToolbar;
```

## Complete Pattern Checklist

For every server-side widget:

- [x] Use dependency injection via `reactory.getComponents()`
- [x] Define `Definition` object with metadata
- [x] Check for `window?.reactory?.api`
- [x] Call `registerComponent()` with all parameters
- [x] Raise `loaded` event via `raiseReactoryPluginEvent()`
- [x] Use single `default export`
- [x] No duplicate exports

## Benefits

### ✅ Self-Contained
- Widget manages its own registration
- No external registration needed
- Portable across projects

### ✅ Runtime Aware
- Knows when it's loaded
- Can communicate with system
- Lifecycle management

### ✅ Discoverable
- Searchable by tags
- Filterable by type
- Version-aware

### ✅ Debuggable
- Can track loading
- Event system visibility
- Component introspection

---

**Status:** ✅ Complete  
**Pattern:** All server-side widgets must self-register via `window.reactory.api`  
**SupportTicketsToolbar:** Now properly registered and raises loaded event
