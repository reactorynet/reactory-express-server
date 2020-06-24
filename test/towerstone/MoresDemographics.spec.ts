import chai from 'chai';
import env from '../env';
import { apiStatusQuery } from 'test/core/queries';
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
      query TowerStoneGetDemographicLookup( $lookupType: String! ) {
        TowerStoneGetDemographicLookup(lookupType: $lookupType) {
          id
          lookupType
          name
          description
          __typename
        }
      }
    `,
    variables: 
    {
      lookupType: demographicType,
      ...variables
    }
  };

};

interface LoggedInUser {
  token: string,
  firstName: string,
  lastName: string,
  email: string,
  [key: string]: any
}

describe('TowerStone Demographics Module', () => {  
  let logged_in_user: LoggedInUser = null;
  let lookupTypes = ['race', 'age', 'gender', 'position', 'region', 'operational_group', 'business_unit', 'team']

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


  lookupTypes.forEach(( demographic: string ) => {
    it(`It should respond with a list of organization specific ${demographic} lookups for ${REACTORY_TEST_USER} ${REACTORY_TEST_USER_PWD}`, (done) => {
      const query = GetDemographicsLookupQuery(demographic);
      request.post('api')
        .set('Accept', 'application/json')
        .set('x-client-key', REACTORY_CLIENT_KEY)
        .set('x-client-pwd', REACTORY_CLIENT_PWD)
        .set('Authorization', `Bearer ${logged_in_user.token}`)
        .send( query )
        .expect(200)
        .end((err: Error, res: any) => {        
          if(err) done(err);
          else {
            console.log(`The ${demographic} lookups for user ${logged_in_user.email}\n`, res.body.data);
            done();
          }                
        });
    });      
  });


  after('Loggin out user', (done) => {
    done()
  });

});