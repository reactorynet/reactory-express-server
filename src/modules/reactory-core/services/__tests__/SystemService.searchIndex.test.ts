/**
 * Regression tests for the search-indexing step of SystemService.onStartup.
 *
 * When a component could not be converted to a search model, componentToSearchModel
 * returned null and the caller pushed it into the batch regardless. A null in the
 * payload made Meilisearch reject the *entire* batch:
 *   "The `json` payload provided is malformed. Couldn't serialize document value:
 *    data are neither an object nor a list of objects."
 * These tests pin the null-skip guard and the provider-failure guard.
 */

const mockComponentFQN = jest.fn();
const mockFQN2ID = jest.fn();
const mockModules: { enabled: any[] } = { enabled: [] };

jest.mock('@reactory/server-core/utils/string', () => ({
  ComponentFQN: (component: any) => mockComponentFQN(component),
  FQN2ID: (fqn: string) => mockFQN2ID(fqn),
}));

jest.mock('@reactory/server-core/modules', () => ({
  __esModule: true,
  get default() {
    return mockModules;
  },
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => ({ ReactoryClient: {}, Menu: {} }));
jest.mock('@reactory/server-core/graph/ReactoryApolloClient', () => ({
  queryGraph: jest.fn(),
  mutateGraph: jest.fn(),
}));

import SystemService from '../SystemService';

const GOOD = { name: 'GoodComponent' } as any;
const BAD = { name: 'BadComponent' } as any;

const makeService = (context: any) => {
  const service: any = new SystemService({} as any, context);
  // Validation is irrelevant to the guard under test.
  service.validateModule = (): {
    module: any;
    valid: boolean;
    errors: string[];
    warnings: string[];
  } => ({
    module: mockModules.enabled[0],
    valid: true,
    errors: [],
    warnings: [],
  });
  const index = jest.fn().mockResolvedValue({ success: true });
  service.searchService = { index };
  return { service, index };
};

describe('SystemService.onStartup search indexing', () => {
  beforeEach(() => {
    mockModules.enabled = [
      {
        nameSpace: 'test',
        name: 'TestModule',
        version: '1.0.0',
        description: 'test module',
        priority: 1,
        models: [GOOD, BAD],
        services: [],
        workflows: [],
        pdfs: [],
        clientPlugins: [],
        cli: [],
        forms: [],
        passportProviders: [],
      },
    ];
    mockComponentFQN.mockReset();
    mockComponentFQN.mockImplementation((component: any) => {
      if (component === BAD) throw new Error('unresolvable component');
      return 'test.Component@1.0.0';
    });
    mockFQN2ID.mockReset();
    mockFQN2ID.mockReturnValue(42);
  });

  it('never pushes null into an index batch', async () => {
    const context = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const { service, index } = makeService(context);

    await service.onStartup();

    const modelsCall = index.mock.calls.find((call: any[]) => call[0] === 'reactory_models');
    expect(modelsCall).toBeTruthy();

    const docs = modelsCall![1] as any[];
    expect(docs.some((doc) => doc === null || doc === undefined)).toBe(false);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ id: 42, name: 'GoodComponent' });

    expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('no search model'));
    expect(context.error).toHaveBeenCalledWith(
      expect.stringContaining('Error converting a models component'),
    );
  });

  it('absorbs a rejected index promise and reports it', async () => {
    const context = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const { service, index } = makeService(context);
    index.mockRejectedValue(new Error('meili down'));

    await expect(service.onStartup()).resolves.toBe(true);

    // Allow the attached rejection handler to run.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(context.error).toHaveBeenCalledWith(
      expect.stringContaining('Indexing reactory_models failed'),
    );
  });
});
