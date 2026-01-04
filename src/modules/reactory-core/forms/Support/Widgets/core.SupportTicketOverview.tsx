import Reactory from '@reactory/reactory-core';

interface OverviewDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  StatusBadge: any,
  UserAvatar: any,
  RelativeTime: any,
  ChipArray: any,
  useContentRender: any,
}

interface OverviewProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
}

/**
 * SupportTicketOverview Component
 * 
 * Overview tab displaying comprehensive ticket information including:
 * - Title and description (supports HTML/Markdown via useContentRender)
 * - Key metadata (users, dates, type)
 * - Tags
 * - Quick actions
 * 
 * Features:
 * - Rich content rendering (HTML, Markdown, Mermaid, Code blocks)
 * - Sanitized HTML output via DOMPurify
 * - Support for embedded diagrams and formatted text
 * - Automatic content type detection
 * 
 * @example
 * <SupportTicketOverview ticket={ticketData} reactory={api} />
 */
const SupportTicketOverview = (props: OverviewProps) => {
  const { reactory, ticket } = props;

  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    StatusBadge,
    UserAvatar,
    RelativeTime,
    ChipArray,
    useContentRender,
  } = reactory.getComponents<OverviewDependencies>([
    'react.React',
    'material-ui.Material',
    'core.StatusBadge',
    'core.UserAvatar',
    'core.RelativeTime',
    'core.ChipArray',
    'core.useContentRender',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Grid, 
    Paper,
    Divider,
    Button,
    Icon,
    Card,
    CardContent,
  } = MaterialCore;

  // Initialize content renderer for rich text/HTML descriptions
  const { renderContent } = useContentRender ? useContentRender(reactory) : { 
    renderContent: (content: string) => content 
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Title Section */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            mb: 2,
            color: 'text.primary'
          }}
        >
          {ticket.request || 'No title'}
        </Typography>
        
        {/* Description */}
        {ticket.description && (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2,               
              mb: 3,
              '& pre': {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto'
              }
            }}
          >
            {renderContent ? (
              renderContent(ticket.description)
            ) : (
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  color: 'text.secondary'
                }}
              >
                {ticket.description}
              </Typography>
            )}
          </Paper>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Key Information Grid */}
      <Grid container spacing={3}>
        {/* Created By */}
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 1 }}
              >
                Logged By
              </Typography>
              {UserAvatar && ticket.createdBy ? (
                <UserAvatar
                  user={ticket.createdBy}
                  uiSchema={{
                    'ui:options': {
                      variant: 'avatar-name',
                      size: 'medium',
                      showEmail: true
                    }
                  }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Assigned To */}
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 1 }}
              >
                Assigned To
              </Typography>
              {UserAvatar ? (
                <UserAvatar
                  user={ticket.assignedTo}
                  uiSchema={{
                    'ui:options': {
                      variant: 'avatar-name',
                      size: 'medium',
                      showEmail: true,
                      unassignedText: 'Unassigned',
                      unassignedIcon: 'person_add_disabled'
                    }
                  }}
                />
              ) : (
                <Typography variant="body2">
                  {ticket.assignedTo ? 
                    `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 
                    'Unassigned'
                  }
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Request Type */}
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 1 }}
              >
                Request Type
              </Typography>
              {StatusBadge && ticket.requestType ? (
                <StatusBadge
                  value={ticket.requestType}
                  uiSchema={{
                    'ui:options': {
                      variant: 'outlined',
                      size: 'medium',
                      colorMap: {
                        'bug': '#f44336',
                        'feature': '#9c27b0',
                        'question': '#2196f3',
                        'support': '#4caf50',
                        'other': '#757575'
                      },
                      iconMap: {
                        'bug': 'bug_report',
                        'feature': 'lightbulb',
                        'question': 'help',
                        'support': 'support_agent',
                        'other': 'more_horiz'
                      }
                    }
                  }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Created Date */}
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 1 }}
              >
                Created
              </Typography>
              {RelativeTime && ticket.createdDate ? (
                <RelativeTime
                  date={ticket.createdDate}
                  uiSchema={{
                    'ui:options': {
                      format: 'relative',
                      tooltip: true,
                      tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
                      variant: 'body1',
                      icon: 'schedule'
                    }
                  }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Last Updated */}
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 1 }}
              >
                Last Updated
              </Typography>
              {RelativeTime && ticket.updatedDate ? (
                <RelativeTime
                  date={ticket.updatedDate}
                  uiSchema={{
                    'ui:options': {
                      format: 'relative',
                      tooltip: true,
                      tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
                      variant: 'body1',
                      icon: 'update'
                    }
                  }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* SLA/Resolution Time */}
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 1 }}
              >
                SLA Status
              </Typography>
              {ticket.slaDeadline ? (
                <Box>
                  {RelativeTime && (
                    <RelativeTime
                      date={ticket.slaDeadline}
                      uiSchema={{
                        'ui:options': {
                          format: 'relative',
                          tooltip: true,
                          variant: 'body1',
                          icon: ticket.isOverdue ? 'warning' : 'timer'
                        }
                      }}
                    />
                  )}
                  {ticket.isOverdue && (
                    <Typography 
                      variant="caption" 
                      color="error" 
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      OVERDUE
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2">No SLA set</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ display: 'block', mb: 1 }}
                >
                  Tags
                </Typography>
                {ChipArray ? (
                  <ChipArray
                    formData={ticket.tags}
                    uiSchema={{
                      'ui:options': {
                        labelFormat: '${item}',
                        allowDelete: false,
                        allowAdd: false
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body2">{ticket.tags.join(', ')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          startIcon={<Icon>edit</Icon>}
          size="small"
        >
          Edit Ticket
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<Icon>person_add</Icon>}
          size="small"
        >
          Reassign
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<Icon>flag</Icon>}
          size="small"
        >
          Change Priority
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<Icon>label</Icon>}
          size="small"
        >
          Add Tags
        </Button>
        {ticket.status !== 'closed' && (
          <Button 
            variant="outlined" 
            color="success"
            startIcon={<Icon>check_circle</Icon>}
            size="small"
          >
            Close Ticket
          </Button>
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketOverview',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketOverview,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketOverview,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketOverview 
  });
}
