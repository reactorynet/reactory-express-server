import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';

export interface IReactorySupportTicketDocument extends MongooseDocument {
  id: any,
  key: string,
  partner: any,
  ttl: number,
  item: any | any[],
};

export interface IReactorySupportTicketDocumentStatics {
  new(): ReactorySupportTicket
}

export type ReactorySupportTicket = IReactorySupportTicketDocument & IReactorySupportTicketDocumentStatics;

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
  status: String,
  reference: String,
  createdBy: {
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