
import logger from '@reactory/server-core/logging';

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

export default {  
  Query: {
    LasecGetRemoteUsers: async () => {
      logger.debug(`LasecSalesTeams() ${global.user.fullName()}`);
      
      return [];      
    },
    LasecGetRemoteUser: async (obj, { search: Lasec360UserSearch }) => {
      
      logger.debug(`LasecSalesTeams() ${ search } ${global.user.fullName()}`);
      let userResult: Lasec360User = null;
      
      
      return userResult;
    },

  },
  Mutation: {
    LasecSyncRemoteUserData:async ({ search: Lasec360UserSearch }) => {

      
    }
  }
};
