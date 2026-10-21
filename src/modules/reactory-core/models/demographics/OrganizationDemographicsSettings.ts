import { Schema, model } from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId } = Schema.Types;

const OrganizationDemographicSettingsSchema = new Schema<Reactory.Models.IOrganizationDemographicSettings>({
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  age: {
    type: Boolean,
    required: true,
    default: false,
  },
  gender: {
    type: Boolean,
    required: true,
    default: false,
  },
  race: {
    type: Boolean,
    required: true,
    default: false,
  },
  region: {
    type: Boolean,
    required: true,
    default: false,
  },
  position: {
    type: Boolean,
    required: true,
    default: false,
  },
  operationalGroup: {
    type: Boolean,
    required: true,
    default: false,
  },
  businessUnit: {
    type: Boolean,
    required: true,
    default: false,
  },
  teams: {
    type: Boolean,
    required: true,
    default: false,
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

// One policy document per organization.
OrganizationDemographicSettingsSchema.index({ organization: 1 }, { unique: true });

/**
 * @deprecated Legacy boolean settings sheet. Superseded by the `enabled`,
 * `required` and `ordinal` flags on `DemographicDefinition` and the values in
 * `DemographicValue` (ORG-003), with org-level policy held separately. Kept
 * registered and unchanged so the eight booleans can be migrated to definition
 * enablement in ORG-037.
 */
const OrganizationDemographicSettings = model<Reactory.Models.IOrganizationDemographicSettingsDocument>(
  'OrganizationDemographicSettings',
  OrganizationDemographicSettingsSchema,
  'reactory_organization_demographic_settings',
);

export default OrganizationDemographicSettings;
