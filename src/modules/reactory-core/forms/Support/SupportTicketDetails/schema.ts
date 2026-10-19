import Reactory from '@reactorynet/reactory-core';

/**
 * Shape of the single ticket rendered by the details page.
 *
 * The page hands the whole object to `core.SupportTicketDetailPanel@1.0.0`,
 * whose tabs read the ticket fields directly. Declaring them here keeps result
 * mapping/validation honest even though the panel does the rendering.
 */
const ticket: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Support Ticket',
  properties: {
    id: { type: 'string', title: 'ID' },
    reference: { type: 'string', title: 'Reference' },
    request: { type: 'string', title: 'Request' },
    description: { type: 'string', title: 'Description' },
    requestType: { type: 'string', title: 'Request Type' },
    status: { type: 'string', title: 'Status' },
    priority: { type: 'string', title: 'Priority' },
    formId: { type: 'string', title: 'Source Form' },
    tags: { type: 'array', title: 'Tags', items: { type: 'string' } },
    slaDeadline: { type: 'string', title: 'SLA Deadline' },
    isOverdue: { type: 'boolean', title: 'Overdue' },
    createdDate: { type: 'string', title: 'Created' },
    updatedDate: { type: 'string', title: 'Updated' },
    createdBy: {
      type: 'object',
      title: 'Logged By',
      properties: {
        id: { type: 'string', title: 'ID' },
        firstName: { type: 'string', title: 'First Name' },
        lastName: { type: 'string', title: 'Last Name' },
        email: { type: 'string', title: 'Email' },
        avatar: { type: 'string', title: 'Avatar' },
      },
    },
    assignedTo: {
      type: 'object',
      title: 'Assigned To',
      properties: {
        id: { type: 'string', title: 'ID' },
        firstName: { type: 'string', title: 'First Name' },
        lastName: { type: 'string', title: 'Last Name' },
        email: { type: 'string', title: 'Email' },
        avatar: { type: 'string', title: 'Avatar' },
      },
    },
    comments: {
      type: 'array',
      title: 'Comments',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          when: { type: 'string' },
          upvotes: { type: 'number' },
          downvotes: { type: 'number' },
          favorites: { type: 'number' },
        },
      },
    },
    documents: {
      type: 'array',
      title: 'Attachments',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
        },
      },
    },
    triage: {
      type: 'object',
      title: 'Triage',
      properties: {
        triagedAt: { type: 'string' },
        triagedBy: { type: 'string' },
        category: { type: 'string' },
        priority: { type: 'string' },
        ownerEmail: { type: 'string' },
        ownerRationale: { type: 'string' },
        followUpRequired: { type: 'boolean' },
        delegatedPersona: { type: 'string' },
        confidence: { type: 'number' },
        summary: { type: 'string' },
      },
    },
    escalation: {
      type: 'object',
      title: 'Escalation',
      properties: {
        level: { type: 'number' },
        lastEscalatedAt: { type: 'string' },
        actions: { type: 'array', items: { type: 'string' } },
        holdUntil: { type: 'string' },
        history: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'number' },
              at: { type: 'string' },
              actions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
};

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Support Ticket',
  properties: {
    ticket,
  },
};

export default schema;
