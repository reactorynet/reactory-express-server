import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const LasecCRMCommentSchema = mongoose.Schema({
  id: ObjectId,
  who: {
    type: ObjectId,
    ref: 'User',
  },
  comment: {
    type: String,
  },
  when: Date,
});

const CRMClientComment = mongoose.model('CRMClientComment', LasecCRMCommentSchema);
export default CRMClientComment;
