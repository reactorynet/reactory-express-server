'use strict'
// @ts-ignore
import dotenv from 'dotenv';
import { ReactoryServer } from '@reactory/server-core/express/server';
import logger from '@reactory/server-core/logging';

dotenv.config();

ReactoryServer({}).then((result: any) => {
  logger.info(`Reactory Server started.`, result);
}).catch((err) => {
  logger.error(`Reactory Server startup failed. (${err.message})`, err);
});