import Lasec360Api from '@reactory/server-core/modules/lasec/api';
import logger from '@reactory/server-core/logging';
import User from '@reactory/server-core/application/admin/User';
import { Reactory } from '@reactory/server-core/types/reactory';
import ApiError from '@reactory/server-core/exceptions';

export default {
  Query: {

  },
  Mutation: {
    async Lasec360Authenticate(parent: any, { username, password }: any,
      context: Reactory.IReactoryContext): Promise<any> {
      try {
        const loginResult = await Lasec360Api.Authentication.login(username, password, context).then();
        logger.debug('Login result after authenticating with lasec360', { loginResult });
        if (context.user.setAuthentication && loginResult) {
          await context.user.setAuthentication({
            provider: 'lasec',
            props: {
              username,
              password,
              ...loginResult,
              lastStatus: 200,
            },
            lastLogin: new Date().valueOf(),
          }).then();

          return {
            success: true,
            message: 'You have been authenticated and logged in with Lasec 360',
          };
        }

        throw new ApiError('Could not authenticate');
      } catch (loginError) {
        return {
          success: false,
          message: `Lasec 360 Authentication Error ${loginError.message}`,
          error: loginError,
        };
      }
    },
    Lasec360RemoveAuthentication: async (parent, { email = '' }, context) => {
      try {
        if (email === '') await context.user.removeAuthentication('lasec');
        const foundUser = await User.UserModel.findOne({ email }).then();
        if (foundUser) {
          await foundUser.removeAuthentication('lasec').then();
        }

        return {
          success: true,
          message: 'Lasec 360 Authentication has been removed',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Could not remove the Lasec 360 authentication for the user',
          error: loginError,
        };
      }
    },
  },
};
