import mongoose from 'mongoose';
import moment from 'moment';
import logger from '@reactory/server-core/logging';

const { ObjectId } = mongoose.Schema.Types;
const LasecCacheSchema = mongoose.Schema({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  ttl: Number,
  item: {},  
});

LasecCacheSchema.statics.clean = function Clean() {

  const now = moment().valueOf();
  try {
    this.deleteMany({ ttl: { $lt: now }}, (err)=>{
      if(err) {
        logger.error(`Could not clean cache - deleteMany({}) fail: ${err ? err.message : 'No Error Message'}`, err);   
      }
      logger.debug(`Lasec Cached Cleared `, now);
    });
  } catch (err) {
    logger.error(`Could not clean Lasec cache: ${err ? err.message : 'No Error Message'}`, err);   
  }
  
};

const LasecCacheModel = mongoose.model('LasecCache', LasecCacheSchema);

export default LasecCacheModel;
