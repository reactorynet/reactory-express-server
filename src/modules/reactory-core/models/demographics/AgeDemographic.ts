import { Schema, model } from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId } = Schema.Types;

const AgeDemographicsSchema = new Schema<Reactory.Models.IAgeDemographic>({
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  title: String,
  ageStart: Number,
  ageEnd: Number,
  deleted: {
    type: Boolean,
    default: false,
  },
});

AgeDemographicsSchema.index({ organization: 1 });

const AgeDemographic = model<Reactory.Models.IAgeDemographicDocument>('AgeDemographic', AgeDemographicsSchema, 'reactory_age_demographics');

export default AgeDemographic;
