import ReactoryContentService from '../ReactoryContentService';
import { Content } from '@reactory/server-modules/reactory-core/models';

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  Content: {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('ReactoryContentService Caching', () => {
  let service: ReactoryContentService;
  let mockContext: any;
  let mockUserService: any;
  let mockRedisService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      i18n: { language: 'en' },
      partner: { email: 'partner@reactory.net' },
      user: { _id: 'user_123', email: 'user@reactory.net' },
      hasRole: jest.fn().mockReturnValue(true),
    };

    mockUserService = {
      findUserWithEmail: jest.fn().mockResolvedValue({ _id: 'sys_user', email: 'system@reactory.net' }),
    };

    mockRedisService = {
      getJSON: jest.fn().mockResolvedValue(null),
      setJSON: jest.fn().mockResolvedValue('OK'),
      keys: jest.fn().mockResolvedValue([]),
      delMultiple: jest.fn().mockResolvedValue(0),
    };

    service = new ReactoryContentService({}, mockContext);
    service.setUserService(mockUserService);
    service.setRedis(mockRedisService);
  });

  describe('L1 Memory Cache & Static Content Fallback', () => {
    it('should read static file on cache miss and hit cache on subsequent requests', async () => {
      (Content.findOne as jest.Mock).mockReturnValue({
        then: (cb: any) => Promise.resolve(cb(null)),
      });

      process.env.APP_DATA_ROOT = '/Users/wweber/Source/reactory/reactory-data';

      // First call -> Cache Miss, reads disk
      const content1 = await service.getContentBySlug('about-reactory');
      expect(content1).not.toBeNull();
      expect(content1.slug).toBe('about-reactory');

      const stats1 = service.getCacheStats();
      expect(stats1.memoryCount).toBeGreaterThan(0);
      expect(stats1.misses).toBe(1);

      // Second call -> Cache Hit
      const content2 = await service.getContentBySlug('about-reactory');
      expect(content2).toEqual(content1);

      const stats2 = service.getCacheStats();
      expect(stats2.hits).toBe(1);
    });

    it('should cache MongoDB results on first query and hit cache on subsequent calls', async () => {
      const mockDoc = {
        slug: 'db-article',
        title: 'DB Article Title',
        content: 'DB Article Content',
        toObject: () => ({
          slug: 'db-article',
          title: 'DB Article Title',
          content: 'DB Article Content',
        }),
      };

      (Content.findOne as jest.Mock).mockReturnValue({
        then: (cb: any) => Promise.resolve(cb(mockDoc)),
      });

      // First call
      const res1 = await service.getContentBySlug('db-article');
      expect(res1.title).toBe('DB Article Title');
      expect(Content.findOne).toHaveBeenCalledTimes(1);

      // Second call
      const res2 = await service.getContentBySlug('db-article');
      expect(res2.title).toBe('DB Article Title');
      expect(Content.findOne).toHaveBeenCalledTimes(1); // Not called again
      expect(service.getCacheStats().hits).toBe(1);
    });
  });

  describe('Cache Invalidation & Mutations', () => {
    it('should invalidate cache when createContent is called', async () => {
      const initialDoc = {
        slug: 'mutable-slug',
        title: 'Initial Title',
        content: 'Initial Content',
        toObject: () => ({
          slug: 'mutable-slug',
          title: 'Initial Title',
          content: 'Initial Content',
        }),
      };

      (Content.findOne as jest.Mock).mockReturnValue({
        then: (cb: any) => Promise.resolve(cb(initialDoc)),
      });

      // Populate cache
      await service.getContentBySlug('mutable-slug');

      const updatedDoc = {
        _id: 'doc_456',
        slug: 'mutable-slug',
        title: 'New Created Title',
        content: 'New Created Content',
        toObject: () => ({
          _id: 'doc_456',
          slug: 'mutable-slug',
          title: 'New Created Title',
          content: 'New Created Content',
        }),
      };

      (Content.findOneAndUpdate as jest.Mock).mockReturnValue({
        then: (cb: any) => Promise.resolve(cb(updatedDoc)),
      });

      // Mutate content
      const created = await service.createContent({
        slug: 'mutable-slug',
        title: 'New Created Title',
        content: 'New Created Content',
      });

      expect(created.title).toBe('New Created Title');

      // Next query should return updated content from cache
      const fetchAfterMutation = await service.getContentBySlug('mutable-slug');
      expect(fetchAfterMutation.title).toBe('New Created Title');
    });

    it('should update content and invalidate cache when updateContent is called', async () => {
      const updatedDoc = {
        _id: 'doc_789',
        slug: 'update-slug',
        title: 'Updated Title',
        content: 'Updated Content',
        toObject: () => ({
          _id: 'doc_789',
          slug: 'update-slug',
          title: 'Updated Title',
          content: 'Updated Content',
        }),
      };

      (Content.findOneAndUpdate as jest.Mock).mockReturnValue({
        then: (cb: any) => Promise.resolve(cb(updatedDoc)),
      });

      const result = await service.updateContent({
        slug: 'update-slug',
        title: 'Updated Title',
        content: 'Updated Content',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should clear all cache when clearCache() is called', async () => {
      const mockDoc = {
        slug: 'cached-item',
        toObject: () => ({ slug: 'cached-item', content: 'hello' }),
      };

      (Content.findOne as jest.Mock).mockReturnValue({
        then: (cb: any) => Promise.resolve(cb(mockDoc)),
      });

      await service.getContentBySlug('cached-item');
      expect(service.getCacheStats().memoryCount).toBe(1);

      await service.clearCache();
      expect(service.getCacheStats().memoryCount).toBe(0);
    });
  });
});
