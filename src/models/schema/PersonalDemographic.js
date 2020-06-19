import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const PersonalDemographicSchema = new mongoose.Schema({
  id: ObjectId,
  clientId: String,
  race: Number,
  age: Number,
  gender: Number,
  position: Number,
  region: Number,
  operationalGroup: Number,
  businessUnit: Number,
  team: Number,
});

const PersonalDemographicModel = mongoose.model('PersonalDemographic', PersonalDemographicSchema);

export default PersonalDemographicModel;
