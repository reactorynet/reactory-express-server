import SystemService from '../SystemService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-core/graph/ReactoryApolloClient', () => ({
  queryGraph: jest.fn(),
  mutateGraph: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const ReactoryClient: any = jest.fn();
  ReactoryClient.findById = jest.fn();
  ReactoryClient.find = jest.fn();
  ReactoryClient.findByIdAndUpdate = jest.fn();

  const Menu: any = jest.fn();
  Menu.find = jest.fn();

  return { ReactoryClient, Menu };
});

const models = require('@reactory/server-modules/reactory-core/models');

const moduleDef = (overrides: Record<string, unknown> = {}) => ({
  id: 'reactory-product',
  nameSpace: 'product',
  name: 'ReactoryProduct',
  version: '1.0.0',
  priority: 5,
  roles: ['PRODUCT_MANAGER'],
  ...overrides,
});

const makeContext = (modules: any[] = [moduleDef()]) => ({
  user: { _id: 'user-1' },
  partner: { _id: 'partner-1' },
  modules,
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  getService: jest.fn(),
});

const updateResult = (client: any) => ({ exec: jest.fn().mockResolvedValue(client) });

/**
 * `updateApplicationRoles` is the guard that keeps an application from
 * advertising a role the running backend cannot honour. These tests lock both
 * sides of that contract: accepted role sets are persisted, and any role that no
 * module provides is rejected before the write happens.
 */
describe('SystemService.updateApplicationRoles', () => {
  let service: SystemService;
  let context: any;

  beforeEach(() => {
    jest.clearAllMocks();
    context = makeContext();
    service = new SystemService({} as any, context);
  });

  it('persists a role set that the backend provides', async () => {
    const client = { _id: 'client-1', applicationRoles: [] as string[] };
    models.ReactoryClient.findByIdAndUpdate.mockReturnValue(updateResult(client));

    const result = await service.updateApplicationRoles('client-1', [
      'ANON',
      'USER',
      'PRODUCT_MANAGER',
    ]);

    expect(result).toBe(client);
    expect(models.ReactoryClient.findByIdAndUpdate).toHaveBeenCalledWith(
      'client-1',
      { $set: { applicationRoles: ['ANON', 'PRODUCT_MANAGER', 'USER'] } },
      { new: true },
    );
  });

  it('normalises, dedupes and sorts the role set before saving', async () => {
    const client = { _id: 'client-1' };
    models.ReactoryClient.findByIdAndUpdate.mockReturnValue(updateResult(client));

    await service.updateApplicationRoles('client-1', ['USER', ' USER ', 'PRODUCT_MANAGER']);

    const [, update] = models.ReactoryClient.findByIdAndUpdate.mock.calls[0];
    expect(update.$set.applicationRoles).toEqual(['PRODUCT_MANAGER', 'USER']);
  });

  it('rejects roles that no activated module provides', async () => {
    await expect(
      service.updateApplicationRoles('client-1', ['USER', 'CONTENT_MANAGER']),
    ).rejects.toThrow(/CONTENT_MANAGER/);

    expect(models.ReactoryClient.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('reports every unknown role in the error message', async () => {
    await expect(
      service.updateApplicationRoles('client-1', ['GHOST_A', 'GHOST_B', 'USER']),
    ).rejects.toThrow(/GHOST_A, GHOST_B/);
  });

  it('tags the error with a stable code and the offending roles', async () => {
    await expect(
      service.updateApplicationRoles('client-1', ['GHOST_ROLE']),
    ).rejects.toMatchObject({
      code: 'REACTORY_UNKNOWN_APPLICATION_ROLES',
      unknownRoles: ['GHOST_ROLE'],
    });
  });

  it('logs the rejection through the execution context', async () => {
    await expect(service.updateApplicationRoles('client-1', ['GHOST_ROLE'])).rejects.toThrow();

    expect(context.error).toHaveBeenCalledWith(
      expect.stringContaining('GHOST_ROLE'),
      expect.objectContaining({ clientId: 'client-1', unknownRoles: ['GHOST_ROLE'] }),
    );
  });

  it('accepts the platform baseline and system roles even with no modules loaded', async () => {
    jest.clearAllMocks();
    context = makeContext([]);
    service = new SystemService({} as any, context);
    const client = { _id: 'client-1' };
    models.ReactoryClient.findByIdAndUpdate.mockReturnValue(updateResult(client));

    await service.updateApplicationRoles('client-1', ['ANON', 'USER', 'ADMIN', 'DEVELOPER', 'SYSTEM']);

    expect(models.ReactoryClient.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('throws when the client does not exist', async () => {
    models.ReactoryClient.findByIdAndUpdate.mockReturnValue(updateResult(null));

    await expect(service.updateApplicationRoles('client-1', ['USER'])).rejects.toThrow(
      /not found/,
    );
  });

  it('accepts roles contributed by any module, not just core', async () => {
    jest.clearAllMocks();
    context = makeContext([
      moduleDef({ id: 'reactory-core', nameSpace: 'core', name: 'ReactoryServer', roles: ['ORGANIZATION_ADMIN'] }),
      moduleDef({ id: 'reactory-classroom', nameSpace: 'classroom', name: 'Classroom', roles: ['TUTOR', 'STUDENT'] }),
    ]);
    service = new SystemService({} as any, context);
    const client = { _id: 'client-1' };
    models.ReactoryClient.findByIdAndUpdate.mockReturnValue(updateResult(client));

    await service.updateApplicationRoles('client-1', ['ORGANIZATION_ADMIN', 'TUTOR', 'STUDENT']);

    expect(models.ReactoryClient.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });
});
