import fetch from 'node-fetch';
import { isObject, map, find } from 'lodash';
import moment from 'moment';
// import { clearAuthentication } from '../actions/Auth';
import SECONDARY_API_URLS from './SecondaryApiUrls';
import logger from '../../../logging';

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


export const DUPLICATE_LOADING_ERROR_MESSAGE = 'DUPLICATE_LOADING_ERROR_MESSAGE';
export const DUPLICATE_SAVING_ERROR_MESSAGE = 'DUPLICATE_SAVING_ERROR_MESSAGE';
export const SETTINGS_NOT_CONFIGURED = 'SETTINGS_NOT_CONFIGURED';

export function stringifyIds(ids) {
  const x = map(ids, (id) => { return `${id}`; });
  return x;
}


const getStorageItem = async (key) => {
  logger.info(`Lookup Security Storage ${key}`, { authentications: global.user.authentications || [] });
  if (global.user) {
    const { authentications } = global.user;
    const lasecAuthentication = find(authentications, { provider: 'lasec' });

    if (lasecAuthentication && lasecAuthentication.props) {
      logger.debug(`Found login information for lasec ${lasecAuthentication}`);
      return lasecAuthentication.props.payload.token;
    }

    const loginResult = await Api.Authentication.login('admin', 'beakersaremadeofglass').then();
    logger.debug('no token exists lets login', loginResult);
    if (global.user.setAuthentication) {
      global.user.setAuthentication({ provider: 'lasec', props: { ...loginResult }, lastLogin: new Date().valueOf() });
      if (loginResult.payload && loginResult.payload.token) {
        return loginResult.payload.token;
      }
    }
  }

  return null;
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
    kwargs.headers['Authorization'] = `Token ${token}`;
    kwargs.headers['Origin'] = 'http://localhost:3000';
    kwargs.headers['X-LASEC-AUTH'] = `Token ${token}`;
    kwargs.headers['X-CSRFToken'] = '';
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
};


export default Api;

/*
export function upload(base_url, consumer, data, custom_headers, ...callbackParams) {
  const url = `${base_url}api/file_uploads/`;

  const headers = {};
  let auth_token;
  let primary_api_auth_token;

  auth_token = getStorageItem('secondary_api_token');
  primary_api_auth_token = getStorageItem('auth_token');
  headers['Authorization'] = `Token ${auth_token}`;
  headers['X-LASEC-AUTH'] = `Token ${primary_api_auth_token}`;

  const formData = new FormData();

  formData.append('files', data[0]);

  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    for (const k in headers) {
      xhr.setRequestHeader(k, headers[k]);
    }
    xhr.onload = (f) => {
      try {
        return res(JSON.parse(f.target.responseText));
      } catch (e) {
        return rej([f.target.responseText, data[0]]);
      }
    };
    xhr.onerror = e => rej(e, data[0]);
    if (xhr.upload && consumer) {
      xhr.upload.onprogress = function (pe) {
        if (pe.lengthComputable && consumer) {
          consumer(pe.loaded, pe.total, pe, xhr, ...callbackParams);
        }
      };
    }
    xhr.send(formData);
  });
}
*/

