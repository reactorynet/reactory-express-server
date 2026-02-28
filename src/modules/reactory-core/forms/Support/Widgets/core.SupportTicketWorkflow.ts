
interface ISupportTicketWorkflowProps {
  reactory: Reactory.Client.IReactoryApi, 
}

interface ISupportTicketOpenMutationResult {
  ReactorySupportTicketOpen: Reactory.Models.IReactorySupportTicket
}

interface ISupportTickeArgs {
  ticket: Reactory.Models.IReactorySupportTicket,
  comment?: string
}

interface ISupportTicketDeleteArgs {
  tickets: Reactory.Models.IReactorySupportTicket[]
}


interface ISupportTicketUpdateResult {
  ReactoryUpdateSupportTicket: Reactory.Models.IReactorySupportTicket
}

interface ISupportTicketWorkflowModule {  
  openTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  closeTicket(args: ISupportTickeArgs): Promise<boolean>
  commentTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  addNew(): void,
  deleteTicket(args: ISupportTicketDeleteArgs): Promise<void>
  updateTicket(args: { ticket: Reactory.Models.IReactorySupportTicket, updates: Partial<Reactory.Models.IReactorySupportTicketUpdate> }): Promise<Reactory.Models.IReactorySupportTicket | null>
  reassignTicket(args: { ticket: Reactory.Models.IReactorySupportTicket, assignTo: string }): Promise<Reactory.Models.IReactorySupportTicket | null>
  changePriority(args: { ticket: Reactory.Models.IReactorySupportTicket, priority: string }): Promise<Reactory.Models.IReactorySupportTicket | null>
  addTags(args: { ticket: Reactory.Models.IReactorySupportTicket, tags: string[] }): Promise<Reactory.Models.IReactorySupportTicket | null>
}

const TICKET_FIELDS = `
  id
  request
  requestType
  description
  status
  priority
  reference
  tags
  assignedTo {
    id
    firstName
    lastName
    avatar
    email
  }
  createdBy {
    id
    firstName
    lastName
    avatar
    email
  }
  createdDate
  updatedDate
  slaDeadline
  isOverdue
`;

const SupportTicketWorkflow = (props: ISupportTicketWorkflowProps): ISupportTicketWorkflowModule => {

  const { reactory } = props;

  const executeUpdate = async (
    ticket: Reactory.Models.IReactorySupportTicket,
    updates: Partial<Reactory.Models.IReactorySupportTicketUpdate>,
    successMessage: string,
    errorMessage: string
  ): Promise<Reactory.Models.IReactorySupportTicket | null> => {
    try {
      const result = await reactory.graphqlMutation<
        ISupportTicketUpdateResult,
        { ticket_id: string; updates: Partial<Reactory.Models.IReactorySupportTicketUpdate> }
      >(`mutation ReactoryUpdateSupportTicket($ticket_id: String, $updates: ReactorySupportTicketUpdate) {
          ReactoryUpdateSupportTicket(ticket_id: $ticket_id, updates: $updates) {
            ${TICKET_FIELDS}
          }
        }`, {
        ticket_id: `${ticket.id}`,
        updates,
      }).then();

      const { data, errors } = result;
      if (errors && errors.length > 0) {
        reactory.createNotification(errorMessage, { type: 'error' });
        reactory.log(`${errorMessage}: ${errors[0].message}`, 'error');
        return null;
      }

      reactory.createNotification(successMessage, { type: 'success' });
      return data.ReactoryUpdateSupportTicket;
    } catch (error) {
      reactory.createNotification(errorMessage, { type: 'error' });
      return null;
    }
  };

  const updateTicket = async ({ ticket, updates }: { ticket: Reactory.Models.IReactorySupportTicket, updates: Partial<Reactory.Models.IReactorySupportTicketUpdate> }) => {
    return executeUpdate(
      ticket,
      updates,
      `Ticket ${ticket.reference} updated`,
      `Error updating ticket ${ticket.reference}`
    );
  };

  const openTicket = async ({ ticket }: { ticket: Reactory.Models.IReactorySupportTicket }) => {
    return executeUpdate(
      ticket,
      { status: 'open' },
      `Ticket ${ticket.reference} opened`,
      `Error opening ticket ${ticket.reference}`
    );
  };

  const closeTicket = async ({ ticket }: ISupportTickeArgs): Promise<boolean> => {
    const result = await executeUpdate(
      ticket,
      { status: 'closed' },
      `Ticket ${ticket.reference} closed`,
      `Error closing ticket ${ticket.reference}`
    );
    return result !== null;
  };

  const reassignTicket = async ({ ticket, assignTo }: { ticket: Reactory.Models.IReactorySupportTicket, assignTo: string }) => {
    return executeUpdate(
      ticket,
      { assignTo },
      `Ticket ${ticket.reference} reassigned`,
      `Error reassigning ticket ${ticket.reference}`
    );
  };

  const changePriority = async ({ ticket, priority }: { ticket: Reactory.Models.IReactorySupportTicket, priority: string }) => {
    return executeUpdate(
      ticket,
      { priority },
      `Ticket ${ticket.reference} priority changed to ${priority}`,
      `Error changing priority for ticket ${ticket.reference}`
    );
  };

  const addTags = async ({ ticket, tags }: { ticket: Reactory.Models.IReactorySupportTicket, tags: string[] }) => {
    const existingTags = ticket.tags || [];
    const mergedTags = [...new Set([...existingTags, ...tags])];
    return executeUpdate(
      ticket,
      { tags: mergedTags },
      `Tags added to ticket ${ticket.reference}`,
      `Error adding tags to ticket ${ticket.reference}`
    );
  };

  const commentTicket = async ({ ticket, comment }: ISupportTickeArgs) => {
    try {
      if (!comment) {
        reactory.createNotification('Comment cannot be empty', { type: 'error' });
        return ticket;
      }

      const result = await reactory.graphqlMutation<ISupportTicketOpenMutationResult, { id: string, comment: string }>(`
        mutation ReactorySupportTicketComment($id: String!, $comment: String!) {
          ReactorySupportTicketComment(id: $id, comment: $comment) {
            id
            status
          }
        }`, {
        id: `${ticket.id}`,
        comment,
      }).then();
      reactory.log(`Ticket ${ticket.reference} commented`, { result }, 'info');
    } catch (error) {
      reactory.createNotification(`Error adding comment to ticket ${ticket.reference}`, { type: 'error' });
      return ticket;
    }
  };

  const addNew = () => {
    reactory.navigation('/support/request',
      { state: {}, replace: false });
  };

  const deleteTicket = async (args: ISupportTicketDeleteArgs): Promise<void> => {
    try {
      const result = await reactory.graphqlMutation<ISupportTicketOpenMutationResult, { ids: string[] }>(`
        mutation ReactorySupportTicketDelete($ids: [String]!) {
          ReactorySupportTicketDelete(ids: $ids) {
            id
            status
          }
        }`, {
        ids: args.tickets.map(t => `${t.id}`),
      }).then();
      reactory.log(`${args?.tickets?.length || 0} Ticket(s) deleted`, { result }, 'info');
    } catch (error) {
      reactory.createNotification('Error deleting ticket', { type: 'error' });
    }
  };

  return {
    openTicket,
    closeTicket,
    commentTicket,
    addNew,
    deleteTicket,
    updateTicket,
    reassignTicket,
    changePriority,
    addTags,
  };
}


const Definition: Reactory.Client.IReactoryComponentRegistryEntry<ISupportTicketWorkflowModule> = {
  name: 'SupportTicketWorkflow',
  nameSpace: 'core',
  version: '1.0.0',
  component: null,
  roles: ['USER'],
  componentType: ''
}

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  const reactory: Reactory.Client.IReactoryApi = window.reactory.api as Reactory.Client.IReactoryApi
  reactory.registerComponent(Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketWorkflow({ reactory }),
    ['Support Ticket'],
    Definition.roles,
    false,
    [],
    "workflow");
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketWorkflow 
  });
}