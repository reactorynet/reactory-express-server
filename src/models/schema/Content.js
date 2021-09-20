import mongoose, { mongo } from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const ContentSchema = mongoose.Schema({
  id: ObjectId,
  slug: String,
  topics: [ String ],
  title: String,
  content: String,
  createdAt: Date,
  updatedAt: Date,
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  updatedBy: {
    ref: 'User',
    type: ObjectId,
  },
  published: Boolean,
  comments: [ ObjectId ]
});

const ContentModel = mongoose.model('Content', ContentSchema);
export default ContentModel;
