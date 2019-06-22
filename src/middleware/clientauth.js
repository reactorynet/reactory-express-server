import { isNil } from 'lodash';
import { ReactoryClient } from '../models';
import logger from '../logging';

const bypassUri = [
  '/cdn/',
  '/favicon.ico',
  '/auth/microsoft/openid',
];

const clientauth = (req, res, next) => {
  let clientId = req.headers['x-client-key'];
  let clientPwd = req.headers['x-client-pwd'] || '';
  clientId = clientId || req.params.clientId;
  clientId = clientId || req.query.clientId;
  clientId = req.query['x-client-key'] || clientId;

  clientPwd = clientPwd || req.params.secret;
  clientPwd = clientPwd || req.query.secret;
  clientPwd = req.query['x-client-pwd'] || clientPwd;

  logger.info(`Client Id: [${clientId}], Client Key: [${clientPwd}], Original Url: ${req.originalUrl}`);

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
