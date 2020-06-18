import moment from 'moment';
import co from 'co';
import lodash from 'lodash';
import Admin from '@reactory/server-core/application/admin';
import { queueSurveyEmails } from '@reactory/server-core/emails';
import {
  LeadershipBrand,
  Organization,
  User,
  Survey,
  Assessment,
  Notification,
  Organigram,
  Template,
} from '@reactory/server-core/models';
import { ObjectId } from 'mongodb';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import {
  launchSurveyForDelegate,
  sendSurveyEmail,
  EmailTypesForSurvey,
  sendSurveyClosed
} from '@reactory/server-core/application/admin/Survey';
import { TowerStone } from '../towerstone';
import { TowerStoneServicesMap } from "../services";
import AuthConfig from 'authentication';

const { findIndex, pullAt } = lodash;

function getMailService(survey: TowerStone.ISurvey, action: String = 'default')  {
  const emailServiceProvider: TowerStone.ITowerStoneEmailServiceProvider = TowerStoneServicesMap["towerstone.EmailService@1.0.0"].service as TowerStone.ITowerStoneEmailServiceProvider;
  const mailService = emailServiceProvider({ partner, user }, { action: action, survey: survey });
  return mailService;
}

function getSurveyService(): TowerStone.ITowerStoneSurveyService  {
  return TowerStoneServicesMap["towerstone.SurveyService@1.0.0"].service({ user, partner });
}

const getDemographicLookup = async (args) => {

  logger.debug(`GET DEMOGRAPHIC LOOKUP:: ${args}`);

  switch (args.lookupType) {

    case 'race': {
      return [
        { id: '1', name: 'Black' },
        { id: '2', name: 'White' },
        { id: '3', name: 'Asian' },
        { id: '4', name: 'Colored' },
      ];
    }
    case 'age': {
      return [
        { id: '1', name: '18 - 30' },
        { id: '2', name: '31 - 40' },
        { id: '3', name: '41 - 50' },
        { id: '4', name: '>50' },
      ];
    }
    case 'gender': {
      return [
        { id: '1', name: 'M' },
        { id: '2', name: 'F' },
        { id: '3', name: 'No specified' },
      ];
    }
    case 'position': {
      return [
        { id: '1', name: 'Exco (Group)' },
        { id: '2', name: 'Exco (Division/Brand)' },
        { id: '3', name: 'Senior Management' },
        { id: '4', name: 'Middle Management' },
        { id: '5', name: 'Junior Management' },
        { id: '6', name: 'Supervisory/Team Lead' },
        { id: '7', name: 'Employee' },
        { id: '8', name: 'Specialist' },
      ];
    }
    case 'region': {
      return [
        { id: '1', name: 'City' },
        { id: '2', name: 'Province' },
        { id: '3', name: 'Country' },
        { id: '4', name: 'Territory' },
      ];
    }
    case 'operational_group': {
      return [
        { id: '1', name: 'Group 1' },
        { id: '2', name: 'Group 2' },
      ];
    }
    case 'business_unit': {
      return [
        { id: '1', name: 'Sales' },
        { id: '2', name: 'Engineering' },
      ];
    }
    case 'team': {
      return [
        { id: '1', name: 'Back-end development' },
        { id: '2', name: 'Front-end development' },
        { id: '2', name: 'Technical support' },
        { id: '2', name: 'Architecture' },
      ];
    }

    default: {
      return [];
    }
  }

}

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
    id(survey: TowerStone.ISurvey) {
      if(survey && survey._id)
      return survey._id.toString();
    },
    leadershipBrand(survey: TowerStone.ISurvey) {
      if (survey.leadershipBrand) return LeadershipBrand.findById(survey.leadershipBrand);
      return null;
    },
    organization(survey: TowerStone.ISurvey) {
      if (survey.organization) return Organization.findById(survey.organization);
      return null;
    },
    startDate(survey: TowerStone.ISurvey) {
      if (survey.startDate) return moment(survey.startDate);
      return null;
    },
    endDate(survey: TowerStone.ISurvey ) {
      if (survey.endDate) return moment(survey.endDate);
      return null;
    },
    timeline(survey: TowerStone.ISurvey) {
      return lodash.reverse(survey.timeline);
    },
    calendar(survey: TowerStone.ISurvey) {
      return survey.calendar;
    },
    delegates(survey: TowerStone.ISurvey) {
      return survey.delegates;
    },
    assessments(survey: TowerStone.ISurvey) {
      return Assessment.find({ survey: new ObjectId(survey.id) }).populate('assessor').then();
    },
    statistics(survey: TowerStone.ISurvey) {
      const statistics = {
        launched: 0,
        peersConfirmed: 0,
        complete: 0,
        total: survey.delegates.length,
      };

      statistics.launched = lodash.countBy(survey.delegates, 'launched')['true'];

      return statistics;
    },
    templates(survey: TowerStone.ISurvey){
      logger.debug('Survey.templates(survey: TowerSTone.ISurvey)', { survey });
      const mailService = getMailService(survey, 'Survey.templates()');
      return mailService.templates(survey);
    }
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
    async getDemographicLookup(obj, args) {
      return getDemographicLookup(args);
    }
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
    async addDelegateToSurvey(surveyId, delegateId) {
      const delegate = await User.findById(delegateId).then();
      const survey = await Survey.findById(surveyId).then();

      logger.info(`Adding delegate: ${delegate.email} to Survey: [${survey.title}]`);

      if (survey && delegate) {
        if (lodash.findIndex(survey.delegates, (entry) => { return delegate._id.equals(ObjectId(entry.delegate)); }) === -1) {
          // force array
          if (lodash.isArray(survey.delegates) === false) survey.delegates = [];

          survey.delegates.push({
            delegate: delegate._id,
            notifications: [],
            assessments: [],
            launched: false,
            complete: false,
            removed: false,
          });

          await survey.save().then();
        }

        return {
          id: survey._id,
          user: delegate._id,
        };
      }

      throw new ApiError('Survey not found or Delegate Not Found');
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

      const { user, partner } = global;

      const mailService = getMailService(survey, 'Survey.templates()');

      const surveyModel = await Survey.findById(survey).populate('delegates.delegate', 'delegates.assessments').then();

      if (!surveyModel) throw new RecordNotFoundError('Could not find survey item', 'Survey');

      const delegateModel = await User.findById(delegate).then();

      if (!delegateModel) throw new RecordNotFoundError('Could not find the user item', 'User');

      // make sure the delegate has minimum permissions for this flow
      if (delegateModel.hasRole(partner._id, 'USER', surveyModel.organization) === false) {
        delegateModel.addRole(partner._id, 'USER', surveyModel.organization);
      }


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
        logger.info(`Survey Model has ${(surveyModel as TowerStone.ISurveyDocument).delegates.length} delegates, finding ${entryId}`);
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
            status: 'new',
            actions: [{
              action: 'added',
              when: moment().valueOf(),
              result: `Added ${delegateModel.firstName} ${delegateModel.lastName} to survey ${surveyModel.title} as ${surveyModel.surveyType === '180'? (inputData.team || surveyModel.delegateTeamName) + ' team member' : 'delegate'}`,
              who: user._id,
            }],
            updatedAt: moment().valueOf(),
            createdAt: moment().valueOf(),
          };

          if((surveyModel as TowerStone.ISurveyDocument).surveyType === '180') {
            if(typeof inputData.userAddType === 'string') {
              if(inputData.userAddType === 'delegate') {
                entryData.entry.team = (surveyModel as TowerStone.ISurveyDocument).delegateTeamName;
                entryData.entry.status = 'new-delegate'
              }
              if(inputData.userAddType === 'assessor') {
                entryData.entry.team = (surveyModel as TowerStone.ISurveyDocument).assessorTeamName;
                entryData.entry.status = 'new-assessor'
              }
            }
          }

          (surveyModel as TowerStone.ISurveyDocument).delegates.push(entryData.entry);
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
        } else {
          // not a new entry, find it!
          entryData.entry = (surveyModel as TowerStone.ISurveyDocument).delegates.id(entryId);
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
              if((surveyModel as TowerStone.ISurveyDocument).surveyType === '180') {

                const relaunch = inputData.relaunch === true;
                const launchResult = await launchSurveyForDelegate(surveyModel as TowerStone.ISurveyDocument, entryData.entry, organigramModel, relaunch);

                entryData.entry.message = launchResult.message; // `Launched survey for delegate ${userModel.firstName} ${userModel.lastName}`;
                if (launchResult.assessments) {
                  entryData.entry.assessments = launchResult.assessments.map(a => a._id);
                }

                const isAssessorTeam = entryData.entry.team === (surveyModel as TowerStone.ISurveyDocument).assessorTeamName;
                if(launchResult.success === true) {
                  logger.debug(`:::Launch For 180 LaunchResult`, launchResult);
                  let assessment = launchResult.assessments[0]
                  const mailSendResult = await mailService.send((surveyModel as TowerStone.ISurveyDocument), 'launch', isAssessorTeam ? 'assessor' : 'delegate', [entryData.entry.delegate],
                  {
                    user: entryData.entry.delegate as Reactory.IUserDocument,
                    assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(entryData.entry.delegate, { exp: moment((surveyModel as TowerStone.ISurveyDocument).endDate).valueOf() }))}`,
                  });
                  logger.debug('Sent mails for 180 launch', {mailSendResult})
                }

                entryData.patch = true;
                entryData.entry.status = launchResult.success ? `launched-${isAssessorTeam === true ? 'assessor' : 'delegate' }` : entryData.entry.status;
                entryData.entry.lastAction = launchResult.success ? `launched-${isAssessorTeam === true ? 'assessor' : 'delegate' }` : 'launch-fail';
                entryData.entry.launched = launchResult.success === true;
                entryData.entry.actions.push({
                  action: launchResult.success ? 'launched' : 'launch-fail',
                  when: new Date(),
                  result: launchResult.message,
                  who: user._id,
                });

                await (surveyModel as TowerStone.ISurveyDocument).addTimelineEntry('Launched 180', `${user.firstName} launched 180 for ${entryData.entry.delegate.firstName}`, user, true).then();

              } else {

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
              }
              break;
            }
            case 'send-reminder': {

              if((surveyModel as TowerStone.ISurveyDocument).surveyType === '180') {
                const isAssessorTeam = entryData.entry.team === (surveyModel as TowerStone.ISurveyDocument).assessorTeamName;
                let assessment : any = null;
                if(lodash.isArray(entryData.entry.assessments) === true && entryData.entry.assessments.length === 1) {
                  assessment = entryData.entry.assessments[0];
                }

                if(assessment !== null) {
                  const mailSendResult = await mailService.send((surveyModel as TowerStone.ISurveyDocument), 'reminder', isAssessorTeam ? 'assessor' : 'delegate', [entryData.entry.delegate], {
                    user: entryData.entry.delegate as Reactory.IUserDocument,
                    assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(entryData.entry.delegate, { exp: moment((surveyModel as TowerStone.ISurveyDocument).endDate).valueOf() }))}`,
                  });

                  entryData.entry.message = mailSendResult.sent === 1 ? 'Sent reminder to delegate for 180' : 'Could not send reminder';
                  entryData.patch = true;
                  entryData.entry.lastAction = 'reminder';

                  entryData.entry.actions.push({
                    action: 'reminder',
                    when: new Date(),
                    result: mailSendResult.sent === 1 ? 'Sent reminder to delegate for 180' : 'Could not send reminder',
                    who: user._id,
                  });
                  logger.debug('Sent mails for 180 launch', {mailSendResult})
                }
              } else {
                const reminderResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyReminder);
                entryData.entry.message = reminderResult.message;
                entryData.patch = true;
                entryData.entry.lastAction = 'reminder';

                entryData.entry.actions.push({
                  action: 'reminder',
                  when: new Date(),
                  result: reminderResult.message,
                  who: user._id,
                });

              }


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

          return entryData.entry;
        }
      } catch (error) {
        // console.log(error);
        logger.error(error.message, error);
      }
    },
    async TowerStoneSurveySetTemplates(parent: any, params: TowerStone.ITowerStoneSetTemplatesParameters ) {
      const { id, templates } = params;
      const survey = await getSurveyService().get(id).then();
      logger.debug(`Patching Templates For Survey ${survey.title}`)
      const mailService = getMailService(survey, 'TowerStoneSurveySetTemplates');
      mailService.patchTemplates(survey, templates);
    },
    async TowerStoneLeadershipBrandCopy(parent: any, params: TowerStone.ICopyLeadershipBrandParams) {

      const { input } = params;
      const { targetOrganizationId, sourceLeadershipBrandId, targetTitle } = input;

      logger.debug(`Cloning Leadership brand ${sourceLeadershipBrandId}`, { sourceLeadershipBrandId })

      const leadershipbrand = await LeadershipBrand.findById(sourceLeadershipBrandId).then()
      const organization = await Organization.findById(targetOrganizationId).then();

      try {

        if(leadershipbrand === null || leadershipbrand === undefined) throw new ApiError(`No Leadership Brand with the ID ${sourceLeadershipBrandId} available`);
        if(organization === null || organization === undefined) throw new ApiError(`No organization with the ID ${targetOrganizationId} available`);

        const _clone = new LeadershipBrand();

        _clone.organization = organization;
        _clone.title = leadershipbrand.title;
        _clone.description = leadershipbrand.description;
        _clone.scale = leadershipbrand.scale;

        leadershipbrand.qualities.forEach((quality, index) => {
            _clone.qualities = [];
            const _quality = {
              title: quality.title,
              description: quality.description,
              ordinal: quality.ordinal || index,
              behaviours: [],
            };
            //
            quality.behaviours.forEach((behaviour, index) => {
              const _behaviour = {
                title: behaviour.title,
                description: behaviour.description,
                ordinal: behaviour.ordinal || index
              };
              _quality.behaviours.push(_behaviour);
            });
            //
            _clone.qualities.push(_quality);
        });

        _clone.createdAt = new Date();
        _clone.updatedAt = new Date();

        await _clone.save().then();

        return {
          success: true,
          message: 'Leadership brand copied',
          leadershipBrand: _clone,
        };

      } catch (error) {
        logger.error(`An error occured while cloning the leadership brand ==> ${error.message}`, error);
        throw error;
      }
    }
  },
};



