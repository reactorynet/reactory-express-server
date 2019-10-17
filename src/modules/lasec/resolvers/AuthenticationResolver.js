import Lasec360Api from "../api";
import logger from '../../../logging';
import User from "../../../application/admin/User";

export default {
  Query: {

  },
  Mutation: {
    Lasec360Authenticate: async (parent, { username, password }) => {
      try {
        const loginResult = await Lasec360Api.Authentication.login(username, password).then();
        logger.debug('Login result after authenticating with lasec360', { loginResult });
        if (global.user.setAuthentication && loginResult) {          
          await global.user.setAuthentication({ 
            provider: 'lasec', 
            props: { 
              username, password, ...loginResult,
              lastStatus: 200, 
            }, 
            lastLogin: new Date().valueOf() }).then();
          return {
            success: true,
            message: 'You have been authenticated and logged in with Lasec 360',
          };
        }
      } catch (loginError) {
        return {
          success: false,
          message: `Lasec 360 Authentication Error ${loginError.message}`,
          error: loginError
        };
      }
    },
    Lasec360RemoveAuthentication: async(parent, { email = '' }) => {
      try {
        if(email === '') await global.user.removeAuthentication('lasec');
        const foundUser = await User.UserModel.findOne({ email }).then();
        if(foundUser) {
          await foundUser.removeAuthentication('lasec').then();
        }

        return {
          success: true,
          message: 'Lasec 360 Authentication has been removed',
        }
      } catch (error) {
        return {
          success: false,
          message: `Could not remove the Lasec 360 authentication for the user`,
          error: loginError
        };
      }
    }
  }
};