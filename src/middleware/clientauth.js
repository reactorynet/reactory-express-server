import { isNil } from 'lodash';
import { ReactoryClient } from '@reactory/server-core/models';
import logger from '@reactory/server-core/logging';
const bypassUri = [
  '/cdn/',
  '/favicon.ico',
  '/auth/microsoft/openid',
];

const ReactoryClientAuthenticationMiddleware = async (req, res, next) => {
  debugger;
  let clientId = req.headers['x-client-key'];
  let clientPwd = req.headers['x-client-pwd'];
  let serverBypass = req.headers['x-reactory-pass'];  

  let query = req.query;

  if(isNil(clientId) === true) clientId = req.params.clientId;
  if(isNil(clientId) === true) clientId = query.clientId;  
  if(isNil(clientId) === true) clientId = query['x-client-key'];

  if(isNil(clientPwd) === true) clientPwd = req.params.secret;
  if(isNil(clientPwd) === true) clientPwd = query.secret;  
  if(isNil(clientPwd) === true) clientPwd = query['x-client-pwd'];

  logger.debug(`ReactoryClientAuthenticationMiddleware:: Client key: [${clientId}], Client Token: [${clientPwd}], Original Url: ${req.originalUrl}`, {query: req.query, params: req.params});

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
    logger.debug(`ReactoryClientAuthenticationMiddleware:: extracted partner key: ${clientId}`);      
    const clientResult = await ReactoryClient.findOne({ key: clientId }).then();    
    if (isNil(clientResult)) res.status(401).send({ error: `X-Client-Key / ?clientId ${clientId} Credentials Invalid.` });        

    if(isNil(serverBypass) === false) {
      logger.debug('Validating Server Bypass');          
      //validate  
      if(serverBypass === `${clientResult.password}+${clientResult.salt}`) {
        logger.debug('Validating Server Bypass - Passed');          
        global.partner = clientResult;
        next();            
      } else {
        res.status(401).send({error: 'Your Server ByPass Failed', code: 'ID10TA'});
      }
    } else {
      if (clientResult.validatePassword(clientPwd) === false) { 
        res.status(401).send({ error: 'Invalid api client credentials' });
      }
      else {
        global.partner = clientResult;
        next();
      }
    }  
  }
};

export default ReactoryClientAuthenticationMiddleware;
