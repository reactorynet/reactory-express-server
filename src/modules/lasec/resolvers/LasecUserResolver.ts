
import logger from '@reactory/server-core/logging';
import { isEmpty } from 'lodash';
import { IObjectSchema } from '@reactory/server/core/schema';
import LasecApi from '@reactory/server-modules/lasec/api';
import { User } from "@reactory/server-core/models";
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
    LasecGetRemoteUsers: async (pbj: any, params: Lasec360UserSearch) => {
      logger.debug(`LasecGetRemoteUsers() ${global.user.fullName()}`);
      
      return LasecApi.User.getLasecUsers(params.repIds, "staff_user_id")                  
    },
    LasecGetRemoteUser: async (obj, params: any) => {      
      const search: Lasec360User = params.search;
      logger.debug(`LasecGetRemoteUser() ${ search } ${global.user.fullName()}`);
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
    LasecSyncRemoteUserData: async ({ search: Lasec360UserSearch }) => {

      
    },
    LasecReset360Credentials: async (object: any, params: any ): Promise<boolean> => {
      logger.debug(`Resetting credetials`, { params })
      if(isEmpty(params.email) === true) {
        //we have no user email, use loged in user
        return user.removeAuthentication("lasec");
      } else {
        const foundUser: Reactory.IUser = await User.findOne({ email: params.email }).then();
        if(foundUser) {
          logger.debug(`Found user`, { fullName: foundUser.fullName(false) })
          return foundUser.removeAuthentication("lasec");          
        }
        return false;
      }
    }
  }
};
