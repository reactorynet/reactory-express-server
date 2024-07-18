import mongoose, { mongo } from 'mongoose';
import Reactory from '@reactory/reactory-core';
const { ObjectId } = mongoose.Schema.Types;


const ContentSchema = new mongoose.Schema<Reactory.Models.IReactoryContent>({
  id: ObjectId,
  slug: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient'
  },
  organization: {
    type: ObjectId,
    ref: 'Organization'
  },
  businessUnit: {
    type: ObjectId,
    ref: 'BusinessUnit'
  },
  flags: [{ 
    id: ObjectId,
    user: {
      type: ObjectId,
      ref: 'User'
    },
    flagTypes: [ String ],
    reason: String,
  }],
  topics: [ String ],
  title: String,
  roles: [ String ],
  content: String,
  template: Boolean,
  engine: String,
  previewInputForm: String,
  description: String,
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
  commentsAllowed: Boolean,
  commentRoles: [ String ],
  comments: [ ObjectId ]
});

const ContentModel = mongoose.model<Reactory.Models.IReactoryContentDocument>('Content', ContentSchema, 'reactory_content');
export default ContentModel;
