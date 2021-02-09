
import logger from '@reactory/server-core/logging';
import { isEmpty } from 'lodash';
import { IObjectSchema } from '@reactory/server/core/schema';
import LasecApi from '@reactory/server-modules/lasec/api';
import { User } from "@reactory/server-core/models";
import { Quote, QuoteReminder } from '../schema/Quote';
import { getLoggedIn360User, setLoggedInUserProps } from './Helpers';
import { Lasec360User } from '../types/lasec';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import { Reactory } from 'types/reactory';





export default {
  Lasec360User: {
    /**
     * "signature":null,
     * "username":"werner.weber@gmail.com",
     * "first_name":"Werner",
     * "surname":"Weber",
     * "email":"werner.weber@gmail.com",
     * "skype_handle":"werner.weber@gmail.com",
     * "direct_number":"",
     * "mobile_number":"",
     * "sales_team_ids":["100"],
     * "sales_team_id":"100",
     * "target":0,
     * "job_title":"Developer",
     * "department":"IT",
     * "id":"335",
     * "user_type":"lasec_sa",
     * "group_ids":[1],
     * "group_names":["default"]
     */
    firstName: (usr: any) => usr.first_name,
    lastName: (usr: any) => usr.first_name,
    repId: (lasec360User: any) => lasec360User.sales_team_id,
    activeCompany: (lasec360User: any) => lasec360User.user_type,
    companyName: (lasec360User: Lasec360User) => {
      switch (lasec360User.user_type) {
        case "lasec_education":
        case "LasecEducation": {
          return 'Lasec Education';
        }
        case "lasec_international":
        case "LasecInternational": {
          return "Lasec International"
        }
        case "lasec_sa":
        case "LasecSA":
        default:
          {
            return 'Lasec SA'
          }
      }
    },
    repCodes: (lasec360User: any) => {
      return lasec360User.sales_team_ids || []
    },

  },
  Query: {
    LasecGetRemoteUsers: async (pbj: any, params: Lasec360UserSearch, context: Reactory.IReactoryContext) => {
      logger.debug(`LasecGetRemoteUsers() ${context.user.fullName()}`);

      return LasecApi.User.getLasecUsers(params.repIds, "staff_user_id", context)
    },
    LasecGetRemoteUser: async (obj, params: any, context: Reactory.IReactoryContext) => {
      const search: Lasec360User = params.search;
      logger.debug(`LasecGetRemoteUser() ${search} ${context.user.fullName()}`);
      let userResult: Lasec360User = null;

      return userResult;
    },
    LasecGetUserNextActions: async (obj, params: any, context: Reactory.IReactoryContext): Promise<IObjectSchema> => {
      const id: String = params.id;
      const filter: LasecNextActionsFilter = params.filter || { actioned: false };
      return QuoteReminder.find({}).then()
    },
    LasecLoggedInUser: async (obj, params: any, context: any, info: any): Promise<Lasec360User> => {
      logger.debug('Query LasecLoggedInUser Called');
      debugger
      return await getLoggedIn360User(false, context).then();
    }
  },
  Mutation: {
    LasecSyncRemoteUserData: async ({ search: Lasec360UserSearch }, context: Reactory.IReactoryContext) => {

    },
    LasecReset360Credentials: async (object: any, params: any, context: Reactory.IReactoryContext): Promise<boolean> => {
      logger.debug(`Resetting credetials`, { params })
      if (isEmpty(params.email) === true) {
        //we have no user email, use loged in user
        return context.user.removeAuthentication("lasec");
      } else {
        const foundUser: Reactory.IUser = await User.findOne({ email: params.email }).then();
        if (foundUser) {
          logger.debug(`Found user`, { fullName: foundUser.fullName(false) })
          return foundUser.removeAuthentication("lasec");
        }
        return false;
      }
    },
    LasecSetMy360: async (parent: any, params: { rep_code: string, active_company: string }, context: Reactory.IReactoryContext) => {
      logger.debug(`Setting Active Company and Rep Code ${params.rep_code} ${params.active_company}`)
      return setLoggedInUserProps(params.rep_code, params.active_company, context);
    }
  }
};
