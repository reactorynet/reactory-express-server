import 'chai';
import supertest from 'supertest';
import passport from 'passport';
import TestAgent from 'supertest/lib/agent';

describe('Google OAuth Strategy', () => {
  let request: TestAgent<supertest.Test>;

  beforeAll(() => { 
    const {
      API_URI_ROOT,      
    } = process.env;
    request = supertest(API_URI_ROOT);
  });

  test('should redirect to Google for authentication', (done) => {
  
    request
      .get(`auth/google/start?x-client-key=${process.env.REACTORY_CLIENT_KEY}&x-client-pwd=${process.env.REACTORY_CLIENT_PWD}`)
      .expect(302)
      .expect('Location', /accounts.google.com/)
      .end((err, Error) => {
        if(err) done(err);
        else done();
      });
  });

  test('should handle Google OAuth callback successfully', async () => {
    
    const response = await request
      .get('auth/google/callback')
      .query({ code: 'mockCode' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(301);
    expect(response.header['location']).toContain('http://localhost');
  });

  test('should handle Google OAuth callback failure', async () => {
    
    const response = await request
      .get('auth/google/callback')
      .query({ code: 'mockCode' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('An error occurred while trying to authenticate with Google');
  });
});
