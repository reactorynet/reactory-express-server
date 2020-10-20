import mongoose, { Schema, MongooseDocument, Model, Document } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';
import { ObjectID } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory';
import Hash from 'utils/hash';

export type ReactoryFileModel = Model<Reactory.IReactoryFileModel>;

const ReactoryFileSchema: Schema<Reactory.IReactoryFileModel> = new Schema<Reactory.IReactoryFileModel>({
  id: ObjectId,
  hash: Number,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  ttl: Number,
  path: String,
  alias: String,
  filename: String,
  alt: [String],
  link: String,
  mimetype: String,
  size: Number,
  uploadContext: {
    type: String,
    default: 'none',
  },
  created: Date,
  uploadedBy:  {
    type: ObjectId,
    ref: 'User',
  },
  owner:  {
    type: ObjectId,
    ref: 'User',
  },
  public: {
    type: Boolean, 
    default: false
  },
  published: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
    default: []
  }
});



ReactoryFileSchema.statics.getItem = async (link: string): Promise<Reactory.IReactoryFileModel> => {
  
  
  
  return null;
};

ReactoryFileSchema.statics.setItem = async (link: string, file: Reactory.IReactoryFileModel, partner: Reactory.IPartner): Promise<Reactory.IReactoryFileModel> => {
  
  return null;
};


ReactoryFileSchema.statics.clean = function Clean() {

  const now = moment().valueOf();
  try {
    this.deleteMany({ ttl: { $lt: now }}, (err: Error)=>{
      if(err) {
        logger.error(`Could not clean cache - deleteMany({}) fail: ${err ? err.message : 'No Error Message'}`, err);   
      }
      logger.debug(`ReactoryFile Cleared `, now)
    });
  } catch (err) {
    logger.error(`Could not clean cache: ${err ? err.message : 'No Error Message'}`, err);   
    //not critical, don't retrhow
  }
  
};

const ReactoryFileModel: ReactoryFileModel = mongoose.model<Reactory.IReactoryFileModel>('ReactoryFile', ReactoryFileSchema);

export default ReactoryFileModel;