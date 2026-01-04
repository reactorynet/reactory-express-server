# Comments & File Attachments Implementation

**Date:** December 23, 2025  
**Feature:** Complete comment and file attachment functionality  
**Status:** ✅ Complete

## Summary

Implemented full comment and file attachment functionality for Support Tickets, including GraphQL mutations, service methods, resolvers, and widget integrations.

## Changes Made

### 1. GraphQL Schema Updates

**File:** `/modules/reactory-core/graph/types/User/Support.graphql`

#### New Input Types

**ReactorySupportTicketCommentInput**
```graphql
input ReactorySupportTicketCommentInput {
  ticketId: String!
  comment: String!
  parentId: String          # For threaded replies
  attachmentIds: [String]   # File attachments for the comment
}
```

**ReactorySupportTicketAttachmentInput**
```graphql
input ReactorySupportTicketAttachmentInput {
  ticketId: String!
  fileIds: [String!]!       # Array of already-uploaded file IDs
}
```

#### New Result Types

**ReactorySupportTicketAttachmentSuccess**
```graphql
type ReactorySupportTicketAttachmentSuccess {
  success: Boolean!
  ticket: ReactorySupportTicket!
  attachedFiles: [ReactoryFile!]!
}
```

**ReactorySupportTicketAttachmentError**
```graphql
type ReactorySupportTicketAttachmentError {
  error: String!
  message: String
}
```

**ReactorySupportTicketAttachmentResult** (Union)
```graphql
union ReactorySupportTicketAttachmentResult = 
  ReactorySupportTicketAttachmentSuccess | 
  ReactorySupportTicketAttachmentError
```

#### New Mutations

**1. ReactoryAddSupportTicketComment**
```graphql
mutation ReactoryAddSupportTicketComment(
  input: ReactorySupportTicketCommentInput!
): Comment
```

**2. ReactoryAttachFilesToTicket**
```graphql
mutation ReactoryAttachFilesToTicket(
  input: ReactorySupportTicketAttachmentInput!
): ReactorySupportTicketAttachmentResult
```

### 2. Service Layer Updates

**File:** `/services/SupportService.ts`

#### New Methods

**addComment()**
```typescript
async addComment(
  ticketId: string, 
  commentText: string, 
  parentId?: string, 
  attachmentIds?: string[]
): Promise<Reactory.Models.ICommentDocument>
```

**Features:**
- Permission checking (admin, creator, or assignee)
- Creates comment in database
- Links comment to ticket
- Supports threaded replies via `parentId`
- Supports comment attachments
- Updates ticket `updatedDate`
- Populates user data

**attachDocument() - Enhanced**
```typescript
async attachDocument(
  ticket_id: string, 
  fileIds: string[]
): Promise<Reactory.Models.IReactorySupportTicket>
```

**Features:**
- Permission checking (admin, creator, or assignee)
- Links multiple files to ticket
- Prevents duplicate attachments
- Updates ticket `updatedDate`
- Populates document data

**updateTicket() - Implemented**
```typescript
async updateTicket(
  ticket_id: string, 
  updates: Reactory.Models.IReactorySupportTicketUpdate
): Promise<Reactory.Models.IReactorySupportTicket>
```

**Features:**
- Full CRUD operations
- Permission checking
- Comment addition support
- Assignment changes
- Status updates
- Populates related data

### 3. Resolver Layer Updates

**File:** `/resolvers/Support/SupportResolver.ts`

#### New Mutation Resolvers

**addComment()**
```typescript
@roles(["USER"], 'args.context')
@mutation("ReactoryAddSupportTicketComment")
async addComment(
  obj: any,
  args: { input: ReactorySupportTicketCommentInput },
  context: Reactory.Server.IReactoryContext
): Promise<Reactory.Models.ICommentDocument>
```

**attachFiles()**
```typescript
@roles(["USER"], 'args.context')
@mutation("ReactoryAttachFilesToTicket")
async attachFiles(
  obj: any,
  args: { input: ReactorySupportTicketAttachmentInput },
  context: Reactory.Server.IReactoryContext
): ReactorySupportTicketAttachmentResult
```

**Features:**
- Role-based authorization
- Error handling with typed union results
- Success/failure responses
- Populated return data

### 4. Widget Updates

#### core.SupportTicketComments.tsx

**Updated handleSubmitComment()**

**Old Implementation:**
```typescript
// TODO: Implement comment submission
console.log('Submitting comment:', commentText);
setCommentText('');
```

**New Implementation:**
```typescript
const result = await reactory.graphqlMutation(`
  mutation AddSupportTicketComment($input: ReactorySupportTicketCommentInput!) {
    ReactoryAddSupportTicketComment(input: $input) {
      id
      comment
      when
      user {
        id
        firstName
        lastName
        avatar
        email
      }
    }
  }
`, {
  input: {
    ticketId: ticket.id,
    comment: commentText,
    parentId: replyingToId,
  }
});

// Success notification
reactory.createNotification('Comment added successfully', { 
  title: 'Comment Added',
  options: { body: 'Your comment has been added to the ticket' }
});

// Emit event for data refresh
reactory.emit('core.SupportTicketUpdated', { 
  ticketId: ticket.id,
  comment: result.data.ReactoryAddSupportTicketComment 
});
```

**Features:**
- Uses correct mutation name and structure
- Supports threaded replies via `parentId`
- Proper notification format
- Event emission for data refresh
- Error handling with user feedback

#### core.SupportTicketAttachments.tsx

**Updated handleFileUpload()**

**Old Implementation:**
```typescript
// TODO: Implement file upload mutation
for (let i = 0; i < files.length; i++) {
  // Simulate upload
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

**New Implementation (Two-Stage Process):**

**Stage 1: Upload Files**
```typescript
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  
  const uploadResult = await reactory.graphqlMutation(`
    mutation ReactoryUploadFile($file: Upload!, $alias: String, $path: String, $uploadContext: String) {
      ReactoryUploadFile(file: $file, alias: $alias, path: $path, uploadContext: $uploadContext) {
        ... on ReactoryFileUploadSuccess {
          success
          file {
            id
            filename
            mimetype
            size
            link
          }
        }
        ... on ReactoryFileUploadError {
          error
          message
        }
      }
    }
  `, {
    file,
    alias: file.name,
    path: `support-tickets/${ticket.id}`,
    uploadContext: 'support-ticket-attachment',
  });

  if (uploadResult.data?.ReactoryUploadFile?.__typename === 'ReactoryFileUploadSuccess') {
    uploadedFileIds.push(uploadResult.data.ReactoryUploadFile.file.id);
  }
}
```

**Stage 2: Attach to Ticket**
```typescript
const attachResult = await reactory.graphqlMutation(`
  mutation AttachFilesToTicket($input: ReactorySupportTicketAttachmentInput!) {
    ReactoryAttachFilesToTicket(input: $input) {
      ... on ReactorySupportTicketAttachmentSuccess {
        success
        ticket {
          id
          documents { id filename mimetype size link }
        }
        attachedFiles { id filename mimetype size link }
      }
      ... on ReactorySupportTicketAttachmentError {
        error
        message
      }
    }
  }
`, {
  input: {
    ticketId: ticket.id,
    fileIds: uploadedFileIds,
  }
});
```

**Features:**
- Two-stage upload process (upload then attach)
- Progress tracking across all files
- Uses existing `ReactoryUploadFile` mutation
- Proper file path organization
- Upload context tagging
- Union type handling for success/error
- Comprehensive error handling
- User notifications at each stage

## Two-Stage Upload Process

### Why Two Stages?

1. **File Upload** (`ReactoryUploadFile`)
   - Uploads file to storage (S3, filesystem, etc.)
   - Returns file metadata with ID
   - Reusable across the application
   - Already implemented and tested

2. **File Attachment** (`ReactoryAttachFilesToTicket`)
   - Links uploaded files to ticket
   - Updates ticket's `documents` array
   - Maintains referential integrity
   - Allows orphan cleanup

### Benefits

- ✅ Reuses existing file upload infrastructure
- ✅ Allows file validation before attachment
- ✅ Supports bulk file uploads
- ✅ Enables file sharing across tickets
- ✅ Facilitates orphan file cleanup
- ✅ Better error handling (can retry attachment separately)

## Permission Model

### Comment Permissions
Users can comment if they are:
- ✅ Admin or Support staff
- ✅ Ticket creator
- ✅ Ticket assignee

### Attachment Permissions
Users can attach files if they are:
- ✅ Admin or Support staff
- ✅ Ticket creator
- ✅ Ticket assignee

### Implementation
```typescript
const canComment = this.isAdminUser(this.context) || 
                  ticket.createdBy.toString() === this.context.user._id.toString() ||
                  (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

if (!canComment) {
  throw new InsufficientPermissions('User does not have permission to comment on this ticket');
}
```

## Event System

### Event Emission
Both widgets emit events after successful operations:

```typescript
reactory.emit('core.SupportTicketUpdated', { 
  ticketId: ticket.id,
  comment: newComment      // or documents: newDocuments
});
```

### Event Handling
Forms/components can listen for these events:

```typescript
React.useEffect(() => {
  const handleUpdate = (event) => {
    if (event.ticketId === ticket.id) {
      refetch(); // Refresh ticket data
    }
  };

  reactory.on('core.SupportTicketUpdated', handleUpdate);
  
  return () => {
    reactory.off('core.SupportTicketUpdated', handleUpdate);
  };
}, [ticket.id]);
```

## Notification Format

### Structure
All notifications now use the correct Reactory format:

```typescript
reactory.createNotification(title: string, {
  title: string,
  options: {
    body: string,
    icon?: string,
    badge?: string,
    tag?: string,
    data?: any,
    // ... other NotificationOptions
  }
});
```

### Examples

**Success:**
```typescript
reactory.createNotification('Comment Added', {
  title: 'Comment Added',
  options: { 
    body: 'Your comment has been added to the ticket',
    icon: '/icons/success.png'
  }
});
```

**Error:**
```typescript
reactory.createNotification('Upload Error', {
  title: 'Upload Error',
  options: { 
    body: error.message || 'An error occurred during file upload',
    icon: '/icons/error.png'
  }
});
```

## GraphQL Mutation Examples

### Add Comment (Client-Side)

```graphql
mutation AddSupportTicketComment($input: ReactorySupportTicketCommentInput!) {
  ReactoryAddSupportTicketComment(input: $input) {
    id
    comment
    when
    user {
      id
      firstName
      lastName
      avatar
      email
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "ticketId": "ticket-id-here",
    "comment": "<p>This is a <strong>rich text</strong> comment</p>",
    "parentId": "parent-comment-id-optional"
  }
}
```

### Upload and Attach Files (Client-Side)

**Step 1: Upload File**
```graphql
mutation ReactoryUploadFile($file: Upload!, $alias: String, $path: String, $uploadContext: String) {
  ReactoryUploadFile(file: $file, alias: $alias, path: $path, uploadContext: $uploadContext) {
    ... on ReactoryFileUploadSuccess {
      success
      file {
        id
        filename
        mimetype
        size
        link
      }
    }
    ... on ReactoryFileUploadError {
      error
      message
    }
  }
}
```

**Step 2: Attach to Ticket**
```graphql
mutation AttachFilesToTicket($input: ReactorySupportTicketAttachmentInput!) {
  ReactoryAttachFilesToTicket(input: $input) {
    ... on ReactorySupportTicketAttachmentSuccess {
      success
      ticket {
        id
        documents {
          id
          filename
          mimetype
          size
          link
        }
      }
      attachedFiles {
        id
        filename
      }
    }
    ... on ReactorySupportTicketAttachmentError {
      error
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "ticketId": "ticket-id-here",
    "fileIds": ["file-id-1", "file-id-2", "file-id-3"]
  }
}
```

## Testing Checklist

### Comments
- [ ] Add a simple text comment
- [ ] Add a rich text comment (HTML/Markdown)
- [ ] Reply to a comment (threaded)
- [ ] Add comment with attachments
- [ ] Verify permission checks (creator, assignee, admin)
- [ ] Test error handling (network failure)
- [ ] Verify notifications display
- [ ] Test event emission and refresh

### File Attachments
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Upload different file types (PDF, images, documents)
- [ ] Test progress tracking
- [ ] Verify file path organization
- [ ] Test file size limits
- [ ] Test permission checks
- [ ] Test error handling (upload failure)
- [ ] Test error handling (attachment failure)
- [ ] Verify notifications at each stage
- [ ] Test event emission and refresh
- [ ] Verify no duplicate attachments

## Error Handling

### Comments
- ❌ Empty comment → Warning notification
- ❌ Mutation failure → Error notification with details
- ❌ Permission denied → InsufficientPermissions exception
- ❌ Ticket not found → Error notification

### File Attachments
- ❌ Upload failure → Error with file name and reason
- ❌ Attachment failure → Error with retry suggestion
- ❌ Permission denied → InsufficientPermissions exception
- ❌ Invalid file ID → Error notification
- ❌ Ticket not found → Error notification

## Security

### Authorization
- ✅ Role-based access control via `@roles` decorator
- ✅ Permission checks in service layer
- ✅ User can only comment/attach on tickets they're involved with
- ✅ Admins have full access

### File Upload Security
- ✅ Files uploaded to specific path (`support-tickets/{ticketId}`)
- ✅ Upload context tagging (`support-ticket-attachment`)
- ✅ File type validation (handled by ReactoryUploadFile)
- ✅ Size limits (handled by ReactoryUploadFile)

## Data Flow

### Comment Submission Flow
```
User Types Comment
     ↓
Submit Button
     ↓
handleSubmitComment()
     ↓
ReactoryAddSupportTicketComment mutation
     ↓
SupportResolver.addComment()
     ↓
SupportService.addComment()
     ↓
Create Comment in DB
     ↓
Link to Ticket
     ↓
Return Comment Data
     ↓
Show Success Notification
     ↓
Emit 'core.SupportTicketUpdated' event
     ↓
Refresh Ticket Data
```

### File Attachment Flow
```
User Drops Files
     ↓
handleFileUpload()
     ↓
[For Each File]
     ↓
ReactoryUploadFile mutation
     ↓
File Storage (S3/Filesystem)
     ↓
Collect File IDs
     ↓
ReactoryAttachFilesToTicket mutation
     ↓
SupportResolver.attachFiles()
     ↓
SupportService.attachDocument()
     ↓
Link Files to Ticket
     ↓
Return Ticket + Files
     ↓
Show Success Notification
     ↓
Emit 'core.SupportTicketUpdated' event
     ↓
Refresh Ticket Data
```

## Future Enhancements

### Comments
- [ ] Edit own comments
- [ ] Delete own comments
- [ ] Like/reaction system
- [ ] @mention users with notifications
- [ ] Mark comments as solution
- [ ] Pin important comments
- [ ] Comment search
- [ ] Export comments

### Attachments
- [ ] Drag and drop from comment editor
- [ ] Image paste from clipboard
- [ ] File preview modal
- [ ] Batch delete files
- [ ] File versioning
- [ ] Attachment scanning (virus check)
- [ ] File compression
- [ ] Storage quota management

## Integration Points

### Existing Components
- ✅ `core.RichEditorWidget` - Rich text editor for comments
- ✅ `core.ReactoryDropZone` - File drop zone
- ✅ `useContentRender` - Renders rich comment content
- ✅ `core.UserAvatar` - Displays commenter avatars
- ✅ `core.RelativeTime` - Shows relative timestamps

### Event System
- ✅ Emits `core.SupportTicketUpdated` on changes
- ✅ Components can subscribe to updates
- ✅ Enables real-time collaboration

### Notification System
- ✅ Uses `reactory.createNotification()` API
- ✅ Proper notification format
- ✅ Success/error/warning variants
- ✅ Descriptive messages

## Known Limitations

1. **No Real-Time Updates** - Requires page refresh or manual refetch (Phase 5 will add subscriptions)
2. **No Comment Editing** - Once posted, comments cannot be edited (future enhancement)
3. **No Comment Deletion** - Comments are permanent (future enhancement)
4. **Sequential Upload** - Files uploaded one at a time (could be parallelized)
5. **No Upload Resume** - Failed uploads must restart completely

## Performance Considerations

### Comments
- ✅ Optimistic UI updates possible
- ✅ Paginated comment display (future)
- ✅ Lazy loading for old comments (future)

### File Attachments
- ⚠️ Sequential uploads may be slow for multiple large files
- ✅ Progress tracking provides feedback
- ✅ Chunked upload supported by ReactoryUploadFile
- ⚠️ Large files may timeout (configure limits)

## Configuration

### File Upload Limits
Set in environment or server config:
```
MAX_FILE_UPLOAD=20mb
```

### Allowed File Types
Configure in `ReactoryUploadFile` resolver or validator.

### Storage Path
Files stored in: `support-tickets/{ticketId}/`

## Summary Statistics

### Files Modified: 4
1. `Support.graphql` - Added 2 mutations, 3 input types, 2 result types
2. `SupportService.ts` - Implemented 3 methods (~120 lines)
3. `SupportResolver.ts` - Added 2 mutation resolvers (~60 lines)
4. `core.SupportTicketComments.tsx` - Updated handleSubmitComment (~40 lines)
5. `core.SupportTicketAttachments.tsx` - Updated handleFileUpload (~100 lines)

### Total Changes
- **~320 lines of new/modified code**
- **2 new GraphQL mutations**
- **3 new service methods**
- **2 new resolver methods**
- **2 widget updates**

### Features Delivered
- ✅ Rich text comment submission
- ✅ Threaded comment replies
- ✅ File upload with progress tracking
- ✅ Two-stage file attachment process
- ✅ Permission-based access control
- ✅ Comprehensive error handling
- ✅ User notifications
- ✅ Event emission for data refresh

---

**Status:** ✅ Complete and Ready for Testing  
**Next:** Test with live data, then implement Phase 5 (Real-time via Subscriptions)


