'use strict'
import logger from '@reactory/server-core/logging';
import { startServices } from '@reactory/server-core/services';
import Reactory from '@reactorynet/reactory-core';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import { publishClientEnvFiles } from '@reactory/server-core/utils/publishClientEnvFiles';
import User from '@reactory/server-modules/reactory-core/models/User';
const startup = async (): Promise<Reactory.Server.IReactoryContext> => {
  logger.info('Startup process initiated.');
  const {
    REACTORY_APPLICATION_EMAIL = 'reactory@localhost',
    REACTORY_APPLICATION_USER_AUTO_CREATE = 'true',
  } = process.env;
  try {
    const start = new Date().valueOf();
    let context = await ReactoryContextProvider(null).then();
    let systemUser = await User.findOne({ email: REACTORY_APPLICATION_EMAIL }).exec();
    if (!systemUser && REACTORY_APPLICATION_USER_AUTO_CREATE !== 'true') {
      context.error(`System user not found. Cannot continue startup process. 
        Use the bin/cli.sh InitializeSystemUser command to create the system user.`);
      process.exit(1);
    } else {
      if (!systemUser) {
        context.log('System user not found. Creating system user...', {}, 'info');
        // @ts-ignore
        const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
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

    // Synchronize enabled client configs (routes, menus, settings, themes)
    // into the database. Without this, config files drift from the persisted
    // ReactoryClient/Menu documents — clients were previously only upserted
    // on first creation (CLI init), so menu changes never reached the UI.
    // Disable with REACTORY_SYNC_CLIENT_CONFIGS=false.
    if (
      process.env.REACTORY_SYNC_CLIENT_CONFIGS !== 'false' &&
      context.state.isClientConfigurationMaster === true
    ) {
      try {
        // Deferred import: loading the client configs triggers env interpolation.
        const { clients: clientConfigs } = await import('@reactory/server-core/data');
        for (const clientConfig of clientConfigs as Reactory.Server.IReactoryClientConfig[]) {
          try {
            // @ts-ignore upsertFromConfig is a model static
            await ReactoryClient.upsertFromConfig(clientConfig, context);
            logger.debug(`Client config synchronized: ${clientConfig.key}`);
          } catch (clientError) {
            logger.warn(`Failed to synchronize client config '${clientConfig.key}'`, clientError);
          }
        }
        logger.info(`Synchronized ${(clientConfigs as unknown[]).length} client config(s) to the database`);
      } catch (syncError) {
        logger.warn('Client config synchronization failed', syncError);
      }
    } else if (process.env.REACTORY_SYNC_CLIENT_CONFIGS !== 'false') {
      logger.info('Skipping client config synchronization because this pod is not the startup master');
    }
        
    // Publish client env files if REACTORY_CLIENT is set
    if (process.env.REACTORY_CLIENT) {
      try {
        const envResult = await publishClientEnvFiles();
        if (envResult.published.length > 0) {
          logger.info(`Published env files for ${envResult.published.length} client(s): ${envResult.published.join(', ')}`);
        }
        if (envResult.failed.length > 0) {
          logger.warn(`Failed to publish env files for ${envResult.failed.length} client(s): ${envResult.failed.map(f => f.key).join(', ')}`);
        }
      } catch (envError) {
        logger.warn('Could not publish client env files', envError);
      }
    }
    (global as any).REACTORY_SYSTEM_CONTEXT = context;
    logger.info(`Startup Completed in ${(new Date().valueOf() - start) / 1000} seconds`);
    return context;
  } catch (startupError) {
    logger.error('Could not initialize the system correctly. Fatal errors.', startupError);
    throw startupError;
  }
};

export default startup;
