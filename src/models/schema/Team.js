import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const TeamSchema = mongoose.Schema({
  title: String,
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
  createdAt: Date,
});

TeamSchema.statics.GetAllTeams = async function GetAllTeams() {
  return await this.find();
};

const TeamModel = mongoose.model('Team', TeamSchema);
export default TeamModel;
