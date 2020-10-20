import { ObjectID } from 'mongodb';
import logger from '@reactory/server-core/logging';
import ReactoryUserModel from '@reactory/server-core/models/schema/User';

export default {
  Statistic: {
    id: (statistic) => {
      return statistic._id || null;
    },
  },
  StatisticEntry: {
    user: (statisticEntry) => {
      if (ObjectID.isValid(statisticEntry.user)) return ReactoryUserModel.findById(statisticEntry.user);
      if (statisticEntry.user && statisticEntry.user._id) return statisticEntry.user;

      return null;
    },
  },
  Query: {
    CoreGetStatistics: (parent, { filter }) => {
      logger.info('Fetching Statistics', filter);
      return [];
    },
  },
  Mutation: {
    CorePublishStatistics: (parent, { entries }) => {
      logger.info('Publishing Statistics', { entries });      
      return true;
    },
  },
};

