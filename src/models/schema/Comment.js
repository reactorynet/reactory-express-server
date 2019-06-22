import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const CommentSchema = mongoose.Schema({
  id: ObjectId,
  user: {
    type: ObjectId,
    ref: 'User',
  },
  anon: Boolean,
  text: String,
  context: String,
  contextId: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  replies: [ObjectId],
});

const CommentModel = mongoose.model('Comment', CommentSchema);
export default CommentModel;
