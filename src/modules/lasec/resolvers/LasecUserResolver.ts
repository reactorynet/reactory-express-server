
import logger from '@reactory/server-core/logging';
import { IObjectSchema } from '@reactory/server/core/schema';

import { Quote, QuoteReminder } from '../schema/Quote';

interface Lasec360User {
  id: String
  code: String
  repId: String
  firstName: String
  lastName: String
  email: String
  roles: [ String ]
  target: Number
  targetPercent: Number
}

interface Lasec360UserSearch {
  repIds: [ String ]
  emails: [ String ]
}

interface DateRange {
  startDate: Date
  endDate: Date
}

interface LasecNextActionsFilter {
  dateRange?: DateRange
  actioned?: Boolean
  actionType: String  
}

export default {  
  Query: {
    LasecGetRemoteUsers: async () => {
      logger.debug(`LasecSalesTeams() ${global.user.fullName()}`);
      
      return [];      
    },
    LasecGetRemoteUser: async (obj, params: any) => {      
      const search: Lasec360User = params.search;
      logger.debug(`LasecSalesTeams() ${ search } ${global.user.fullName()}`);
      let userResult: Lasec360User = null;
      
      
      return userResult;
    },
    LasecGetUserNextActions: async (obj, params: any): Promise<IObjectSchema> => {
      const id: String = params.id;
      const filter: LasecNextActionsFilter = params.filter || { actioned: false };
      return QuoteReminder.find({}).then()      
    }
  },
  Mutation: {
    LasecSyncRemoteUserData:async ({ search: Lasec360UserSearch }) => {

      
    }
  }
};
