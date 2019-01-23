import moment from 'moment';
import co from 'co';
import Admin from '../../../application/admin';
import { queueSurveyEmails } from '../../../emails';
import { LeadershipBrand, Organization, User, Survey, Assessment, Notification } from '../../../models';
import { ObjectId } from 'mongodb';
import ApiError from '../../../exceptions';
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
        launched: 10,
        peersPending: 23,
        complete: 50,
        total: survey.delegates.length,
      };

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

  },
};
