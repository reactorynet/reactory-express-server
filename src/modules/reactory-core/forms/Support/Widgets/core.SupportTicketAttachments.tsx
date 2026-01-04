import Reactory from '@reactory/reactory-core';

interface AttachmentsDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  UserAvatar: any,
  RelativeTime: any,
  ReactoryDropZone: any,
  DocumentListComponent: any,
}

interface AttachmentsProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
}

/**
 * SupportTicketAttachments Component
 * 
 * Attachments tab with drag & drop upload and file management.
 * 
 * Features:
 * - Drag & drop file upload
 * - File list with metadata
 * - Download files
 * - Delete attachments (with permissions)
 * - Image preview
 * - File type icons
 * 
 * @example
 * <SupportTicketAttachments ticket={ticketData} reactory={api} />
 */
const SupportTicketAttachments = (props: AttachmentsProps) => {
  const { reactory, ticket } = props;

  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    UserAvatar,
    RelativeTime,
    ReactoryDropZone,
    DocumentListComponent,
  } = reactory.getComponents<AttachmentsDependencies>([
    'react.React',
    'material-ui.Material',
    'core.UserAvatar',
    'core.RelativeTime',
    'core.ReactoryDropZone',
    'core.DocumentListComponent',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Paper,
    Button,
    Icon,
    IconButton,
    Tooltip,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    Chip,
    LinearProgress,
  } = MaterialCore;

  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  // Get current user
  const currentUser = reactory.getUser();
  const userId = currentUser?.loggedIn?.user?.id;

  const documents = ticket.documents || [];

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFileIds: string[] = [];

      // Upload each file using ReactoryUploadFile mutation
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
                  alias
                  path
                  created
                  link
                  uploadContext
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
        } else {
          throw new Error(uploadResult.data?.ReactoryUploadFile?.message || 'Upload failed');
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Attach uploaded files to ticket
      if (uploadedFileIds.length > 0) {
        const attachResult = await reactory.graphqlMutation(`
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
                    created
                  }
                }
                attachedFiles {
                  id
                  filename
                  mimetype
                  size
                  link
                }
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

        if (attachResult.data?.ReactoryAttachFilesToTicket?.__typename === 'ReactorySupportTicketAttachmentSuccess') {
          reactory.createNotification('Files uploaded successfully', { 
            title: 'Files Attached',
            options: { body: `${uploadedFileIds.length} file(s) attached to ticket` }
          });

          // Emit event to refresh ticket data
          reactory.emit('core.SupportTicketUpdated', { 
            ticketId: ticket.id,
            documents: attachResult.data.ReactoryAttachFilesToTicket.attachedFiles 
          });
        } else {
          throw new Error(attachResult.data?.ReactoryAttachFilesToTicket?.message || 'Failed to attach files');
        }
      }
    } catch (error) {
      reactory.log('Error uploading files', { error }, 'error');
      reactory.createNotification('Failed to upload files', {
        title: 'Upload Error',
        options: { body: error.message || 'An error occurred during file upload' }
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = (document: any) => {
    if (document.url) {
      window.open(document.url, '_blank');
    } else {
      reactory.createNotification('Download not available', { type: 'warning' });
    }
  };

  const handleDelete = async (documentId: string) => {
    // TODO: Implement delete mutation
    reactory.createNotification('Delete attachment - Coming soon', { type: 'info' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table_chart';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'folder_zip';
    return 'insert_drive_file';
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Attachments ({documents.length})
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>download</Icon>}
          disabled={documents.length === 0}
        >
          Download All
        </Button>
      </Box>

      {/* Upload Area */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {ReactoryDropZone ? (
          <ReactoryDropZone
            onDrop={handleFileUpload}
            multiple={true}
            accept={{
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc', '.docx'],
              'application/vnd.ms-excel': ['.xls', '.xlsx'],
              'text/*': ['.txt', '.csv']
            }}
            maxSize={10485760} // 10MB
          />
        ) : (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <Icon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}>
              cloud_upload
            </Icon>
            <Typography variant="body1" gutterBottom>
              Drag & drop files here, or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Maximum file size: 10MB
            </Typography>
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Uploading... {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Attachments List */}
      {documents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Icon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}>
            attach_file
          </Icon>
          <Typography variant="h6" color="text.secondary">
            No attachments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload files to attach them to this ticket
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card variant="outlined">
                {isImage(doc.mimeType) && doc.url ? (
                  <CardMedia
                    component="img"
                    height="140"
                    image={doc.url}
                    alt={doc.name}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'action.hover'
                    }}
                  >
                    <Icon sx={{ fontSize: 64, color: 'text.secondary' }}>
                      {getFileIcon(doc.mimeType)}
                    </Icon>
                  </Box>
                )}
                
                <CardContent>
                  <Tooltip title={doc.name}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      {doc.name}
                    </Typography>
                  </Tooltip>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    <Chip
                      size="small"
                      label={formatFileSize(doc.size)}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={doc.mimeType.split('/')[1].toUpperCase()}
                      variant="outlined"
                    />
                  </Box>

                  {doc.uploadedBy && UserAvatar && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <UserAvatar
                        user={doc.uploadedBy}
                        uiSchema={{
                          'ui:options': {
                            variant: 'avatar',
                            size: 'small'
                          }
                        }}
                      />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="caption" noWrap>
                          {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                        </Typography>
                        {RelativeTime && doc.uploadedAt && (
                          <RelativeTime
                            date={doc.uploadedAt}
                            uiSchema={{
                              'ui:options': {
                                format: 'relative',
                                variant: 'caption'
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Icon>download</Icon>}
                    onClick={() => handleDownload(doc)}
                  >
                    Download
                  </Button>
                  {userId && doc.uploadedBy?.id === userId && (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Icon fontSize="small">delete</Icon>
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketAttachments',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketAttachments,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketAttachments,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketAttachments 
  });
}
