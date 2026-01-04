# Workflow Registry Bulk Actions - User Guide

## Visual Layout

### Before Selection
```
┌─────────────────────────────────────────────────────────────────┐
│ [Search...................................] [Filters] [Export]  │
├─────────────────────────────────────────────────────────────────┤
│ [Active 12] [Inactive 3] [Has Errors 2] [Never Run 5]          │
│ [Scheduled 8] [Recently Updated 4]                              │
└─────────────────────────────────────────────────────────────────┘
```

### After Selection (Bulk Actions Appear)
```
┌─────────────────────────────────────────────────────────────────┐
│ [Search...................................] [Filters] [Export]  │
├─────────────────────────────────────────────────────────────────┤
│ [Active 12] [Inactive 3] [Has Errors 2] [Never Run 5]          │
│ [Scheduled 8] [Recently Updated 4]                              │
├─────────────────────────────────────────────────────────────────┤
│ [✓ 3] 3 workflows selected  │                                   │
│ [Activate] [Deactivate] [Run] [Tags] [Delete]                  │
└─────────────────────────────────────────────────────────────────┘
```

## Bulk Actions

### 1. 🟢 Activate Workflows

**Purpose**: Enable selected inactive workflows for execution

**Dialog Preview**:
```
╔═══════════════════════════════════════════╗
║ ✓ Activate Workflows                      ║
╠═══════════════════════════════════════════╣
║ Are you sure you want to activate         ║
║ the following 3 workflows?                ║
║                                           ║
║ ┌───────────────────────────────────────┐ ║
║ │ • core.DataSync@1.0.0                 │ ║
║ │   Syncs data across systems           │ ║
║ │ • core.EmailProcessor@1.0.0           │ ║
║ │   Processes incoming emails           │ ║
║ │ • reactory.Cleanup@2.0.0              │ ║
║ │   Cleanup old records                 │ ║
║ └───────────────────────────────────────┘ ║
║                                           ║
║ ℹ️ Active workflows will be available     ║
║   for execution and scheduling.           ║
║                                           ║
║           [Cancel]  [✓ Activate]         ║
╚═══════════════════════════════════════════╝
```

**Process**:
1. Select workflows from grid
2. Click "Activate" button
3. Review list in modal
4. Click "Activate" to confirm
5. Progress indicator shows
6. Notification: "Successfully activated 3 workflows"

---

### 2. ⚪ Deactivate Workflows

**Purpose**: Disable selected active workflows

**Dialog Preview**:
```
╔═══════════════════════════════════════════╗
║ ○ Deactivate Workflows                    ║
╠═══════════════════════════════════════════╣
║ Are you sure you want to deactivate       ║
║ the following 2 workflows?                ║
║                                           ║
║ ┌───────────────────────────────────────┐ ║
║ │ • core.Legacy@1.0.0                   │ ║
║ │   Old legacy workflow                 │ ║
║ │ • core.Deprecated@1.0.0               │ ║
║ │   No longer needed                    │ ║
║ └───────────────────────────────────────┘ ║
║                                           ║
║ ⚠️ Deactivated workflows will not be      ║
║   available for execution or scheduling.  ║
║                                           ║
║         [Cancel]  [○ Deactivate]         ║
╚═══════════════════════════════════════════╝
```

---

### 3. 🔵 Execute/Run Workflows

**Purpose**: Start execution of selected workflows

**Dialog Preview**:
```
╔═══════════════════════════════════════════╗
║ ▶ Execute Workflows                       ║
╠═══════════════════════════════════════════╣
║ Execute the following 3 workflows:        ║
║                                           ║
║ ┌───────────────────────────────────────┐ ║
║ │ • core.Process@1.0.0                  │ ║
║ │   Main processing workflow            │ ║
║ │ • core.Notify@1.0.0                   │ ║
║ │   Send notifications                  │ ║
║ │ • core.Archive@1.0.0                  │ ║
║ │   Archive old data                    │ ║
║ └───────────────────────────────────────┘ ║
║                                           ║
║ ☑ Use empty input for all workflows      ║
║                                           ║
║ ℹ️ Workflows will start with empty input  ║
║   parameters and be tagged as             ║
║   "bulk-execution".                       ║
║                                           ║
║           [Cancel]  [▶ Execute]          ║
╚═══════════════════════════════════════════╝
```

**Result**: Creates new instances for each workflow

---

### 4. 🏷️ Manage Tags

**Purpose**: Add, remove, or replace tags on workflows

**Dialog Preview**:
```
╔═══════════════════════════════════════════╗
║ 🏷️ Manage Tags                             ║
╠═══════════════════════════════════════════╣
║ Updating tags for 4 workflows             ║
║                                           ║
║ Operation:                                ║
║ ○ Add Tags  ● Remove Tags  ○ Replace Tags║
║                                           ║
║ Tags (comma-separated):                   ║
║ [production, critical          ] [Add]    ║
║                                           ║
║ Tags to remove:                           ║
║ [production ×] [critical ×]               ║
║                                           ║
║ ℹ️ Matching tags will be removed from     ║
║   workflows                               ║
║                                           ║
║          [Cancel]  [🏷️ Apply Tags]        ║
╚═══════════════════════════════════════════╝
```

**Operations**:
- **Add**: Appends to existing tags
- **Remove**: Removes matching tags
- **Replace**: Replaces all tags

---

### 5. 🔴 Delete Workflows

**Purpose**: Permanently delete workflows (DESTRUCTIVE)

**Dialog Preview**:
```
╔═══════════════════════════════════════════╗
║ 🗑️ Delete Workflows                        ║
╠═══════════════════════════════════════════╣
║ ⚠️ Warning: This action cannot be undone! ║
║ You are about to permanently delete 2     ║
║ workflows.                                ║
║                                           ║
║ Workflows to be deleted:                  ║
║ ┌───────────────────────────────────────┐ ║
║ │ • core.Old@1.0.0                      │ ║
║ │   Executions: 145                     │ ║
║ │ • core.Obsolete@1.0.0                 │ ║
║ │   Executions: 23                      │ ║
║ └───────────────────────────────────────┘ ║
║                                           ║
║ ☐ Also delete all execution instances    ║
║   This will remove all execution history  ║
║                                           ║
║ Type DELETE to confirm:                   ║
║ [________________]                        ║
║                                           ║
║           [Cancel]  [🗑️ Delete]           ║
╚═══════════════════════════════════════════╝
```

**Security**:
- Requires typing "DELETE"
- Admin role required
- Multiple warnings
- Shows execution counts
- Optional instance deletion

---

## Quick Reference

### Button Layout
```
┌─────────────────────────────────────────────────────────┐
│ [✓ 3] 3 workflows selected  │                           │
│ ┌────────┬──────────┬─────┬──────┬────────┐            │
│ │Activate│Deactivate│ Run │ Tags │ Delete │            │
│ │  🟢    │    ⚪    │ 🔵  │ 🏷️   │   🔴   │            │
│ └────────┴──────────┴─────┴──────┴────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Color Coding
- 🟢 **Activate** - Success/Green
- ⚪ **Deactivate** - Default/Gray
- 🔵 **Execute** - Primary/Blue
- 🏷️ **Tags** - Default
- 🔴 **Delete** - Error/Red

### Icons
- ✓ Activate - `check_circle`
- ○ Deactivate - `cancel`
- ▶ Execute - `play_arrow`
- 🏷️ Tags - `label`
- 🗑️ Delete - `delete`

### Access Control
| Action | Roles |
|--------|-------|
| Activate | ADMIN, WORKFLOW_ADMIN |
| Deactivate | ADMIN, WORKFLOW_ADMIN |
| Execute | ADMIN, WORKFLOW_ADMIN, WORKFLOW_OPERATOR |
| Tags | ADMIN, WORKFLOW_ADMIN |
| Delete | ADMIN only |

## Workflow

### Selection → Action → Confirmation → Execution

```
1. SELECT
   ┌──┐ ┌──┐ ┌──┐
   │✓ │ │✓ │ │✓ │  User selects 3 workflows
   └──┘ └──┘ └──┘

2. ACTION
   ┌──────────┐
   │ Activate │  User clicks action button
   └──────────┘

3. CONFIRM
   ╔═══════════════╗
   ║ Are you sure? ║  Modal opens for confirmation
   ║ [Yes] [No]    ║
   ╚═══════════════╝

4. EXECUTE
   ⏳ Processing...  GraphQL mutations run

5. RESULT
   ✅ Success: 3 workflows activated
```

## Error Scenarios

### Partial Failure
```
Selected: 5 workflows
Success: 3 workflows
Failed: 2 workflows

Notification: "Successfully activated 3 workflows, 2 failed"
Type: Warning (yellow)
```

### Complete Failure
```
Selected: 3 workflows
Success: 0 workflows
Failed: 3 workflows

Notification: "Failed to activate workflows"
Type: Error (red)
```

### Network Error
```
Error: "Network request failed"
Display: Alert in modal
Notification: "Failed to activate workflows"
Modal: Stays open for retry
```

## Best Practices

### When to Use Each Action

#### Activate
- Workflows ready for production
- After testing/validation complete
- Re-enabling temporarily disabled workflows

#### Deactivate
- Workflows under maintenance
- Temporarily disable for testing
- Deprecating workflows

#### Execute
- Quick batch execution
- Testing multiple workflows
- Scheduled maintenance tasks

#### Tags
- Organizing workflows
- Adding version tags (v2, v3)
- Environment tags (prod, staging, dev)
- Category tags (critical, optional, legacy)

#### Delete
- Removing obsolete workflows
- Cleaning up test workflows
- Final decommissioning

### Safety Tips

1. ✅ **Review selection** before clicking action
2. ✅ **Read confirmation dialog** carefully
3. ✅ **Check badge count** matches intention
4. ✅ **Use Execute** cautiously - starts real workflows
5. ✅ **Type DELETE** carefully - irreversible
6. ✅ **Consider instance deletion** impact on history

## Keyboard Shortcuts (Future)

Potential shortcuts to add:
- `Ctrl+A` - Select all
- `Shift+Click` - Range select
- `Cmd+D` - Deselect all
- `Delete` - Open delete action
- `Esc` - Close modal

## Notifications

All actions provide clear feedback:

### Success
```
✅ Successfully activated 3 workflows
✅ Started 5 workflows
✅ Successfully updated tags for 2 workflows
```

### Partial Success
```
⚠️ Successfully activated 3 workflows, 2 failed
```

### Error
```
❌ Failed to activate workflows
❌ Failed to delete workflows
```

## Summary

The bulk actions provide powerful workflow management capabilities:

✅ **5 comprehensive actions** following SupportTickets pattern
✅ **Rich confirmation dialogs** with detailed information
✅ **Progress indicators** for long operations
✅ **Error handling** with graceful degradation
✅ **Success reporting** with counts
✅ **Role-based access** for security
✅ **Visual consistency** with Material-UI
✅ **User-friendly** confirmation and feedback

The implementation is complete and ready for production use!


