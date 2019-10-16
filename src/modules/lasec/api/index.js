import fetch from 'node-fetch';
import om from 'object-mapper';
import { isObject, map, find, isArray, isNil } from 'lodash';
import moment from 'moment';
// import { clearAuthentication } from '../actions/Auth';
import SECONDARY_API_URLS from './SecondaryApiUrls';
import logger from '../../../logging';
import ApiError from '../../../exceptions';
import AuthenticationSchema from '../schema/Authentication';
import { jzon } from '../../../utils/validators';

const config = {
  WEBSOCKET_BASE_URL: 'wss://api.lasec.co.za/ws/',
  UI_BASE_URL: process.env.LASEC_UI_BASE_URL || 'https://l360.lasec.co.za',
  API_BASE_URL: process.env.API_BASE_URL || 'https://bapi.lasec.co.za',
  SECONDARY_API_URL: process.env.SECONDARY_API_URL || 'https://bapi.lasec.co.za',
  PRIMARY_API_URL_PREFIX_1: 'api',
  PRIMARY_API_URL_PREFIX_2: 'l360',
  SECONDARY_API_URL_PREFIX_1: 'api',
  GOOGLE_MAPS_API_KEY: 'XXXXXXXXXXXXX',
};


class LasecNotAuthenticatedException extends ApiError {
  constructor(message) {
    super(message, {
      __typename: 'lasec.api.LasecNotAuthenticatedException',
      redirect: '/360',
      componentResolver: 'lasec-crm.Login360'
    });        
  }
}

class TokenExpiredException extends ApiError {
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
  logger.info(`Lookup Security Storage ${key} on ${global.user.fullName()}`);
  let must_login = true;
  if (user._id) {
    const lasecAuth = user.getAuthentication('lasec');
    if(isNil(lasecAuth) === true) throw new LasecNotAuthenticatedException('Please login with your lasec 360 account');

    if (lasecAuth.props) {
      logger.debug(`Found login information for lasec ${lasecAuth}`);
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
          if (global.user.setAuthentication && loginResult) {          
            await global.user.setAuthentication({ 
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

export function POST(url, data, auth = true) {
  const args = { body: data, method: 'POST' };
  return FETCH(url, args, auth);
}

export function DELETE(url, data, auth = true) {
  const args = { body: data, method: 'DELETE' };
  return FETCH(url, args, auth);
}

export function PUT(url, data, auth = true) {
  const args = { body: data, method: 'PUT' };
  return FETCH(url, args, auth);
}

export async function FETCH(url, args, auth = true, failed = false, attempt = 0) {
  // url = `${url}`;  
  let absoluteUrl = `${config.SECONDARY_API_URL}/${url}`;

  logger.debug(`::lasec-api::FETCH(${absoluteUrl})\n`, { args, auth, failed, attempt });

  const kwargs = args || {};
  if (!kwargs.headers) {
    kwargs.headers = {};
    kwargs.headers['Content-type'] = 'application/json; charset=UTF-8';
  }

  if (auth === true) {
    const token = await getStorageItem('secondary_api_token').then();
    if (token) {
      kwargs.headers['Authorization'] = `Token ${token}`;
      kwargs.headers['Origin'] = 'http://localhost:3000';
      kwargs.headers['X-LASEC-AUTH'] = `Token ${token}`;
      kwargs.headers['X-CSRFToken'] = '';
    }
    // should throw an error if there is no token!
  } else {
    kwargs.headers['Authorization'] = 'Token null';
    kwargs.headers['Origin'] = 'http://localhost:3000';
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
  if(apiResponse.ok && apiResponse.status === 200 || apiResponse.status === 201 ) {
    logger.debug('Successful API call returning json body', { status: apiResponse.status });
    return apiResponse.json();
  } else {
    logger.warn(`Failed API call to ${absoluteUrl}`, { apiResponse });
    switch (apiResponse.status) {
      case 401:
      case 403: {
        // debugger;

        const retry =  async function retry(){
          logger.debug('Attempting to refetch', { attempt });
          if(attempt < 3) {
            return await FETCH(url, args, auth, true, attempt ? attempt + 1 : 1).then();   
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
        throw new ApiError('Could not execute fetch against Lasec API', apiResponse);
      }
    } 

  }  
}

const defaultParams = {
  filter: {}, ordering: {}, pagination: { enabled: false },
};

const defaultQuoteObjectMap = {

};

const Api = {
  Quotes: {
    list: async (params = defaultParams) => {      
      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_get.url, { params: { ...defaultParams, ...params } });
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {        
        return payload;
      }

      return { pagination: {}, ids: [], items: [] };
    },
    
    getLineItems: async (code) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_items.url, { params: { ...defaultParams, filter: { quote_id: code } } });
      const {
        status, payload,
      } = apiResponse;

      if (status === 'success') {        
        //collet the ids
        debugger;
        return [];
      }

      return [];
    },
    get: async (params = defaultParams) => {
      const apiResponse = await FETCH(SECONDARY_API_URLS.quote_get.url, { params: { ...defaultParams, ...params } });
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
        const apiResponse = await POST(SECONDARY_API_URLS.quote_create_section_header, { body: { quote_id, quote_item_id, heading: header_text } });
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`CreateQuoteHeader response status: ${status}  payload: ${payload} id: ${id}`);
        if (status === 'sucess') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    removeItemFromHeader: async ({ quote_id, quote_item_id, quote_heading_id }) => {
      try {
        const apiResponse = await POST(SECONDARY_API_URLS.quote_section_header, { body: { id: quote_heading_id, quote_id, quote_item_id } });
        const {
          status, payload, id,
        } = apiResponse;

        logger.debug(`CreateQuoteHeader response status: ${status}  payload: ${payload} id: ${id}`);

        if (status === 'sucess') {
          return payload;
        }
      } catch (lasecApiError) {
        logger.error('Error setting quote header item');
        return null;
      }
    },
    removeQuoteHeader: async ({ quote_heading_id }) => {
      try {
        const apiResponse = await DELETE(SECONDARY_API_URLS.quote_section_header, { body: { id: quote_heading_id } });
        const {
          status,
        } = apiResponse;

        logger.debug(`Deleted quote header: ${status}  payload: ${payload} id: ${id}`);

        if (status === 'sucess') {
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
      return await FETCH(SECONDARY_API_URLS.groups.url, {params: {
        ...defaultParams,
        filter: {
          "ids":["LAB101","LAB102","LAB103","LAB104","LAB105","LAB106","LAB107","LAB121"]
        }}}, true).then();
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

