import mongoose, { MongooseDocument } from 'mongoose';
import { ObjectId, ObjectID } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory'

const OperationalGroupSchema = new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  title: String,
});

// Region.statics.GetRegions = async (organization?: string | ObjectId | Reactory.IOrganization ): Promise<Array<Reactory.IRegion>> => {
  OperationalGroupSchema.statics.GetOperationalGroups = async function GetOperationalGroups(): Promise<Array<Reactory.IOperationalGroup>> {
  const { user, partner } = global;
  return await this.find();
};


OperationalGroupSchema.statics.AddOperationalGroup = async function AddOperationalGroup(group?: Reactory.IOrganization): Promise<Reactory.IOperationalGroup> {
  const { user, partner } = global;
  return { title: '' }
};

const OperationalGroupModel = mongoose.model<Reactory.IRegionDocument>('OperationalGroup', OperationalGroupSchema);

export default OperationalGroupModel;
