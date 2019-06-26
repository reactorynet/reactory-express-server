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
  businessUnit: {
    type: ObjectId,
    ref: 'BusinessUnit',
  },
  position: {
    type: String,
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
      lowercase: true,
      trim: true,
    },
    isInternal: Boolean,
    inviteSent: Boolean,
    confirmed: Boolean,
    confirmedAt: Date,
  }],
  createdAt: Date,
  updatedAt: Date,
  confirmedAt: Date,
});

const OrganigramModel = mongoose.model('Organigram', OrganigramSchema);
export default OrganigramModel;