import mongoose from 'mongoose';
import time from '@reactory/server-core/models/plugins/time'

const { ObjectId } = mongoose.Schema.Types;

const Statistic = new mongoose.Schema({
  id: ObjectId,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  key: String,
  stat: {},
  when: Date,
});

Statistic.plugin(time);

export const StatisticModel = mongoose.model('Statistic', Statistic);

const StatisticsPackage = new mongoose.Schema({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  statistics: [{
    type: ObjectId,
    ref: 'Statistic',
  }],
  processor: String,
  processed: Boolean,
  expires: Date
});

StatisticsPackage.plugin(time)

const StatisticPackage = mongoose.model('StatisticsPackage', StatisticsPackage);
export default StatisticPackage;
