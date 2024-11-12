
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


interface ISupportTicketWorkflowModule {  
  openTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  closeTicket(args: ISupportTickeArgs): Promise<boolean>
  commentTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  addNew(): void,
  deleteTicket(args: ISupportTicketDeleteArgs): Promise<void>
}

const SupportTicketWorkflow = (props: ISupportTicketWorkflowProps): ISupportTicketWorkflowModule => {

  const { reactory } = props;
  const {
    loggedIn,
  } = reactory.getUser();

  const {
    user
  } = loggedIn;


  const statusUdpate = async ({ ticket, status, comment }: { ticket: Reactory.Models.IReactorySupportTicket, status: string, comment?: string }) => { 
    try {
      let result = await reactory.graphqlMutation<ISupportTicketOpenMutationResult, {id: string, status: string, comment?: string}>(`
        mutation ReactorySupportTicketStatusUpdate($id: String!, $status: String!, $comment: String) {
          ReactorySupportTicketStatusUpdate(id: $id, status: $status, comment: $comment) {
            id
            status
          }
        }`, { 
          id: ticket.id, 
          status, 
          comment })
          .then();
        reactory.log(`Ticket ${ticket.reference} ${status}`,{ result } , 'info'); 
        
        const { data, errors } = result;
        if(errors && errors.length > 0) {
          reactory.createNotification(`Error ${status} ticket`, { type: 'error' });
          reactory.log(`Error ${status} ticket: ${errors[0].message}`, 'error');
          return ticket;
        }
        return data.ReactorySupportTicketOpen
    } catch (error) {
      reactory.createNotification(`Error ${status} ticket`, { type: 'error' });
      return ticket; 
    }
  };

  const openTicket = async ({ ticket }: { ticket: Reactory.Models.IReactorySupportTicket }) => {
    return statusUdpate({ ticket, status: 'open' });
  }

  /**
   * Close a ticket using status update
   */
  const closeTicket = async ({ ticket }: ISupportTickeArgs): Promise<boolean> => {
    reactory.createNotification(`Ticket ${ticket.reference} closed`, {  });

    const result = statusUdpate({ ticket, status: 'closed' });
    if(result) {
      reactory.createNotification(`Ticket ${ticket.reference} closed`, { type: 'success' });
      return true;
    } else {
      reactory.createNotification(`Error closing ticket ${ticket.reference}`, { type: 'error' });
      return false;
    }
  }

  const commentTicket = async ({ ticket, comment }: ISupportTickeArgs) => {

    try {
      if(!comment) {
        reactory.createNotification(`Comment cannot be empty`, { type: 'error' });
        return ticket;
      }

      const result = reactory.graphqlMutation<ISupportTicketOpenMutationResult, {id: string, comment: string}>(`
        mutation ReactorySupportTicketComment($id: String!, $comment: String!) {
          ReactorySupportTicketComment(id: $id, comment: $comment) {
            id
            status
          }
        }`, { 
          id: ticket.id, 
          comment })
          .then();
        reactory.log(`Ticket ${ticket.reference} commented`,{ result } , 'info');          
    } catch (error) { 
      reactory.createNotification(`Error adding comment to ticket ${ticket.reference}`, { type: 'error' });
      return ticket;
    }        
  }

  const addNew = () => {    
    reactory.navigation('/support/request', 
      { state: {}, replace: false })
  }

  const deleteTicket = async (args: ISupportTicketDeleteArgs): Promise<void> => { 
    
    try {

      const result = reactory.graphqlMutation<ISupportTicketOpenMutationResult, {ids: string[]}>(`
        mutation ReactorySupportTicketDelete($ids: [String]!) {
          ReactorySupportTicketDelete(ids: $ids) {
            id
            status
          }
        }`, { 
          ids: args.tickets.map(t => `${t.id}`) })
          .then();
        reactory.log(`${args?.tickets?.length || 0} Ticket(s) deleted`,{ result } , 'info');

    } catch (error) { 
      reactory.createNotification(`Error deleting ticket`, { type: 'error' });
    }
  }

  return {
    openTicket,
    closeTicket,
    commentTicket,
    addNew,
    deleteTicket,
  }
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
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, component: SupportTicketWorkflow });
}