// Mock both SDKs so constructing real providers never touches a network client.
jest.mock('meilisearch', () => ({
  __esModule: true,
  TaskStatus: {},
  MeiliSearch: jest.fn(() => ({})),
}));
jest.mock('@elastic/elasticsearch', () => ({
  __esModule: true,
  Client: jest.fn(() => ({})),
}));

import ReactorySearchService from '../../ReactorySearchService';

const mockContext = { error: jest.fn(), warn: jest.fn(), log: jest.fn() } as any;

const withProviderEnv = (value: string | undefined, fn: () => void) => {
  const prev = process.env.REACTORY_SEARCH_PROVIDER;
  if (value === undefined) delete process.env.REACTORY_SEARCH_PROVIDER;
  else process.env.REACTORY_SEARCH_PROVIDER = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.REACTORY_SEARCH_PROVIDER;
    else process.env.REACTORY_SEARCH_PROVIDER = prev;
  }
};

describe('ReactorySearchService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('provider selection', () => {
    it('defaults to the MeiliSearch provider', () => {
      withProviderEnv(undefined, () => {
        const svc = new ReactorySearchService({} as any, mockContext);
        expect(svc.getProvider().id).toBe('meilisearch');
      });
    });

    it('selects ElasticSearch when configured via env', () => {
      withProviderEnv('elasticsearch', () => {
        const svc = new ReactorySearchService({} as any, mockContext);
        expect(svc.getProvider().id).toBe('elasticsearch');
      });
    });

    it('falls back to the default and warns for an unknown provider', () => {
      withProviderEnv('does-not-exist', () => {
        const svc = new ReactorySearchService({} as any, mockContext);
        expect(svc.getProvider().id).toBe('meilisearch');
        expect(mockContext.warn).toHaveBeenCalled();
      });
    });
  });

  describe('delegation to the active provider', () => {
    let svc: ReactorySearchService;
    const provider = {
      id: 'mock',
      search: jest.fn(),
      index: jest.fn(),
      deleteIndex: jest.fn(),
      healthCheck: jest.fn(),
    };

    beforeEach(() => {
      svc = new ReactorySearchService({} as any, mockContext);
      svc.setProvider(provider as any);
    });

    it('search delegates with all arguments', async () => {
      provider.search.mockResolvedValue({ results: [], offset: 0, limit: 10, total: 0 });
      await svc.search('idx', 'q', ['f'], 10, 2);
      expect(provider.search).toHaveBeenCalledWith('idx', 'q', ['f'], 10, 2);
    });

    it('index delegates', async () => {
      provider.index.mockResolvedValue({ id: 'idx', success: true });
      const res = await svc.index('idx', [{ id: 1 }]);
      expect(provider.index).toHaveBeenCalledWith('idx', [{ id: 1 }]);
      expect(res.success).toBe(true);
    });

    it('deleteIndex delegates', async () => {
      provider.deleteIndex.mockResolvedValue(true);
      expect(await svc.deleteIndex('idx')).toBe(true);
      expect(provider.deleteIndex).toHaveBeenCalledWith('idx');
    });

    it('onStartup runs the provider health check and warns when unhealthy', async () => {
      provider.healthCheck.mockResolvedValue(false);
      await svc.onStartup();
      expect(provider.healthCheck).toHaveBeenCalled();
      expect(mockContext.warn).toHaveBeenCalled();
    });

    it('onStartup does not throw when health check rejects', async () => {
      provider.healthCheck.mockRejectedValue(new Error('boom'));
      await expect(svc.onStartup()).resolves.toBeUndefined();
    });
  });

  describe('extended operations', () => {
    let svc: ReactorySearchService;
    const provider = {
      id: 'mock',
      search: jest.fn(),
      index: jest.fn(),
      deleteIndex: jest.fn(),
      createIndex: jest.fn(),
      configureIndex: jest.fn(),
      deleteDocuments: jest.fn(),
      count: jest.fn(),
    };

    beforeEach(() => {
      svc = new ReactorySearchService({} as any, mockContext);
      svc.setProvider(provider as any);
    });

    it('passes a structured query through search unchanged', async () => {
      provider.search.mockResolvedValue({ results: [], offset: 0, limit: 10, total: 0 });
      const query = { q: 'x', filters: [{ field: 'a', value: 1 }] };
      await svc.search('idx', query as any);
      expect(provider.search).toHaveBeenCalledWith('idx', query, undefined, undefined, undefined);
    });

    it('createIndex / configureIndex / deleteDocuments / count delegate', async () => {
      provider.createIndex.mockResolvedValue({ id: 'idx', success: true });
      provider.configureIndex.mockResolvedValue(true);
      provider.deleteDocuments.mockResolvedValue({ id: 'idx', success: true });
      provider.count.mockResolvedValue(7);

      await svc.createIndex('idx', { searchableAttributes: ['t'] });
      expect(provider.createIndex).toHaveBeenCalledWith('idx', { searchableAttributes: ['t'] });

      await svc.configureIndex('idx', { filterableAttributes: ['b'] });
      expect(provider.configureIndex).toHaveBeenCalledWith('idx', { filterableAttributes: ['b'] });

      await svc.deleteDocuments('idx', [1, 2]);
      expect(provider.deleteDocuments).toHaveBeenCalledWith('idx', [1, 2]);

      expect(await svc.count('idx', 'q')).toBe(7);
      expect(provider.count).toHaveBeenCalledWith('idx', 'q');
    });

    it('throws a clear error when the provider lacks a capability', async () => {
      svc.setProvider({ id: 'bare', search: jest.fn(), index: jest.fn(), deleteIndex: jest.fn() } as any);
      await expect(svc.createIndex('idx')).rejects.toThrow(/does not support 'createIndex'/);
      await expect(svc.count('idx')).rejects.toThrow(/does not support 'count'/);
    });

    it('rejects an empty index name', async () => {
      await expect(svc.search('', 'q')).rejects.toThrow(/non-empty index name/);
      await expect(svc.createIndex('  ')).rejects.toThrow(/non-empty index name/);
    });

    it('index rejects non-array data without hitting the provider', async () => {
      const res = await svc.index('idx', 'nope' as any);
      expect(res.success).toBe(false);
      expect(provider.index).not.toHaveBeenCalled();
    });
  });

  describe('ISearchService compatibility', () => {
    it('preserves the public method surface and lifecycle helpers', () => {
      const svc = new ReactorySearchService({} as any, mockContext);
      expect(typeof svc.search).toBe('function');
      expect(typeof svc.index).toBe('function');
      expect(typeof svc.deleteIndex).toBe('function');
      expect(svc.getExecutionContext()).toBe(mockContext);
      const newCtx = { warn: jest.fn() } as any;
      svc.setExecutionContext(newCtx);
      expect(svc.getExecutionContext()).toBe(newCtx);
      // name/nameSpace/version are populated by DI; simulate that here.
      svc.nameSpace = 'core';
      svc.name = 'ReactorySearchService';
      svc.version = '1.0.0';
      expect(svc.toString(true)).toBe('core.ReactorySearchService@1.0.0');
    });
  });
});
