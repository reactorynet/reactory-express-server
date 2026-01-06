import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, mutation, query } from '@reactory/server-core/models/graphql/decorators/resolver';
import CommentModel from '../../models/Comment';
import UserModel from '../../models/User';
import { ObjectId } from 'mongodb';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';

/**
 * Comment Resolver
 * 
 * Handles GraphQL resolution for Comment type, mapping between
 * the Mongoose model and GraphQL schema.
 * 
 * Model Field -> GraphQL Field Mappings:
 * - _id -> id
 * - user -> who
 * - createdAt -> when
 * - parent -> parentId
 * - upvoted/downvoted/favorite arrays -> computed counts
 */
@resolver
class CommentResolver {

  resolver: any;

  /**
   * Maps the MongoDB _id to the GraphQL id field
   */
  @property("Comment", "id")
  commentId(obj: Reactory.Models.IReactoryCommentDocument) {
    return obj._id;
  }

  /**
   * Maps the model's 'user' field to GraphQL's 'who' field
   * Ensures the user is populated if not already
   */
  @property("Comment", "who")
  async who(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    // Check if user is already populated
    if (obj.user && typeof obj.user === 'object' && (obj.user as any).email !== undefined) {
      return obj.user;
    }

    // User is not populated, fetch from database    
    if (!UserModel || !obj.user) {
      return null;
    }

    try {
      const user = await UserModel.findById(obj.user).exec();
      return user;
    } catch (error) {
      context.log('Error populating comment user', { error }, 'error');
      return null;
    }
  }

  /**
   * Maps the model's 'createdAt' field to GraphQL's 'when' field
   */
  @property("Comment", "when")
  when(obj: Reactory.Models.IReactoryCommentDocument) {
    return obj.createdAt;
  }

  /**
   * Returns the upvoted users array
   * Populates if needed
   */
  @property("Comment", "upvoted")
  async upvoted(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    if (!obj.upvoted || obj.upvoted.length === 0) {
      return [];
    }

    // Check if already populated
    const firstItem = obj.upvoted[0];
    if (typeof firstItem === 'object' && (firstItem as any).email !== undefined) {
      return obj.upvoted;
    }

    // Populate from database    
    if (!UserModel) {
      return [];
    }

    try {
      const users = await UserModel.find({ _id: { $in: obj.upvoted } }).exec();
      return users;
    } catch (error) {
      context.log('Error populating upvoted users', { error }, 'error');
      return [];
    }
  }

  /**
   * Returns the count of upvotes
   */
  @property("Comment", "upvotes")
  upvotes(obj: Reactory.Models.IReactoryCommentDocument) {
    return obj.upvoted ? obj.upvoted.length : 0;
  }

  /**
   * Returns the downvoted users array
   * Populates if needed
   */
  @property("Comment", "downvote")
  async downvote(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    if (!obj.downvoted || obj.downvoted.length === 0) {
      return [];
    }

    // Check if already populated
    const firstItem = obj.downvoted[0];
    if (typeof firstItem === 'object' && (firstItem as any).email !== undefined) {
      return obj.downvoted;
    }

    // Populate from database

    if (!UserModel) {
      return [];
    }

    try {
      const users = await UserModel.find({ _id: { $in: obj.downvoted } }).exec();
      return users;
    } catch (error) {
      context.log('Error populating downvoted users', { error }, 'error');
      return [];
    }
  }

  /**
   * Returns the count of downvotes
   */
  @property("Comment", "downvotes")
  downvotes(obj: Reactory.Models.IReactoryCommentDocument) {
    return obj.downvoted ? obj.downvoted.length : 0;
  }

  /**
   * Returns the favorited users array
   * Populates if needed
   */
  @property("Comment", "favorite")
  async favorite(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    if (!obj.favorite || obj.favorite.length === 0) {
      return [];
    }

    // Check if already populated
    const firstItem = obj.favorite[0];
    if (typeof firstItem === 'object' && (firstItem as any).email !== undefined) {
      return obj.favorite;
    }

    // Populate from database
    if (!UserModel) {
      return [];
    }

    try {
      const users = await UserModel.find({ _id: { $in: obj.favorite } }).exec();
      return users;
    } catch (error) {
      context.log('Error populating favorited users', { error }, 'error');
      return [];
    }
  }

  /**
   * Returns the count of favorites
   */
  @property("Comment", "favorites")
  favorites(obj: Reactory.Models.IReactoryCommentDocument) {
    return obj.favorite ? obj.favorite.length : 0;
  }

  /**
   * Maps the model's 'parent' field to GraphQL's 'parentId' field
   */
  @property("Comment", "parentId")
  parentId(obj: Reactory.Models.IReactoryCommentDocument) {
    return obj.parent;
  }

  /**
   * Returns the parent comment object
   */
  @property("Comment", "parent")
  async parent(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    if (!obj.parent) {
      return null;
    }

    // Check if already populated
    if (typeof obj.parent === 'object' && (obj.parent as any).text !== undefined) {
      return obj.parent;
    }

    try {
      // Fetch parent comment
      const parentComment = await CommentModel
        .findById(obj.parent)
        .populate('user')
        .exec();

      return parentComment;
    } catch (error) {
      context.log('Error fetching parent comment', { error }, 'error');
      return null;
    }
  }

  /**
   * Returns the replies to this comment
   * Fetches child comments where parent === this comment's id
   */
  @property("Comment", "replies")
  async replies(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    // Check if replies are already populated
    if (obj.replies && obj.replies.length > 0) {
      const firstReply = obj.replies[0];
      if (typeof firstReply === 'object' && (firstReply as any).text !== undefined) {
        return obj.replies;
      }
    }

    try {
      // Fetch replies where parent === this comment's id
      const replies = await CommentModel
        .find({ parent: obj._id })
        .populate('user')
        .sort({ createdAt: 1 })
        .exec();

      return replies;
    } catch (error) {
      context.log('Error fetching comment replies', { error }, 'error');
      return [];
    }
  }

  /**
   * Returns attachments for the comment
   * Note: The model doesn't have an attachments field, so we return empty for now
   * This can be implemented later if needed
   */
  @property("Comment", "attachments")
  async attachments(obj: Reactory.Models.IReactoryCommentDocument, args: any, context: Reactory.Server.IReactoryContext) {
    // The current model doesn't have attachments field
    // This would need to be added to the schema if needed
    return [];
  }

  // ============================================================================
  // QUERY RESOLVERS
  // ============================================================================

  /**
   * Get a single comment by ID
   */
  @roles(["USER"], 'args.context')
  @query("getComment")
  async getComment(
    obj: any,
    args: { commentId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument | null> {
    const { commentId } = args;

    try {
      const comment = await CommentModel
        .findById(commentId)
        .populate('user')
        .exec();

      if (!comment) {
        return null;
      }

      // Check if comment is removed and user doesn't have permission to see it
      if (comment.removed) {
        const isAuthor = comment.user && (comment.user as any)._id?.toString() === context.user._id.toString();
        const isAdmin = context.hasRole('ADMIN') || context.hasRole('SUPPORT_ADMIN');
        
        if (!isAuthor && !isAdmin) {
          return null;
        }
      }

      return comment;
    } catch (error) {
      context.log('Error fetching comment', { error, commentId }, 'error');
      return null;
    }
  }

  /**
   * Get comments for a specific context (e.g., support ticket)
   * Returns only root-level comments (no parent)
   */
  @roles(["USER"], 'args.context')
  @query("getCommentsByContext")
  async getCommentsByContext(
    obj: any,
    args: {
      context: string;
      contextId: string;
      includeRemoved?: boolean;
      paging?: Reactory.Models.IPagingRequest;
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const { context: ctx, contextId, includeRemoved = false, paging } = args;

    try {
      // Build query
      const query: any = {
        context: ctx,
        contextId: contextId,
        parent: { $exists: false }, // Root comments only
      };

      // Filter removed comments unless includeRemoved is true
      if (!includeRemoved) {
        query.removed = { $ne: true };
      }

      // Get total count
      const total = await CommentModel.countDocuments(query);

      // Build pagination
      const page = paging?.page || 1;
      const pageSize = paging?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // Fetch comments
      const comments = await CommentModel
        .find(query)
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec();

      return {
        comments,
        paging: {
          page,
          pageSize,
          total,
          hasNext: total > (page * pageSize),
        },
      };
    } catch (error) {
      context.log('Error fetching comments by context', { error, ctx, contextId }, 'error');
      return {
        comments: [],
        paging: {
          page: 1,
          pageSize: 20,
          total: 0,
          hasNext: false,
        },
      };
    }
  }

  /**
   * Get replies for a specific comment
   * Use for loading nested replies recursively
   */
  @roles(["USER"], 'args.context')
  @query("getCommentReplies")
  async getCommentReplies(
    obj: any,
    args: {
      commentId: string;
      includeRemoved?: boolean;
      paging?: Reactory.Models.IPagingRequest;
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const { commentId, includeRemoved = false, paging } = args;

    try {
      // Build query
      const query: any = {
        parent: new ObjectId(commentId),
      };

      // Filter removed comments unless includeRemoved is true
      if (!includeRemoved) {
        query.removed = { $ne: true };
      }

      // Get total count
      const total = await CommentModel.countDocuments(query);

      // Build pagination
      const page = paging?.page || 1;
      const pageSize = paging?.pageSize || 50;
      const skip = (page - 1) * pageSize;

      // Fetch replies
      const comments = await CommentModel
        .find(query)
        .populate('user')
        .sort({ createdAt: 1 }) // Replies in chronological order
        .skip(skip)
        .limit(pageSize)
        .exec();

      return {
        comments,
        paging: {
          page,
          pageSize,
          total,
          hasNext: total > (page * pageSize),
        },
      };
    } catch (error) {
      context.log('Error fetching comment replies', { error, commentId }, 'error');
      return {
        comments: [],
        paging: {
          page: 1,
          pageSize: 50,
          total: 0,
          hasNext: false,
        },
      };
    }
  }

  // ============================================================================
  // MUTATION RESOLVERS
  // ============================================================================

  /**
   * Edit an existing comment
   * Only the comment author can edit their own comment
   */
  @roles(["USER"], 'args.context')
  @mutation("editComment")
  async editComment(
    obj: any,
    args: {
      input: {
        commentId: string;
        text: string;
      }
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { commentId, text } = args.input;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Comment text cannot be empty');
    }

    // Find the comment
    const comment = await CommentModel.findById(commentId).exec();
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check permissions - only the author can edit
    const isAuthor = comment.user.toString() === context.user._id.toString();
    if (!isAuthor) {
      throw new InsufficientPermissions('You can only edit your own comments');
    }

    // Update the comment
    comment.text = text;
    comment.updatedAt = new Date();
    comment.updatedBy = context.user._id as any;

    await comment.save();
    await comment.populate('user');

    context.log('Comment edited', { commentId, userId: context.user._id }, 'info');

    return comment;
  }

  /**
   * Delete a comment
   * Author can delete their own comment, admins can delete any comment
   */
  @roles(["USER"], 'args.context')
  @mutation("deleteComment")
  async deleteComment(
    obj: any,
    args: {
      input: {
        commentId: string;
        softDelete?: boolean;
      }
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const { commentId, softDelete = true } = args.input;

    try {
      // Find the comment
      const comment = await CommentModel.findById(commentId).exec();
      if (!comment) {
        return {
          __typename: 'DeleteCommentError',
          error: 'Comment not found',
          message: 'The comment you are trying to delete does not exist',
          commentId,
        };
      }

      // Check permissions
      const isAuthor = comment.user.toString() === context.user._id.toString();
      const isAdmin = context.hasRole('ADMIN') || context.hasRole('SUPPORT_ADMIN');

      if (!isAuthor && !isAdmin) {
        return {
          __typename: 'DeleteCommentError',
          error: 'Permission denied',
          message: 'You can only delete your own comments',
          commentId,
        };
      }

      if (softDelete) {
        // Soft delete - mark as removed
        comment.removed = true;
        comment.updatedAt = new Date();
        comment.updatedBy = context.user._id as any;
        await comment.save();

        context.log('Comment soft deleted', { commentId, userId: context.user._id }, 'info');
      } else {
        // Hard delete - only admins can do this
        if (!isAdmin) {
          return {
            __typename: 'DeleteCommentError',
            error: 'Permission denied',
            message: 'Only admins can permanently delete comments',
            commentId,
          };
        }

        await CommentModel.findByIdAndDelete(commentId).exec();
        context.log('Comment permanently deleted', { commentId, userId: context.user._id }, 'warn');
      }

      return {
        __typename: 'DeleteCommentSuccess',
        success: true,
        commentId,
        message: softDelete ? 'Comment removed' : 'Comment permanently deleted',
      };
    } catch (error) {
      context.log('Error deleting comment', { error, commentId }, 'error');
      return {
        __typename: 'DeleteCommentError',
        error: 'Delete failed',
        message: error.message || 'An error occurred while deleting the comment',
        commentId,
      };
    }
  }

  /**
   * Toggle upvote on a comment
   * If user already upvoted, remove the upvote. Otherwise, add upvote and remove downvote if present.
   */
  @roles(["USER"], 'args.context')
  @mutation("upvoteComment")
  async upvoteComment(
    obj: any,
    args: { commentId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { commentId } = args;

    const comment = await CommentModel.findById(commentId).exec();
    if (!comment) {
      throw new Error('Comment not found');
    }

    const userId = context.user._id;
    const userIdString = userId.toString();

    // Initialize arrays if they don't exist
    if (!comment.upvoted) comment.upvoted = [];
    if (!comment.downvoted) comment.downvoted = [];

    // Check if user already upvoted
    const upvoteIndex = comment.upvoted.findIndex((id: any) => id.toString() === userIdString);

    if (upvoteIndex > -1) {
      // Remove upvote (toggle off)
      comment.upvoted.splice(upvoteIndex, 1);
    } else {
      // Add upvote
      comment.upvoted.push(userId as any);

      // Remove downvote if present (can't have both)
      const downvoteIndex = comment.downvoted.findIndex((id: any) => id.toString() === userIdString);
      if (downvoteIndex > -1) {
        comment.downvoted.splice(downvoteIndex, 1);
      }
    }

    comment.updatedAt = new Date();
    await comment.save();
    await comment.populate('user');

    return comment;
  }

  /**
   * Toggle downvote on a comment
   * If user already downvoted, remove the downvote. Otherwise, add downvote and remove upvote if present.
   */
  @roles(["USER"], 'args.context')
  @mutation("downvoteComment")
  async downvoteComment(
    obj: any,
    args: { commentId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { commentId } = args;

    const comment = await CommentModel.findById(commentId).exec();
    if (!comment) {
      throw new Error('Comment not found');
    }

    const userId = context.user._id;
    const userIdString = userId.toString();

    // Initialize arrays if they don't exist
    if (!comment.upvoted) comment.upvoted = [];
    if (!comment.downvoted) comment.downvoted = [];

    // Check if user already downvoted
    const downvoteIndex = comment.downvoted.findIndex((id: any) => id.toString() === userIdString);

    if (downvoteIndex > -1) {
      // Remove downvote (toggle off)
      comment.downvoted.splice(downvoteIndex, 1);
    } else {
      // Add downvote
      comment.downvoted.push(userId as any);

      // Remove upvote if present (can't have both)
      const upvoteIndex = comment.upvoted.findIndex((id: any) => id.toString() === userIdString);
      if (upvoteIndex > -1) {
        comment.upvoted.splice(upvoteIndex, 1);
      }
    }

    comment.updatedAt = new Date();
    await comment.save();
    await comment.populate('user');

    return comment;
  }

  /**
   * Toggle favorite on a comment
   * If user already favorited, remove the favorite. Otherwise, add favorite.
   */
  @roles(["USER"], 'args.context')
  @mutation("favoriteComment")
  async favoriteComment(
    obj: any,
    args: { commentId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { commentId } = args;

    const comment = await CommentModel.findById(commentId).exec();
    if (!comment) {
      throw new Error('Comment not found');
    }

    const userId = context.user._id;
    const userIdString = userId.toString();

    // Initialize array if it doesn't exist
    if (!comment.favorite) comment.favorite = [];

    // Check if user already favorited
    const favoriteIndex = comment.favorite.findIndex((id: any) => id.toString() === userIdString);

    if (favoriteIndex > -1) {
      // Remove favorite (toggle off)
      comment.favorite.splice(favoriteIndex, 1);
    } else {
      // Add favorite
      comment.favorite.push(userId as any);
    }

    comment.updatedAt = new Date();
    await comment.save();
    await comment.populate('user');

    return comment;
  }

  /**
   * Generic toggle for any comment reaction type
   */
  @roles(["USER"], 'args.context')
  @mutation("toggleCommentReaction")
  async toggleCommentReaction(
    obj: any,
    args: {
      input: {
        commentId: string;
        reactionType: 'UPVOTE' | 'DOWNVOTE' | 'FAVORITE';
      }
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { commentId, reactionType } = args.input;

    switch (reactionType) {
      case 'UPVOTE':
        return this.upvoteComment(obj, { commentId }, context);
      case 'DOWNVOTE':
        return this.downvoteComment(obj, { commentId }, context);
      case 'FAVORITE':
        return this.favoriteComment(obj, { commentId }, context);
      default:
        throw new Error(`Unknown reaction type: ${reactionType}`);
    }
  }

  /**
   * Flag a comment for moderation
   */
  @roles(["USER"], 'args.context')
  @mutation("flagComment")
  async flagComment(
    obj: any,
    args: {
      commentId: string;
      reason?: string;
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { commentId, reason } = args;

    const comment = await CommentModel.findById(commentId).exec();
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Set the flagged status
    comment.flagged = true;
    comment.updatedAt = new Date();

    await comment.save();
    await comment.populate('user');

    // Log the flag for moderation review
    context.log('Comment flagged', {
      commentId,
      flaggedBy: context.user._id,
      reason: reason || 'No reason provided',
    }, 'warn');

    return comment;
  }
}

export default CommentResolver;
