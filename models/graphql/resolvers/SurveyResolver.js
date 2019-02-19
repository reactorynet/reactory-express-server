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
import { launchSurveyForDelegate, sendSurveyEmail, EmailTypesForSurvey, sendSurveyClosed } from '../../../application/admin/Survey';

const { findIndex } = lodash;

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
    id(entry) {
      return entry.id || '';
    },
    delegate(entry) {
      return User.findById(entry.delegate);
    },
    peers(entry, context, info) {
      return Organigram.findOne({ user: entry.delegate }).then();
    },
    notifications(entry) {
      return new Promise((resolve) => {
        Promise.all(entry.notifications.map(nid => (Notification.findById(nid))))
          .then(notifications => resolve(notifications));
      });
    },
    assessments(entry) {
      return Assessment.find({ _id: { $in: entry.assessments } })
        .populate('assessor')
        .populate('delegate')
        .then();
    },
    status(entry) {
      return entry.status || 'NEW';
    },
    launched(entry) {
      return entry.launched === true;
    },
    complete(entry) {
      return entry.complete === true;
    },
    removed(entry) {
      return entry.removed === true;
    },
    updatedAt(entry) {
      return moment(entry.updatedAt);
    },
    lastAction(entry) {
      return entry.lastAction || 'added';
    },
    message(entry) {
      return entry.message;
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

      const { user } = global;

      const surveyModel = await Survey.findById(survey).populate('delegates.delegate').then();

      if (!surveyModel) throw new RecordNotFoundError('Could not find survey item', 'Survey');

      const delegateModel = await User.findById(delegate).then();
      if (!delegateModel) throw new RecordNotFoundError('Could not find the user item', 'User');

      const organigramModel = await Organigram.findOne({
        user: ObjectId(delegateModel._id),
        organization: ObjectId(surveyModel.organization),
      }).then();


      const entryData = {
        entry: null,
        entryIdx: -1,
        message: 'Awaiting instruction',
        error: false,
        success: true,
        patch: false,
      };

      try {
        logger.info(`Survey Model has ${surveyModel.delegates.length} delegates, finding ${entryId}`);
        if (entryId === '' && action === 'add') {
          entryData.entry = {
            id: new ObjectId(),
            delegate: delegateModel,
            notifications: [],
            assessments: [],
            launched: false,
            complete: false,
            removed: false,
            message: `Added ${delegateModel.firstName} ${delegateModel.lastName} to survey ${surveyModel.title}`,
            lastAction: 'added',
            satus: 'new',
            updatedAt: moment().valueOf(),
          };
          surveyModel.delegates.push(entryData.entry);
          surveyModel.addTimelineEntry('Added Delegate', `${user.firstName} added ${delegateModel.firstName} ${delegateModel.lastName} to Survey`, user.id, true);
          entryData.patch = false;

          return entryData.entry;
        }

        // not a new entry, find it!
        entryData.entry = surveyModel.delegates.id(entryId);
        if (entryData.entry === null) {
          throw new ApiError('Could not find the delegate entry with the entry id', entryId);
        }

        for (let entryIndex = 0; entryIndex < surveyModel.delegates.length; entryIndex += 1) {
          if (surveyModel.delegates[entryIndex]._id === entryData.entry._id) {
            entryData.entryIdx = entryIndex;
          }
        }

        entryData.entry.delegate = delegateModel;
        logger.info(`Performing ${action} on 
          organigram model: ${organigramModel ? organigramModel._id.toString() : 'No Organigram'} 
          and delegateEntry: ${entryData.entry._id} at index ${entryData.entryIdx} for 
          delegate: ${entryData.entry.delegate._id.toString()}`, entryData.entry);

        switch (action) {
          case 'send-invite': {
            const inviteResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.ParticipationInvite);
            entryData.entry.message = inviteResult.message;
            entryData.patch = true;
            entryData.entry.status = 'invite-sent';
            entryData.entry.lastAction = inviteResult.success ? 'invitation-sent' : 'invite-failed';
            break;
          }
          case 'launch': {
            if (organigramModel) {
              const launchResult = await launchSurveyForDelegate(surveyModel, entryData.entry, organigramModel);
              entryData.entry.message = launchResult.message; // `Launched survey for delegate ${userModel.firstName} ${userModel.lastName}`;
              if (launchResult.assessments) {
                entryData.entry.assessments = launchResult.assessments.map(a => a._id);
              }
              entryData.patch = true;
              entryData.entry.status = launchResult.success ? 'launched' : entryData.entry.status;
              entryData.entry.lastAction = launchResult.success ? 'launched' : 'launch-fail';
            } else {
              // console.log('No Organigram Model', organigramModel);
              entryData.entry.message = `Please set user organigram / peers. ${delegateModel.firstName} ${delegateModel.lastName}`;
              entryData.patch = true;
              entryData.entry.status = 'new';
              entryData.entry.lastAction = 'launch';
            }
            break;
          }
          case 'send-reminder': {
            const reminderResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyReminder);
            entryData.entry.message = reminderResult.message;
            entryData.patch = true;
            entryData.entry.status = 'reminded';
            entryData.entry.lastAction = 'reminder';
            break;
          }
          case 'send-closed': {
            const closeResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyClose);
            entryData.entry.message = closeResult.message;
            entryData.patch = true;
            entryData.entry.status = 'closed';
            entryData.entry.lastAction = 'closed';
            break;
          }
          case 'remove': {
            entryData.entry.message = `Removed delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
            if (!entryData.entry.removed) {
              entryData.entry.removed = true;
              entryData.entry.status = 'removed';
              entryData.patch = true;
            } else {
              surveyModel.delegates[entryData.entryIdx].remove();
              entryData.entry.status = 'deleted';
              surveyModel.addTimelineEntry('User Removed', `${user.firstName} removed delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`, user.id, true);
              entryData.patch = false;
            }
            break;
          }
          case 'enable': {
            entryData.entry.message = `Re-enabled delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
            entryData.entry.removed = false;
            entryData.entry.status = 'new';
            entryData.patch = true;
            break;
          }
          default: {
            entryData.message = 'Default action taken, none';
          }
        }

        if (entryData.patch === true && entryData.entryIdx >= 0) {
          logger.info(`Updating entry ${entryData.entry.id}`);
          entryData.entry.lastAction = action;
          entryData.entry.updatedAt = moment().valueOf();
          surveyModel.delegates.set(entryData.entryIdx, entryData.entry);
          await surveyModel.save().then();
        }
      } catch (error) {
        console.log(error);
      }
      return entryData.entry;
    },
  },
};
