import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

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

CacheSchema.statics.getItem = async (cacheKey) => {
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

CacheSchema.statics.setItem = async (cacheKey, item, ttl) => {
  return new CacheModel({
    partner: global.partner._id,
    key: cacheKey,
    item,
    ttl: (new Date().valueOf()) + ((ttl || 60) * 1000),
  }).save().then();
};


const CacheModel = mongoose.model('Cache', CacheSchema);

export default CacheModel;