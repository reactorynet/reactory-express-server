import mongoose, { mongo } from 'mongoose';
import Reactory from '@reactory/reactory-core';
const { ObjectId } = mongoose.Schema.Types;


const ContentSchema = new mongoose.Schema<Reactory.IReactoryContent>({
  id: ObjectId,
  slug: String,
  client: {
    type: ObjectId,
    ref: 'ReactoryClient'
  },
  topics: [ String ],
  title: String,
  content: String,
  template: Boolean,
  engine: String,
  previewInputForm: String,
  description: String,
  helpTopic: String,
  version: String,
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

const ContentModel = mongoose.model<Reactory.IReactoryContentDocument>('Content', ContentSchema);
export default ContentModel;
