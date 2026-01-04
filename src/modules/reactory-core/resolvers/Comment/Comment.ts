import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import CommentModel from '../../models/Comment';
import UserModel from '../../models/User';

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
}

export default CommentResolver;
