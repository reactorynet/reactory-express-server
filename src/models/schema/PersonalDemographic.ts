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
  region: {
    type: ObjectId,
    ref: 'Region',
  },
  operationalGroup: {
    type: ObjectId,
    ref: 'Organization'
  },
  businessUnit: {
    type: ObjectId,
    ref: 'BusinessUnit'
  },
  team: {
    type: ObjectId,
    ref: 'Team'
  },
});

PersonalDemographicSchema.statics.GetLoggedInUserDemograpics = async () : Promise<any> => {  
  const { user, partner } = global;
  return await this.findOne({ userId: user._id });
};

const PersonalDemographicModel = mongoose.model('PersonalDemographic', PersonalDemographicSchema);

export default PersonalDemographicModel;
