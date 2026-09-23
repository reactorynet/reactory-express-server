import { isNil } from 'lodash';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import { 
  encoder 
} from '@reactory/server-core/utils';
import logger from '@reactory/server-core/logging';
import { Request, Response, Application } from 'express';


const { NODE_ENV  } = process.env

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
  '/cdn/fonts/',
  '/cdn/i18n/',
  '/cdn/wordnet/',
  '/cdn/forms/images/',
  '/cdn/forms/icons/',
  '/favicon.ico',
  '/login',
  '/logout',
  '/health',
  '/telemetry',
  // OAuth provider flows. An IdP redirect carries no tenant credential; these
  // routes resolve the tenant themselves from the tenant key (start) or from
  // the validated, session-bound CSRF state (callback). See
  // src/authentication/strategies/tenantOAuth.ts.
  '/auth/google/',
  '/auth/github/',
  '/auth/facebook/',
  '/auth/linkedin/',
  '/auth/okta/',
  '/auth/microsoft/',
];

if (NODE_ENV === 'development' || NODE_ENV === 'local' || NODE_ENV === 'test') {
  bypassUri.push('/swagger');
  bypassUri.push('/telemetry/metrics');
  bypassUri.push('/telemetry/health');
}

/**
 * A list of validated clients
 * to keep in memory for quick access
 */
const validatedClients: {
  [key: string]: { client: Reactory.Models.IReactoryClientDocument, timestamp: number},
} = {};

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
export const ReactoryClientAuthenticationMiddleware = (req: Reactory.Server.ReactoryExpressRequest, res: Response, next: Function) => {

  const { headers, query, context, path } = req;  
  let bypass: boolean = false;
  if (req.originalUrl) {
    // Match against the path only. Matching the whole URL let any request
    // skip tenant authentication by carrying a bypass path in its query
    // string, for example `/graphql?x=/login`.
    const requestPath = req.originalUrl.split('?')[0];
    bypass = bypassUri.some(uri => requestPath.includes(uri));
  }

  if (bypass === true) {
    next();
    return;
  }

  let clientId: string = headers['x-client-key'] as string;
  let clientPwd: string = headers['x-client-pwd'] as string;
  let serviceKey: string = headers['x-service-key'] as string;
  let clientPublicKey: string = headers['x-client-public-key'] as string;
  
  if( isNil(clientId) === true && 
      isNil(clientPwd) === true) {
        const queryKeys = Object.keys(query);
        if(queryKeys.includes('x-client-key') === true) {
          clientId = decodeURIComponent(query['x-client-key'] as string);
        }

        if(queryKeys.includes('x-client-pwd') === true) {
          clientPwd = decodeURIComponent(query['x-client-pwd'] as string);
        }

        if(queryKeys.includes('x-service-key') === true) {
          serviceKey = decodeURIComponent(query['x-service-key'] as string);
        }

        if(queryKeys.includes('x-client-public-key') === true) {
          clientPublicKey = decodeURIComponent(query['x-client-public-key'] as string);
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
      if(sessionKeys.includes('x-client-public-key') === true) {
        // @ts-ignore
        clientPublicKey = session['x-client-public-key'];
      }

      if(sessionKeys.includes('authState') === true ) {
        //@ts-ignore
        const state = session['authState'];
        const stateData = encoder.decodeState(state);
        if(isNil(stateData) === false) {
          clientId = stateData['x-client-key'];
          clientPwd = stateData['x-client-pwd'];
          if (stateData['x-client-public-key']) {
            clientPublicKey = stateData['x-client-public-key'];
          }
        }
      }
    }
  }

  if (isNil(clientId) === true || clientId === '') {

    switch(req.headers['accept']) {
      case 'application/json':
      case 'text/event-stream':
        res.status(401).send({
          error: 'no-client-key',
          description: 'You did not provide a client key in the request Please provide a valid client id.',
        });
        break;
      case 'text/html': 
      default:
        res.render('errors/401', { });
        break;
    }
    return; 
  } else {
    logger.debug(`ReactoryClientAuthenticationMiddleware:: extracted partner key: ${clientId}`);
    const origin = (headers['origin'] || headers['referer'] || '') as string;
    const cacheKey = `${clientId}:${clientPwd || serviceKey || ''}:${clientPublicKey ? `${clientPublicKey}@${origin}` : ''}`;
    try {
      if (clientPwd || serviceKey || (clientPublicKey && origin)) {
        if (validatedClients[cacheKey] !== undefined && validatedClients[cacheKey].timestamp > Date.now() - 300000){
          // @ts-ignore
          req.partner = validatedClients[cacheKey].client;
          context.partner = validatedClients[cacheKey].client;
          next();
          return;
        }
      }
      
      ReactoryClient.findOne({ key: clientId }).then(async (clientResult: any) => {
        if (isNil(clientResult) === true ) { 
          res.status(401).send({ 
            error: 'Credentials Invalid' });
          return;
        } 
        let authenticated = false;
        if (clientPwd && (await clientResult.validatePassword(clientPwd)) === true) {
          const origin = (headers['origin'] || headers['referer'] || '') as string;
          if (origin) {
            logger.warn(
              `[DEPRECATION] Client "${clientId}" is sending secret (x-client-pwd) over browser request (Origin: ${origin}). Migrate to x-client-public-key.`
            );
          }
          authenticated = true;
        } else if (serviceKey && typeof clientResult.validateServiceKey === 'function' && (await clientResult.validateServiceKey(serviceKey)) === true) {
          authenticated = true;
        } else if (clientPublicKey && typeof clientResult.validatePublicKey === 'function') {
          const origin = (headers['origin'] || headers['referer'] || '') as string;
          if (clientResult.validatePublicKey(clientPublicKey, origin) === true) {
            authenticated = true;
          }
        }

        if (!authenticated) {
          res.status(401).send({ error: 'Credentials Invalid' });
          return;
        }
        else {
          // @ts-ignore
          req.partner = clientResult;
          context.partner = clientResult;
          validatedClients[cacheKey] = { client: clientResult, timestamp: Date.now()};
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

const ReactoryClientAuthenticationMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = { 
  nameSpace: "core",
  name: "ReactoryClientAuthenticationMiddleware",
  version: "1.0.0",
  description: "Middleware for authenticating client applications",
  component: ReactoryClientAuthenticationMiddleware,
  ordinal: -70,
  type: 'function',
  async: false
}

export default ReactoryClientAuthenticationMiddlewareDefinition;
