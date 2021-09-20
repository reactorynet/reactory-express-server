import express from 'express';
import { isNil } from 'lodash';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-core/models';
import { Reactory } from '@reactory/server-core/types/reactory';

const ReactoryClientFromRequest = async (req: express.Request) => {


  let clientId = req.headers['x-client-key'];
  let clientPwd = req.headers['x-client-pwd'];
  let serverBypass = req.headers['x-reactory-pass'];

  let query = req.query;

  if (isNil(clientId) === true) clientId = req.params['clientId'];
  // @ts-ignore
  if (isNil(clientId) === true) clientId = query['x-client-key'];

  if (isNil(clientPwd) === true) clientPwd = req.params['secret'];
  // @ts-ignore
  if (isNil(clientPwd) === true) clientPwd = query['x-client-pwd'];

  logger.debug(`ReactoryClientAuthenticationMiddleware:: Client key: [${clientId}], Client Token: [${clientPwd}], Original Url: ${req.originalUrl}`, { query: req.query, params: req.params, method: req.method });

  const clientResult: Reactory.IReactoryClientDocument = await ReactoryClient.findOne({ key: clientId }).then();
  if (isNil(clientResult) === false) {
    //@ts-ignore
    if (clientResult.validatePassword(clientPwd) === true) return clientResult;

    if (serverBypass === `${clientResult.password}+${clientResult.salt}`) {
      logger.debug('Validating Server Bypass - Passed');

      if (serverBypass && serverBypass === `${clientResult.password}+${clientResult.salt}`) return clientResult;
    }

    return null;

  }
};

export default ReactoryClientFromRequest;