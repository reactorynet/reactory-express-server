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
      description: String,

      delegate_title: String,
      delegate_description: String,

      assessor_title: String,
      assessor_description: String,

      chart_title: String,
      chart_color: String,

      legacyId: String,      
      ordinal: Number,
      
      behaviours: [
        {
          title: String,
          description: String,
          
          delegate_title: String,
          delegate_description: String,

          assessor_title: String,
          assessor_description: String,

          chart_title: String,
          chart_color: String,

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
