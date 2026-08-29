import InitializeSystemUserDefinition from '../InitializeSystemUser';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import ReactoryUser from '@reactory/server-modules/reactory-core/models/User';
import { clients } from '@reactory/server-core/data';

jest.mock('@reactory/server-modules/reactory-core/models/ReactoryClient');
jest.mock('@reactory/server-modules/reactory-core/models/User');
jest.mock('@reactory/server-core/data', () => ({
  clients: [
    {
      key: 'reactory',
      name: 'Reactory Client',
      siteUrl: 'http://localhost:3000',
    },
  ],
}));

describe('InitializeSystemUser CLI Command', () => {
  const originalEnv = process.env;
  let mockContext: any;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      REACTORY_APPLICATION_EMAIL: 'system@reactory.net',
      REACTORY_APPLICATION_PASSWORD: 'SystemPassword123!',
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  it('should export a valid component definition', () => {
    expect(InitializeSystemUserDefinition.nameSpace).toBe('core');
    expect(InitializeSystemUserDefinition.name).toBe('InitializeSystemUser');
    expect(InitializeSystemUserDefinition.version).toBe('1.0.0');
    expect(typeof InitializeSystemUserDefinition.component).toBe('function');
  });

  it('should exit with error if email or password env vars are missing', async () => {
    delete process.env.REACTORY_APPLICATION_EMAIL;

    await expect(InitializeSystemUserDefinition.component([], mockContext)).rejects.toThrow(
      'process.exit called'
    );
    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining('[ConfigurationError]')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should create and save a new system user when user does not exist', async () => {
    const mockClient = {
      _id: { toString: () => 'client-id-123' },
      key: 'reactory',
    };
    (ReactoryClient.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockClient),
    });
    (ReactoryUser.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const mockSave = jest.fn().mockResolvedValue(true);
    const mockSetPassword = jest.fn();
    const mockAddRole = jest.fn().mockResolvedValue([]);

    const MockUserInstance = {
      setPassword: mockSetPassword,
      addRole: mockAddRole,
      save: mockSave,
    };
    (ReactoryUser as unknown as jest.Mock).mockImplementation(() => MockUserInstance);

    await InitializeSystemUserDefinition.component([], mockContext);

    expect(mockSetPassword).toHaveBeenCalledWith('SystemPassword123!');
    expect(mockAddRole).toHaveBeenCalledWith('client-id-123', 'SYSTEM');
    expect(mockSave).toHaveBeenCalled();
    expect(mockContext.log).toHaveBeenCalledWith(
      'System user initialized successfully',
      {},
      'info'
    );
  });

  it('should update password and roles if system user already exists and password differs', async () => {
    const mockClient = {
      _id: { toString: () => 'client-id-123' },
      key: 'reactory',
    };
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockSetPassword = jest.fn();
    const mockAddRole = jest.fn().mockResolvedValue([]);
    const mockValidatePassword = jest.fn().mockResolvedValue(false);

    const existingUser = {
      validatePassword: mockValidatePassword,
      setPassword: mockSetPassword,
      addRole: mockAddRole,
      save: mockSave,
      memberships: [],
    };

    (ReactoryClient.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockClient),
    });
    (ReactoryUser.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser),
    });

    await expect(
      InitializeSystemUserDefinition.component([], mockContext)
    ).rejects.toThrow('process.exit called');

    expect(mockValidatePassword).toHaveBeenCalledWith('SystemPassword123!');
    expect(mockSetPassword).toHaveBeenCalledWith('SystemPassword123!');
    expect(mockAddRole).toHaveBeenCalledWith('client-id-123', 'SYSTEM');
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
