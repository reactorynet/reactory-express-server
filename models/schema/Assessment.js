import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const AssessmentSchema = mongoose.Schema({
  id: ObjectId,
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  client: {
    type: ObjectId,
    required: true,
    ref: 'ReactoryClient',
  },
  delegate: {
    type: ObjectId,
    ref: 'User',
  },
  team: {
    type: ObjectId,
    ref: 'Team',
  },
  assessor: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  survey: {
    type: ObjectId,
    ref: 'Survey',
  },
  complete: {
    type: Boolean,
    required: true,
    default: false,
  },
  ratings: [
    {
      qualityId: {
        type: ObjectId,
      },
      behaviourId: {
        type: ObjectId,
      },
      ordinal: Number,
      rating: Number,
      comment: String,
      custom: Boolean,
      behaviourText: String,
      updatedAt: Date,
    },
  ],
  createdAt: Date,
  updatedAt: Date,
});

const AssessmentModel = mongoose.model('Assessment', AssessmentSchema);
export default AssessmentModel;
