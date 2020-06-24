import mongoose, { MongooseDocument } from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const PersonalDemographicSchema = new mongoose.Schema({
  id: ObjectId,
  userId: {
    type: ObjectId,
    ref: 'User'
  },
  race: String,
  age: String,
  gender: String,
  position: String,
  region: String,
  operationalGroup: String,
  businessUnit: String,
  team: String,
});

PersonalDemographicSchema.statics.GetLoggedInUserDemograpics = async function GetLoggedInUserDemograpics() {
  const { user, partner } = global;
  return await this.findOne({ userId: user._id });
};

PersonalDemographicSchema.statics.SetLoggedInUserDemograpics = async function SetLoggedInUserDemograpics(args) {
  const { user, partner } = global;
  const { race, age, gender, position, region, operationalGroup, businessUnit, team } = args

  return await this.findOneAndUpdate(
    { userId },
    { userId: user._id, race, age, gender, position, region, operationalGroup, businessUnit, team },
    { new: true, upsert: true }
  ).exec();
};

const PersonalDemographicModel = mongoose.model('PersonalDemographic', PersonalDemographicSchema);

export default PersonalDemographicModel;
