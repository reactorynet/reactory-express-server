import { Schema, model, Document } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';


const OrganizationDemographicSettingsSchema: Schema<Reactory.Models.IOrganizationDemographicSettings> = new Schema<Reactory.Models.IOrganizationDemographicSettings>({
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
  }
});


const OrganizationDemographicSettings = model<Reactory.Models.IOrganizationDemographicSettingsDocument>('OrganizationDemographicSettings', OrganizationDemographicSettingsSchema);

export default OrganizationDemographicSettings;