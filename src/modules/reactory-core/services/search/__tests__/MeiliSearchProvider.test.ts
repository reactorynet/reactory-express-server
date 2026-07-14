// Mock the meilisearch SDK before importing the provider.
const mockIndex = {
  search: jest.fn(),
  addDocuments: jest.fn(),
  updateSettings: jest.fn(),
  deleteDocuments: jest.fn(),
};
const mockMeiliClient = {
  index: jest.fn(() => mockIndex),
  createIndex: jest.fn(),
  deleteIndexIfExists: jest.fn(),
  health: jest.fn(),
};

jest.mock('meilisearch', () => ({
  __esModule: true,
  TaskStatus: {
    TASK_ENQUEUED: 'enqueued',
    TASK_PROCESSING: 'processing',
    TASK_SUCCEEDED: 'succeeded',
    TASK_FAILED: 'failed',
  },
  MeiliSearch: jest.fn(() => mockMeiliClient),
}));

import MeiliSearchProvider from '../providers/MeiliSearchProvider';

const mockContext = { error: jest.fn(), warn: jest.fn() } as any;

const makeProvider = () => new MeiliSearchProvider({}, mockContext);

describe('MeiliSearchProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has the meilisearch id', () => {
    expect(makeProvider().id).toBe('meilisearch');
  });

  describe('search', () => {
    it('maps MeiliSearch hits to ISearchResults', async () => {
      mockIndex.search.mockResolvedValue({
        hits: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
        limit: 10,
        offset: 0,
        estimatedTotalHits: 2,
      });

      const provider = makeProvider();
      const result = await provider.search<any>('articles', 'query', ['title'], 10, 0);

      expect(mockMeiliClient.index).toHaveBeenCalledWith('articles');
      expect(mockIndex.search).toHaveBeenCalledWith('query', {
        attributesToHighlight: ['title'],
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        limit: 10,
        offset: 0,
        total: 2,
        results: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
      });
    });

    it('translates a structured query into MeiliSearch params', async () => {
      mockIndex.search.mockResolvedValue({ hits: [], limit: 5, offset: 0, estimatedTotalHits: 0 });
      await makeProvider().search<any>('articles', {
        q: 'phones',
        fields: ['title'],
        highlight: ['title'],
        select: ['id', 'title'],
        filters: [
          { field: 'brand', op: 'eq', value: 'acme' },
          { field: 'price', op: 'lte', value: 500 },
          { field: 'tag', op: 'in', value: ['a', 'b'] },
        ],
        sort: [{ field: 'price', direction: 'desc' }],
        limit: 5,
        offset: 0,
      });
      expect(mockIndex.search).toHaveBeenCalledWith('phones', {
        attributesToSearchOn: ['title'],
        attributesToHighlight: ['title'],
        attributesToRetrieve: ['id', 'title'],
        filter: ['brand = "acme"', 'price <= 500', 'tag IN ["a", "b"]'],
        sort: ['price:desc'],
        limit: 5,
        offset: 0,
      });
    });
  });

  describe('createIndex / configureIndex', () => {
    it('creates the index with a primary key and applies attribute settings', async () => {
      mockMeiliClient.createIndex.mockResolvedValue({ taskUid: 1 });
      mockIndex.updateSettings.mockResolvedValue({ taskUid: 2 });
      const res = await makeProvider().createIndex('articles', {
        primaryKey: 'id',
        searchableAttributes: ['title'],
        filterableAttributes: ['brand'],
        sortableAttributes: ['price'],
      });
      expect(mockMeiliClient.createIndex).toHaveBeenCalledWith('articles', { primaryKey: 'id' });
      expect(mockIndex.updateSettings).toHaveBeenCalledWith({
        searchableAttributes: ['title'],
        filterableAttributes: ['brand'],
        sortableAttributes: ['price'],
      });
      expect(res).toEqual({ id: 'articles', success: true });
    });

    it('reports failure when createIndex throws', async () => {
      mockMeiliClient.createIndex.mockRejectedValue(new Error('exists'));
      const res = await makeProvider().createIndex('articles');
      expect(res.success).toBe(false);
      expect(res.error).toBe('exists');
    });

    it('configureIndex only sends provided attribute settings', async () => {
      mockIndex.updateSettings.mockResolvedValue({ taskUid: 3 });
      const ok = await makeProvider().configureIndex('articles', { filterableAttributes: ['brand'] });
      expect(mockIndex.updateSettings).toHaveBeenCalledWith({ filterableAttributes: ['brand'] });
      expect(ok).toBe(true);
    });
  });

  describe('deleteDocuments', () => {
    it('delegates ids to the index and returns success', async () => {
      mockIndex.deleteDocuments.mockResolvedValue({ taskUid: 4 });
      const res = await makeProvider().deleteDocuments('articles', [1, 2, 3]);
      expect(mockIndex.deleteDocuments).toHaveBeenCalledWith([1, 2, 3]);
      expect(res).toEqual({ id: 'articles', success: true });
    });
  });

  describe('count', () => {
    it('runs a zero-limit search and returns estimatedTotalHits', async () => {
      mockIndex.search.mockResolvedValue({ hits: [], estimatedTotalHits: 42 });
      const total = await makeProvider().count('articles', 'phones');
      expect(mockIndex.search).toHaveBeenCalledWith('phones', { limit: 0 });
      expect(total).toBe(42);
    });
  });

  describe('index', () => {
    it('reports success for an enqueued task', async () => {
      mockIndex.addDocuments.mockResolvedValue({ indexUid: 'articles', status: 'enqueued' });
      const provider = makeProvider();
      const res = await provider.index('articles', [{ id: 1 }]);
      expect(mockIndex.addDocuments).toHaveBeenCalledWith([{ id: 1 }]);
      expect(res).toEqual({ id: 'articles', success: true });
    });

    it('reports failure for a failed task status', async () => {
      mockIndex.addDocuments.mockResolvedValue({ indexUid: 'articles', status: 'failed' });
      const res = await makeProvider().index('articles', [{ id: 1 }]);
      expect(res.success).toBe(false);
    });

    it('captures errors and returns a failure result', async () => {
      mockIndex.addDocuments.mockRejectedValue(new Error('boom'));
      const res = await makeProvider().index('articles', [{ id: 1 }]);
      expect(res).toEqual({ id: '', success: false, error: 'boom' });
      expect(mockContext.error).toHaveBeenCalledWith('boom');
    });

    it('short-circuits an empty batch without calling the client', async () => {
      const res = await makeProvider().index('articles', []);
      expect(res).toEqual({ id: 'articles', success: true });
      expect(mockIndex.addDocuments).not.toHaveBeenCalled();
    });

    it('splits large document sets into multiple addDocuments calls (payload limit)', async () => {
      mockIndex.addDocuments.mockResolvedValue({ indexUid: 'articles', status: 'enqueued' });
      // 2500 docs exceeds the 1000-doc batch cap -> expect 3 batches.
      const docs = Array.from({ length: 2500 }, (_, i) => ({ id: i, name: `doc-${i}` }));
      const res = await makeProvider().index('articles', docs);
      expect(res).toEqual({ id: 'articles', success: true });
      expect(mockIndex.addDocuments).toHaveBeenCalledTimes(3);
      const total = mockIndex.addDocuments.mock.calls.reduce((n, c) => n + c[0].length, 0);
      expect(total).toBe(2500);
      expect(mockIndex.addDocuments.mock.calls.every((c) => c[0].length <= 1000)).toBe(true);
    });

    it('stops and reports failure when a batch task fails', async () => {
      mockIndex.addDocuments
        .mockResolvedValueOnce({ indexUid: 'articles', status: 'enqueued' })
        .mockResolvedValueOnce({ indexUid: 'articles', status: 'failed' });
      const docs = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
      const res = await makeProvider().index('articles', docs);
      expect(res.success).toBe(false);
    });
  });

  describe('deleteIndex', () => {
    it('delegates to deleteIndexIfExists and returns true', async () => {
      mockMeiliClient.deleteIndexIfExists.mockResolvedValue(undefined);
      const ok = await makeProvider().deleteIndex('articles');
      expect(mockMeiliClient.deleteIndexIfExists).toHaveBeenCalledWith('articles');
      expect(ok).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('returns true when status is available', async () => {
      mockMeiliClient.health.mockResolvedValue({ status: 'available' });
      expect(await makeProvider().healthCheck()).toBe(true);
    });
    it('returns false when the client throws', async () => {
      mockMeiliClient.health.mockRejectedValue(new Error('down'));
      expect(await makeProvider().healthCheck()).toBe(false);
    });
  });
});
