import { isNil } from 'lodash';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import { 
  encoder 
} from '@reactory/server-core/utils';
import logger from '@reactory/server-core/logging';
import { Request, Response, Application } from 'express';
import {
  clientIp,
  evaluateRouteAccess,
  getRouteAccessPolicies,
  IResolvedRouteAccess,
} from '../routeAccess';


const { NODE_ENV  } = process.env

// Reconsider the use of this approach. 
// We want to ensure that the server bypass is not used
// and that client id and secret are used for authentication
// for routes to content folders we want to ensure that requests
// for images and other static content are not authenticated with headers
// or query parameters, but we should check the host and validate the request
// based on the host.
// Route exemptions are no longer hardwired here. They are resolved per request
// from the route-access policy (`src/express/routeAccess.ts`), which reads the
// built-in defaults, the `REACTORY_ROUTE_ACCESS` seed and the tenant's `routeAccess`
// client setting — so an operator can open a route (and restrict it to an IP range)
// without a code change or a deploy. The defaults reproduce the list that used to
// live here.

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
  // Resolve the candidate tenant key WITHOUT validating it: a tenant may have its
  // own route-access policies, and we need them before deciding whether a credential
  // is required at all. An invalid key simply fails the credential check below.
  const candidateKey: string | undefined =
    (headers['x-client-key'] as string) ||
    (query && query['x-client-key'] ? decodeURIComponent(query['x-client-key'] as string) : undefined);

  let access: IResolvedRouteAccess;
  try {
    // Synchronous and I/O-free on purpose: this runs for every request, so it reads
    // the cached static policies (defaults + env seed + in-memory client config).
    // Database-managed overrides arrive via refreshRouteAccessPolicies, warmed at
    // startup — never awaited here.
    access = evaluateRouteAccess(
      {
        path: req.originalUrl || req.url || '',
        method: req.method,
        ip: clientIp(req),
        clientId: candidateKey,
      },
      getRouteAccessPolicies(candidateKey),
    );
  } catch (routeAccessError) {
    // Never fall through to the credentialed path on a policy failure: a policy
    // that cannot be evaluated must not silently open a route.
    logger.error(`Route access evaluation failed: ${(routeAccessError as Error).message}`);
    res.status(503).send({ error: 'Server Error' });
    return;
  }

  // An IP-restricted route is refused before any credential work, so a public
  // route (a payment callback) is still unreachable from outside its ranges.
  if (access.ipAllowed === false) {
    logger.warn(
      `Route access denied for ${req.originalUrl} from ${clientIp(req) || 'unknown'} ` +
        `(policy: ${access.matchedPath || 'default'})`,
    );
    res.status(403).send({
      error: 'Forbidden',
      description: 'Source address is not permitted for this route.',
    });
    return;
  }

  if (access.tenantAuthRequired === false) {
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
        // 401, not 200: `res.render` alone left the status at 200, so an
        // unauthenticated browser request looked like SUCCESS to monitoring,
        // proxies and clients. The JSON branch always set it.
        res.status(401).render('errors/401', { });
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
