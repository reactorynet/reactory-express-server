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
  allowEdit: Boolean,
  peers: [{
    user: {
      type: ObjectId,
      ref: 'User',
    },
    legacyPeerId: String,
    relationship: {
      type: String,
      enum: ['peer', 'manager', 'report', 'vendor', 'client', 'partner'],
      lowercase: true,
      trim: true,
    },
    isInternal: Boolean,
  }],
  createdAt: Date,
  updatedAt: Date,
  confirmedAt: Date,
});

const OrganigramModel = mongoose.model('Organigram', OrganigramSchema);
export default OrganigramModel;
