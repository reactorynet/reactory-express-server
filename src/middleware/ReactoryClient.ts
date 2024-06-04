import { isNil } from 'lodash';
import { ReactoryClient } from '@reactory/server-core/models';
import { 
  encoder 
} from '@reactory/server-core/utils';
import logger from '@reactory/server-core/logging';
import { Request, Response, Application } from 'express';

// Reconsider the use of this approach. 
// We want to ensure that the server bypass is not used
// and that client id and secret are used for authentication
// for routes to content folders we want to ensure that requests
// for images and other static content are not authenticated with headers
// or query parameters, but we should check the host and validate the request
// based on the host.
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
const ReactoryClientAuthenticationMiddleware = (req: Reactory.Server.ReactoryExpressRequest, res: Response, next: Function) => {

  const { headers, query, context } = req;
  let clientId = headers['x-client-key'];
  let clientPwd = headers['x-client-pwd'];
  
  if (isNil(clientId) === true) clientId = query['x-client-key'] as string; 
  if (isNil(clientPwd) === true) clientPwd = query['x-client-pwd'] as string;

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
          logger.warning(`ReactoryClientAuthenticationMiddleware:: ${clientId} no credentials / configuration entry found.`)
          res.status(401).send({ 
            error: 'Credentials Invalid.' });
          return;
        } 
        if (clientResult.validatePassword(clientPwd) === false) {
          res.status(401).send({ error: 'Credentials Invalid' });
          return;
        }
        else {
          // @ts-ignore
          req.partner = clientResult;
          context.partner = clientResult;
          next();
        }
      }).catch((clientGetError) => {
        logger.error(`Error loading ${clientId}`, clientGetError);
        res.status(401).send({ error: 'Credentials Invalid' });
      });

    } catch (loadClientError) {
      logger.error(`Error loading the client from id ${clientId}`, loadClientError);
      res.status(503).send({ error: 'Server Error' });
    }
  }
};

export const configureApp = (app: Application) => { 
  app.use(ReactoryClientAuthenticationMiddleware);
}

export default ReactoryClientAuthenticationMiddleware;
