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

/**
 * @deprecated Legacy age-band model. Superseded by `DemographicDefinition` /
 * `DemographicValue` (ORG-003); an age band is now an `enum` or `number`
 * definition owned by the organization. Kept registered and unchanged for
 * existing data and the ORG-037 migration window.
 */
const AgeDemographic = model<Reactory.Models.IAgeDemographicDocument>('AgeDemographic', AgeDemographicsSchema, 'reactory_age_demographics');

export default AgeDemographic;
