import mongoose, { Schema } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';
import { MetaSchema } from './shared'
export interface IReactorySupportTicketDocumentStatics {
  new(): ReactorySupportTicket
}

export type ReactorySupportTicket = Reactory.Models.IReactorySupportTicketDocument & IReactorySupportTicketDocumentStatics;

const SupportTicketSchema: Schema<ReactorySupportTicket> = new Schema<ReactorySupportTicket>({
  id: ObjectId,
  partner: {
    type: ObjectId,
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
  requestType: String,
  status: {
    type: String,
    required: true,
    default: 'open',
  },
  reference: String,
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  assignedTo: {
    type: ObjectId,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    default: () => { return new Date() }    
  },
  updatedDate: {
    type: Date,
    default: () => { return new Date() }
  },
  updatedBy: {
    type: ObjectId, 
    ref: 'User'
  },
  meta: MetaSchema,
  comments: [{
    type: ObjectId,
    ref: 'Comment',
  }],
  documents: [
    {
      tite: String,
      file: {
        type: ObjectId,
        ref: 'ReactoryFile',
      }
    }
  ]
});

const ReactorySupportTicketModel = mongoose.model<Schema<ReactorySupportTicket>>('ReactorySupportTicket', SupportTicketSchema, 'reactory_support_tickets');

export default ReactorySupportTicketModel;