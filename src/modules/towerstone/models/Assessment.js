import mongoose from 'mongoose';
import { ObjectId as ObjectID } from 'mongodb';
import logger from '../../../logging';

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
    type: String,
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
  deleted: {
    type: Boolean,
    required: true,
    default: false,
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
      updatedBy: {
        type: ObjectId,
        ref: 'User'
      }
    },
  ],
  createdAt: Date,
  updatedAt: Date,
  updatedBy: {
    type: ObjectId,
    ref: 'User',
  }
});

AssessmentSchema.methods.isSelfAssessment = function isSelfAssessment() {
  try {
    if (ObjectID.isValid(this.assessor) === true && ObjectID.isValid(this.delegate) === true) {
      return this.assessor.equals(this.delegate);
    }
  } catch (err) {
    logger.error('Could not check if is selfAssessment', err);
  }

  return false;
};

const AssessmentModel = mongoose.model('Assessment', AssessmentSchema);

export default AssessmentModel;
