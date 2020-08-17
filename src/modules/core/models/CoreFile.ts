import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';
import { ObjectID } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory';
import Hash from 'utils/hash';


export interface IReactoryFilePermissions {
  id: ObjectID,
  roles: string[]
  partnersIncluded?: ObjectID[],
  partnersExcluded?: ObjectID[],
  usersIndcluded?: ObjectID[],
  usersExcluded?: ObjectID[]
}

export interface IReactoryFile extends MongooseDocument {
  id: ObjectID,
  hash: number,
  partner: ObjectID,
  ttl?: number,
  path: String,
  alias: String,
  filename: string,
  alt: string[],
  link: string,
  mimetype: string,
  size: number,
  uploadContext?: String,
  uploadedBy: ObjectID,
  owner: ObjectID,
  public?: Boolean,
  published?: Boolean,
  permissions?: IReactoryFilePermissions[],
  tags?: String[] 
};

export interface IReactoryFileStatic {
  new(): ReactoryFile
  getItem( link: string ): Promise<ReactoryFile>
  setItem( link: string, file: IReactoryFile ): void
  clean(): void
}

export type ReactoryFile = IReactoryFile & IReactoryFileStatic;

const ReactoryFileSchema: Schema<ReactoryFile> = new Schema<ReactoryFile>({
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



ReactoryFileSchema.statics.getItem = async (link: string): Promise<IReactoryFile> => {
  
  
  
  return null;
};

ReactoryFileSchema.statics.setItem = async (link: string, file: IReactoryFile, partner: Reactory.IPartner): Promise<IReactoryFile> => {
  
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

const ReactoryFileModel = mongoose.model('ReactoryFile', ReactoryFileSchema);

export default ReactoryFileModel;