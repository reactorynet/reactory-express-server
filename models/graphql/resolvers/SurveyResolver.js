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
import LeadershipBrandModel from '../../schema/LeadershipBrand';

const { findIndex, pullAt } = lodash;

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
    peers(entry, kwargs, context) {
      logger.info(`Resolving peers for delegate: ${entry.delegate} and organization ${context.organization}`, context);
      if (!ObjectId.isValid(entry.delegate)) return null;
      if (!ObjectId.isValid(context.organization)) return null;
      const query = {
        user: ObjectId(entry.delegate),
        organization: ObjectId(context.organization),
      };
      logger.info(`Looking for Organigram Model with  ${query.user} and ${query.organization}`, query);
      return Organigram.findOne(query).then();
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
    nextAction(entry) {
      switch (entry.lastAction) {
        case 'added': {
          return 'send-invite';
        }
        case 'invite-sent': {
          return 'launch';
        }
        case 'launched': {
          return 'remind';
        }
        default: {
          return 'close';
        }
      }
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
    async surveyDetail(parent, { surveyId }, context, info) {
      const survey = await Survey.findById(surveyId).then();
      if (survey != null) {
        context.organization = survey.organization;
      }
      return survey;
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
      logger.debug(`Executing action for delegate entry:\n ${JSON.stringify({
        entryId, survey, delegate, action, inputData,
      }, null, 1)}`);

      const { user } = global;

      const surveyModel = await Survey.findById(survey).populate('delegates.delegate', 'delegates.assessments').then();

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
            actions: [{
              action: 'added',
              when: moment().valueOf(),
              result: `Added ${delegateModel.firstName} ${delegateModel.lastName} to survey ${surveyModel.title}`,
              who: user._id,
            }],
            updatedAt: moment().valueOf(),
            createdAt: moment().valueOf(),
          };
          surveyModel.delegates.push(entryData.entry);
          await surveyModel.save().then();
          // TODO: Figure out why this is throwing a mongoose error now
          // record is inserted, but on return it fails
          try {
            // surveyModel.addTimelineEntry('Added Delegate', `${user.firstName} added ${delegateModel.firstName} ${delegateModel.lastName} to Survey`, user.id, true);
          } catch (e) {
            logger.error(e.message, e);
          }

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
        logger.info(`Performing "${action}" action:\n 
          \tOrganigram model: ${organigramModel ? organigramModel._id.toString() : 'No Organigram'}\n 
          \tDelegateEntry: ${entryData.entry._id} at index ${entryData.entryIdx}\n 
          \tDelegate: ${entryData.entry.delegate.email}
          \tAssessments: ${entryData.entry.assessments}`);

        switch (action) {
          case 'send-invite': {
            const inviteResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.ParticipationInvite);
            entryData.entry.message = `${inviteResult.message} @ ${moment().format('YYYY-MM-DD HH:mm:ss')}`;
            entryData.patch = true;
            entryData.entry.status = 'invite-sent';
            entryData.entry.lastAction = inviteResult.success ? 'invitation-sent' : 'invite-failed';
            entryData.entry.actions.push({
              action: inviteResult.success ? 'invitation-sent' : 'invite-failed',
              when: new Date(),
              result: inviteResult.message,
              who: user._id,
            });
            break;
          }
          case 'launch': {
            if (organigramModel && organigramModel.confirmedAt) {
              const relaunch = inputData.relaunch === true;
              const launchResult = await launchSurveyForDelegate(surveyModel, entryData.entry, organigramModel, relaunch);
              entryData.entry.message = launchResult.message; // `Launched survey for delegate ${userModel.firstName} ${userModel.lastName}`;
              if (launchResult.assessments) {
                entryData.entry.assessments = launchResult.assessments.map(a => a._id);
              }
              entryData.patch = true;
              entryData.entry.status = launchResult.success ? 'launched' : entryData.entry.status;
              entryData.entry.lastAction = launchResult.success ? 'launched' : 'launch-fail';
              entryData.entry.launched = launchResult.success === true;
              entryData.entry.actions.push({
                action: launchResult.success ? 'launched' : 'launch-fail',
                when: new Date(),
                result: launchResult.message,
                who: user._id,
              });
            } else {
              // //console.log('No Organigram Model', organigramModel);
              entryData.entry.message = `Please set user organigram / peers. ${delegateModel.firstName} ${delegateModel.lastName}`;
              entryData.patch = true;
              entryData.entry.status = 'new';
              entryData.entry.lastAction = 'launch';

              entryData.entry.actions.push({
                action: 'launch',
                when: new Date(),
                result: entryData.entry.message,
                who: user._id,
              });
            }
            break;
          }
          case 'send-reminder': {
            const reminderResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyReminder);
            entryData.entry.message = reminderResult.message;
            entryData.patch = true;
            // entryData.entry.status = 'reminded';
            entryData.entry.lastAction = 'reminder';

            entryData.entry.actions.push({
              action: 'reminder',
              when: new Date(),
              result: reminderResult.message,
              who: user._id,
            });

            break;
          }
          case 'send-closed': {
            const closeResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyClose);
            entryData.entry.message = closeResult.message;
            entryData.patch = true;
            entryData.entry.status = 'closed';
            entryData.entry.lastAction = 'closed';
            entryData.complete = true;
            entryData.entry.actions.push({
              action: 'closed',
              when: new Date(),
              result: closeResult.message,
              who: user._id,
            });
            break;
          }
          case 'remove': {
            entryData.entry.message = `Removed delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
            if (!entryData.entry.removed) {
              entryData.entry.removed = true;
              entryData.entry.status = 'removed';
              entryData.entry.lastAction = 'removed';
              entryData.patch = true;

              entryData.entry.actions.push({
                action: 'removed',
                when: new Date(),
                result: entryData.entry.message,
                who: user._id,
              });
            } else {
              surveyModel.delegates[entryData.entryIdx].remove();
              entryData.entry.status = 'deleted';
              entryData.entry.actions.push({
                action: 'deleted',
                when: new Date(),
                result: 'Deleted from Survey',
                who: user._id,
              });

              surveyModel.addTimelineEntry('User Removed', `${user.firstName} removed delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`, user.id, true);
              entryData.patch = false;
            }
            break;
          }
          case 'enable': {
            entryData.entry.message = `Re-enabled delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
            entryData.entry.removed = false;
            entryData.entry.status = 'new';
            entryData.entry.lastAction = 're-added';
            entryData.patch = true;

            entryData.entry.actions.push({
              action: 'removed',
              when: new Date(),
              result: entryData.entry.message,
              who: user._id,
            });

            break;
          }
          case 'remove-assessor': {
            // used when we remove an assessor from a particular delegate
            try {
              const { assessmentId } = inputData;
              const assessment = await Assessment.findById(assessmentId).populate('assessor').then();
              if (assessment !== null && assessment !== undefined) {
                assessment.deleted = true;
                assessment.completed = true;
                assessment.updatedAt = new Date();
                const assessmentCount = entryData.entry.assessments.length;
                let pullAtIndex = -1;

                for (let aidx = 0; aidx < assessmentCount; aidx += 1) {
                  const sourceId = entryData.entry.assessments[aidx];
                  if (ObjectId(sourceId).equals(ObjectId(assessmentId))) {
                    pullAtIndex = aidx;
                  }
                }

                if (pullAtIndex > -1) pullAt(entryData.entry.assessments, [pullAtIndex]);

                entryData.entry.message = `Removed ${assessment.assessor.firstName} ${assessment.assessor.lastName} for ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
                entryData.entry.lastAction = 'removed-assessor';
                entryData.patch = true;
              }
            } catch (removeError) {
              logger.error(`Error occured removing the assessment from the delegate ${delegateModel.email}: ${removeError.message}`, removeError);
            }
            break;
          }
          default: {
            entryData.message = 'Default action taken, none';
            break;
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
        // console.log(error);
        logger.error(error.message, error);
      }
      return entryData.entry;
    },
  },
};
