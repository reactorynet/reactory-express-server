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
});
