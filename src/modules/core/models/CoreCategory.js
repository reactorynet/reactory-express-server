import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';

const CoreCategorySchema = mongoose.Schema({
  id: ObjectId,
  parentId: {
    type: ObjectId,
    ref: 'CoreCategory'
  },
  children: [ {
    type: ObjectId,
    ref: 'CoreCategory'
  }],
  items: [ {} ],
  linkType: String, //ObjectId, string, number
  linkTarget: String, //LasecProduct, $foreign
  foreignResolver: String, //componentFqn
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  name: String,
  description: String,
});

CoreCategorySchema.statics.getItem = async function getItem(cacheKey) {
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

CoreCategorySchema.statics.setItem = async (cacheKey, item, ttl, partner) => {
  return new CacheModel({
    partner: partner ? partner._id : global.partner._id,
    key: cacheKey,
    item,
    ttl: (new Date().valueOf()) + ((ttl || 60) * 1000),
  }).save().then();
};



const CoreCategoryModel = mongoose.model('CoreCategory', CoreCategorySchema);

export default CoreCategoryModel;
