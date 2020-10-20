import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

import logger from '../../../logging';

export interface IStatistic extends MongooseDocument {
  id: any,
  key: string,
  partner: any,
  ttl: number,
  item: any | any[], 
};

export interface IStatisticStatics {
  new(): Cache
  getItem( cacheKey: string, includeKey: boolean ): Promise<Cache>
  setItem( cacheKey: string, item: any | any[], partner: any ): void
  clean(): void
}

export type Statistic = IStatistic & IStatisticStatics;

const StatisticSchema: Schema<Statistic> = new Schema<Statistic>({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  user: {
    type: ObjectId,
    ref: 'User',
  },
  ttl: Number,
  item: {},
});

const StatisticModel = mongoose.model('Cache', StatisticSchema);

export default StatisticModel;