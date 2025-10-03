import 'chai';
import { Application } from 'express';
import http from 'http';
import https from 'https';
import nock from 'nock';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent';
//@ts-ignore
import supertestSession from 'supertest-session';
import { 
  encoder 
} from '@reactory/server-core/utils';
import { ReactoryServer } from '@reactory/server-core/express/server';
import { WorkFlowRunner } from 'modules/reactory-core/workflow';



describe('Google OAuth Strategy', () => {
  let request: TestAgent<supertest.Test>;
  const {
    REACTORY_CLIENT_KEY,
    REACTORY_CLIENT_PWD,
    REACTORY_ANON_TOKEN,
    API_URI_ROOT,
    REACTORY_CLIENT_URL
  } = process.env;

  let reactoryApp: {
    app: Application,
    server: http.Server,
    workflowHost: WorkFlowRunner,
    stop: () => void
  }  
  let agent: https.Agent;

  beforeAll(async () => { 
    agent = new https.Agent({ rejectUnauthorized: false });
    reactoryApp = await ReactoryServer();    
  }, 30000);

  beforeEach(() => { 
    request = supertestSession(API_URI_ROOT);
  });

  afterEach(() => { 
    // Clear all HTTP mocks after each test
    nock.cleanAll();
  });

  afterAll(async () => {
    reactoryApp.stop();  
  }, 10000);

  test('should redirect to Google for authentication given a valid reactory client and pwd', async () => {
    const mockLocation = 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=';    
    nock('https://accounts.google.com')
      .get('/o/oauth2/auth')
      .query(true)
      .reply(302, {}, 
        { 
          location: mockLocation 
        });
              
    const response = await request
      .get(`auth/google/start`)
      .query({
        'x-client-key': REACTORY_CLIENT_KEY,
        'x-client-pwd': REACTORY_CLIENT_PWD
      });

    expect(response.status)
      .toBe(302);
    expect(response.header['location'])
      .toContain(mockLocation);
  }, 10000);

  test('should produce a 401 error page if client key is invalid', async () => { 
    const response = await request
      .get('auth/google/start')
      .query({
        'x-client-key': 'invalidClientKey',
        'x-client-pwd': REACTORY_CLIENT_PWD
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credentials Invalid');    
  });

  test('should produce a 401 error page if client pwd is invalid', async () => { 
    const response = await request
      .get('auth/google/start')
      .query({
        'x-client-key': REACTORY_CLIENT_KEY,
        'x-client-pwd': 'invalidClientPwd'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credentials Invalid');
  });

  test('should handle Google OAuth callback given a valid client and pwd', async () => {

    const startResponse = await request
      .get(`auth/google/start`)
      .query({
        'x-client-key': REACTORY_CLIENT_KEY,
        'x-client-pwd': REACTORY_CLIENT_PWD
      });

    // given a valid state parameter
    const state = encoder.encodeState({
      "x-client-key": REACTORY_CLIENT_KEY,
      "x-client-pwd": REACTORY_CLIENT_PWD,
      "flow": "google"
    });


    const response = await request
      .get(`auth/google/callback`)
      .query({
        state: "mockState",
        code: "mockCode",
        scope: "email profile openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        authuser: "0",
        hd: "worldremit.com",
        prompt: "none",
      })
      .set('Cookie', `session=${state}`);

    expect(response.status).toBe(302);
    expect(response.header['location']).toContain(REACTORY_CLIENT_URL);
  }, 30000);

  test('should handle Google OAuth callback failure', async () => {    
    const response =  await request
      .get('auth/google/callback')
      .set('Cookie', 'session=badSessionState');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('no-client-id');
  }, 3000);  
});
