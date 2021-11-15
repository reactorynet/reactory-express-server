import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';
import { Reactory } from 'types/reactory';

export interface ICache extends MongooseDocument {
  id: any,
  key: string,
  partner: any,
  ttl: number,
  item: any | any[],
};

export interface ICacheStatic {
  new(): Cache
  getItem(cacheKey: string, includeKey: boolean): Promise<Cache>
  setItem(cacheKey: string, item: any | any[], partner: any): void
  clean(): void
}

export type Cache = ICache & ICacheStatic;

const CacheSchema: Schema<Cache> = new Schema<Cache>({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  ttl: Number,
  item: {},
});

CacheSchema.statics.getItem = async function getItem(cacheKey: string, includeKey: boolean = false, context: Reactory.IReactoryContext) {
  let cached = await this.findOne({ key: cacheKey, partner: context.partner._id }).then();

  if (cached !== null && typeof cached === 'object' && cached.ttl) {
    if (moment(cached.ttl).isBefore(moment(), 'milliseconds')) {
      cached.remove();
      return null;
    } else {
      if (includeKey === true) {

        return {
          key: cacheKey,
          item: cached.item
        };

      } else {
        return cached.item;
      }
    }
  }

  return null;
};

CacheSchema.statics.setItem = async (cacheKey: string, item: any | any[], ttl: number, partner: any) => {
  return new CacheModel({
    partner: partner ? partner._id : null,
    key: cacheKey,
    item,
    ttl: (new Date().valueOf()) + ((ttl || 60) * 1000),
  }).save().then();
};


CacheSchema.statics.clean = function Clean() {

  const now = moment().valueOf();
  try {
    this.deleteMany({ ttl: { $lt: now } }, (err: Error) => {
      if (err) {
        logger.error(`Could not clean cache - deleteMany({}) fail: ${err ? err.message : 'No Error Message'}`, err);
      }
      logger.debug(`Cache Cleared `, now)
    });
  } catch (err) {
    logger.error(`Could not clean cache: ${err ? err.message : 'No Error Message'}`, err);
    //not critical, don't retrhow
  }

};

const CacheModel = mongoose.model<Cache>('Cache', CacheSchema);

export default CacheModel;