import fetch from 'node-fetch';
import { isObject, map, find } from 'lodash';
import moment from 'moment';
// import { clearAuthentication } from '../actions/Auth';
import SECONDARY_API_URLS from './SecondaryApiUrls';
import logger from '../../../logging';
import ApiError from '../../../exceptions';

const config = {
  WEBSOCKET_BASE_URL: 'wss://api.lasec.co.za/ws/',
  UI_BASE_URL: 'https://b360.lasec.co.za',
  API_BASE_URL: 'https://pbapi.lasec.co.za',
  SECONDARY_API_URL: 'https://bapi.lasec.co.za',
  PRIMARY_API_URL_PREFIX_1: 'api',
  PRIMARY_API_URL_PREFIX_2: 'l360',
  SECONDARY_API_URL_PREFIX_1: 'api',
  GOOGLE_MAPS_API_KEY: 'XXXXXXXXXXXXX',
};


class LasecNotAuthenticatedException extends ApiError {
  constructor(message) {
    super(message);
    this.meta = {
      __typename: 'lasec.api.LasecNotAuthenticatedException',
      redirect: '/360login',
    };
  }
}

class TokenExpiredException extends ApiError {
  constructor(message) {
    super(message);
    this.meta = {
      __typename: 'lasec.api.TokenExpiredException',
      redirect: '/360login',
    };
  }
}

export const DUPLICATE_LOADING_ERROR_MESSAGE = 'DUPLICATE_LOADING_ERROR_MESSAGE';
export const DUPLICATE_SAVING_ERROR_MESSAGE = 'DUPLICATE_SAVING_ERROR_MESSAGE';
export const SETTINGS_NOT_CONFIGURED = 'SETTINGS_NOT_CONFIGURED';

export function stringifyIds(ids) {
  const x = map(ids, (id) => { return `${id}`; });
  return x;
}


const getStorageItem = async (key) => {
  logger.info(`Lookup Security Storage ${key} on ${global.user.fullName()}`);
  if (global.user._id) {
    const lasecAuth = global.user.getAuthentication('lasec');
    if (lasecAuth && lasecAuth.props) {
      debugger //eslint-disable-line
      logger.debug(`Found login information for lasec ${lasecAuth}`);
      const {
        payload, username, password,
      } = lasecAuth.props;

      let { lastLogin } = lasecAuth;
      const now = moment();
      if (lastLogin) lastLogin = moment(lastLogin);
      if (payload && payload.token) {
        if (lastLogin && now.isBefore(moment(lastLogin).add(24, 'h'))) {
          // we have an authentication token
          // maybe we can test it? check if valid
          logger.debug('login has token fresher than 24hours, returning');
          return lasecAuth.props.payload.token;
        }
      }
      // no token or we force the login again after 24 hours to get a refresh.
      // check for username and password
      logger.debug('No token, checking username and password');
      if (username && password) {
        try {
          logger.debug('No token available but we have credentials', loginResult);
          const loginResult = await Api.Authentication.login(username, password).then();
          logger.debug('Login result after authenticating with lasec360', loginResult);
          if (global.user.setAuthentication && loginResult) {
            await global.user.setAuthentication({ provider: 'lasec', props: { username, password, ...loginResult }, lastLogin: new Date().valueOf() });
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

      throw new LasecNotAuthenticatedException('System does not have authentication details stored. Please login.');
    } else {
      throw new LasecNotAuthenticatedException('Please login with your lasec 360 account');
    }
  }
  // no global user - return null, no authentication
  throw new Error('How?');
};

export function POST(url, data, auth = true) {
  const args = { body: data, method: 'POST' };
  return FETCH(url, args, auth);
}

export function PUT(url, data, auth = true) {
  const args = { body: data, method: 'PUT' };
  return FETCH(url, args, auth);
}

export async function FETCH(url, args, auth = true) {
  // url = `${url}`;

  let absoluteUrl = `${config.SECONDARY_API_URL}/${url}`;

  logger.debug(`::lasec-api::FETCH(${absoluteUrl}) args: [${args}]`);

  const kwargs = args || {};
  if (!kwargs.headers) {
    kwargs.headers = {};
    kwargs.headers['Content-type'] = 'application/json; charset=UTF-8';
  }

  if (auth === true) {
    const token = await getStorageItem('secondary_api_token');
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

  return fetch(absoluteUrl, kwargs)
    .then((response) => {
      logger.debug('Result from API', response);
      return response.json();
    })
    .then(async (jsonResult) => {
      logger.debug('JSON Result', jsonResult);
      return jsonResult;
    })
    .catch((err) => {
      logger.error(`Error making Fetch Call ${err.message}`, err);
      throw err;
    });
}

const defaultParams = {
  filter: {}, ordering: {}, pagination: {},
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
  },
  Authentication: {
    login: async (username, password) => {
      return POST(SECONDARY_API_URLS.login_lasec_user.url, { username, password }, false);
    },
  },
  Exceptions: {
    LasecNotAuthenticatedException,
    TokenExpiredException,
  },
};


export default Api;

