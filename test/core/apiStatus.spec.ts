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

import queries from './queries';

const request = require('supertest')(API_URI_ROOT);

describe('Reactory API', () => {  
  
  it('Should return an unauthorized access status code', (done) => {
    request.post('/api')
    .set('Accept', 'application/json')
    .send({ query: queries.apiStatusQuery })
    .expect(401)
      .end((err: Error, res: Response) => {        
        if(err) done(err);                
        else done();
      });
  });

  it('Should return an anonymous user access status', (done) => {
    request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${REACTORY_ANON_TOKEN}`)
          .send({ query: queries.apiStatusQuery })
            .expect(200)
            .end((err: Error, res: Response) => {        
              if(err) done(err);                
              else done();
            });
  });
  
  it('It should respond with a 401 unauthorized', (done) => {
    let token = btoa('bogus.user@bogusmail.com:boguspasswordfordays');
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(401)
      .end((err: Error, res: Response) => {        
        if(err) done(err);
        else done();
      });
  });

  it(`It should respond with an API Status for ${REACTORY_TEST_USER} ${REACTORY_TEST_USER_PWD}`, (done) => {
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
          request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${res.body.user.token}`)
          .send({ query: queries.apiStatusQuery })
            .expect(200)
            .end((err: Error, res: Response) => {        
              if(err) done(err);            
              else done();
            });
        }        
      });
  });
  

});