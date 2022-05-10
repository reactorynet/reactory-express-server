import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
import moment from 'moment';
import Reactory from '@reactory/reactory-core';
import logger from '../../../logging';
import { ObjectId } from 'mongodb';

export interface IReactorySupportTicketDocumentStatics {
  new(): ReactorySupportTicket
}

export type ReactorySupportTicket = Reactory.IReactorySupportTicketDocument & IReactorySupportTicketDocumentStatics;

const StatisticSchema: Schema<ReactorySupportTicket> = new Schema<ReactorySupportTicket>({
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
  meta: {},
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

const ReactorySupportTicketModel = mongoose.model('ReactorySupportTicket', StatisticSchema);

export default ReactorySupportTicketModel;