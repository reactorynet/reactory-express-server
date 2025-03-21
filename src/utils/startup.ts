'use strict'
import logger from '@reactory/server-core/logging';
import { startServices } from '@reactory/server-core/services';
import Reactory from '@reactory/reactory-core';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';

const startup = async (): Promise<Reactory.Server.IReactoryContext> => {
  logger.info('Startup process initiated.');
  const {
    REACTORY_APPLICATION_EMAIL = 'reactory@localhost',
    REACTORY_APPLICATION_USER_AUTO_CREATE = 'true',
  } = process.env;
  try {
    const start = new Date().valueOf();
    let context = await ReactoryContextProvider(null).then();
    // we login the system user here to ensure that the system user is available for the rest of the system
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
    let systemUser = await userService.findUserWithEmail(REACTORY_APPLICATION_EMAIL);
    if (!systemUser && REACTORY_APPLICATION_USER_AUTO_CREATE !== 'true') {
      context.error(`System user not found. Cannot continue startup process. 
        Use the bin/cli.sh InitializeSystemUser command to create the system user.`);
      process.exit(1);
    } else {
      if (!systemUser) {
        context.log('System user not found. Creating system user...', {}, 'info');
        // @ts-ignore
        systemUser = await userService.initializeSystemUser();
      }
    }
    if(await systemUser.validatePassword(process.env.REACTORY_APPLICATION_PASSWORD)===false) {
      throw new Error('System user password is incorrect. Cannot continue startup process.');
    } else {
      context.state.auth_token = await Helpers.generateLoginToken(systemUser);
    };
    context.user = systemUser;
    context.partner = await ReactoryClient.findOne({ key: 'reactory' }).exec();
    await startServices({}, context);
    logger.info(`Startup Completed in ${(new Date().valueOf() - start) / 1000} seconds`);
    return context;
  } catch (startupError) {
    logger.error('Could not initialize the system correctly. Fatal errors.', startupError);
    throw startupError;
  }
};

export default startup;
