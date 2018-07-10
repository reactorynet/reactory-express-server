import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const TeamSchema = mongoose.Schema({
  id: ObjectId,
  title: String,
  members: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  createdAt: Date,
});

const TeamModel = mongoose.model('Team', TeamSchema);
export default TeamModel;