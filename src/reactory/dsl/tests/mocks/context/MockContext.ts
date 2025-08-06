import { IReactoryContext } from "@reactory/server-core/types/ReactoryContext";

const createMockContext = (): IReactoryContext => {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isAuthenticated: true,
      roles: ['user'],
      permissions: ['read', 'write'],
      organization: {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org'
      }
    },
    organization: {
      id: 'test-org-id',
      name: 'Test Organization',
      slug: 'test-org'
    },
    request: {
      headers: {},
      body: {},
      query: {},
      params: {},
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1'
    },
    response: {
      status: 200,
      headers: {},
      body: {}
    },
    logger: {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.log
    },
    services: {},
    dataSources: {},
    plugins: {},
    config: {
      environment: 'test',
      debug: true,
      host: 'localhost',
      port: 3000
    },
    error: (message: string) => {
      console.error(`DSL Error: ${message}`);
    },
    readline: null
  };
};

export default createMockContext; 