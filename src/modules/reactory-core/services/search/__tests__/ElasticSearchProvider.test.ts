// Mock the elasticsearch SDK before importing the provider.
const mockEsClient = {
  search: jest.fn(),
  bulk: jest.fn(),
  count: jest.fn(),
  indices: { delete: jest.fn(), create: jest.fn(), putMapping: jest.fn() },
  ping: jest.fn(),
};

jest.mock('@elastic/elasticsearch', () => ({
  __esModule: true,
  Client: jest.fn(() => mockEsClient),
}));

import ElasticSearchProvider from '../providers/ElasticSearchProvider';

const mockContext = { error: jest.fn(), warn: jest.fn() } as any;
const makeProvider = () => new ElasticSearchProvider({ host: 'http://es:9200' }, mockContext);

describe('ElasticSearchProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has the elasticsearch id', () => {
    expect(makeProvider().id).toBe('elasticsearch');
  });

  describe('buildClientOptions', () => {
    it('prefers explicit nodes array over host', () => {
      const opts = ElasticSearchProvider.buildClientOptions({ nodes: ['http://a:9200', 'http://b:9200'] });
      expect(opts.nodes).toEqual(['http://a:9200', 'http://b:9200']);
      expect(opts.node).toBeUndefined();
    });
    it('uses apiKey auth when provided', () => {
      const opts = ElasticSearchProvider.buildClientOptions({ host: 'http://es:9200', apiKey: 'KEY' });
      expect(opts).toEqual(expect.objectContaining({ node: 'http://es:9200', auth: { apiKey: 'KEY' } }));
    });
    it('uses basic auth when username/password provided', () => {
      const opts = ElasticSearchProvider.buildClientOptions({ host: 'http://es:9200', username: 'u', password: 'p' });
      expect(opts.auth).toEqual({ username: 'u', password: 'p' });
    });
  });

  describe('search', () => {
    const esResponse = {
      hits: { total: { value: 2, relation: 'eq' }, hits: [{ _source: { id: 1 } }, { _source: { id: 2 } }] },
    };

    it('builds a match_all query for an empty filter and maps _source', async () => {
      mockEsClient.search.mockResolvedValue(esResponse);
      const res = await makeProvider().search<any>('idx', '', undefined, 10, 5);
      const arg = mockEsClient.search.mock.calls[0][0];
      expect(arg).toEqual({ index: 'idx', from: 5, size: 10, query: { match_all: {} } });
      expect(res).toEqual({ limit: 10, offset: 5, total: 2, results: [{ id: 1 }, { id: 2 }] });
    });

    it('builds a multi_match query when fields are supplied', async () => {
      mockEsClient.search.mockResolvedValue(esResponse);
      await makeProvider().search('idx', 'term', ['title', 'body'], 20, 0);
      const arg = mockEsClient.search.mock.calls[0][0];
      expect(arg.query).toEqual({ multi_match: { query: 'term', fields: ['title', 'body'] } });
    });

    it('builds a simple_query_string query when no fields are supplied', async () => {
      mockEsClient.search.mockResolvedValue(esResponse);
      await makeProvider().search('idx', 'term', undefined, 20, 0);
      const arg = mockEsClient.search.mock.calls[0][0];
      expect(arg.query).toEqual({ simple_query_string: { query: 'term' } });
    });

    it('normalises a numeric total', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { total: 7, hits: [] } });
      const res = await makeProvider().search('idx', '', undefined, 10, 0);
      expect(res.total).toBe(7);
    });

    it('builds a bool query with must + filter for a structured query', async () => {
      mockEsClient.search.mockResolvedValue(esResponse);
      await makeProvider().search<any>('idx', {
        q: 'phones',
        fields: ['title'],
        filters: [
          { field: 'brand', op: 'eq', value: 'acme' },
          { field: 'price', op: 'lte', value: 500 },
          { field: 'tag', op: 'in', value: ['a', 'b'] },
        ],
        sort: [{ field: 'price', direction: 'desc' }],
        select: ['id', 'title'],
        highlight: ['title'],
        limit: 5,
        offset: 10,
      });
      const arg = mockEsClient.search.mock.calls[0][0];
      expect(arg.from).toBe(10);
      expect(arg.size).toBe(5);
      expect(arg.query).toEqual({
        bool: {
          must: [{ multi_match: { query: 'phones', fields: ['title'] } }],
          filter: [
            { term: { brand: 'acme' } },
            { range: { price: { lte: 500 } } },
            { terms: { tag: ['a', 'b'] } },
          ],
        },
      });
      expect(arg.sort).toEqual([{ price: { order: 'desc' } }]);
      expect(arg._source).toEqual(['id', 'title']);
      expect(arg.highlight).toEqual({ fields: { title: {} } });
    });

    it('falls back to match_all for an empty structured query', async () => {
      mockEsClient.search.mockResolvedValue(esResponse);
      await makeProvider().search('idx', { limit: 10 });
      expect(mockEsClient.search.mock.calls[0][0].query).toEqual({ match_all: {} });
    });
  });

  describe('createIndex / configureIndex', () => {
    it('creates an index with keyword/text mappings from attributes', async () => {
      mockEsClient.indices.create.mockResolvedValue({ acknowledged: true });
      const res = await makeProvider().createIndex('idx', {
        searchableAttributes: ['title'],
        filterableAttributes: ['brand'],
        sortableAttributes: ['price'],
      });
      const [body, opts] = mockEsClient.indices.create.mock.calls[0];
      expect(body.index).toBe('idx');
      expect(body.mappings.properties).toEqual({
        title: { type: 'text' },
        brand: { type: 'keyword' },
        price: { type: 'keyword' },
      });
      expect(opts).toEqual({ ignore: [400] });
      expect(res).toEqual({ id: 'idx', success: true });
    });

    it('maps a field that is both searchable and sortable as text + keyword sub-field', async () => {
      mockEsClient.indices.putMapping.mockResolvedValue({ acknowledged: true });
      await makeProvider().configureIndex('idx', {
        searchableAttributes: ['title'],
        sortableAttributes: ['title'],
      });
      const arg = mockEsClient.indices.putMapping.mock.calls[0][0];
      expect(arg.properties.title).toEqual({ type: 'text', fields: { keyword: { type: 'keyword' } } });
    });
  });

  describe('deleteDocuments', () => {
    it('bulk-deletes by id', async () => {
      mockEsClient.bulk.mockResolvedValue({ errors: false, items: [] });
      const res = await makeProvider().deleteDocuments('idx', [1, 'x']);
      const arg = mockEsClient.bulk.mock.calls[0][0];
      expect(arg.operations).toEqual([{ delete: { _id: '1' } }, { delete: { _id: 'x' } }]);
      expect(res).toEqual({ id: 'idx', success: true });
    });

    it('short-circuits an empty id list', async () => {
      const res = await makeProvider().deleteDocuments('idx', []);
      expect(res).toEqual({ id: 'idx', success: true });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('counts with a structured query', async () => {
      mockEsClient.count.mockResolvedValue({ count: 12 });
      const total = await makeProvider().count('idx', { filters: [{ field: 'brand', value: 'acme' }] });
      const arg = mockEsClient.count.mock.calls[0][0];
      expect(arg.query).toEqual({ bool: { filter: [{ term: { brand: 'acme' } }] } });
      expect(total).toBe(12);
    });

    it('counts the whole index when no query is given', async () => {
      mockEsClient.count.mockResolvedValue({ count: 99 });
      const total = await makeProvider().count('idx');
      expect(mockEsClient.count).toHaveBeenCalledWith({ index: 'idx' });
      expect(total).toBe(99);
    });
  });

  describe('index', () => {
    it('bulk-indexes documents keyed by their id', async () => {
      mockEsClient.bulk.mockResolvedValue({ errors: false, items: [] });
      const res = await makeProvider().index('idx', [{ id: 42, name: 'x' }]);
      const arg = mockEsClient.bulk.mock.calls[0][0];
      expect(arg.index).toBe('idx');
      expect(arg.operations).toEqual([{ index: { _id: '42' } }, { id: 42, name: 'x' }]);
      expect(res).toEqual({ id: 'idx', success: true });
    });

    it('short-circuits an empty batch', async () => {
      const res = await makeProvider().index('idx', []);
      expect(res).toEqual({ id: 'idx', success: true });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('surfaces bulk errors', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: true,
        items: [{ index: { error: { reason: 'mapping conflict' } } }],
      });
      const res = await makeProvider().index('idx', [{ id: 1 }]);
      expect(res.success).toBe(false);
      expect(res.error).toBe('mapping conflict');
    });

    it('captures thrown errors', async () => {
      mockEsClient.bulk.mockRejectedValue(new Error('conn refused'));
      const res = await makeProvider().index('idx', [{ id: 1 }]);
      expect(res).toEqual({ id: 'idx', success: false, error: 'conn refused' });
    });
  });

  describe('deleteIndex', () => {
    it('deletes ignoring 404 and returns true', async () => {
      mockEsClient.indices.delete.mockResolvedValue({ acknowledged: true });
      const ok = await makeProvider().deleteIndex('idx');
      expect(mockEsClient.indices.delete).toHaveBeenCalledWith({ index: 'idx' }, { ignore: [404] });
      expect(ok).toBe(true);
    });
    it('returns false on error', async () => {
      mockEsClient.indices.delete.mockRejectedValue(new Error('nope'));
      expect(await makeProvider().deleteIndex('idx')).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('returns the ping result', async () => {
      mockEsClient.ping.mockResolvedValue(true);
      expect(await makeProvider().healthCheck()).toBe(true);
    });
    it('returns false when ping throws', async () => {
      mockEsClient.ping.mockRejectedValue(new Error('unreachable'));
      expect(await makeProvider().healthCheck()).toBe(false);
    });
  });
});
