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


const request = require('supertest')(API_URI_ROOT);

const GetPersonalDemographics = `
query GetPersonalDemographics($clientId: String!){
  GetPersonalDemographics(clientId: $clientId){
    clientId
    race
    age
    gender
    position
    region
    operationalGroup
    businessUnit
    team
  }
}`;


const GetDemographicsLookupQuery = (demographicType: string, variables = {}) => {
  return {
    query: `
      query TowerStoneGetDemographicLookup( $lookupType: String ) {
        TowerStoneGetDemographicLookup(lookupType: $lookupType) {
          id
          name
        }
      }
    `,
    variables
  };

};

interface LoggedInUser {
  token: string,
  firstName: string,
  lastName: string
}

describe('TowerStone Demographics Module', () => {  
  let logged_in_user: LoggedInUser = null;

  before(`Logging in user `, (done) => {
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
          done();                    
        }        
      });
  });

  it(`It should respond with a list of race lookups fpr ${REACTORY_TEST_USER} ${REACTORY_TEST_USER_PWD}`, (done) => {
    request.post('api')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Bearer ${logged_in_user.token}`)
      .send()
      .expect(200)
      .end((err: Error, res: Response) => {        
        if(err) done(err);            
        else done();
      });
  });
  
  after('Loggin out user', (done) => {
    done()
  });

});