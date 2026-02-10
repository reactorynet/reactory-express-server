# ApplicationUsers Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION USERS FORM                       │
│                   core.ApplicationUsers@1.0.0                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENT STRUCTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │       ApplicationUsersToolbar (Custom Component)        │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  • Search Input                                        │   │
│  │  • Clear Button                                        │   │
│  │  • Filter Menu (Active/Inactive/Deleted)              │   │
│  │  • Action Buttons (Add, Export, Refresh)              │   │
│  │  • Info Badges (Total Users, Selected Count)          │   │
│  └────────────────────────────────────────────────────────┘   │
│                          ▼                                      │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         MaterialTableWidget (Data Grid)                 │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  Columns:                                              │   │
│  │    1. User (Avatar + Name) → UserAvatarWidget         │   │
│  │    2. Email (Copyable) → LabelComponent               │   │
│  │    3. Mobile → LabelComponent                         │   │
│  │    4. Roles → TagListComponent                        │   │
│  │    5. Status → StatusBadgeWidget                      │   │
│  │    6. Last Login → DateTimeComponent                  │   │
│  │    7. Created → DateTimeComponent                     │   │
│  │    8. Actions → Edit, Enable/Disable                  │   │
│  │                                                         │   │
│  │  Features:                                             │   │
│  │    • Row Selection (Multi-select)                     │   │
│  │    • Detail Panels (Expandable)                       │   │
│  │    • Pagination Controls                              │   │
│  │    • Remote Data Loading                              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌──────────────┐
│     USER     │
│  INTERACTION │
└──────┬───────┘
       │
       │ (1) Search/Filter/Paginate
       ▼
┌────────────────────────┐
│  ApplicationUsers      │
│  Toolbar Component     │
│                        │
│  • Captures Input      │
│  • Updates Variables   │
└────────┬───────────────┘
         │
         │ (2) onQueryChange()
         ▼
┌────────────────────────┐
│  MaterialTableWidget   │
│                        │
│  • Query Variables     │
│  • Triggers GraphQL    │
└────────┬───────────────┘
         │
         │ (3) GraphQL Query
         ▼
┌─────────────────────────────────────────────┐
│            GRAPHQL LAYER                     │
├─────────────────────────────────────────────┤
│  Query: ReactoryClientApplicationUsers      │
│                                              │
│  Variables:                                  │
│    • clientId: String!                       │
│    • filter: ReactoryUserFilterInput        │
│    • paging: PagingRequest                   │
└────────┬─────────────────────────────────────┘
         │
         │ (4) Route to Resolver
         ▼
┌─────────────────────────────────────────────┐
│           RESOLVER LAYER                     │
├─────────────────────────────────────────────┤
│  ReactoryClientResolver                      │
│                                              │
│  @query("ReactoryClientApplicationUsers")   │
│  async clientApplicationUsers() {            │
│    const { clientId, filter, paging } = args│
│    return userService                        │
│      .getUsersByClientMembership(...)        │
│  }                                           │
└────────┬─────────────────────────────────────┘
         │
         │ (5) Call Service Method
         ▼
┌─────────────────────────────────────────────┐
│            SERVICE LAYER                     │
├─────────────────────────────────────────────┤
│  UserService                                 │
│                                              │
│  getUsersByClientMembership(clientId, paging)│
│    • Validate input                          │
│    • Build MongoDB query                     │
│    • Apply filters                           │
│    • Execute with pagination                 │
│    • Sort results                            │
└────────┬─────────────────────────────────────┘
         │
         │ (6) MongoDB Query
         ▼
┌─────────────────────────────────────────────┐
│           DATABASE LAYER                     │
├─────────────────────────────────────────────┤
│  MongoDB - Users Collection                  │
│                                              │
│  Query:                                      │
│  {                                           │
│    "memberships.clientId": ObjectId(...)    │
│    "deleted": { $ne: true }                 │
│  }                                           │
│                                              │
│  Sort: { lastName: 1, firstName: 1 }        │
│  Limit: pageSize                             │
│  Skip: (page - 1) * pageSize                │
└────────┬─────────────────────────────────────┘
         │
         │ (7) Return Results
         ▼
┌─────────────────────────────────────────────┐
│          RESPONSE STRUCTURE                  │
├─────────────────────────────────────────────┤
│  {                                           │
│    paging: {                                 │
│      page: 1,                                │
│      pageSize: 10,                           │
│      total: 125,                             │
│      hasNext: true                           │
│    },                                        │
│    users: [                                  │
│      {                                       │
│        id, firstName, lastName, email,       │
│        avatar, mobileNumber, memberships,    │
│        createdAt, updatedAt, lastLogin       │
│      },                                      │
│      ...                                     │
│    ],                                        │
│    totalUsers: 125                           │
│  }                                           │
└────────┬─────────────────────────────────────┘
         │
         │ (8) Render in Table
         ▼
┌─────────────────────────────────────────────┐
│            UI RENDERING                      │
├─────────────────────────────────────────────┤
│  • Map data to table rows                   │
│  • Render custom components per column      │
│  • Display pagination controls              │
│  • Update toolbar with counts               │
│  • Enable row actions                        │
└──────────────────────────────────────────────┘
```

## File Dependencies

```
ApplicationUsers/index.ts (Main Entry)
  │
  ├─► version.ts (1.0.0)
  │
  ├─► schema.ts (JSON Schema)
  │     └─► Defines form data structure
  │
  ├─► uiSchema.ts (UI Configuration)
  │     ├─► MaterialTableWidget options
  │     ├─► Column definitions
  │     ├─► Custom renderers
  │     └─► Action definitions
  │
  ├─► graphql.ts (Query Definitions)
  │     └─► ReactoryClientApplicationUsers query
  │
  └─► modules/index.ts (Component Registration)
        └─► ApplicationUsersToolbar
              └─► components/ApplicationUsersToolbar.tsx
```

## Integration Points

```
┌────────────────────────────────────────────────────────┐
│              INTEGRATION SCENARIOS                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│  1. STANDALONE ROUTE                                   │
│     ┌────────────────────────────────────┐           │
│     │ Route: /applications/:id/users     │           │
│     │ Component: ApplicationUsers        │           │
│     │ Props: { clientId: routeParam }    │           │
│     └────────────────────────────────────┘           │
│                                                         │
│  2. TAB IN APPLICATION FORM                            │
│     ┌────────────────────────────────────┐           │
│     │ Application Form                   │           │
│     │   ├─ Overview Tab                  │           │
│     │   ├─ Settings Tab                  │           │
│     │   ├─ Users Tab ◄─── NEW           │           │
│     │   │   └─ ApplicationUsers Form     │           │
│     │   └─ Routes Tab                    │           │
│     └────────────────────────────────────┘           │
│                                                         │
│  3. EMBEDDED WIDGET                                    │
│     ┌────────────────────────────────────┐           │
│     │ Custom Dashboard                   │           │
│     │   ┌──────────────────────┐        │           │
│     │   │ ApplicationUsers     │        │           │
│     │   │ (Embedded Widget)    │        │           │
│     │   └──────────────────────┘        │           │
│     └────────────────────────────────────┘           │
│                                                         │
│  4. PROGRAMMATIC ACCESS                                │
│     ┌────────────────────────────────────┐           │
│     │ const result = await               │           │
│     │   reactory.graphqlQuery(           │           │
│     │     'ReactoryClientApplicationUsers'│          │
│     │     { clientId, paging }           │           │
│     │   )                                │           │
│     └────────────────────────────────────┘           │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌────────────────────────────────────────────┐
│          STATE MANAGEMENT                   │
├────────────────────────────────────────────┤
│                                             │
│  ApplicationUsersToolbar (Local State)     │
│    │                                        │
│    ├─ searchText (controlled input)        │
│    ├─ anchorEl (menu positioning)          │
│    └─ filterAnchorEl (filter menu)         │
│                                             │
│  MaterialTableWidget (Managed State)       │
│    │                                        │
│    ├─ data[] (table data)                  │
│    ├─ paging (pagination state)            │
│    ├─ selectedRows[] (selection)           │
│    ├─ queryVariables (GraphQL vars)        │
│    └─ loading (request state)              │
│                                             │
│  Form Context (Shared State)               │
│    │                                        │
│    ├─ clientId (from props/route)          │
│    ├─ formData (entire form state)         │
│    └─ formContext (additional context)     │
│                                             │
└────────────────────────────────────────────┘
```

## Event Flow

```
USER ACTIONS → COMPONENT HANDLERS → STATE UPDATES → QUERY EXECUTION

1. SEARCH EVENT
   Click Search Button
      ↓
   handleSearch()
      ↓
   Update queryVariables.filter.searchString
      ↓
   onQueryChange('applicationUsers', newVariables)
      ↓
   GraphQL Query Re-execution
      ↓
   Table Data Update

2. PAGINATION EVENT
   Click Page 2
      ↓
   MaterialTable Internal Handler
      ↓
   Update queryVariables.paging.page
      ↓
   GraphQL Query with new page
      ↓
   Table Data Update

3. FILTER EVENT
   Select "Active Users"
      ↓
   handleFilterMenuClick()
      ↓
   Update queryVariables.filter
      ↓
   onQueryChange()
      ↓
   GraphQL Query with filter
      ↓
   Filtered Results Display

4. ROW ACTION EVENT
   Click "Edit User"
      ↓
   Row Action Handler
      ↓
   Open Edit Dialog/Navigate
      ↓
   Load User Details
      ↓
   Display Edit Form
```

## Performance Optimization Points

```
┌────────────────────────────────────────────┐
│        PERFORMANCE OPTIMIZATIONS            │
├────────────────────────────────────────────┤
│                                             │
│  1. QUERY LEVEL                             │
│     • Server-side pagination                │
│     • Indexed MongoDB queries               │
│     • Field selection (only needed fields)  │
│     • Query result caching                  │
│                                             │
│  2. COMPONENT LEVEL                         │
│     • React.memo for expensive components   │
│     • useCallback for event handlers        │
│     • Debounced search input                │
│     • Lazy loading of detail panels         │
│                                             │
│  3. RENDERING LEVEL                         │
│     • Virtualized list (for large datasets) │
│     • Conditional rendering                 │
│     • Efficient re-render prevention        │
│     • Image lazy loading for avatars        │
│                                             │
│  4. DATA LEVEL                              │
│     • Response compression                  │
│     • Minimal data transfer                 │
│     • Efficient data structures             │
│     • Client-side result caching            │
│                                             │
└────────────────────────────────────────────┘
```

## Security Flow

```
┌────────────────────────────────────────────┐
│           SECURITY LAYERS                   │
├────────────────────────────────────────────┤
│                                             │
│  1. AUTHENTICATION                          │
│     User must be logged in                  │
│     Valid session token                     │
│     ↓                                       │
│                                             │
│  2. AUTHORIZATION                           │
│     @roles(["ADMIN"]) decorator             │
│     Context role validation                 │
│     ↓                                       │
│                                             │
│  3. DATA FILTERING                          │
│     Only users with clientId membership     │
│     Exclude soft-deleted users              │
│     ↓                                       │
│                                             │
│  4. FIELD MASKING                           │
│     No password fields                      │
│     No sensitive authentication data        │
│     ↓                                       │
│                                             │
│  5. RATE LIMITING                           │
│     API rate limits                         │
│     Request throttling                      │
│                                             │
└────────────────────────────────────────────┘
```

## Extension Points

```
┌────────────────────────────────────────────┐
│         CUSTOMIZATION POINTS                │
├────────────────────────────────────────────┤
│                                             │
│  1. ADD CUSTOM COLUMNS                      │
│     uiSchema.ts → columns[]                 │
│                                             │
│  2. ADD CUSTOM FILTERS                      │
│     ApplicationUsersToolbar.tsx             │
│     → Filter menu items                     │
│                                             │
│  3. ADD CUSTOM ACTIONS                      │
│     uiSchema.ts → actions[]                 │
│     → Toolbar actions                       │
│                                             │
│  4. CUSTOM RENDERERS                        │
│     Create new widget component             │
│     Register in modules                     │
│     Reference in column definition          │
│                                             │
│  5. CUSTOM QUERIES                          │
│     graphql.ts → queries object             │
│     Add new query definition                │
│                                             │
│  6. BULK OPERATIONS                         │
│     Add handlers in toolbar                 │
│     Use selectedRows prop                   │
│     Execute batch mutations                 │
│                                             │
└────────────────────────────────────────────┘
```
