import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const SurveySchema = new mongoose.Schema({
  id: ObjectId,
  legacyId: String,
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  leadershipBrand: {
    type: ObjectId,
    required: true,
    ref: 'LeadershipBrand',
  },
  title: {
    type: String,
    required: true,
  },
  surveyType: {
    type: String,
    lowercase: true,
    enum: ['180', '360', 'plc', 'custom'],
    required: true,
  },
  surveyModule: {
    type: String,
    lowercase: true,
    required: false,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  mode: {
    type: String,
    lowercase: true,
    trim: true,
    enum: ['live', 'test'],
  },
  status: {
    type: String,
    lowercase: true,
    trim: true,
    enum: ['not-ready', 'ready', 'launched', 'paused', 'complete'],
  },
  options: { },
  calendar: [
    {
      entryType: {
        type: String,
        lowercase: true,
        trim: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: false,
      },
      hasTask: Boolean,
      taskResult: String,
      taskError: String,
    },
  ],
  delegates: [
    {
      delegate: {
        type: ObjectId,
        ref: 'User',
      },
      notifications: [
        {
          type: ObjectId,
          ref: 'Notifications',
        },
      ],
      assessments: [{
        type: ObjectId,
        ref: 'Assessment',
      }],
      launched: Boolean,
    },
  ],
  timeline: [
    {
      when: Date,
      eventType: String,
      eventDetail: String,
      who: {
        type: ObjectId,
        ref: 'User',
      },
    },
  ],
});

const SurveyModel = mongoose.model('Survey', SurveySchema);
export default SurveyModel;
