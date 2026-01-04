# Comments & Attachments - Quick Reference

## GraphQL Mutations

### Add Comment
```graphql
mutation AddComment($input: ReactorySupportTicketCommentInput!) {
  ReactoryAddSupportTicketComment(input: $input) {
    id
    comment
    when
    user {
      id
      firstName
      lastName
      avatar
    }
  }
}
```

**Input:**
```typescript
{
  input: {
    ticketId: string;
    comment: string;         // Supports HTML/Markdown
    parentId?: string;       // For threaded replies
    attachmentIds?: string[]; // Optional file attachments
  }
}
```

### Upload & Attach Files

**Step 1: Upload File**
```graphql
mutation UploadFile($file: Upload!, $path: String, $uploadContext: String) {
  ReactoryUploadFile(file: $file, path: $path, uploadContext: $uploadContext) {
    ... on ReactoryFileUploadSuccess {
      file { id filename }
    }
  }
}
```

**Step 2: Attach to Ticket**
```graphql
mutation AttachFiles($input: ReactorySupportTicketAttachmentInput!) {
  ReactoryAttachFilesToTicket(input: $input) {
    ... on ReactorySupportTicketAttachmentSuccess {
      success
      ticket { id }
      attachedFiles { id filename }
    }
  }
}
```

**Input:**
```typescript
{
  input: {
    ticketId: string;
    fileIds: string[];  // IDs from upload step
  }
}
```

## Client-Side Usage

### Submit Comment
```typescript
const result = await reactory.graphqlMutation(ADD_COMMENT_MUTATION, {
  input: {
    ticketId: ticket.id,
    comment: commentText,
    parentId: replyToId,
  }
});

reactory.emit('core.SupportTicketUpdated', { ticketId: ticket.id });
```

### Upload Files
```typescript
// 1. Upload files
const fileIds = [];
for (const file of files) {
  const result = await reactory.graphqlMutation(UPLOAD_FILE_MUTATION, {
    file,
    path: `support-tickets/${ticketId}`,
    uploadContext: 'support-ticket-attachment',
  });
  fileIds.push(result.data.ReactoryUploadFile.file.id);
}

// 2. Attach to ticket
await reactory.graphqlMutation(ATTACH_FILES_MUTATION, {
  input: { ticketId, fileIds }
});

reactory.emit('core.SupportTicketUpdated', { ticketId });
```

## Permissions

### Who Can Comment/Attach?
- ✅ Ticket creator
- ✅ Ticket assignee
- ✅ Admin/Support staff

## Events

**Emit after changes:**
```typescript
reactory.emit('core.SupportTicketUpdated', {
  ticketId: string,
  comment?: CommentData,
  documents?: FileData[]
});
```

**Listen for updates:**
```typescript
reactory.on('core.SupportTicketUpdated', (event) => {
  if (event.ticketId === myTicketId) {
    refetch();
  }
});
```

## Service Methods

### SupportService

```typescript
// Add comment
async addComment(
  ticketId: string, 
  commentText: string, 
  parentId?: string, 
  attachmentIds?: string[]
): Promise<ICommentDocument>

// Attach files
async attachDocument(
  ticket_id: string, 
  fileIds: string[]
): Promise<IReactorySupportTicket>
```

## Error Handling

```typescript
try {
  await submitComment();
} catch (error) {
  reactory.createNotification('Error', {
    title: 'Error',
    options: { 
      body: error.message,
      icon: '/icons/error.png'
    }
  });
}
```

## File Upload Path Structure

```
support-tickets/
  └── {ticket-id}/
      ├── document1.pdf
      ├── image1.png
      └── spreadsheet1.xlsx
```

## Testing

```bash
# Test comment submission
1. Open ticket detail panel
2. Click Comments tab
3. Enter comment text
4. Click "Add Comment"
5. Verify comment appears
6. Check notification

# Test file upload
1. Open ticket detail panel
2. Click Attachments tab
3. Drag & drop files
4. Watch progress
5. Verify files appear
6. Check notifications
```

## Common Issues

**Issue:** "Permission denied"
- **Solution:** Check if user is creator, assignee, or admin

**Issue:** "Ticket not found"
- **Solution:** Verify ticket ID is correct

**Issue:** "Upload failed"
- **Solution:** Check file size, network connection, server logs

**Issue:** "Attachment failed after upload"
- **Solution:** File uploaded successfully, just retry attachment

## Next Steps

- [ ] Test with live data
- [ ] Configure file upload limits
- [ ] Set up file storage (S3/filesystem)
- [ ] Test permission model
- [ ] Verify event system
- [ ] Move to Phase 5 (Real-time subscriptions)


