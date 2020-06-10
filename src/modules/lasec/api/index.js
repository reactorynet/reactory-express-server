'use strict'
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import om from 'object-mapper';
import { isObject, map, find, isArray, isNil, concat, uniq } from 'lodash';
import moment from 'moment';
import axios from 'axios';
// import { clearAuthentication } from '../actions/Auth';
import SECONDARY_API_URLS from './SecondaryApiUrls';
import logger from '../../../logging';
import ApiError from '../../../exceptions';
import AuthenticationSchema from '../schema/Authentication';
import { jzon } from '../../../utils/validators';

import LasecDatabase from '../database';
import LasecQueries from '../database/queries';
import { execql, execml } from 'graph/client';

import { LASEC_API_ERROR_FORMAT } from './constants';

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

export const DUPLICATE_LOADING_ERROR_MESSAGE = 'DUPLICATE_LOADING_ERROR_MESSAGE';
export const DUPLICATE_SAVING_ERROR_MESSAGE = 'DUPLICATE_SAVING_ERROR_MESSAGE';
export const SETTINGS_NOT_CONFIGURED = 'SETTINGS_NOT_CONFIGURED';

export function stringifyIds(ids) {
  const x = map(ids, (id) => { return `${id}`; });
  return x;
}

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
  throw new Error('How?');
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

export async function FETCH(url = '', fethArguments = {}, mustAuthenticate = true, failed = false, attempt = 0) {
  // url = `${url}`;
  let absoluteUrl = `${config.SECONDARY_API_URL}/${url}`;

  const kwargs = fethArguments || {};
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

  if (!kwargs.credentials) {
    kwargs.credentials = 'same-origin';
  }

  if (kwargs.params) {
    const paramPayload = JSON.stringify(kwargs.params);
    absoluteUrl += `?params=${paramPayload}`;
  }

  if (isObject(kwargs.body)) {
    kwargs.body = JSON.stringify(kwargs.body);
  }

  logger.debug(`Making fetch call with ${absoluteUrl}`, kwargs);

  const apiResponse = await fetch(absoluteUrl, kwargs).then();
  if (apiResponse.ok && apiResponse.status === 200 || apiResponse.status === 201) {
    try {
      return apiResponse.json();
    } catch (jsonError) {
      logger.error("JSON Error", jsonError);
      apiResponse.text().then(text => {
        logger.error(`Error Source: ${text}`);
      });
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
  get: async (uri, params, shape) => {
    const resp = await FETCH(uri, { params }).then();
    const {
      status, payload,
    } = resp;

    if (status === 'success') {
      if (shape && Object.keys(shape).length > 0) {
        return om(payload, shape);
      } else {
        return payload;
      }
    } else {
      return { pagination: {}, ids: [], items: [], status };
    }
  },
  post: async (uri, params, shape) => {
    const resp = await POST(uri,  params).then();
    const {
      status, payload,
    } = resp;

    logger.debug(`API POST Response ${resp}`);
    if (status === 'success') {
      if (shape && Object.keys(shape).length > 0) {
        return om(payload, shape);
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




      const kwargs =  {};
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
        if(fs.existsSync(filename) === true){
          const stream = fs.createReadStream(filename);
          kwargs.body = stream;
          let absoluteUrl = `${config.SECONDARY_API_URL}/${SECONDARY_API_URLS.file_uploads.url}/`;

          const form = new FormData(); //
          form.append('file', stream);
          // In Node.js environment you need to set boundary in the header field 'Content-Type' by calling method `getHeaders`
          const formHeaders = form.getHeaders();
          let uploadResult = await axios.post(absoluteUrl, form, { params: { }, headers: { ...kwargs.headers, ...formHeaders } }).then();
          logger.debug(`Uploaded document complete:\n\t ${uploadResult}`);
          const { status, payload } = uploadResult.data;
          if(status === 'sucess') {
            const fileData = uploadResult.data.payload;
            if(customerInfo && customerInfo.id) {
              uploadResult = await POST(`${SECONDARY_API_URLS.customer_documents}`, { document_ids: [ fileData.id ], customer_id: customerInfo.id }).then();
            }
            return {
              document: documentInfo,
              success: true,
              messsage: `${documentInfo.fileName}`
            };
          }  else {
            return {
              document: documentInfo,
              success: false,
              message: payload
            }
          }
        }
      } catch (exc) {
        logger.debug(`Could not upload file to endpoint:\n\t Exception ${ exc }`);
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

        // logger.debug(`UPDATE CLIENT DETAILS RESPONSE: ${JSON.stringify(apiResponse)}`);
        logger.debug(`PAYLOAD: ${JSON.stringify(payload)}`);

        if (status === 'success') {
          return {
            success: true,
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
    GetCustomerClassById: async (id) => {

      const resp = await FETCH(SECONDARY_API_URLS.customer_class.url, { params: { filter: { ids: [id] }, paging: {} } }).then();
      const {
        status, payload,
      } = resp;

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

      if (status === 'success') {
        return payload;
      } else {
        return apiResponse;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    getAddress: async (params) => {
      const resp = await FETCH(SECONDARY_API_URLS.address.url, { params: { ...defaultParams, ...params } }).then()
      const {
        status, payload,
      } = resp;

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
    }
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
    list: async (params = defaultParams) => {
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
      const isoResult = await FETCH(SECONDARY_API_URLS.sales_order.url, { params: { ...defaultParams, ...params } }).then();
      const {
        status,
        payload,
      } = isoResult;

      if (status === 'success') {
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    }
  },
  SalesOrders: {
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
    }
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

    getLineItems: async (code) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_items.url, { params: { ...defaultParams, filter: { quote_id: code } } }).then();
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {
        //collet the ids
        if (payload && payload.ids) {
          const lineItemsExpanded = await FETCH(SECONDARY_API_URLS.quote_items.url, { params: { ...defaultParams, filter: { ids: payload.ids } } }).then()
          if (lineItemsExpanded.status === 'success') {
            return lineItemsExpanded.payload;
          }
        }
        return [];
      }

      return [];
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
        /**
         * Sample payload
         * {
            "items": [
              {
                "id": "1906-101019000",
                "customer_id": "14729",
                "name": null,
                "number_of_items": 0,
                "description": null,
                "status": "Draft - Pending Submission",
                "status_id": "1-1",
                "substatus_id": "1",
                "status_name": "Draft - Pending Submission",
                "allowed_status_ids": [
                  "1-1",
                  "6-25"
                ],
                "organisation_id": null,
                "grand_total_excl_vat_cents": 259484,
                "grand_total_vat_cents": 38923,
                "grand_total_incl_vat_cents": 298407,
                "grand_total_discount_cents": 13900,
                "grand_total_discount_percent": 5,
                "gp_percent": 41,
                "actual_gp_percent": 99,
                "date_sent": null,
                "created": "2019-06-19T13:04:43.000000Z",
                "modified": "2019-09-25T15:17:47.000000Z",
                "expiration_date": "2019-10-25T00:00:00.000000Z",
                "note": null,
                "quote_option_ids": [
                  "46956"
                ],
                "site_inspection_status": false,
                "site_evaluation_required": false,
                "transportation_evaluation_required": false,
                "show_quote_totals": false,
                "valid_until": null,
                "primary_api_staff_user_id": "19",
                "secondary_api_staff_user_id": "19",
                "sales_team_id": "LAB101",
                "cc_self": false,
                "expired": false,
                "email": null,
                "email_recipient_ids": [
                  ""
                ],
                "eta_of_order": null,
                "can_create_salesorder": true,
                "quote_type": "Normal",
                "requires_authorisation": false,
                "emailed_as_staff_user_id": "19",
                "last_updated_as_staff_user_id": "19",
                "authorisation_status": "",
                "authorisation_requested_date": null,
                "on_hold": "N",
                "has_requested_authorisation": false,
                "is_quote_authorised": false,
                "is_quote_locked": false,
                "approvers_note": null,
                "request_auth_note": null,
                "company_id": "11503",
                "customer_full_name": "Zola Ngqabe",
                "company_trading_name": "CITY OF CAPE TOWN",
                "authorisation_requested_by_staff_user": null,
                "staff_user_full_name": "Admin User"
              }
            ]
          }
         */
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
            //mappedQuote = { ...quotes[0], ...mappedQuote }
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
    createQuoteHeader: async ({ quote_id, quote_item_id, header_text }) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_create_section_header, { body: { quote_id, quote_item_id, heading: header_text } }).then();
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
        const apiResponse = await DELETE(SECONDARY_API_URLS.quote_section_header, { body: { id: quote_heading_id } }).then();
        const {
          status,
        } = apiResponse;

        logger.debug(`Deleted quote header: ${status}  payload: ${payload} id: ${id}`);

        if (status === 'success') {
          return null;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        throw lasecApiError;
      }
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
                user_ids_to_request = concat(user_ids_to_request, idsResponse.payload.ids )
              }
            });

            user_ids_to_request = uniq(user_ids_to_request);

            logger.debug(`Must Fetch Ids ${user_ids_to_request}`);
          }
        }

        if(user_ids_to_request.length > 0) {
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

