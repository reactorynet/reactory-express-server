// Mock Hash function before other imports
jest.doMock('@reactory/server-core/utils/hash', () => ({
  default: jest.fn().mockImplementation((input) => `hash-${input}`),
}));

import { ReactoryContext } from '../ReactoryContextProvider';

// Mock the logger after import
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
require('@reactory/server-core/logging').default = mockLogger;
jest.mock('@reactory/server-core/utils', () => ({
  objectMapper: {},
}));
jest.mock('@reactory/server-core/ioc', () => ({
  ReactoryContainer: {},
}));
jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));
jest.mock('i18next', () => ({
  default: {},
  t: jest.fn(),
}));
jest.mock('@reactory/server-modules/reactory-core/models/CoreCache', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  },
}));
jest.mock('@reactory/server-modules/reactory-core/models/ReactoryClient', () => ({
  default: {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
  },
}));
jest.mock('@reactory/server-modules/reactory-core/models/User', () => ({
  default: {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
  },
}));
jest.mock('@reactory/server-modules/reactory-telemetry/ReactoryTelemetry');
jest.mock('@reactory/server-modules/reactory-core/services/RedisService');

// Mock Reactory types
jest.mock('@reactorynet/reactory-core', () => ({
  Reactory: {
    Models: {
      IUserDocument: {},
      IReactoryClientDocument: {},
      IPartner: {},
      IOrganizationDocument: {},
      IBusinessUnitDocument: {},
    },
    Server: {
      IReactoryContext: {},
      IExecutionContextProvider: {},
    },
    Service: {
      IReactoryService: {},
      IReactoryServiceDefinition: {},
      IReactoryUserService: {},
      IReactorySystemService: {},
      SERVICE_LIFECYCLE: {
        singleton: 'singleton',
        request: 'request',
      },
      LOG_TYPE: {
        debug: 'debug',
        info: 'info',
        warn: 'warn',
        error: 'error',
      },
    },
    UX: {
      IReactoryTheme: {},
      IThemePalette: {},
      IReactoryMenuConfig: [],
    },
  },
}), { virtual: true });

describe('ReactoryContext', () => {
  let mockSession: any;
  let context: ReactoryContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = { id: 'session-123' };

    // Mock ServiceManager
    const mockServiceManager = {
      getInstance: jest.fn().mockReturnValue({
        getServices: jest.fn().mockReturnValue([]),
        getService: jest.fn(),
        listServices: jest.fn().mockReturnValue([]),
      }),
    };
    require('@reactory/server-core/services/ServiceManager').default = mockServiceManager;

    // Mock ReactoryTelemetry
    const MockReactoryTelemetry = jest.fn().mockImplementation(() => ({}));
    require('@reactory/server-modules/reactory-telemetry/ReactoryTelemetry').ReactoryTelemetry = MockReactoryTelemetry;

    // Mock RedisService
    const MockRedisService = jest.fn().mockImplementation(() => ({}));
    require('@reactory/server-modules/reactory-core/services/RedisService').default = MockRedisService;

    context = new ReactoryContext(mockSession);
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(context.id).toBeDefined();
      expect(context.state).toEqual({});
      expect(context.user).toBeNull();
      expect(context.partner).toBeNull();
      expect(context.lang).toBeDefined();
      expect(context.languages).toEqual([context.lang]);
      expect(context.host).toBe('express');
    });

    it('should use provided currentContext values', () => {
      const currentContext = {
        user: { id: 'user-123' } as any,
        partner: { key: 'partner-123' } as any,
        lang: 'fr',
        host: 'cli' as any,
      };

      const customContext = new ReactoryContext(mockSession, currentContext);

      expect(customContext.user).toEqual(currentContext.user);
      expect(customContext.partner).toEqual(currentContext.partner);
      expect(customContext.lang).toBe('fr');
      expect(customContext.host).toBe('cli');
    });

    it('should initialize service manager', () => {
      const mockServiceManager = require('@reactory/server-core/services/ServiceManager').default;
      expect(mockServiceManager.getInstance).toHaveBeenCalledWith(context);
    });
  });

  describe.skip('Logging Methods', () => {
    it('should log debug messages', () => {
      context.debug('Test debug message', { meta: 'data' }, 'TestClass');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Test debug message'),
        { meta: 'data' }
      );
    });

    it('should log info messages', () => {
      const mockLogger = require('@reactory/server-core/logging').default;
      context.info('Test info message', { meta: 'data' }, 'TestClass');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Test info message'),
        { meta: 'data' }
      );
    });

    it('should log warning messages', () => {
      const mockLogger = require('@reactory/server-core/logging').default;
      context.warn('Test warning message', { meta: 'data' }, 'TestClass');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message'),
        { meta: 'data' }
      );
    });

    it('should log error messages', () => {
      const mockLogger = require('@reactory/server-core/logging').default;
      context.error('Test error message', new Error('Test error'), { meta: 'data' }, 'TestClass');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error message'),
        new Error('Test error')
      );
    });

    it('should handle different log types', () => {
      const mockLogger = require('@reactory/server-core/logging').default;

      context.log('Debug message', {}, 'debug');
      expect(mockLogger.debug).toHaveBeenCalled();

      context.log('Info message', {}, 'info');
      expect(mockLogger.info).toHaveBeenCalled();

      context.log('Warning message', {}, 'warning');
      expect(mockLogger.warn).toHaveBeenCalled();

      context.log('Error message', {}, 'error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getService', () => {
    it('should delegate to service manager', () => {
      const mockService = { id: 'test-service' };
      const serviceManager = (context as any).serviceManager;
      serviceManager.getService.mockReturnValue(mockService);

      const result = context.getService('test.Service@1.0.0', { prop: 'value' }, 'singleton');

      expect(serviceManager.getService).toHaveBeenCalledWith(
        'test.Service@1.0.0',
        { prop: 'value' },
        context,
        'singleton'
      );
      expect(result).toBe(mockService);
    });
  });

  describe('listServices', () => {
    it('should delegate to service manager', () => {
      const mockServices = [{ id: 'service1' }, { id: 'service2' }];
      const serviceManager = (context as any).serviceManager;
      serviceManager.listServices.mockReturnValue(mockServices);

      const filter = { type: 'data' };
      const result = context.listServices(filter);

      expect(serviceManager.listServices).toHaveBeenCalledWith(filter);
      expect(result).toBe(mockServices);
    });
  });

  describe('hasRole', () => {
    it('should return false when no user', () => {
      context.user = null;
      const result = context.hasRole('ADMIN');
      expect(result).toBe(false);
    });

    it('should delegate to user.hasRole when user exists', () => {
      const mockUser = {
        hasRole: jest.fn().mockReturnValue(true),
      };
      context.user = mockUser as any;
      context.partner = { _id: 'partner-123' } as any;

      const result = context.hasRole('ADMIN');

      expect(mockUser.hasRole).toHaveBeenCalledWith('partner-123', 'ADMIN', undefined, undefined);
      expect(result).toBe(true);
    });

    it('should pass organization and business unit parameters', () => {
      const mockUser = {
        hasRole: jest.fn().mockReturnValue(false),
      };
      context.user = mockUser as any;
      context.partner = { _id: 'partner-123' } as any;

      const partner = { _id: 'custom-partner' };
      const organization = { _id: 'org-123' };
      const businessUnit = { _id: 'bu-123' };

      context.hasRole('USER', partner as any, organization as any, businessUnit as any);

      expect(mockUser.hasRole).toHaveBeenCalledWith(
        'custom-partner',
        'USER',
        'org-123',
        'bu-123'
      );
    });
  });

  describe('hasAnyRole', () => {
    it('should return false when no user', () => {
      context.user = null;
      const result = context.hasAnyRole(['ADMIN', 'USER']);
      expect(result).toBe(false);
    });

    it('should return true when user has at least one role', () => {
      const mockUser = {
        hasRole: jest.fn()
          .mockReturnValueOnce(false) // ADMIN check
          .mockReturnValueOnce(true), // USER check
      };
      context.user = mockUser as any;
      context.partner = { _id: 'partner-123' } as any;

      const result = context.hasAnyRole(['ADMIN', 'USER']);

      expect(result).toBe(true);
      expect(mockUser.hasRole).toHaveBeenCalledTimes(2);
    });

    it('should return false when user has none of the roles', () => {
      const mockUser = {
        hasRole: jest.fn().mockReturnValue(false),
      };
      context.user = mockUser as any;
      context.partner = { _id: 'partner-123' } as any;

      const result = context.hasAnyRole(['ADMIN', 'USER']);

      expect(result).toBe(false);
      expect(mockUser.hasRole).toHaveBeenCalledTimes(2);
    });
  });

  describe('Context Value Management', () => {
    let mockRedis: any;
    let mockCache: any;

    beforeEach(() => {
      mockRedis = {
        getJSON: jest.fn(),
        setJSON: jest.fn(),
        del: jest.fn(),
      };

      mockCache = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        deleteOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      };

      // Mock the Redis service to return our mock
      const serviceManager = (context as any).serviceManager;
      serviceManager.getService.mockReturnValue(mockRedis);

      context.partner = { _id: 'partner-123' } as any;
    });

    describe('with Redis enabled', () => {
      beforeAll(() => {
        process.env.USE_REDIS_CACHE = 'true';
      });

      afterAll(() => {
        delete process.env.USE_REDIS_CACHE;
      });

      it('should get values from Redis', async () => {
        mockRedis.getJSON.mockResolvedValue('cached-value');

        const result = await context.getValue('test-key');

        expect(mockRedis.getJSON).toHaveBeenCalledWith('partner:partner-123:context:test-key');
        expect(result).toBe('cached-value');
      });

      it('should return default value when Redis returns null', async () => {
        mockRedis.getJSON.mockResolvedValue(null);
        const defaultValue = Promise.resolve('default');

        const result = await context.getValue('test-key', defaultValue);

        expect(result).toBe('default');
      });

      it('should set values in Redis', async () => {
        mockRedis.setJSON.mockResolvedValue('OK');

        await context.setValue('test-key', 'test-value', 3600);

        expect(mockRedis.setJSON).toHaveBeenCalledWith(
          'partner:partner-123:context:test-key',
          'test-value',
          3600
        );
      });

      it('should remove values from Redis', async () => {
        mockRedis.del.mockReturnValue(1);

        await context.removeValue('test-key');

        expect(mockRedis.del).toHaveBeenCalledWith('partner:partner-123:context:test-key');
      });
    });

    describe('with Redis disabled', () => {
      beforeAll(() => {
        process.env.USE_REDIS_CACHE = 'false';
      });

      afterAll(() => {
        delete process.env.USE_REDIS_CACHE;
      });

      it('should get values from database cache', async () => {
        mockCache.getItem.mockResolvedValue('db-cached-value');

        const result = await context.getValue('test-key');

        expect(mockCache.getItem).toHaveBeenCalledWith('test-key', false, context.partner);
        expect(result).toBe('db-cached-value');
      });

      it('should set values in database cache', async () => {
        mockCache.setItem.mockResolvedValue(undefined);

        await context.setValue('test-key', 'test-value', 3600);

        expect(mockCache.setItem).toHaveBeenCalledWith(
          'test-key',
          'test-value',
          3600,
          context.partner
        );
      });

      it('should remove values from database cache', async () => {
        await context.removeValue('test-key');

        expect(mockCache.deleteOne).toHaveBeenCalledWith({
          key: 'test-key',
          partner: context.partner._id
        });
      });
    });
  });

  describe('extend', () => {
    it('should return self when no custom context provider', async () => {
      context.partner = null;

      const result = await context.extend();

      expect(result).toBe(context);
    });

    it('should use custom context provider when configured', async () => {
      const mockPartner = {
        getSetting: jest.fn().mockReturnValue({ data: 'custom.ContextProvider@1.0.0' }),
      };
      context.partner = mockPartner as any;

      const mockContextProvider = {
        getContext: jest.fn().mockResolvedValue({ extended: true }),
      };

      const serviceManager = (context as any).serviceManager;
      serviceManager.getService.mockReturnValue(mockContextProvider);

      const result = await context.extend();

      expect(mockContextProvider.getContext).toHaveBeenCalledWith(context);
      expect(result).toEqual({ extended: true });
    });
  });

  describe('runAs and runAsSystem', () => {
    it('should temporarily change user context', async () => {
      const originalUser = { id: 'original' };
      const tempUser = { id: 'temp' };
      context.user = originalUser as any;

      const mockTarget = Promise.resolve('result');

      const result = await context.runAs(tempUser as any, mockTarget);

      expect(context.user).toBe(originalUser); // Should restore original user
      expect(result).toBe('result');
    });

    it('should run as system user', async () => {
      const systemUser = { id: 'system' };
      const mockUserService = {
        findUserWithEmail: jest.fn().mockResolvedValue(systemUser),
      };

      const serviceManager = (context as any).serviceManager;
      serviceManager.getService.mockReturnValue(mockUserService);

      const mockTarget = Promise.resolve('system-result');

      const result = await context.runAsSystem(mockTarget);

      expect(mockUserService.findUserWithEmail).toHaveBeenCalledWith(process.env.SYSTEM_USER_EMAIL);
      expect(result).toBe('system-result');
    });
  });

  describe('forPartner and forUser', () => {
    it('should set partner by key', async () => {
      const mockPartner = { key: 'test-partner' };
      const MockReactoryClientModel = require('@reactory/server-modules/reactory-core/models/ReactoryClient').default;
      MockReactoryClientModel.findOne.mockResolvedValue(mockPartner);

      await context.forPartner('test-partner');

      expect(context.partner).toBe(mockPartner);
      expect(MockReactoryClientModel.findOne).toHaveBeenCalledWith({ key: 'test-partner' });
    });

    it('should set user by email', async () => {
      const mockUser = { email: 'test@example.com' };
      const MockUserModel = require('@reactory/server-modules/reactory-core/models/User').default;
      MockUserModel.findOne.mockResolvedValue(mockUser);

      await context.forUser('test@example.com');

      expect(context.user).toBe(mockUser);
      expect(MockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });
});