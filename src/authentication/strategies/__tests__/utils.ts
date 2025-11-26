/**
 * Test Utilities for Authentication Strategies
 * 
 * This module provides reusable test helpers for testing OAuth and authentication strategies.
 * Based on patterns from GoogleStrategy.spec.ts
 */

import { Request, Response } from 'express';
import Reactory from '@reactory/reactory-core';

/**
 * Mock Request Helper
 * Creates a mock Express request object with authentication context
 */
export const createMockRequest = (overrides: Partial<Reactory.Server.ReactoryExpressRequest> = {}): Partial<Reactory.Server.ReactoryExpressRequest> => {
  const mockContext: Partial<Reactory.Server.IReactoryContext> = {
    user: null,
    partner: null,
    getService: jest.fn((serviceName: string) => {
      // Return mock service based on service name
      if (serviceName === 'core.UserService@1.0.0') {
        return createMockUserService();
      }
      return null;
    }),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    hasRole: jest.fn(() => false),
    ...overrides.context,
  };

  const mockRequest: Partial<Reactory.Server.ReactoryExpressRequest> = {
    context: mockContext as Reactory.Server.IReactoryContext,
    session: {
      authState: null,
      id: 'test-session-id',
      cookie: {} as any,
      regenerate: jest.fn(),
      destroy: jest.fn(),
      reload: jest.fn(),
      save: jest.fn(),
      touch: jest.fn(),
    } as any,
    query: {},
    params: {},
    body: {},
    headers: {},
    user: null,
    partner: null,
    ...overrides,
  };

  return mockRequest;
};

/**
 * Mock Response Helper
 * Creates a mock Express response object
 */
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
  };
  return res;
};

/**
 * Mock User Service
 * Provides mock implementations of user service methods
 */
export const createMockUserService = () => {
  return {
    findUserWithEmail: jest.fn(async (email: string) => {
      if (email === 'existing@example.com') {
        return createMockUser({ email });
      }
      return null;
    }),
    createUser: jest.fn(async (userData: any) => {
      return createMockUser(userData);
    }),
    findById: jest.fn(async (id: string) => {
      return createMockUser({ _id: id });
    }),
    updateUser: jest.fn(async (user: any) => {
      return user;
    }),
  };
};

/**
 * Mock User Document
 * Creates a mock user document with common properties
 */
export const createMockUser = (overrides: Partial<Reactory.Models.IUserDocument> = {}): Partial<Reactory.Models.IUserDocument> => {
  const user: Partial<Reactory.Models.IUserDocument> = {
    _id: { toString: () => 'test-user-id', toHexString: () => 'test-user-id' } as any,
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    avatarProvider: null,
    authentications: [],
    memberships: [],
    roles: [],
    lastLogin: Date.now(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    hasRole: jest.fn(() => false),
    ...overrides,
  };

  // Ensure authentications array exists
  if (!user.authentications) {
    user.authentications = [];
  }

  return user as Partial<Reactory.Models.IUserDocument>;
};

/**
 * Mock ReactoryClient/Partner Document
 * Creates a mock partner/client document
 */
export const createMockPartner = (overrides: Partial<Reactory.Models.IReactoryClientDocument> = {}): Partial<Reactory.Models.IReactoryClientDocument> => {
  return {
    _id: { toString: () => 'test-partner-id' } as any,
    key: 'test-client',
    name: 'Test Client',
    siteUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:4000',
    ...overrides,
  } as Partial<Reactory.Models.IReactoryClientDocument>;
};

/**
 * Mock OAuth Profile Helper
 * Creates mock OAuth profile responses from different providers
 */
export const createMockOAuthProfile = (provider: 'google' | 'facebook' | 'github' | 'linkedin' | 'microsoft' | 'okta', overrides: any = {}) => {
  const profiles = {
    google: {
      id: 'google-123456',
      displayName: 'Test User',
      name: {
        givenName: 'Test',
        familyName: 'User',
      },
      emails: [{ value: 'test@example.com', verified: true }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      provider: 'google',
      _json: {},
      ...overrides,
    },
    facebook: {
      id: 'facebook-123456',
      displayName: 'Test User',
      name: {
        givenName: 'Test',
        familyName: 'User',
      },
      emails: [{ value: 'test@example.com' }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      provider: 'facebook',
      _json: {},
      ...overrides,
    },
    github: {
      id: 'github-123456',
      displayName: 'Test User',
      username: 'testuser',
      emails: [{ value: 'test@example.com' }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      provider: 'github',
      _json: {},
      ...overrides,
    },
    linkedin: {
      id: 'linkedin-123456',
      displayName: 'Test User',
      name: {
        givenName: 'Test',
        familyName: 'User',
      },
      emails: [{ value: 'test@example.com' }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      provider: 'linkedin',
      _json: {},
      ...overrides,
    },
    microsoft: {
      id: 'microsoft-123456',
      oid: 'microsoft-oid-123456',
      displayName: 'Test User',
      name: {
        givenName: 'Test',
        familyName: 'User',
      },
      _json: {
        emails: ['test@example.com'],
        picture: 'https://example.com/avatar.jpg',
      },
      provider: 'microsoft',
      ...overrides,
    },
    okta: {
      id: 'okta-123456',
      displayName: 'Test User',
      name: {
        givenName: 'Test',
        familyName: 'User',
      },
      emails: [{ value: 'test@example.com' }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      provider: 'okta',
      _json: {},
      ...overrides,
    },
  };

  return profiles[provider];
};

/**
 * Mock Passport Authentication
 * Helper to mock passport.authenticate calls
 */
export const mockPassportAuthenticate = (strategy: string, options: any = {}) => {
  return jest.fn((req, res, next) => {
    // Simulate successful authentication
    if (options.successRedirect) {
      res.redirect(options.successRedirect);
    } else if (next) {
      next();
    }
  });
};

/**
 * State Encoding/Decoding Test Helpers
 * Mock encoder utilities for testing OAuth state
 */
export const createMockEncoder = () => {
  return {
    encodeState: jest.fn((state: any) => {
      return Buffer.from(JSON.stringify(state)).toString('base64');
    }),
    decodeState: jest.fn((encodedState: string) => {
      return JSON.parse(Buffer.from(encodedState, 'base64').toString('utf-8'));
    }),
  };
};

/**
 * Mock Token Generation Helper
 * Simulates JWT token generation
 */
export const createMockLoginToken = (userId: string = 'test-user-id') => {
  return {
    id: userId,
    firstName: 'Test',
    lastName: 'User',
    token: 'mock-jwt-token-' + userId,
  };
};

/**
 * Test Data Factory
 * Provides common test data configurations
 */
export const testData = {
  validEmail: 'test@example.com',
  existingEmail: 'existing@example.com',
  newEmail: 'new@example.com',
  invalidEmail: 'invalid-email',
  
  validPassword: 'TestPassword123!',
  invalidPassword: 'weak',
  
  clientKey: 'test-client',
  clientPwd: 'test-client-secret',
  
  validState: {
    'x-client-key': 'test-client',
    'x-client-pwd': 'test-client-secret',
    flow: 'oauth',
  },
  
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

/**
 * Async Test Helper
 * Wrapper for testing async callbacks
 */
export const testAsyncCallback = async (callback: Function, ...args: any[]) => {
  return new Promise((resolve, reject) => {
    const done = (error: any, result: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };
    callback(...args, done);
  });
};

/**
 * Mock Logger
 * Provides mock logger for testing
 */
export const createMockLogger = () => {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  };
};

/**
 * Assert Helper
 * Common assertions for authentication tests
 */
export const authAssertions = {
  /**
   * Assert that a user was created with expected properties
   */
  assertUserCreated: (user: any, expectedEmail: string) => {
    expect(user).toBeDefined();
    expect(user.email).toBe(expectedEmail);
    expect(user.authentications).toBeDefined();
  },

  /**
   * Assert that authentication record was added
   */
  assertAuthRecordAdded: (user: any, provider: string) => {
    expect(user.authentications).toBeDefined();
    const authRecord = user.authentications.find((auth: any) => auth.provider === provider);
    expect(authRecord).toBeDefined();
    expect(authRecord.lastLogin).toBeDefined();
  },

  /**
   * Assert that a login token was generated
   */
  assertTokenGenerated: (token: any) => {
    expect(token).toBeDefined();
    expect(token.token).toBeDefined();
    expect(token.id).toBeDefined();
  },

  /**
   * Assert that user service was called correctly
   */
  assertUserServiceCalled: (mockUserService: any, method: string, expectedCalls: number = 1) => {
    expect(mockUserService[method]).toHaveBeenCalledTimes(expectedCalls);
  },
};

export default {
  createMockRequest,
  createMockResponse,
  createMockUserService,
  createMockUser,
  createMockPartner,
  createMockOAuthProfile,
  mockPassportAuthenticate,
  createMockEncoder,
  createMockLoginToken,
  testData,
  testAsyncCallback,
  createMockLogger,
  authAssertions,
};

