import Reactory from '@reactory/reactory-core'
import ApiError, { BadRequestError, InsufficientPermissions, RecordNotFoundError } from '@reactory/server-core/exceptions';
import FormData from 'form-data';
import nodeFetch, { RequestInit, Response } from 'node-fetch';

/**
 * The fetch service is designed to work as an intermediary service wrapper
 * for http / https requests.
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
    debugger
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