import mongoose from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId } = mongoose.Schema.Types;

const BusinessUnitSchema = new mongoose.Schema<Reactory.Models.IBusinessUnit>({
  organization: {
    type: ObjectId,
    ref: 'Organization',
  },
  members: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  name: String,
  description: String,
  avatar: String,
  createdAt: Date,
  updatedAt: Date,
  deleted: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User',
  },
});

// Business units are listed per organization and exclude soft-deleted rows by
// default.
BusinessUnitSchema.index({ organization: 1, deleted: 1 });

BusinessUnitSchema.statics.GetBusinessUnits = async function GetBusinessUnits() {
  return await this.find();
};

const BusinessUnitModel = mongoose.model<Reactory.Models.IBusinessUnitDocument>('BusinessUnit', BusinessUnitSchema, 'reactory_business_units');
export default BusinessUnitModel;
