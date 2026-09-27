import express from 'express';
import { isNil } from 'lodash';
import logger from '@reactory/server-core/logging';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import Reactory from '@reactorynet/reactory-core';

const ReactoryClientFromRequest = async (req: express.Request) => {
  let clientId = req.headers['x-client-key'];
  let clientPwd = req.headers['x-client-pwd'];
  let serviceKey = req.headers['x-service-key'];
  let clientPublicKey = req.headers['x-client-public-key'];

  let query = req.query;

  if (isNil(clientId) === true) clientId = req.params['clientId'];
  // @ts-ignore
  if (isNil(clientId) === true) clientId = query['x-client-key'];

  if (isNil(clientPwd) === true) clientPwd = req.params['secret'];
  // @ts-ignore
  if (isNil(clientPwd) === true) clientPwd = query['x-client-pwd'];

  // @ts-ignore
  if (isNil(serviceKey) === true) serviceKey = query['x-service-key'];

  // @ts-ignore
  if (isNil(clientPublicKey) === true) clientPublicKey = query['x-client-public-key'];

  logger.debug(
    `ReactoryClientAuthenticationMiddleware:: Client key: [${clientId}], Original Url: ${req.originalUrl}`,
    { query: req.query, params: req.params, method: req.method },
  );

  const clientResult: any = await ReactoryClient.findOne({ key: clientId }).then();
  if (isNil(clientResult) === false) {
    if (clientPwd && (await clientResult.validatePassword(clientPwd)) === true) {
      const origin = (req.headers['origin'] || req.headers['referer'] || '') as string;
      if (origin) {
        logger.warn(
          `[DEPRECATION] Client "${clientId}" is sending secret (x-client-pwd) over browser request (Origin: ${origin}). Migrate to x-client-public-key.`,
        );
      }
      return clientResult;
    }

    if (
      serviceKey &&
      typeof clientResult.validateServiceKey === 'function' &&
      (await clientResult.validateServiceKey(serviceKey)) === true
    ) {
      return clientResult;
    }

    if (clientPublicKey && typeof clientResult.validatePublicKey === 'function') {
      const origin = (req.headers['origin'] || req.headers['referer'] || '') as string;
      if (clientResult.validatePublicKey(clientPublicKey, origin) === true) {
        return clientResult;
      }
    }

    return null;
  }

  return null;
};

export default ReactoryClientFromRequest;
