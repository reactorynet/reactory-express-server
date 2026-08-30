import mongoose, { mongo } from 'mongoose';
import Reactory from '@reactorynet/reactory-core';
const { ObjectId } = mongoose.Schema.Types;


const ContentSchema = new mongoose.Schema<Reactory.Models.IReactoryContent>({
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
  parent: {
    type: ObjectId,
    ref: 'Content'
  },
  children: [{
    type: ObjectId,
    ref: 'Content'
  }],
  flagged: Boolean,
  topics: [ String ],
  title: String,
  roles: [ String ],
  metadata: {},
  translations: [{
    lang: String,
    title: String,
    description: String,
    content: String,
    tags: [ String ],
    // Set when the translation was produced by an AI persona rather than a human.
    machineTranslated: Boolean,
    // Hash of the source content at the time the translation was saved. Used to
    // detect translations that have gone stale after the source was edited.
    sourceHash: String,
    updatedAt: Date,
    updatedBy: {
      type: ObjectId,
      ref: 'User',
    },
  }],
  content: String,
  template: Boolean,
  engine: String,
  // Authoring format of `content`: 'markdown' | 'html' | 'text'
  format: String,
  previewInputForm: String,
  description: String,
  // Source language of `content`. Translations are keyed off this.
  locale: String,
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
  enableComments: Boolean,
  commentLayout: String,
  commentsProps: {},
  commentsAllowed: Boolean,
  commentRoles: [ String ],
  comments: [{ ref: 'Comment', type: ObjectId }]
});

const ContentModel = mongoose.model<Reactory.Models.IReactoryContentDocument>('Content', ContentSchema, 'reactory_content');
export default ContentModel;
