import { isNil } from 'lodash';
import { ReactoryClient } from '@reactory/server-core/models';
import { 
  encoder 
} from '@reactory/server-core/utils';
import logger from '@reactory/server-core/logging';
import { Request, Response } from 'express';

const bypassUri = [
  '/cdn/content/',
  '/cdn/plugins/',
  '/cdn/profiles/',
  '/cdn/organization/',
  '/cdn/themes/',
  '/cdn/ui/',
  '/favicon.ico',
  '/auth/'
];


/**
 * The reactory client authentication middleware is responsible for authenticating
 * the client application that is making the request. The client application should
 * provide a client id and a client secret in the headers of the request.
 * 
 * However where headers are not available by default, the client id and secret can 
 * be passed as query parameters. 
 * 
 * As fallback for authentication, the client id and secret can be passed as part of the
 * state of the request or stored using session storage. Where session storage is used 
 * deployments need to ensure that sessions are sticky, meaning for multi instance deployments
 * the session storage needs to be shared across all instances.
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
const ReactoryClientAuthenticationMiddleware = (req: Request, res: Response, next: Function) => {

  const { headers, query, params, session } = req;
  let clientId = headers['x-client-key'];
  let clientPwd = headers['x-client-pwd'];
  let serverBypass = headers['x-reactory-pass'];

  if (isNil(clientId) === true) clientId = params.clientId;
  if (isNil(clientId) === true) clientId = query.clientId;
  if (isNil(clientId) === true) clientId = query['x-client-key']; 
       
  if (isNil(clientPwd) === true) clientPwd = params.secret;
  if (isNil(clientPwd) === true) clientPwd = query.secret;
  if (isNil(clientPwd) === true) clientPwd = query['x-client-pwd'];

  logger.debug(`ReactoryClientAuthenticationMiddleware:: Client key: [${clientId}], Client Token: [${clientPwd}], Original Url: ${req.originalUrl}`, { query: req.query, params: req.params, method: req.method });

  let bypass = false;
  if (req.originalUrl) {
    bypass = bypassUri.some(uri => req.originalUrl.includes(uri));
  }

  if (bypass === true) {
    next();
    return;
  }

  if (isNil(clientId) === true || clientId === '') {
    res.status(401).send({ 
      error: 'no-client-id',
      description: 'You did not provide a client id in the request Please provide a valid client id.',       
    });
  } else {
    logger.debug(`ReactoryClientAuthenticationMiddleware:: extracted partner key: ${clientId}`);
    try {
      ReactoryClient.findOne({ key: clientId }).then((clientResult: any) => {
        if (isNil(clientResult) === true ) { 
          logger.debug(`ReactoryClientAuthenticationMiddleware:: ${clientId} no credentials / configuration entry found.`)
          res.status(401).send({ 
            error: `X-Client-Key / clientId ${clientId} Credentials Invalid. Please check that your client id is correct` });
          return;
        }

        if (isNil(serverBypass) === false) {
          logger.debug('Validating Server Bypass');
          //validate  
          if (serverBypass === `${clientResult.password}+${clientResult.salt}`) {
            logger.debug('Validating Server Bypass - Passed');
            req.partner = clientResult;
            next();
          } else {
            res.status(401).send({ error: 'Your Server ByPass Failed', code: '401' });
          }
        } else {
          if (clientResult.validatePassword(clientPwd) === false) {
            res.status(401).send({ error: 'Invalid api client credentials' });
            return;
          }
          else {
            req.partner = clientResult;
            next();
          }
        }
      }).catch((clientGetError) => {
        logger.error(`Error loading ${clientId}`, clientGetError);
        res.status(401).send({ error: 'Invalid api client credentials [ERR]' });
      });

    } catch (loadClientError) {
      logger.error(`Error loading the client from id ${clientId}`, loadClientError);
      res.status(503).send({ error: 'Server could not validate the client credentials' });
    }
  }
};

export default ReactoryClientAuthenticationMiddleware;
