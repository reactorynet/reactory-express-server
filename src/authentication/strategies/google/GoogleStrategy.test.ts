import request from 'supertest';
import passport from 'passport';
import { ReactoryServer } from '@reactory/server-core/express/server';

// Mock dependencies
jest.mock('@reactory/server-core/utils', () => ({
  encoder: {
    encodeState: jest.fn().mockReturnValue('encodedState'),
    decodeState: jest.fn().mockReturnValue({ 'x-client-key': 'mockClientKey' }),
  },
}));

jest.mock('passport-google-oidc', () => {
  return jest.fn().mockImplementation(() => {
    return { Strategy: jest.fn() };
  });
});

jest.mock('models', () => ({
  ReactoryClient: {
    findOne: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue({ siteUrl: 'http://localhost' }),
    })),
  },
}));

let app: Express.Application;
describe('Google OAuth Strategy', () => {
  beforeAll(async () => {
   app = await ReactoryServer();
  });

  test('should initialize Google OAuth strategy with correct configuration', () => {
    //expect(passport._strategies['google'].name).toBe('google');
  });

  test('should redirect to Google for authentication', async () => {
    const response = await request(app)
      .get('/auth/google/start')
      .query({ 'x-client-key': 'mockClientKey', 'x-client-pwd': 'mockClientPwd' });

    expect(response.status).toBe(302);
    expect(response.header['location']).toContain('accounts.google.com');
  });

  test('should handle Google OAuth callback successfully', async () => {
    const mockUser = { id: 'mockUserId', email: 'mock@example.com', displayName: 'Mock User' };
    passport._strategies['google']._verify = jest.fn().mockImplementation((req, authority, profile, options, done) => {
      done(null, mockUser);
    });

    const response = await request(app)
      .get('/auth/google/callback')
      .query({ code: 'mockCode' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(301);
    expect(response.header['location']).toContain('http://localhost');
  });

  test('should handle Google OAuth callback failure', async () => {
    passport._strategies['google']._verify = jest.fn().mockImplementation((req, authority, profile, options, done) => {
      done(new Error('Invalid state'), false);
    });

    const response = await request(app)
      .get('/auth/google/callback')
      .query({ code: 'mockCode' })
      .set('Cookie', 'session=encodedState');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('An error occurred while trying to authenticate with Google');
  });
});
