import { Schema, model } from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId } = Schema.Types;

const DemographicsSchema = new Schema<Reactory.Models.IDemographic>({
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    lowercase: true,
  },
  key: {
    type: String,
    required: true,
    lowercase: true,
  },
  icon: String,
  deleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

// A demographic key is unique per organization and type; soft-deleted rows are
// still covered by the constraint so a re-used key cannot silently resurrect a
// deleted definition.
DemographicsSchema.index({ organization: 1, type: 1, key: 1 }, { unique: true });
DemographicsSchema.index({ deleted: 1 });

const Demographic = model<Reactory.Models.IDemographicDocument>('Demographic', DemographicsSchema, 'reactory_demographics');

export default Demographic;
