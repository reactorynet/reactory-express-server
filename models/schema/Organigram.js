import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const OrganigramSchema = mongoose.Schema({
  id: ObjectId,
  organization: {
    type: ObjectId,
    ref: 'Organization',
  },
  user: {
    type: ObjectId,
    ref: 'User',
  },
  peers: [{
    user: {
      type: ObjectId,
      ref: 'User',
    },
    relationship: {
      type: String,
      enum: ['peer', 'manager', 'report'],
      lowercase: true,
      trim: true,
    },
  }],
  createdAt: Date,
  confirmed: Date,
});

const OrganigramModel = mongoose.model('Organigram', OrganigramSchema);
export default OrganigramModel;
