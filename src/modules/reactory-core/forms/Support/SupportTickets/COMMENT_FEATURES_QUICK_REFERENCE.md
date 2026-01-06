# Comment Features - Quick Reference

## Available Mutations

### 1. Edit Comment (Author Only)
```graphql
mutation EditComment($input: EditCommentInput!) {
  editComment(input: $input) {
    id
    text
    when
  }
}
```
**Input:** `{ commentId: ObjID!, text: String! }`

### 2. Delete Comment (Author or Admin)
```graphql
mutation DeleteComment($input: DeleteCommentInput!) {
  deleteComment(input: $input) {
    ... on DeleteCommentSuccess { success message }
    ... on DeleteCommentError { error message }
  }
}
```
**Input:** `{ commentId: ObjID!, softDelete: Boolean }`
- `softDelete: true` (default) → Sets `removed = true`
- `softDelete: false` (admin only) → Permanent deletion

### 3. Upvote Comment (Toggle)
```graphql
mutation UpvoteComment($commentId: ObjID!) {
  upvoteComment(commentId: $commentId) {
    id
    upvotes
    downvotes
  }
}
```
**Behavior:** Click to add upvote, click again to remove. Removes downvote if present.

### 4. Downvote Comment (Toggle)
```graphql
mutation DownvoteComment($commentId: ObjID!) {
  downvoteComment(commentId: $commentId) {
    id
    upvotes
    downvotes
  }
}
```
**Behavior:** Click to add downvote, click again to remove. Removes upvote if present.

### 5. Favorite Comment (Toggle)
```graphql
mutation FavoriteComment($commentId: ObjID!) {
  favoriteComment(commentId: $commentId) {
    id
    favorites
  }
}
```
**Behavior:** Independent of upvote/downvote

### 6. Toggle Reaction (Generic)
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
**Input:** `{ commentId: ObjID!, reactionType: UPVOTE|DOWNVOTE|FAVORITE }`

### 7. Flag Comment
```graphql
mutation FlagComment($commentId: ObjID!, $reason: String) {
  flagComment(commentId: $commentId, reason: $reason) {
    id
    flagged
  }
}
```

## Permission Matrix

| Action | Author | Admin | Other Users |
|--------|--------|-------|-------------|
| **View** | ✅ | ✅ | ✅ |
| **Add** | ✅ | ✅ | ✅ |
| **Edit** | ✅ | ❌ | ❌ |
| **Soft Delete** | ✅ | ✅ | ❌ |
| **Hard Delete** | ❌ | ✅ | ❌ |
| **Reply** | ✅ | ✅ | ✅ |
| **Upvote** | ✅ | ✅ | ✅ |
| **Downvote** | ✅ | ✅ | ✅ |
| **Favorite** | ✅ | ✅ | ✅ |
| **Flag** | ✅ | ✅ | ✅ |

## Reply to Comment (Threading)

Replies use the existing `ReactoryAddSupportTicketComment` mutation with `parentId`:

```graphql
mutation AddComment($input: ReactorySupportTicketCommentInput!) {
  ReactoryAddSupportTicketComment(input: $input) {
    id
    text
    parentId
  }
}
```

**Input:**
```json
{
  "input": {
    "ticketId": "ticket-id",
    "comment": "Reply text",
    "parentId": "parent-comment-id"
  }
}
```

## Client-Side Usage

### Edit Comment
```typescript
// 1. Load text into editor
setEditingId(commentId);
setCommentText(currentCommentText);

// 2. Save edit
await reactory.graphqlMutation(EDIT_COMMENT_MUTATION, {
  input: { commentId, text: newText }
});

// 3. Clear state
setEditingId(null);
setCommentText('');
```

### Delete Comment
```typescript
if (!confirm('Delete this comment?')) return;

await reactory.graphqlMutation(DELETE_COMMENT_MUTATION, {
  input: { commentId, softDelete: true }
});
```

### Upvote Comment
```typescript
await reactory.graphqlMutation(UPVOTE_COMMENT_MUTATION, {
  commentId
});

// Emit event for UI refresh
reactory.emit('core.SupportTicketUpdated', { ticketId });
```

### Reply to Comment
```typescript
// 1. Set reply context
setReplyingToId(commentId);

// 2. When posting comment
await reactory.graphqlMutation(ADD_COMMENT_MUTATION, {
  input: {
    ticketId,
    comment: commentText,
    parentId: replyingToId  // ← Makes it a reply
  }
});
```

## Toggle Behavior

**Upvote/Downvote:**
- Mutually exclusive (can't have both)
- Click to toggle on/off
- Clicking upvote when downvoted removes downvote and adds upvote

**Favorite:**
- Independent of upvote/downvote
- Click to toggle on/off
- Can favorite and upvote simultaneously

## UI Indicators

**Edit Button:** Only visible on own comments  
**Delete Button:** Only visible on own comments (or all for admin)  
**Reply Button:** Visible on all comments  
**Like Button:** Visible on all comments, shows count  

## Testing Quick Commands

```graphql
# Edit your comment
mutation { 
  editComment(input: { 
    commentId: "xxx", 
    text: "Updated text" 
  }) { id text } 
}

# Delete your comment
mutation { 
  deleteComment(input: { 
    commentId: "xxx", 
    softDelete: true 
  }) { 
    ... on DeleteCommentSuccess { success } 
  } 
}

# Upvote a comment
mutation { 
  upvoteComment(commentId: "xxx") { 
    id upvotes downvotes 
  } 
}

# Reply to a comment
mutation { 
  ReactoryAddSupportTicketComment(input: { 
    ticketId: "yyy", 
    comment: "Reply text", 
    parentId: "xxx" 
  }) { id text parentId } 
}
```

## Error Messages

**Edit Errors:**
- "Comment text cannot be empty"
- "You can only edit your own comments"
- "Comment not found"

**Delete Errors:**
- "You can only delete your own comments"
- "Only admins can permanently delete comments"
- "Comment not found"

**Reaction Errors:**
- "Comment not found"

## Event System

All operations emit:
```typescript
reactory.emit('core.SupportTicketUpdated', { 
  ticketId: string,
  comment?: CommentData
});
```

Listen for updates:
```typescript
reactory.on('core.SupportTicketUpdated', (event) => {
  // Refresh UI
});
```

## Logging

All actions are logged:
```typescript
// Info level
'Comment edited' → { commentId, userId }
'Comment soft deleted' → { commentId, userId }

// Warning level  
'Comment permanently deleted' → { commentId, userId }
'Comment flagged' → { commentId, flaggedBy, reason }
```

## Common Issues

**Q: Can't edit comment**  
A: Only the author can edit. Check if you're logged in as the comment creator.

**Q: Can't hard delete**  
A: Only admins can permanently delete. Use soft delete instead.

**Q: Upvote not toggling**  
A: Check network tab for errors. Verify comment ID is correct.

**Q: Reply not showing as threaded**  
A: Ensure `parentId` is being set in the mutation input.

## Next Steps

1. Test all mutations with real data
2. Add optimistic UI updates for better UX
3. Implement notification system for replies
4. Add "Edited" indicator on edited comments
5. Show edit history (future)
