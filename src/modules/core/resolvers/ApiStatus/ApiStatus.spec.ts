import chai from 'chai';
import supertest from 'supertest';
import { 
  graph
} from './mocks';
import TestAgent from 'supertest/lib/agent';
//do not use import with BTOA as it does not exports the default function
const btoa = require('btoa');

const { 
  queries
} = graph;

describe('Reactory API Status Query', () => {  
  let request: TestAgent<supertest.Test>;

  beforeAll(() => { 
    const {
      API_URI_ROOT,      
    } = process.env;
    request = supertest(API_URI_ROOT);
  });

  it('Should return an unauthorized access status code', (done) => {    
    request.post('/api')
    .set('Accept', 'application/json')
    .send({ query: queries.apiStatusQuery })
    .expect(401)
      .end((err: Error) => {        
        if(err) done(err);                
        else done();
      });
  });

  it('Should return an anonymous user access status', (done) => {
    const { REACTORY_CLIENT_KEY, REACTORY_CLIENT_PWD, REACTORY_ANON_TOKEN } = process.env;
    request.post('api')
          .set('Accept', 'application/json')
          .set('Authorization', null)
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .send({ query: queries.apiStatusQuery, variables: {} })
            .expect(200)
            .end((err: Error) => {        
              if(err) done(err);                
              else done();
            });
  });
  
  it('It should respond with a 401 unauthorized using bogus credentials', (done) => {
    let token = btoa('bogus.user@bogusmail.com:boguspasswordfordays');
    const { REACTORY_CLIENT_KEY, REACTORY_CLIENT_PWD } = process.env;
    request.post('login')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(401)
      .end((err: Error) => {        
        if(err) done(err);
        else done();
      });
  });

  it(`It should respond with an API Status for test user`, (done) => {
    const { 
      REACTORY_CLIENT_KEY, 
      REACTORY_CLIENT_PWD, 
      REACTORY_TEST_USER, 
      REACTORY_TEST_USER_PWD
    } = process.env;
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`)}`)
      .send()
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res: supertest.Response) => {
        if (!res.body.user) throw new Error('No user data returned');
        if (!res.body.user.token) throw new Error('No user token returned');
      })
      .end((err: Error, res: supertest.Response) => {
        if(err) {          
          done (err);
        }
        else {        
          request.post('api')
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${res.body.user.token}`)
          .send({ query: queries.apiStatusQuery, variables: {} })
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res: supertest.Response) => {
              if (!res.body.data) throw new Error('No data returned');
              if (!res.body.data.apiStatus) throw new Error('No API Status data returned');
            })
            .end((err: Error) => {        
              if(err) done(err);            
              else done();
            });
        }        
      });
  });
});