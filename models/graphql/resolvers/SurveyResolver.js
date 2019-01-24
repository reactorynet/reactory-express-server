import moment from 'moment';
import co from 'co';
import lodash from 'lodash';
import Admin from '../../../application/admin';
import { queueSurveyEmails } from '../../../emails';
import {
  LeadershipBrand,
  Organization,
  User,
  Survey,
  Assessment,
  Notification,
  Organigram,
  Template,
} from '../../../models';
import { ObjectId } from 'mongodb';
import ApiError, { RecordNotFoundError } from '../../../exceptions';
import logger from '../../../logging';

export default {
  SurveyCalendarEntry: {
    title(sce) { return sce.title; },
    start(sce) { return sce.start; },
    end(sce) { return sce.end; },
    hasTask(sce) { return sce.hasTask; },
    taskResult(sce) { return sce.taskResult; },
    taskError(sce) { return sce.taskError; },
  },
  TimelineEntry: {
    when(sce) { return moment(sce.when); },
    eventType(sce) { return sce.eventType; },
    eventDetail(sce) { return sce.eventDetail; },
    who(sce) {
      if (sce.who) return User.findById(sce.who);
      return null;
    },
  },
  DelegateEntry: {
    delegate(entry) {
      return User.findById(entry.delegate);
    },
    peers(entry, context, info) {
      debugger //eslint-disable-line
      logger.info('Resolving peers for delegateEntry', { entry, context, info });
      return Organigram.findOne({ user: entry.delegate }).then();
    },
    notifications(entry) {
      return new Promise((resolve) => {
        Promise.all(entry.notifications.map(nid => (Notification.findById(nid))))
          .then(notifications => resolve(notifications));
      });
    },
    assessments(entry) {
      console.log('getting assessment for delegateentry', entry);
      return new Promise((resolve) => {
        const promises = entry.assessments.map(aid => (Assessment.findById(aid).then()));
        Promise.all(promises).then(assessments => resolve(assessments));
      });
    },
    status(entry) {
      return entry.status || 'new';
    },
    launched(entry) {
      return entry.launched;
    },
    complete(entry) {
      return entry.complete;
    },
    removed(entry) {
      return entry.removed;
    },
    updatedAt() {
      return entry.updatedAt || null;
    },
    lastAction() {
      return entry.lastAction || 'added';
    },
  },
  Survey: {
    id(obj) {
      return obj._id.toString();
    },
    leadershipBrand(survey) {
      if (survey.leadershipBrand) return LeadershipBrand.findById(survey.leadershipBrand);
      return null;
    },
    organization(survey) {
      if (survey.organization) return Organization.findById(survey.organization);
      return null;
    },
    startDate(survey) {
      if (survey.startDate) return moment(survey.startDate);
      return null;
    },
    endDate(survey) {
      if (survey.endDate) return moment(survey.endDate);
      return null;
    },
    timeline(survey) {
      return survey.timeline;
    },
    calendar(survey) {
      return survey.calendar;
    },
    delegates(survey) {
      return survey.delegates;
    },
    statistics(survey) {
      const statistics = {
        launched: 0,
        peersConfirmed: 0,
        complete: 0,
        total: survey.delegates.length,
      };

      statistics.launched = lodash.countBy(survey.delegates, 'launched')['true'];

      return statistics;
    },
  },
  Query: {
    surveysForOrganization(obj, { organizationId }) {
      return Admin.Survey.getSurveysForOrganization(organizationId);
    },
    surveysList(obj, { sort }) {
      return Admin.Survey.getSurveys();
    },
    surveyDetail(obj, { surveyId }) {
      return Survey.findById(surveyId);
    },
  },
  Mutation: {
    updateSurvey(obj, { id, surveyData }) {
      logger.info('Updating Survey Config', { id, surveyData });
      return Survey.findByIdAndUpdate(ObjectId(id), { ...surveyData });
    },
    updateSurveyOptions(obj, { id, options }) {
      logger.info('Update Survey Options', { id, options });
      return Survey.findByIdAndUpdate(ObjectId(id), { options });
    },
    createSurvey(obj, { id, surveyData }) {
      return co.wrap(function* createSurveyGenerator(organization, survey) {
        const found = yield Organization.findById(organization).then();
        if (!organization) throw new ApiError('Org not found');
        const created = yield new Survey({ ...survey, organization: found._id }).save().then();
        return created;
      })(id, surveyData);
    },
    launchSurvey: async (obj, { id, options }) => {
      const survey = await Survey.findById(id).then();
      survey.active = true;
      await survey.save();
      queueSurveyEmails(survey, 'launch');
      // createNotifications(survey, 'launch');
    },
    setDelegatesForSurvey: async (obj, { id, delegates }) => {
      const survey = await Survey.findById(id).then();

      survey.delegates = delegates;
      // else survey.delegates.push(delegates);

      await survey.save();
      return survey;
    },
    addDelegateToSurvey(surveyId, delegateId) {
      return co.wrap(function* addDelegateToSurveyGenerator(sid, did) {
        const survey = Survey.findById(sid).then();
        const delegate = yield User.findById(did).then();

        if (survey && delegate) {
          const delegates = [];
          let found = false;
          survey.delegates.map((dentry) => {
            if (dentry.delegate !== ObjectId(did)) {
              delegates.push(dentry);
            } else found = true;
          });
          if (!found) {
            delegates.push({
              delegate: delegate._id,
              notifications: [],
              assessments: [],
              launched: false,
              complete: false,
              removed: false,
            });
          }
          survey.delegates = delegates;
          const saved = yield survey.save().then();
          return {
            id: survey._id,
            user: delegate._id,
          };
        } throw new ApiError('Survey not found!');
      })(surveyId, delegateId);
    },
    removeDelegateFromSurvey(obj, { surveyId, delegateId }) {
      return co.wrap(function* removeDelegateFromSurveyGenerator(sid, did) {
        const survey = Survey.findById(sid).then();
        const delegate = yield User.findById(did).then();
        if (survey && delegate) {
          const delegates = [];
          const found = false;
          survey.delegates.map((dentry) => {
            if (dentry.delegate !== ObjectId(did)) {
              delegates.push(dentry);
            } else {
              delegates.push({ ...dentry, removed: true });
            }
          });
          if (!found) {
            delegates.push({
              delegate: delegate._id,
              notifications: [],
              assessments: [],
              launched: false,
              complete: false,
              removed: false,
            });
          }
          survey.delegates = delegates;
          const saved = yield survey.save().then();
          return {
            id: saved._id,
            user: delegate._id,
          };
        } throw new ApiError('Survey not found!');
      })(surveyId, delegateId);
    },
    async surveyDelegateAction(obj, {
      entryId, survey, delegate, action, inputData,
    }) {
      logger.info('Executing action for delegate entry', {
        entryId, survey, delegate, action, inputData,
      });

      const surveyModel = await Survey.findById(survey).then();

      if (!surveyModel) throw new RecordNotFoundError('Could not find survey item', 'Survey');

      const userModel = await User.findById(delegate).then();
      if (!userModel) throw new RecordNotFoundError('Could not find the user item', 'User');

      const organigramModel = await Organigram.find({
        user: userModel.id,
        organization: surveyModel.organization,
      }).then();

      if (!organigramModel) throw new ApiError('User does not have an organigram model, please configure peers');

      const entryData = {
        entry: null,
        entryIdx: -1,
        message: 'Awaiting instruction',
        error: false,
        success: true,
        patch: false,
      };

      surveyModel.delegates.forEach((entry, idx) => {
        if (entry.id.toString() === entryId) {
          entryData.entryIdx = idx;
          entryData.entry = entry;
        }
      });

      switch (action) {
        case 'send-invite': {
          entryData.entry.message = `Sent participation invite letter to delegate ${userModel.firstName} ${userModel.lastName}`;
          entryData.patch = true;
          break;
        }
        case 'launch': {
          entryData.entry.message = `Launched survey for delegate ${userModel.firstName} ${userModel.lastName}`;
          entryData.patch = true;
          break;
        }
        case 'send-reminder': {
          entryData.entry.message = `Sending reminder messages for delegate ${userModel.firstName} ${userModel.lastName}}`;
          entryData.patch = true;
          break;
        }
        case 'send-closed': {
          entryData.entry.message = `Closing survey for delegate ${userModel.firstName} ${userModel.lastName}}`;
          entryData.patch = true;
          break;
        }
        case 'remove': {
          entryData.entry.message = `Removed delegate ${userModel.firstName} ${userModel.lastName}} from Survey`;
          entryData.entry.removed = true;
          entryData.patch = true;
          break;
        }
        default: {
          entryData.message = 'Default action taken, none';
        }
      }

      if (entryData.patch === true) {
        surveyModel.delegates[entryData.entryIdx] = { ...surveyModel.delegates[entryData.entryIdx], ...entryData.entry };
      }

      surveyModel.delegates[entryData.entryIdx].lastAction = action;
      surveyModel.delegates[entryData.entryIdx].updatedAt = new Date().valueOf();

      await surveyModel.save().then();
      return entryData.entry;
    },
  },
};
