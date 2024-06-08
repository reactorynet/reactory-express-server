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

  let bypass: boolean = false;
  if (req.originalUrl) {
    bypass = bypassUri.some(uri => req.originalUrl.includes(uri));
  }

  if (bypass === true) {
    next();
    return;
  }

  let clientId: string = headers['x-client-key'] as string;
  let clientPwd: string = headers['x-client-pwd'] as string;
  
  if( isNil(clientId) === true && 
      isNil(clientPwd) === true) {
        const queryKeys = Object.keys(query);
        if(queryKeys.includes('x-client-key') === true) {
          clientId = decodeURIComponent(query['x-client-key'] as string);
        }

        if(queryKeys.includes('x-client-pwd') === true) {
          clientPwd = decodeURIComponent(query['x-client-pwd'] as string);
        }
  }
  //check if session storage is used
  if(isNil(clientId) === true) { 
    const { session } = req;
    if(isNil(session) === false ){
      const sessionKeys = Object.keys(session);
      if(sessionKeys.includes('x-client-key') === true) {
        // @ts-ignore
        clientId = session['x-client-key'];
      }
      if(sessionKeys.includes('x-client-pwd') === true) {
        // @ts-ignore
        clientPwd = session['x-client-pwd'];
      }

      if(sessionKeys.includes('authState') === true ) {
        //@ts-ignore
        const state = session['authState'];
        const stateData = encoder.decodeState(state);
        if(isNil(stateData) === false) {
          clientId = stateData['x-client-key'];
          clientPwd = stateData['x-client-pwd'];
        }
      }
    }
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
          res.status(401).send({ 
            error: 'Credentials Invalid' });
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
