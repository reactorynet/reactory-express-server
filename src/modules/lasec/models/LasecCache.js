import mongoose from 'mongoose';

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

const LasecCacheModel = mongoose.model('LasecCache', LasecCacheSchema);

export default LasecCacheModel;
