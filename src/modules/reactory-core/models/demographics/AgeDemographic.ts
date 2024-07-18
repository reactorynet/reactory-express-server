import { Schema, model, Document } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';


const AgeDemographicsSchema: Schema<Reactory.Models.IAgeDemographicDocument> = new Schema<Reactory.Models.IAgeDemographicDocument>({
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
  }
});

const AgeDemographic = model<Reactory.Models.IAgeDemographicDocument>('AgeDemographic', AgeDemographicsSchema, 'reactory_age_demographics');

export default AgeDemographic;