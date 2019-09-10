import { isNil } from 'lodash';
import { ReactoryClient } from '../models';
import logger from '../logging';
import queryString from '../utils/url/query-string';
const bypassUri = [
  '/cdn/',
  '/favicon.ico',
  '/auth/microsoft/openid',
];

const clientauth = (req, res, next) => {
  let clientId = req.headers['x-client-key'];
  let clientPwd = req.headers['x-client-pwd'];
  let query = req.query;

  if(isNil(clientId) === true) clientId = req.params.clientId;
  if(isNil(clientId) === true) clientId = query.clientId;  
  if(isNil(clientId) === true) clientId = query['x-client-key'];

  if(isNil(clientPwd) === true) clientPwd = req.params.secret;
  if(isNil(clientPwd) === true) clientPwd = query.secret;  
  if(isNil(clientPwd) === true) clientPwd = query['x-client-pwd'];

  logger.debug(`Client key: [${clientId}], Client Token: [${clientPwd}], Original Url: ${req.originalUrl}`, {query: req.query, params: req.params});

  let bypass = false;
  if (req.originalUrl) {
    for (let i = 0; i < bypassUri.length; i += 1) {
      if (!bypass) bypass = req.originalUrl.toString().indexOf(bypassUri[i]) >= 0;
    }
  }

  if (bypass === true) {
    next();
    return;
  }

  if (isNil(clientId) === true || clientId === '') {
    res.status(401).send({ error: 'no-client-id' });
  } else {
    logger.debug(`client_auth extracted partner key: ${clientId}`);
    if (clientId === '$reactory_system$') {
      // do custom validation
      // validate the login
      // TODO: add regex patterns for claims that allows all routes relative to the API
      global.partner = {
        key: '$reactory_system$',
        sysAdmin: true,
        claims: [
          { claim: '', methods: '' },
        ],
      };

      next();
    } else {
      ReactoryClient.findOne({ key: clientId }).then((clientResult) => {
        if (isNil(clientResult)) res.status(404).send({ error: 'Invalid api client credentials' });
        else if (clientResult.validatePassword(clientPwd) === false) res.status(401).send({ error: 'Invalid api client credentials' });
        else {
          global.partner = clientResult;
          next();
        }
      }).catch((clientError) => {
        logger.error('Client retrieval error', clientError);
        res.status(404).send({ error: `client with id ${clientId} found` });
      });
    }
  }
};

export default clientauth;
