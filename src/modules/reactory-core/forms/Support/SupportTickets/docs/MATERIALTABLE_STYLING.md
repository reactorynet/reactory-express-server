# MaterialTableWidget Styling Configuration

**Important:** The MaterialTableWidget uiSchema is serialized as JSON and **cannot contain functions**. Instead, it uses declarative configuration objects for styling.

## Row Styling Properties

### 1. Basic Row Styles (Static Objects)

```typescript
{
  // Default row style (applied to all rows)
  rowStyle: {
    // CSS properties
  },
  
  // Alternate row style (applied to even rows)
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  
  // Selected row style (applied when row is selected)
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  }
}
```

### 2. Conditional Row Styling (Array Configuration)

Use `conditionalRowStyling` array to apply styles based on field values:

```typescript
{
  conditionalRowStyling: [
    {
      field: 'priority',        // Field path (supports nested: 'user.status')
      condition: 'critical',    // Value to match (case-insensitive)
      style: {                  // CSS properties to apply
        backgroundColor: '#ffebee',
        borderLeft: '4px solid #d32f2f'
      }
    },
    {
      field: 'isOverdue',
      condition: 'true',        // Boolean values as strings
      style: {
        backgroundColor: '#fce4ec'
      }
    }
  ]
}
```

## Complete Example

```typescript
const MaterialTableUIOptions = {
  // ... columns, etc ...
  
  // Base row styling
  rowStyle: {},
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  },
  
  // Conditional styling
  conditionalRowStyling: [
    {
      field: 'priority',
      condition: 'critical',
      style: {
        backgroundColor: '#ffebee',
        borderLeft: '4px solid #d32f2f',
        fontWeight: 600
      }
    },
    {
      field: 'priority',
      condition: 'high',
      style: {
        backgroundColor: '#fff8e1',
        borderLeft: '4px solid #f57c00'
      }
    },
    {
      field: 'status',
      condition: 'closed',
      style: {
        opacity: 0.6,
        textDecoration: 'line-through'
      }
    }
  ],
  
  // Header styling
  headerStyle: {
    backgroundColor: '#f5f5f5',
    fontWeight: 600
  },
  
  // Table options
  options: {
    selection: true,
    pageSize: 25
  }
}
```

## How It Works

The MaterialTableWidget applies styles in this order:

1. **Base `rowStyle`** - Applied to all rows
2. **`altRowStyle`** - Applied to even-indexed rows (if defined)
3. **`conditionalRowStyling`** - Applied when field matches condition
4. **`selectedRowStyle`** - Applied when row is selected

Each layer merges with the previous, so later styles override earlier ones.

## Conditional Styling Logic

```typescript
// Pseudo-code from MaterialTableWidget
conditionalRowStyling.forEach((rule) => {
  const fieldValue = get(rowData, rule.field);
  if (fieldValue.toLowerCase() === rule.condition.toLowerCase()) {
    style = { ...style, ...rule.style };
  }
});
```

## Best Practices

### ✅ Do This
```typescript
{
  conditionalRowStyling: [
    {
      field: 'status',
      condition: 'active',
      style: { color: 'green' }
    }
  ]
}
```

### ❌ Don't Do This
```typescript
{
  options: {
    rowStyle: (rowData) => {  // ❌ Functions won't serialize
      return { color: 'red' };
    }
  }
}
```

## Common Use Cases

### Priority-Based Highlighting
```typescript
conditionalRowStyling: [
  {
    field: 'priority',
    condition: 'critical',
    style: {
      backgroundColor: '#ffebee',
      borderLeft: '4px solid #d32f2f'
    }
  },
  {
    field: 'priority',
    condition: 'high',
    style: {
      backgroundColor: '#fff8e1',
      borderLeft: '4px solid #f57c00'
    }
  }
]
```

### Status-Based Styling
```typescript
conditionalRowStyling: [
  {
    field: 'status',
    condition: 'completed',
    style: {
      opacity: 0.6,
      backgroundColor: '#e8f5e9'
    }
  },
  {
    field: 'status',
    condition: 'failed',
    style: {
      backgroundColor: '#ffebee',
      color: '#d32f2f'
    }
  }
]
```

### Boolean Flags
```typescript
conditionalRowStyling: [
  {
    field: 'isArchived',
    condition: 'true',
    style: {
      opacity: 0.5,
      fontStyle: 'italic'
    }
  },
  {
    field: 'isLocked',
    condition: 'true',
    style: {
      backgroundColor: '#fff3e0',
      cursor: 'not-allowed'
    }
  }
]
```

## Nested Field Paths

You can access nested properties using dot notation:

```typescript
{
  field: 'user.role',
  condition: 'admin',
  style: { fontWeight: 'bold' }
}
```

## Multiple Conditions on Same Row

Multiple rules can apply to the same row:

```typescript
conditionalRowStyling: [
  {
    field: 'priority',
    condition: 'high',
    style: { borderLeft: '4px solid orange' }
  },
  {
    field: 'isOverdue',
    condition: 'true',
    style: { backgroundColor: '#ffebee' }
  }
]
// A row with priority='high' AND isOverdue=true gets BOTH styles
```

## Theme Integration

The widget also respects theme-level styling:

```typescript
// In theme configuration
MaterialTableWidget: {
  light: {
    rowStyle: { /* default light theme row style */ },
    altRowStyle: { /* default light theme alt row style */ },
    selectedRowStyle: { /* default light theme selected style */ },
    headerStyle: { /* default light theme header style */ }
  },
  dark: {
    // dark theme overrides
  }
}
```

Your uiSchema styles will merge with and override theme styles.
