import logger from '../logging';

const allowedHeadersString = 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,X-Client-Key,X-Client-Pwd,x-client-key,x-client-pwd,origin,authorization';
const proxyHeaderString = 'X-Real-IP,X-Forwarded-For,X-Forwarded-Host,X-Forwarded-Proto';
const corsOptions = {
  /**
   * Function - set origin to a function implementing some custom logic.
   * The function takes the request origin as the first parameter and a callback
   * (which expects the signature err [object], allow [bool]) as the second.
   */
  origin(origin, callback) {
    //console.log('checking origin', origin);
    const { user, partner } = global;
    logger.debug(`Validatinging CORS:\n ORIGIN: ${origin}\n Partner => ${partner ? partner.key : 'NO PARTNER'}\n USER => ${user ? `${user.firstName} ${user.lastName}` : 'NO USER' }`);
    callback(null, true);
    /*
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
    */
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
  exposedHeaders: ['X-Client-Key', 'X-Client-Pwd', 'x-client-key', 'x-client-pwd'],
  /*
   * Configures the Access-Control-Allow-Credentials CORS header. Set to true to pass the header,
   * otherwise it is omitted.
   */
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

export default corsOptions;
