import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const LeadershipBrandSchema = mongoose.Schema({
  organization: {
    type: ObjectId,
    ref: 'Organization',
  },
  locked: Boolean,
  legacyId: String,
  title: String,
  description: String,
  scale: {
    type: ObjectId,
    ref: 'Scale',
  },
  qualities: [
    {
      title: String,
      legacyId: String,
      description: String,
      ordinal: Number,
      behaviours: [
        {
          title: String,
          description: String,
          legacyId: String,
          ordinal: Number,
        },
      ],
    },
  ],
  createdAt: Date,
  updatedAt: Date,
});

const LeadershipBrandModel = mongoose.model('LeadershipBrand', LeadershipBrandSchema);
export default LeadershipBrandModel;
