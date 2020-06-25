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

const CreateMoresSurvey = `
mutation MoresAssessementsCreateSurvey($moresSurveyCreateArgs: MoresSurveyCreateInput!){
  MoresAssessementsCreateSurvey(moresSurveyCreateArgs: $moresSurveyCreateArgs){
    id
    title
    status 
    surveyType
    startDate
    endDate         
  }
}`;


const DeleteMoresSurvey = `
mutation MoresAssessmentsDeleteSurvey($id: String!, $hard: Boolean){
  MoresAssessmentsDeleteSurvey(id: $id, hard: $hard){
    id
    title
    status
    surveyType
    startDate
    endDate      
  }
}`;

describe('Mores Survey Configration Module', () => {  
 
  let logged_in_user: any = null;  

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

  ['i360', 'l360', 'culture', 'team180'].forEach((surveyType: string) => {

    
    let active_survey: any = null;

    it(`Should return a newly created survey type in test mode using a "${surveyType}" template`, (done) => {

      request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${logged_in_user.token}`)
          .send( { 
            
            query: CreateMoresSurvey, 
            variables: { 
              moresSurveyCreateArgs: {
                title: 'Mores Assessments Survey Test Create',
                surveyType: surveyType,
                organizationId: '5c6aabd42380bf1151d963eb'
              }
            }
          })
          .expect(200)
          .end((err: Error, res: any) => {        
            if(err) {         
              console.error({ res, err });
              done(err);
            }
            else {
              console.log(res.body)
              if(res.body.errors) {
                done(JSON.stringify(res.body.errors))  
              } else {
                active_survey = res.body.data.MoresAssessementsCreateSurvey;
                done();
              }            
            }
          });    
    });
  
    
    it(`Should hard delete the newly created survey`, (done) => {
  
      if(active_survey !== null) {
        request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${logged_in_user.token}`)
          .send( {           
            query: DeleteMoresSurvey, 
            variables: { 
              id: active_survey.id,
              hard: true
            }
          })
          .expect(200)
          .end((err: Error, res: any) => {        
            if(err) {         
              console.error({ res, err });
              done(err);
            }
            else {    
              console.log(`Survey Response`, res.body)
              done();
            }                
          });   
      } else {
        done('Active Survey not available, cannot execute test')
      }
       
    });  


  });

  

  after('Logout user', (done) => {
    done()
  });

});