import mongoose, { Schema, MongooseDocument, Model, Document } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import crypto from 'crypto';
import fs from 'fs';

import moment from 'moment';
import path from 'path';
import { ObjectID } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory';
import Hash from '@reactory/server-core/utils/hash';
import ApiError from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import { RecordNotFoundError } from '@reactory/server-core/exceptions';

export type ReactoryFileModel = Model<Reactory.IReactoryFileModel>;

const {
  CDN_ROOT,
} = process.env;

const ReactoryFileSchema: Schema<Reactory.IReactoryFileModel> = new Schema<Reactory.IReactoryFileModel>({
  id: ObjectId,
  hash: Number,
  checksum: String,
  algo: {
    type: String,
    default: 'sha1'
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
      modified: Date,
    }
  ],
  timeline: [
    {
      timestamp: Number,
      message: String,
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
  status: {
    type: String,
    default: 'created',
  },
  tags: {
    type: [String],
    default: [],
  }
});

ReactoryFileSchema.statics.getItem = async (link: string): Promise<Reactory.IReactoryFileModel> => {
  return null;
};

// eslint-disable-next-line max-len
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
  }
};

// eslint-disable-next-line max-len
ReactoryFileSchema.methods.createChecksum = async (): Promise<string> => {
  const file: Reactory.IReactoryFileModel = this;
  return new Promise<string>((resolve, reject) => {


    try {
      const $file = fs.createReadStream(file.path);
      const hash = crypto.createHash(file.algo);
      hash.setEncoding('hex');

      $file.on('end', () => {
        hash.end();
        resolve(hash.read()); // the desired sha1sum
      });

      // read all file and pipe it (write it) to the hash object
      $file.pipe(hash);
    } catch (failure) {
      logger.error('🚨 Error generating checksum');
      reject(new ApiError(`Unable to process checksum for ${file.path}\n:${failure.message}`))
    }
  });
};

ReactoryFileSchema.methods.stats = function stats() {
  const file: Reactory.IReactoryFileModel = this;
  const $path = path.join(process.env.APP_DATA_ROOT, file.path, file.alias);
  if (fs.existsSync($path) === false) {
    logger.error(`Cannot read lines for file ${$path}. File does not exist.`);
    throw new RecordNotFoundError(`The file ${$path} does not exist.`);
  }

  const fstats = fs.statSync($path);

  return fstats;
};

// eslint-disable-next-line max-len
ReactoryFileSchema.methods.lineCount = async function lineCount() {
  const LINE_FEED = '\n'.charCodeAt(0);
  const file: Reactory.IReactoryFileModel = this;
  const $path = path.join(process.env.APP_DATA_ROOT, file.path, file.alias);

  if (fs.existsSync($path) === false) {
    logger.error(`Cannot read lines for file ${$path}. File does not exist.`);
    throw new RecordNotFoundError(`The file ${$path} does not exist.`);
  }

  return new Promise((resolve, reject) => {
    let lineCount = -1;
    fs.createReadStream($path)
      .on("data", (buffer) => {
        let idx = -1;
        // lineCount--; // Because the loop will run once for idx=-1        
        do {
          idx = buffer.indexOf(LINE_FEED, idx + 1);
          lineCount++;
        } while (idx !== -1);
      }).on("end", () => {
        resolve(lineCount);
      }).on("error", reject);
  });
};

ReactoryFileSchema.methods.getServerFilename = function getServerFilename() {
  const file: Reactory.IReactoryFileModel = this;
  return path.join(process.env.APP_DATA_ROOT, file.path, file.alias);
}

ReactoryFileSchema.methods.readLines = async function readLines(start: number = 0, rows: number = -1): Promise<string[]> {

  const file: Reactory.IReactoryFileModel = this;
  const $path = path.join(process.env.APP_DATA_ROOT, file.path, file.alias);
  if (fs.existsSync($path) === false) {
    logger.error(`Cannot read lines for file ${$path}. File does not exist.`);
    throw new RecordNotFoundError(`The file ${$path} does not exist.`);
  }

  const fstats = fs.statSync($path);

  if (fstats.size === 0) return [];

  const LINE_FEED = '\n'.charCodeAt(0);

  return new Promise<string[]>((resolve, reject) => {

    const rs = fs.createReadStream($path, { encoding: 'utf8' });

    const lines: string[] = [];
    let linesRead = 0;
    let acc = '';
    let pos = 0;
    let index = -1;
    let bytesread = 0
    rs.on('data', (buffer) => {
      //get the first index
      index = buffer.indexOf(LINE_FEED);
      acc += buffer;
      bytesread += buffer.length;



      //no newline characters
      if (index === -1) {
        //we've reached the end of the file and no more newline chars available
        ;
        rs.close();
      } else {

        if (index >= 0) {
          let parts = acc.split('\n');

          do {
            lines.push(parts[0]);
            if (parts.length > 1) {
              parts = parts.slice(1, parts.length);
            }
            linesRead += 1;
          } while (parts.length > 0)


          // acc = parts[0];

          // if (linesRead >= start && lines.length < rows) {
          //   lines.push(parts[0]);
          //   
          //   if (lines.length === rows) {
          //     rs.close();
          //   }
          // }
          // index = -1;
        }

      }

      if (bytesread === fstats.size) rs.close();


    }).on('close', () => {

      // 
      // const parts = acc.split(acc.split('\n'));
      // acc = parts[1];
      // lines.push(parts[0]);
      ;

      resolve(lines);
    }).on('error', (err) => {
      reject(err);
    });
  });
};


const ReactoryFile: ReactoryFileModel = mongoose.model<Reactory.IReactoryFileModel>('ReactoryFile', ReactoryFileSchema);

export default ReactoryFile;
