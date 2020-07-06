import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const BusinessUnitSchema = mongoose.Schema({
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
  owner: {
    type: ObjectId,
    ref: 'User',
  },
});

BusinessUnitSchema.statics.GetBusinessUnits = async function GetBusinessUnits() {
  return await this.find();
};

const BusinessUnitModel = mongoose.model('BusinessUnit', BusinessUnitSchema);
export default BusinessUnitModel;
