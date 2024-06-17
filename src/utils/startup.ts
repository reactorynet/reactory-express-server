'use strict'
import logger from '@reactory/server-core/logging';
import { startServices } from '@reactory/server-core/services';
import Reactory from '@reactory/reactory-core';
import ReactoryContextProvider from 'context/ReactoryContextProvider';

const startup = async (): Promise<Reactory.Server.IReactoryContext> => {
  logger.info('Startup process initiated.');

  try {
    const start = new Date().valueOf();
    let context = await ReactoryContextProvider(null).then();
    await startServices({}, context);
    logger.info(`Startup Completed in ${(new Date().valueOf() - start) / 1000} seconds`);
    return context;
  } catch (startupError) {
    logger.error('Could not initialize the system correctly. Fatal errors.', startupError);
    throw startupError;
  }
};

export default startup;
