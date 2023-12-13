import mongoose from 'mongoose';
import Reactory from '@reactory/reactory-core';

const { ObjectId } = mongoose.Schema.Types;
const TeamSchema = new mongoose.Schema<Reactory.Models.ITeam>({
  title: String,
  name: {
    type: String,
    default: function() {
      return this.title
    }
  },
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
  deleted: {
    type: Boolean,
    default: false,
  },
  createdAt: Date,
});

TeamSchema.statics.GetAllTeams = async function GetAllTeams() {
  return await this.find();
};

const TeamModel = mongoose.model<Reactory.Models.ITeamDocument>('Team', TeamSchema);
export default TeamModel;
