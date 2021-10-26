import { Reactory } from '@reactory/server-core/types/reactory'
import ApiError, { BadRequestError, InsufficientPermissions, RecordNotFoundError } from '@reactory/server-core/exceptions';
import { Response } from 'node-fetch';

/**
 * The fetch service is designed to work as an intermediary service wrapper
 * for http / https requests.
 */
export default class FetchService implements Reactory.Service.IFetchService {

  static reactory: Reactory.IReactoryServiceDefinition = {
    id: '',
    name: '',
    description: '',
    service: function (props: Reactory.IReactoryServiceProps, context: any) {
      return new FetchService(props, context);
    }
  }

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.IReactoryContext;

  authProvider: Reactory.Service.IFetchAuthenticationProvder;
  headerProvider: Reactory.Service.IFetchHeaderProvider;

  props: Reactory.IReactoryServiceProps;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(context: Reactory.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }

  setHeaderProvider(provider: Reactory.Service.IFetchHeaderProvider): void {
    this.headerProvider = provider;
  }

  postJSON<T>(url: string, args?: any, authenticate?: boolean, charset?: string): Promise<T> {
    return this.fetch(url, { ...args, method: 'POST' }, authenticate, `application/json; charset=${charset}`);
  }

  putJSON<T>(url: string, args?: any, authenticate?: boolean, charset?: string): Promise<T> {
    return this.fetch(url, { ...args, method: 'PUT' }, authenticate, `application/json; charset=${charset}`);
  }

  deleteJSON<T>(url: string, args?: any, authenticate?: boolean, charset?: string): Promise<T> {
    return this.fetch(url, { ...args, method: 'DELETE' }, authenticate, `application/json; charset=${charset}`);
  }

  setAuthenticationProvider(provider: Reactory.Service.IFetchAuthenticationProvder): void {
    this.authProvider = provider;
  }

  async getJSON<T>(url: string, args: any = {}, authenticate: boolean = false, charset: string = 'UTF-8'): Promise<T> {
    return this.fetch(url, args, authenticate, `application/json; charset=${charset}`);
  }

  async fetch(url = '', args = {}, authenticate = true, contentType: string = 'application/json; charset=UTF-8'): Promise<any> {

    if (!this.context) throw new ApiError('context property cannot be null FATAL ERROR');

    let absoluteUrl = `${url}`;

    const kwargs: any = args || {};

    if (!kwargs.headers) {
      kwargs.headers = {};
    }

    kwargs.headers['content-type'] = contentType;

    if (authenticate) {
      this.authProvider.authenticateRequestSync(kwargs);
    }

    kwargs.headers['user-agent'] = `ReactoryServer`;
    kwargs.headers['origin'] = process.env.API_URI_ROOT;
    kwargs.headers['connection'] = 'keep-alive';
    if (this.headerProvider) {
      this.headerProvider.decorateRequestHeaderSync(kwargs);
    }

    if (!kwargs.credentials) {
      kwargs.credentials = 'same-origin';
    }

    if (kwargs.params) {
      const paramPayload = JSON.stringify(kwargs.params);
      absoluteUrl += `?${encodeURIComponent(paramPayload)}`;
    }

    if (kwargs.body) {
      kwargs.body = JSON.stringify(kwargs.body, null, 2);
    }

    const $curlformat = `
    ================ FETCH SERVICE CURL ==================
    curl -X ${kwargs.method || 'GET'} '${absoluteUrl}' \\
  ${Object.keys(kwargs.headers).map((key) => `-H ${key}: ${kwargs.headers[key]}`)} \\
  ${kwargs.body ? `--data-binary '${kwargs.body}' \\` : ''}
    --compressed
    ==================================++==================
  `;

    this.context.log($curlformat, { kwargs }, 'debug');

    let response: Response = null;

    try {
      response = await fetch(absoluteUrl, kwargs).then();
    } catch (fetchError) {
      this.context.log(`🚨 Error Getting ${url}`, { error: fetchError }, 'error');
      throw new ApiError('Remote server could not process request', { error: fetchError.message, url });
    }

    if (response.ok && response.status === 200 || response.status === 201) {
      try {

        const responseType = response.headers.get("content-type");

        if (kwargs.header['content-type'] && kwargs.header['content-type'].indexOf('/json') > 0) {

          if (responseType.indexOf("json") > 0) {

            return response.json().catch((invalidJsonErr) => {
              const msg = `
------------------------------------------------------------------
🚨🚨           Invalid JSON Data FROM Remote Resource         🚨🚨
------------------------------------------------------------------
MESSAGE: ${invalidJsonErr.message}
ENDPOINT: ${absoluteUrl}
FETCH ARGS: ${JSON.stringify(kwargs, null, 2)}
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
FETCH ARGS: ${JSON.stringify(kwargs, null, 2)}
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
🚨🚨        Warning BAD REQUEST RESPONSE / Token Failed       🚨🚨
------------------------------------------------------------------
MESSAGE: Access Forbidden
ENDPOINT: ${absoluteUrl}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
Q & A: 
------------------------------------------------------------------
        `;


          throw new BadRequestError(msg, response)
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

          throw new InsufficientPermissions(msg, response);

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


          throw new RecordNotFoundError(msg, 'cloud', { response })
        }
        default: {

          const msg = `
------------------------------------------------------------------
🚨🚨             OTHER SERVER - UNSPECIFIED ERROR             🚨🚨
------------------------------------------------------------------
MESSAGE: Access Forbidden
ENDPOINT:  ${url}
METHOD: ${kwargs.method || "GET"}
------------------------------------------------------------------
`;

          throw new ApiError("Did not receive complete response from remote resource");
        }
      }

    }

  }
}