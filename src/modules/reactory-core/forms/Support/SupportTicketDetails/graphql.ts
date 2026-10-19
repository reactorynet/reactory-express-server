import Reactory from '@reactorynet/reactory-core';

/**
 * Single-ticket query used by the ticket details page.
 *
 * `ReactorySupportTicketByReference` was added because neither existing list
 * query can serve a details page:
 *
 *  - `ReactorySupportTickets` is restricted to support staff (`@roles` on the
 *    resolver), so a regular user could not open their own ticket.
 *  - `ReactoryMySupportTickets` scopes to the caller, so staff could not open a
 *    ticket reported by somebody else.
 *
 * The single-ticket query applies the read rules server-side (`getTicket`
 * semantics) and is reachable by both.
 */
const ticketQuery: Reactory.Forms.IReactoryFormQuery = {
  name: 'ReactorySupportTicketByReference',
  text: `query SupportTicketDetails($reference: String!) {
    ReactorySupportTicketByReference(reference: $reference) {
      id
      request
      description
      status
      priority
      reference
      requestType
      formId
      tags
      slaDeadline
      isOverdue
      createdDate
      updatedDate
      createdBy {
        id
        firstName
        lastName
        email
        avatar
      }
      assignedTo {
        id
        firstName
        lastName
        email
        avatar
      }
      comments {
        id
        text
        when
        upvotes
        downvotes
        favorites
        who {
          id
          firstName
          lastName
          email
          avatar
        }
      }
      documents {
        id
        filename
      }
      triage {
        triagedAt
        triagedBy
        category
        priority
        ownerEmail
        ownerRationale
        followUpRequired
        delegatedPersona
        confidence
        summary
      }
      escalation {
        level
        lastEscalatedAt
        actions
        holdUntil
        history {
          level
          at
          actions
        }
      }
    }
  }`,
  // The route passes the captured splat (`route['*']`) to the mounted form as
  // `ticketReference`; the form engine resolves `props.*` against the props the
  // route supplied.
  variables: {
    'props.ticketReference': 'reference',
  },
  resultType: 'object',
  // The query result *is* the ticket, so each field is mapped into the `ticket`
  // object the uiSchema renders (same contract as WorkflowDetails).
  resultMap: {
    id: 'ticket.id',
    request: 'ticket.request',
    description: 'ticket.description',
    status: 'ticket.status',
    priority: 'ticket.priority',
    reference: 'ticket.reference',
    requestType: 'ticket.requestType',
    formId: 'ticket.formId',
    tags: 'ticket.tags',
    slaDeadline: 'ticket.slaDeadline',
    isOverdue: 'ticket.isOverdue',
    createdDate: 'ticket.createdDate',
    updatedDate: 'ticket.updatedDate',
    createdBy: 'ticket.createdBy',
    assignedTo: 'ticket.assignedTo',
    comments: 'ticket.comments',
    documents: 'ticket.documents',
    triage: 'ticket.triage',
    escalation: 'ticket.escalation',
  },
};

const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: ticketQuery,
};

export default graphql;
