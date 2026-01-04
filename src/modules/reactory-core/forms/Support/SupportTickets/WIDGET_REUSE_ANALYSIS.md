# Widget Reuse Analysis for SupportTickets Upgrade

**Date:** December 23, 2025  
**Purpose:** Identify existing widgets that can be reused vs. new widgets needed

## Executive Summary

After reviewing the existing widget library in `/components/reactory/ux/mui/widgets/` and shared components, we can **reuse 60-70% of the required widgets** with proper configuration. This significantly reduces the implementation scope.

---

## ✅ Existing Widgets - Ready to Use

### 1. **LabelWidget** (core.LabelComponent@1.0.0)
**Location:** `/components/reactory/ux/mui/widgets/LabelWidget/LabelWidget.tsx`

**Can Replace:**
- ❌ ~~core.DateTimeLabel@1.0.0~~ (use LabelWidget with format option)
- ❌ ~~core.BadgeComponent@1.0.0~~ (partially - use LabelWidget with icon)

**Features:**
- ✅ Template-based formatting with `format: '${...}'`
- ✅ Icon support (left, right, inline positions)
- ✅ Custom component mounting via `componentFqn`
- ✅ Component props mapping
- ✅ Copy to clipboard functionality
- ✅ GraphQL lookup support
- ✅ Boolean rendering (yes/no labels with icons)
- ✅ Empty text support
- ✅ Custom variants (h1-h6, body1, body2, etc.)

**Usage in SupportTickets:**

```typescript
// For date fields with relative time
{
  title: 'Created',
  field: 'createdDate',
  component: 'core.LabelComponent@1.0.0',
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'body2',
        format: '${reactory.utils.moment(rowData.createdDate).fromNow()}',
        // Tooltip with full date
        title: '${reactory.utils.moment(rowData.createdDate).format("YYYY-MM-DD HH:mm:ss")}'
      }
    }
  }
}

// For user name display (without avatar)
{
  title: 'Logged By',
  field: 'createdBy',
  component: 'core.LabelComponent@1.0.0',
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'body2',
        format: '${rowData.createdBy ? rowData.createdBy.firstName : "NO"} ${rowData.createdBy ? rowData.createdBy.lastName : "USER"}'
      }
    }
  }
}

// For comment count badge
{
  title: 'Comments',
  field: 'comments',
  component: 'core.LabelComponent@1.0.0',
  props: {
    uiSchema: {
      'ui:options': {
        variant: 'body2',
        icon: 'comment',
        iconPosition: 'left',
        format: '${rowData.comments?.length || 0}'
      }
    }
  }
}
```

---

### 2. **ChipArrayWidget** (ChipArray)
**Location:** `/components/reactory/ux/mui/widgets/ChipArray/ChipArray.tsx`

**Can Replace:**
- ❌ ~~core.ChipComponent@1.0.0~~ (use ChipArray for single or multiple chips)
- ❌ ~~core.TagSelectField@1.0.0~~ (ChipArray with add functionality)

**Features:**
- ✅ Renders array of chips
- ✅ Template-based labels `labelFormat: '${item}'`
- ✅ Add new chips with input or custom component
- ✅ Delete individual chips
- ✅ Delete all functionality
- ✅ Custom add component via `addComponentFqn`

**Usage in SupportTickets:**

```typescript
// For tags field in schema
tags: {
  type: 'array',
  items: { type: 'string' }
}

// In uiSchema
tags: {
  'ui:widget': 'ChipArray',
  'ui:options': {
    labelFormat: '${item}',
    allowAdd: true,
    allowDelete: true,
    allowDeleteAll: true
  }
}

// For priority as a chip (if needed)
priority: {
  'ui:widget': 'ChipArray',
  'ui:options': {
    labelFormat: '${item.toUpperCase()}',
    allowDelete: false,
    allowAdd: false
  }
}
```

---

### 3. **ConditionalIconWidget**
**Location:** `/components/reactory/ux/mui/widgets/ConditionalIconWidget/ConditionalIconWidget.tsx`

**Can Replace:**
- ❌ ~~core.PriorityBadge@1.0.0~~ (use ConditionalIcon with conditions)
- ❌ ~~core.SupportTicketStatusBadge@1.0.0~~ (partially - for icon only)

**Features:**
- ✅ Conditional icon display based on value
- ✅ Custom icons per condition
- ✅ Tooltip support
- ✅ Custom styles per condition
- ✅ Button variant
- ✅ Icon type support

**Usage in SupportTickets:**

```typescript
// For priority icon indicator
priority: {
  'ui:widget': 'ConditionalIconWidget',
  'ui:options': {
    variant: 'tooltip',
    conditions: [
      {
        key: 'critical',
        icon: 'local_fire_department',
        tooltip: 'Critical Priority',
        style: { color: '#d32f2f' }
      },
      {
        key: 'high',
        icon: 'arrow_upward',
        tooltip: 'High Priority',
        style: { color: '#f57c00' }
      },
      {
        key: 'medium',
        icon: 'remove',
        tooltip: 'Medium Priority',
        style: { color: '#1976d2' }
      },
      {
        key: 'low',
        icon: 'arrow_downward',
        tooltip: 'Low Priority',
        style: { color: '#757575' }
      }
    ]
  }
}
```

---

### 4. **UserSelectorWidget**
**Location:** `/components/reactory/ux/mui/widgets/UserSelectorWidget/UserSelectorWidget.tsx`

**Can Replace:**
- ❌ ~~core.UserSelectField@1.0.0~~ (already exists)

**Features:**
- ✅ Modal with user search
- ✅ Multi-select support
- ✅ Organization filtering
- ✅ Business unit filter
- ✅ Create new user inline

**Usage in SupportTickets:**

```typescript
// For assignment field
assignedTo: {
  'ui:widget': 'UserSelectorWidget',
  'ui:options': {
    multiSelect: false,
    showFilters: true,
    businessUnitFilter: true
  }
}
```

---

### 5. **MaterialTableWidget**
**Location:** `/components/reactory/ux/mui/widgets/MaterialTableWidget/MaterialTableWidget.tsx`

**Status:** ✅ Already in use

**Features:**
- ✅ Pagination
- ✅ Sorting
- ✅ Filtering
- ✅ Search
- ✅ Selection
- ✅ Detail panel
- ✅ Custom components per column
- ✅ Actions (row and toolbar)
- ✅ Remote data support

---

### 6. **ChipLabel** (Shared Component)
**Location:** `/components/shared/ChipLabel/ChipLabel.tsx`

**Can Use For:**
- User chips with avatars
- Status chips

**Features:**
- ✅ Array of chips
- ✅ Template-based formatting
- ✅ Avatar support (user photos)
- ✅ Custom styling

**Usage in SupportTickets:**

```typescript
// Register as a column component if needed
{
  title: 'Assigned To',
  field: 'assignedTo',
  component: 'core.ChipLabel@1.0.0',
  componentProps: {
    chips: '${[rowData.assignedTo]}',
    'ui:options': {
      format: '${who.firstName} ${who.lastName}',
      useUserAvatar: true
    }
  }
}
```

---

### 7. **DateLabel** (Shared Component)
**Location:** `/components/shared/DateLabel/DateLabel.tsx`

**Features:**
- ✅ Moment.js formatting
- ✅ Custom format strings
- ✅ Typography variant support

**Note:** LabelWidget is more flexible, but this can be used as a dedicated date component.

---

### 8. **SearchWidget**
**Location:** `/components/reactory/ux/mui/widgets/SearchWidget/SearchWidget.tsx`

**Can Use For:**
- ❌ ~~Enhanced search bar~~ (MaterialTable has built-in search)

---

### 9. **ContentWidget**
**Location:** `/components/reactory/ux/mui/widgets/ContentWidget/ContentWidget.tsx`

**Can Use For:**
- Empty states
- Help text
- Static content areas

---

### 10. **CardWidget**
**Location:** `/components/reactory/ux/mui/widgets/CardWidget/CardWidget.tsx`

**Can Use For:**
- Summary cards
- Dashboard widgets
- Mobile card layout

---

## 🔨 New Widgets Needed - Generic (Reusable)

These should go in `/reactory-pwa-client/src/components/reactory/ux/mui/widgets/`

### 1. **StatusBadge Widget** ⭐
**File:** `StatusBadge/StatusBadge.tsx`  
**Reason:** Highly reusable for any status field across the platform

**Features:**
- Chip/Badge with color coding
- Icon support
- Inline editing (optional)
- Customizable color mapping
- Size variants

**Props:**
```typescript
interface StatusBadgeProps {
  value: string;
  colorMap?: { [key: string]: string };
  iconMap?: { [key: string]: string };
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  editable?: boolean;
  options?: string[]; // For inline editing
  onChange?: (newValue: string) => void;
}
```

**Usage:**
```typescript
{
  title: 'Status',
  field: 'status',
  component: 'core.StatusBadge@1.0.0',
  propsMap: {
    'rowData.status': 'value'
  },
  props: {
    colorMap: {
      'new': '#9c27b0',
      'open': '#2196f3',
      'resolved': '#4caf50'
    },
    variant: 'filled',
    size: 'small'
  }
}
```

---

### 2. **UserAvatar Widget** ⭐
**File:** `UserAvatar/UserAvatar.tsx`  
**Reason:** Reusable for any user display across the platform

**Features:**
- Avatar with name
- Can be chip or just avatar
- Email on hover
- Click handler
- Unassigned state
- Size variants

**Props:**
```typescript
interface UserAvatarProps {
  user: Reactory.Models.IUserBio | null;
  variant?: 'chip' | 'avatar' | 'avatar-name';
  size?: 'small' | 'medium' | 'large';
  showEmail?: boolean;
  clickable?: boolean;
  onClick?: (user: User) => void;
  unassignedText?: string;
  unassignedIcon?: string;
}
```

**Usage:**
```typescript
{
  title: 'Assigned To',
  field: 'assignedTo',
  component: 'core.UserAvatar@1.0.0',
  propsMap: {
    'rowData.assignedTo': 'user'
  },
  props: {
    variant: 'chip',
    size: 'small',
    showEmail: true,
    unassignedText: 'Unassigned'
  }
}
```

---

### 3. **RelativeTime Widget** ⭐
**File:** `RelativeTime/RelativeTime.tsx`  
**Reason:** Very common use case across many forms

**Features:**
- Relative time display ("2 hours ago")
- Tooltip with absolute time
- Auto-refresh option
- Format customization

**Props:**
```typescript
interface RelativeTimeProps {
  date: string | Date;
  format?: 'relative' | 'absolute' | 'custom';
  customFormat?: string;
  tooltip?: boolean;
  tooltipFormat?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
```

**Usage:**
```typescript
{
  title: 'Created',
  field: 'createdDate',
  component: 'core.RelativeTime@1.0.0',
  propsMap: {
    'rowData.createdDate': 'date'
  },
  props: {
    format: 'relative',
    tooltip: true,
    tooltipFormat: 'YYYY-MM-DD HH:mm:ss'
  }
}
```

---

### 4. **CountBadge Widget** ⭐
**File:** `CountBadge/CountBadge.tsx`  
**Reason:** Reusable for any count display (comments, files, notifications)

**Features:**
- Count with icon
- Show/hide zero
- Max count (99+)
- Color variants
- Clickable

**Props:**
```typescript
interface CountBadgeProps {
  count: number;
  icon: string;
  showZero?: boolean;
  max?: number;
  color?: 'default' | 'primary' | 'secondary' | 'error';
  onClick?: () => void;
}
```

**Usage:**
```typescript
{
  title: 'Comments',
  field: 'comments',
  component: 'core.CountBadge@1.0.0',
  propsMap: {
    'rowData.comments.length': 'count'
  },
  props: {
    icon: 'comment',
    showZero: true,
    color: 'primary'
  }
}
```

---

### 5. **QuickFilter Widget** ⭐
**File:** `QuickFilter/QuickFilter.tsx`  
**Reason:** Reusable for any grid/list that needs quick filters

**Features:**
- Filter button chips
- Badge counts
- Active state
- Multiple selection
- Custom colors/icons

**Props:**
```typescript
interface QuickFilterProps {
  filters: Array<{
    id: string;
    label: string;
    icon: string;
    color?: string;
    badge?: number;
    filter: any;
  }>;
  activeFilters: string[];
  onFilterChange: (filterId: string) => void;
}
```

---

### 6. **AdvancedFilterPanel Widget** ⭐⭐
**File:** `AdvancedFilterPanel/AdvancedFilterPanel.tsx`  
**Reason:** Highly reusable for complex filtering across all grids

**Features:**
- Multi-field filtering
- Date range pickers
- Multi-select dropdowns
- User selection
- Save/load presets
- Clear all
- Drawer/modal layout

This is a more complex widget but very valuable across the platform.

---

### 7. **EmptyState Widget**
**File:** `EmptyState/EmptyState.tsx`  
**Reason:** Generic empty state for tables, lists, etc.

**Features:**
- Icon
- Title
- Subtitle
- Action buttons

---

## 🎫 Support-Specific Widgets

These should go in `/reactory-express-server/src/modules/reactory-core/forms/Support/Widgets/`

### 1. **core.SupportTicketStatusComponent@1.0.0** ✅
**File:** `core.SupportTicketStatusWidget.tsx` (already exists)

**Status:** Needs enhancement with StatusBadge

**Current:** Dropdown menu for actions  
**Enhanced:** Use StatusBadge + action menu

---

### 2. **core.SupportTicketInfoPanel@1.0.0** ✅
**File:** `core.SupportTicketInfoPanel.tsx` (already exists)

**Status:** Needs significant enhancement

**Current:** Basic grid with reference, date, assigned to  
**Enhanced:** Rich detail panel with tabs

---

### 3. **core.SupportTicketWorkflow@1.0.0** ✅
**File:** `core.SupportTicketWorkflow.ts` (already exists)

**Status:** Good foundation, needs extension

**Enhancements Needed:**
- Export functionality
- Print functionality
- More helper methods

---

### 4. **core.SupportTicketDetailPanel@1.0.0** 🆕
**File:** `core.SupportTicketDetailPanel.tsx`

**Purpose:** Main detail panel with tabbed interface

**Should Use:**
- Material-UI Tabs
- Material-UI TabPanel
- Existing widgets for content

---

### 5. **core.SupportTicketOverview@1.0.0** 🆕
**File:** `DetailPanelTabs/core.SupportTicketOverview.tsx`

**Purpose:** Overview tab content

**Should Use:**
- UserAvatar widget
- StatusBadge widget
- ChipArray for tags
- RelativeTime for dates

---

### 6. **core.SupportTicketComments@1.0.0** 🆕
**File:** `DetailPanelTabs/core.SupportTicketComments.tsx`

**Purpose:** Comments tab with rich text editor

**Should Use:**
- RichEditorWidget (already exists)
- UserAvatar for comment authors
- RelativeTime for timestamps

---

### 7. **core.SupportTicketAttachments@1.0.0** 🆕
**File:** `DetailPanelTabs/core.SupportTicketAttachments.tsx`

**Purpose:** File management tab

**Should Use:**
- ReactoryDropZoneWidget (already exists)
- DocumentListComponent (shared component exists)

---

### 8. **core.SupportTicketActivity@1.0.0** 🆕
**File:** `DetailPanelTabs/core.SupportTicketActivity.tsx`

**Purpose:** Timeline of ticket events

**Should Use:**
- Material-UI Timeline
- ConditionalIconWidget for event icons
- RelativeTime for timestamps

---

### 9. **core.SupportTicketRelated@1.0.0** 🆕
**File:** `DetailPanelTabs/core.SupportTicketRelated.tsx`

**Purpose:** Related tickets

**Should Use:**
- Mini MaterialTableWidget
- SearchWidget for finding tickets

---

### 10. **core.BulkStatusChangeAction@1.0.0** 🆕
**File:** `core.BulkStatusChangeAction.tsx`

**Purpose:** Bulk status change dialog

**Should Use:**
- SelectWidget
- BasicModal/AlertDialog (shared components)

---

### 11. **core.BulkAssignAction@1.0.0** 🆕
**File:** `core.BulkAssignAction.tsx`

**Purpose:** Bulk assignment dialog

**Should Use:**
- UserSelectorWidget
- BasicModal/AlertDialog

---

### 12. **core.BulkPriorityAction@1.0.0** 🆕
**File:** `core.BulkPriorityAction.tsx`

**Purpose:** Bulk priority change

**Should Use:**
- ConditionalIconWidget for priority preview
- SelectWidget

---

### 13. **core.SupportTicketStatsCards@1.0.0** 🆕
**File:** `core.SupportTicketStatsCards.tsx`

**Purpose:** Dashboard summary cards

**Should Use:**
- CardWidget (already exists)
- CountBadge widget
- Grid layout

---

## 📊 Implementation Priority

### Phase 1: Generic Reusable Widgets (Week 1)
1. ✅ **StatusBadge** - High priority, used everywhere
2. ✅ **UserAvatar** - High priority, used everywhere
3. ✅ **RelativeTime** - High priority, used everywhere
4. ✅ **CountBadge** - High priority, used everywhere

### Phase 2: Support Specific Basics (Week 2)
5. 🎫 Enhance **SupportTicketStatusComponent** to use StatusBadge
6. 🎫 Create **SupportTicketDetailPanel** (main container)
7. 🎫 Create **SupportTicketOverview** tab

### Phase 3: Advanced Generic Widgets (Week 3)
8. ✅ **QuickFilter** - Medium priority
9. ✅ **AdvancedFilterPanel** - Medium priority (complex)
10. ✅ **EmptyState** - Low priority

### Phase 4: Detail Panel Tabs (Week 4)
11. 🎫 **SupportTicketComments**
12. 🎫 **SupportTicketAttachments**
13. 🎫 **SupportTicketActivity**
14. 🎫 **SupportTicketRelated**

### Phase 5: Bulk Actions (Week 5)
15. 🎫 **BulkStatusChangeAction**
16. 🎫 **BulkAssignAction**
17. 🎫 **BulkPriorityAction**

### Phase 6: Analytics (Week 6)
18. 🎫 **SupportTicketStatsCards**

---

## 🎯 Updated Component Count

### Original Plan: 28 new components
### Revised Plan: 11 new generic + 11 support-specific = 22 components

**Savings:**
- ❌ DateTimeLabel → Use LabelWidget
- ❌ BadgeComponent → Use CountBadge (new but simpler)
- ❌ ChipComponent → Use ChipArray
- ❌ PriorityBadge → Use ConditionalIconWidget or StatusBadge
- ❌ TagSelectField → Use ChipArray
- ❌ UserSelectField → Use UserSelectorWidget

**Net Reduction:** 6 components saved = **22 total components**

---

## 📝 Configuration Examples

### Updated Column Configuration Using Existing Widgets

```typescript
columns: [
  // Reference - Use LabelWidget with copy
  {
    title: 'Ref',
    field: 'reference',
    component: 'core.LabelComponent@1.0.0',
    props: {
      uiSchema: {
        'ui:options': {
          variant: 'body2',
          format: '${rowData.reference}',
          copyToClipboard: true,
          fontFamily: 'monospace'
        }
      }
    }
  },
  
  // Status - NEW StatusBadge widget
  {
    title: 'Status',
    field: 'status',
    component: 'core.StatusBadge@1.0.0',
    propsMap: {
      'rowData.status': 'value'
    },
    props: {
      colorMap: {
        'new': '#9c27b0',
        'open': '#2196f3',
        'in-progress': '#ff9800',
        'resolved': '#4caf50',
        'closed': '#757575'
      }
    }
  },
  
  // Priority - Use ConditionalIconWidget + StatusBadge
  {
    title: 'Priority',
    field: 'priority',
    component: 'core.StatusBadge@1.0.0',
    propsMap: {
      'rowData.priority': 'value'
    },
    props: {
      colorMap: {
        'critical': '#d32f2f',
        'high': '#f57c00',
        'medium': '#1976d2',
        'low': '#757575'
      },
      iconMap: {
        'critical': 'local_fire_department',
        'high': 'arrow_upward',
        'medium': 'remove',
        'low': 'arrow_downward'
      }
    }
  },
  
  // Request Title - Use LabelWidget
  {
    title: 'Request',
    field: 'request',
    component: 'core.LabelComponent@1.0.0',
    props: {
      uiSchema: {
        'ui:options': {
          variant: 'body2',
          format: '${rowData.request}',
        }
      }
    }
  },
  
  // Type - Use ChipArray (single item)
  {
    title: 'Type',
    field: 'requestType',
    render: (rowData) => {
      // Simple chip rendering via MaterialTableWidget's render function
      // Or use a custom component
    }
  },
  
  // Assigned To - NEW UserAvatar widget
  {
    title: 'Assigned To',
    field: 'assignedTo',
    component: 'core.UserAvatar@1.0.0',
    propsMap: {
      'rowData.assignedTo': 'user'
    },
    props: {
      variant: 'chip',
      size: 'small',
      unassignedText: 'Unassigned'
    }
  },
  
  // Created Date - NEW RelativeTime widget
  {
    title: 'Created',
    field: 'createdDate',
    component: 'core.RelativeTime@1.0.0',
    propsMap: {
      'rowData.createdDate': 'date'
    },
    props: {
      format: 'relative',
      tooltip: true
    }
  },
  
  // Comments Count - NEW CountBadge widget
  {
    title: 'Comments',
    field: 'comments',
    component: 'core.CountBadge@1.0.0',
    propsMap: {
      'rowData.comments.length': 'count'
    },
    props: {
      icon: 'comment',
      showZero: true
    }
  }
]
```

---

## 🚀 Immediate Next Steps

1. **Create 4 Generic Widgets (Week 1)**
   - StatusBadge
   - UserAvatar
   - RelativeTime
   - CountBadge

2. **Update UPGRADE_PLAN.md**
   - Revise component list
   - Update Phase 1 tasks
   - Adjust timeline

3. **Update uiSchema.ts**
   - Use existing widgets where possible
   - Configure LabelWidget for various uses
   - Plan for new widgets

4. **Create Widget Templates**
   - Establish patterns for new widgets
   - Ensure consistency
   - Document props interfaces

---

## 💡 Recommendations

### For Generic Widgets
- Add to widget registry in `/components/reactory/ux/mui/widgets/index.tsx`
- Create Storybook stories for each
- Write comprehensive prop interfaces
- Add JSDoc comments
- Make them as configurable as possible

### For Support Widgets
- Keep focused on support-specific logic
- Compose with generic widgets
- Follow established patterns
- Server-side components in modules/index.ts

### Configuration Over Code
- Maximize use of existing widgets through configuration
- Only create new widgets when truly needed
- Prefer composition over creation

---

## 📚 Documentation Needed

1. **Widget Composition Guide**
   - How to use LabelWidget for various purposes
   - ConditionalIcon patterns
   - ChipArray configurations

2. **New Widget Documentation**
   - Props interfaces
   - Usage examples
   - Visual examples

3. **MaterialTable Column Guide**
   - How to configure custom components
   - Props mapping patterns
   - Common use cases

---

**Status:** ✅ Ready for Implementation  
**Estimated Savings:** ~30% reduction in new component creation  
**Focus:** Leverage existing, create only what's truly needed
