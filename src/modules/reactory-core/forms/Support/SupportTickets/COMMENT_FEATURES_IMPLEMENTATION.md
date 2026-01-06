# Comment Edit, Delete, Reply, and Reactions Implementation

**Date:** December 23, 2025  
**Feature:** Full comment interaction functionality  
**Status:** ✅ Complete

## Summary

Implemented complete comment management functionality including edit, delete, reply (threading), upvote, downvote, favorite, and flag operations. All mutations are added to the Comment GraphQL schema and resolver, with full integration into the SupportTicketComments widget.

## Changes Made

### 1. GraphQL Schema Updates (`Comment.graphql`)

#### New Input Types

**EditCommentInput**
```graphql
input EditCommentInput {
  commentId: ObjID!
  text: String!
}
```

**DeleteCommentInput**
```graphql
input DeleteCommentInput {
  commentId: ObjID!
  softDelete: Boolean
}
```

**ToggleCommentReactionInput**
```graphql
input ToggleCommentReactionInput {
  commentId: ObjID!
  reactionType: CommentReactionType!
}
```

#### New Enum

**CommentReactionType**
```graphql
enum CommentReactionType {
  UPVOTE
  DOWNVOTE
  FAVORITE
}
```

#### New Result Types

**DeleteCommentSuccess / DeleteCommentError**
```graphql
type DeleteCommentSuccess {
  success: Boolean!
  commentId: ObjID!
  message: String
}

type DeleteCommentError {
  error: String!
  message: String
  commentId: ObjID
}

union DeleteCommentResult = DeleteCommentSuccess | DeleteCommentError
```

#### New Mutations (7)

1. **editComment** - Edit comment text (author only)
2. **deleteComment** - Soft/hard delete (author or admin)
3. **upvoteComment** - Toggle upvote
4. **downvoteComment** - Toggle downvote
5. **favoriteComment** - Toggle favorite
6. **toggleCommentReaction** - Generic reaction toggle
7. **flagComment** - Flag for moderation

### 2. Comment Resolver Updates (`Comment.ts`)

Added 7 mutation resolver methods with full implementation:

#### editComment()
```typescript
@roles(["USER"], 'args.context')
@mutation("editComment")
async editComment(obj, args, context): Promise<IReactoryCommentDocument>
```

**Features:**
- ✅ Validates comment text (non-empty)
- ✅ Permission check (only author can edit)
- ✅ Updates `text`, `updatedAt`, and `updatedBy`
- ✅ Returns populated comment
- ✅ Logs action
- ✅ Error handling with `InsufficientPermissions`

#### deleteComment()
```typescript
@roles(["USER"], 'args.context')
@mutation("deleteComment")
async deleteComment(obj, args, context): DeleteCommentResult
```

**Features:**
- ✅ **Soft Delete** (default): Sets `removed = true`
- ✅ **Hard Delete**: Permanently removes from database (admin only)
- ✅ Permission check (author or admin)
- ✅ Returns union result type (Success/Error)
- ✅ Comprehensive error handling
- ✅ Logs actions with appropriate levels (info/warn)

**Soft Delete vs Hard Delete:**
| Type | Who Can Do It | Action | Reversible |
|------|--------------|--------|------------|
| Soft | Author | Sets `removed = true` | Yes (by admin) |
| Hard | Admin only | Deletes from DB | No |

#### upvoteComment()
```typescript
@roles(["USER"], 'args.context')
@mutation("upvoteComment")
async upvoteComment(obj, args, context): Promise<IReactoryCommentDocument>
```

**Logic:**
```
If user already upvoted:
  → Remove upvote (toggle off)
Else:
  → Add upvote
  → Remove downvote if present (can't have both)
```

**Features:**
- ✅ Toggle behavior (click again to remove)
- ✅ Mutual exclusion with downvote
- ✅ Initializes arrays if null
- ✅ Updates `updatedAt`

#### downvoteComment()
```typescript
@roles(["USER"], 'args.context')
@mutation("downvoteComment")
async downvoteComment(obj, args, context): Promise<IReactoryCommentDocument>
```

**Logic:**
```
If user already downvoted:
  → Remove downvote (toggle off)
Else:
  → Add downvote
  → Remove upvote if present (can't have both)
```

#### favoriteComment()
```typescript
@roles(["USER"], 'args.context')
@mutation("favoriteComment")
async favoriteComment(obj, args, context): Promise<IReactoryCommentDocument>
```

**Logic:**
```
If user already favorited:
  → Remove favorite (toggle off)
Else:
  → Add favorite
```

**Note:** Favorites are independent of upvotes/downvotes

#### toggleCommentReaction()
```typescript
@roles(["USER"], 'args.context')
@mutation("toggleCommentReaction")
async toggleCommentReaction(obj, args, context): Promise<IReactoryCommentDocument>
```

**Features:**
- ✅ Generic handler for all reaction types
- ✅ Delegates to specific methods
- ✅ Single API for UI simplicity

#### flagComment()
```typescript
@roles(["USER"], 'args.context')
@mutation("flagComment")
async flagComment(obj, args, context): Promise<IReactoryCommentDocument>
```

**Features:**
- ✅ Sets `flagged = true`
- ✅ Logs with warning level
- ✅ Records flagging user and reason
- ✅ For moderation review

### 3. Widget Integration (`core.SupportTicketComments.tsx`)

Updated all placeholder handlers with real implementations:

#### handleEditComment()
**Before:**
```typescript
const handleEditComment = (commentId: string) => {
  setEditingId(commentId);
  // TODO: Load comment text for editing
};
```

**After:**
```typescript
const handleEditComment = async (commentId: string, currentText: string) => {
  setEditingId(commentId);
  setCommentText(currentText);
};

const handleSaveEdit = async (commentId: string) => {
  // ... GraphQL mutation call
  // ... Validation, error handling, notifications
  // ... Emit 'core.SupportTicketUpdated' event
};

const handleCancelEdit = () => {
  setEditingId(null);
  setCommentText('');
};
```

**Features:**
- ✅ Loads current text into editor
- ✅ Shows save/cancel buttons when editing
- ✅ Validates before saving
- ✅ Success/error notifications
- ✅ Emits update event for refresh

#### handleDeleteComment()
**Before:**
```typescript
const handleDeleteComment = async (commentId: string) => {
  // TODO: Implement delete mutation
  reactory.createNotification('Delete comment - Coming soon', { type: 'info' });
};
```

**After:**
```typescript
const handleDeleteComment = async (commentId: string) => {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  const result = await reactory.graphqlMutation(`
    mutation DeleteComment($input: DeleteCommentInput!) {
      deleteComment(input: $input) {
        ... on DeleteCommentSuccess { success message }
        ... on DeleteCommentError { error message }
      }
    }
  `, { input: { commentId, softDelete: true } });
  
  // ... Handle union result type
  // ... Show appropriate notifications
};
```

**Features:**
- ✅ Confirmation dialog
- ✅ Soft delete by default
- ✅ Union result type handling
- ✅ Success/error notifications
- ✅ Emits update event

#### handleUpvote() (NEW)
```typescript
const handleUpvote = async (commentId: string) => {
  const result = await reactory.graphqlMutation(`
    mutation UpvoteComment($commentId: ObjID!) {
      upvoteComment(commentId: $commentId) {
        id
        upvotes
        downvotes
      }
    }
  `, { commentId });
  
  // ... Emit update event
};
```

**Features:**
- ✅ Toggle behavior
- ✅ Real-time count updates
- ✅ Error handling
- ✅ Emits update event

#### handleReply()
**Before:**
```typescript
const handleReply = (commentId: string) => {
  setReplyingToId(commentId);
  // TODO: Implement threaded replies
};
```

**After:**
```typescript
const handleReply = (commentId: string) => {
  setReplyingToId(commentId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

**Features:**
- ✅ Sets reply context (uses existing `ReactoryAddSupportTicketComment` mutation with `parentId`)
- ✅ Scrolls to comment input
- ✅ Works with existing comment submission

**Note:** Reply functionality reuses the existing add comment mutation with the `parentId` parameter. When `replyingToId` is set, the comment is posted as a threaded reply.

## Mutation Examples

### Edit Comment
```graphql
mutation EditComment($input: EditCommentInput!) {
  editComment(input: $input) {
    id
    text
    when
    who {
      firstName
      lastName
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "commentId": "comment-id-here",
    "text": "<p>Updated comment text</p>"
  }
}
```

### Delete Comment
```graphql
mutation DeleteComment($input: DeleteCommentInput!) {
  deleteComment(input: $input) {
    ... on DeleteCommentSuccess {
      success
      message
      commentId
    }
    ... on DeleteCommentError {
      error
      message
      commentId
    }
  }
}
```

**Variables (Soft Delete):**
```json
{
  "input": {
    "commentId": "comment-id-here",
    "softDelete": true
  }
}
```

**Variables (Hard Delete - Admin Only):**
```json
{
  "input": {
    "commentId": "comment-id-here",
    "softDelete": false
  }
}
```

### Upvote Comment
```graphql
mutation UpvoteComment($commentId: ObjID!) {
  upvoteComment(commentId: $commentId) {
    id
    upvotes
    downvotes
    upvoted {
      id
      firstName
    }
  }
}
```

### Downvote Comment
```graphql
mutation DownvoteComment($commentId: ObjID!) {
  downvoteComment(commentId: $commentId) {
    id
    upvotes
    downvotes
  }
}
```

### Favorite Comment
```graphql
mutation FavoriteComment($commentId: ObjID!) {
  favoriteComment(commentId: $commentId) {
    id
    favorites
    favorite {
      id
      firstName
    }
  }
}
```

### Toggle Reaction (Generic)
```graphql
mutation ToggleReaction($input: ToggleCommentReactionInput!) {
  toggleCommentReaction(input: $input) {
    id
    upvotes
    downvotes
    favorites
  }
}
```

**Variables:**
```json
{
  "input": {
    "commentId": "comment-id-here",
    "reactionType": "UPVOTE"
  }
}
```

### Flag Comment
```graphql
mutation FlagComment($commentId: ObjID!, $reason: String) {
  flagComment(commentId: $commentId, reason: $reason) {
    id
    flagged
  }
}
```

## Permission Model

### Edit Comment
- ✅ **Author Only**: Only the user who created the comment can edit it
- ❌ **Admins Cannot**: Even admins cannot edit other users' comments (maintains authenticity)

### Delete Comment
- ✅ **Soft Delete**: Author or Admin
- ✅ **Hard Delete**: Admin only
- ❌ **Others**: Cannot delete

### Reactions (Upvote/Downvote/Favorite)
- ✅ **Any User**: All logged-in users can react
- ✅ **Self-Reactions**: Users can react to their own comments

### Flag Comment
- ✅ **Any User**: All logged-in users can flag
- ✅ **For Moderation**: Flags are logged for review

## UI Flow

### Edit Flow
```
1. User clicks "Edit" button on their comment
2. Comment text loads into editor
3. User modifies text
4. User clicks "Save" or "Cancel"
5. If Save:
   → Validate non-empty
   → Call editComment mutation
   → Show success notification
   → Emit update event
   → Clear editing state
```

### Delete Flow
```
1. User clicks "Delete" button on their comment
2. Confirmation dialog appears
3. If confirmed:
   → Call deleteComment mutation (soft delete)
   → Handle union result type
   → Show success/error notification
   → Emit update event
```

### Reply Flow
```
1. User clicks "Reply" on any comment
2. Sets replyingToId state
3. Scrolls to comment input at top
4. User enters reply text
5. When posted:
   → Uses ReactoryAddSupportTicketComment mutation
   → Passes parentId from replyingToId
   → Creates threaded reply
   → Clear replyingToId
```

### Upvote Flow
```
1. User clicks "Like" button
2. Call upvoteComment mutation
3. Backend toggles upvote:
   → If already upvoted: Remove
   → If not: Add upvote, remove downvote
4. Return updated counts
5. Emit update event
6. UI updates count display
```

## Toggle Behavior

All reactions use toggle behavior:

**Upvote:**
```
Not upvoted + Click → Upvoted (downvote removed if present)
Upvoted + Click → Not upvoted
```

**Downvote:**
```
Not downvoted + Click → Downvoted (upvote removed if present)
Downvoted + Click → Not downvoted
```

**Favorite:**
```
Not favorited + Click → Favorited
Favorited + Click → Not favorited
```

**Note:** Upvote and downvote are mutually exclusive, but favorite is independent.

## Event System

All operations emit the `core.SupportTicketUpdated` event:

```typescript
reactory.emit('core.SupportTicketUpdated', { 
  ticketId: ticket.id,
  comment: updatedComment  // Optional
});
```

Components can listen for this event to refresh data:

```typescript
reactory.on('core.SupportTicketUpdated', (event) => {
  if (event.ticketId === myTicketId) {
    refetchTicketData();
  }
});
```

## Error Handling

### Client-Side Validation
- ✅ **Empty text check**: Before submitting edits
- ✅ **Confirmation dialogs**: For destructive actions (delete)

### Server-Side Validation
- ✅ **Permission checks**: All mutations verify user permissions
- ✅ **Existence checks**: Verify comment exists
- ✅ **Input validation**: Check required fields

### Error Messages
```typescript
// Edit - Not author
throw new InsufficientPermissions('You can only edit your own comments');

// Delete - Not author or admin
return {
  __typename: 'DeleteCommentError',
  error: 'Permission denied',
  message: 'You can only delete your own comments',
};

// Comment not found
throw new Error('Comment not found');

// Empty text
throw new Error('Comment text cannot be empty');
```

## Database Updates

### Edit Operation
```typescript
comment.text = newText;
comment.updatedAt = new Date();
comment.updatedBy = context.user._id;
await comment.save();
```

### Soft Delete
```typescript
comment.removed = true;
comment.updatedAt = new Date();
comment.updatedBy = context.user._id;
await comment.save();
```

### Hard Delete (Admin Only)
```typescript
await CommentModel.findByIdAndDelete(commentId).exec();
```

### Upvote Toggle
```typescript
if (alreadyUpvoted) {
  comment.upvoted.splice(upvoteIndex, 1);
} else {
  comment.upvoted.push(userId);
  comment.downvoted = comment.downvoted.filter(id => id !== userId);
}
comment.updatedAt = new Date();
await comment.save();
```

## Logging

All operations are logged with appropriate levels:

```typescript
// Edit
context.log('Comment edited', { commentId, userId }, 'info');

// Soft Delete
context.log('Comment soft deleted', { commentId, userId }, 'info');

// Hard Delete
context.log('Comment permanently deleted', { commentId, userId }, 'warn');

// Flag
context.log('Comment flagged', { commentId, flaggedBy, reason }, 'warn');
```

## Testing Checklist

### Edit Comment
- [ ] Edit own comment
- [ ] Try to edit another user's comment (should fail)
- [ ] Edit with empty text (should fail)
- [ ] Edit with valid text
- [ ] Verify `updatedAt` changes
- [ ] Cancel edit

### Delete Comment
- [ ] Delete own comment (soft delete)
- [ ] Try to delete another user's comment (should fail)
- [ ] Delete as admin (should work)
- [ ] Hard delete as non-admin (should fail)
- [ ] Hard delete as admin (should work)
- [ ] Confirm dialog appears
- [ ] Cancel deletion

### Reply to Comment
- [ ] Click reply button
- [ ] Verify scroll to top
- [ ] Post reply with parentId
- [ ] Verify threaded display
- [ ] Reply to a reply (nested threading)

### Upvote Comment
- [ ] Upvote a comment
- [ ] Verify count increases
- [ ] Click again to remove upvote
- [ ] Verify count decreases
- [ ] Upvote when already downvoted
- [ ] Verify downvote removed
- [ ] Upvote own comment (should work)

### Downvote Comment
- [ ] Same tests as upvote

### Favorite Comment
- [ ] Favorite a comment
- [ ] Verify count increases
- [ ] Click again to remove favorite
- [ ] Favorite when upvoted (both should work)

### Flag Comment
- [ ] Flag a comment
- [ ] Verify flagged status
- [ ] Check logs for moderation

## Security Considerations

✅ **Authentication Required**: All mutations require `@roles(["USER"])`  
✅ **Permission Checks**: Edit (author only), Delete (author/admin)  
✅ **Input Validation**: Empty text, invalid IDs  
✅ **Audit Logging**: All actions logged with user ID  
✅ **Soft Delete Default**: Prevents accidental data loss  
✅ **Hard Delete Admin Only**: Prevents abuse  

## Performance Considerations

✅ **Minimal Queries**: Only fetches/updates single comment  
✅ **Array Operations**: In-memory for reactions  
✅ **Event-Based Updates**: Avoids full page refresh  
✅ **Optimistic UI**: Can be added (update UI before server response)  

## Future Enhancements

### Optimistic UI Updates
```typescript
// Update UI immediately, revert on error
const optimisticComment = { ...comment, upvotes: comment.upvotes + 1 };
updateCommentInUI(optimisticComment);

try {
  await upvoteComment(commentId);
} catch (error) {
  revertCommentInUI(comment);
}
```

### Edit History
- Track all edits with timestamps
- Show "Edited" indicator
- Allow viewing edit history (admin)

### Reaction Details
- Show who upvoted/downvoted
- Tooltip with user names
- Click to view list

### Notification System
- Notify on reply to your comment
- Notify on reaction to your comment
- Notify when your comment is flagged

## Summary Statistics

### GraphQL Schema
- **7 new mutations**
- **3 new input types**
- **1 new enum**
- **2 new result types**
- **1 new union type**

### Resolver Implementation
- **7 mutation methods** (~350 lines)
- **Permission checks** in all mutations
- **Error handling** with typed results
- **Audit logging** for all actions

### Widget Integration
- **5 handlers updated/created**
- **Edit flow** with save/cancel
- **Delete flow** with confirmation
- **Reply flow** with scroll
- **Upvote** toggle behavior
- **Event emission** for all actions

### Features Delivered
- ✅ Edit comments (author only)
- ✅ Delete comments (soft/hard)
- ✅ Reply to comments (threading)
- ✅ Upvote/downvote comments (toggle)
- ✅ Favorite comments
- ✅ Flag comments for moderation
- ✅ Comprehensive error handling
- ✅ User notifications
- ✅ Event-based updates
- ✅ Permission model
- ✅ Audit logging

---

**Status:** ✅ Complete and Ready for Testing  
**Next:** Test all comment operations, add optimistic UI updates, implement notification system
