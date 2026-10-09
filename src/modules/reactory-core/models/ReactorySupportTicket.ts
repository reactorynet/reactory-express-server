import mongoose, { Schema } from 'mongoose';
import Reactory from '@reactorynet/reactory-core';
import { MetaSchema } from './shared'

export type ReactorySupportTicketDocument = Reactory.Models.IReactorySupportTicketDocument;

/**
 * Ticket TRIAGE bookkeeping (first-class, typed).
 *
 * Previously stamped into the unstructured `meta` subdocument, which silently
 * dropped the unknown paths under mongoose strict mode. Promoting it to a real
 * schema path means normal writes work, the field is queryable/indexable, and it
 * is discoverable in the model, GraphQL type and form schema.
 */
const SupportTicketTriageSchema = new Schema({
  /** When the AI triage turn completed. Presence marks the ticket as triaged. */
  triagedAt: Date,
  /** Who/what triaged it (persona id, or a user id). */
  triagedBy: String,
  /** Classified category (mirrors requestType). */
  category: String,
  /** Priority the triage applied. */
  priority: String,
  /** Owner user id the triage assigned. */
  assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  /** Owner email resolved from support-routing.yaml (audit aid). */
  ownerEmail: String,
  /** Why that owner/priority was chosen. */
  ownerRationale: String,
  /** Whether the triage flagged follow-up work. */
  followUpRequired: Boolean,
  /** Specialised persona consulted, if any. */
  delegatedPersona: String,
  /** Model confidence (0–1) where reported. */
  confidence: Number,
  /** Short triage summary. */
  summary: String,
}, { _id: false });

/**
 * Ticket ESCALATION bookkeeping (first-class, typed).
 *
 * Tracks the current SLA escalation level, when it last escalated, the actions
 * applied, any explicit hold, and an append-only history of escalation steps.
 */
const SupportTicketEscalationEntrySchema = new Schema({
  level: Number,
  at: Date,
  actions: [String],
}, { _id: false });

const SupportTicketEscalationSchema = new Schema({
  /** Current escalation level (0/undefined = not escalated). */
  level: Number,
  /** When the ticket was last escalated. */
  lastEscalatedAt: Date,
  /** Actions applied at the last escalation (comment/notify/tag/bumpPriority/reassign). */
  actions: [String],
  /** Explicit hold: escalation is skipped until this instant. */
  holdUntil: Date,
  /** Snapshot of the escalation policy in force when last escalated. */
  policy: Schema.Types.Mixed,
  /** Append-only escalation trail. */
  history: [SupportTicketEscalationEntrySchema],
}, { _id: false });

/** Schema document type: the core ticket plus the first-class workflow fields. */
type SupportTicketSchemaType = Reactory.Models.IReactorySupportTicket & {
  triage?: Record<string, any>;
  escalation?: Record<string, any>;
};

const SupportTicketSchema = new Schema<SupportTicketSchemaType>({
  partner: {
    type: Schema.Types.ObjectId,
    ref: 'ReactoryClient',
  },
  request: {
    type: String,
    required: true,
    default: 'New request'
  },
  description: {
    type: String
  },
  formId: String,
  requestType: {
    type: String,
    default: 'general'
  },
  status: {
    type: String,
    required: true,
    default: 'open',
  },
  priority: {
    type: String,
    default: 'medium'
  },
  reference: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reportedDate: {
    type: Date,
    default: () => new Date()
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    default: () => new Date()
  },
  updatedDate: {
    type: Date,
    default: () => new Date()
  },
  updatedBy: {
    type: Schema.Types.ObjectId, 
    ref: 'User'
  },
  meta: MetaSchema,
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  tags: {
    type: [String],
    default: []
  },
  slaDeadline: Date,
  documents: [{
    type: Schema.Types.ObjectId,
    ref: 'ReactoryFile',
  }],
  // First-class workflow bookkeeping (see the sub-schemas above).
  triage: SupportTicketTriageSchema,
  escalation: SupportTicketEscalationSchema
}, {
  timestamps: {
    createdAt: 'createdDate',
    updatedAt: 'updatedDate'
  }
});

// Virtual field for computed isOverdue property
SupportTicketSchema.virtual('isOverdue').get(function(this: Reactory.Models.IReactorySupportTicket) {
  if (!this.slaDeadline) return false;
  return new Date() > new Date(this.slaDeadline);
});

// Ensure virtuals are included when converting to JSON/Object
SupportTicketSchema.set('toJSON', { virtuals: true });
SupportTicketSchema.set('toObject', { virtuals: true });

const ReactorySupportTicketModel = mongoose.model<SupportTicketSchemaType>('ReactorySupportTicket', SupportTicketSchema, 'reactory_support_tickets');

export default ReactorySupportTicketModel;