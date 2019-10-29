import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';

const CacheSchema = mongoose.Schema({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  ttl: Number,
  item: {},  
});

CacheSchema.statics.getItem = async function getItem(cacheKey) {
  let cached = await this.findOne({ key: cacheKey, partner: global.partner._id }).then();

  if(cached !== null && typeof cached === 'object' && cached.ttl) {
    if(moment(cached.ttl).isBefore(moment(), 'milliseconds')) {
      cached.remove();
      return null;
    } else {
      return cached.item;
    } 
  }

  return null;
};

CacheSchema.statics.setItem = async (cacheKey, item, ttl, partner) => {
  return new CacheModel({
    partner: partner ? partner._id : global.partner._id,
    key: cacheKey,
    item,
    ttl: (new Date().valueOf()) + ((ttl || 60) * 1000),
  }).save().then();
};


CacheSchema.statics.clean = function Clean() {

  const now = moment().valueOf();
  try {
    this.deleteMany({ ttl: { $lt: now }}, (err)=>{
      if(err) {
        logger.error(`Could not clean cache - deleteMany({}) fail: ${err ? err.message : 'No Error Message'}`, err);   
      }
      logger.debug(`Cache Cleared `, now)
    });
  } catch (err) {
    logger.error(`Could not clean cache: ${err ? err.message : 'No Error Message'}`, err);   
    //not critical, don't retrhow
  }
  
};

const CacheModel = mongoose.model('Cache', CacheSchema);

export default CacheModel;