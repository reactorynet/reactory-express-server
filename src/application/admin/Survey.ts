/* eslint-disable import/no-named-as-default-member */
import { ObjectId } from 'mongodb';
import { Survey, LeadershipBrand, User, Assessment, Organigram } from '../../models/index';
import { isNull, isArray } from 'util';
import iz from '../../utils/validators';
import lodash from 'lodash';
import moment from 'moment';
import logger from '../../logging';
import emails from '../../emails';
import Organization from './Organization';
import { TowerStone } from 'modules/towerstone/towerstone';


/**
   * Launch options
      'options.defaultMinimumPeers': 'defaultMinimumPeers',
      'options.maxReminders': 'maxReminders',
      'options.maximumDirectReport': 'maximumDirectReport',
      'options.maximumPeers': 'maximumPeers',
      'options.minimumDirectReports': 'minimumDirectReports',
      'options.minimumPeers': 'minimumPeers',
      'options.mustHaveSupervisor': 'mustHaveSupervisor',
      'options.numberOfReminders': 'numberOfReminders',
      'options.spreadReminders': 'spreadReminders',
   *
   */
const defaultLaunchOptions = {
  defaultMinimumPeers: 1,
  maximumDirectReport: 3,
  maximumPeers: 10, // may not be used
  minimumDirectReports: 0,
  minimumPeers: 1,
  mustHaveSupervisor: false,
  numberOfReminders: 2,
  maxReminders: 3,
  spreadReminders: 'even', // halfway //custom
};


export const EmailTypesForSurvey = {
  ParticipationInvite: 'survey-participation-invite',
  SurveyLaunch: 'survey-launch',
  SurveyReminder: 'survey-reminder',
  SurveyClose: 'survey-close',
  SurveyReport: 'survey-report',
};

const getSurveysForOrganization = (organization) => {
  return new Promise((resolve, reject) => {
    if (!organization) reject(new Error('Organization is null'));
    Survey.find({ organization }).then((surveys) => {
      // console.log(`Found ${surveys.length} surveys for organization`);
      resolve(surveys);
    }).catch((findErr) => {
      reject(findErr);
    });
  });
};

const getSurveys = () => Survey.find();

const createSurvey = (survey) => {
  return new Survey(survey).save();
};


const createLeadershipBrand = (brandInput) => {
  const now = new Date().valueOf();
  const brand = { ...brandInput, createAt: now, updatedAt: now };

  if (brandInput.legacyId) {
    return LeadershipBrand.findOneAndUpdate({ legacyId: brandInput.legacyId }, brand, { upsert: true });
  }

  if (brandInput._id || brandInput.id) {
    return LeadershipBrand.findOneAndUpdate({ _id: brandInput._id || brandInput.id }, brand, { upsert: true });
  }

  return new LeadershipBrand(brand).save();
};

const updateLeadershipBrand = (brandInput) => {
  return LeadershipBrand.findOneAndUpdate({ _id: ObjectId(brandInput.id) }, { ...brandInput });
};

const getLeadershipBrand = (id) => {
  return LeadershipBrand.findById(id);
};


/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 */
export const sendParticipationInivitationForDelegate = async (survey, delegateEntry, organigram) => {
  logger.info(`Sending Invitation Survey: ${survey.title} to ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.email}`);
  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };

  try {
    const options = { ...defaultLaunchOptions, ...survey.options };
    const delegate = delegateEntry.delegate;
    let organization = survey.organization;
    if (lodash.isString(organization)) {
      organization = await Organization.findById(organization).then();
    }

    const emailResult = await emails.surveyEmails.delegateInvite(delegate, survey).then();
    logger.info('Email Generated', emailResult);
    return result(`Sent invitation to ${delegate.firstName} ${delegate.lastName} for ${survey.title}`, true);
  } catch (e) {
    return result(`Error during invite: ${e.message}`);
  }
};

/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 */
export const sendSurveyLaunchedForDelegate = async (survey, delegateEntry, organigram, propertyBag = { assessments: [] }) => {
  logger.info('Sending launch emails for delegate', { assessmentCount: propertyBag.assessments.length });
  let { delegate } = delegateEntry;

  if (lodash.isString(delegate)) {
    delegate = await User.findById(delegate).then();
  }

  let organization = null;
  if (ObjectId.isValid(survey.organization)) {
    organization = await Organization.findById(survey.organization).then();
  } else if (lodash.isObject(survey.organization)) organization = survey.organization;

  const emailPromises = [];
  if (lodash.isArray(propertyBag.assessments) === true) {
    propertyBag.assessments.forEach((assessment) => {
      const { assessor } = assessment;
      emailPromises.push(emails.surveyEmails.launchForDelegate(assessor, delegate, survey, assessment, organization));
    });
  }

  logger.info(`Sending Launched Emails Survey: ${survey.title} ${delegate.firstName} ${delegate.lastName}`);

  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };

  try {
    await Promise.all(emailPromises).then();
    return result(`Sent launch emails and instructions to ${delegate.firstName} ${delegate.lastName} for ${survey.title}`, true);
  } catch (e) {
    return result(e.message);
  }
};

/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 */
export const sendSurveyRemindersForDelegate = async (survey, delegateEntry, organigram) => {
  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };

  if (lodash.isNil(survey) === true) return result('Cannot have a nill survey element');
  if (lodash.isNil(delegateEntry) === true) return result('Cannot have a null delegateEntry element');

  let { delegate } = delegateEntry;
  let assessments = [];
  if (delegateEntry._doc && lodash.isArray(delegateEntry._doc.assessments)) {
    assessments = delegateEntry._doc.assessments; //eslint-disable-line
  }

  if (lodash.isNil(delegate) === true) return result('Delegate Entry has no delegate model');
  if (lodash.isNil(assessments) === true) {
    logger.debug(`Object ${assessments} should be an array`, delegateEntry);
    return result('Delegate has no assessments, no reminders to send.');
  }

  if (lodash.isString(delegate) === true) {
    logger.debug(`Delegate object is string, resolving using User.findById("${delegate}")`);
    delegate = await User.findById(delegate).then();
  }

  logger.info(`Sending Reminders to for ${delegate.firstName} ${delegate.lastName} for survey ${survey.title}`);

  try {
    const options = { ...defaultLaunchOptions, ...survey.options };
    let { organization } = survey;
    if (lodash.isString(organization)) {
      logger.debug(`Resolving organization with id (${organization})`);
      organization = await Organization.findById(organization).then();
    }
    const emailPromises = [];
    const assessmentPromises = [];

    for (let aidx = 0; aidx < assessments.length; aidx += 1) {
      if (lodash.isNil(assessments[aidx]) === false) {
        assessmentPromises.push(new Promise((resolve, reject) => {
          const assessment = assessments[aidx];
          Assessment.findById(assessment._id)
            .then(assessmentFindResult => resolve(assessmentFindResult))
            .catch(err => reject(err));
        }));
      }
    }

    const assessmentResults = await Promise.all(assessmentPromises).then();
    assessmentResults.forEach((assessment) => {
      const { assessor } = assessment;
      if (assessment.complete !== true) {
        emailPromises.push(emails.surveyEmails.reminder(assessor, delegate, survey, assessment, organization, options));
      }
    });

    const promiseResults = await Promise.all(emailPromises).then();

    return result(`Sent (${promiseResults.length}) survey reminder(s) email(s) for ${delegate.firstName} ${delegate.lastName} in ${survey.title}`, true);
  } catch (e) {
    return result(e.message);
  }
};

/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 */
export const sendSurveyClosed = async (survey, delegateEntry, organigram) => {
  // console.log(`Launching Survey: ${survey.title}`, delegateEntry, organigram);

  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };

  try {
    const options = { ...defaultLaunchOptions, ...survey.options };
    const user = delegateEntry.delegate;
    return result(`Sent survey closed emails and instructions for ${user.firstName} ${user.lastName} in ${survey.title}`, true);
  } catch (e) {
    return result(e.message);
  }
};

/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 */
export const sendReportOverview = async (survey, delegateEntry, organigram) => {
  // console.log(`Launching Survey: ${survey.title}`, delegateEntry, organigram);

  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };

  try {
    const options = { ...defaultLaunchOptions, ...survey.options };
    const user = delegateEntry.delegate;
    return result(`Sent survey report overview email for ${user.firstName} ${user.lastName} in ${survey.title}`, true);
  } catch (e) {
    return result(e.message);
  }
};


/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 * @param {*} emailType
 * @param {*} propertyBag
 */
export const sendSurveyEmail = async (survey, delegateEntry, organigram, emailType, propertyBag) => {
  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };
  let { delegate } = delegateEntry;

  if (lodash.isNil(delegate) === true) {
    return result('Delegate on delegateEntry is null, please check in put');
  }

  if (lodash.isString(delegate)) {
    delegate = await User.findById(delegate).then();
  }

  // console.log(`Sending Survey Email[${emailType}]: ${survey.title} for delegate ${firstName} ${lastName}`);
  const _delegateEntry = {
    ...delegateEntry, delegate,
  };

  logger.debug(`application.admin.Survey.js{ sendSurveyEmail( survey, delegateEntry, organigram, emailType, propertyBag ) }, ${{ assessments: _delegateEntry.assessments }}`);

  try {
    switch (emailType) {
      case EmailTypesForSurvey.ParticipationInvite: {
        return sendParticipationInivitationForDelegate(survey, _delegateEntry, organigram);
      }
      case EmailTypesForSurvey.SurveyLaunch: {
        return sendSurveyLaunchedForDelegate(survey, _delegateEntry, organigram, propertyBag);
      }
      case EmailTypesForSurvey.SurveyReminder: {
        return sendSurveyRemindersForDelegate(survey, _delegateEntry, organigram);
      }
      case EmailTypesForSurvey.SurveyClose: {
        return sendSurveyClosed(survey, _delegateEntry, organigram);
      }
      case EmailTypesForSurvey.SurveyReport: {
        return sendReportOverview(survey, _delegateEntry, organigram);
      }
      default: {
        return result(`Invalid Email Type For Survey, ${emailType}`);
      }
    }
  } catch (e) {
    logger.error('An error occured while processing the survey email command', e);
    return result(e.message);
  }
};

/**
 *
 * @param {*} survey
 * @param {*} delegateEntry
 * @param {*} organigram
 */
export const sendPeerNominationNotifications = async (user, organigram) => {
  // console.log('Sending Peer Nominations', user, organigram);

  const result = (message, success = false) => {

  };

  try {
    const options = { ...defaultLaunchOptions, ...survey.options };

    return result('Peer nominations sent', true);
  } catch (e) {
    return result(e.message);
  }
};

/**
 * Creates assessments for the delegate
 * @param {SurveyModel} survey
 * @param {UserModel} delegateEntry
 * @param {OrganigramModel} organigram
 */
export const launchSurveyForDelegate = async (survey:TowerStone.ISurveyDocument, delegateEntry: any, organigram: any, relaunch: boolean = false) => {
  // options for the launch
  logger.info(`Launching Survey: ${survey.title} for delegate ${delegateEntry.delegate.firstName} (is-relaunch: ${relaunch})`);
  const result = (message: string, success = false, assessments: any[]) => ({
    launched: success,
    success,
    message,
    assessments,
  });

  const { surveyType } = survey;

  const is180 = surveyType === '180';
  const is360 = surveyType === '360';
  const isPLC = surveyType === 'plc';
  
  try {
    const options = { ...defaultLaunchOptions, ...survey.options };

    if (iz.nil(survey)) throw new Error('survey parameter cannot be empty');
    if (iz.nil(delegateEntry)) throw new Error('delegate parameter cannot be empty');
    if(is180 === false) {
      //skip organigram and peer checks when doing 180 work
      if (iz.nil(organigram)) result(`The user does not have an organigram for ${survey.organization}`, false, []);
      if (iz.nil(organigram.confirmedAt)) return result('Peers have not yet been confirmed', false, []);
      if (iz.nil(organigram.peers)) return result('User has no peers defined', false, []);
    }
    

    const maximumAssessments = 5;
    const minimumAssessments = 3;

    

    if(is180 === true) {
      const assessments = [];
      const leadershipBrand = await LeadershipBrand.findById(survey.leadershipBrand);
      const templateRatings: any[] = [];
      logger.info(`Building Ratings template for Leadership Brand: ${leadershipBrand.title}`);
      leadershipBrand.qualities.map((quality, qi) => {
        quality.behaviours.map((behaviour, bi) => {
          templateRatings.push({
            qualityId: quality.id,
            behaviourId: behaviour.id,
            rating: 0,
            ordinal: templateRatings.length,
            comment: '',
          });
        });
      });

      let team = '';
      if(delegateEntry.team === survey.assessorTeamName) {
        //delegate is on assessor team      
        team = 'assessors';
      }


      if(delegateEntry.team === survey.delegateTeamName) {
        //delegate is on delegates team
        //self assessment
        team = 'delegates';
      }

      const existingAssessment = await Assessment.find({ 
        survey: survey._id, 
        delegate: delegateEntry.delegate._id, 
        assessor: delegateEntry.delegate._id   
      }).then()



      if( existingAssessment.length === 1 ) {
        logger.debug('Delegate / Assessor already have assessment asigned')
        return result(`Re-Launched 180 for ${delegateEntry.delegate.firstName}`, true, existingAssessment);
      } else {
        const assessment = new Assessment({
          id: new ObjectId(),
          organization: new ObjectId(survey.organization),
          client: new ObjectId(global.partner._id),
          delegate: new ObjectId(delegateEntry.delegate._id),
          team: team,
          assessor: new ObjectId(delegateEntry.delegate._id),
          survey: new ObjectId(survey._id),
          complete: false,
          ratings: [...templateRatings],
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
        });
        await assessment.save().then()
        return result(`Created 180 ${assessments.length} for assessor delegate`, true, [assessment]);
      }
      
    } else {
      if (organigram.peers && organigram.peers.length > 0 && (is360 === true || isPLC === true)) {
        if (organigram.peers.length < options.minimumPeers) return result(`Delegate does not have the minimum of ${options.minimumPeers} peers for this survey (${organigram.peers})`);
  
        const assessmentsPomises = [];
        if (delegateEntry.assessments.length === 0) {
          for (let ai = 0; ai < delegateEntry.assessments.length; ai += 1) {
            assessmentsPomises.push(Assessment.findById(delegateEntry.assessments[ai]));
          }
        }
  
        const assessments: any[] = [];
        const assessmentPromiseResult = await Promise.all(assessmentsPomises).then();
        logger.info(`Delegate has ${assessmentPromiseResult.length} assessments`);
        for (let ri = 0; ri <= assessmentPromiseResult.length; ri += 1) {
          const _assessment = assessmentPromiseResult[ri];
          assessments.push({ ..._assessment });
        }
  
        const leadershipBrand = await LeadershipBrand.findById(survey.leadershipBrand);
        const templateRatings: any[] = [];
        logger.info(`Building Ratings template for Leadership Brand: ${leadershipBrand.title}`);
        leadershipBrand.qualities.map((quality, qi) => {
          quality.behaviours.map((behaviour, bi) => {
            templateRatings.push({
              qualityId: quality.id,
              behaviourId: behaviour.id,
              rating: 0,
              ordinal: templateRatings.length,
              comment: '',
            });
          });
        });
  
        if (relaunch === false) {
          organigram.peers.forEach((peer) => {
            const peerhasAssessment = lodash.has(assessments, assessment => assessment.assessor === peer.user);
            if (!peerhasAssessment) {
              const assessment = new Assessment({
                id: ObjectId(),
                organization: ObjectId(survey.organization),
                client: ObjectId(global.partner._id),
                delegate: ObjectId(delegateEntry.delegate._id),
                team: null,
                assessor: ObjectId(peer.user),
                survey: ObjectId(survey._id),
                complete: false,
                ratings: [...templateRatings],
                createdAt: new Date().valueOf(),
                updatedAt: new Date().valueOf(),
              });
  
              assessment.save().then();
              assessments.push(assessment);
            }
          });
  
          const selfAssessment = new Assessment({
            id: ObjectId(),
            organization: ObjectId(survey.organization),
            client: ObjectId(global.partner._id),
            delegate: ObjectId(delegateEntry.delegate._id),
            team: null,
            assessor: ObjectId(delegateEntry.delegate._id),
            survey: ObjectId(survey._id),
            complete: false,
            ratings: [...templateRatings],
            createdAt: new Date().valueOf(),
            updatedAt: new Date().valueOf(),
          });
          await selfAssessment.save().then();
          assessments.push(selfAssessment);
        }
  
        // send emails
        logger.info(`(${assessments.length}) Assessments Created / Loaded, sending emails to delegates and assessor`);
        let emailResults = null;
        try {
          emailResults = await sendSurveyEmail(survey, delegateEntry, organigram, EmailTypesForSurvey.SurveyLaunch, { assessments, relaunch });
          logger.info('Email results from sending Survey Emails', emailResults);
          if (emailResults.success === true) {
            return result(`Successfully created ${assessments.length} assessments for delegate and emails sent ${moment().format('YYYY-MM-DD HH:mm:ss')}`, true, assessments);
          }
          return result(`Assessments created but could not send the mails ${moment().format('YYYY-MM-DD HH:mm:ss')}`, true, assessments);
        } catch (ex) {
          logger.error(ex);
          return result(`Successfully created ${assessments.length} assessments for delegate, failed sending emails ${moment().format('YYYY-MM-DD HH:mm:ss')}`, true, assessments);
        }
      }
    }

    return result('data error, organigram.peers is not a valid array');
  } catch (exception) {
    logger.error(`Error occured launching survey for delegate ${exception.message}`);
    return result('An error occured launching for delegate.');
  }
};

const SurveyService = {
  getSurveysForOrganization,
  getSurveys,
  getLeadershipBrand,
  createSurvey,
  createLeadershipBrand,
  updateLeadershipBrand,
  launchSurveyForDelegate,
};

export default SurveyService;
