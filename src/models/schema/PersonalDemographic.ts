import mongoose, { MongooseDocument } from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const PersonalDemographicSchema = new mongoose.Schema({
  id: ObjectId,
  userId: {
    type: ObjectId,
    ref: 'User'
  },
  race: Number,
  age: Number,
  gender: Number,
  position: Number,
  region: Number,
  operationalGroup: Number,
  businessUnit: Number,
  team: Number,
});

PersonalDemographicSchema.statics.GetLoggedInUserDemograpics = async () => {  
  const { user, partner } = global;
  return await self.findOne({ userId: user._id });
};

const PersonalDemographicModel = mongoose.model('PersonalDemographic', PersonalDemographicSchema);

export default PersonalDemographicModel;
