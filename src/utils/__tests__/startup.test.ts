import startup from '../startup';
import User from '@reactory/server-modules/reactory-core/models/User';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import { startServices } from '@reactory/server-core/services';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@reactory/server-core/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  getLogging: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@reactory/server-modules/reactory-core/models/User');
jest.mock('@reactory/server-modules/reactory-core/models/ReactoryClient');
jest.mock('@reactory/server-core/context/ReactoryContextProvider');
jest.mock('@reactory/server-core/authentication/strategies/helpers');
jest.mock('@reactory/server-core/services', () => ({
  startServices: jest.fn().mockResolvedValue(true),
}));
jest.mock('@reactory/server-core/utils/publishClientEnvFiles', () => ({
  publishClientEnvFiles: jest.fn().mockResolvedValue({ published: [], failed: [] }),
}));

describe('Server startup routine', () => {
  const originalEnv = process.env;
  let mockContext: any;
  let mockUserService: any;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      REACTORY_APPLICATION_EMAIL: 'reactory@localhost',
      REACTORY_APPLICATION_PASSWORD: 'SystemPassword123!',
      REACTORY_APPLICATION_USER_AUTO_CREATE: 'true',
      REACTORY_SYNC_CLIENT_CONFIGS: 'false',
    };

    mockUserService = {
      initializeSystemUser: jest.fn(),
    };

    mockContext = {
      id: 'test-context',
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      state: {},
      getService: jest.fn().mockImplementation((serviceId: string) => {
        if (serviceId === 'core.UserService@1.0.0') return mockUserService;
        return null;
      }),
    };

    (ReactoryContextProvider as unknown as jest.Mock).mockResolvedValue(mockContext);
    (Helpers.generateLoginToken as jest.Mock).mockResolvedValue('mock-auth-token');

    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  it('should auto-create system user via core.UserService when system user does not exist', async () => {
    const mockCreatedUser = {
      _id: 'system-user-id',
      email: 'reactory@localhost',
      validatePassword: jest.fn().mockResolvedValue(true),
    };

    (User.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockUserService.initializeSystemUser.mockResolvedValue(mockCreatedUser);
    (ReactoryClient.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue({ key: 'reactory' }),
    });

    const context = await startup();

    expect(mockContext.getService).toHaveBeenCalledWith('core.UserService@1.0.0');
    expect(mockUserService.initializeSystemUser).toHaveBeenCalled();
    expect(mockCreatedUser.validatePassword).toHaveBeenCalledWith('SystemPassword123!');
    expect(context.user).toBe(mockCreatedUser);
    expect(context.state.auth_token).toBe('mock-auth-token');
    expect(startServices).toHaveBeenCalledWith({}, context);
  });

  it('should exit if system user does not exist and auto-create is disabled', async () => {
    process.env.REACTORY_APPLICATION_USER_AUTO_CREATE = 'false';

    (User.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(startup()).rejects.toThrow('process.exit called');
    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining('System user not found')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should throw error if system user password validation fails', async () => {
    const mockExistingUser = {
      _id: 'existing-system-user-id',
      email: 'reactory@localhost',
      validatePassword: jest.fn().mockResolvedValue(false),
    };

    (User.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockExistingUser),
    });

    await expect(startup()).rejects.toThrow(
      'System user password is incorrect. Cannot continue startup process.'
    );
  });
});
