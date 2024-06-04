'use strict'
// @ts-ignore
import dotenv from 'dotenv';
import { ReactoryServer } from '@reactory/server-core/express/server';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import { start as StartProtoServer } from '@reactory/server-core/reactory/proto/ProtoServer';

import logger from '@reactory/server-core/logging';

dotenv.config();

// by default gRPC is enabled unless explicitly disabled
const { GRPC_ENABLED } = process.env;

if (GRPC_ENABLED === 'true') {
  logger.info('gRPC is enabled.');
  // Start the gRPC server
  ReactoryContextProvider(null, null).then((context: Reactory.Server.IReactoryContext) => {
    StartProtoServer([], context);
  }).catch((err) => { 
    logger.error(`Failed to start gRPC server. (${err.message})`, err);
  });
}


// Start the Reactory Express Server
// Express server is always started regardless of gRPC status
ReactoryServer().then((result: any) => {
  logger.info(`Reactory Server started.`);
}).catch((err) => {
  logger.error(`Reactory Server startup failed. (${err.message})`, err);
});