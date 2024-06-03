import 'chai';
import supertest from 'supertest';
import https from 'https';
import http from 'http';
import nock from 'nock';
import mongoose from 'mongoose';
import { 
  encoder 
} from '@reactory/server-core/utils';
import { ReactoryServer } from '@reactory/server-core/express/server';
import passport from 'passport';
import TestAgent from 'supertest/lib/agent';
import { Application } from 'express';
import { WorkFlowRunner } from 'workflow';


describe('Google OAuth Strategy', () => {
  let request: TestAgent<supertest.Test>;
  const {
    REACTORY_CLIENT_KEY,
    REACTORY_CLIENT_PWD,
    REACTORY_ANON_TOKEN,
    API_URI_ROOT,
    REACTORY_ROOT
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
    request = supertest(API_URI_ROOT);
  }, 30000);

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
      .get(`auth/google/start?x-client-key=${REACTORY_CLIENT_KEY}&x-client-pwd=${REACTORY_CLIENT_PWD}`);

    expect(response.status)
      .toBe(302);
    expect(response.header['location'])
      .toContain(mockLocation);
  }, 10000);

  test('should produce a 401 error page if client key is missing or invalid', async () => { 
    const response = await request
      .get('auth/google/start')
      .query({
        'x-client-key': 'invalidClientKey',
        'x-client-pwd': REACTORY_CLIENT_PWD
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('no-client-id');    
  });


  test('should handle Google OAuth callback successfully given a valid client and pwd', async () => {
    // given a valid state parameter
    const state = encoder.encodeState({
      "x-client-key": REACTORY_CLIENT_KEY,
      "x-client-pwd": REACTORY_CLIENT_PWD,
    });

    // Mock the token exchange call to Google's OAuth endpoint
    // confirm the underlying call to Google's OAuth endpoint
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'mockAccessToken',
        id_token: 'mockIdToken'
      });

    // Mock the call to Google's user info endpoint
    // confirm the underlying call to Google's OAuth endpoint
    nock('https://www.googleapis.com')
      .get('/oauth2/v3/userinfo')
      .reply(200, {
        sub: '1234567890',
        name: 'John Doe',
        email: 'johndoe@example.com'
      });

    const response = await request
      .get(`auth/google/callback`)
      .set('Cookie', `session=${state}`);

    expect(response.status).toBe(301);
    expect(response.header['location']).toContain(REACTORY_ROOT);
  }, 30000);

  test('should handle Google OAuth callback failure', async () => {    
    const response = await request
      .get('auth/google/callback')
      .set('Cookie', 'session=badSessionState');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('An error occurred while trying to authenticate with Google');
  });

  test('should handle user info retrieval failure', async () => {
    // Mock successful token exchange
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'mockAccessToken',
        id_token: 'mockIdToken'
      });

    // Mock failure in user info retrieval
    nock('https://www.googleapis.com')
      .get('/oauth2/v3/userinfo')
      .reply(500, { error: 'Failed to retrieve user info' });

    const response = await request
      .get('auth/google/callback')
      .query({ code: 'mockCode' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to retrieve user info');
  });
  
  test('should handle expired or revoked tokens', async () => {
    // Mock the token endpoint to return an error for expired/revoked tokens
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(400, { error: 'invalid_grant', error_description: 'Token has been revoked' });

    const response = await request
      .get('auth/google/callback')
      .query({ code: 'expiredToken' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Token has been revoked');
  });

  test('should handle network errors', async () => {
    // Simulate a network error when contacting Google's OAuth endpoint
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .replyWithError('Network error');

    const response = await request
      .get('auth/google/callback')
      .query({ code: 'networkError' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Network error');
  });

  // test('should handle invalid client credentials', async () => {
  //   // Mock the token endpoint to return an error for invalid client credentials
  //   nock('https://oauth2.googleapis.com')
  //     .post('/token')
  //     .reply(400, { error: 'invalid_client', error_description: 'Client credentials are invalid' });

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'invalidClient' })
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(400);
  //   expect(response.body.error).toBe('Client credentials are invalid');
  // });
  
});
