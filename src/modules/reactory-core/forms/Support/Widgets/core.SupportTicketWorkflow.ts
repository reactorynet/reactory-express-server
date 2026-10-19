
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

/** Parameters for launching an AI engineering run from a support ticket. */
interface ILaunchAIActionArgs {
  /** The ticket the agent should work. */
  ticket: Reactory.Models.IReactorySupportTicket,
  /** The AI agent/persona id that performs the engineering work. */
  agentId: string,
  /** Optional reviewer persona id (defaults to QualityQuinn). */
  reviewerId?: string,
  /** Branch prefix for the isolated worktree: feature | bug | chore. */
  taskType?: string,
  /** Absolute repository path the agent works in. */
  workdir?: string,
  /** auto = tools run unattended; supervised = risky tools raise approval tasks. */
  oversightMode?: string,
  /** Hard bound on engineer/reviewer hand-back cycles. */
  maxReviewCycles?: number,
  /** Raise a human sign-off task before the run is considered complete. */
  requireSignoff?: boolean,
  /** Extra context/instruction appended to the agent's brief. */
  context?: string,
  /**
   * Workflow id to run.
   *
   * REQUIRED on purpose: there is no built-in default any more. A hardcoded
   * fallback here silently pinned callers to whatever version happened to be
   * current when the line was written, so the UI kept launching an old
   * definition after every bump. Callers resolve the version from the
   * registry (see core.SupportTicketAIAction).
   */
  workflowId: string,
}

interface ILaunchAIActionResult {
  instanceId: string | null,
  status: string | null,
  workflowId: string,
  error?: string,
}

interface ISupportTicketWorkflowModule {  
  openTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  closeTicket(args: ISupportTickeArgs): Promise<boolean>
  commentTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  assignTicket(args: {
    ticket?: Reactory.Models.IReactorySupportTicket,
    rowData?: any,
    user: Partial<Reactory.Models.IUser>
  }): Promise<Reactory.Models.IReactorySupportTicket | null>
  addNew(): void,
  deleteTicket(args: ISupportTicketDeleteArgs): Promise<void>
  updateTicket(args: { ticket: Reactory.Models.IReactorySupportTicket, updates: Partial<Reactory.Models.IReactorySupportTicketUpdate> }): Promise<Reactory.Models.IReactorySupportTicket | null>
  reassignTicket(args: { ticket: Reactory.Models.IReactorySupportTicket, assignTo: string }): Promise<Reactory.Models.IReactorySupportTicket | null>
  changePriority(args: { ticket: Reactory.Models.IReactorySupportTicket, priority: string }): Promise<Reactory.Models.IReactorySupportTicket | null>
  addTags(args: { ticket: Reactory.Models.IReactorySupportTicket, tags: string[] }): Promise<Reactory.Models.IReactorySupportTicket | null>
  /**
   * Launch an AI engineering run against a ticket (`core.ProcessAITicket`).
   *
   * Returns the started workflow instance so the caller can link to it. The run
   * executes as the CALLING user (the workflow engine stamps the start context's
   * identity), which is what makes the agent conversations appear in that user's
   * chat history - so this is deliberately not proxied through a service account.
   */
  launchAIAction(args: ILaunchAIActionArgs): Promise<ILaunchAIActionResult>
  /**
   * Publish a "this ticket changed" notification on the reactory event bus.
   *
   * Any component or data fetcher can subscribe:
   *   reactory.on('core.SupportTicketChanged', handler)
   * The MaterialTableWidget grid does this via uiSchema refreshEvents, so a change made
   * anywhere re-runs its query without the caller having to know about the grid.
   */
  notifyTicketChange(action: string, payload?: {
    ticket?: Partial<Reactory.Models.IReactorySupportTicket>,
    ticketId?: string,
    reference?: string,
    ids?: string[],
    changes?: any,
  }): void
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

  /**
   * Canonical change-notification for the Support feature.
   *
   * Contract (all consumers rely on these keys):
   *   event   : 'core.SupportTicketChanged'
   *   payload : { action, ticketId?, reference?, ticket?, ids?, changes? }
   *
   * `ticketId` is always populated when a single ticket is known - subscribers key off it
   * to decide whether the change concerns them. (Previously the workflow emitted only
   * `{ ticket }`, so any subscriber filtering on `event.ticketId` never matched.)
   *
   * The legacy event names are ALSO emitted so that existing subscribers outside this
   * feature keep working:
   *   - core.SupportTicketUpdated       (shared Comments component, comments widget)
   *   - core.SupportTicketDeletedEvent  (grid refreshEvents, GraphExplorer)
   * They can be retired once every consumer has migrated to core.SupportTicketChanged.
   */
  const emitTicketChange = (action: string, payload: {
    ticket?: Partial<Reactory.Models.IReactorySupportTicket>,
    ticketId?: string,
    reference?: string,
    ids?: string[],
    changes?: any,
  } = {}): void => {
    const detail = {
      action,
      ticketId: payload.ticketId || (payload.ticket as any)?.id,
      reference: payload.reference || (payload.ticket as any)?.reference,
      ticket: payload.ticket,
      ids: payload.ids,
      changes: payload.changes,
    };

    try {
      reactory.emit('core.SupportTicketChanged', detail);
    } catch (emitError) {
      reactory.log('SupportTicketWorkflow: failed to emit core.SupportTicketChanged', { emitError }, 'warn');
    }

    // Legacy mirrors (see note above).
    try {
      if (action === 'deleted') {
        reactory.emit('core.SupportTicketDeletedEvent', { ids: detail.ids || [], action });
      } else if (detail.ticket || detail.ticketId) {
        reactory.emit('core.SupportTicketUpdated', detail);
      }
    } catch (legacyError) {
      reactory.log('SupportTicketWorkflow: failed to emit legacy ticket event', { legacyError }, 'warn');
    }
  };

  const executeUpdate = async (
    ticket: Reactory.Models.IReactorySupportTicket,
    updates: Partial<Reactory.Models.IReactorySupportTicketUpdate>,
    successMessage: string,
    errorMessage: string,
    action: string = 'updated'
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
      // Publish the change so the grid (and any interested component) refreshes.
      emitTicketChange(action, { ticket: data.ReactoryUpdateSupportTicket, changes: updates });
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
      `Error updating ticket ${ticket.reference}`,
      'updated'
    );
  };

  const openTicket = async ({ ticket }: { ticket: Reactory.Models.IReactorySupportTicket }) => {
    return executeUpdate(
      ticket,
      { status: 'open' },
      `Ticket ${ticket.reference} opened`,
      `Error opening ticket ${ticket.reference}`,
      'status-changed'
    );
  };

  const closeTicket = async ({ ticket }: ISupportTickeArgs): Promise<boolean> => {
    const result = await executeUpdate(
      ticket,
      { status: 'closed' },
      `Ticket ${ticket.reference} closed`,
      `Error closing ticket ${ticket.reference}`,
      'status-changed'
    );
    return result !== null;
  };

  const reassignTicket = async ({ ticket, assignTo }: { ticket: Reactory.Models.IReactorySupportTicket, assignTo: string }) => {
    return executeUpdate(
      ticket,
      { assignTo },
      `Ticket ${ticket.reference} reassigned`,
      `Error reassigning ticket ${ticket.reference}`,
      'assigned'
    );
  };

  const changePriority = async ({ ticket, priority }: { ticket: Reactory.Models.IReactorySupportTicket, priority: string }) => {
    return executeUpdate(
      ticket,
      { priority },
      `Ticket ${ticket.reference} priority changed to ${priority}`,
      `Error changing priority for ticket ${ticket.reference}`,
      'priority-changed'
    );
  };

  const addTags = async ({ ticket, tags }: { ticket: Reactory.Models.IReactorySupportTicket, tags: string[] }) => {
    const existingTags = ticket.tags || [];
    const mergedTags = [...new Set([...existingTags, ...tags])];
    return executeUpdate(
      ticket,
      { tags: mergedTags },
      `Tags added to ticket ${ticket.reference}`,
      `Error adding tags to ticket ${ticket.reference}`,
      'tags-changed'
    );
  };

  const commentTicket = async ({ ticket, comment }: ISupportTickeArgs) => {
    try {
      if (!comment) {
        reactory.createNotification('Comment cannot be empty', { type: 'error' });
        return ticket;
      }

      // ReactorySupportTicketComment(id, comment) does not exist. The schema exposes
      // ReactoryAddSupportTicketComment(input: ReactorySupportTicketCommentInput!).
      const result = await reactory.graphqlMutation<{ ReactoryAddSupportTicketComment: { id: string } }, { input: { ticketId: string, comment: string } }>(`
        mutation ReactoryAddSupportTicketComment($input: ReactorySupportTicketCommentInput!) {
          ReactoryAddSupportTicketComment(input: $input) {
            id
          }
        }`, {
        input: {
          ticketId: `${ticket.id}`,
          comment,
        },
      }).then();
      if (result?.data?.ReactoryAddSupportTicketComment) {
        reactory.createNotification(`Comment added to ${ticket.reference}`, { type: 'success' });
        emitTicketChange('commented', { ticket, changes: { comment } });
      }
      reactory.log(`Ticket ${ticket.reference} commented`, { result }, 'info');
    } catch (error) {
      reactory.createNotification(`Error adding comment to ticket ${ticket.reference}`, { type: 'error' });
      return ticket;
    }
  };

  /**
   * Assign a ticket to a user and apply it immediately (no confirmation step).
   *
   * Invoked from the grid "Assigned To" column picker. MaterialTableWidget passes the row
   * as `rowData` rather than a ticket prop, so accept either shape.
   */
  const assignTicket = async ({ ticket, rowData, user }: {
    ticket?: Reactory.Models.IReactorySupportTicket,
    rowData?: any,
    user: Partial<Reactory.Models.IUser>,
  }): Promise<Reactory.Models.IReactorySupportTicket | null> => {
    const target = ticket || rowData;
    if (!target || !target.id) {
      reactory.createNotification('Cannot assign ticket: no ticket id available', { type: 'error' });
      return null;
    }
    if (!user || !user.id) {
      reactory.createNotification('Cannot assign ticket: no user selected', { type: 'error' });
      return null;
    }
    const label = target.reference || target.id;
    const assignee = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const result = await executeUpdate(
      target,
      { assignTo: `${user.id}` },
      `Ticket ${label} assigned to ${assignee}`,
      `Error assigning ticket ${label}`,
      'assigned'
    );
    // executeUpdate already published the change (action 'assigned'); no second emit here.
    return result;
  };

  const addNew = () => {
    reactory.navigation('/support/request',
      { state: {}, replace: false });
  };

  /**
   * Launch an AI engineering run (`core.ProcessAITicket`) against a ticket.
   *
   * This is the single implementation of "trigger the AI from a ticket". The widget
   * owns the form; this owns the mutation so a toolbar, a bulk action or a future
   * integration can start the same run without duplicating the contract.
   *
   * Two behaviours are deliberate:
   *  - Optional parameters are OMITTED rather than sent empty. The workflow treats
   *    an absent workdir as "use the repo it was started from", and an empty
   *    reviewerId would override the persona default rather than defer to it.
   *  - The run executes as the CALLING user. The engine stamps the start context's
   *    identity onto the instance, which is what makes the agent conversations
   *    appear in that user's chat history (and therefore inspectable later).
   */
  const launchAIAction = async (args: ILaunchAIActionArgs): Promise<ILaunchAIActionResult> => {
    const workflowId = args.workflowId;
    const ticket = args.ticket;

    if (!ticket || !ticket.id) {
      reactory.createNotification('Cannot start an AI run: no ticket id available', { type: 'error' });
      return { instanceId: null, status: null, workflowId, error: 'No ticket id available' };
    }
    if (!workflowId) {
      reactory.createNotification('Cannot start an AI run: no workflow version was resolved', { type: 'error' });
      return { instanceId: null, status: null, workflowId: null, error: 'No workflow version resolved' };
    }
    if (!args.agentId) {
      reactory.createNotification('Cannot start an AI run: no agent selected', { type: 'error' });
      return { instanceId: null, status: null, workflowId, error: 'No agent selected' };
    }

    const input: Record<string, any> = {
      ticketId: `${ticket.id}`,
      agentId: args.agentId,
      taskType: args.taskType || 'feature',
      oversightMode: args.oversightMode || 'auto',
      maxReviewCycles: typeof args.maxReviewCycles === 'number' ? args.maxReviewCycles : 3,
      requireSignoff: args.requireSignoff !== false,
    };
    if (args.reviewerId) input.reviewerId = args.reviewerId;
    if (args.workdir) input.workdir = args.workdir;
    if (args.context) input.context = args.context;

    try {
      const result: any = await reactory.graphqlMutation(`
        mutation StartAIEngineeringRun($workflowId: String!, $input: WorkflowExecutionInput) {
          startWorkflow(workflowId: $workflowId, input: $input) {
            id
            name
            status
          }
        }`, {
        workflowId,
        input: {
          input,
          tags: ['ai-run', 'launched-from-ui', `ticket:${ticket.reference || ticket.id}`],
          priority: 1,
        },
      }).then();

      const started = result?.data?.startWorkflow;
      if (!started?.id) {
        const message = result?.errors?.[0]?.message || 'Failed to start the AI run';
        reactory.createNotification(message, { type: 'error' });
        reactory.log('SupportTicketWorkflow: launchAIAction returned no instance', { result }, 'error');
        return { instanceId: null, status: null, workflowId, error: message };
      }

      reactory.createNotification(`AI run started for ${ticket.reference || ticket.id}`, { type: 'success' });
      // The ticket itself is not modified synchronously, but the run writes a pickup
      // comment shortly after starting - publish the change so the Comments/Activity
      // tabs refresh without the user hunting for a manual reload.
      emitTicketChange('ai-run-started', {
        ticket,
        changes: { workflowInstanceId: started.id, agentId: args.agentId, workflowId },
      });

      return { instanceId: started.id, status: started.status || 'RUNNING', workflowId };
    } catch (error: any) {
      const message = error?.message || 'Failed to start the AI run';
      reactory.createNotification(message, { type: 'error' });
      reactory.log('SupportTicketWorkflow: launchAIAction failed', { error }, 'error');
      return { instanceId: null, status: null, workflowId, error: message };
    }
  };

  const deleteTicket = async (args: ISupportTicketDeleteArgs): Promise<void> => {
    try {
      // ReactorySupportTicketDelete(ids) does not exist. The schema exposes
      // ReactoryDeleteSupportTicket(deleteInput: ReactorySupportTicketDeleteInput!), which
      // returns the union ReactorySupportTicketDeleteResult.
      const ids = args.tickets.map(t => `${t.id}`);
      const result = await reactory.graphqlMutation<{ ReactoryDeleteSupportTicket: { ids?: string[], error?: string } }, { deleteInput: { ids: string[] } }>(`
        mutation ReactoryDeleteSupportTicket($deleteInput: ReactorySupportTicketDeleteInput!) {
          ReactoryDeleteSupportTicket(deleteInput: $deleteInput) {
            ... on ReactorySupportTicketDeleteSuccess {
              ids
            }
            ... on ReactorySupportTicketDeleteError {
              ids
              error
            }
          }
        }`, {
        deleteInput: { ids },
      }).then();
      const deleteResult = result?.data?.ReactoryDeleteSupportTicket;
      if (deleteResult && !deleteResult.error) {
        reactory.createNotification(`${deleteResult.ids?.length || ids.length} ticket(s) deleted`, { type: 'success' });
        emitTicketChange('deleted', { ids: deleteResult.ids || ids });
      } else if (deleteResult?.error) {
        reactory.createNotification(deleteResult.error, { type: 'error' });
      }
      reactory.log(`${args?.tickets?.length || 0} Ticket(s) deleted`, { result }, 'info');
    } catch (error) {
      reactory.createNotification('Error deleting ticket', { type: 'error' });
    }
  };

  return {
    notifyTicketChange: emitTicketChange,
    launchAIAction,
    openTicket,
    closeTicket,
    commentTicket,
    assignTicket,
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