import logger from '../logging';
import { CorsOptions, CorsOptionsDelegate } from 'cors'
import getClient from './utils/ReactoryClientFromRequest';
import Reactory from '@reactory/reactory-core';
import EnabledClients from '@reactory/server-core/data/clientConfigs';


const {
  CDN_ROOT
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
];


type CORSCallback = (error: Error, pass: boolean) => void

const allowedHeadersString = 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,X-Client-Key,X-Client-Pwd,x-client-key,x-client-pwd,origin,authorization,x-client-name,x-client-version';
const proxyHeaderString = 'X-Real-IP,X-Forwarded-For,X-Forwarded-Host,X-Forwarded-Proto';

const CorsDelegate: CorsOptionsDelegate = (request: Reactory.Server.ReactoryExpressRequest, callback: (err: Error | null, options: CorsOptions) => void) => {

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
      let whitelist: string[] = [];

      if (bypassUri.some((uri) => request.url.startsWith(uri))) {
        callback(null, true);
        return;
      }

      if (request?.partner) {
        whitelist = request.partner.whitelist;
      }

      if(EnabledClients && EnabledClients.length > 0) {
        EnabledClients.forEach((client) => {
          whitelist = [...whitelist, ...client.whitelist];
        });
      }
      
      if(whitelist.length > 0) {
        callback(null, true);
        return;
      } else {
        callback(new Error('Not allowed by CORS'), false);
        return;
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

  callback(null, corsOptions);
  // })

}




export default CorsDelegate;