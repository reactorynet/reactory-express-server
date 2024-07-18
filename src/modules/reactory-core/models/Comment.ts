import mongoose from 'mongoose';
import Reactory from '@reactory/reactory-core';

const { ObjectId } = mongoose.Schema.Types;

const CommentSchema = new mongoose.Schema<Reactory.Models.IReactoryComment>({
  id: ObjectId,
  user: {
    type: ObjectId,
    ref: 'User',
  },
  anon: Boolean,
  text: String,
  context: String,
  contextId: String,
  upvoted: [{
    type: ObjectId,
    ref: 'User'
  }],
  downvoted: [{
    type: ObjectId,
    ref: 'User'
  }],
  favorite: [{
    type: ObjectId,
    ref: 'User'
  }],
  flagged: {
    type: Boolean,
    default: false,
  },  
  removed: {
    type: Boolean,
    default: false,
  },
  published: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: 'Date',
    default: () => {
      return new Date()
    }
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: 'Date',
    default: () => {
      return new Date()
    }
  },
  replies: [{ type: ObjectId, ref: 'Comment' }],
});

const CommentModel = mongoose.model<Reactory.Models.IReactoryCommentDocument>('Comment', CommentSchema, 'reactory_comments');
export default CommentModel;
