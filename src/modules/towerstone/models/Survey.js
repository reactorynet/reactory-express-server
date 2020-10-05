import mongoose from 'mongoose';

const moment = require('moment');

const { ObjectId } = mongoose.Schema.Types;

export const EVENTS_TO_TRACK = {
  DELEGATE_ADDED: 'Delegate Added',
  LAUNCH_INVITE: 'Launch Invite',
  LAUNCHED: 'Launched',
  PEER_LAUNCHED: 'Peer Launched',
  REMINDER: 'Reminder Sent',
  CLOSED: 'Closed',
  REMOVED: 'Delegate Removed',
  PAUSED: 'Delegate Paused',
  RESTARTED: 'Delegate Restarted',
  ASSESSOR_REMOVED: 'Assessor Removed',
  ENABLED: 'Delegate Enabled',
  NOMINEE_INVITE: 'Nomniee Invite Sent',
  NOMINEES_CONFIRMED: 'Nominees Confirmed',
  ASSESSMENT_STARTED: 'Assessment Started',
  ASSESSMENT_COMPLETED: 'Assessment Completed',
  ASSESSMENT_REOPENED: 'Assessment Re-opened',
  REPORT_GENERATED: 'Report Generated',

};

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
    enum: ['180', '360', 'plc', 'custom', 'l360', 'i360', 'culture', 'team180', 'other'],
    required: true,
  },
  delegateTeamName: {
    type: String,
    required: false
  },
  assessorTeamName: {
    type: String,
    required: false
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
    enum: ['new', 'not-ready', 'ready', 'launched', 'paused', 'complete'],
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
      complete: Boolean,
      removed: Boolean,
      message: String,
      team: String,
      lastAction: String,
      status: String,
      updatedAt: Date,
      createdAt: Date,
      actions: [
        {
          action: String,
          when: Date,
          result: String,
          who: {
            type: ObjectId,
            ref: 'User',
          },
        },
      ],
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


SurveySchema.methods.addTimelineEntry = async function addTimelineEntry(
  eventType,
  eventDetail,
  who,
  save = false,
) {
  const entry = {
    when: moment().valueOf(),
    eventType,
    eventDetail,
    who: !who ? global.user.id : who,
  };

  if (!this.timeline) this.timeline = [];

  this.timeline.push(entry);

  // if (save) await this.save().then();
  if (save) return this.save().then();
};

SurveySchema.methods.clearedForLaunchBySurvey = function clearedForLaunchBySurvey() {
  const statusReady = (this.status === 'ready' || this.status === 'launched');
  const startDateReady = moment(this.startDate).isSameOrBefore(moment());
  const endDateReady = moment(this.endDate).isSameOrAfter(moment());
  // console.log('clearedForLaunch', statusReady, startDateReady, endDateReady);

  return statusReady && startDateReady && endDateReady;
};

const SurveyModel = mongoose.model('Survey', SurveySchema);
export default SurveyModel;
