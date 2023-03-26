



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

interface ISupportTicketWorkflowModule {  
  openTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  closeTicket(args: ISupportTickeArgs): Promise<boolean>
  commentTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  addNew(): void
}

const SupportTicketWorkflow = (props: ISupportTicketWorkflowProps): ISupportTicketWorkflowModule => {

  const { reactory } = props;

  const openTicket = async ({ ticket }: { ticket: Reactory.Models.IReactorySupportTicket }) => {

    let result = await reactory.graphqlMutation<ISupportTicketOpenMutationResult, {id: string, status: string, comment?: string}>(`
    mutation ReactorySupportTicketOpen($id: String!, $status: String!, $comment: String) {
      ReactorySupportTicketStatusUpdate(id: $id, status: $status, comment: $comment) {
        id
        status
      }
    }`, { id: ticket.id, status: 'open', comment: `User ${reactory.getUserFullName()} opened the ticket` }).then()

    const { data, extensions, context } = result;
      
    return data.ReactorySupportTicketOpen

  }

  const closeTicket = async ({ ticket }: ISupportTickeArgs): Promise<boolean> => {
    reactory.createNotification(`Ticket ${ticket.reference} closed`, {  });

    return true;
  }

  const commentTicket = async ({ ticket, comment }: ISupportTickeArgs) => {
    
    return ticket;
  }

  const addNew = () => {
    
    reactory.navigation('/support/request', 
      { state: {}, replace: false })
  }

  return {
    openTicket,
    closeTicket,
    commentTicket,
    addNew
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