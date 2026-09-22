import Reactory from '@reactorynet/reactory-core';

interface RelatedDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  StatusBadge: any,
  RelativeTime: any,
  SearchWidget: any,
}

interface RelatedProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
  onRelatedCountChange?: (count: number) => void,
}

interface RelatedTicket {
  id: string;
  linkId?: string;
  targetId?: string;
  reference: string;
  status: string;
  request: string;
  priority?: string;
  createdDate: Date | string;
  relationType: 'blocks' | 'blocked-by' | 'duplicate' | 'related-to' | 'parent' | 'child';
  reciprocalLinkId?: string;
}

/**
 * SupportTicketRelated Component
 * 
 * Related tickets tab for managing ticket relationships.
 * 
 * Features:
 * - List related tickets
 * - Add new relationships
 * - Search for tickets to link
 * - Relationship types (blocks, duplicate, related)
 * - Quick navigation to related tickets
 * - Remove relationships
 * 
 * @example
 * <SupportTicketRelated ticket={ticketData} reactory={api} />
 */
const SupportTicketRelated = (props: RelatedProps) => {
  const { reactory, ticket, onRelatedCountChange } = props;

  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    StatusBadge,
    RelativeTime,
    SearchWidget,
  } = reactory.getComponents<RelatedDependencies>([
    'react.React',
    'material-ui.Material',
    'core.StatusBadge',
    'core.RelativeTime',
    'core.SearchWidget',
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    CircularProgress,
  } = MaterialCore;

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [relationType, setRelationType] = React.useState<string>('related-to');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [relatedTickets, setRelatedTickets] = React.useState<RelatedTicket[]>([]);

  const fetchRelatedTickets = React.useCallback(async () => {
    if (!ticket?.id) return;
    setLoading(true);
    try {
      const result = await reactory.graphqlQuery<{
        getCommentsByContext: {
          comments: Array<{
            id: string;
            text: string;
            metadata: any;
            when: string;
          }>;
          paging: { total: number };
        };
      }, { context: string; contextId: string }>(`
        query GetRelatedTickets($context: String!, $contextId: String!) {
          getCommentsByContext(context: $context, contextId: $contextId, paging: { page: 1, pageSize: 50 }) {
            comments {
              id
              text
              metadata
              when
            }
            paging {
              total
            }
          }
        }
      `, {
        context: 'ReactorySupportTicketRelated',
        contextId: ticket.id,
      }).then();

      const comments = result?.data?.getCommentsByContext?.comments || [];
      const links: RelatedTicket[] = comments.map((c: any) => {
        let meta = c.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        } else if (!meta) {
          meta = {};
        }

        return {
          id: meta.targetId || c.id,
          linkId: c.id,
          targetId: meta.targetId,
          reference: meta.reference || '',
          status: meta.status || 'open',
          request: meta.request || '',
          priority: meta.priority,
          createdDate: meta.createdDate || c.when,
          relationType: meta.relationType || 'related-to',
          reciprocalLinkId: meta.reciprocalLinkId,
        };
      });

      setRelatedTickets(links);
      if (onRelatedCountChange) {
        onRelatedCountChange(links.length);
      }
    } catch (err) {
      reactory.log('Error fetching related tickets', { err }, 'error');
    } finally {
      setLoading(false);
    }
  }, [ticket?.id, reactory, onRelatedCountChange]);

  React.useEffect(() => {
    fetchRelatedTickets();
  }, [fetchRelatedTickets]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const result = await reactory.graphqlQuery(`
        query SearchSupportTickets($searchString: String!) {
          ReactorySupportTickets(
            filter: { searchString: $searchString }
            paging: { page: 1, pageSize: 10 }
          ) {
            tickets {
              id
              reference
              request
              status
              priority
              createdDate
            }
          }
        }
      `, { searchString: query });

      if (result.data?.ReactorySupportTickets?.tickets) {
        // Filter out current ticket and already related tickets
        const tickets = result.data.ReactorySupportTickets.tickets.filter(
          (t: any) => t.id !== ticket.id && !relatedTickets.find(rt => (rt.targetId || rt.id) === t.id)
        );
        setSearchResults(tickets);
      }
    } catch (error) {
      reactory.log('Error searching tickets', { error }, 'error');
    } finally {
      setSearching(false);
    }
  };

  const getInverseRelationType = (type: string): string => {
    switch (type) {
      case 'blocks': return 'blocked-by';
      case 'blocked-by': return 'blocks';
      case 'parent': return 'child';
      case 'child': return 'parent';
      default: return type; // 'duplicate', 'related-to'
    }
  };

  const handleAddRelation = async (relatedTicket: any) => {
    try {
      // 1. Create relation link on current ticket
      const primaryResult = await reactory.graphqlMutation(`
        mutation CreateTicketLink($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
            context
            contextId
            text
            metadata
            when
          }
        }
      `, {
        input: {
          context: 'ReactorySupportTicketRelated',
          contextId: ticket.id,
          text: `${relationType}:${relatedTicket.id}`,
          metadata: {
            targetId: relatedTicket.id,
            reference: relatedTicket.reference,
            status: relatedTicket.status,
            request: relatedTicket.request,
            priority: relatedTicket.priority,
            createdDate: relatedTicket.createdDate,
            relationType: relationType,
          }
        }
      });

      const primaryId = primaryResult?.data?.createComment?.id;

      // 2. Create reciprocal link on target ticket
      const inverseType = getInverseRelationType(relationType);
      await reactory.graphqlMutation(`
        mutation CreateReciprocalTicketLink($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
            context
            contextId
            text
            metadata
            when
          }
        }
      `, {
        input: {
          context: 'ReactorySupportTicketRelated',
          contextId: relatedTicket.id,
          text: `${inverseType}:${ticket.id}`,
          metadata: {
            targetId: ticket.id,
            reference: ticket.reference,
            status: ticket.status,
            request: ticket.request,
            priority: ticket.priority,
            createdDate: ticket.createdDate,
            relationType: inverseType,
            reciprocalLinkId: primaryId,
          }
        }
      });

      // 3. Emit change event
      try {
        reactory.emit('core.SupportTicketChanged', {
          action: 'related-changed',
          ticketId: ticket.id,
          reference: ticket.reference,
          ticket,
        });
      } catch (e) {}

      setAddDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      
      await fetchRelatedTickets();
      reactory.createNotification('Ticket linked successfully', { type: 'success' });
    } catch (error) {
      reactory.log('Error adding relationship', { error }, 'error');
      reactory.createNotification('Failed to link ticket', { type: 'error' });
    }
  };

  const handleRemoveRelation = async (related: RelatedTicket) => {
    try {
      // 1. Delete the primary link comment
      if (related.linkId) {
        await reactory.graphqlMutation(`
          mutation DeleteTicketLink($input: DeleteCommentInput!) {
            deleteComment(input: $input) {
              ... on DeleteCommentSuccess {
                success
                commentId
              }
              ... on DeleteCommentError {
                error
                message
              }
            }
          }
        `, {
          input: {
            commentId: related.linkId,
            softDelete: false,
          }
        });
      }

      // 2. Also clean up reciprocal link on target ticket if targetId is known
      const targetId = related.targetId || related.id;
      if (targetId) {
        try {
          const reciprocalQuery = await reactory.graphqlQuery(`
            query GetReciprocalLinks($context: String!, $contextId: String!) {
              getCommentsByContext(context: $context, contextId: $contextId, paging: { page: 1, pageSize: 50 }) {
                comments {
                  id
                  metadata
                }
              }
            }
          `, {
            context: 'ReactorySupportTicketRelated',
            contextId: targetId,
          });

          const reciprocalComments = reciprocalQuery?.data?.getCommentsByContext?.comments || [];
          for (const rc of reciprocalComments) {
            let rMeta = rc.metadata;
            if (typeof rMeta === 'string') {
              try { rMeta = JSON.parse(rMeta); } catch (e) { rMeta = {}; }
            } else if (!rMeta) {
              rMeta = {};
            }
            if (rMeta.targetId === ticket.id) {
              await reactory.graphqlMutation(`
                mutation DeleteReciprocalLink($input: DeleteCommentInput!) {
                  deleteComment(input: $input) {
                    ... on DeleteCommentSuccess {
                      success
                    }
                  }
                }
              `, {
                input: {
                  commentId: rc.id,
                  softDelete: false,
                }
              });
            }
          }
        } catch (recipErr) {
          reactory.log('Error cleaning reciprocal link', { recipErr }, 'warn');
        }
      }

      // 3. Emit change event
      try {
        reactory.emit('core.SupportTicketChanged', {
          action: 'related-changed',
          ticketId: ticket.id,
          reference: ticket.reference,
          ticket,
        });
      } catch (e) {}

      await fetchRelatedTickets();
      reactory.createNotification('Relationship removed', { type: 'success' });
    } catch (error) {
      reactory.log('Error removing relationship', { error }, 'error');
      reactory.createNotification('Failed to remove relationship', { type: 'error' });
    }
  };

  const handleNavigateToTicket = (ticketReference: string) => {
    // Navigate to related ticket
    reactory.createNotification(`Navigate to ${ticketReference} - Coming soon`, { type: 'info' });
  };

  const getRelationTypeColor = (type: string): any => {
    switch (type) {
      case 'blocks': return 'error';
      case 'blocked-by': return 'warning';
      case 'duplicate': return 'default';
      case 'related-to': return 'info';
      case 'parent': return 'primary';
      case 'child': return 'secondary';
      default: return 'default';
    }
  };

  const getRelationTypeIcon = (type: string): string => {
    switch (type) {
      case 'blocks': return 'block';
      case 'blocked-by': return 'warning';
      case 'duplicate': return 'content_copy';
      case 'related-to': return 'link';
      case 'parent': return 'arrow_upward';
      case 'child': return 'arrow_downward';
      default: return 'link';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Related Tickets ({relatedTickets.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon>add_link</Icon>}
          onClick={() => setAddDialogOpen(true)}
        >
          Link Ticket
        </Button>
      </Box>

      {/* Related Tickets Table */}
      {relatedTickets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Icon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}>
            link_off
          </Icon>
          <Typography variant="h6" color="text.secondary">
            No related tickets
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Link this ticket to related issues, duplicates, or dependencies
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Icon>add_link</Icon>}
            onClick={() => setAddDialogOpen(true)}
          >
            Link First Ticket
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Relation</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relatedTickets.map((related) => (
                <TableRow 
                  key={related.id}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => handleNavigateToTicket(related.reference)}
                >
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'primary.main'
                      }}
                    >
                      #{related.reference}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={<Icon fontSize="small">{getRelationTypeIcon(related.relationType)}</Icon>}
                      label={related.relationType.replace('-', ' ')}
                      color={getRelationTypeColor(related.relationType)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {StatusBadge && (
                      <StatusBadge
                        value={related.status}
                        uiSchema={{
                          'ui:options': {
                            variant: 'filled',
                            size: 'small'
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {StatusBadge && related.priority && (
                      <StatusBadge
                        value={related.priority}
                        uiSchema={{
                          'ui:options': {
                            variant: 'outlined',
                            size: 'small',
                            showIcon: false
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                      {related.request}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {RelativeTime && (
                      <RelativeTime
                        date={related.createdDate}
                        uiSchema={{
                          'ui:options': {
                            format: 'relative',
                            variant: 'caption'
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove relationship">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRelation(related);
                        }}
                      >
                        <Icon fontSize="small">link_off</Icon>
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Relationship Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Link Related Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 1 }}>
            <Select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="related-to">Related to</MenuItem>
              <MenuItem value="blocks">Blocks</MenuItem>
              <MenuItem value="blocked-by">Blocked by</MenuItem>
              <MenuItem value="duplicate">Duplicate of</MenuItem>
              <MenuItem value="parent">Parent of</MenuItem>
              <MenuItem value="child">Child of</MenuItem>
            </Select>

            <TextField
              fullWidth
              size="small"
              placeholder="Search by reference or title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              InputProps={{
                startAdornment: <Icon sx={{ mr: 1, color: 'text.secondary' }}>search</Icon>
              }}
            />
          </Box>

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((result) => (
                    <TableRow key={result.id} hover>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        >
                          #{result.reference}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {StatusBadge && (
                          <StatusBadge
                            value={result.status}
                            uiSchema={{
                              'ui:options': {
                                variant: 'filled',
                                size: 'small'
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {result.request}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {RelativeTime && (
                          <RelativeTime
                            date={result.createdDate}
                            uiSchema={{
                              'ui:options': {
                                format: 'relative',
                                variant: 'caption'
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Icon fontSize="small">add_link</Icon>}
                          onClick={() => handleAddRelation(result)}
                        >
                          Link
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : searchQuery ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No tickets found matching "{searchQuery}"
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Start typing to search for tickets
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketRelated',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketRelated,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketRelated,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketRelated 
  });
}
