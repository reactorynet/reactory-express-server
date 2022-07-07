import mongoose, { Schema, Model } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';

export interface IReactoryTranslationDocumentStatic {
  new(): ReactoryTranslation
}

export type ReactoryTranslation = Reactory.Models.IReactoryTranslationDocument & IReactoryTranslationDocumentStatic;

export type TReactoryTranslationSchema = Schema<ReactoryTranslation>

const ReactoryTranslationSchema: TReactoryTranslationSchema = new Schema<ReactoryTranslation>({
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