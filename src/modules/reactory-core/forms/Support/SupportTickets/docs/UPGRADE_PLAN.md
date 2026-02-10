# SupportTickets Form - Upgrade Plan

**Version:** 2.0.0  
**Date:** December 23, 2025  
**Status:** Phase 3 Complete ✅ - Implementing Phase 4  

## Executive Summary

This document outlines a comprehensive upgrade plan to transform the SupportTickets form from a basic grid interface into a high-quality, advanced data management interface that exemplifies best practices for enterprise support ticket systems.

### Goals
- Create a reference implementation for advanced grid interfaces in Reactory
- Implement modern UX patterns for data-heavy applications
- Improve user efficiency and satisfaction
- Demonstrate Reactory's capabilities for complex UI scenarios

### Target Users
- Support agents managing multiple tickets
- Team leads overseeing ticket distribution
- Users submitting and tracking their own tickets
- Administrators monitoring support metrics

---

## Current State Analysis

### ✅ Existing Features
- Basic MaterialTable grid with pagination
- Alternative list view
- Simple detail panel (InfoPanel)
- Basic CRUD operations (Create, Delete)
- Status widget with dropdown menu
- Search and grouping capabilities
- GraphQL integration for data fetching
- Responsive grid layout

### ❌ Missing Features
- **Critical Data Columns**: Priority, request title, updated date, type
- **Visual Indicators**: Status badges, priority flags, user avatars
- **Advanced Filtering**: Quick filters, date ranges, saved presets
- **Bulk Operations**: Status change, assignment, priority updates
- **Rich Detail View**: Comments thread, activity timeline, attachments
- **Real-time Updates**: Live notifications, auto-refresh
- **Performance Optimizations**: Debouncing, virtual scrolling
- **Analytics Dashboard**: Summary cards, metrics widgets
- **Keyboard Navigation**: Shortcuts for power users
- **Mobile Optimization**: Responsive card views

### 🐛 Issues to Address
- No priority field in schema or UI
- Limited column information (missing request title)
- No visual distinction between urgent and normal tickets
- Basic detail panel with minimal information
- No bulk action capabilities beyond delete
- No filter persistence or presets
- Missing updated date tracking
- No comment count or attachment indicators
- Limited action menu in status widget

---

## Upgrade Categories

### 1. Schema & Data Model Enhancements
### 2. Column Configuration & Display
### 3. Filtering & Search Capabilities
### 4. Bulk Actions & Operations
### 5. Detail Panel & Information Display
### 6. Visual Design & UX Improvements
### 7. Performance Optimizations
### 8. Real-time & Notifications
### 9. Analytics & Dashboard Widgets
### 10. Mobile & Responsive Design

---

## Detailed Specifications

## 1. Schema & Data Model Enhancements

### 1.1 GraphQL Schema Updates

**Location:** `Support.graphql`

#### Add Missing Fields to `ReactorySupportTicket` Type

```graphql
type ReactorySupportTicket {
  # ... existing fields ...
  
  """
  Priority level of the ticket
  """
  priority: String
  
  """
  Date the ticket was last updated
  """
  updatedDate: Date
  
  """
  Tags associated with the ticket
  """
  tags: [String]
  
  """
  Estimated time to resolve (in hours)
  """
  estimatedResolutionTime: Int
  
  """
  Actual resolution time (in hours)
  """
  actualResolutionTime: Int
  
  """
  SLA deadline
  """
  slaDeadline: Date
  
  """
  Whether the ticket is overdue
  """
  isOverdue: Boolean
  
  """
  Related ticket IDs
  """
  relatedTickets: [String]
}
```

#### Update Filter Input

```graphql
input ReactorySupportTicketFilter {
  # ... existing fields ...
  
  """
  Filter by priority levels
  """
  priority: [String]
  
  """
  Filter by tags
  """
  tags: [String]
  
  """
  Show only overdue tickets
  """
  showOverdueOnly: Boolean
  
  """
  Filter by request types
  """
  requestType: [String]
}
```

### 1.2 Form Schema Updates

**Location:** `schema.ts`

#### Add Priority Property

```typescript
priority: {
  type: 'string',
  title: 'Priority',
  enum: ['low', 'medium', 'high', 'critical'],
  default: 'medium'
}
```

#### Add Request Type Property

```typescript
requestType: {
  type: 'string',
  title: 'Request Type',
  enum: ['bug', 'feature', 'question', 'support', 'other'],
  default: 'support'
}
```

#### Add Updated Date

```typescript
updatedDate: {
  type: 'string',
  title: 'Last Updated',
  format: 'date-time'
}
```

### 1.3 GraphQL Query Updates

**Location:** `graphql.ts`

#### Update `openTickets` Query

```typescript
text: `query ReactorySupportTickets($filter: ReactorySupportTicketFilter, $paging: PagingRequest) {
  ReactorySupportTickets(filter: $filter, paging: $paging) {
    paging {
      page
      pageSize
      hasNext
      total
    }
    tickets {
      id
      request
      description
      reference
      status
      requestType
      priority
      createdDate
      updatedDate
      createdBy {
        id
        firstName
        lastName
        avatar
        email
      }
      assignedTo {
        id
        firstName
        lastName
        avatar
        email
      }
      comments {
        id
        text
        who {
          id
          firstName
          lastName
        }
        when
      }
      documents {
        id
        name
        size
        mimeType
        url
      }
      tags
      slaDeadline
      isOverdue
    }
  }
}`
```

---

## 2. Column Configuration & Display

### 2.1 Enhanced Column Definitions

**Location:** `uiSchema.ts` - MaterialTableUIOptions.columns

#### Priority Order of Columns
1. **Reference Number** (120px) - Fixed, sortable, copyable
2. **Status** (150px) - Badge with color coding, filterable
3. **Priority** (120px) - Badge with icon, filterable, sortable
4. **Request Title** (300px) - Main content, truncated with tooltip
5. **Type** (130px) - Chip component, filterable
6. **Logged By** (180px) - Avatar + name
7. **Assigned To** (180px) - Avatar + name, inline editable
8. **Created** (150px) - Relative time with tooltip
9. **Last Updated** (150px) - Relative time
10. **Comments** (100px) - Badge with count
11. **Attachments** (120px) - Badge with count

### 2.2 New Widget Components Required

#### Core.UserAvatarChip@1.0.0
**Purpose:** Display user with avatar and name  
**Props:**
- `user: User` - User object with firstName, lastName, avatar, email
- `size: 'small' | 'medium' | 'large'` - Chip size
- `showEmail: boolean` - Show email on hover
- `unassignedText: string` - Text when no user
- `unassignedIcon: string` - Icon when no user
- `clickable: boolean` - Enable click interaction
- `onClick: (user: User) => void` - Click handler

**File Location:** `Widgets/core.UserAvatarChip.tsx`

#### Core.PriorityBadge@1.0.0
**Purpose:** Visual priority indicator with color and icon  
**Props:**
- `priority: 'low' | 'medium' | 'high' | 'critical'`
- `showIcon: boolean` - Display priority icon
- `variant: 'standard' | 'outlined' | 'filled'`
- `size: 'small' | 'medium'`

**Color Mapping:**
- `critical`: Red (#d32f2f) + flame icon
- `high`: Orange (#f57c00) + arrow up icon
- `medium`: Blue (#1976d2) + horizontal line icon
- `low`: Gray (#757575) + arrow down icon

**File Location:** `Widgets/core.PriorityBadge.tsx`

#### Core.SupportTicketStatusBadge@1.0.0
**Purpose:** Enhanced status badge with color coding  
**Props:**
- `status: string` - Ticket status
- `ticket: ReactorySupportTicket` - Full ticket object
- `editable: boolean` - Allow inline editing
- `onChange: (newStatus: string) => void` - Status change handler

**Color Mapping:**
- `new`: Purple (#9c27b0)
- `open`: Blue (#2196f3)
- `in-progress`: Orange (#ff9800)
- `resolved`: Green (#4caf50)
- `closed`: Gray (#757575)
- `on-hold`: Yellow (#fbc02d)

**File Location:** `Widgets/core.SupportTicketStatusBadge.tsx`

#### Core.DateTimeLabel@1.0.0
**Purpose:** Display dates with relative time and tooltip  
**Props:**
- `date: string | Date` - Date to display
- `format: 'relative' | 'absolute' | 'custom'` - Display format
- `tooltip: string | boolean` - Tooltip format or boolean
- `variant: 'body1' | 'body2' | 'caption'` - Typography variant

**File Location:** `Widgets/core.DateTimeLabel.tsx`

#### Core.BadgeComponent@1.0.0
**Purpose:** Display count badges for comments/attachments  
**Props:**
- `count: number` - Count to display
- `icon: string` - Material icon name
- `showZero: boolean` - Show badge when count is 0
- `color: 'default' | 'primary' | 'secondary' | 'error'`
- `max: number` - Maximum count to display (shows 99+)

**File Location:** `Widgets/core.BadgeComponent.tsx`

#### Core.ChipComponent@1.0.0
**Purpose:** Display categorical data as chips  
**Props:**
- `label: string` - Chip label
- `color: string` - Background color
- `icon: string` - Optional icon
- `size: 'small' | 'medium'`
- `variant: 'filled' | 'outlined'`
- `onDelete: () => void` - Optional delete handler

**File Location:** `Widgets/core.ChipComponent.tsx`

### 2.3 Column Customization Features

#### Column Visibility Toggle
**Implementation:** Add to MaterialTableUIOptions
```typescript
columnsButton: true, // Show column visibility button
columnVisibility: {
  enabled: true,
  defaultHidden: [], // Columns hidden by default
  userPreference: true, // Save user's column visibility preferences
  storageKey: 'supportTickets.columnVisibility'
}
```

#### Column Reordering
```typescript
columnReordering: {
  enabled: true,
  userPreference: true,
  storageKey: 'supportTickets.columnOrder'
}
```

#### Column Width Persistence
```typescript
columnWidthPersistence: {
  enabled: true,
  storageKey: 'supportTickets.columnWidths'
}
```

#### Density Options
```typescript
densityOptions: {
  enabled: true,
  options: ['compact', 'standard', 'comfortable'],
  default: 'standard',
  userPreference: true,
  storageKey: 'supportTickets.density'
}
```

---

## 3. Filtering & Search Capabilities

### 3.1 Quick Filters

**Location:** `uiSchema.ts` - Add to MaterialTableUIOptions

```typescript
toolbar: {
  showQuickFilters: true,
  quickFilters: [
    {
      id: 'my-tickets',
      label: 'My Tickets',
      icon: 'person',
      color: 'primary',
      filter: {
        field: 'assignedTo.id',
        value: '${context.user.id}',
        operator: 'eq'
      },
      badge: 'myTicketsCount' // Show count on filter button
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      icon: 'person_add_disabled',
      color: 'default',
      filter: {
        field: 'assignedTo',
        value: null,
        operator: 'is-null'
      },
      badge: 'unassignedTicketsCount'
    },
    {
      id: 'open',
      label: 'Open',
      icon: 'folder_open',
      color: 'info',
      filter: {
        field: 'status',
        value: ['new', 'open', 'in-progress'],
        operator: 'in'
      },
      badge: 'openTicketsCount'
    },
    {
      id: 'urgent',
      label: 'Urgent',
      icon: 'priority_high',
      color: 'error',
      filter: {
        field: 'priority',
        value: ['critical', 'high'],
        operator: 'in'
      },
      badge: 'urgentTicketsCount'
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: 'schedule',
      color: 'warning',
      filter: {
        field: 'isOverdue',
        value: true,
        operator: 'eq'
      },
      badge: 'overdueTicketsCount'
    },
    {
      id: 'resolved-today',
      label: 'Resolved Today',
      icon: 'check_circle',
      color: 'success',
      filter: {
        field: 'status',
        value: 'resolved',
        operator: 'eq',
        additionalFilters: [
          {
            field: 'updatedDate',
            value: '${reactory.utils.moment().startOf("day").toISOString()}',
            operator: 'gte'
          }
        ]
      }
    }
  ],
  quickFilterStyle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  }
}
```

### 3.2 Advanced Filter Panel

**New Component Required:** `core.AdvancedFilterPanel@1.0.0`  
**File Location:** `Widgets/core.AdvancedFilterPanel.tsx`

#### Features
- Multi-field filtering with AND/OR logic
- Date range picker
- Multi-select dropdowns
- User selection
- Filter preset management (save/load/delete)
- Clear all filters button

#### Configuration
```typescript
advancedFilter: {
  enabled: true,
  buttonLabel: 'Advanced Filters',
  buttonIcon: 'filter_list',
  
  fields: [
    {
      field: 'status',
      label: 'Status',
      type: 'multi-select',
      options: [
        { value: 'new', label: 'New' },
        { value: 'open', label: 'Open' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
        { value: 'on-hold', label: 'On Hold' }
      ],
      defaultOperator: 'in'
    },
    {
      field: 'priority',
      label: 'Priority',
      type: 'multi-select',
      options: [
        { value: 'critical', label: 'Critical', color: '#d32f2f' },
        { value: 'high', label: 'High', color: '#f57c00' },
        { value: 'medium', label: 'Medium', color: '#1976d2' },
        { value: 'low', label: 'Low', color: '#757575' }
      ],
      defaultOperator: 'in'
    },
    {
      field: 'requestType',
      label: 'Request Type',
      type: 'multi-select',
      options: [
        { value: 'bug', label: 'Bug', icon: 'bug_report' },
        { value: 'feature', label: 'Feature Request', icon: 'lightbulb' },
        { value: 'question', label: 'Question', icon: 'help' },
        { value: 'support', label: 'Support', icon: 'support_agent' },
        { value: 'other', label: 'Other', icon: 'more_horiz' }
      ],
      defaultOperator: 'in'
    },
    {
      field: 'assignedTo',
      label: 'Assigned To',
      type: 'user-select',
      multiple: true,
      includeUnassigned: true,
      defaultOperator: 'in'
    },
    {
      field: 'createdBy',
      label: 'Logged By',
      type: 'user-select',
      multiple: true,
      defaultOperator: 'in'
    },
    {
      field: 'createdDate',
      label: 'Created Date',
      type: 'date-range',
      presets: [
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'Last 7 days', value: 'last-7-days' },
        { label: 'Last 30 days', value: 'last-30-days' },
        { label: 'This month', value: 'this-month' },
        { label: 'Last month', value: 'last-month' }
      ]
    },
    {
      field: 'updatedDate',
      label: 'Last Updated',
      type: 'date-range',
      presets: [
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'Last 7 days', value: 'last-7-days' }
      ]
    },
    {
      field: 'tags',
      label: 'Tags',
      type: 'tag-select',
      multiple: true,
      allowCreate: false,
      defaultOperator: 'contains'
    },
    {
      field: 'searchString',
      label: 'Search Text',
      type: 'text',
      placeholder: 'Search in title, description...',
      defaultOperator: 'contains'
    }
  ],
  
  presets: {
    enabled: true,
    storage: 'user-preferences', // or 'local-storage'
    defaultPresets: [
      {
        id: 'high-priority-open',
        name: 'High Priority Open',
        filters: {
          status: ['new', 'open', 'in-progress'],
          priority: ['high', 'critical']
        }
      },
      {
        id: 'my-open-tickets',
        name: 'My Open Tickets',
        filters: {
          assignedTo: ['${context.user.id}'],
          status: ['new', 'open', 'in-progress']
        }
      },
      {
        id: 'recent-activity',
        name: 'Recent Activity',
        filters: {
          updatedDate: {
            preset: 'last-7-days'
          }
        }
      }
    ]
  },
  
  layout: {
    type: 'drawer', // or 'modal', 'inline'
    position: 'right',
    width: 400
  }
}
```

### 3.3 Search Enhancements

```typescript
search: {
  enabled: true,
  placeholder: 'Search tickets by reference, title, description...',
  debounceInterval: 500,
  minCharacters: 2,
  searchFields: ['reference', 'request', 'description'],
  highlightResults: true,
  
  // Advanced search syntax
  syntaxHelp: {
    enabled: true,
    examples: [
      { syntax: 'ref:1234', description: 'Search by reference' },
      { syntax: 'status:open', description: 'Filter by status' },
      { syntax: 'priority:high', description: 'Filter by priority' },
      { syntax: 'assigned:me', description: 'Assigned to me' },
      { syntax: 'tag:urgent', description: 'Filter by tag' }
    ]
  }
}
```

---

## 4. Bulk Actions & Operations

### 4.1 Bulk Action Components

#### Core.BulkStatusChangeAction@1.0.0
**File Location:** `Widgets/core.BulkStatusChangeAction.tsx`

**Features:**
- Dropdown to select new status
- Preview of affected tickets
- Validation (can only change status if user has permission)
- Optional comment field
- Success/error notifications

**Props:**
```typescript
interface BulkStatusChangeProps {
  tickets: ReactorySupportTicket[];
  onComplete: (result: { success: string[], failed: string[] }) => void;
  reactory: IReactoryApi;
}
```

#### Core.BulkAssignAction@1.0.0
**File Location:** `Widgets/core.BulkAssignAction.tsx`

**Features:**
- User picker (searchable)
- Team assignment option
- Auto-distribution option (round-robin)
- Preview affected tickets
- Notification to assigned users

#### Core.BulkPriorityAction@1.0.0
**File Location:** `Widgets/core.BulkPriorityAction.tsx`

**Features:**
- Priority selector
- Reason field (required for priority escalation)
- Preview affected tickets
- Validation rules

#### Core.BulkTagAction@1.0.0
**File Location:** `Widgets/core.BulkTagAction.tsx`

**Features:**
- Add/remove tags
- Tag suggestions
- Create new tags
- Preview affected tickets

### 4.2 Bulk Action Configuration

**Location:** `uiSchema.ts` - MaterialTableUIOptions.actions

```typescript
actions: [
  // Existing delete actions...
  
  // Bulk Status Change
  {
    key: 'bulk-status-change',
    icon: 'change_circle',
    title: 'Change Status',
    tooltip: 'Change status for selected tickets',
    isFreeAction: false, // Only shows when rows selected
    position: 'toolbar',
    component: 'core.BulkStatusChangeAction@1.0.0',
    propsMap: {
      'selected': 'tickets'
    },
    validation: {
      minSelected: 1,
      maxSelected: 100,
      message: 'Select 1-100 tickets to change status'
    }
  },
  
  // Bulk Assignment
  {
    key: 'bulk-assign',
    icon: 'person_add',
    title: 'Assign To',
    tooltip: 'Assign selected tickets to a user',
    isFreeAction: false,
    position: 'toolbar',
    component: 'core.BulkAssignAction@1.0.0',
    propsMap: {
      'selected': 'tickets'
    },
    permissions: ['ASSIGN_TICKETS'],
    validation: {
      minSelected: 1
    }
  },
  
  // Bulk Priority
  {
    key: 'bulk-priority',
    icon: 'flag',
    title: 'Set Priority',
    tooltip: 'Change priority for selected tickets',
    isFreeAction: false,
    position: 'toolbar',
    component: 'core.BulkPriorityAction@1.0.0',
    propsMap: {
      'selected': 'tickets'
    },
    permissions: ['MODIFY_PRIORITY']
  },
  
  // Bulk Tags
  {
    key: 'bulk-tags',
    icon: 'label',
    title: 'Manage Tags',
    tooltip: 'Add or remove tags',
    isFreeAction: false,
    position: 'toolbar',
    component: 'core.BulkTagAction@1.0.0',
    propsMap: {
      'selected': 'tickets'
    }
  },
  
  // Export
  {
    key: 'export',
    icon: 'download',
    title: 'Export',
    tooltip: 'Export tickets to CSV or Excel',
    isFreeAction: true,
    position: 'toolbar',
    component: 'core.ExportAction@1.0.0',
    props: {
      formats: ['csv', 'excel', 'pdf'],
      includeFilters: true,
      filenameTemplate: 'support-tickets-${date}'
    }
  },
  
  // Refresh
  {
    key: 'refresh',
    icon: 'refresh',
    title: 'Refresh',
    tooltip: 'Reload ticket data',
    isFreeAction: true,
    position: 'toolbar',
    onClick: 'reload'
  },
  
  // Print
  {
    key: 'print',
    icon: 'print',
    title: 'Print',
    tooltip: 'Print selected tickets',
    isFreeAction: false,
    position: 'toolbar',
    onClick: 'core.SupportTicketWorkflow@1.0.0/printTickets',
    propsMap: {
      'selected': 'tickets'
    }
  }
]
```

### 4.3 Selection Configuration

```typescript
selection: {
  enabled: true,
  mode: 'multiple', // 'single' or 'multiple'
  showCheckboxes: true,
  selectOnClick: false, // Require checkbox click
  preserveSelection: true, // Keep selection across page changes
  maxSelection: 100, // Limit for performance
  selectionHelpers: {
    selectAll: true,
    selectNone: true,
    invertSelection: true,
    selectPage: true
  },
  selectionBadge: {
    show: true,
    position: 'toolbar',
    format: '${count} selected'
  }
}
```

---

## 5. Detail Panel & Information Display

### 5.1 Enhanced Detail Panel Architecture

**Main Component:** `core.SupportTicketDetailPanel@1.0.0`  
**File Location:** `Widgets/core.SupportTicketDetailPanel.tsx`

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: Ticket #REF | Status Badge | Priority | Actions │
├─────────────────────────────────────────────────────────┤
│ Tabs: Overview | Comments | Attachments | Activity | ... │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    Tab Content Area                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Tab Components

#### Tab 1: Overview (core.SupportTicketOverview@1.0.0)
**File Location:** `Widgets/DetailPanelTabs/core.SupportTicketOverview.tsx`

**Content:**
```
┌──────────────────────────────────────────────────┐
│ Title/Request (large, bold)                      │
│ Description (markdown support)                   │
├──────────────────────────────────────────────────┤
│ Key Information Grid:                            │
│ ┌──────────────┬──────────────┬──────────────┐  │
│ │ Created By   │ Assigned To  │ Request Type │  │
│ │ [Avatar+Name]│ [Avatar+Name]│ [Chip]       │  │
│ ├──────────────┼──────────────┼──────────────┤  │
│ │ Created      │ Last Updated │ SLA Deadline │  │
│ │ [Date+Time]  │ [Date+Time]  │ [Countdown]  │  │
│ ├──────────────┼──────────────┼──────────────┤  │
│ │ Priority     │ Tags         │ Resolution   │  │
│ │ [Badge]      │ [Chips]      │ [Time]       │  │
│ └──────────────┴──────────────┴──────────────┘  │
├──────────────────────────────────────────────────┤
│ Quick Actions:                                   │
│ [Edit] [Assign] [Change Status] [Add Tag]       │
└──────────────────────────────────────────────────┘
```

#### Tab 2: Comments (core.SupportTicketComments@1.0.0)
**File Location:** `Widgets/DetailPanelTabs/core.SupportTicketComments.tsx`

**Features:**
- Threaded comments (replies)
- Rich text editor (markdown)
- @mentions for users
- Emoji support
- Attachments in comments
- Edit/delete own comments
- Like/reaction system
- Sort by newest/oldest
- Filter by user

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ [Rich Text Editor]                               │
│ Toolbar: Bold | Italic | Link | Emoji | Attach  │
│ [Submit] [Cancel]                                │
├──────────────────────────────────────────────────┤
│ Comments List:                                   │
│ ┌────────────────────────────────────────────┐  │
│ │ [Avatar] John Doe • 2 hours ago            │  │
│ │ Comment text here...                       │  │
│ │ [Like 3] [Reply] [Edit] [Delete]           │  │
│ │   └─ [Avatar] Jane • 1 hour ago            │  │
│ │      Reply text...                         │  │
│ └────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────┐  │
│ │ [Avatar] Admin • 1 day ago                 │  │
│ │ Another comment...                         │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Tab 3: Attachments (core.SupportTicketAttachments@1.0.0)
**File Location:** `Widgets/DetailPanelTabs/core.SupportTicketAttachments.tsx`

**Features:**
- Drag & drop upload
- File preview (images, PDFs)
- Download all as ZIP
- Delete attachments
- File metadata (size, type, uploaded by, date)
- Image gallery view
- Document viewer

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ [Upload Area - Drag & Drop]                     │
│ or [Browse Files] button                        │
├──────────────────────────────────────────────────┤
│ Attachments (5):                [Download All]   │
│ ┌──────────────────────────────────────────┐    │
│ │ 📄 document.pdf (2.3 MB)                 │    │
│ │ Uploaded by John Doe • 2h ago            │    │
│ │ [Preview] [Download] [Delete]            │    │
│ ├──────────────────────────────────────────┤    │
│ │ 🖼️ screenshot.png (456 KB)               │    │
│ │ [Thumbnail preview]                      │    │
│ │ [Preview] [Download] [Delete]            │    │
│ └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

#### Tab 4: Activity (core.SupportTicketActivity@1.0.0)
**File Location:** `Widgets/DetailPanelTabs/core.SupportTicketActivity.tsx`

**Features:**
- Timeline view of all ticket events
- Status changes
- Assignment changes
- Priority changes
- Comment additions
- Attachment uploads
- User actions
- System events
- Filterable by event type

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ Filter: [All] [Status] [Assignment] [Comments]   │
├──────────────────────────────────────────────────┤
│ Timeline:                                        │
│ ┌────────────────────────────────────────────┐  │
│ │ ● Now                                      │  │
│ │ │                                          │  │
│ │ ├─ 🔵 Status changed to "In Progress"     │  │
│ │ │   by John Doe • 2 hours ago             │  │
│ │ │                                          │  │
│ │ ├─ 💬 New comment added                   │  │
│ │ │   by Jane Smith • 5 hours ago           │  │
│ │ │                                          │  │
│ │ ├─ 👤 Assigned to John Doe                │  │
│ │ │   by Admin • 1 day ago                  │  │
│ │ │                                          │  │
│ │ ├─ 📝 Ticket created                      │  │
│ │ │   by Customer • 2 days ago              │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Tab 5: Related (core.SupportTicketRelated@1.0.0)
**File Location:** `Widgets/DetailPanelTabs/core.SupportTicketRelated.tsx`

**Features:**
- Related tickets list
- Add/remove relationships
- Relationship types (duplicate, blocks, related to)
- Mini-grid of related tickets
- Quick navigation to related tickets

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ Add Related Ticket: [Search by Ref/Title]       │
├──────────────────────────────────────────────────┤
│ Related Tickets (3):                             │
│ ┌────────────────────────────────────────────┐  │
│ │ Ref     Status   Relation   Title          │  │
│ ├────────────────────────────────────────────┤  │
│ │ #1234   Open     Blocks     Login issue    │  │
│ │ #1235   Closed   Duplicate  Same problem   │  │
│ │ #1236   Open     Related    UI bug         │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 5.3 Detail Panel Configuration

**Location:** `uiSchema.ts` - MaterialTableUIOptions

```typescript
detailPanel: {
  enabled: true,
  type: 'tabs', // 'single' or 'tabs'
  component: 'core.SupportTicketDetailPanel@1.0.0',
  
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'info',
      component: 'core.SupportTicketOverview@1.0.0',
      default: true
    },
    {
      id: 'comments',
      label: 'Comments',
      icon: 'comment',
      component: 'core.SupportTicketComments@1.0.0',
      badge: '${ticket.comments?.length || 0}',
      badgeColor: 'primary'
    },
    {
      id: 'attachments',
      label: 'Attachments',
      icon: 'attach_file',
      component: 'core.SupportTicketAttachments@1.0.0',
      badge: '${ticket.documents?.length || 0}',
      badgeColor: 'default'
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: 'timeline',
      component: 'core.SupportTicketActivity@1.0.0'
    },
    {
      id: 'related',
      label: 'Related',
      icon: 'link',
      component: 'core.SupportTicketRelated@1.0.0',
      badge: '${ticket.relatedTickets?.length || 0}'
    }
  ],
  
  props: {
    useCase: 'grid',
    expandable: true,
    closeOnNavigate: false
  },
  
  propsMap: {
    'props.rowData': 'ticket'
  },
  
  options: {
    type: 'single', // Only one panel open at a time
    showDetailPanelIcon: true,
    detailPanelColumnAlignment: 'left',
    closeOnClickOutside: false
  }
}
```

---

## 6. Visual Design & UX Improvements

### 6.1 Row Styling

**Location:** `uiSchema.ts` - MaterialTableUIOptions.options

```typescript
rowStyle: (rowData: ReactorySupportTicket) => {
  const styles: React.CSSProperties = {};
  
  // Priority-based background
  if (rowData.priority === 'critical') {
    styles.backgroundColor = '#ffebee'; // Light red
    styles.borderLeft = '4px solid #d32f2f';
  } else if (rowData.priority === 'high') {
    styles.backgroundColor = '#fff8e1'; // Light yellow
    styles.borderLeft = '4px solid #f57c00';
  } else if (rowData.isOverdue) {
    styles.backgroundColor = '#fce4ec'; // Light pink
    styles.borderLeft = '4px solid #e91e63';
  }
  
  // Hover effect
  return styles;
},

// Conditional row styling
conditionalRowStyles: [
  {
    when: (row) => row.priority === 'critical',
    style: {
      backgroundColor: '#ffebee',
      borderLeft: '4px solid #d32f2f',
      fontWeight: 600
    }
  },
  {
    when: (row) => row.isOverdue,
    style: {
      backgroundColor: '#fce4ec',
      animation: 'pulse 2s infinite'
    }
  }
]
```

### 6.2 Header Styling

```typescript
headerStyle: {
  backgroundColor: '#f5f5f5',
  fontWeight: 600,
  fontSize: '0.875rem',
  borderBottom: '2px solid #e0e0e0',
  position: 'sticky',
  top: 0,
  zIndex: 10
}
```

### 6.3 Empty State

```typescript
emptyState: {
  component: 'core.EmptyStateComponent@1.0.0',
  props: {
    icon: 'inbox',
    title: 'No tickets found',
    subtitle: 'Try adjusting your filters or create a new ticket',
    actions: [
      {
        label: 'Create Ticket',
        icon: 'add',
        color: 'primary',
        variant: 'contained',
        onClick: 'core.SupportTicketWorkflow@1.0.0/addNew'
      },
      {
        label: 'Clear Filters',
        icon: 'clear',
        variant: 'outlined',
        onClick: 'clearFilters'
      }
    ]
  }
}
```

### 6.4 Loading States

```typescript
loading: {
  component: 'core.LoadingOverlay@1.0.0',
  props: {
    variant: 'linear', // 'circular', 'linear', 'skeleton'
    message: 'Loading tickets...',
    overlay: true
  }
}
```

### 6.5 Animations

```typescript
animations: {
  rowHover: {
    enabled: true,
    effect: 'lift', // 'lift', 'highlight', 'none'
    duration: 200
  },
  rowSelection: {
    enabled: true,
    effect: 'highlight',
    color: '#e3f2fd'
  },
  detailPanelExpand: {
    enabled: true,
    duration: 300,
    easing: 'ease-in-out'
  }
}
```

### 6.6 Typography & Spacing

```typescript
theme: {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    headerFontSize: 14,
    headerFontWeight: 600
  },
  spacing: {
    cellPadding: '12px 16px',
    headerPadding: '16px',
    rowSpacing: '0px'
  },
  borders: {
    cell: '1px solid #e0e0e0',
    row: 'none',
    outer: '1px solid #e0e0e0'
  }
}
```

---

## 7. Performance Optimizations

### 7.1 Debouncing & Throttling

```typescript
performance: {
  search: {
    debounceInterval: 500, // ms
    minCharacters: 2
  },
  filter: {
    debounceInterval: 300
  },
  sort: {
    throttleInterval: 200
  }
}
```

### 7.2 Pagination Strategy

```typescript
pagination: {
  type: 'standard', // 'standard', 'infinite-scroll', 'cursor-based'
  pageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  showFirstLastButtons: true,
  showPageSizeSelector: true,
  
  // For infinite scroll
  infiniteScroll: {
    enabled: false,
    threshold: 200, // px from bottom
    initialLoad: 25,
    increment: 25
  }
}
```

### 7.3 Memoization

```typescript
memoization: {
  cellRenderers: true, // Memoize cell components
  columns: true, // Memoize column definitions
  filters: true // Memoize filter components
}
```

### 7.4 Virtual Scrolling

```typescript
virtualScroll: {
  enabled: false, // Enable for 1000+ rows
  itemSize: 60, // Row height in px
  overscan: 5 // Number of rows to render outside viewport
}
```

### 7.5 Data Caching

```typescript
caching: {
  enabled: true,
  strategy: 'memory', // 'memory', 'local-storage', 'session-storage'
  ttl: 300000, // 5 minutes in ms
  maxSize: 100, // Max number of queries to cache
  invalidateOn: ['mutation', 'manual']
}
```

---

## 8. Real-time & Notifications

### 8.1 WebSocket Subscriptions

**Location:** `uiSchema.ts` - MaterialTableUIOptions

```typescript
realtime: {
  enabled: true,
  transport: 'websocket', // 'websocket', 'sse', 'polling'
  
  subscriptions: [
    {
      name: 'onSupportTicketCreated',
      event: 'core.SupportTicketCreatedEvent',
      action: 'prependRow',
      notification: {
        enabled: true,
        message: 'New ticket created: ${event.ticket.reference}',
        type: 'info',
        duration: 5000,
        actions: [
          {
            label: 'View',
            onClick: 'openDetailPanel',
            params: { ticketId: '${event.ticket.id}' }
          }
        ]
      }
    },
    {
      name: 'onSupportTicketUpdated',
      event: 'core.SupportTicketUpdatedEvent',
      action: 'updateRow',
      matcher: {
        'event.ticket.id': 'rowData.id'
      },
      notification: {
        enabled: true,
        condition: '${event.ticket.assignedTo?.id === context.user.id}',
        message: 'Ticket ${event.ticket.reference} was updated',
        type: 'info'
      },
      animation: {
        type: 'flash',
        duration: 1000,
        color: '#e3f2fd'
      }
    },
    {
      name: 'onSupportTicketDeleted',
      event: 'core.SupportTicketDeletedEvent',
      action: 'removeRow',
      matcher: {
        'event.ticketId': 'rowData.id'
      },
      animation: {
        type: 'fade-out',
        duration: 500
      }
    },
    {
      name: 'onSupportTicketCommented',
      event: 'core.SupportTicketCommentedEvent',
      action: 'updateRow', // Update comment count
      matcher: {
        'event.ticketId': 'rowData.id'
      },
      notification: {
        enabled: true,
        condition: '${event.ticketId === detailPanel.ticket?.id}',
        message: 'New comment added',
        type: 'info'
      }
    },
    {
      name: 'onSupportTicketAssigned',
      event: 'core.SupportTicketAssignedEvent',
      action: 'updateRow',
      matcher: {
        'event.ticket.id': 'rowData.id'
      },
      notification: {
        enabled: true,
        condition: '${event.ticket.assignedTo?.id === context.user.id}',
        message: 'Ticket ${event.ticket.reference} was assigned to you',
        type: 'success',
        sound: true,
        duration: 8000,
        actions: [
          {
            label: 'View',
            onClick: 'openDetailPanel',
            params: { ticketId: '${event.ticket.id}' }
          },
          {
            label: 'Accept',
            onClick: 'core.SupportTicketWorkflow@1.0.0/acceptTicket',
            params: { ticketId: '${event.ticket.id}' }
          }
        ]
      }
    },
    {
      name: 'onSupportTicketStatusChanged',
      event: 'core.SupportTicketStatusChangedEvent',
      action: 'updateRow',
      matcher: {
        'event.ticket.id': 'rowData.id'
      },
      notification: {
        enabled: true,
        message: 'Ticket ${event.ticket.reference} status: ${event.newStatus}',
        type: 'info'
      }
    }
  ],
  
  reconnect: {
    enabled: true,
    attempts: 5,
    delay: 2000, // ms
    backoff: 'exponential' // 'linear', 'exponential'
  }
}
```

### 8.2 Notification System

**New Component:** `core.NotificationCenter@1.0.0`  
**File Location:** `Widgets/core.NotificationCenter.tsx`

**Features:**
- Toast notifications
- Notification center (history)
- Desktop notifications (browser API)
- Sound alerts
- Action buttons in notifications
- Grouping similar notifications

```typescript
notifications: {
  position: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  maxStack: 3, // Max visible notifications
  autoHide: true,
  defaultDuration: 5000,
  
  types: {
    success: {
      icon: 'check_circle',
      color: '#4caf50'
    },
    error: {
      icon: 'error',
      color: '#f44336',
      sound: true
    },
    warning: {
      icon: 'warning',
      color: '#ff9800'
    },
    info: {
      icon: 'info',
      color: '#2196f3'
    }
  },
  
  center: {
    enabled: true,
    icon: 'notifications',
    showBadge: true,
    maxHistory: 50,
    position: 'toolbar'
  },
  
  desktop: {
    enabled: true,
    requestPermission: true,
    onlyWhenInactive: true // Only show when tab is inactive
  }
}
```

### 8.3 Optimistic Updates

```typescript
optimisticUpdates: {
  enabled: true,
  rollbackOnError: true,
  
  operations: {
    statusChange: {
      enabled: true,
      updateImmediately: true,
      animation: 'fade'
    },
    assignment: {
      enabled: true,
      updateImmediately: true
    },
    delete: {
      enabled: true,
      animation: 'fade-out',
      delay: 500 // Allow undo
    }
  }
}
```

---

## 9. Analytics & Dashboard Widgets

### 9.1 Summary Cards Component

**New Component:** `core.SupportTicketStatsCards@1.0.0`  
**File Location:** `Widgets/core.SupportTicketStatsCards.tsx`

#### Card Definitions

```typescript
statsCards: {
  enabled: true,
  layout: 'grid', // 'grid', 'row'
  cards: [
    {
      id: 'total-open',
      title: 'Open Tickets',
      query: 'getOpenTicketsCount',
      icon: 'folder_open',
      color: 'primary',
      trend: {
        enabled: true,
        comparisonPeriod: 'previous-week'
      },
      onClick: {
        action: 'applyQuickFilter',
        filter: 'open'
      }
    },
    {
      id: 'my-tickets',
      title: 'My Tickets',
      query: 'getMyTicketsCount',
      icon: 'person',
      color: 'info',
      onClick: {
        action: 'applyQuickFilter',
        filter: 'my-tickets'
      }
    },
    {
      id: 'unassigned',
      title: 'Unassigned',
      query: 'getUnassignedTicketsCount',
      icon: 'person_add_disabled',
      color: 'warning',
      onClick: {
        action: 'applyQuickFilter',
        filter: 'unassigned'
      }
    },
    {
      id: 'urgent',
      title: 'Urgent',
      query: 'getUrgentTicketsCount',
      icon: 'priority_high',
      color: 'error',
      pulse: true, // Animated pulse effect
      onClick: {
        action: 'applyQuickFilter',
        filter: 'urgent'
      }
    },
    {
      id: 'overdue',
      title: 'Overdue',
      query: 'getOverdueTicketsCount',
      icon: 'schedule',
      color: 'error',
      onClick: {
        action: 'applyQuickFilter',
        filter: 'overdue'
      }
    },
    {
      id: 'avg-response-time',
      title: 'Avg Response Time',
      query: 'getAvgResponseTime',
      icon: 'schedule',
      color: 'success',
      format: 'duration', // Format as "2h 45m"
      trend: {
        enabled: true,
        direction: 'lower-is-better'
      }
    },
    {
      id: 'resolution-rate',
      title: 'Resolution Rate',
      query: 'getResolutionRate',
      icon: 'check_circle',
      color: 'success',
      format: 'percentage',
      trend: {
        enabled: true,
        comparisonPeriod: 'previous-month'
      }
    },
    {
      id: 'customer-satisfaction',
      title: 'Satisfaction',
      query: 'getCustomerSatisfaction',
      icon: 'sentiment_satisfied',
      color: 'success',
      format: 'rating', // Display as stars
      trend: {
        enabled: true
      }
    }
  ],
  
  gridLayout: {
    xs: 12,
    sm: 6,
    md: 3,
    lg: 3,
    xl: 2
  },
  
  style: {
    marginBottom: '24px',
    gap: '16px'
  },
  
  refresh: {
    enabled: true,
    interval: 60000, // Refresh every 60 seconds
    manual: true // Show refresh button
  }
}
```

### 9.2 Charts & Visualizations

**New Component:** `core.SupportTicketCharts@1.0.0`  
**File Location:** `Widgets/core.SupportTicketCharts.tsx`

```typescript
charts: {
  enabled: false, // Opt-in feature
  position: 'above-grid', // 'above-grid', 'below-grid', 'sidebar'
  
  widgets: [
    {
      id: 'status-distribution',
      type: 'pie',
      title: 'Tickets by Status',
      query: 'getTicketsByStatus',
      colors: {
        'new': '#9c27b0',
        'open': '#2196f3',
        'in-progress': '#ff9800',
        'resolved': '#4caf50',
        'closed': '#757575',
        'on-hold': '#fbc02d'
      },
      size: 'small' // 'small', 'medium', 'large'
    },
    {
      id: 'priority-distribution',
      type: 'bar',
      title: 'Tickets by Priority',
      query: 'getTicketsByPriority',
      orientation: 'horizontal'
    },
    {
      id: 'trend-over-time',
      type: 'line',
      title: 'Ticket Trend',
      query: 'getTicketTrendOverTime',
      period: 'last-30-days',
      groupBy: 'day'
    },
    {
      id: 'team-performance',
      type: 'table',
      title: 'Team Performance',
      query: 'getTeamPerformanceMetrics',
      columns: ['user', 'assigned', 'resolved', 'avgTime']
    }
  ]
}
```

### 9.3 Required GraphQL Queries

**Location:** `graphql.ts`

Add these analytics queries:

```typescript
queries: {
  // ... existing queries ...
  
  getOpenTicketsCount: {
    name: 'GetOpenTicketsCount',
    text: `query GetOpenTicketsCount {
      supportTicketStats {
        openCount
      }
    }`,
    resultMap: {
      'supportTicketStats.openCount': 'value'
    }
  },
  
  getMyTicketsCount: {
    name: 'GetMyTicketsCount',
    text: `query GetMyTicketsCount {
      supportTicketStats {
        myTicketsCount
      }
    }`,
    resultMap: {
      'supportTicketStats.myTicketsCount': 'value'
    }
  },
  
  getTicketsByStatus: {
    name: 'GetTicketsByStatus',
    text: `query GetTicketsByStatus {
      supportTicketStats {
        byStatus {
          status
          count
        }
      }
    }`,
    resultMap: {
      'supportTicketStats.byStatus': 'data'
    }
  },
  
  // ... more analytics queries ...
}
```

---

## 10. Mobile & Responsive Design

### 10.1 Responsive Configuration

```typescript
responsive: {
  enabled: true,
  
  breakpoints: {
    mobile: 600,
    tablet: 960,
    desktop: 1280
  },
  
  mobile: {
    layout: 'cards', // Switch from table to card layout
    component: 'core.SupportTicketMobileCard@1.0.0',
    hiddenColumns: ['createdBy', 'updatedDate', 'comments', 'documents', 'assignedTo'],
    visibleColumns: ['reference', 'status', 'priority', 'request', 'createdDate'],
    
    cardLayout: {
      header: ['reference', 'status', 'priority'],
      body: ['request'],
      footer: ['createdDate'],
      actions: ['view', 'comment']
    },
    
    search: {
      position: 'top',
      fullWidth: true
    },
    
    filters: {
      position: 'drawer', // Open in drawer instead of inline
      collapsible: true
    },
    
    pagination: {
      type: 'infinite-scroll',
      showPageNumbers: false
    }
  },
  
  tablet: {
    hiddenColumns: ['comments', 'documents'],
    columnDensity: 'comfortable'
  },
  
  desktop: {
    // Full feature set
  }
}
```

### 10.2 Mobile Card Component

**New Component:** `core.SupportTicketMobileCard@1.0.0`  
**File Location:** `Widgets/core.SupportTicketMobileCard.tsx`

**Layout:**
```
┌──────────────────────────────────────────┐
│ #REF-1234    [Status Badge] [Priority]   │
├──────────────────────────────────────────┤
│ Request Title Here...                    │
│ Brief description preview...             │
├──────────────────────────────────────────┤
│ 👤 John Doe  •  📅 2 hours ago          │
├──────────────────────────────────────────┤
│ [View] [Comment] [•••]                   │
└──────────────────────────────────────────┘
```

### 10.3 Touch Optimizations

```typescript
touch: {
  enabled: true,
  
  gestures: {
    swipeLeft: {
      action: 'showActions',
      distance: 50 // px
    },
    swipeRight: {
      action: 'openDetail',
      distance: 50
    },
    longPress: {
      action: 'select',
      duration: 500 // ms
    }
  },
  
  actionButtons: {
    size: 'large', // Larger tap targets
    spacing: '12px'
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETE
**Priority: Critical**  
**Status:** ✅ Complete  
**Completion Date:** December 23, 2025  
**See:** `PHASE1_COMPLETE.md` for details

#### 1.1 Schema Updates
- [x] Update GraphQL schema with priority, updatedDate, tags fields
- [x] Update form schema in `schema.ts`
- [x] Update GraphQL queries in `graphql.ts` to fetch new fields
- [x] Add backend resolvers for new fields
- [x] Test schema changes with sample data

#### 1.2 Basic Widget Components
- [x] Create `core.StatusBadge@1.0.0` (generic, reusable)
- [x] Create `core.UserAvatar@1.0.0` (generic, reusable)
- [x] Create `core.RelativeTime@1.0.0` (generic, reusable)
- [x] Create `core.CountBadge@1.0.0` (generic, reusable)
- [x] Register all components in client widgets index

#### 1.3 Enhanced Column Configuration
- [x] Update column definitions in `uiSchema.ts`
- [x] Add Reference column with copy functionality
- [x] Add Priority column with badge
- [x] Add Request title column (main subject)
- [x] Add Request type column
- [x] Add Updated date column
- [x] Add Comment count indicator
- [x] Add Attachment count indicator
- [x] Update user columns to use avatar chips
- [x] Test column rendering and sorting
- [x] Implement declarative row styling (conditionalRowStyling)

#### Deliverables:
- ✅ Updated schema with new fields
- ✅ 4 new generic widget components
- ✅ Enhanced grid with 11 detailed columns
- ✅ Improved visual hierarchy
- ✅ Declarative styling patterns

---

### Phase 2: Detail Panel & Info Display (Weeks 3-4) ✅ COMPLETE
**Priority: High**  
**Status:** ✅ Complete  
**Completion Date:** December 23, 2025  
**See:** `PHASE2_COMPLETE.md` for details

#### 2.1 Detail Panel Infrastructure
- [x] Create `core.SupportTicketDetailPanel@1.0.0`
- [x] Implement tabbed interface (5 tabs)
- [x] Add panel header with actions
- [x] Configure panel in `uiSchema.ts`
- [x] Add badge counts to tabs

#### 2.2 Overview Tab
- [x] Create `core.SupportTicketOverview@1.0.0`
- [x] Design information grid layout (6 cards)
- [x] Add quick action buttons
- [x] Add rich content support (HTML/Markdown via useContentRender)
- [x] Integrate Phase 1 generic widgets

#### 2.3 Status Widget Enhancement
- [x] Enhance `core.SupportTicketStatusWidget@1.0.0`
- [x] Integrate StatusBadge for visual display
- [x] Maintain action dropdown functionality

#### Deliverables:
- ✅ Full-featured detail panel with tabbed interface
- ✅ Rich overview tab with 6 info cards
- ✅ Enhanced status widget
- ✅ Rich HTML/Markdown rendering support

---

### Phase 3: Detail Panel Tabs (Weeks 5-6) ✅ COMPLETE
**Priority: High**  
**Status:** ✅ Complete  
**Completion Date:** December 23, 2025  
**See:** `PHASE3_COMPLETE.md` for details

#### 3.1 Comments Tab
- [x] Create `core.SupportTicketComments@1.0.0`
- [x] Implement rich text editor (RichEditorWidget)
- [x] Add comment display with rich content rendering
- [x] Add sort options (Newest/Oldest)
- [x] Add edit/delete own comments (permission-based)
- [x] Add reply functionality (foundation)
- [x] Add reaction system (foundation)

#### 3.2 Attachments Tab
- [x] Create `core.SupportTicketAttachments@1.0.0`
- [x] Implement drag & drop upload (ReactoryDropZone)
- [x] Add file preview (images with thumbnails)
- [x] Add file type icons (MIME-based)
- [x] Add download functionality
- [x] Add delete attachment (permission-based)
- [x] Show file metadata (size, type, uploader, date)
- [x] Add upload progress indicator

#### 3.3 Activity Tab
- [x] Create `core.SupportTicketActivity@1.0.0`
- [x] Design timeline layout (Material-UI Timeline)
- [x] Add activity event rendering (7 event types)
- [x] Add filter by event type (All, Status, Comments, Files)
- [x] Add activity icons and colors (color-coded)
- [x] Display user avatars and timestamps

#### 3.4 Related Tab
- [x] Create `core.SupportTicketRelated@1.0.0`
- [x] Add ticket search/link functionality
- [x] Add 6 relationship types (blocks, duplicate, related, etc.)
- [x] Add table display of related tickets
- [x] Add remove relationship functionality
- [x] Add relationship type indicators (colored chips)

#### Deliverables:
- ✅ Full-featured detail panel with 5 complete tabs
- ✅ Rich comment system with editor
- ✅ File management with drag & drop
- ✅ Activity timeline with filtering
- ✅ Related tickets functionality
- ✅ ~1,470 lines of production code

---

### Phase 4: Bulk Actions & Advanced Features (Weeks 7-8) ⏳ NEXT
**Priority: Medium**  
**Status:** ⏳ Ready to Start

#### 4.1 Bulk Action Components
- [ ] Create `core.BulkStatusChangeAction@1.0.0`
- [ ] Create `core.BulkAssignAction@1.0.0`
- [ ] Create `core.BulkPriorityAction@1.0.0`
- [ ] Create `core.BulkTagAction@1.0.0`
- [ ] Create `core.ExportAction@1.0.0`

#### 4.2 Action Integration
- [ ] Add bulk action buttons to toolbar
- [ ] Implement selection badge in toolbar
- [ ] Add validation for bulk operations
- [ ] Add confirmation dialogs
- [ ] Add progress indicators for long operations
- [ ] Add undo functionality

#### 4.3 GraphQL Mutations
- [ ] Create bulk status update mutation
- [ ] Create bulk assignment mutation
- [ ] Create bulk priority update mutation
- [ ] Create bulk tag update mutation
- [ ] Create bulk delete mutation

#### Deliverables:
- ✅ 5 bulk action components
- ✅ Bulk operations UI
- ✅ Progress tracking
- ✅ Error handling and rollback

---

### Phase 5: Real-time & Notifications (Weeks 9-10)
**Priority: Medium**

#### 5.1 WebSocket Infrastructure
- [ ] Set up WebSocket connection
- [ ] Create event subscription system
- [ ] Add reconnection logic
- [ ] Handle connection states

#### 5.2 Event Handlers
- [ ] Implement ticket created handler
- [ ] Implement ticket updated handler
- [ ] Implement ticket deleted handler
- [ ] Implement ticket commented handler
- [ ] Implement ticket assigned handler
- [ ] Implement status changed handler

#### 5.3 Notification System
- [ ] Create `core.NotificationCenter@1.0.0`
- [ ] Implement toast notifications
- [ ] Add notification history
- [ ] Add desktop notifications
- [ ] Add sound alerts
- [ ] Add notification actions

#### 5.4 Optimistic Updates
- [ ] Implement optimistic status changes
- [ ] Implement optimistic assignments
- [ ] Implement optimistic deletes with undo
- [ ] Add rollback on error

#### Deliverables:
- ✅ Real-time updates via WebSocket
- ✅ Comprehensive notification system
- ✅ Optimistic UI updates
- ✅ Notification center with history

---

### Phase 6: Analytics & Dashboard (Weeks 11-12)
**Priority: Low**

#### 6.1 Stats Cards
- [ ] Create `core.SupportTicketStatsCards@1.0.0`
- [ ] Design card layouts
- [ ] Implement 8 summary cards
- [ ] Add trend indicators
- [ ] Add click-to-filter functionality
- [ ] Add auto-refresh

#### 6.2 GraphQL Queries
- [ ] Create analytics queries
- [ ] Add caching for analytics data
- [ ] Optimize query performance

#### 6.3 Charts (Optional)
- [ ] Create `core.SupportTicketCharts@1.0.0`
- [ ] Implement pie chart (status distribution)
- [ ] Implement bar chart (priority distribution)
- [ ] Implement line chart (trend over time)
- [ ] Implement performance table

#### Deliverables:
- ✅ Dashboard with 8 summary cards
- ✅ Analytics queries
- ✅ Optional charts and visualizations

---

### Phase 7: Mobile & Responsive (Weeks 13-14)
**Priority: Medium**

#### 7.1 Mobile Card Component
- [ ] Create `core.SupportTicketMobileCard@1.0.0`
- [ ] Design card layout
- [ ] Add swipe gestures
- [ ] Add long-press selection

#### 7.2 Responsive Configuration
- [ ] Configure breakpoints
- [ ] Set up column hiding per breakpoint
- [ ] Configure mobile layout
- [ ] Configure tablet layout
- [ ] Test on various screen sizes

#### 7.3 Touch Optimizations
- [ ] Increase tap target sizes
- [ ] Add swipe actions
- [ ] Optimize for touch scrolling
- [ ] Add pull-to-refresh

#### Deliverables:
- ✅ Mobile-optimized card layout
- ✅ Responsive breakpoints
- ✅ Touch gestures
- ✅ Mobile-friendly interactions

---

### Phase 8: Performance & Polish (Weeks 15-16)
**Priority: High**

#### 8.1 Performance Optimizations
- [ ] Implement debouncing for search/filters
- [ ] Add query result caching
- [ ] Optimize column rendering with memoization
- [ ] Add virtual scrolling for large datasets
- [ ] Lazy load detail panel components
- [ ] Optimize image loading

#### 8.2 Visual Polish
- [ ] Add row animations
- [ ] Add hover effects
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error states
- [ ] Refine spacing and typography

#### 8.3 Accessibility
- [ ] Add keyboard navigation
- [ ] Add ARIA labels
- [ ] Test with screen readers
- [ ] Ensure color contrast compliance
- [ ] Add focus indicators

#### 8.4 Testing
- [ ] Unit tests for all components
- [ ] Integration tests for workflows
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] Mobile device testing

#### Deliverables:
- ✅ Optimized performance
- ✅ Polished visual design
- ✅ Full accessibility support
- ✅ Comprehensive test coverage

---

## Technical Requirements

### Dependencies

#### Required Reactory Components
- `react.React`
- `material-ui.Material`
- `core.DropDownMenu`
- `core.FullScreenModal`
- `core.ReactoryForm`
- `core.LabelComponent` (existing)
- `MaterialTableWidget` (existing)
- `MaterialListWidget` (existing)

#### New Components to Create (28 total)
1. `core.UserAvatarChip@1.0.0`
2. `core.PriorityBadge@1.0.0`
3. `core.SupportTicketStatusBadge@1.0.0`
4. `core.DateTimeLabel@1.0.0`
5. `core.BadgeComponent@1.0.0`
6. `core.ChipComponent@1.0.0`
7. `core.AdvancedFilterPanel@1.0.0`
8. `core.SupportTicketDetailPanel@1.0.0`
9. `core.SupportTicketOverview@1.0.0`
10. `core.SupportTicketComments@1.0.0`
11. `core.SupportTicketAttachments@1.0.0`
12. `core.SupportTicketActivity@1.0.0`
13. `core.SupportTicketRelated@1.0.0`
14. `core.BulkStatusChangeAction@1.0.0`
15. `core.BulkAssignAction@1.0.0`
16. `core.BulkPriorityAction@1.0.0`
17. `core.BulkTagAction@1.0.0`
18. `core.ExportAction@1.0.0`
19. `core.NotificationCenter@1.0.0`
20. `core.SupportTicketStatsCards@1.0.0`
21. `core.SupportTicketCharts@1.0.0` (optional)
22. `core.SupportTicketMobileCard@1.0.0`
23. `core.EmptyStateComponent@1.0.0`
24. `core.LoadingOverlay@1.0.0`
25. `core.RichTextEditor@1.0.0`
26. `core.DateRangePicker@1.0.0`
27. `core.UserSelectField@1.0.0`
28. `core.TagSelectField@1.0.0`

#### External Libraries (if needed)
- `react-virtualized` or `react-window` (virtual scrolling)
- `react-beautiful-dnd` (drag & drop)
- `date-fns` or `moment` (date formatting)
- `recharts` or `chart.js` (charts)
- `react-markdown` (markdown rendering)
- `react-dropzone` (file uploads)

### Backend Requirements

#### GraphQL Schema Additions
- Add `priority` field to `ReactorySupportTicket`
- Add `updatedDate` field
- Add `tags` field
- Add `slaDeadline` field
- Add `isOverdue` field
- Add `relatedTickets` field
- Update filter inputs
- Add analytics queries

#### New Mutations Required
- `ReactorySupportTicketBulkStatusUpdate`
- `ReactorySupportTicketBulkAssign`
- `ReactorySupportTicketBulkPriorityUpdate`
- `ReactorySupportTicketBulkTag`
- `ReactorySupportTicketAddComment`
- `ReactorySupportTicketEditComment`
- `ReactorySupportTicketDeleteComment`
- `ReactorySupportTicketUploadAttachment`
- `ReactorySupportTicketDeleteAttachment`
- `ReactorySupportTicketLinkRelated`

#### Event System
- Set up WebSocket/SSE server
- Implement event publishing
- Add subscription management
- Implement event types:
  - `core.SupportTicketCreatedEvent`
  - `core.SupportTicketUpdatedEvent`
  - `core.SupportTicketDeletedEvent`
  - `core.SupportTicketCommentedEvent`
  - `core.SupportTicketAssignedEvent`
  - `core.SupportTicketStatusChangedEvent`

### Database Schema Changes

#### Tables to Update
```sql
-- Support Tickets table
ALTER TABLE support_tickets ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE support_tickets ADD COLUMN updated_date TIMESTAMP;
ALTER TABLE support_tickets ADD COLUMN tags TEXT[];
ALTER TABLE support_tickets ADD COLUMN sla_deadline TIMESTAMP;
ALTER TABLE support_tickets ADD COLUMN estimated_resolution_time INT;
ALTER TABLE support_tickets ADD COLUMN actual_resolution_time INT;

-- Create indexes for performance
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_updated_date ON support_tickets(updated_date);
CREATE INDEX idx_support_tickets_status_priority ON support_tickets(status, priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to_id);

-- Related tickets table (new)
CREATE TABLE support_ticket_relationships (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id),
  related_ticket_id UUID REFERENCES support_tickets(id),
  relationship_type VARCHAR(50), -- 'blocks', 'duplicate', 'related'
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Activity log table (new)
CREATE TABLE support_ticket_activity (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id),
  event_type VARCHAR(50),
  event_data JSONB,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_ticket_id ON support_ticket_activity(ticket_id);
CREATE INDEX idx_activity_created_at ON support_ticket_activity(created_at DESC);
```

---

## Testing Strategy

### Unit Tests
- [ ] Test all new widget components
- [ ] Test filter logic
- [ ] Test bulk action functions
- [ ] Test date formatting utilities
- [ ] Test notification system
- [ ] Test data transformations

### Integration Tests
- [ ] Test grid rendering with data
- [ ] Test filter application
- [ ] Test sorting and pagination
- [ ] Test detail panel navigation
- [ ] Test bulk operations end-to-end
- [ ] Test real-time updates
- [ ] Test GraphQL queries and mutations

### Performance Tests
- [ ] Load test with 1000+ tickets
- [ ] Test search performance
- [ ] Test filter performance
- [ ] Test real-time update handling
- [ ] Test memory usage
- [ ] Test bundle size

### User Acceptance Tests
- [ ] Create test scenarios for support agents
- [ ] Test with actual support workflow
- [ ] Gather feedback on UX
- [ ] Test on various devices
- [ ] Test with screen readers

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

---

## Documentation

### Files to Create/Update

#### 1. Component Documentation
**Location:** `Widgets/README.md`
- Document each widget component
- Show usage examples
- List props and interfaces
- Show visual examples

#### 2. API Documentation
**Location:** `API.md`
- Document GraphQL queries
- Document mutations
- Show request/response examples
- Document event types

#### 3. Configuration Guide
**Location:** `CONFIGURATION.md`
- Document all uiSchema options
- Show configuration examples
- Document customization options
- Show advanced configurations

#### 4. User Guide
**Location:** `USER_GUIDE.md`
- How to use filters
- How to perform bulk actions
- How to use keyboard shortcuts
- How to customize columns

#### 5. Developer Guide
**Location:** `DEVELOPER_GUIDE.md`
- Architecture overview
- How to extend functionality
- How to create custom components
- Best practices

#### 6. Migration Guide
**Location:** `MIGRATION_V1_TO_V2.md`
- Breaking changes
- Database migrations
- Configuration changes
- Step-by-step upgrade process

---

## Success Metrics

### Performance Metrics
- **Initial load time:** < 2 seconds
- **Search response time:** < 300ms
- **Filter application time:** < 200ms
- **Real-time update latency:** < 500ms
- **Bulk operation (100 tickets):** < 3 seconds

### User Experience Metrics
- **User satisfaction score:** > 4.5/5
- **Task completion rate:** > 95%
- **Error rate:** < 1%
- **Time to complete common tasks:** 30% reduction
- **Support agent efficiency:** 40% improvement

### Code Quality Metrics
- **Test coverage:** > 80%
- **TypeScript strict mode:** 100% compliance
- **Accessibility score:** WCAG 2.1 AA compliant
- **Bundle size increase:** < 200KB gzipped
- **Lighthouse score:** > 90

---

## Risk Assessment

### High Risk Items
1. **Real-time updates scaling** - May impact server performance
   - *Mitigation:* Use connection pooling, rate limiting
2. **Large dataset performance** - Grid may slow with 10,000+ tickets
   - *Mitigation:* Virtual scrolling, proper indexing
3. **Browser compatibility** - Some features may not work in older browsers
   - *Mitigation:* Progressive enhancement, polyfills

### Medium Risk Items
1. **Complex filter combinations** - May create slow queries
   - *Mitigation:* Query optimization, caching
2. **File uploads** - Large files may cause issues
   - *Mitigation:* File size limits, chunked uploads
3. **Mobile performance** - Feature-rich UI may be slow on mobile
   - *Mitigation:* Simplified mobile layout, lazy loading

### Low Risk Items
1. **User adoption** - Users may resist new interface
   - *Mitigation:* Training, gradual rollout
2. **Customization complexity** - Many options may confuse developers
   - *Mitigation:* Good documentation, sensible defaults

---

## Rollout Plan

### Stage 1: Internal Alpha (Week 17)
- Deploy to development environment
- Internal testing by dev team
- Gather feedback and fix critical issues

### Stage 2: Beta Testing (Week 18)
- Deploy to staging environment
- Select group of power users
- Gather detailed feedback
- Fix bugs and refine UX

### Stage 3: Limited Release (Week 19)
- Deploy to production
- Enable for 10% of users
- Monitor performance metrics
- Gather user feedback

### Stage 4: Full Release (Week 20)
- Enable for all users
- Announce new features
- Provide training materials
- Monitor and support

### Stage 5: Post-Release (Week 21+)
- Gather usage analytics
- Plan future enhancements
- Address feedback
- Optimize based on real-world usage

---

## Future Enhancements (Post-V2)

### Phase 9: Advanced Features
- AI-powered ticket categorization
- Smart assignment based on expertise
- Predictive SLA warnings
- Sentiment analysis on comments
- Automated responses for common issues
- Integration with external systems (Jira, Zendesk)
- Multi-language support
- Custom workflow automation
- Advanced reporting and dashboards
- Ticket templates

### Phase 10: Power User Features
- Saved views and perspectives
- Custom dashboard layouts
- Advanced keyboard shortcuts
- Macros for repetitive tasks
- Custom fields and metadata
- Ticket cloning and templating
- Mass operations with scripting
- API access for external tools

---

## Conclusion

This upgrade plan transforms the SupportTickets form from a basic grid into a comprehensive, enterprise-grade support ticket management system. The phased approach ensures manageable implementation while delivering value incrementally.

The final result will showcase Reactory's capabilities for building complex, data-intensive interfaces with rich interactivity, real-time updates, and excellent user experience.

### Key Outcomes
✅ Modern, professional UI matching industry standards  
✅ Efficient workflows for support teams  
✅ Comprehensive feature set for all user types  
✅ High performance with large datasets  
✅ Mobile-optimized experience  
✅ Real-time collaboration capabilities  
✅ Extensive customization options  
✅ Reference implementation for future forms  

### Next Steps
1. Review and approve this plan
2. Set up project board with all tasks
3. Begin Phase 1 implementation
4. Schedule regular check-ins and demos
5. Iterate based on feedback

---

**Document Version:** 1.0  
**Last Updated:** December 23, 2025  
**Owner:** Development Team  
**Reviewers:** Product, UX, Engineering  
**Status:** ✅ Ready for Implementation
