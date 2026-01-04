import mongoose, { Schema } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { MetaSchema } from './shared'

export type ReactorySupportTicketDocument = Reactory.Models.IReactorySupportTicketDocument;

const SupportTicketSchema = new Schema<Reactory.Models.IReactorySupportTicket>({
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
  }]
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

const ReactorySupportTicketModel = mongoose.model<Reactory.Models.IReactorySupportTicket>('ReactorySupportTicket', SupportTicketSchema, 'reactory_support_tickets');

export default ReactorySupportTicketModel;