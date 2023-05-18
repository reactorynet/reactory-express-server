import { ObjectID } from 'mongodb';
import ReactoryUserModel from '@reactory/server-modules/core/models/User';

export default {
  Statistic: {
    id: (statistic) => {
      return statistic._id || null;
    },
  },
  StatisticsPackage: {
    user: (statisticEntry) => {
      if (ObjectID.isValid(statisticEntry.user)) return ReactoryUserModel.findById(statisticEntry.user);
      if (statisticEntry.user && statisticEntry.user._id) return statisticEntry.user;

      return null;
    },
  },
  Query: {
    CoreGetStatistics: (parent, { filter }) => {
      return [];
    },
  },
  Mutation: {
    CorePublishStatistics: (parent, { entries }) => {
      return true;
    },
  },
};

