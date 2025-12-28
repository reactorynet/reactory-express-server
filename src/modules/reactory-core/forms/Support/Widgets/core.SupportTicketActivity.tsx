import Reactory from '@reactory/reactory-core';

interface ActivityDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  UserAvatar: any,
  RelativeTime: any,
  StatusBadge: any,
  Timeline: any,
  TimelineItem: any,
  TimelineSeparator: any,
  TimelineConnector: any,
  TimelineContent: any,
  TimelineDot: any,
  TimelineOppositeContent: any,
}

interface ActivityProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
}

interface ActivityEvent {
  id: string;
  type: 'created' | 'status_change' | 'assignment' | 'priority_change' | 'comment' | 'attachment' | 'update';
  user: Partial<Reactory.Models.IUser>;
  timestamp: Date | string;
  data: any;
  description: string;
}

/**
 * SupportTicketActivity Component
 * 
 * Activity timeline showing all events and changes to the ticket.
 * 
 * Features:
 * - Timeline visualization
 * - Event type filtering
 * - User avatars
 * - Relative timestamps
 * - Event icons and colors
 * - Detailed event information
 * 
 * @example
 * <SupportTicketActivity ticket={ticketData} reactory={api} />
 */
const SupportTicketActivity = (props: ActivityProps) => {
  const { reactory, ticket } = props;

  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    UserAvatar,
    RelativeTime,
    StatusBadge,
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent,
  } = reactory.getComponents<ActivityDependencies>([
    'react.React',
    'material-ui.Material',
    'core.UserAvatar',
    'core.RelativeTime',
    'core.StatusBadge',
    'core.Timeline',
    'core.TimelineItem',
    'core.TimelineSeparator',
    'core.TimelineConnector',
    'core.TimelineContent',
    'core.TimelineDot',
    'core.TimelineOppositeContent',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Paper,
    Divider,
    Button,
    Icon,
    Chip,
    ToggleButtonGroup,
    ToggleButton,
  } = MaterialCore;

  const [filterType, setFilterType] = React.useState<string>('all');

  // Build activity events from ticket data
  const activityEvents = React.useMemo((): ActivityEvent[] => {
    const events: ActivityEvent[] = [];

    // Ticket created event
    if (ticket.createdDate && ticket.createdBy) {
      events.push({
        id: 'created',
        type: 'created',
        user: ticket.createdBy,
        timestamp: ticket.createdDate,
        data: { status: 'new' },
        description: 'created this ticket'
      });
    }

    // Status changes (simulated from current status)
    if (ticket.status && ticket.status !== 'new') {
      events.push({
        id: 'status-change-1',
        type: 'status_change',
        user: ticket.assignedTo || ticket.createdBy,
        timestamp: ticket.updatedDate || ticket.createdDate,
        data: { from: 'new', to: ticket.status },
        description: `changed status to ${ticket.status}`
      });
    }

    // Assignment event
    if (ticket.assignedTo) {
      events.push({
        id: 'assignment-1',
        type: 'assignment',
        user: ticket.assignedTo,
        timestamp: ticket.updatedDate || ticket.createdDate,
        data: { assignedTo: ticket.assignedTo },
        description: `assigned to ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
      });
    }

    // Priority change events (simulated)
    if (ticket.priority && ticket.priority !== 'medium') {
      events.push({
        id: 'priority-change-1',
        type: 'priority_change',
        user: ticket.assignedTo || ticket.createdBy,
        timestamp: ticket.updatedDate || ticket.createdDate,
        data: { from: 'medium', to: ticket.priority },
        description: `changed priority to ${ticket.priority}`
      });
    }

    // Comment events
    if (ticket.comments && ticket.comments.length > 0) {
      ticket.comments.forEach((comment, index) => {
        events.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          user: comment.who,
          timestamp: comment.when,
          data: { comment: comment.text },
          description: 'added a comment'
        });
      });
    }

    // Attachment events
    if (ticket.documents && ticket.documents.length > 0) {
      ticket.documents.forEach((doc, index) => {
        events.push({
          id: `attachment-${doc.id}`,
          type: 'attachment',
          user: doc.uploadedBy || ticket.createdBy,
          timestamp: doc.uploadedAt || ticket.createdDate,
          data: { document: doc },
          description: `attached ${doc.name}`
        });
      });
    }

    // Sort by timestamp (newest first)
    return events.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
  }, [ticket]);

  // Filter events
  const filteredEvents = React.useMemo(() => {
    if (filterType === 'all') return activityEvents;
    return activityEvents.filter(event => event.type === filterType);
  }, [activityEvents, filterType]);

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'created': return 'add_circle';
      case 'status_change': return 'change_circle';
      case 'assignment': return 'person_add';
      case 'priority_change': return 'flag';
      case 'comment': return 'comment';
      case 'attachment': return 'attach_file';
      case 'update': return 'edit';
      default: return 'circle';
    }
  };

  const getEventColor = (type: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'grey' => {
    switch (type) {
      case 'created': return 'primary';
      case 'status_change': return 'info';
      case 'assignment': return 'secondary';
      case 'priority_change': return 'warning';
      case 'comment': return 'success';
      case 'attachment': return 'info';
      case 'update': return 'grey';
      default: return 'grey';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Activity ({filteredEvents.length})
        </Typography>
        
        <ToggleButtonGroup
          size="small"
          value={filterType}
          exclusive
          onChange={(e, value) => value && setFilterType(value)}
        >
          <ToggleButton value="all">
            All
          </ToggleButton>
          <ToggleButton value="status_change">
            <Icon fontSize="small" sx={{ mr: 0.5 }}>change_circle</Icon>
            Status
          </ToggleButton>
          <ToggleButton value="comment">
            <Icon fontSize="small" sx={{ mr: 0.5 }}>comment</Icon>
            Comments
          </ToggleButton>
          <ToggleButton value="attachment">
            <Icon fontSize="small" sx={{ mr: 0.5 }}>attach_file</Icon>
            Files
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Activity Timeline */}
      {filteredEvents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Icon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}>
            timeline
          </Icon>
          <Typography variant="h6" color="text.secondary">
            No activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filterType !== 'all' ? 'Try changing the filter' : 'No events recorded yet'}
          </Typography>
        </Box>
      ) : (
        <Timeline position="right">
          {filteredEvents.map((event, index) => (
            <TimelineItem key={event.id}>
              {/* Timestamp on opposite side */}
              <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2, pt: 2 }}>
                {RelativeTime && (
                  <RelativeTime
                    date={event.timestamp}
                    uiSchema={{
                      'ui:options': {
                        format: 'relative',
                        tooltip: true,
                        variant: 'caption'
                      }
                    }}
                  />
                )}
              </TimelineOppositeContent>

              {/* Timeline dot and connector */}
              <TimelineSeparator>
                <TimelineDot color={getEventColor(event.type)}>
                  <Icon fontSize="small">{getEventIcon(event.type)}</Icon>
                </TimelineDot>
                {index < filteredEvents.length - 1 && <TimelineConnector />}
              </TimelineSeparator>

              {/* Event content */}
              <TimelineContent>
                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    {UserAvatar && event.user && (
                      <UserAvatar
                        user={event.user}
                        uiSchema={{
                          'ui:options': {
                            variant: 'avatar',
                            size: 'small'
                          }
                        }}
                      />
                    )}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">
                        <strong>
                          {event.user ? 
                            `${event.user.firstName} ${event.user.lastName}` : 
                            'System'
                          }
                        </strong>
                        {' '}
                        {event.description}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={event.type.replace('_', ' ')}
                      variant="outlined"
                    />
                  </Box>

                  {/* Event-specific details */}
                  {event.type === 'status_change' && StatusBadge && event.data.to && (
                    <Box sx={{ mt: 1, pl: 5 }}>
                      <StatusBadge
                        value={event.data.to}
                        uiSchema={{
                          'ui:options': {
                            variant: 'filled',
                            size: 'small'
                          }
                        }}
                      />
                    </Box>
                  )}

                  {event.type === 'priority_change' && StatusBadge && event.data.to && (
                    <Box sx={{ mt: 1, pl: 5 }}>
                      <StatusBadge
                        value={event.data.to}
                        uiSchema={{
                          'ui:options': {
                            variant: 'filled',
                            size: 'small',
                            colorMap: {
                              'critical': '#d32f2f',
                              'high': '#f57c00',
                              'medium': '#1976d2',
                              'low': '#757575'
                            }
                          }
                        }}
                      />
                    </Box>
                  )}

                  {event.type === 'comment' && event.data.comment && (
                    <Box sx={{ mt: 1, pl: 5 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontStyle: 'italic',
                          maxWidth: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        "{event.data.comment}"
                      </Typography>
                    </Box>
                  )}

                  {event.type === 'attachment' && event.data.document && (
                    <Box sx={{ mt: 1, pl: 5 }}>
                      <Chip
                        size="small"
                        icon={<Icon fontSize="small">attach_file</Icon>}
                        label={event.data.document.name}
                        variant="outlined"
                      />
                    </Box>
                  )}

                  {event.type === 'assignment' && UserAvatar && event.data.assignedTo && (
                    <Box sx={{ mt: 1, pl: 5 }}>
                      <UserAvatar
                        user={event.data.assignedTo}
                        uiSchema={{
                          'ui:options': {
                            variant: 'chip',
                            size: 'small'
                          }
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketActivity',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketActivity,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketActivity,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketActivity 
  });
}
