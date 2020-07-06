import chai from 'chai';
import env from '../env';
//do not use import with BTOA as it does not exports the default function
const btoa = require('btoa');
const {
  API_URI_ROOT,
  REACTORY_CLIENT_KEY,
  REACTORY_CLIENT_PWD,
  REACTORY_TEST_USER,
  REACTORY_TEST_USER_PWD,
  REACTORY_ANON_TOKEN
} = env;

import { apiStatusQuery } from '../core/queries';
import logger from '../logger';

const request = require('supertest')(API_URI_ROOT);

describe('Lasec CRM Logged In User', () => {  
  let logged_in_user: any = null;
  //let lookupTypes = ['race', 'age', 'gender', 'position', 'region', 'operational_group', 'business_unit', 'team']

  before((done) => {
    let token = btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`);
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(200)
      .end((err: Error, res: any) => {
        if(err) done (err);
        else {        
          logged_in_user = res.body.user;
          request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${res.body.user.token}`)
          .send({ query: apiStatusQuery })
            .expect(200)
            .end((err: Error, res: any) => {        
              if(err) done(err);                    
              else {
                logged_in_user = {...logged_in_user, ...res.body.data.status}
                done();
              }
            });                             
        }
      });
  });


  it(`It should respond with a valid Lasec360User ${REACTORY_TEST_USER}`, (done) => {
    
    request.post('api')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Bearer ${logged_in_user.token}`)
      .send( { 
        query: `query LasecLoggedInUser { 
          LasecLoggedInUser {
            id
            code
            repId
            repCodes
            firstName
            lastName
            email    
            roles
            target
            activeCompany
            signature
          }
        }
      `})
      .expect(200)
      .end((err: Error, res: any) => {        
        if(err) {
          logger.error(err);
          done(err);
        } 
        else {
          if(res.body && res.body.data) {
            
            logger.debug(`${JSON.stringify(res.body)}`);
            const { LasecLoggedInUser } = res.body.data;

            if(LasecLoggedInUser) {
              done();
            } else {
              if(res.body.errors && res.body.errors.length > 0) {
                done(res.body.errors)
              }              
            }                        
          } else {
            done(new Error('No Data Element on Response'));
          }
          
          
        }                
      });
  });      

  after('Loggin out user', (done) => {
    done()
  });

});