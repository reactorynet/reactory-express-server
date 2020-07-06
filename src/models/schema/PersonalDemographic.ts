import mongoose, { MongooseDocument } from 'mongoose';
import logger from '@reactory/server-core/logging';

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
  pronoun: String,
  position: String,
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

PersonalDemographicSchema.statics.GetLoggedInUserDemograpics = async function GetLoggedInUserDemograpics(): Promise<any> {
  const { user, partner } = global;
  return await this.findOne({ userId: user._id });
};

PersonalDemographicSchema.statics.SetLoggedInUserDemograpics = async function SetLoggedInUserDemograpics(args: any): Promise<any> {

  logger.debug(`PERSONAL DEMOGRAPHICS SCHEMA:: ${JSON.stringify(args)}`);

  const { user, partner } = global;
  const { race, age, gender, position, region, operationalGroup, businessUnit, team } = args;

  const saveResponse = await this.findOneAndUpdate(
    { userId: user._id },
    { userId: user._id, race, age, gender, position, region, operationalGroup, businessUnit, team },
    { new: true, upsert: true }
  );

  logger.debug(`PERSONAL DEMOGRAPHICS SCHEMA SAVE :: ${saveResponse}`);

  return saveResponse
}

const PersonalDemographicModel = mongoose.model('PersonalDemographic', PersonalDemographicSchema);

export default PersonalDemographicModel;
