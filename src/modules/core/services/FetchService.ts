import Reactory from '@reactory/reactory-core'
import ApiError, { BadRequestError, InsufficientPermissions, RecordNotFoundError } from '@reactory/server-core/exceptions';
import nodeFetch, { Response } from 'node-fetch';

/**

The fetch service is an intermediary service wrapper for HTTP/HTTPS requests.
@class
@implements {Reactory.Service.IFetchService}
@property {string} name - The name of the service
@property {string} nameSpace - The namespace of the service
@property {string} version - The version of the service
@property {Reactory.Server.IReactoryContext} context - The Reactory context object
@property {Reactory.Service.IFetchAuthenticationProvder} authProvider - The authentication provider object
@property {Reactory.Service.IFetchHeaderProvider} headerProvider - The header provider object
@property {Reactory.Service.IReactoryServiceProps} props - The service properties
@function getExecutionContext - A function to get the execution context
@function setExecutionContext - A function to set the execution context
@function onStartup - A function that returns a promise resolved to true when the service starts up
@function setHeaderProvider - A function that sets the header provider object
@function postJSON - A function that sends a POST request with JSON data
@function putJSON - A function that sends a PUT request with JSON data
@function deleteJSON - A function that sends a DELETE request with JSON data
@function setAuthenticationProvider - A function that sets the authentication provider object
@function getJSON - A function that sends a GET request with JSON data
@function fetch - A function that sends an HTTP/HTTPS request
*/
export default class FetchService implements Reactory.Service.IFetchService {

  static reactory: Reactory.Service.IReactoryServiceDefinition = {
    id: 'core.FetchService@1.0.0',
    name: 'Reactory Fetch API Service',
    description: 'A service class that wraps FETCH and provides utility functions',
    service: function (props: Reactory.Service.IReactoryServiceProps, context: any) {
      return new FetchService(props, context);
    }
  }

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.Server.IReactoryContext;

  authProvider: Reactory.Service.IFetchAuthenticationProvder;
  headerProvider: Reactory.Service.IFetchHeaderProvider;

  props: Reactory.Service.IReactoryServiceProps;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }

  setHeaderProvider(provider: Reactory.Service.IFetchHeaderProvider): void {
    this.headerProvider = provider;
  }

  postJSON<T>(url: string, args?: any, authenticate?: boolean, charset: string = 'UTF-8'): Promise<T> {
    let headers: any = { };
    if(args.headers) headers = { ...args.headers };
    if(!headers.accept) headers.accept = 'application/json';

    return this.fetch(url, { ...args, method: 'POST', headers }, authenticate, `application/json; charset=${charset}`);
  }

  putJSON<T>(url: string, args?: any, authenticate?: boolean, charset?: string): Promise<T> {
    let headers: any = {};
    if (args.headers) headers = { ...args.headers };
    if (!headers.accept) headers.accept = 'application/json';

    return this.fetch(url, { ...args, method: 'PUT', headers }, authenticate, `application/json; charset=${charset}`);
  }

  deleteJSON<T>(url: string, args?: any, authenticate?: boolean, charset?: string): Promise<T> {
    let headers: any = {};
    if (args.headers) headers = { ...args.headers };
    if (!headers.accept) headers.accept = 'application/json';

    return this.fetch(url, { ...args, method: 'DELETE', headers }, authenticate, `application/json; charset=${charset}`);
  }

  setAuthenticationProvider(provider: Reactory.Service.IFetchAuthenticationProvder): void {
    this.authProvider = provider;
  }

  async getJSON<T>(url: string, args: any = {}, authenticate: boolean = false, charset: string = 'UTF-8'): Promise<T> {
    
    let headers: any = {};
    if (args.headers) headers = { ...args.headers };
    if (!headers.accept) headers.accept = 'application/json';
    return this.fetch(url, { ...args, method: 'GET', headers }, authenticate, `application/json; charset=${charset}`);
  }

  async fetch(url = '', args = {}, authenticate = true, contentType: string = 'application/json; charset=UTF-8', defaultHeaders: boolean = true): Promise<any> {

    if (!this.context) throw new ApiError('context property cannot be null FATAL ERROR');

    let absoluteUrl = `${url}`;

    const kwargs: any = args || {};    
    if (!kwargs.headers) {
      kwargs.headers = {};
    }

    kwargs.headers['content-type'] = contentType;

    let auth_processed: boolean = false;

    if (authenticate === true && this.authProvider && typeof this.authProvider.authenticateRequestSync === "function") {
      this.authProvider.authenticateRequestSync(kwargs);
      auth_processed = true;
    }
    
    if(authenticate === true && this.authProvider && typeof this.authProvider.authenticateRequest === "function") {
      this.authProvider.authenticateRequest(kwargs);
    }
    
    if(!kwargs.headers['user-agent']) kwargs.headers['user-agent'] = `ReactoryServer`;
    if(!kwargs.headers['origin']) kwargs.headers['origin'] = process.env.API_URI_ROOT;
    
    if (defaultHeaders === true && this.headerProvider) {
      this.headerProvider.decorateRequestHeaderSync(kwargs);
    }
    
    if (kwargs.params) {
      let params = new URLSearchParams();
      Object.keys(kwargs.params).forEach((key) => {
        params.append(key, kwargs.params[key]);        
      });

      absoluteUrl += `?${params.toString()}`;
    }

    let headersText = ' ';
    Object.keys(kwargs.headers).forEach((key) => { 
      headersText = `${headersText}--header '${key}: ${kwargs.headers[key]}' \\\n`;
    });

    const $curlformat = `
    ================ FETCH SERVICE CURL ==================
    curl -X ${kwargs.method || 'GET'} '${absoluteUrl}'\\
    ${headersText}
    ${kwargs.body ? `--data-raw '${kwargs.body}'` : ''}
    ==================================++==================
  `;

    this.context.log($curlformat, 'debug');

    let response: Response = null;

    try {
      response = await nodeFetch(absoluteUrl, kwargs).then();
    } catch (fetchError) {
      this.context.log(`🚨 Error Getting ${url}`, { error: fetchError }, 'error');
      throw new ApiError('Remote server could not process request', { error: fetchError.message, url });
    }

    if (response.ok && response.status === 200 || response.status === 201) {
      try {        
        let responseType = "application/text" // response.headers.get("content-type");
        if(response.headers) {
          responseType = response.headers.get("content-type");
        }

        if (kwargs.headers['content-type'] && kwargs.headers['content-type'].indexOf('/json') > 0) {

          if (responseType.indexOf("json") > 0) {

            return response.json().catch((invalidJsonErr) => {
              const msg = `
------------------------------------------------------------------
🚨🚨           Invalid JSON Data FROM Remote Resource         🚨🚨
------------------------------------------------------------------
MESSAGE: ${invalidJsonErr.message}
ENDPOINT: ${absoluteUrl}
FETCH ARGS: 
------------------------------------------------------------------
              `
              this.context.log(msg)

              throw new ApiError('request / response is supposed to be JSON but content failed', { error: invalidJsonErr });
            });

          } else {
            //try and process it as json anyway just in case the header is messed up
            const text = await response.text().then();

            if (!text) throw new ApiError('request did not respond with any data and did not provide correct response type');

            try {
              if (text.trim().charAt(0) === "{" || text.trim().charAt(0) === "[") {
                return JSON.parse(text);
              }
            } catch (parseError) {
              throw new ApiError('Remote resource did not respond correctly and did not provide correct response type.', { error: parseError.message });
            }
          }
        }

        //different header type

        return response;

      } catch (jsonError) {
        const msg = `
------------------------------------------------------------------
🚨🚨        Error Getting JSON Response from REMOTE RESOURCE  🚨🚨
------------------------------------------------------------------
MESSAGE: ${jsonError.message}
ENDPOINT:${url}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
`;
        this.context.log(msg, {}, 'error');

        throw new ApiError("Could not process response from remote API", { error: jsonError });
      }
    } else {

      switch (response.status) {
        case 400: {
          const msg = `
------------------------------------------------------------------
🚨🚨        Warning BAD REQUEST RESPONSE 🚨🚨
------------------------------------------------------------------
MESSAGE: Access Forbidden
ENDPOINT: ${absoluteUrl}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
Q & A: 
------------------------------------------------------------------
        `;
          this.context.log(msg, { status: response.status, statusText: response.statusText  }, 'error');

          throw new BadRequestError(msg)
        }
        case 401:
        case 403: {

          const msg = `
------------------------------------------------------------------
🚨🚨        Warning User Not Authenticated / Token Failed     🚨🚨
------------------------------------------------------------------
MESSAGE: Access Forbidden
ENDPOINT: ${absoluteUrl}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
`;

          this.context.log(msg, { status: response.status, statusText: response.statusText }, 'error');
          throw new InsufficientPermissions(msg);

        }
        case 404: {

          const msg = `
------------------------------------------------------------------
🚨🚨        Warning Resource Not Found 404 STATUS             🚨🚨
------------------------------------------------------------------
MESSAGE: Not Found
ENDPOINT:  ${url}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
Q & A: Item deleted or removed from remote resource
------------------------------------------------------------------
`;

          this.context.log(msg, { status: response.status, statusText: response.statusText }, 'error');

          throw new RecordNotFoundError(msg, 'cloud')
        }

        case 415: {
          const msg = `
------------------------------------------------------------------
🚨🚨        Warning Resource Not Found 404 STATUS             🚨🚨
------------------------------------------------------------------
MESSAGE: Not Found
ENDPOINT:  ${url}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
Q & A: Item deleted or removed from remote resource
------------------------------------------------------------------
`;

          this.context.log(msg, { status: response.status, statusText: response.statusText }, 'error');

          throw new ApiError(`Remote API responded with unsupported media type`, { message: msg, status: response.status, statusText: response.statusText })

        }
        
        default: {

          const msg = `
------------------------------------------------------------------
🚨🚨             OTHER SERVER - UNSPECIFIED ERROR             🚨🚨
------------------------------------------------------------------
MESSAGE: ${response.status} - ${response.statusText}
ENDPOINT:  ${url}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
`;
          this.context.log(msg, { status: response.status, statusText: response.statusText }, 'error');
          throw new ApiError("Did not receive complete response from remote resource");
        }
      }

    }

  }
}