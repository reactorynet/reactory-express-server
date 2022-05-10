import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';
import { transform } from 'pdfkit';

export interface IReactoryTranslationDocumentStatic {
  new(): ReactoryTranslation
}

export type ReactoryTranslation = Reactory.IReactoryTranslationDocument & IReactoryTranslationDocumentStatic;

const ReactoryTranslationSchema: Schema<ReactoryTranslation> = new Schema<ReactoryTranslation>({
  id: ObjectId,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient'
  },
  organization: {
    type: ObjectId,
    ref: 'Organization'
  },
  key: {
    type: String,
    required: true    
  },
  locale: {
    type: String,
    required: true
  },
  created: Date,
  updated: Date,
  translator: {
    type: ObjectId,
    ref: 'User'
  },
  namespace: String,
  translation: String,
  revisions: [{
    changed: Date,
    translation: String,
    translator: {
      type: ObjectId,
      ref: 'User'
    },
    reason: String
  }]
  });

  const ReactoryTranslationModel = mongoose.model('ReactoryTranslation', ReactoryTranslationSchema);

  export default ReactoryTranslationModel;