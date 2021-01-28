import mongoose, { Schema, MongooseDocument, Model, Document } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '@reactory/server-core/logging';
import { ObjectID } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory';
import Hash from '@reactory/server-core/utils/hash';
import fs from 'fs';
import crypto from 'crypto';

export type ReactoryFileModel = Model<Reactory.IReactoryFileModel>;

const ReactoryFileSchema: Schema<Reactory.IReactoryFileModel> = new Schema<Reactory.IReactoryFileModel>({
  id: ObjectId,
  hash: Number,
  checksum: String,
  algo: {
    type: String,
    default: 'md5'
  },
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
  remotes: [
    {
      id: String,
      url: String,
      lastSync: Date,
      success: Boolean,
      verified: { type: Boolean, default: false },
      syncMessage: String,
      priority: { type: Number, default: 0 },
      modified: Date
    }
  ],
  timeline: [
    {
      timestamp: Number,
      message: String
    }
  ],
uploadContext: {
    type: String,
    default: 'none',
  },
  created: Date,
  uploadedBy: {
    type: ObjectId,
    ref: 'User',
  },
  owner: {
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
    this.deleteMany({ ttl: { $lt: now } }, (err: Error) => {
      if (err) {
        logger.error(`Could not clean cache - deleteMany({}) fail: ${err ? err.message : 'No Error Message'}`, err);
      }
      logger.debug(`ReactoryFile Cleared `, now)
    });
  } catch (err) {
    logger.error(`Could not clean cache: ${err ? err.message : 'No Error Message'}`, err);
    //not critical, don't retrhow
  }
};

ReactoryFileSchema.statics.createChecksum = async (file: Reactory.IReactoryFileModel): Promise<string> => {

  return new Promise<string>((resolve, reject) => {
    // the file you want to get the hash    
    var fd = fs.createReadStream(file.path);
    var hash = crypto.createHash('sha1');
    hash.setEncoding('hex');

    fd.on('end', function () {
      hash.end();
      console.log(hash.read()); // the desired sha1sum
    });

    // read all file and pipe it (write it) to the hash object
    fd.pipe(hash);

    return ""

  });
};

const ReactoryFileModel: ReactoryFileModel = mongoose.model<Reactory.IReactoryFileModel>('ReactoryFile', ReactoryFileSchema);

export default ReactoryFileModel;
