import mongoose from 'mongoose';
import { Reactory } from '@reactory/server-core/types/reactory';

const { ObjectId } = mongoose.Schema.Types;

const BusinessUnitSchema = new mongoose.Schema<Reactory.IBusinessUnit>({
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
});

BusinessUnitSchema.statics.GetBusinessUnits = async function GetBusinessUnits() {
  return await this.find();
};

const BusinessUnitModel = mongoose.model<Reactory.IBusinessUnitDocument>('BusinessUnit', BusinessUnitSchema);
export default BusinessUnitModel;
