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

/**
 * @deprecated Legacy fixed-field demographic definition model. Superseded by
 * `DemographicDefinition` (`reactory_demographic_definitions`) and
 * `DemographicValue` (`reactory_demographic_values`), added by ORG-003.
 *
 * It remains registered and its schema is unchanged so existing documents keep
 * loading during the migration window (ORG-037). Do not extend it; model new
 * demographics as `DemographicDefinition` documents instead.
 */
const Demographic = model<Reactory.Models.IDemographicDocument>('Demographic', DemographicsSchema, 'reactory_demographics');

export default Demographic;
