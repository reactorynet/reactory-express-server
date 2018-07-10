import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const LeadershipBrandSchema = mongoose.Schema({
  organizationId: ObjectId,
  locked: Boolean,
  title: String,
  description: String,
  scale: {
    key: String,
    title: String,
    entries: [
      {
        rating: Number,
        description: String,
      },
    ],
  },
  qualities: [
    {
      title: String,
      description: String,
      ordinal: Number,
      behaviours: [
        {
          title: String,
          description: String,
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
