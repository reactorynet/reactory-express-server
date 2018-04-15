import { isNil } from 'lodash';
import logger from '../core/logger/app-logger';

const default_client = {
  key: '$reactory_system$',
  hosts: 'localhost',
  username: 'reactory_system',
};

const clientauth = (req, res, next) => {
  let clientId = req.headers['x-client-key'];
  clientId = clientId || req.params.clientId;
  clientId = clientId || req.query.clientId;

  if (isNil(clientId) === true || clientId === '') {
    res.status(401).send({ error: 'no-client-id' });
  } else {
    logger.info(`client_auth extracted partner key: ${clientId}`);
    if (clientId === '$reactory_system$') {
      // do custom validation
      // validate the login
      // TODO: add regex patterns for claims that allows all routes relative to the API
      global.client = {
        key: '$reactory_system$',
        sysAdmin: true,
        claims: [
          { claim: '', methods: '' },
        ],
      };

      next();
    } else {
      
      global.partner = partnerHosts[0]; // eslint-disable-line
      next();
      /*
      Make the query and build up partner object here to park on global
      PartnerService.getWithKey(partnerKey).then((partner) => {
        global.partner = partner;

        global.partner.claims = [
          { claim: '', methods: '' },
        ];


        next();
      }).catch((error) => {
        console.error('Error while fetching partner with key', error);
        next();
      });
      */
    } else {
      next();
    }
  }
};

export default clientauth;
