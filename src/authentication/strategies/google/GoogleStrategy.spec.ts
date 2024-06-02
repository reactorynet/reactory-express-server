import 'chai';
import supertest from 'supertest';
import https from 'https';
import http from 'http';
import nock from 'nock';
import mongoose from 'mongoose';
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
    request = supertest(API_URI_ROOT, { });
  });

  afterAll(async () => {
    reactoryApp.stop();
    agent.destroy();
  });

  test('should redirect to Google for authentication', async () => {
    // nock(API_URI_ROOT)
    //   .get(`/auth/google/start?x-client-key=${REACTORY_CLIENT_KEY}&x-client-pwd=${REACTORY_CLIENT_PWD}`)
    //   .reply(302, {}, { location: 'https://accounts.google.com' });
    const response = await request      
      .get(`auth/google/start?x-client-key=${REACTORY_CLIENT_KEY}&x-client-pwd=${REACTORY_CLIENT_PWD}`);

    expect(response.status).toBe(302);
    expect(response.header['location']).toContain('https://accounts.google.com');
  }, 30000);

  // test('should handle Google OAuth callback successfully', async () => {
  //   nock(API_URI_ROOT)
  //     .get(`/auth/google/callback?code=mockCode`)
  //     .reply(301, {}, { location: 'http://localhost' });

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'mockCode' })
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(301);
  //   expect(response.header['location']).toContain('http://localhost');
  // });

  // test('should handle Google OAuth callback failure', async () => {
  //   nock(API_URI_ROOT)
  //     .get(`/auth/google/callback?code=mockCode`)
  //     .reply(500, { error: 'An error occurred while trying to authenticate with Google' });

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'mockCode' })
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(500);
  //   expect(response.body.error).toBe('An error occurred while trying to authenticate with Google');
  // });

  // test('should handle missing OAuth code', async () => {
  //   nock(API_URI_ROOT)
  //     .get(`/auth/google/callback?code=`)
  //     .reply(400, { error: 'Missing OAuth code' });

  //   const response = await request
  //     .get('auth/google/callback?code=')
  //     .query({})
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(400);
  //   expect(response.body.error).toBe('Missing OAuth code');
  // });

  // test('should handle invalid state parameter', async () => {
  //   // Mock the state parameter verification failure
  //   nock(API_URI_ROOT)
  //     .get(`/auth/google/callback?code=mockCode`)
  //     .reply(400, { error: 'Invalid state parameter' });

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'mockCode' })
  //     .set('Cookie', 'session=invalidState');

  //   expect(response.status).toBe(400);
  //   expect(response.body.error).toBe('Invalid state parameter');
  // });

  // test('should handle expired or revoked tokens', async () => {
  //   // Mock the token endpoint to return an error for expired/revoked tokens
  //   nock('https://oauth2.googleapis.com')
  //     .post('/token')
  //     .reply(400, { error: 'invalid_grant', error_description: 'Token has been revoked' });

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'expiredToken' })
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(400);
  //   expect(response.body.error).toBe('Token has been revoked');
  // });

  // test('should handle network errors', async () => {
  //   // Simulate a network error when contacting Google's OAuth endpoint
  //   nock('https://oauth2.googleapis.com')
  //     .post('/token')
  //     .replyWithError('Network error');

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'networkError' })
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(500);
  //   expect(response.body.error).toBe('Network error');
  // });

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

  // test('should handle user info retrieval failure', async () => {
  //   // Mock successful token exchange
  //   nock('https://oauth2.googleapis.com')
  //     .post('/token')
  //     .reply(200, {
  //       access_token: 'mockAccessToken',
  //       id_token: 'mockIdToken'
  //     });

  //   // Mock failure in user info retrieval
  //   nock('https://www.googleapis.com')
  //     .get('/oauth2/v3/userinfo')
  //     .reply(500, { error: 'Failed to retrieve user info' });

  //   const response = await request
  //     .get('auth/google/callback')
  //     .query({ code: 'mockCode' })
  //     .set('Cookie', 'session=encodedState');

  //   expect(response.status).toBe(500);
  //   expect(response.body.error).toBe('Failed to retrieve user info');
  // });
});
