'use strict'
import fetch from 'node-fetch';
import fs from 'fs-extra';
import { promisify } from 'util';
import path from 'path';
import FormData from 'form-data';
import om from 'object-mapper';
import { isObject, map, find, isArray, isNil, concat, uniq, result } from 'lodash';
import moment from 'moment';
import axios from 'axios';
import { Reactory } from '@reactory/server-core/types/reactory';
// import { clearAuthentication } from '../actions/Auth';
import SECONDARY_API_URLS from './SecondaryApiUrls';
import logger from '@reactory/server-core/logging';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';
import AuthenticationSchema from '../schema/Authentication';
import { jzon } from '../../../utils/validators';

import LasecDatabase from '../database';
import LasecQueries from '../database/queries';
import { execql, execml } from '@reactory/server-core/graph/client';

import {
  getCacheItem,
  setCacheItem
} from '@reactory/server-modules/lasec/models'

import { LASEC_API_ERROR_FORMAT } from './constants';
import {
  LasecApiResponse,
  LasecCreateSalesOrderInput,
  LasecQuoteOption,
  LasecSalesOrder,
  LasecAddress,
} from '../types/lasec';
import { deleteSalesOrdersDocument, getCustomerDocuments } from '../resolvers/Helpers';

const config = {
  WEBSOCKET_BASE_URL: process.env.LASEC_WSS_BASE_URL || 'wss://api.lasec.co.za/ws/',
  UI_BASE_URL: process.env.LASEC_UI_BASE_URL || 'https://l360.lasec.co.za',
  API_BASE_URL: process.env.LASEC_API_BASE_URL || 'https://api.lasec.co.za',
  SECONDARY_API_URL: process.env.LASEC_SECONDARY_API_URL || 'https://api.lasec.co.za',
  PRIMARY_API_URL_PREFIX_1: 'api',
  PRIMARY_API_URL_PREFIX_2: 'l360',
  SECONDARY_API_URL_PREFIX_1: 'api',
  GOOGLE_MAPS_API_KEY: 'XXXXXXXXXXXXX',
};

export class LasecNotAuthenticatedException extends ApiError {
  constructor(message) {
    super(message || 'Please login with your 360 Credentials', {
      __typename: 'lasec.api.LasecNotAuthenticatedException',
      redirect: '/360',
      componentResolver: 'lasec-crm.Login360'
    });
  }
}

export class TokenExpiredException extends ApiError {
  constructor(message) {
    super(message, {
      __typename: 'lasec.api.TokenExpiredException',
      redirect: '/360',
      componentResolver: 'lasec-crm.Login360'
    });
    this.extensions = this.meta;
  }
}

export class LasecApiException extends ApiError {
  constructor(message: string) {
    super(message, {
      __typename: 'lasec.api.RemoteError',
    })

    this.extensions = this.meta;
  }
}

export const DUPLICATE_LOADING_ERROR_MESSAGE = 'DUPLICATE_LOADING_ERROR_MESSAGE';
export const DUPLICATE_SAVING_ERROR_MESSAGE = 'DUPLICATE_SAVING_ERROR_MESSAGE';
export const SETTINGS_NOT_CONFIGURED = 'SETTINGS_NOT_CONFIGURED';

export function stringifyIds(ids) {
  const x = map(ids, (id) => { return `${id}`; });
  return x;
}


const safe_date_transform = (value: any) => {
  const date_moment = moment(value)
  if (date_moment.isValid() === false) {
    return null
  } else {
    return date_moment.format("YYYY-MM-DD")
  }
};

const isCredentialsValid = (authentication) => {
  // return jzon.validate(AuthenticationSchema, authentication);

};

const getStorageItem = async (key) => {
  const { user } = global;
  logger.debug(`Lookup Security Storage ${key} on ${user.firstName} ${user.lastName}`);
  let must_login = true;
  if (user._id) {
    const lasecAuth = user.getAuthentication('lasec');
    if (isNil(lasecAuth) === true) throw new LasecNotAuthenticatedException('Please login with your lasec 360 account');

    if (lasecAuth.props) {
      logger.debug(`Found login information for lasec`);
      const {
        payload,
        username,
        password,
        lastStatus,
      } = lasecAuth.props;

      let { lastLogin } = lasecAuth;
      const now = moment();
      if (lastLogin) lastLogin = moment(lastLogin);

      if (payload && payload.token) {
        const timeout = 1;

        if (lastLogin && moment(lastLogin).add(timeout, 'hour').isAfter(now) === true) {
          // we have an authentication token
          // maybe we can test it? check if valid
          must_login = false;
          logger.debug(`login has token fresher than ${timeout} hours`);
          //
          return lasecAuth.props.payload.token;
        } else {
          must_login = true;

          logger.debug(`login token is older than ${timeout} hours`);
        }
      }
      // no token or we force the login again after 24 hours to get a refresh.
      // check for username and password
      if (username && password && must_login === true && user.is_logging_in !== true) {
        try {
          user.is_logging_in = true;
          logger.debug('No token / Token expired / Invalid, checking username and password');
          const loginResult = await Api.Authentication.login(username, password).then();
          logger.debug('Login result after authenticating with lasec360', loginResult);
          if (user.setAuthentication && loginResult) {
            await user.setAuthentication({
              provider: 'lasec',
              props: {
                username, password, ...loginResult,
                lastStatus: 200,
              },
              lastLogin: new Date().valueOf()
            }).then();

            user.is_logging_in = false;
            if (loginResult.payload && loginResult.payload.token) {
              return loginResult.payload.token;
            }
          } else {
            logger.warn('Login did not fail, but did not succeed, whatup?');
          }
        } catch (authError) {
          // we don't want to rethrow
          logger.warn(`Could not log user in with lasec api ${authError.message}`);
        }
      }
      return null;
    }
  }
  // no global user - return null, no authentication
  //throw new Error('How?');
  return null;
};

export async function POST(url, data, auth = true) {
  const args = { body: data, method: 'POST' };
  return await FETCH(url, args, auth);
}

export function DELETE(url, data, auth = true) {
  const args = { body: data, method: 'DELETE' };
  return FETCH(url, args, auth);
}

export function PUT(url, data, auth = true) {
  const args = { body: data, method: 'PUT' };
  return FETCH(url, args, auth);
}

interface LasecAPIFetchArgs {
  headers?: any,
  credentials?: string,
  params?: any
  [key: string]: any
};

export async function FETCH(url = '', fethArguments = {}, mustAuthenticate = true, failed = false, attempt = 0): Promise<any> {
  // url = `${url}`;
  let absoluteUrl = `${config.SECONDARY_API_URL}/${url}`;

  const kwargs: LasecAPIFetchArgs = fethArguments || {};
  if (!kwargs.headers) {
    kwargs.headers = {};
    kwargs.headers['Content-type'] = 'application/json; charset=UTF-8';
  }

  if (mustAuthenticate === true) {
    const token = await getStorageItem('secondary_api_token').then();
    if (token) {
      kwargs.headers.Authorization = `Token ${token}`;
      kwargs.headers.Origin = 'http://localhost:3000';
      kwargs.headers['X-LASEC-AUTH'] = `Token ${token}`;
      kwargs.headers['X-CSRFToken'] = '';
    }
    // should throw an error if there is no token!
  } else {
    kwargs.headers.Authorization = 'Token null';
    kwargs.headers.Origin = 'http://localhost:3000';
    kwargs.headers['X-LASEC-AUTH'] = 'Token null';
    kwargs.headers['X-CSRFToken'] = '';
  }

  kwargs.headers['User-Agent'] = `ReactoryServer`

  if (!kwargs.credentials) {
    kwargs.credentials = 'same-origin';
  }

  if (kwargs.params) {
    const paramPayload = JSON.stringify(kwargs.params);
    logger.debug(`query params: ${paramPayload}`);
    absoluteUrl += `?params=${encodeURIComponent(paramPayload)}`;
  }

  if (isObject(kwargs.body)) {
    kwargs.body = JSON.stringify(kwargs.body, null, 2);
  }

  logger.debug(`API CALL: curl '${absoluteUrl}' \\
  -H 'Connection: keep-alive' \\
  -H 'Authorization: ${kwargs.headers.Authorization}' \\
  -H 'X-LASEC-AUTH: ${kwargs.headers.Authorization}' \\
  -H 'User-Agent: ReactoryServer' \\
  -H 'X-CSRFToken: undefined' \\
  -H 'Content-type: application/json; charset=UTF-8' \\
  -H 'Accept: */*' \\
  -H 'Origin: ${process.env.API_URI_ROOT}' \\
  -H 'Accept-Language: en-US,en;q=0.9,af;q=0.8,nl;q=0.7' \\
  ${kwargs.body ? `--data-binary '${kwargs.body}' \\` : ''}
  --compressed`);

  let apiResponse = null;

  try {
    apiResponse = await fetch(absoluteUrl, kwargs).then();
  } catch (apiError) {
    return {
      status: 'failed',
      payload: null,
      message: `FETCH api threw error ${apiError}`
    };
  }
  if (apiResponse.ok && apiResponse.status === 200 || apiResponse.status === 201) {
    try {
      //  apiResponse.text().then(response => logger.debug(`RESPONSE FROM API:: -  ${response}`));
      return apiResponse.json();
    } catch (jsonError) {
      logger.error("JSON Error From API", jsonError);
      return {
        status: 'failed',
        payload: null,
        message: `apiResponse.toJSON failed Api threw error ${jsonError.message}`
      };
    }
  } else {
    logger.warn(`Failed API call to ${absoluteUrl}`, { apiResponse, status: apiResponse.status || 'xxx', statusText: apiResponse.statusText });
    switch (apiResponse.status) {
      case 400: {
        throw new ApiError('Could not execute fetch against Lasec API, Bad Request', { status: apiResponse, statusText: apiResponse.statusText });
      }
      case 401:
      case 403: {

        const retry = async function retry() {
          logger.debug('Attempting to refetch', { attempt });
          if (attempt < 3) {
            return await FETCH(url, fethArguments, mustAuthenticate, true, attempt ? attempt + 1 : 1).then();
          } else {
            throw new TokenExpiredException('Authentication Credentials cannot log in');
          }
        };

        if (failed === false) {
          const currentAuthentication = global.user.getAuthentication('lasec');
          try {
            // get the current authentication details
            const currentAuthentication = global.user.getAuthentication('lasec');
            if (currentAuthentication && currentAuthentication.props) {
              // clear the login
              const authprops = { ...currentAuthentication.props };
              delete authprops.payload;
              await global.user.setAuthentication(authprops).then();
              return await retry();
            }
          } catch (err) {
            logger.error('Cannot log user in,  clearing credentials', err);
            if (currentAuthentication && currentAuthentication.props) {
              // clear the login
              await global.user.removeAuthentication('lasec').then();
              return await retry();
            }
          }
        }

        break;
      }
      case 404: {
        throw new RecordNotFoundError(`Could not fetch record for at ${absoluteUrl}`, 'LASEC_API', {
          url,
          fethArguments,
          mustAuthenticate,
          failed,
          attempt
        })
      }
      default: {
        await execml(`mutation LasecReset360Credentials {
          LasecReset360Credentials
        }`);
        throw new ApiError('Could not execute fetch against Lasec API', { status: apiResponse, statusText: apiResponse.statusText });
      }
    }

  }
}

const defaultParams = {
  filter: {},
  ordering: {},
  pagination: { enabled: false, page_size: 10, current_page: null },
};

const defaultQuoteObjectMap = {

};


const Api = {
  FETCH,
  URIS: SECONDARY_API_URLS,
  get: async (uri: string, params: any = null, shape: any = null) => {
    const resp = await FETCH(uri, params ? { params } : undefined).then();
    const {
      status, payload,
    } = resp;

    logger.debug(`🟠 GET ${uri} => `, { status, payload })



    if (status === undefined && payload) {
      if (shape && Object.keys(shape).length > 0) {
        return om.merge(payload, shape);
      } else {
        return payload;
      }
    }

    if (status && status === 'success') {
      if (shape && Object.keys(shape).length > 0) {
        return om.merge(payload, shape);
      } else {
        return payload;
      }
    } else {
      return { pagination: {}, ids: [], items: [], status };
    }
  },
  post: async (uri: string, params: any, shape: any, auth: boolean = true) => {

    try {
      const resp = await POST(uri, params, auth).then();
      const {
        status, payload,
      } = resp;

      logger.debug(`API POST Response`, { status, payload });

      if (payload && !status) {
        if (shape && Object.keys(shape).length > 0) {
          return om.merge(payload, shape);
        } else {
          return payload;
        }
      }

      if (status === 'success') {
        if (shape && Object.keys(shape).length > 0) {
          return om.merge(payload, shape);
        } else {
          return payload;
        }
      } else {
        logger.error(`API POST was not successful`, resp);
        return { pagination: {}, ids: [], items: [], error: resp };
      }
    } catch (lasecApiError) {
      logger.error(`API threw error`, lasecApiError);

      throw lasecApiError;
    }

  },
  delete: async (uri: string, params: any, shape: any, auth: boolean = true) => {

    try {
      const resp = await DELETE(uri, params, auth).then();
      const {
        status, payload,
      } = resp;

      logger.debug(`API POST Response`, { status, payload });

      if (payload && !status) {
        if (shape && Object.keys(shape).length > 0) {
          return om.merge(payload, shape);
        } else {
          return payload;
        }
      }

      if (status === 'success') {
        if (shape && Object.keys(shape).length > 0) {
          return om.merge(payload, shape);
        } else {
          return payload;
        }
      } else {
        logger.error(`API POST was not successful`, resp);
        return { pagination: {}, ids: [], items: [] };
      }
    } catch (lasecApiError) {
      logger.error(`API threw error`, lasecApiError);

      throw lasecApiError;
    }

  },
  put: async (uri: string, params: any, shape: any): Promise<any> => {
    const resp = await PUT(uri, params).then();
    const {
      status, payload,
    } = resp;

    logger.debug(`API POST Response ${resp}`);
    if (status === 'success') {
      if (shape && Object.keys(shape).length > 0) {
        return om.merge(payload, shape);
      } else {
        return payload;
      }
    } else {
      logger.error(`API POST was not successful ${resp}`);
      return { pagination: {}, ids: [], items: [] };
    }
  },
  Documents: {
    /**
     * Uploads a document to the lasec API against a particular customer
     */
    upload: async (documentInfo, customerInfo) => {
      logger.debug(`Uploading document to LasecAPI`, { documentInfo, customerInfo });
      /**
       *
        {
          "_id" : ObjectId("5ea98b4269577f4ca87e8f5d"),
          "alt" : [

          ],
          "uploadContext" : "lasec-crm::new-company::document::5df902cd900adc04d9ab634e",
          "public" : false,
          "published" : false,
          "tags" : [

          ],
          "id" : ObjectId("5ea98b424922bb4ca8872207"),
          "filename" : "david_spade.png",
          "mimetype" : "image/png",
          "alias" : "b9ae20dfb144db63474a0a622742fd67df8a991b.png",
          "partner" : ObjectId("5ea98b424922bb4ca8872208"),
          "owner" : ObjectId("5ea98b424922bb4ca8872209"),
          "uploadedBy" : ObjectId("5ea98b424922bb4ca887220a"),
          "size" : NumberInt(29753),
          "hash" : NumberInt(-1697330410),
          "link" : "http://localhost:4000/cdn/content/files/b9ae20dfb144db63474a0a622742fd67df8a991b.png",
          "path" : "content/files/",
          "__v" : NumberInt(0)
        }
       *
       *
       */




      const kwargs = {};
      if (!kwargs.headers) {
        kwargs.headers = {};
        kwargs.headers['Content-type'] = 'application/json; charset=UTF-8';
      }


      const token = await getStorageItem('secondary_api_token').then();
      if (token) {
        kwargs.headers.Authorization = `Token ${token}`;
        kwargs.headers.Origin = 'http://localhost:3000';
        kwargs.headers['X-LASEC-AUTH'] = `Token ${token}`;
        kwargs.headers['X-CSRFToken'] = '';
      }
      // should throw an error if there is no token!
      if (!kwargs.credentials) {
        kwargs.credentials = 'same-origin';
      }

      try {
        let filename = path.join(process.env.APP_DATA_ROOT, documentInfo.path, documentInfo.alias);
        if (fs.existsSync(filename) === true) {
          const stream = fs.createReadStream(filename);
          kwargs.body = stream;
          let absoluteUrl = `${config.SECONDARY_API_URL}/${SECONDARY_API_URLS.file_uploads.url}/`;

          const form = new FormData(); //
          form.append('file', stream);
          // In Node.js environment you need to set boundary in the header field 'Content-Type' by calling method `getHeaders`
          const formHeaders = form.getHeaders();
          let uploadResult = await axios.post(absoluteUrl, form, { params: {}, headers: { ...kwargs.headers, ...formHeaders } }).then();
          logger.debug(`Uploaded document complete:\n\t ${uploadResult}`);
          const { status, payload } = uploadResult.data;
          if (status === 'sucess') {
            const fileData = uploadResult.data.payload;
            if (customerInfo && customerInfo.id) {
              uploadResult = await POST(`${SECONDARY_API_URLS.customer_documents}`, { document_ids: [fileData.id], customer_id: customerInfo.id }).then();
            }
            return {
              document: documentInfo,
              success: true,
              messsage: `${documentInfo.fileName}`
            };
          } else {
            return {
              document: documentInfo,
              success: false,
              message: payload
            }
          }
        }
      } catch (exc) {
        logger.debug(`Could not upload file to endpoint:\n\t Exception ${exc}`);
        return {
          document: documentInfo,
          success: false,
          message: exc.message
        }
      }
    }
  },
  Customers: {
    list: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.customers.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      logger.debug(`♻ Customer List Response from remote api ${status}`, { status, payload });

      if (payload && !status) return payload;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    Documents: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.file_upload.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    UpdateClientDetails: async (clientId, params) => {
      try {

        // logger.debug(`PARAMS: `, params);

        const apiResponse = await POST(`api/customer/${clientId}/update/`, params).then();

        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`API UPDATE RESPONSE: ${JSON.stringify(apiResponse)}`);
        logger.debug(`PAYLOAD: ${JSON.stringify(payload)}`);

        if (status === 'success') {
          return {
            success: true,
            customer: payload && payload.customers ? payload.customers[0] : null
          }
        }

        return {
          success: false,
        };

      } catch (error) {
        logger.error(`ERROR UPDATING CLIENT DETAILS:: ${error}`);
        return {
          success: false,
        };
      }
    },
    GetCustomerRoles: async (params = {}) => {

      const resp = await FETCH(SECONDARY_API_URLS.customer_roles.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };

    },
    GetCustomerRankings: async (params = defaultParams) => {

      const resp = await FETCH(SECONDARY_API_URLS.customer_ranking.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };

    },
    GetCustomerClass: async (params = defaultParams) => {

      const resp = await FETCH(SECONDARY_API_URLS.customer_class.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };

    },
    GetFacultyList: async (params = defaultParams) => {
      const resp = await FETCH(SECONDARY_API_URLS.faculty_list.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (payload && status === undefined) return payload;

      if (status === 'success') { return payload; }

      return { pagination: {}, ids: [], items: [] };
    },
    GetCustomerType: async (params = defaultParams) => {
      const resp = await FETCH(SECONDARY_API_URLS.customer_type.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (payload && status === undefined) return payload;

      if (status === 'success') { return payload; }

      return { pagination: {}, ids: [], items: [] };
    },
    GetCustomerLineManagers: async (params = defaultParams) => {

      logger.debug(`[INDEX] GET LINE MANAGERS:: ${JSON.stringify(params)}`);

      const resp = await FETCH(`api/customer/${params.customerId}/line_manager_list/`, { params: { ...defaultParams } }).then();
      const {
        status, payload,
      } = resp;

      if (payload && status === undefined) return payload;

      if (status === 'success') { return payload; }

      return { pagination: {}, ids: [], items: [] };
    },
    GetCustomerClassById: async (id) => {

      const resp = await FETCH(SECONDARY_API_URLS.customer_class.url, { params: { filter: { ids: [id] }, paging: {} } }).then();
      const {
        status, payload,
      } = resp;

      if (payload && status === undefined) return payload;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };

    },
    GetPersonTitles: async (personTitleParams = {}) => {
      const resp = await FETCH(SECONDARY_API_URLS.person_title.url, { params: { ...defaultParams, ...personTitleParams } }).then();
      const {
        status, payload,
      } = resp;


      if (payload && status === undefined) return payload;

      if (status === 'success') {
        return payload;
      } else {

        logger.error(LASEC_API_ERROR_FORMAT(`COULD NOT FETCH TITLES: ${status}`));
        return { pagination: {}, ids: [], items: [], status };
      }


    },
    GetCustomerJobTypes: async (params = defaultParams) => {
      const resp = await FETCH(SECONDARY_API_URLS.customer_roles.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (payload && status === undefined) return payload;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    GetRepCodes: async (params = defaultParams) => {
      const resp = await FETCH(SECONDARY_API_URLS.rep_code.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = resp;

      if (payload && status === undefined) return payload;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    UploadDocument: async (params) => {
      const apiResponse = await POST(SECONDARY_API_URLS.file_uploads.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (payload && status === undefined) return payload;

      if (status === 'success') {
        return payload;
      } else {
        return apiResponse;
      }

    },
    UpdateAddress: async (edit_address: LasecAddress): Promise<LasecAddress> => {
      //get the existing address for
      let api_result = await Api.Customers.getAddress({ filter: { ids: [edit_address.id] } }).then();
      logger.debug(`Existing Address Lookup Returned`, api_result);
      let existing_address = null;

      if (api_result.items.length > 0) {
        existing_address = api_result.items[0];
      }

      if (existing_address !== null) {
        try {
          const update_result = await PUT(`${SECONDARY_API_URLS.address.url}${edit_address.id}`, edit_address).then();
          logger.debug(`Address update result`, { update_result })

          if (update_result.status === "success") {
            return update_result.payload as LasecAddress;
          }

        } catch (address_update_error) {
          logger.error("Could not update the address details");

          return existing_address;
        }

      }
      throw new RecordNotFoundError(`The address with the id ${edit_address.id} was not found`)
    },
    getAddress: async (params) => {
      const resp = await FETCH(SECONDARY_API_URLS.address.url, { params: { ...defaultParams, ...params } }).then()
      const {
        status, payload,
      } = resp;

      logger.debug(`API REPONSE  Get Address`, { resp })

      if (payload && status === undefined) return payload;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    createNewAddress: async (params) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.new_address.url, { ...params }).then();
        return apiResponse; //{"status":"success","payload":{"id":31907}}
      } catch (lasecApiError) {
        logger.error(`ERROR CREATING NEW ADDRESS:: ${lasecApiError}`);
        return null;
      }
    },
    getPlaceDetails: async (placeId) => {

      const drewsTempApiKey = '<GOOGLE MAPS API KEY>';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component&key=${drewsTempApiKey}`;
      const response = await fetch(url, { method: 'GET' }).then();

      try {
        return response.json();
      } catch (ex) {
        logger.error(`ERROR GETTING ADDRESS:: ${ex}`);
        return response.text();
      }
    },
    UpdateClientSpecialRequirements: async (clientId, params) => {
      try {
        logger.debug(`PARAMS: `, params);

        // const apiResponse = await POST(`api/company/${clientId}`, params).then();
        const apiResponse = await PUT(`api/company/${clientId}`, params).then();
        const { status, payload, id, } = apiResponse;

        logger.debug(`API UPDATE RESPONSE: ${JSON.stringify(apiResponse)}`);
        logger.debug(`PAYLOAD: ${JSON.stringify(payload)}`);

        if (status === 'success') {
          return {
            success: true,
            message: 'Special requirements updated.'
          }
        }

        return {
          success: false,
          message: 'Error updating special requirements .'
        };

      } catch (error) {
        logger.error(`ERROR UPDATING CLIENT SPECIAL REQUIREMENTS:: ${error}`);
        return {
          success: false,
          message: 'Error updating special requirements .'
        };
      }
    },
  },
  Company: {
    list: async (params) => {

      const apiResponse = await FETCH(SECONDARY_API_URLS.company.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };

    },
    getById: async (params) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.company.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    getAddress: async (params) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.company.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    uploadFile: async (params) => {
      try {
        logger.debug(`BEGINNING DOCUMENT UPLOAD:: ${params}`);

        const apiResponse = await POST(SECONDARY_API_URLS.file_uploads, { body: { ...params } }).then();
        const { status, payload } = apiResponse;
        // payload - name id url

        logger.debug(`UPLOAD DOCUMENT RESPONSE STATUS: ${status}  PAYLOAD: ${payload}`);

        if (status === 'success') {
          return apiResponse;
        }

        return apiResponse;

      } catch (error) {
        logger.error(`ERROR UPLOADING DOCUMENT:: ${error}`);
        return null;
      }
    }
  },
  Organisation: {
    list: async (params: any = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.organisation.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    createNew: async (params) => {
      try {
        // const url = 'api/organisation/0/';
        // const apiResponse = await PUT(url, { ...params });

        const url = 'api/customer/create_organisation_and_save_to_customer/';
        const apiResponse = await POST(url, { ...params });

        const { status } = apiResponse;

        if (status === 'success') {
          return apiResponse;
        }
      } catch (lasecApiError) {
        logger.error(`Error creating new organisation:: ${JSON.stringify(lasecApiError)}`).then();
        return null;
      }
    }
  },
  Products: {
    list: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.product_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    byId: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.product_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      logger.debug(`PRODUCT RESPONSE::  ${JSON.stringify(apiResponse)}`);

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };

    },
    warehouse_stock: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.warehouse_strock.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    warehouse: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.warehouse.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    sales_orders: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.sales_order.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    costings: async (params) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.product_costing_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      // logger.debug(`PRODUCT COSTINGS RESPONSE::  ${JSON.stringify(apiResponse)}`);

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    contracts: async (params) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.product_contracts_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      // logger.debug(`PRODUCT COSTINGS RESPONSE::  ${JSON.stringify(apiResponse)}`);

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    tenders: async (params) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.product_tenders_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      // logger.debug(`PRODUCT COSTINGS RESPONSE::  ${JSON.stringify(apiResponse)}`);

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    }
  },
  Invoices: {

    list: async (params = defaultParams) => {
      try {
        const invoiceResult = await FETCH(SECONDARY_API_URLS.invoices.url, { params: { ...defaultParams, ...params } });
        if (invoiceResult.status === 'success') {
          logger.debug('Invoice Results', invoiceResult);
          return invoiceResult.payload;
        }
        return { pagination: {}, ids: [], items: [] };
      } catch (invoiceErrors) {
        logger.error(`Error fetching invoices ${invoiceErrors.message}`, invoiceErrors);
        return { pagination: {}, ids: [], items: [] };
      }
    }
  },
  PurchaseOrders: {
    list: async (params = defaultParams) => {
      const poResult = await FETCH(SECONDARY_API_URLS.purchase_order.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status,
        payload,
      } = poResult;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    detail: async (params = defaultParams) => {
      const isoResult = await FETCH(SECONDARY_API_URLS.purchase_order_item.url, { params: { ...defaultParams, ...params } }).then();

      const {
        status,
        payload,
      } = isoResult;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
  },
  SalesOrders: {

    item: async (sales_order_id: string): Promise<LasecSalesOrder> => {
      try {

        let sales_order: LasecSalesOrder = null;
        const cached = await getCacheItem(`lasec-sales-order::${sales_order_id}`).then()

        if (cached === null || cached === undefined) {

          const iso_api_result: LasecApiResponse = await FETCH(SECONDARY_API_URLS.sales_order.url, {
            params: {
              filter: {
                ids: [sales_order_id]
              },
              ordering: {},
              pagination: {
                enabled: false,
                page_size: 10,
                current_page: 1
              }
            }
          }).then();

          logger.debug(`Result from API`, iso_api_result);
          if (iso_api_result.payload) {
            if (iso_api_result.payload.items && iso_api_result.payload.items.length === 1) {

              let item = iso_api_result.payload.items[0];

              /**
               * ***************************
               *   Results from Lasec API
               * ***************************
                  {
                    "id": "509376",
                    "document_ids": [
                      "89778"
                    ],
                    "order_date": "2020-11-16T00:00:00Z",
                    "account_number": "31718",
                    "order_type": "Normal",
                    "req_ship_date": "2020-11-16T00:00:00Z",
                    "order_status": "Open Order",
                    "sales_order_number": "509376",
                    "sales_order_id": "509376",
                    "company_trading_name": "LANCET LABORATORIES (PTY) LTD",
                    "sales_team_id": "LAB301",
                    "currency": "R",
                    "quote_id": "2011-301135111",
                    "quote_date": "2020-11-16T10:09:00Z",
                    "order_value": 0,
                    "back_order_value": 0,
                    "reserved_value": 0,
                    "shipped_value": 105472,
                    "delivery_address": "Lancet Stores , 11 Heron Park,  80,Corobrik Rd,  Riverhorse Valley,,Newlands East,  4017,  South Africa",
                    "customer_name": "Sipho  Ngema",
                    "customerponumber": "PTYPO315315",
                    "dispatch_note_ids": [
                      "509376/0001"
                    ],
                    "invoice_ids": [],
                    "warehouse_note": "",
                    "delivery_note": "",
                    "order_qty": 0,
                    "ship_qty": 0,
                    "back_order_qty": 0,
                    "reserved_qty": 0
                  }
               */

              sales_order = {
                id: item.id,

                orderDate: item.order_date,
                salesOrderNumber: sales_order_id,
                shippingDate: item.req_ship_date,

                quoteId: item.quote_id,
                quoteDate: item.quote_date,


                orderType: item.order_type,
                orderStatus: item.order_status,

                iso: item.id,

                customer: item.customer_name,
                crmCustomer: {
                  id: '',
                  tradingName: item.company_trading_name,
                  registeredName: item.company_trading_name
                },

                poNumber: item.customerponumber,
                currency: item.currency,

                deliveryAddress: item.delivery_address,
                deliveryNote: item.delivery_note,
                warehouseNote: item.warehouse_note,

                salesTeam: item.sales_team_id,
                value: item.order_value,
                reserveValue: item.reserved_value,
                shipValue: item.shipped_value,
                backorderValue: item.back_order_value,

                dispatchCount: item.dispatch_note_ids.length,
                invoiceCount: item.invoice_ids.length,

                orderQty: item.order_qty,
                shipQty: item.ship_qty,
                reservedQty: item.reserved_qty,
                backOrderQty: item.back_order_qty,

                invoices: item.invoice_ids.map((id: string) => ({ id })),
                dispatches: item.dispatch_note_ids.map((id: string) => ({ id })),
                //documents: item.document_ids.map((id: string) => ({ id })),
                documentIds: [...item.document_ids],

                details: {
                  lineItems: [],
                  comments: []
                }
              };

              setCacheItem(`lasec-sales-order::${sales_order_id}`, sales_order, 15);
              return sales_order;
            }
          }
        } else {
          return cached;
        }

      } catch (sales_order_item_error) {
        logger.error(`Could not load ISO ${sales_order_id}`, sales_order_item_error);
        throw sales_order_item_error;
      }
    },

    list: async (params = defaultParams) => {
      const isoResult = await FETCH(SECONDARY_API_URLS.sales_order.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status,
        payload,
      } = isoResult;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    detail: async (params = defaultParams) => {
      const isoResult = await FETCH(SECONDARY_API_URLS.sales_order_item.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status,
        payload,
      } = isoResult;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    documents: async (params) => {
      const documentResult = await FETCH(SECONDARY_API_URLS.file_upload.url, { params: { ...defaultParams, ...params } }).then();
      const { status, payload } = documentResult;

      if (status === 'success') return payload;

      return { pagination: {}, ids: [], items: [] };
    },
    /***
     *
     Certificate of Conformance API
      Included in the api is a lookup for Inco Terms and Payment Terms
      GET: https://bapi.lasec.co.za/api/cert_of_conf/inco_terms
      GET: https://bapi.lasec.co.za/api/cert_of_conf/payment_terms
      To return the currently stored details for a ISO
      GET: https://bapi.lasec.co.za/api/cert_of_conf/{salesordernumber} aka https://bapi.lasec.co.za/api/cert_of_conf/509401
      When no Cert currently exists it returns the ISO detail as below:
      {
        "certificate_results": {
          "header": {
            "salesorder": "",
            "date_of_issue": "",
            "ucr_number": "",
            "certification": "",
            "date_of_expiry": "",
            "date_of_expiry_na": "",
            "customer_po_number": "",
            "inco_terms": "",
            "named_place": "",
            "payment_terms": "",
            "reason_for_export": "",
            "bill_to_address": "",
            "ship_to_address": "",
            "consignee_address": "",
            "consignee_contact": "",
            "consignee_extra_info": "",
            "notify_info": "",
            "comments": "",
            "staffuserid": "367",
            "SysproCompany": "SysproCompany2",
            "created": "2020-11-26"
          },
          "detail": [
            {
              "SysproCompany": "SysproCompany2",
              "salesorder": "000000000509401",
              "salesorderline": "1",
              "stockcode": "P2TIP018Y-010200R",
              "description": "TIPS N/FILTER YELLOW(PK 1000)",
              "quantity": "30.000000",
              "date_of_manufacture": "",
              "date_of_manufacture_na": "",
              "lot_number": "",
              "date_of_expiry": "",
              "date_of_expiry_na": ""
            },
            {
              "SysproCompany": "SysproCompany2",
              "salesorder": "000000000509401",
              "salesorderline": "2",
              "stockcode": "GLAS1S16M11410012",
              "description": "SLIDE MIC 1ST FRS B/E PW(PK 50)",
              "quantity": "200.000000",
              "date_of_manufacture": "",
              "date_of_manufacture_na": "",
              "lot_number": "",
              "date_of_expiry": "",
              "date_of_expiry_na": ""
            },
            {
              "SysproCompany": "SysproCompany2",
              "salesorder": "000000000509401",
              "salesorderline": "3",
              "stockcode": "P3TIP018B-001000",
              "description": "TIPS N/FILTER BLUE(PK 1000)",
              "quantity": "6.000000",
              "date_of_manufacture": "",
              "date_of_manufacture_na": "",
              "lot_number": "",
              "date_of_expiry": "",
              "date_of_expiry_na": ""
            }
          ]
        }
      }

      NOTE: If any of the documents have already been created, their header info will be pulled in instead of the ISO header info !!!
      NB: the detail section can have multiple entries
      To save a new packing list and its detail do:
      POST: https://bapi.lasec.co.za/api/cert_of_conf/{salesordernumber} aka https://bapi.lasec.co.za/api/cert_of_conf/484584
      Payload will be:
      $post = array(
      "header" => array(
        "salesorder" => "484584",
        "date_of_issue" => "2020-01-28",
        "certification" => "2020-01-28",
        "date_of_expiry" => "2020-02-28",
        "date_of_expiry_na" => N,
        "customer_po_number" => "405047",
        "inco_terms" => "6",
        "named_place" => "7",
        "payment_terms" => "30 DAYS NETT",
        "reason_for_export" => "SALE",
        "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
        "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
        "consignee_address" => "3",
        "consignee_contact" => "4",
        "consignee_extra_info" => "5",
        "notify_info" => "6",
        "comments" => "7",
      ),
      "detail" => array(array(
          "salesorderline" => 1,
          "salesorder" => "484584",
          "stockcode" => "ABC",
          "description" => "BLA BLA BLA",
          "quantity" => "2",
          "date_of_manufacture" => "2020-02-28",
          "date_of_manufacture_na" => "N",
          "lot_number" => "71",
          "date_of_expiry" => "2020-02-28",
          "date_of_expiry_na" => "N"
      )));

    NB: Once again multiple entries can be in detail section for each package
    To update a existing listing:
    PUT: https://bapi.lasec.co.za/api/cert_of_conf/{salesordernumber} aka https://bapi.lasec.co.za/api/cert_of_conf/484584
    Payload will be:
    $post = array(
        "header" => array(
            "salesorder" => "484584",
            "date_of_issue" => "2020-01-28",
            "certification" => "2020-01-28",
            "date_of_expiry" => "2020-02-28",
            "date_of_expiry_na" => N,
            "customer_po_number" => "405047",
            "inco_terms" => "6",
            "named_place" => "7",
            "payment_terms" => "30 DAYS NETT",
            "reason_for_export" => "SALE",
            "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
            "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
            "consignee_address" => "3",
            "consignee_contact" => "4",
            "consignee_extra_info" => "5",
            "notify_info" => "6",
            "comments" => "7",
        ),
        "detail" => array(array(
            "salesorderline" => 1,
            "salesorder" => "484584",
            "stockcode" => "ABC",
            "description" => "BLA BLA BLA",
            "quantity" => "2",
            "date_of_manufacture" => "2020-02-28",
            "date_of_manufacture_na" => "N",
            "lot_number" => "71",
            "date_of_expiry" => "2020-02-28",
            "date_of_expiry_na" => "N"
        )));
     */
    get_certificate_of_conformance: async (sales_order_id: string): Promise<any> => {

      const inco_terms_for_sales_order = await Api.get(`api/cert_of_conf/inco_terms`).then();
      /**
       *
       * Result is HashMap
        {
          "N/A": "N/A => Not Applicable",
          "CFR": "CFR => Cost and Freight",
          "CIF": "CIF => Cost,Insurance and Freight",
          "CIP": "CIP => Carriage and Insurance Paid",
          "CPT": "CPT => Carriage Paid To",
          "DAP": "DAP => Delivered at Place",
          "DAT": "DAT => Delivered at Terminal",
          "DDP": "DDP => Delivered Duty Paid",
          "EXW": "EXW => Ex Works",
          "FAS": "FAS => Free Alongside Ship",
          "FCA": "FCA => Free Carrier",
          "FOB": "FOB => Free on Board"
        }
       *
       */
      logger.debug(`Inco Terms Result`, inco_terms_for_sales_order);

      let inco_terms: any[] = [];

      try {

        if (inco_terms_for_sales_order && Object.keys(inco_terms_for_sales_order).length > 0) {
          Object.keys(inco_terms_for_sales_order).forEach((prop) => {

            if (`${inco_terms_for_sales_order[prop]}`.indexOf("=>") > 0) {
              inco_terms.push({
                id: prop,
                name: inco_terms_for_sales_order[prop].split('=>')[1].trim(),
                description: inco_terms_for_sales_order[prop].split('=>')[1].trim(),
              })
            } else {
              inco_terms.push({
                id: prop,
                name: inco_terms_for_sales_order[prop],
                description: inco_terms_for_sales_order[prop]
              });
            }
          })

          logger.debug(`Inco Terms Converted`, inco_terms);
        }

      } catch (convertError) {
        logger.error(`Could not convert inco term data`, convertError);
      }

      let payment_terms: any[] = [];

      try {
        const payment_terms_for_sales_orders = await Api.get(`api/cert_of_conf/payment_terms`).then();
        /**
         * Result is hash map
         *
         *
            {
              "30": "30 DAYS NETT",
              "45": "45 DAYS NETT",
              "60": "60 DAYS NETT",
              "90": "90 DAYS NETT",
              "COD": "COD"
            }
         *
         *
         */


        logger.debug(`result for payment terms for sales orders`, payment_terms_for_sales_orders);
        if (payment_terms_for_sales_orders && Object.keys(payment_terms_for_sales_orders).length > 0) {
          Object.keys(payment_terms_for_sales_orders).forEach((prop) => {
            payment_terms.push({
              id: prop,
              name: payment_terms_for_sales_orders[prop],
              description: payment_terms_for_sales_orders[prop],
            });
          });
        }
        logger.debug(`Payment Terms Result`, payment_terms);
      } catch (error) {
        logger.error('Could not conver payment terms data', error);
      }

      const new_shape = {
        'header.salesorder': 'id',
        'header.date_of_isse': 'date_of_issue',
        'header.certification': 'certification_date',
        'header.payment_terms': 'terms',
        'header.inco_terms': "inco_terms",
        'header.named_place': "final_destination",
        'header.reason_for_export': 'export_reason',
        'header.bill_to_address': 'bill_to_address',
        'header.ship_to_address': 'ship_to_address',
        'header.consignee_address': 'consignee_street_address',
        'header.consignee_contact': 'consignee_contact',
        'header.notify_info': 'notify_info',
        'header.comments': 'comments',
        'detail[].salesorderline': 'products[].item_number',
        'detail[].salesorder': 'products[].sales_order',
        'detail[].SysproCompany': 'products[].syspro_company',
        'detail[].stockcode': 'products[].stock_code',
        'detail[].description': 'products[].description',
        'detail[].quantity': 'products[].qty',
        'detail[].date_of_manufacture': 'products[].date_of_manufacture',
        'detail[].date_of_manufacture_na': {
          key: 'products[].date_of_manufacture_na',
          transform: (v: any) => { return new Boolean(v) === true; },
          default: false
        },
        'detail[].lot_number': 'products[].lot_no',
        'detail[].date_of_expiry': 'products[].expire_date',
        'detail[].date_of_expiry_na': {
          key: 'products[].expire_date_na',
          transform: (v: any) => { return new Boolean(v) === true; },
          default: false
        },
      };

      const existing_shape = {
        'header.salesorder': 'id',
        'header.date_of_isse': 'date_of_issue',
        'header.certification': 'certification_date',
        'header.payment_terms': 'terms',
        'header.inco_terms': "inco_terms",
        'header.named_place': "final_destination",
        'header.reason_for_export': 'export_reason',
        'header.bill_to_address': 'bill_to_address',
        'header.ship_to_address': 'ship_to_address',
        'header.consignee_address': 'consignee_street_address',
        'header.consignee_contact': 'consignee_contact',
        'header.notify_info': 'notify_info',
        'header.comments': 'comments',
        'detail[].salesorderline': 'products[].item_number',
        'detail[].salesorder': 'products[].sales_order',
        'detail[].SysproCompany': 'products[].syspro_company',
        'detail[].stockcode': 'products[].stock_code',
        'detail[].description': 'products[].description',
        'detail[].quantity': 'products[].qty',
        'detail[].date_of_manufacture': 'products[].date_of_manufacture',
        'detail[].date_of_manufacture_na': {
          key: 'products[].date_of_manufacture_na',
          transform: (v: any) => { return new Boolean(v) === true; },
          default: false
        },
        'detail[].lot_number': 'products[].lot_no',
        'detail[].date_of_expiry': 'products[].expire_date',
        'detail[].date_of_expiry_na': {
          key: 'products[].expire_date_na',
          transform: (v: any) => { return new Boolean(v) === true; },
          default: false
        },
      };

      let certificate_results = null;
      try {
        certificate_results = await Api.get(`api/cert_of_conf/${sales_order_id}`).then();
        let is_new = true;
        let converted: any = om.merge(certificate_results, is_new === true ? new_shape : existing_shape);

        converted.lookups = {
          inco_terms,
          payment_terms
        };

        logger.debug(`Certificate Response From API:\n ${JSON.stringify(certificate_results, null, 2)}`);

        converted.products.forEach((product_item: any, index: number) => {
          product_item.id = `${sales_order_id}:${index}`
          if (product_item.date_of_manufacture_na === null || product_item.date_of_manufacture_na === undefined) {
            product_item.date_of_manufacture_na = false;
          }

          if (product_item.expire_date === null || product_item.expire_date === undefined) {
            product_item.expire_date_na = false;
          }
        });

        return {
          id: sales_order_id,
          emailAddress: '',
          sendOptionsVia: 'pdf',
          ...converted,
        };
      } catch (error) {

        logger.error(`Could not get certificate results: ${error.message}`, { error });
      }

    },

    /**
      * Specifications for POST
      *      
        * header" => array(
            "salesorder" => "484584",
            "date_of_issue" => "2020-01-28",
            "certification" => "2020-01-28",
            "date_of_expiry" => "2020-02-28",
            "date_of_expiry_na" => N,
            "customer_po_number" => "405047",
            "inco_terms" => "6",
            "named_place" => "7",
            "payment_terms" => "30 DAYS NETT",
            "reason_for_export" => "SALE",
            "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
            "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
            "consignee_address" => "3",
            "consignee_contact" => "4",
            "consignee_extra_info" => "5",
            "notify_info" => "6",
            "comments" => "7",
        ),
        "detail" => array(array(
            "salesorderline" => 1,
            "salesorder" => "484584",
            "stockcode" => "ABC",
            "description" => "BLA BLA BLA",
            "quantity" => "2",
            "date_of_manufacture" => "2020-02-28",
            "date_of_manufacture_na" => "N",
            "lot_number" => "71",
            "date_of_expiry" => "2020-02-28",
            "date_of_expiry_na" => "N"
        )));
     * 
     * @param sales_order_id 
     * @param certificate 
     */
    post_certificate_of_conformance: async (sales_order_id: string, certificate: any): Promise<any> => {

      const input_data: any = om.merge(certificate, {
        'id': 'header.salesorder',
        'date_of_issue': [
          { key: 'header.date_of_issue', transform: safe_date_transform, default: "" },
          { key: 'header.certification', transform: safe_date_transform, default: "" }
        ],
        'date_of_expiry': { key: 'header.date_of_expiry', transform: safe_date_transform, default: () => { "" } },
        'date_of_expiry_na': { key: 'header.date_of_expiry_na', transform: (value: Boolean) => { value ? "Y" : "N" }, default: 'N' },
        'po_number': { key: 'header.customer_po_number', transform: (v: any) => `${v ? v : "NOT SET"}`, default: "NOT SET" },
        'document_number': { key: 'header.ucr_number', transform: (v: any) => { return v ? v : 'N/A' }, default: "N/A" },
        'inco_terms': 'header.inco_terms',
        'final_destination': 'header.named_place',
        'terms': 'header.payment_terms',
        'export_reason': 'header.reason_for_export',
        'consignee_contact': 'header.consignee_contact',
        'consignee_number': 'header.consignee_extra_info',
        'comments': 'header.comments',
        'products': {
          key: 'detail',
          transform: (products: any[]) => {
            return products.map((certificate_item: any, index: number) => {



              return {
                salesorderline: certificate_item.item_number || index,
                salesorder: sales_order_id,
                stockcode: certificate_item.stock_code,
                description: certificate_item.description,
                quantity: certificate_item.qty,
                date_of_manufacture: `${safe_date_transform(certificate_item.date_of_manufacture)}`,
                date_of_manufacture_na: certificate_item.date_of_manufacture_na === true ? "Y" : "N",
                lot_no: certificate_item.lot_no,
                date_of_expiry: `${safe_date_transform(certificate_item.date_of_expiry)}`,
                date_of_expiry_na: certificate_item.date_of_expiry_na === true ? "Y" : "N",
              };

            })
          }
        }
      });

      const format_address = (fieldname: string = 'bill_to', document: any) => {

        const sections = {
          company: document[`${fieldname}_company`] || "",
          street_address: document[`${fieldname}_street_address`] || "",
          suburb: document[`${fieldname}_suburb`] || "",
          city: document[`${fieldname}_city`] || "",
          province: document[`${fieldname}_province`] || "",
          country: document[`${fieldname}_country`] || "",
        }

        return `${sections.company}${sections.company !== "" ? ', ' : ''}${sections.street_address}${sections.street_address !== "" ? ', ' : ''}${sections.suburb}${sections.suburb !== "" ? ', ' : ''}${sections.city}${sections.city !== "" ? ', ' : ''}${sections.province}${sections.province !== "" ? ', ' : ''}${sections.country}`;
      }

      input_data.header.bill_to_address = format_address('bill_to', certificate);
      input_data.header.ship_to_address = format_address('ship_to', certificate);
      input_data.header.consignee_address = format_address('consignee', certificate);

      try {
        logger.debug(`Sending certificate input to API`, { input_data });
        let certificate_result = await Api.post(`api/cert_of_conf/${sales_order_id}`, input_data, undefined, true).then();
        logger.debug(`🔢Certificate Result`, { certificate_result });
        return {
          id: sales_order_id,
          pdf_url: certificate_result.url,
        };
      } catch (create_error) {
        logger.debug("Could not create the certificate due to an error", { create_error });
        throw create_error;
      }
    },

    put_certificate_of_conformance: async (sales_order_id: string, certificate: any): Promise<any> => {

      return {
        id: sales_order_id,
        pdf_url: null,
      };
    },

    //commercial invoice

    /**
     *
     *
     * Commercial Invoice API
      Included in the api is a lookup for Inco Terms and Payment Terms
      GET: https://bapi.lasec.co.za/api/com_invoice/inco_terms
      GET: https://bapi.lasec.co.za/api/com_invoice/payment_terms
      To return the currently stored details for a ISO
      GET: https://bapi.lasec.co.za/api/com_invoice/{salesordernumber} aka https://bapi.lasec.co.za/api/com_invoice/484584
      When no Invoice currently exists it returns the ISO detail as below:
      
      {
        "status": "success",
        "payload": {
          "header": {
            "salesorder": "00000 0000012114",
            "ucr_number": "0ZA00857074012114",
            "date_of_issue": "2020-12-14",
            "date_of_expiry": "2021-01-13",
            "date_of_expiry_na": 0,
            "customer_po_number": "1043917",
            "inco_terms": "CPT",
            "named_place": "Parmalat, Gaborone, Botswana",
            "payment_terms": "60 DAYS NETT",
            "bill_to_address": "PLOT 22026/27 TAKATOKWANE RD,GABORONE,BOTSWANA",
            "ship_to_address": "Botswana Quality Laboratory,Plot 22026/7,G West Industrial,Gaborone,BOTSWANA",
            "consignee_contact": "",
            "consignee_address": "",
            "notify_contact1": "",
            "notify_address1": "",
            "notify_contact2": "",
            "notify_address2": "",
            "comments": "",
            "comments_bottom": "",
            "currency": "",
            "freight": 0,
            "insurance": 0,
            "deposit": 0,
            "discount": 0,
            "vat": 0,
            "staffuserid": "367",
            "SysproCompany": "SysproCompany4",
            "created": "2020-12-14",
            "reason_for_export": "SALE"
          },
          "items": [
            {
              "SysproCompany": "SysproCompany4",
              "salesorder": "000000000012114",
              "salesorderline": "1",
              "stockcode": "GLSC6600",
              "description": "LACTOGENSIMETER FOR MILK(EA)",
              "quantity": "2.000000",
              "unit_price": "2030.51000"
            },      
          ]
        }
      }


      NOTE: If any of the documents have already been created, their header info will be pulled in instead of the ISO header info !!!
      NB: the detail section can have multiple entries
      To save a new packing list and its detail do:
      POST: https://bapi.lasec.co.za/api/com_invoice/{salesordernumber} aka https://bapi.lasec.co.za/api/com_invoice/484584
      Payload will be:
      $post = array(
          "header" => array(
              "salesorder" => "000000000484584",
              "date_of_issue" => "2020-01-28",
              "ucr_number" => "N/A",
              "date_of_expiry" => "2020-02-28",
              "date_of_expiry_na" => "N",
              "customer_po_number" => "405047",
              "inco_terms" => "6",
              "named_place" => "7",
              "payment_terms" => "30 DAYS NETT",
              "reason_for_export" => "SALE",
              "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
              "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
              "consignee_address" => "Con Address",
              "consignee_contact" => "Con Contact",
              "notify_contact1" => "Not Contact 1",
              "notify_address1" => "Not Address 1",
              "notify_contact2" => "Not Contact 2",
              "notify_address2" => "Not Address 2",
              "comments" => "The Comments",
              "comments_bottom" => "The Comments Bottom",
              "currency" => "USD",
              "freight" => "7.00",
              "insurance" => "7.00",
              "deposit" => "7.00",
              "discount" => "7.00",
              "vat" => "N",
              "SysproCompany" => "SysproCompany2",
              "staffuserid" => 122,
              "created" => "2020-01-28"
          ),
          "detail" => array(array(
              "salesorderline" => 1,
              "salesorder" => "000000000484584",
              "stockcode" => "ABC",
              "description" => "BLA BLA BLA",
              "quantity" => "51",
              "unit_price" => "61.00"
          )));

      NB: Once again multiple entries can be in detail section for each package
      To update a existing listing:
      PUT: https://bapi.lasec.co.za/api/com_invoice/{salesordernumber} aka https://bapi.lasec.co.za/api/com_invoice/484584
      Payload will be:
      $post = array(
          "header" => array(
              "salesorder" => "000000000484584",
              "date_of_issue" => "2020-01-28",
              "ucr_number" => "N/A",
              "date_of_expiry" => "2020-02-28",
              "date_of_expiry_na" => "N",
              "customer_po_number" => "405047",
              "inco_terms" => "6",
              "named_place" => "7",
              "payment_terms" => "30 DAYS NETT",
              "reason_for_export" => "SALE",
              "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
              "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
              "consignee_address" => "Con Address",
              "consignee_contact" => "Con Contact",
              "notify_contact1" => "Not Contact 1",
              "notify_address1" => "Not Address 1",
              "notify_contact2" => "Not Contact 2",
              "notify_address2" => "Not Address 2",
              "comments" => "The Comments",
              "comments_bottom" => "The Comments Bottom",
              "currency" => "USD",
              "freight" => "7.00",
              "insurance" => "7.00",
              "deposit" => "7.00",
              "discount" => "7.00",
              "vat" => "N",
              "SysproCompany" => "SysproCompany2",
              "staffuserid" => 122,
              "created" => "2020-01-28"
          ),
          "detail" => array(array(
              "salesorderline" => 1,
              "salesorder" => "000000000484584",
              "stockcode" => "ABC",
              "description" => "BLA BLA BLA",
              "quantity" => "51",
              "unit_price" => "61.00"
          )));
     *
     */

    get_commercial_invoice: async (sales_order_id: string): Promise<any> => {

      //const inco_terms = await Api.get(`api/com_invoice/inco_terms`, {}).then();
      //logger.debug(`Inco Terms Result`, inco_terms);

      //const payment_terms = await Api.get(`api/com_invoice/payment_terms`).then();
      //logger.debug(`Payment Terms Result`, payment_terms);



      const inco_terms_for_sales_order = await Api.get(`api/cert_of_conf/inco_terms`).then();
      /**
       *
       * Result is HashMap
        {
          "N/A": "N/A => Not Applicable",
          "CFR": "CFR => Cost and Freight",
          "CIF": "CIF => Cost,Insurance and Freight",
          "CIP": "CIP => Carriage and Insurance Paid",
          "CPT": "CPT => Carriage Paid To",
          "DAP": "DAP => Delivered at Place",
          "DAT": "DAT => Delivered at Terminal",
          "DDP": "DDP => Delivered Duty Paid",
          "EXW": "EXW => Ex Works",
          "FAS": "FAS => Free Alongside Ship",
          "FCA": "FCA => Free Carrier",
          "FOB": "FOB => Free on Board"
        }
       *
       */
      logger.debug(`Inco Terms Result`, inco_terms_for_sales_order);

      let inco_terms: any[] = [];

      try {

        if (inco_terms_for_sales_order && Object.keys(inco_terms_for_sales_order).length > 0) {
          Object.keys(inco_terms_for_sales_order).forEach((prop) => {

            if (`${inco_terms_for_sales_order[prop]}`.indexOf("=>") > 0) {
              inco_terms.push({
                id: prop,
                name: inco_terms_for_sales_order[prop].split('=>')[1].trim(),
                description: inco_terms_for_sales_order[prop].split('=>')[1].trim(),
              })
            } else {
              inco_terms.push({
                id: prop,
                name: inco_terms_for_sales_order[prop],
                description: inco_terms_for_sales_order[prop]
              });
            }
          })

          logger.debug(`Inco Terms Converted`, inco_terms);
        }

      } catch (convertError) {
        logger.error(`Could not convert inco term data`, convertError);
      }

      let payment_terms: any[] = [];

      try {
        const payment_terms_for_sales_orders = await Api.get(`api/cert_of_conf/payment_terms`).then();
        /**
         * Result is hash map
         *
         *
            {
              "30": "30 DAYS NETT",
              "45": "45 DAYS NETT",
              "60": "60 DAYS NETT",
              "90": "90 DAYS NETT",
              "COD": "COD"
            }
         *
         *
         */


        logger.debug(`result for payment terms for sales orders`, payment_terms_for_sales_orders);
        if (payment_terms_for_sales_orders && Object.keys(payment_terms_for_sales_orders).length > 0) {
          Object.keys(payment_terms_for_sales_orders).forEach((prop) => {
            payment_terms.push({
              id: prop,
              name: payment_terms_for_sales_orders[prop],
              description: payment_terms_for_sales_orders[prop],
            });
          });
        }
        logger.debug(`Payment Terms Result`, payment_terms);
      } catch (error) {
        logger.error('Could not conver payment terms data', error);
      }


      const shape = {
        'header.salesorder': 'id',
        'header.date_of_isse': 'date_of_issue',
        'header.certification': 'certification_date',
        'header.payment_terms': 'terms',
        'header.inco_terms': "inco_terms",
        'header.named_place': "final_destination",
        'header.reason_for_export': 'export_reason',
        'header.bill_to_address': 'bill_to_address',
        'header.ship_to_address': 'ship_to_address',
        'header.consignee_address': 'consignee_street_address',
        'header.consignee_contact': 'consignee_contact',
        'header.notify_contact': 'notify_info',
        'header.comments': 'comments',
        'items': [
          {
            key: 'products',
            /**
             * 
             * @param source   
              {
                "SysproCompany": "SysproCompany4",
                "salesorder": "000000000012114",
                "salesorderline": "1",
                "stockcode": "GLSC6600",
                "description": "LACTOGENSIMETER FOR MILK(EA)",
                "quantity": "2.000000",
                "unit_price": "2030.51000"
              },                
             */
            transform: (source_array: any[]) => {
              logger.debug(`🔀 Transforming results - get_commercial_invoice`, source_array)
              let items = source_array.map((source: any) => {
                let item = {
                  id: `${source.salesorder}-${source.salesorderline}`,
                  syspro_company: source.SysproCompany,
                  item_number: source.salesorderline,
                  stock_code: source.stockcode,
                  description: source.description,
                  qty: parseFloat(source.quantity || "0"),
                  freight: parseFloat(source.freight || "0"),
                  insurance: parseFloat(source.insurance || "0"),
                  discount: parseFloat(source.discount),
                  has_vat: source.has_vat === true
                };

                return item;
              });


              return items;
            }
          }],


      };

      try {
        const commercial_invoice = await Api.get(`api/com_invoice/${sales_order_id}`, null, shape).then();
        logger.debug(`Commercial Invoice Response From API ${commercial_invoice.status}`, { commercial_invoice: commercial_invoice });
        return {
          id: sales_order_id,
          emailAddress: '',
          sendOptionsVia: 'email',
          lookups: {
            inco_terms,
            payment_terms
          },
          ...commercial_invoice,
        };

      } catch (get_invoice_error) {
        logger.error(`Error while getting the commercial invoice from the API ${get_invoice_error.message}`, get_invoice_error);
        throw get_invoice_error;
      }
    },

    post_commercial_invoice: async (sales_order_id: string, commercial_invoice: any): Promise<any> => {

      /**
       * 
       * 
       POST: https://bapi.lasec.co.za/api/com_invoice/{salesordernumber} aka https://bapi.lasec.co.za/api/com_invoice/484584
      Payload will be:
      $post = array(
          "header" => array(
              "salesorder" => "000000000484584",
              "date_of_issue" => "2020-01-28",
              "ucr_number" => "N/A",
              "date_of_expiry" => "2020-02-28",
              "date_of_expiry_na" => "N",
              "customer_po_number" => "405047",
              "inco_terms" => "6",
              "named_place" => "7",
              "payment_terms" => "30 DAYS NETT",
              "reason_for_export" => "SALE",
              "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
              "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
              "consignee_address" => "Con Address",
              "consignee_contact" => "Con Contact",
              "notify_contact1" => "Not Contact 1",
              "notify_address1" => "Not Address 1",
              "notify_contact2" => "Not Contact 2",
              "notify_address2" => "Not Address 2",
              "comments" => "The Comments",
              "comments_bottom" => "The Comments Bottom",
              "currency" => "USD",
              "freight" => "7.00",
              "insurance" => "7.00",
              "deposit" => "7.00",
              "discount" => "7.00",
              "vat" => "N",
              "SysproCompany" => "SysproCompany2",
              "staffuserid" => 122,
              "created" => "2020-01-28"
          ),
          "detail" => array(array(
              "salesorderline" => 1,
              "salesorder" => "000000000484584",
              "stockcode" => "ABC",
              "description" => "BLA BLA BLA",
              "quantity" => "51",
              "unit_price" => "61.00"
          )));
       * 
       */


      const input_data: any = om.merge(commercial_invoice, {
        'id': 'header.salesorder',
        'date_of_issue': [
          { key: 'header.date_of_issue', transform: safe_date_transform, default: "" },
          { key: 'header.certification', transform: safe_date_transform, default: "" }
        ],
        'date_of_expiry': { key: 'header.date_of_expiry', transform: safe_date_transform, default: () => { "" } },
        'date_of_expiry_na': { key: 'header.date_of_expiry_na', transform: (value: Boolean) => { value ? "Y" : "N" }, default: 'N' },
        'po_number': { key: 'header.customer_po_number', transform: (v: any) => `${v ? v : "NOT SET"}`, default: "NOT SET" },
        'document_number': { key: 'header.ucr_number', transform: (v: any) => { return v ? v : 'N/A' }, default: "N/A" },
        'inco_terms': 'header.inco_terms',
        'final_destination': 'header.named_place',
        'terms': 'header.payment_terms',
        'export_reason': 'header.reason_for_export',
        'consignee_contact': 'header.consignee_contact',
        'consignee_number': 'header.consignee_extra_info',
        'comments': 'header.comments',
        'notes': 'header.comments_bottom',
        'products': {
          key: 'detail',
          transform: (products: any[]) => {
            return products.map((certificate_item: any, index: number) => {


              return {
                salesorderline: certificate_item.item_number || index,
                salesorder: sales_order_id,
                stockcode: certificate_item.id ||certificate_item.stock_code,
                description: certificate_item.description,
                quantity: certificate_item.qty,
                unit_price: certificate_item.unit_price
              };

            })
          }
        }
      });

      const format_address = (fieldname: string = 'bill_to', document: any) => {

        const sections = {
          company: document[`${fieldname}_company`] || "",
          street_address: document[`${fieldname}_street_address`] || "",
          suburb: document[`${fieldname}_suburb`] || "",
          city: document[`${fieldname}_city`] || "",
          province: document[`${fieldname}_province`] || "",
          country: document[`${fieldname}_country`] || "",
        }

        return `${sections.company}${sections.company !== "" ? ', ' : ''}${sections.street_address}${sections.street_address !== "" ? ', ' : ''}${sections.suburb}${sections.suburb !== "" ? ', ' : ''}${sections.city}${sections.city !== "" ? ', ' : ''}${sections.province}${sections.province !== "" ? ', ' : ''}${sections.country}`;
      }

      input_data.header.bill_to_address = format_address('bill_to', commercial_invoice);
      input_data.header.ship_to_address = format_address('ship_to', commercial_invoice);
      input_data.header.consignee_address = format_address('consignee', commercial_invoice);

      try {
        logger.debug(`Sending invoice input to API`, { input_data });
        let invoice_result = await Api.post(`api/com_invoice/${sales_order_id}`, input_data, undefined, true).then();
        logger.debug(`🔢 Invoice Result`, {  invoice_result });
        return {
          id: sales_order_id,
          pdf_url: invoice_result.url,
        };
      } catch (create_error) {
        logger.debug("Could not create the certificate due to an error", { create_error });
        throw create_error;
      }

    },

    put_commercial_invoice: async (sales_order_id: string, certificate: any): Promise<any> => {

      return {
        id: sales_order_id,
        pdf_url: null,
      };
    },

    //packing list
    /***
     *
      Packing list API
      Included in the api is a lookup for Inco Terms and Payment Terms
      GET: https://bapi.lasec.co.za/api/packing_list/inco_terms
      GET: https://bapi.lasec.co.za/api/packing_list/payment_terms
      To return the currently stored details for a ISO
      GET: https://bapi.lasec.co.za/api/packing_list/{​​​​​​​​salesordernumber}​​​​​​​​ aka https://bapi.lasec.co.za/api/packing_list/484584
      When no packing list exists for the ISO it returns:
      {
                "status":"success",
        "payload": {​​​​​​​​
            "header": {​
                     "SysproCompany":"SysproCompany2",
              "salesorder":"000000000509466",
              "ucr_number":null,
              "date_of_issue":"2020-11-17",
              "date_of_expiry":"2020-12-17",
              "date_of_expiry_na":0,
              "customer_po_number":"7154",
              "inco_terms":null,
              "named_place":null,
              "payment_terms":"30 DAYS NETT",
              "reason_for_export":"SALE",
              "bill_to_address":"PO BOX 735,WORCESTER,WESTERN CAPE,6850",
              "ship_to_address":"Breerivier Vallei Bottelerings Ko-Op,BPK, , 018 High St, Paglande,Worcester, 6580, South Africa",
              "consignee_address":"","consignee_contact":"","consignee_extra_info":"","notify_info":"","comments":"","staffuserid":"122","created":"2020-11-17 13:30:25.000000"}​​​​​​​​,
              "detail":[
                {
                          "SysproCompany":"",
                  "salesorder":"",
                  "detail_id":"",
                  "type":"",
                  "quantity":"",
                  "height":"",
                  "width":"",
                  "length":"",
                  "weight":""
                }
                      ]
            }
                  }​​​​​​​​
        }
      }

      When a entry does exists:
      {
                "status":"success",
        "payload": {
                  "header": {
                    "SysproCompany":"SysproCompany2",
            "salesorder":"000000000484584",
            "ucr_number":"N\\/A",
            "date_of_issue":"2020-01-28",
            "date_of_expiry":"2020-02-28",
            "date_of_expiry_na":"1",
            "customer_po_number":"405047",
            "inco_terms":"6",
            "named_place":"7",
            "payment_terms":"30 DAYS NETT",
            "reason_for_export":"SALE","bill_to_address":"PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
            "ship_to_address":"Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
            "consignee_address":"3","consignee_contact":"4","consignee_extra_info":"5","notify_info":"6","comments":"7","staffuserid":"122","created":"2020-11-17 13:43:22"}​​​​​​​​,
            "detail":[
              {
                        "SysproCompany":"SysproCompany2",
                "salesorder":"000000000484584",
                "detail_id":"1",
                "type":"boxes",
                "quantity":"5.0000",
                "height":"51.0000",
                "width":"61.0000",
                "length":"71.0000",
                "weight":"81.0000"
              }
            ]
          }
        }
      }
                 '
      NB: the detail section can have multiple entries
      To save a new packing list and its detail do:
      POST: https://bapi.lasec.co.za/api/packing_list/{​​​​​​​​salesordernumber}​​​​​​​​ aka https://bapi.lasec.co.za/api/packing_list/484584
      Payload will be:
      $post = array(
      "header" => array(
        "salesorder" => "484584",
        "ucr_number" => "N/A",
        "date_of_issue" => "2020-01-28",
        "date_of_expiry" => "2020-02-28",
        "date_of_expiry_na" => 0,
        "customer_po_number" => "405047",
        "inco_terms" => "6",
        "named_place" => "7",
        "payment_terms" => "30 DAYS NETT",
        "reason_for_export" => "SALE",
        "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
        "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
        "consignee_address" => "3",
        "consignee_contact" => "4",
        "consignee_extra_info" => "5",
        "notify_info" => "6",
        "comments" => "7"
    ),
    "detail" => array(array(
        "salesorder" => "484584",
        "SysproCompany" => "SysproCompany2",
        "type" => "boxes",
        "quantity" => "5",
        "height" => "51",
        "width" => "61",
        "length" => "71",
        "weight" => "81"
    )));

NB: Once again multiple entries can be in detail section for each package
To update a existing listing:
PUT: https://bapi.lasec.co.za/api/packing_list/{​​​​​​​​salesordernumber}​​​​​​​​ aka https://bapi.lasec.co.za/api/packing_list/484584
Payload will be:
$post = array(
    "header" => array(
        "salesorder" => "484584",
        "ucr_number" => "N/A",
        "date_of_issue" => "2020-01-28",
        "date_of_expiry" => "2020-02-28",
        "date_of_expiry_na" => 0,
        "customer_po_number" => "405047",
        "inco_terms" => "6",
        "named_place" => "7",
        "payment_terms" => "30 DAYS NETT",
        "reason_for_export" => "SALE",
        "bill_to_address" => "PO BOX 524,AUCKLAND PARK,GAUTENG,2006",
        "ship_to_address" => "Room 2104, 2nd floor, John Orr,building, 37 Nind St, Doornfontein,Johannesburg, South Africa",
        "consignee_address" => "3",
        "consignee_contact" => "4",
        "consignee_extra_info" => "5",
        "notify_info" => "6",
        "comments" => "7",
    ),
    "detail" => array(array(
        "detail_id" => 13,
        "salesorder" => "484584",
        "type" => "boxes",
        "quantity" => "5",
        "height" => "51",
        "width" => "61",
        "length" => "71",
        "weight" => "81"
    )));

NB: note the addition of the detail_id for the line been updated


     *
     *
     */

    get_packing_list: async (sales_order_id: string): Promise<any> => {

      //const inco_terms = await Api.get(`api/packing_list/inco_terms`, {}).then();
      //logger.debug(`Inco Terms Result`, inco_terms);

      //const payment_terms = await Api.get(`api/packing_list/payment_terms`).then();
      //logger.debug(`Payment Terms Result`, payment_terms);

      const inco_terms_for_sales_order = await Api.get(`api/cert_of_conf/inco_terms`).then();
      /**
       *
       * Result is HashMap
        {
          "N/A": "N/A => Not Applicable",
          "CFR": "CFR => Cost and Freight",
          "CIF": "CIF => Cost,Insurance and Freight",
          "CIP": "CIP => Carriage and Insurance Paid",
          "CPT": "CPT => Carriage Paid To",
          "DAP": "DAP => Delivered at Place",
          "DAT": "DAT => Delivered at Terminal",
          "DDP": "DDP => Delivered Duty Paid",
          "EXW": "EXW => Ex Works",
          "FAS": "FAS => Free Alongside Ship",
          "FCA": "FCA => Free Carrier",
          "FOB": "FOB => Free on Board"
        }
       *
       */
      logger.debug(`Inco Terms Result`, inco_terms_for_sales_order);

      let inco_terms: any[] = [];

      try {

        if (inco_terms_for_sales_order && Object.keys(inco_terms_for_sales_order).length > 0) {
          Object.keys(inco_terms_for_sales_order).forEach((prop) => {

            if (`${inco_terms_for_sales_order[prop]}`.indexOf("=>") > 0) {
              inco_terms.push({
                id: prop,
                name: inco_terms_for_sales_order[prop].split('=>')[1].trim(),
                description: inco_terms_for_sales_order[prop].split('=>')[1].trim(),
              })
            } else {
              inco_terms.push({
                id: prop,
                name: inco_terms_for_sales_order[prop],
                description: inco_terms_for_sales_order[prop]
              });
            }
          })

          logger.debug(`Inco Terms Converted`, inco_terms);
        }

      } catch (convertError) {
        logger.error(`Could not convert inco term data`, convertError);
      }

      let payment_terms: any[] = [];

      try {
        const payment_terms_for_sales_orders = await Api.get(`api/cert_of_conf/payment_terms`).then();
        /**
         * Result is hash map
         *
         *
            {
              "30": "30 DAYS NETT",
              "45": "45 DAYS NETT",
              "60": "60 DAYS NETT",
              "90": "90 DAYS NETT",
              "COD": "COD"
            }
         *
         *
         */


        logger.debug(`result for payment terms for sales orders`, payment_terms_for_sales_orders);
        if (payment_terms_for_sales_orders && Object.keys(payment_terms_for_sales_orders).length > 0) {
          Object.keys(payment_terms_for_sales_orders).forEach((prop) => {
            payment_terms.push({
              id: prop,
              name: payment_terms_for_sales_orders[prop],
              description: payment_terms_for_sales_orders[prop],
            });
          });
        }
        logger.debug(`Payment Terms Result`, payment_terms);
      } catch (error) {
        logger.error('Could not conver payment terms data', error);
      }

      const shape = {
        'header.salesorder': 'id',
        'header.date_of_isse': 'date_of_issue',
        'header.certification': 'certification_date',
        'header.payment_terms': 'terms',
        'header.inco_terms': "inco_terms",
        'header.named_place': "final_destination",
        'header.reason_for_export': 'export_reason',
        'header.bill_to_address': 'bill_to_address',
        'header.ship_to_address': 'ship_to_address',
        'header.consignee_address': 'consignee_street_address',
        'header.consignee_contact': 'consignee_contact',
        'header.notify_info': 'notify_info',
        'header.comments': 'comments',
        'detail': [
          {
            key: 'packing_list',
            /**
             * 
             * @param source                             
             *  "SysproCompany": "SysproCompany4",
                "salesorder": "",
                "detail_id": "",
                "type": "",
                "quantity": "",
                "height": "",
                "width": "",
                "length": "",
                "weight": ""
             */
            transform: (source_array: any[]) => {
              logger.debug(`🔀 Transforming results - get_commercial_invoice`, source_array)
              let items = source_array.map((source: any) => {

                let item = {
                  id: `${source.salesorder}-${source.salesorderline}`,
                  syspro_company: source.SysproCompany,
                  pallet_type: source.type,
                  quantity: source.quanity,
                  width: source.width,
                  height: source.height,
                  length: source.length,
                  weight: source.weight
                };

                return item;
              });

              return items;
            }
          }],
      };

      try {
        const packing_list_result = await Api.get(`api/packing_list/${sales_order_id}`, null, shape).then();

        logger.debug(`Pakcing list Response From API ${packing_list_result.status}`, { certificate_results: packing_list_result });

        return {
          id: sales_order_id,
          emailAddress: '',
          sendOptionsVia: 'email',
          lookups: {
            inco_terms,
            payment_terms
          },
          ...packing_list_result,
        };
      } catch (get_packing_list_error) {

        logger.error(`Could not get the packing list from the remote server: ${get_packing_list_error.message}`, { get_packing_list_error });

        throw get_packing_list_error;

      }

    },

    post_packing_list: async (sales_order_id: string, certificate: any): Promise<any> => {

      const input_data: any = om.merge(certificate, {
        'id': 'header.salesorder',
        'date_of_issue': [
          { key: 'header.date_of_issue', transform: safe_date_transform, default: "" },
          { key: 'header.certification', transform: safe_date_transform, default: "" }
        ],
        'date_of_expiry': { key: 'header.date_of_expiry', transform: safe_date_transform, default: () => { "" } },
        'date_of_expiry_na': { key: 'header.date_of_expiry_na', transform: (value: Boolean) => { value ? "Y" : "N" }, default: 'N' },
        'po_number': { key: 'header.customer_po_number', transform: (v: any) => `${v ? v : "NOT SET"}`, default: "NOT SET" },
        'document_number': { key: 'header.ucr_number', transform: (v: any) => { return v ? v : 'N/A' }, default: "N/A" },
        'inco_terms': 'header.inco_terms',
        'final_destination': 'header.named_place',
        'terms': 'header.payment_terms',
        'export_reason': 'header.reason_for_export',
        'consignee_contact': 'header.consignee_contact',
        'consignee_number': 'header.consignee_extra_info',
        'comments': 'header.comments',
        'products': {
          key: 'detail',
          transform: (products: any[]) => {
            return products.map((certificate_item: any, index: number) => {



              return {
                salesorderline: certificate_item.item_number || index,
                salesorder: sales_order_id,
                stockcode: certificate_item.stock_code,
                description: certificate_item.description,
                quantity: certificate_item.qty,
                date_of_manufacture: `${safe_date_transform(certificate_item.date_of_manufacture)}`,
                date_of_manufacture_na: certificate_item.date_of_manufacture_na === true ? "Y" : "N",
                lot_no: certificate_item.lot_no,
                date_of_expiry: `${safe_date_transform(certificate_item.date_of_expiry)}`,
                date_of_expiry_na: certificate_item.date_of_expiry_na === true ? "Y" : "N",
              };

            })
          }
        }
      });

      const format_address = (fieldname: string = 'bill_to', document: any) => {

        const sections = {
          company: document[`${fieldname}_company`] || "",
          street_address: document[`${fieldname}_street_address`] || "",
          suburb: document[`${fieldname}_suburb`] || "",
          city: document[`${fieldname}_city`] || "",
          province: document[`${fieldname}_province`] || "",
          country: document[`${fieldname}_country`] || "",
        }

        return `${sections.company}${sections.company !== "" ? ', ' : ''}${sections.street_address}${sections.street_address !== "" ? ', ' : ''}${sections.suburb}${sections.suburb !== "" ? ', ' : ''}${sections.city}${sections.city !== "" ? ', ' : ''}${sections.province}${sections.province !== "" ? ', ' : ''}${sections.country}`;
      }

      input_data.header.bill_to_address = format_address('bill_to', certificate);
      input_data.header.ship_to_address = format_address('ship_to', certificate);
      input_data.header.consignee_address = format_address('consignee', certificate);

      try {
        logger.debug(`Sending certificate input to API`, { input_data });
        let certificate_result = await Api.post(`api/cert_of_conf/${sales_order_id}`, input_data, undefined, true).then();
        logger.debug(`🔢Certificate Result`, { certificate_result });
        return {
          id: sales_order_id,
          pdf_url: certificate_result.url,
        };
      } catch (create_error) {
        logger.debug("Could not create the certificate due to an error", { create_error });
        throw create_error;
      }
    },

    put_packing_list: async (sales_order_id: string, certificate: any): Promise<any> => {

      return {
        id: sales_order_id,
        pdf_url: null,
      };
    },


    deleteDocument: async (params) => {
      const deleteDocumentResult = await DELETE(SECONDARY_API_URLS.file_upload.url + params.id, {}).then();
      return deleteDocumentResult;
    },
    createSalesOrder: async (sales_order_input: LasecCreateSalesOrderInput) => {

      const data = {
        warehouse_id: sales_order_input.preffered_warehouse,
        has_confirm_payment: true,
        type_of_order: sales_order_input.order_type,
        vat: sales_order_input.vat_number || '-',
        purchase_order_number: sales_order_input.purchase_order_number,
        purchase_order_amount: sales_order_input.quoted_amount,
        shipping_date: moment(sales_order_input.shipping_date).toISOString(),
        do_not_part_supply: sales_order_input.part_supply === false,
        CUSTOMER_DELIVERY_ADDRESS_tag_value_id: sales_order_input.delivery_address_id,
        CUSTOMER_DELIVERY_ADDRESS_tag_value: sales_order_input.delivery_address,
        confirm_purchase_order_number: sales_order_input.confirm_number,
        has_confirmed_purchase_order_amount: sales_order_input.amounts_confirmed === true,
        delivery_address_id: sales_order_input.delivery_address_id,
        quote_id: sales_order_input.quote_id,
      };
      /*
      {
        "warehouse_id": "10",
        "has_confirm_payment": true,
        "type_of_order": "normal",
        "vat": "-",
        "purchase_order_number": "33224455",
        "purchase_order_amount": 438624,
        "shipping_date": "2020-11-30T12:53:17.000Z",
        "do_not_part_supply": false,
        "CUSTOMER_DELIVERY_ADDRESS_tag_value_id": "19847",
        "CUSTOMER_DELIVERY_ADDRESS_tag_value": "Medcare Products, Unit 13, South Cape Industrial Park, Leo Rd, Diep River, Cape Town, 7800, South Africa",
        "confirm_purchase_order_number": "33224455",
        "has_confirmed_purchase_order_amount": true,
        "delivery_address_id": "19847",
        "quote_id": "2010-107367000"
      }

      */

      /**

      {
        "warehouse_id": "10",
        "has_confirm_payment": true,
        "type_of_order": "normal",
        "shipping_date": "2020-11-27T16:40:00.000Z",
        "do_not_part_supply": true,
        "CUSTOMER_DELIVERY_ADDRESS_tag_value_id": "14305",
        "CUSTOMER_DELIVERY_ADDRESS_tag_value": "18 High St, Worcester, 6849, South Africa",
        "confirm_purchase_order_number": "12345",
        "delivery_address_id": "14305",
        "quote_id": "2011-106326070"
      }*/


      try {
        logger.debug(`Creating new Sales Order input =>`, { data });

        const create_api_result = await POST(SECONDARY_API_URLS.sales_order.url, data).then();
        logger.debug(`Result from new Sales Order =>`, { create_api_result });

        if (create_api_result.status === 'success') {

          const update_data = {
            item_id: [create_api_result.payload.id],
            values: {
              communication_method: sales_order_input.method_of_contact,
              on_day_contact_person: sales_order_input.on_day_contact,
              on_day_contact_person_contact_number: sales_order_input.contact_number,
              status: 'writing_to_syspro'
            }
          };

          const put_result = await PUT(`api/sales_order/${create_api_result.payload.id}/`, update_data).then();
          if (put_result.status === 'success') {
            return put_result.payload
          } else {
            throw new ApiError(`Could not complete sales order: ${put_result.message}`, put_result);
          }
        } else {
          throw new ApiError(`Created Sales Order ${create_api_result.payload.id} but could not update the data.`);
        }
      } catch (createSalesOrder) {
        logger.error('Could not create sales order', createSalesOrder);
        if (createSalesOrder instanceof ApiError) throw createSalesOrder;
        else throw new ApiError('Could not create a new sales order - remote API error', { createSalesOrder });
      }

    },
    checkPONumberExists: async (company_id: string, purchase_order_number: string): Promise<{ exists: boolean, sales_order_id?: string }> => {
      try {
        logger.debug(`Checking if Purchase Order number exists: company id: ${company_id}, ${purchase_order_number}`);
        const { payload = null, status = 'failed' }: { payload: { po_number_exists: boolean, sales_order_id?: string }, status: string } = await POST(SECONDARY_API_URLS.check_po_number_exists.url, { company_id, purchase_order_number }).then();
        if (status === 'success' && payload) {
          logger.debug('Results from checking if purchase order exists', { status, payload });
          return {
            exists: payload.po_number_exists === true,
            sales_order_id: payload.sales_order_id || 'not-set'
          };
        }
        throw new LasecApiException('Did not get a successfull response from Lasec API');
      } catch (poNumberError) {
        logger.error(`lasec Api.SalesOrders.checkPONumberExists: ${poNumberError.message}`, poNumberError);
        if (poNumberError instanceof LasecApiException) throw poNumberError;
        else throw new ApiError(`Error while checking if the purchase order number exists`, { __type: 'lasec.api.UnhandledError', error: poNumberError });
      }
    },
  },
  Quotes: {
    list: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    getLineItem: async (id: string) => {
      try {
        const result = await FETCH(SECONDARY_API_URLS.quote_items.url, { params: { ...defaultParams, filter: { ids: [id] } } }).then()

        const { status, payload } = result;
        if (status === 'success' && payload.items && payload.items.length === 1) {
          return payload.items[0]
        } else {
          logger.warn(`Could not get the line item with the id ${id}`);
          return null;
        }
      } catch (err) {
        logger.error(`Get Line Item Failed ${err.message}`, err);
        return null;
      }
    },
    getLineItems: async (code, active_option, page_size = 25, page = 1): Promise<any> => {

      let filter = { quote_id: code }
      if (typeof active_option === 'string') {
        filter.quote_option_id = active_option
        delete filter.quote_id;
      }


      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_items.url, {

        params: {
          ...defaultParams,
          filter,
          pagination: {
            enabled: true,
            page_size: page_size,
            current_page: page
          }
        }
      }).then();

      logger.debug(`QUOTE ITEM IDS RESPONSE:: ${JSON.stringify(apiResponse)}`);

      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        //collet the ids
        if (payload && payload.ids) {

          /**
           *
           *    "num_items": 313,
                "has_prev_page": false,
                "current_page": 1,
                "last_item_index": 20,
                "page_size": 20,
                "has_next_page": true,
                "num_pages": 16,
                "first_item_index": 1
           */

          const item_paging: Reactory.IPagingResult = {
            hasNext: payload.pagination.has_next_page,
            page: payload.pagination.current_page,
            total: payload.pagination.num_items,
            pageSize: payload.pagination.page_size
          }

          const lineItemsExpanded = await FETCH(SECONDARY_API_URLS.quote_items.url, { params: { ...defaultParams, filter: { ids: payload.ids } } }).then()

          logger.debug(`QUOTE ITEM PAYLOAD RESPONSE:: ${JSON.stringify(apiResponse)}`);

          if (lineItemsExpanded.status === 'success') {
            return { line_items: lineItemsExpanded.payload, item_paging };
          }
        }
        return { line_items: [], item_paging: null };
      }

      return { line_items: [], item_paging: null };
    },
    get: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_get.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    getByQuoteId: async (quote_id, objectMap = defaultQuoteObjectMap) => {
      try {
        const payload = await Api.Quotes.get({ filter: { ids: [quote_id] } }).then();
        if (payload) {
          logger.debug(`Api Response successful fetching quote id ${quote_id}`, payload);
          const quotes = payload.items || [];
          if (isArray(quotes) === true && quotes.length >= 1) {
            //return om(quotes[0], objectMap);
            /* const mappedQuote = om(quotes[0], {
              'id': 'id',
              'status_id': 'status',
              'substatus_id': 'statusGroup',
              'customer_full_name': 'customer.fullName',
              'customer_id': 'customer.id',
              'allowed_status_ids': 'allowedStatus',
              'company_trading_name': 'company.fullName',
              'comapny_id': 'company.id',
              'staff_user_full_name': 'timeline[0].who.firstName',
              'primary_api_staff_user_id': 'timeline[0].who.id',
              'created': ['created', 'timeline[0].when'],

            });
            */
            return quotes[0];
          }
          if (quotes.length === 0) {
            logger.debug('No Matching Document found');
            return null;
          }
        } else {
          logger.warn(`Call to LASEC API for Quote did not return successfully, ${status}`, payload);
          return null;
        }

        return null;
      } catch (quoteFetchError) {
        logger.error(`An error occured while fetching the quote document ${quote_id}`, quoteFetchError);
        throw quoteFetchError;
      }
    },
    getQuoteOption: async (optionId: string) => {
      try {
        const apiResponse = await FETCH(SECONDARY_API_URLS.quote_option.url, { params: { filter: { ids: [optionId] } } }).then();
        const {
          status, payload,
        } = apiResponse;

        if (status === 'success' && payload.items.length === 1) {
          logger.debug(`Found Quote Option on LasecAPI`, { item: payload.items[0] })
          return payload.items[0];
        }

        return null;
      } catch (error) {
        logger.error(`An error occured while fetching the quote document ${optionId}`, error);
        throw error;
      }
    },
    getQuoteOptions: async (optionIds: string[]) => {
      try {
        const apiResponse = await FETCH(SECONDARY_API_URLS.quote_option.url, { params: { filter: { ids: optionIds } } }).then();
        const {
          status, payload,
        } = apiResponse;

        if (status === 'success') {
          logger.debug(`Found Quote Options on LasecAPI`, { items: payload.items })
          return payload;
        }

        return { pagination: {}, ids: [], items: [] };
      } catch (error) {
        logger.error(`An error occured while fetching the quote options from LasecAPI`, error);
        throw error;
      }
    },
    createQuoteOption: async (quote_id: string) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_option.url, { quote_id }).then();
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`CreateQuoteOption response status: ${status}  payload: ${payload} id: ${id}`);
        if (status === 'success') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error(`Error Creating Quote Option ${lasecApiError.message}`);
        return null;
      }
    },
    patchQuoteOption: async (quote_id: string, quote_option_id: string, option: any) => {
      try {
        const apiResponse = await PUT(`${SECONDARY_API_URLS.quote_option.url}1/`, {
          item_ids: quote_option_id, field_name: {
            name: option.option_name,
            ...option,
          }
        }).then();
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`patch quote options response: ${status}  payload: ${payload} id: ${id}`);
        if (status === 'success') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error patching the quote options');
        return null;
      }
    },
    copyQuoteOption: async (quote_id: string, quote_option_id: string) => {
      try {
        const apiResponse = await POST(`${SECONDARY_API_URLS.quote_option.url}${quote_option_id}/duplicate_quote_option/`, { quote_option_id, quote_id }).then();
        const {
          status, payload,
        } = apiResponse;

        logger.debug(`Duplicating response status: ${status}  payload: ${payload} id: ${quote_option_id}`);
        if (status === 'success') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    deleteQuoteOption: async (quote_id: string, quote_option_id: string) => {
      try {
        const apiResponse = await DELETE(`${SECONDARY_API_URLS.quote_option.url}${quote_option_id}`, { quote_id }).then();
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`deleteQuoteOption response status: ${status}  payload: ${payload} id: ${id}`);
        if (status === 'success') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    getQuoteHeaders: async (quote_id: string) => {
      try {
        const header_response = await FETCH(SECONDARY_API_URLS.quote_section_header.url, {
          params:
          {
            filter: { quote_id },
            format: { ids_only: true },
            ordering: { heading: 'asc' },
            pagination: { current_page: 1, page_size: 100, enabled: false }
          }
        })
        logger.debug(`🟠 getQuoteHeaders ids response`, { header_response });
        if (header_response.payload.ids) {
          let details = await FETCH(SECONDARY_API_URLS.quote_section_header.url,
            {
              params: {
                filter: { ids: [...header_response.payload.ids] },
                ordering: {},
                pagination: { current_page: 1, page_size: 100 }
              }
            });
          logger.debug(`🟢 getQuoteHeaders details response`, { details });
          if (details && details.payload && details.payload.items) {
            return details.payload.items
          }
        }

        return [];
      }
      catch (lapiError) {
        logger.error(`🚨 getQuoteHeaders(quote_id) Remote API Error: ${lapiError.message}`, { lapiError });

        return [];
      }
    },
    addItemToQuoteHeader: async (params: { quote_id: string, quote_item_id: number, heading_id: string, heading: string }) => {

    },
    setQuoteHeadingText: async (params: { quote_id: string, quote_item_id: number, heading_id: string, heading: string }) => {

      const { quote_id, quote_item_id, heading } = params;

      try {
        const apiResponse = await PUT(SECONDARY_API_URLS.quote_section_header.url, { body: { quote_id, quote_item_id, heading: heading } }).then();
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`CreateQuoteHeader response status: ${status}  payload: ${payload} id: ${id}`);
        if (status === 'success') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    createQuoteHeader: async ({ quote_id, quote_item_id, header_text }) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_section_header.url, { quote_id, quote_item_id, heading: header_text }).then();
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`CreateQuoteHeader response status: ${status}  payload: ${payload} id: ${id}`);
        if (status === 'success') {
          return payload;
        } else throw new ApiError(`Could not create the header item for quote ${quote_id}`)
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    removeItemFromHeader: async ({ quote_id, quote_item_id, quote_heading_id }) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_section_header, { body: { id: quote_heading_id, quote_id, quote_item_id } }).then();
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`CreateQuoteHeader response status: ${status}  payload: ${payload} id: ${id}`);

        if (status === 'success') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    removeQuoteHeader: async ({ quote_heading_id }) => {
      try {
        const apiResponse = await DELETE(SECONDARY_API_URLS.quote_section_header.url, { id: quote_heading_id }).then();
        const {
          status,
          payload
        } = apiResponse;

        logger.debug(`Deleted quote header: ${status}  payload: ${payload}`);

        if (status === 'success') {
          return null;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        throw lasecApiError;
      }
    },

    createNewQuoteForClient: async (params) => {
      try {
        // api/create_quote/
        // {customer_id: "18231", secondary_api_staff_user_id: "335", status: "draft"}
        params.status = 'draft';
        const url = `api/create_quote/`;
        const apiResponse = await POST(url, { ...params });

        const { status } = apiResponse;
        if (status === 'success') return apiResponse;

      } catch (lasecApiError) {
        logger.error(`[INDEX] Error creating new quote for client :: ${JSON.stringify(lasecApiError)}`).then();
        return null;
      }
    },

    copyQuoteToCustomer: async (params) => {
      try {
        // api/quote/2008-104335000/copy_quote_to_customer/
        const url = `api/quote/${params.quoteId}/copy_quote_to_customer/`;
        const apiResponse = await POST(url, { ...params }); // {quote_id: "2008-104335000", customer_id: "14826"}

        logger.debug(`COPY QUOTE RESPONSE:: ${JSON.stringify(apiResponse)}`);

        const { status } = apiResponse;

        if (status === 'success') {
          return apiResponse;
        }

      } catch (lasecApiError) {
        logger.error(`Error creating new organisation:: ${JSON.stringify(lasecApiError)}`).then();
        return null;
      }
    },


    addProductToQuote: async (quote_id: string, option_id: string, product_id: string) => {
      try {
        const url = `api/quote_item/`;
        const apiResponse = await POST(url, {
          product_id: product_id,
          quantity: 1,
          quote_id: quote_id,
          quote_option_id: option_id
        });
        logger.debug(`ADDING QUOTE ITEM RESPONSE:: ${JSON.stringify(apiResponse)}`);
        const { status } = apiResponse;
        if (status === 'success') {
          return apiResponse;
        }
        return null;
      } catch (lasecApiError) {
        logger.error(`Error adding product item:: ${JSON.stringify(lasecApiError)}`);
        return null;
      }
    },
    updateQuote: async (params) => {
      try {
        // {"item_id":"2008-335010","values":{"quote_type":"Normal"}}
        const url = `api/quote/${params.item_id}`;

        params.item_ids = [params.item_id];
        delete params.item_id;

        const apiResponse = await PUT(url, { ...params });
        logger.debug(`UPDATE QUOTE RESPONSE:: ${JSON.stringify(apiResponse)}`);
        const { status } = apiResponse;
        if (status === 'success') {
          return apiResponse;
        }
        return null;
      } catch (lasecApiError) {
        logger.error(`Error updating quote:: ${JSON.stringify(lasecApiError)}`);
        return null;
      }
    },
    updateQuoteItems: async (params) => {
      try {
        // expected params
        // {item_id: "2008", values: { quantity: 1, unit_price_cents: 123, gp_percent: 2, mark_up: 20, total_price_cents: 100 }}
        logger.debug(`CALLING WITH PARAMS:: ${JSON.stringify(params)}`);
        const url = `api/quote_item/${params.item_id}`;
        const apiResponse = await PUT(url, { ...params });
        logger.debug(`UPDATE LINEITEMS RESPONSE:: ${JSON.stringify(apiResponse)}`);

        const { status } = apiResponse;

        if (status === 'success') {
          return apiResponse;
        }

      } catch (lasecApiError) {
        logger.error(`Error updating quote lineitems:: ${JSON.stringify(lasecApiError)}`);
        return null;
      }
    },
    deleteQuoteItem: async (quote_item_id: string) => {
      try {
        logger.debug(`DELETE QUOTE ITEM ${quote_item_id}`);
        const url = `api/quote_item/${quote_item_id}/`;
        const apiResponse = await DELETE(url, {}).then();
        logger.debug(`DELETE QUOTE RESPONSE:: ${JSON.stringify(apiResponse)}`);

        const { status } = apiResponse;

        if (status === 'success') {
          return { success: true, message: `Quote item deleted` };
        } else {
          return { success: false, message: `Quote item not deleted` };
        }

      } catch (lasecApiError) {
        logger.error(`Error deleting quote:: ${JSON.stringify(lasecApiError)}`);
        return { success: false, message: `Quote item not deleted` };;
      }
    },
    deleteQuote: async (id) => {
      try {
        logger.debug(`DELETE QUOTE :: ${id}`);
        const url = `api/quote/${id}/`;
        const apiResponse = await DELETE(url, {}).then();

        logger.debug(`DELETE QUOTE RESPONSE:: ${JSON.stringify(apiResponse)}`);

        const { status } = apiResponse;

        if (status === 'success') {
          return apiResponse;
        }

      } catch (lasecApiError) {
        logger.error(`Error deleting quote:: ${JSON.stringify(lasecApiError)}`);
        return null;
      }
    },
    getQuotePDF: async (quote_id: string, download: boolean = false) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_create_pdf.url(quote_id), { quote_id }).then();
        logger.debug(`Get Quote PDF response`, apiResponse)
        const {
          status, payload,
        } = apiResponse;

        if (status === 'success') {
          return payload;
        }

        return { pagination: {}, ids: [], items: [] };
      } catch (error) {
        logger.error(`An error occured while fetching the quote document ${optionId}`, error);
        throw error;
      }
    },
    getQuoteProforma: async (quote_id: string, download: boolean = false) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_request_create_proforma.url(quote_id), { quote_id }).then();
        logger.debug(`Get Quote Proforma response`, apiResponse)
        const {
          status, payload,
        } = apiResponse;

        if (status === 'success') {
          if (download === false) return payload;
          else {
            const download_result = await fetch(payload.url, { method: 'GET' }).then()
          }
        }

        return { pagination: {}, ids: [], items: [] };
      } catch (error) {
        logger.error(`An error occured while fetching the quote document ${optionId}`, error);
        throw error;
      }
    },
    getIncoTerms: async () => {
      let incoterms_response = await FETCH(SECONDARY_API_URLS.incoterms.url).then();
      const { status, payload } = incoterms_response;

      let results: any[] = [];
      if (payload && Object.keys(payload).length > 0) {
        Object.keys(payload).forEach((prop) => {

          if (`${payload[prop]}`.indexOf("=>") > 0) {
            results.push({
              key: prop,
              title: payload[prop].split('=>')[1].trim()
            })
          } else {
            results.push({
              key: prop,
              title: payload[prop]
            });
          }
        })
      }

      logger.debug(`Get inco terms response returned `, { results });

      return results;
    },
    getQuoteTransportModes: async () => {
      let incoterms_response = await FETCH(SECONDARY_API_URLS.transport_modes.url).then();
      const { status, payload } = incoterms_response;

      let results: any[] = payload.items || [];

      logger.debug(`Get quote transport modes returned `, { results });

      return results;
    },
  },
  Teams: {
    list: async () => {
      return await FETCH(SECONDARY_API_URLS.groups.url, {
        params: {
          ...defaultParams,
          filter: {
            "ids": ["LAB101", "LAB102", "LAB103", "LAB104", "LAB105", "LAB106", "LAB107", "LAB121"]
          }
        }
      }, true).then();
    },
  },
  User: {
    getLasecUser: async (staff_user_id) => {
      try {
        logger.debug(`Getting Lasec User With Staff User Id ${staff_user_id}`)
        const lasecStaffUserResponse = await FETCH(SECONDARY_API_URLS.staff_user_data.url, {
          ...defaultParams,
          filter: {
            staff_user_id: [staff_user_id]
          }
        }, true, false, 0)
          .then();

        if (lasecStaffUserResponse.status === 'success' && lasecStaffUserResponse.payload) {
          if (isArray(lasecStaffUserResponse.payload) && lasecStaffUserResponse.payload.length === 1) {
            return lasecStaffUserResponse.payload[0];
          } else {
            return lasecStaffUserResponse.payload;
          }
        }

        return null;
      } catch (apiError) {
        logger.error('Could not execute fetch for user data against staff user api', apiError);
        return null;
      }

    },

    getLasecUsers: async (ids = [], fieldName = "ids") => {

      let params = { filter: {} };
      let users = [];
      let user_ids_to_request = [];
      params.filter[fieldName] = ids;

      logger.debug(`LasecAPI.User.getLasecUsers(ids = ${ids}, fieldName = ${fieldName})`)

      const lasecStaffUserResponse = await FETCH(SECONDARY_API_URLS.staff_user_data.url, {
        params,
        pagination: {
          enabled: true,
          page_size: 20,
        }
      }, true, false, 0).then();

      if (lasecStaffUserResponse.status === "success" && lasecStaffUserResponse.payload) {

        if (isArray(lasecStaffUserResponse.payload.items) === true && fieldName === "ids") {
          logger.debug(`LasecApi.getLasecUsers() =>  (${lasecStaffUserResponse.payload.items}) items response`);
          users = [...lasecStaffUserResponse.payload.items];
        }

        if (isArray(lasecStaffUserResponse.payload.ids) === true && lasecStaffUserResponse.payload.ids.length > 0) {

          const { pagination } = lasecStaffUserResponse.payload;

          logger.debug(`LasecApi.getLasecUsers() =>  (${lasecStaffUserResponse.payload.ids}) ids response`);
          if (pagination && pagination.has_next_page === true) {
            /**
             *
              "pagination": {
                "num_items": 313,
                "has_prev_page": false,
                "current_page": 1,
                "last_item_index": 20,
                "page_size": 20,
                "has_next_page": true,
                "num_pages": 16,
                "first_item_index": 1
              },
             */

            user_ids_to_request = [...lasecStaffUserResponse.payload.ids];

            let promises = [];
            for (let pageIndex = lasecStaffUserResponse.payload.pagination.current_page + 1; pageIndex <= pagination.num_pages; pageIndex += 1) {
              promises.push(FETCH(SECONDARY_API_URLS.staff_user_data.url, {
                params,
                pagination: {
                  enabled: true,
                  current_page: pageIndex,
                  page_size: pagination.page_size,
                }
              }, true, false, 0));
            }



            let allIdResponses = await Promise.all(promises).then();
            promises = [];

            allIdResponses.forEach((idsResponse) => {
              if (idsResponse.status === "success" && idsResponse.payload.ids) {
                user_ids_to_request = concat(user_ids_to_request, idsResponse.payload.ids)
              }
            });

            user_ids_to_request = uniq(user_ids_to_request);

            logger.debug(`Must Fetch Ids ${user_ids_to_request}`);
          }
        }

        if (user_ids_to_request.length > 0) {
          let allItemResponse = await FETCH(SECONDARY_API_URLS.staff_user_data.url, {
            params: {
              filter: {
                "ids": user_ids_to_request
              },
            }
          }, true, false, 0).then();

          if (allItemResponse && allItemResponse.status === "success" && allItemResponse.payload.items) {
            users = [...users, ...allItemResponse.payload.items];
          }
        }


      } else {
        logger.error("Could not load Lasec Users", lasecStaffUserResponse);
        throw new ApiError("Did not get a good response from remote api");
      }

      return users;
    },

    getUserTargets: async (ids = [], fieldName = "ids") => {
      try {
        logger.debug(`LasecApi.User.getUserTargets( ids = ${ids} , fieldName = ${fieldName} )`);
        const users = await Api.User.getLasecUsers(ids, fieldName).then();
        logger.debug(`Found ${users.length} results for user targets`, users);
        let total = 0;
        users.forEach(user => total += (user.target | 0));
        return total;
      } catch (getUsersErrors) {
        logger.error(`Error getting users and calculating targets ${getUsersErrors.message}`);
        return 0;
      }
    },

    setActiveCompany: async (company = 3) => {
      return await POST(`${SECONDARY_API_URLS.staff_user_data.url}set_active_company`, { company }).then();
    }
  },
  Authentication: {
    login: async (username, password) => {
      return await POST(SECONDARY_API_URLS.login_lasec_user.url, { username, password }, false).then();
    },
  },
  Exceptions: {
    LasecNotAuthenticatedException,
    TokenExpiredException,
  },
};

export default Api;

