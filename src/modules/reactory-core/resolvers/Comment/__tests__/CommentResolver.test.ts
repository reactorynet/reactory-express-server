import mongoose from 'mongoose';
import CommentModel from '../../../models/Comment';
import CommentResolver from '../Comment';

describe('CommentResolver', () => {
  let resolver: any;
  let mockContext: any;

  beforeEach(() => {
    resolver = new CommentResolver();
    mockContext = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        email: 'tester@reactory.net',
      },
      log: jest.fn(),
      emit: jest.fn(),
      hasRole: jest.fn().mockReturnValue(true),
    };
    jest.clearAllMocks();
  });

  describe('createComment mutation', () => {
    it('creates a root comment successfully with context and contextId', async () => {
      jest.spyOn(CommentModel.prototype, 'save').mockImplementation(function (this: any) {
        this._id = this._id || new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });

      jest.spyOn(CommentModel.prototype, 'populate').mockImplementation(function (this: any) {
        return Promise.resolve(this);
      });

      const input = {
        context: 'ReactoryContent',
        contextId: 'article-101',
        text: 'Test comment text',
      };

      const result = await resolver.createComment({}, { input }, mockContext);

      expect(result.text).toBe('Test comment text');
      expect(result.context).toBe('ReactoryContent');
      expect(result.contextId).toBe('article-101');
      expect(mockContext.emit).toHaveBeenCalledWith(
        'core.CommentAdded',
        expect.objectContaining({
          context: 'ReactoryContent',
          contextId: 'article-101',
        })
      );
    });

    it('throws error when comment text is empty', async () => {
      const input = {
        context: 'ReactoryContent',
        contextId: 'article-101',
        text: '   ',
      };

      await expect(
        resolver.createComment({}, { input }, mockContext)
      ).rejects.toThrow('Comment text cannot be empty');
    });

    it('throws error when context or contextId is missing', async () => {
      const input = {
        context: '',
        contextId: 'article-101',
        text: 'Valid text',
      };

      await expect(
        resolver.createComment({}, { input }, mockContext)
      ).rejects.toThrow('Context and contextId are required');
    });
  });

  describe('getMyComments query', () => {
    afterEach(() => jest.restoreAllMocks());

    const mockFindChain = (comments: any[]) => {
      const exec = jest.fn().mockResolvedValue(comments);
      const limit = jest.fn().mockReturnValue({ exec });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });
      const populate = jest.fn().mockReturnValue({ sort });
      return { populate, sort, skip, limit, exec };
    };

    it('scopes the query to the current user and ignores any supplied userId (no IDOR)', async () => {
      const chain = mockFindChain([]);
      const findSpy = jest.spyOn(CommentModel, 'find').mockReturnValue(chain as any);
      jest.spyOn(CommentModel, 'countDocuments').mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await resolver.getMyComments(
        {},
        { paging: { page: 1, pageSize: 10 }, userId: 'someone-else-entirely' } as any,
        mockContext
      );

      const query = findSpy.mock.calls[0][0] as any;
      expect(query.user).toBe(mockContext.user._id);
      expect(query.user).not.toBe('someone-else-entirely');
      // Removed comments are hidden by default.
      expect(query.removed).toEqual({ $ne: true });
    });

    it('applies a context filter and returns paging metadata', async () => {
      const chain = mockFindChain([{ _id: 'c1' }]);
      const findSpy = jest.spyOn(CommentModel, 'find').mockReturnValue(chain as any);
      jest.spyOn(CommentModel, 'countDocuments').mockReturnValue({ exec: jest.fn().mockResolvedValue(1) } as any);

      const result = await resolver.getMyComments(
        {},
        { context: 'ReactorChat', paging: { page: 2, pageSize: 5 } },
        mockContext
      );

      const query = findSpy.mock.calls[0][0] as any;
      expect(query.context).toBe('ReactorChat');
      expect(chain.skip).toHaveBeenCalledWith(5);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(result.paging).toEqual({ page: 2, pageSize: 5, total: 1, hasNext: false });
    });

    it('builds a safe escaped regex for the search term', async () => {
      const chain = mockFindChain([]);
      const findSpy = jest.spyOn(CommentModel, 'find').mockReturnValue(chain as any);
      jest.spyOn(CommentModel, 'countDocuments').mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await resolver.getMyComments({}, { searchTerm: 'a+b(c' }, mockContext);

      const query = findSpy.mock.calls[0][0] as any;
      expect(query.$or).toHaveLength(2);
      const source = query.$or[0].text.source as string;
      // Regex metacharacters from the term must be escaped.
      expect(source).toContain('a\\+b\\\(c');
    });

    it('returns an empty page when the query throws', async () => {
      jest.spyOn(CommentModel, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);
      jest.spyOn(CommentModel, 'find').mockImplementation(() => {
        throw new Error('db down');
      });

      const result = await resolver.getMyComments({}, { paging: { page: 1, pageSize: 20 } }, mockContext);

      expect(result.comments).toEqual([]);
      expect(result.paging.total).toBe(0);
      expect(mockContext.log).toHaveBeenCalled();
    });
  });

  describe('getMyCommentStats query', () => {
    afterEach(() => jest.restoreAllMocks());

    it('groups the current user comments by context', async () => {
      const aggregateSpy = jest
        .spyOn(CommentModel, 'aggregate')
        .mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: 'ReactorChat', count: 3 },
            { _id: 'ReactoryContent', count: 2 },
          ]),
        } as any);

      const result = await resolver.getMyCommentStats({}, {}, mockContext);

      expect(result).toEqual([
        { context: 'ReactorChat', count: 3 },
        { context: 'ReactoryContent', count: 2 },
      ]);

      const pipeline = aggregateSpy.mock.calls[0][0] as any[];
      const matchStage = pipeline.find((stage) => stage.$match);
      expect(matchStage.$match.user.toString()).toBe(mockContext.user._id.toString());
      expect(matchStage.$match.removed).toEqual({ $ne: true });
    });

    it('returns an empty array when aggregation fails', async () => {
      jest.spyOn(CommentModel, 'aggregate').mockImplementation(() => {
        throw new Error('aggregation failed');
      });

      const result = await resolver.getMyCommentStats({}, {}, mockContext);

      expect(result).toEqual([]);
      expect(mockContext.log).toHaveBeenCalled();
    });
  });
});
