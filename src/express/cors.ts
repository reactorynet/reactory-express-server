import logger from '../logging';
import { CorsOptions, CorsOptionsDelegate } from 'cors'
import getClient from './utils/ReactoryClientFromRequest';
import Reactory from '@reactory/reactory-core';
import EnabledClients from '@reactory/server-core/data/clientConfigs';


const {
  CDN_ROOT,
  API_ROOT,
  CORS_DEBUG = 'false',
  REACTORY_APP_WHITELIST = '',
} = process.env as Reactory.Server.ReactoryEnvironment;

const bypassUri = [
  `${CDN_ROOT}content/`,
  `${CDN_ROOT}plugins/`,
  `${CDN_ROOT}profiles/`,
  `${CDN_ROOT}organization/`,
  `${CDN_ROOT}themes/`,
  `${CDN_ROOT}ui/`,
  `${CDN_ROOT}/favicon.ico`,
  `${CDN_ROOT}/auth/microsoft/openid`,
  API_ROOT
];


type CORSCallback = (error: Error, pass: boolean) => void

const allowedHeadersString = 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,X-Client-Key,X-Client-Pwd,x-client-key,x-client-pwd,origin,authorization,x-client-name,x-client-version,apollo-require-preflight,x-apollo-operation-name';
const proxyHeaderString = 'X-Real-IP,X-Forwarded-For,X-Forwarded-Host,X-Forwarded-Proto';

const CorsDelegate: CorsOptionsDelegate = (request: Reactory.Server.ReactoryExpressRequest, corsDelegateCallback: (err: Error | null, options: CorsOptions) => void) => {

  const corsOptions: CorsOptions = {
    /**
     * Function - set origin to a function implementing some custom logic.
     * The function takes the request origin as the first parameter and a callback
     * (which expects the signature err [object], allow [bool]) as the second.
     * 
     * The CORS White List needs to include all the configured whitelisted items 
     * for all configured Reactory Clients
     */
    origin: (origin: string, callback: CORSCallback) => {
      if (CORS_DEBUG === 'true') {
        logger.info(`[CORS] Origin: ${origin}`);
      }

      if(!origin) {
        callback(null, true);
        return;
      }

      let whitelist: string[] = REACTORY_APP_WHITELIST.split(',') || [];

      if (bypassUri.some((uri) => request.url.indexOf(uri) > -1 )) {
        if (CORS_DEBUG === 'true') logger.info(`[CORS] Bypassing CORS for ${request.url}`);
        callback(null, true);
        return;
      }

      /**
       * Check the client configurations for any whitelisted origins
       * and add them to the whitelist
       */
      if(EnabledClients && EnabledClients.length > 0) {
        if (CORS_DEBUG === 'true') logger.info(`[CORS] Enabled Clients: ${EnabledClients.map((client) => client.name)}`);
        EnabledClients.forEach((client) => {
          if (client && client.whitelist) {
            whitelist = [...whitelist, ...client.whitelist];
          } else {
            if (CORS_DEBUG === 'true') logger.warn(`[CORS] Client ${client.name} has no whitelist`);
          }
        });
      } else {
        if (CORS_DEBUG === 'true') logger.warn(`[CORS] No Enabled Clients`);
      }

      if (CORS_DEBUG === 'true') logger.info(`[CORS] Whitelist: ${whitelist}`);

      if(whitelist.length > 0) {
        if (CORS_DEBUG === 'true') {
          logger.info(`[CORS] Whitelist: ${whitelist}`);
        }
        if (whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          if (CORS_DEBUG === 'true') logger.warn(`[CORS] Origin ${origin} not allowed by CORS whitelist`);
          callback(new Error(`[CORS] Origin ${origin} not allowed by CORS whitelist`), false);
        }
      } else {
        if (CORS_DEBUG === 'true') logger.warn(`[CORS] [Whitelist Empty] Origin ${origin} not allowed by CORS`);
        callback(new Error(`[CORS] [Whitelist Empty] Origin ${origin} not allowed by CORS`), false);
      }
    },
    /**
       *
       */
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    /**
       *
       */
    allowedHeaders: [...allowedHeadersString.split(','), ...proxyHeaderString.split(',')],
    /**
       * Configures the Access-Control-Expose-Headers CORS header.
       * Expects a comma-delimited string (ex: 'Content-Range,X-Content-Range') or an array
       * (ex: ['Content-Range', 'X-Content-Range']). If not specified, no custom headers are exposed.
       */
    exposedHeaders: ['X-Client-Key', 'X-Client-Pwd', 'x-client-key', 'x-client-pwd', 'x-client-version', 'x-client-name'],
    /*
     * Configures the Access-Control-Allow-Credentials CORS header. Set to true to pass the header,
     * otherwise it is omitted.
     */
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  };
  corsDelegateCallback(null, corsOptions);
}

export default CorsDelegate;