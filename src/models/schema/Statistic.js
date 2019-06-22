import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const Statistic = mongoose.Schema({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  statistics: {},
}, { timestamp: true });

const StatisticModel = mongoose.model('Scale', Statistic);
export default StatisticModel;
