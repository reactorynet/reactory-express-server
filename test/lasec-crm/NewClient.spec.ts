import env from '../env';
import { assert } from 'chai';

import { apiStatusQuery } from 'test/core/queries';
import logger from 'test/logger';
import { Context } from 'mocha';
import ApiError from '../../src/exceptions';
import { isArray } from 'lodash';
import { ttcBadge } from 'test/shared/utils';
import { 
  LasecValidateCustomerEmailAddressQuery,
  LasecValidateCustomerEmailAddressVariables,

} from './queries';


const moment = require('moment');
//do not use import with BTOA as it does not export the default function
const btoa = require('btoa');
const {
  API_URI_ROOT,
  REACTORY_CLIENT_KEY,
  REACTORY_CLIENT_PWD,
  REACTORY_TEST_USER,
  REACTORY_TEST_USER_PWD,
  REACTORY_ANON_TOKEN,
  REACTORY_CLIENT_URL,
} = env;

const request = require('supertest')(API_URI_ROOT);


describe('Lasec CRM Client', () => {

  let logged_in_user: any = null;    
  before(`Should log in the user and set our auth token`, (done) => {
    let token = btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`);
    const started = moment.utc();
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(200)
      .end((err: Error, res: any) => {
        const ttc = moment.utc().diff(started, 'millisecond')
        if(err) done (err);
        else {        
          logged_in_user = res.body.user;
          request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${logged_in_user.token}`)
          .send({ query: apiStatusQuery })
            .expect(200)
            .end((err: Error, res: any) => {        
              if(err) done(err);                    
              else {                
                logged_in_user = {...logged_in_user, ...res.body.data.apiStatus, logged_in_at: moment.utc()}
                logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): User ${logged_in_user.firstName} ${logged_in_user.lastName} logged into ${logged_in_user.applicationName}  ` );
                done();
              }
            });                             
        }
      });
  });


  it('Should query for a user by email nonexisting@mail.com.', async function(){
    const self: Context = this;
    self.timeout(20000);

    const started = moment.utc();
    request.post('api')
    .set('Accept', 'application/json')
    .set('x-client-key', REACTORY_CLIENT_KEY)
    .set('x-client-pwd', REACTORY_CLIENT_PWD)
    .set('Authorization', `Bearer ${logged_in_user.token}`)
    .send( { query: LasecValidateCustomerEmailAddressQuery, variables: LasecValidateCustomerEmailAddressVariables(`nonexisting@mail.com`) } )
    .expect(200)
    .end((err: Error, res: any) => {

      const ttc = moment.utc().diff(started, 'millisecond')
      if(err) {          
        logger.error(`Error executing graphql query`, { err, body: res.body });          
        throw err;
      } 
      else {
        if(res.body && res.body) {
          const { data, errors } = res.body;
          const { LasecGetClientList } = data;

          if(errors && errors.length) {
            throw new ApiError(`The response has errors`, errors);
          }            
          
          assert.exists(LasecGetClientList, 'LasecGetClientList does not exist');
          assert.exists(LasecGetClientList.paging && LasecGetClientList.paging.total, 'LasecGetClientList does not have paging information');
          assert.exists(LasecGetClientList.paging && LasecGetClientList.clients && isArray(LasecGetClientList.clients) === true, 'LasecGetClientList does not have client information');
          assert.isTrue(LasecGetClientList.clients.length === 0, `The api returned an invalid number of client items (${LasecGetClientList.clients.length})`)
          
          logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Found (${LasecGetClientList.clients.length}) CLIENTS  ` );                        
          
        } else {
          throw new Error('No Data Element on Response');
        }
      }
    });
  });


  it('Should query for a user by email sales@lasec.co.za and find 1 result', async function(){
    const self: Context = this;
    self.timeout(20000);

    const started = moment.utc();
    request.post('api')
    .set('Accept', 'application/json')
    .set('x-client-key', REACTORY_CLIENT_KEY)
    .set('x-client-pwd', REACTORY_CLIENT_PWD)
    .set('Authorization', `Bearer ${logged_in_user.token}`)
    .send( { query: LasecValidateCustomerEmailAddressQuery, variables: LasecValidateCustomerEmailAddressVariables(`sales@lasec.co.za`) } )
    .expect(200)
    .end((err: Error, res: any) => {

      const ttc = moment.utc().diff(started, 'millisecond')
      if(err) {          
        logger.error(`Error executing graphql query`, { err, body: res.body });          
        throw err;
      } 
      else {
        if(res.body && res.body) {
          const { data, errors } = res.body;
          const { LasecGetClientList } = data;

          if(errors && errors.length) {
            throw new ApiError(`The response has errors`, errors);
          }            
          
          assert.exists(LasecGetClientList, 'LasecGetClientList does not exist');
          assert.exists(LasecGetClientList.paging && LasecGetClientList.paging.total, 'LasecGetClientList does not have paging information');
          assert.exists(LasecGetClientList.paging && LasecGetClientList.clients && isArray(LasecGetClientList.clients) === true, 'LasecGetClientList does not have client information');
          assert.isTrue(LasecGetClientList.clients.length === 1, `The api returned an invalid number of client items (${LasecGetClientList.clients.length})`)
          
          logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Found (${LasecGetClientList.clients.length}) CLIENTS  ` );                        
          
        } else {
          throw new Error('No Data Element on Response');
        }
      }
    });
  });


  
  after('It should log out the logged in user', (done)=>{

    done();
  });
});