import { schema } from './../../lasec/forms/CRM/Organization/Lookup/index';
import moment from 'moment';
import co from 'co';
import lodash, { endsWith } from 'lodash';
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
  Region,
  OperationalGroup,
  BusinessUnit,
  Team
} from '@reactory/server-core/models';
import { ObjectId, ObjectID } from 'mongodb';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import {
  launchSurveyForDelegate,
  launchForSingleAssessor,
  sendSurveyEmail,
  EmailTypesForSurvey,
  sendSurveyClosed,
  sendSingleReminder,
  sendSingleSurveyLaunchEmail
} from '@reactory/server-core/application/admin/Survey';
import { TowerStone } from '../towerstone';
import { TowerStoneServicesMap } from "../services";
import AuthConfig from '@reactory/server-core/authentication';
import { Reactory } from '@reactory/server-core/types/reactory';

import { SURVEY_EVENTS_TO_TRACK } from '@reactory/server-core/models/index';

const { findIndex, pullAt } = lodash;

interface SurveyDelegateActionParams {
  entryId: string,
  survey: string,
  delegate: string,
  action: string,
  inputData: any
};

// export const EVENTS_TO_TRACK = {
//   DELEGATE_ADDED: 'DELEGATE ADDED',
//   LAUNCH_INVITE: 'LAUNCH INVITE',
//   LAUNCHED: 'LAUNCHED',
//   REMINDER: 'REMINDER SENT',
//   CLOSED: 'CLOSED',
//   REMOVED: 'DELEGATE REMOVED',
//   ASSESSOR_REMOVED: 'ASSESSOR REMOVED',
//   ENABLED: 'DELEGATE ENABLED',

// }

function getMailService(survey: TowerStone.ISurvey, action: String = 'default') {
  const emailServiceProvider: TowerStone.ITowerStoneEmailServiceProvider = TowerStoneServicesMap["towerstone.EmailService@1.0.0"].service as TowerStone.ITowerStoneEmailServiceProvider;
  const mailService = emailServiceProvider({ partner, user }, { action: action, survey: survey });
  return mailService;
}

function getSurveyService(): TowerStone.ITowerStoneSurveyService {
  return TowerStoneServicesMap["towerstone.SurveyService@1.0.0"].service({ user, partner });
}

const TowerStoneGetDemographicLookup = async (args) => {

  logger.debug(`GET DEMOGRAPHIC LOOKUP :: ${JSON.stringify(args)}`, args);

  switch (args.lookupType) {

    case 'race': {
      return [
        { id: 'black', name: 'Black', },
        { id: 'white', name: 'White', },
        { id: 'asian', name: 'Asian', },
        { id: 'colored', name: 'Colored', },
      ];
    }
    case 'age': {
      return [
        { id: '18', name: '18 - 30' },
        { id: '31', name: '31 - 40' },
        { id: '41', name: '41 - 50' },
        { id: '50', name: '>50' },
      ];
    }
    case 'gender': {
      return [
        { id: 'm', name: 'M' },
        { id: 'f', name: 'F' },
        { id: 'ns', name: 'No specified' },
      ];
    }
    case 'pronoun': {
      return [
        { id: 'he', name: 'he/his' },
        { id: 'her', name: 'her/she' },
        { id: 'they', name: 'they/them' },
      ];
    }
    case 'position': {
      return [
        { id: 'exco_g', name: 'Exco (Group)' },
        { id: 'exco_d', name: 'Exco (Division/Brand)' },
        { id: 'senm', name: 'Senior Management' },
        { id: 'midm', name: 'Middle Management' },
        { id: 'junm', name: 'Junior Management' },
        { id: 'sup', name: 'Supervisory/Team Lead' },
        { id: 'emp', name: 'Employee' },
        { id: 'spec', name: 'Specialist' },
      ];
    }
    case 'region': {
      const regions = await Region.GetRegions();
      return regions.map(reg => {
        return {
          id: reg._id,
          name: reg.title
        }
      });
    }
    case 'operational_group': {
      const regions = await OperationalGroup.GetOperationalGroups();
      return regions.map(opg => {
        return {
          id: opg._id,
          name: opg.title
        }
      });
    }
    case 'business_unit': {
      const regions = await BusinessUnit.GetBusinessUnits();
      return regions.map(bu => {
        return {
          id: bu._id,
          name: bu.name
        }
      });
    }
    case 'team': {
      const regions = await Team.GetAllTeams();
      return regions.map(team => {
        return {
          id: team._id,
          name: team.title
        }
      });

    }

    default: {
      return [];
    }
  }

}

const GetOrganisationLookupData = async (args) => {
  return {
    regions: [{ id: '123', name: 'region 1' }],
    operationalGroups: [{ id: '123', name: 'op group 1' }],
    businessUnit: [{ id: '123', name: 'business unit 1' }],
    team: [{ id: '123', name: 'team 1' }],
  }
}

const SetOrganisationLookupData = async (args) => {
  return {
    success: true,
    message: 'Lookup data successfully updated.'
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
      if (survey && survey._id)
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
    endDate(survey: TowerStone.ISurvey) {
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
    templates(survey: TowerStone.ISurvey) {
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
    async TowerStoneGetDemographicLookup(obj, args) {
      return TowerStoneGetDemographicLookup(args);
    },
    async GetOrganisationLookupData(obj, args) {
      return GetOrganisationLookupData(args);
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
    async removeDelegateFromSurvey(obj, { surveyId, delegateId }) {
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
    async surveyDelegateAction(obj, params: SurveyDelegateActionParams) {

      logger.debug(`TAKING DELGATE ACTION:: ${JSON.stringify(params)}`);

      const {
        entryId, survey, delegate, action, inputData,
      } = params;


      const { user, partner } = global;
      const mailService = getMailService(survey, 'Survey.templates()');
      const surveyModel: TowerStone.ISurveyDocument = await Survey.findById(survey)
        .populate('delegates.delegate')
        .populate('delegates.assessments')
        .populate('organization')
        .then();

      if (!surveyModel) throw new RecordNotFoundError('Could not find survey item', 'Survey');

      const delegateModel: Reactory.IUserDocument = await User.findById(delegate).then();
      if (!delegateModel) throw new RecordNotFoundError('Could not find the user item', 'User');

      // make sure the delegate has minimum permissions for this flow
      if (delegateModel.hasRole(partner._id, 'USER', `${surveyModel.organization._id}`) === false) {
        delegateModel.addRole(partner._id, 'USER', `${surveyModel.organization._id}`);
      }

      logger.debug(`EXECUTING ${action} FOR ${delegateModel.firstName} ${delegateModel.lastName} AS PART OF ${surveyModel.title}`);

      const organigramModel: any = await Organigram.findOne({
        user: new ObjectId(delegateModel._id),
        organization: new ObjectId(surveyModel.organization._id),
      }).then();

      logger.debug(`${organigramModel ? `${delegateModel.firstName} ${delegateModel.lastName} has no Organigram for this organization` : `${delegateModel.firstName} ${delegateModel.lastName} has Organigram for this organization`}`);

      const entryData: TowerStone.IDelegateEntryDataStruct = {
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
            status: 'new',
            actions: [{
              action: 'added',
              when: moment().valueOf(),
              result: `Added ${delegateModel.firstName} ${delegateModel.lastName} to survey ${surveyModel.title} as ${surveyModel.surveyType === '180' ? (inputData.team || surveyModel.delegateTeamName) + ' team member' : 'delegate'}`,
              who: user._id,
            }],
            updatedAt: moment().valueOf(),
            createdAt: moment().valueOf(),
          };

          if ((surveyModel as TowerStone.ISurveyDocument).surveyType.endsWith('180') === true) {
            if (typeof inputData.userAddType === 'string') {
              if (inputData.userAddType === 'delegate') {
                entryData.entry.team = (surveyModel as TowerStone.ISurveyDocument).delegateTeamName;
                entryData.entry.status = 'new-delegate'
              }
              if (inputData.userAddType === 'assessor') {
                entryData.entry.team = (surveyModel as TowerStone.ISurveyDocument).assessorTeamName;
                entryData.entry.status = 'new-assessor'
              }
            }
          }

          try {
            (surveyModel as TowerStone.ISurveyDocument).delegates.push(entryData.entry);

            const saveResponse = await surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.DELEGATE_ADDED, `${user.firstName} added ${delegateModel.firstName} ${delegateModel.lastName} to Survey`, user.id, true);
            entryData.entry = saveResponse.delegates[saveResponse.delegates.length - 1]; // SET TO NEWLY CREATED DELEGATE ENTRYrs
          } catch (e) {
            logger.error(e.message, e);
          }

          entryData.patch = false;
          return entryData.entry;

        } else {

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
            \tAssessments: ${entryData.entry.assessments.length}`);

          switch (action) {

            /**
             * SEND INVITATION FLOW
             */
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

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.LAUNCH_INVITE, `${user.firstName} sent an invite to delegate ${delegateModel.firstName} ${delegateModel.lastName}.`, user.id, true);
              entryData.patch = false;
              break;
            }

            /**
             * SEND LAUNCH INSTRUCTIONS AND CREATE ASSESSMENTS
             */
            case 'launch': {
              if ((surveyModel as TowerStone.ISurveyDocument).surveyType.endsWith('180')) {

                const relaunch = inputData.relaunch === true;
                const launchResult = await launchSurveyForDelegate(surveyModel as TowerStone.ISurveyDocument, entryData.entry, organigramModel, relaunch);

                entryData.entry.message = launchResult.message; // `Launched survey for delegate ${userModel.firstName} ${userModel.lastName}`;
                if (launchResult.assessments) {
                  entryData.entry.assessments = launchResult.assessments.map(a => a._id);
                }

                const isAssessorTeam = entryData.entry.team === (surveyModel as TowerStone.ISurveyDocument).assessorTeamName;
                if (launchResult.success === true) {
                  logger.debug(`:::Launch For 180 LaunchResult`, launchResult);
                  let assessment = launchResult.assessments[0]
                  const mailSendResult = await mailService.send((surveyModel as TowerStone.ISurveyDocument), 'launch', isAssessorTeam ? 'assessor' : 'delegate', [entryData.entry.delegate],
                    {
                      user: entryData.entry.delegate as Reactory.IUserDocument,
                      assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(entryData.entry.delegate, { exp: moment((surveyModel as TowerStone.ISurveyDocument).endDate).valueOf() }))}`,
                    });
                  logger.debug('Sent mails for 180 launch', { mailSendResult })
                }

                entryData.patch = true;
                entryData.entry.status = launchResult.success ? `launched-${isAssessorTeam === true ? 'assessor' : 'delegate'}` : entryData.entry.status;
                entryData.entry.lastAction = launchResult.success ? `launched-${isAssessorTeam === true ? 'assessor' : 'delegate'}` : 'launch-fail';
                entryData.entry.launched = launchResult.success === true;
                entryData.entry.actions.push({
                  action: launchResult.success ? 'launched' : 'launch-fail',
                  when: new Date(),
                  result: launchResult.message,
                  who: user._id,
                });

                await surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.LAUNCHED, `${user.firstName} launched 180 for ${entryData.entry.delegate.firstName} ${entryData.entry.delegate.lastName}`, user, true).then();

              } else {
                let requires_peersConfirmed = true;
                let organigramInvalid = false;

                if (surveyModel.surveyType === 'culture') {
                  requires_peersConfirmed = false;
                } else {
                  organigramInvalid = lodash.isNil(organigramModel) === true || lodash.isNil(organigramModel.confirmedAt) === true
                }


                if (requires_peersConfirmed === true && organigramInvalid === true) {
                  entryData.entry.message = `Please set user organigram / peers. ${delegateModel.firstName} ${delegateModel.lastName}`;
                  entryData.patch = true;
                  entryData.entry.status = 'invite-sent';
                  entryData.entry.lastAction = 'launch';

                  entryData.entry.actions.push({
                    action: 'launch',
                    when: new Date(),
                    result: entryData.entry.message,
                    who: user._id,
                  });
                } else {
                  const relaunch = inputData.relaunch === true;
                  const launchResult = await launchSurveyForDelegate(surveyModel, entryData.entry, organigramModel, relaunch).then();
                  entryData.entry.message = launchResult.message; // `Launched survey for delegate ${userModel.firstName} ${userModel.lastName}`;
                  if (launchResult.assessments && relaunch === false) {
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
                }
              }

              await surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.LAUNCHED, `${user.firstName} launched for ${entryData.entry.delegate.firstName} ${entryData.entry.delegate.lastName}`, user, true).then();

              break;
            }

            case 'launch-single-assessor': {

              try {

                const launchResult = await launchForSingleAssessor(surveyModel, entryData.entry, organigramModel, inputData.peer).then();

                if (launchResult.assessmentId) {
                  const newAssessment = await Assessment.findById(launchResult.assessmentId).then();
                  entryData.entry.assessments.push(newAssessment);
                }

                entryData.patch = true;
                entryData.entry.message = launchResult.success ? launchResult.message : entryData.entry.message;
                entryData.entry.status = entryData.entry.status;
                entryData.entry.lastAction = entryData.entry.lastAction;
                entryData.entry.launched = entryData.entry.launched;
                entryData.entry.peers = {
                  id: organigramModel._id,
                  organization: organigramModel.organization,
                  peers: organigramModel.peers
                };

                entryData.entry.actions.push({
                  action: entryData.entry.status,
                  when: new Date(),
                  result: launchResult.message,
                  who: user._id,
                });

                // entryData.patch = false;
                await surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.PEER_LAUNCHED, `${user.firstName} launched for ${inputData.peer.firstName} ${inputData.peer.lastName}`, user, false);

              } catch (launchError) {
                logger.error(`Something went wrong here`, { error: launchError })
              }


              break;
            }

            /**
             * SEND REMINDER FOR ENTRY
             */
            case 'send-reminder': {

              if ((surveyModel as TowerStone.ISurveyDocument).surveyType.endsWith('180') === true) {
                const isAssessorTeam = entryData.entry.team === (surveyModel as TowerStone.ISurveyDocument).assessorTeamName;
                let assessment: any = null;
                if (lodash.isArray(entryData.entry.assessments) === true && entryData.entry.assessments.length === 1) {
                  assessment = entryData.entry.assessments[0];
                }

                if (assessment !== null) {
                  const mailSendResult = await mailService.send((surveyModel as TowerStone.ISurveyDocument), 'reminder', isAssessorTeam ? 'assessor' : 'delegate', [entryData.entry.delegate], {
                    user: entryData.entry.delegate as Reactory.IUserDocument,
                    delegate: entryData.entry.delegate,
                    assessment: assessment,
                    survey: surveyModel,
                    assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(entryData.entry.delegate, { exp: moment((surveyModel as TowerStone.ISurveyDocument).endDate).valueOf() }))}`,
                    link: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(entryData.entry.delegate, { exp: moment((surveyModel as TowerStone.ISurveyDocument).endDate).valueOf() }))}`,
                  });

                  entryData.entry.message = mailSendResult.sent === 1 ? 'Sent reminder to delegate for 180' : 'Could not send reminder';
                  entryData.entry.lastAction = 'reminder';

                  entryData.entry.actions.push({
                    action: 'reminder',
                    when: new Date(),
                    result: mailSendResult.sent === 1 ? 'Sent reminder to delegate for 180' : 'Could not send reminder',
                    who: user._id,
                  });

                  surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.REMINDER, `Survey reminder sent to ${delegateModel.firstName} ${delegateModel.lastName} for 180 @ ${moment().format('DD MMM YYYY HH:mm')}.`, user.id, false);

                  entryData.patch = true;

                  logger.debug('Sent mails for 180 launch', { mailSendResult })
                }
              } else {
                const reminderResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyReminder);
                entryData.entry.message = reminderResult.message;
                entryData.entry.lastAction = 'reminder';

                entryData.entry.actions.push({
                  action: 'reminder',
                  when: new Date(),
                  result: reminderResult.message,
                  who: user._id,
                });

                surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.REMINDER, `Survey reminder sent to ${delegateModel.firstName} ${delegateModel.lastName} @ ${moment().format('DD MMM YYYY HH:mm')}.`, user.id, false);
                entryData.patch = true;
              }

              break;
            }

            /**
             * Send Closing Email Instruction
             */
            case 'send-closed': {
              const closeResult = await sendSurveyEmail(surveyModel, entryData.entry, organigramModel, EmailTypesForSurvey.SurveyClose);
              entryData.entry.message = closeResult.message;
              entryData.entry.status = 'closed';
              entryData.entry.lastAction = 'closed';
              entryData.complete = true;
              entryData.entry.actions.push({
                action: 'closed',
                when: new Date(),
                result: closeResult.message,
                who: user._id,
              });

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.CLOSED, closeResult.message, user.id, false);
              entryData.patch = true;
              break;
            }

            /**
             * Remove a delegate from the survey
             */
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

                surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.REMOVED, `${user.firstName} removed delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`, user.id, true);
                entryData.patch = false;

              } else {
                surveyModel.delegates[entryData.entryIdx].remove();

                entryData.entry.status = 'deleted';
                entryData.entry.actions.push({
                  action: 'deleted',
                  when: new Date(),
                  result: 'Deleted from Survey',
                  who: user._id,
                });

                surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.REMOVED, `${user.firstName} deleted delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`, user.id, true);
                entryData.patch = false;
              }
              break;
            }

            case 'pause-delegate': {

              entryData.entry.message = `Delegate ${delegateModel.firstName} ${delegateModel.lastName} paused for survey.`;
              entryData.entry.removed = false;
              entryData.entry.status = 'paused';
              entryData.entry.lastAction = 'paused';
              entryData.entry.actions.push({
                action: 'paused',
                when: new Date(),
                result: entryData.entry.message,
                who: user._id,
              });

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.PAUSED, `${user.firstName} ${user.lastName} paused delegate ${delegateModel.firstName} ${delegateModel.lastName} for Survey`, user.id, true);
              entryData.patch = false;
              break;

            }

            case 'restart-delegate': {

              entryData.entry.message = `Delegate ${delegateModel.firstName} ${delegateModel.lastName} restarted for survey.`;
              entryData.entry.removed = false;
              entryData.entry.status = 'launched';
              entryData.entry.lastAction = 'launched';
              entryData.entry.actions.push({
                action: 'launched',
                when: new Date(),
                result: entryData.entry.message,
                who: user._id,
              });

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.RESTARTED, `${user.firstName} ${user.lastName} restarted delegate ${delegateModel.firstName} ${delegateModel.lastName} for Survey`, user.id, false);
              entryData.patch = true;
              break;

            }

            /**
             * re-enable / add the delegate back to the survey
             */
            case 'enable': {
              entryData.entry.message = `Re-enabled delegate ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
              entryData.entry.removed = false;
              entryData.entry.status = 'new';
              entryData.entry.lastAction = 're-added';

              entryData.entry.actions.push({
                action: 'removed',
                when: new Date(),
                result: entryData.entry.message,
                who: user._id,
              });

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.ENABLED, `${user.firstName} enabled delegate ${delegateModel.firstName} ${delegateModel.lastName} on Survey`, user.id, true);
              entryData.patch = true;
              break;
            }

            /**
             * Remove Assessor
             */
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
                    const sourceId = entryData.entry.assessments[aidx]._id;
                    if (ObjectId(sourceId).equals(ObjectId(assessmentId))) {
                      pullAtIndex = aidx;
                    }
                  }

                  if (pullAtIndex > -1) {
                    pullAt(entryData.entry.assessments, [pullAtIndex]);
                  }

                  entryData.entry.message = `Removed ${assessment.assessor.firstName} ${assessment.assessor.lastName} for ${delegateModel.firstName} ${delegateModel.lastName} from Survey`;
                  entryData.entry.lastAction = 'removed-assessor';

                  surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.ASSESSOR_REMOVED, `Removed ${assessment.assessor.firstName} ${assessment.assessor.lastName} for ${delegateModel.firstName} ${delegateModel.lastName} from Survey.`, user.id, false);
                  entryData.patch = true;
                }
              } catch (removeError) {
                logger.error(`Error occured removing the assessment from the delegate ${delegateModel.email}: ${removeError.message}`, removeError);
              }
              break;
            }

            case 'send-single-reminder': {
              const { assessment } = inputData;

              const reminderResult = await sendSingleReminder(assessment, entryData.entry, surveyModel);
              entryData.entry.message = reminderResult.message;
              entryData.entry.lastAction = 'reminder';

              entryData.entry.actions.push({
                action: 'reminder',
                when: new Date(),
                result: reminderResult.message,
                who: user._id,
              });

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.REMINDER, `Survey reminder sent to ${assessment.assessor.firstName} ${assessment.assessor.lastName} @ ${moment().format('DD MMM YYYY HH:mm')}.`, user.id, false);
              entryData.patch = true;

              break;
            }

            case 'send-single-launch': {
              const { assessment } = inputData;

              const reminderResult = await sendSingleSurveyLaunchEmail(surveyModel, entryData.entry, assessment);
              entryData.entry.message = reminderResult.message;
              entryData.entry.lastAction = 'launch';

              entryData.entry.actions.push({
                action: 'launch',
                when: new Date(),
                result: reminderResult.message,
                who: user._id,
              });

              surveyModel.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.LAUNCH_INVITE, `Launch sent to ${assessment.assessor.firstName} ${assessment.assessor.lastName} @ ${moment().format('DD MMM YYYY HH:mm')}.`, user.id, false);
              entryData.patch = true;

              break;
            }

            // catch all
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
            surveyModel.save().then();
          }

          logger.debug(`ENTRY DATA: ${JSON.stringify(entryData.entry.peers)}`)

          return entryData.entry;
        }
      } catch (error) {
        logger.error(`DELEGATE ACTIONS ERROR:: ${error.message, error}`,);
        throw new ApiError('Delegate action error!', error);
      }
    },
    async TowerStoneSurveySetTemplates(parent: any, params: TowerStone.ITowerStoneSetTemplatesParameters) {
      const { id, templates } = params;
      const survey = await getSurveyService().get(id).then();
      logger.debug(`Patching Templates For Survey ${survey.title}`)
      const mailService = getMailService(survey, 'TowerStoneSurveySetTemplates');
      return await mailService.patchTemplates(survey, templates).then();
    },
    async TowerStoneLeadershipBrandCopy(parent: any, params: TowerStone.ICopyLeadershipBrandParams) {

      const { input } = params;
      const { targetOrganizationId, sourceLeadershipBrandId, targetTitle } = input;

      logger.debug(`Cloning Leadership brand ${sourceLeadershipBrandId}`, { sourceLeadershipBrandId })

      const leadershipbrand = await LeadershipBrand.findById(sourceLeadershipBrandId).then()
      const organization = await Organization.findById(targetOrganizationId).then();

      try {

        if (leadershipbrand === null || leadershipbrand === undefined) throw new ApiError(`No Leadership Brand with the ID ${sourceLeadershipBrandId} available`);
        if (organization === null || organization === undefined) throw new ApiError(`No organization with the ID ${targetOrganizationId} available`);

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
    },

    async SetOrganisationLookupData(obj, args) {
      return SetOrganisationLookupData(args);
    },
    async deleteSurvey(obj, { id }) {
      try {
        logger.info('DELETING SURVEY', { id });
        const response = await Survey.findByIdAndUpdate(ObjectId(id), { status: 'deleted' }).exec();
        logger.info('DELETE SURVEY RESPONSE:: ', { response });
        return { id: response._id, updated: true }
      } catch (error) {
        throw new ApiError(`Error deleting this survey. ${error}`)
      }
    }
  }

};

