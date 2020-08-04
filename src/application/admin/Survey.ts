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
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';


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
export const sendSurveyLaunchedForDelegate = async (survey, delegateEntry, organigram, propertyBag = { assessments: [], relaunch: false }) => {
  logger.info('Sending launch emails for delegate', { assessmentCount: propertyBag.assessments.length });
  let { delegate } = delegateEntry;

  if (lodash.isString(delegate)) {
    delegate = await User.findById(delegate).then();
  }

  let organization: any = null;
  if (ObjectId.isValid(survey.organization)) {
    organization = await Organization.findById(survey.organization).then();
  } else if (lodash.isObject(survey.organization)) organization = survey.organization;

  const emailPromises: any = [];
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
export const sendSurveyRemindersForDelegate = async (survey: TowerStone.ISurveyDocument, delegateEntry: any) => {
  const result = (message, success = false) => {
    return {
      message,
      success,
    };
  };


  logger.debug('Survey.ts -> sendSurveyRemindersForDelegate(survey, delegateEntry)' );

  if (lodash.isNil(survey) === true) return result('Cannot have a nill survey element');
  if (lodash.isNil(delegateEntry) === true) return result('Cannot have a null delegateEntry element');

  debugger;

  let { delegate } = delegateEntry;
  let assessments: any[] = [];
  if (delegateEntry && delegateEntry.assessments && lodash.isArray(delegateEntry.assessments) === true) {
    assessments = delegateEntry.assessments; //eslint-disable-line
  } else {
    return result('Delegate has no assessments, no reminders to send.');
  }

  if (lodash.isNil(delegate) === true) return result('Delegate Entry has no delegate model');
  if (lodash.isNil(assessments) === true || assessments.length === 0) {
    logger.debug(`Object ${assessments} should be an array with more than 0 entries`);
    return result('Delegate has no assessments, no reminders to send.');
  }

  if (lodash.isString(delegate) === true) {
    logger.debug(`Delegate object is string, resolving using User.findById("${delegate}")`);
    delegate = await User.findById(delegate).then();
  }

  logger.info(`Sending Reminders for ${delegate.firstName} ${delegate.lastName} for survey ${survey.title}`);

  try {
    const options = { ...defaultLaunchOptions, ...survey.options };
    let { organization } = survey;
    if (lodash.isString(organization)) {
      logger.debug(`Resolving organization with id (${organization})`);
      organization = await Organization.findById(organization).then();
    } else {
      logger.debug(`Resolving organization ==> object (${organization.name})`);
    }

    interface ISurveyReminderMailResult {
      sent: boolean,
      error: Error
    } 

    const emailPromises: Promise<ISurveyReminderMailResult>[] = [];
    const assessmentPromises: Promise<any>[] = [];

    for (let aidx = 0; aidx < assessments.length; aidx += 1) {
      if (lodash.isNil(assessments[aidx]) === false && assessments[aidx] !== undefined) {
        assessmentPromises.push(new Promise((resolve, reject) => {

          const assessment = assessments[aidx];
            Assessment.findById(assessment._id)
            .populate('assessor')
            .populate('delegate')
            .then(assessmentFindResult => resolve(assessmentFindResult))
            .catch(err => { 
              logger.error(`Error while loading Assessment with id ${assessment._id}`)
              reject(err) 
            });          
        }));
      }
    }

    const assessmentResults = await Promise.all(assessmentPromises).then();

    logger.debug(`Found ${assessmentResults.length} assessments for ${delegate.fullName()}`)

    assessmentResults.forEach((assessment) => {
      const { assessor } = assessment;
      if (assessment.complete !== true) {
        logger.debug(`Creating Reminder for ${assessor.fullName()}`)
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
export const sendSurveyEmail = async (survey: TowerStone.ISurveyDocument, delegateEntry: any, organigram: any, emailType: any = 'none', propertyBag: any = {}) => {
  const result = (message: string, success: boolean = false) => {
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
    delegateEntry.delegate = delegate;
  }

  // console.log(`Sending Survey Email[${emailType}]: ${survey.title} for delegate ${firstName} ${lastName}`);
  

  logger.debug(`application.admin.Survey.js{ sendSurveyEmail( ${survey.title}, ${delegateEntry.delegate.fullName()}, organigram, ${emailType}, propertyBag:${JSON.stringify(propertyBag)})`);

  try {
    switch (emailType) {
      case EmailTypesForSurvey.ParticipationInvite: {
        return sendParticipationInivitationForDelegate(survey, delegateEntry, organigram);
      }
      case EmailTypesForSurvey.SurveyLaunch: {
        return sendSurveyLaunchedForDelegate(survey, delegateEntry, organigram, propertyBag);
      }
      case EmailTypesForSurvey.SurveyReminder: {
        return sendSurveyRemindersForDelegate(survey, delegateEntry);
      }
      case EmailTypesForSurvey.SurveyClose: {
        return sendSurveyClosed(survey, delegateEntry, organigram);
      }
      case EmailTypesForSurvey.SurveyReport: {
        return sendReportOverview(survey, delegateEntry, organigram);
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
  logger.info(`Launching Survey: ${survey.title} for delegate ${delegateEntry.delegate.fullName} (is-relaunch: ${relaunch})`);
  const result = (message: string, success = false, assessments: any[]) => ({
    launched: success,
    success,
    message,
    assessments,
  });

  const { surveyType } = survey;

  const is180 = surveyType.endsWith('180') === true || surveyType === 'culture';
  const is360 = surveyType.endsWith('360') === true;
  const isCulture = surveyType === 'culture';

  const isPLC = surveyType === 'plc';
  
  try {
    const options = { ...defaultLaunchOptions, ...survey.options };

    if (iz.nil(survey)) throw new Error('survey parameter cannot be empty');
    if (iz.nil(delegateEntry)) throw new Error('delegate parameter cannot be empty');
    if(is180 === false) {
      //skip organigram and peer checks when doing 180 work
      if (iz.nil(organigram) === true) result(`The user does not have an organigram for ${survey.organization}`, false, []);
      if (iz.nil(organigram.confirmedAt) === true) return result('Peers have not yet been confirmed', false, []);
      if (iz.nil(organigram.peers) === true) return result('User has no peers defined', false, []);
    }
    

    const maximumAssessments = 10;
    const minimumAssessments = 3;

    let assessments: any[] = [];
    let leadershipBrand: any = await LeadershipBrand.findById(survey.leadershipBrand);
    let templateRatings: any[] = [];

    if (delegateEntry.assessments.length === 0) {
      for (let ai = 0; ai < delegateEntry.assessments.length; ai += 1) {
        assessments.push(delegateEntry.assessments[ai]);
        //assessmentsPomises.push(Assessment.findById(delegateEntry.assessments[ai]));
      }
    }

    if(is180 === true) {
      
      logger.info(`Building Ratings template for Leadership Brand: ${leadershipBrand.title}`);
      leadershipBrand.qualities.map((quality, qi) => {
        quality.behaviours.map((behaviour, bi) => {
          templateRatings.push({
            qualityId: quality.id || quality._id,
            behaviourId: behaviour.id || behaviour._id,
            rating: 0,
            ordinal: templateRatings.length,
            comment: '',
          });
        });
      });

      let team = '';
      if(!isCulture) {
        if(delegateEntry.team === survey.assessorTeamName) {
          //delegate is on assessor team      
          team = 'assessors';
        }
  
  
        if(delegateEntry.team === survey.delegateTeamName) {
          //delegate is on delegates team
          //self assessment
          team = 'delegates';
        }
      }  else {
        team = 'Culture'
      }
      

      logger.debug(`Checking if user has existing assessment.`)

      const existingAssessment = await Assessment.find({ 
        survey: survey._id, 
        delegate: delegateEntry.delegate._id, 
        assessor: delegateEntry.delegate._id   
      }).then()



      if( existingAssessment.length === 1 ) {
        logger.debug('Delegate / Assessor already have assessment asigned')
        const emailResults = await sendSurveyEmail(survey, delegateEntry, organigram, EmailTypesForSurvey.SurveyLaunch, { assessments: existingAssessment, relaunch: true }).then();          
        return result(`Re-Sent ${assessments.length} ${isCulture === true ? 'Culture' : 'Team 180'}  assessment(s) for ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}. Email result: ${emailResults.message}`, true, existingAssessment);
        
      } else {
        const assessment = new Assessment({
          id: new ObjectId(),
          organization: new ObjectId(survey.organization._id),
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

        try {
          const emailResults = await sendSurveyEmail(survey, delegateEntry, organigram, EmailTypesForSurvey.SurveyLaunch, { assessments: [assessment], relaunch }).then();
          
          return result(`Created ${assessments.length} ${isCulture === true ? 'Culture' : 'Team 180'}  assessment(s) for ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}. Email result: ${emailResults.message}`, true, [assessment]);
        } catch(teamCultureEmailSendError) {

        }
        
        
      }
      
    } else {
      if (organigram.peers && organigram.peers.length > 0 && (is360 === true || isPLC === true)) {
        if (organigram.peers.length < options.minimumPeers) return result(`Delegate does not have the minimum of ${options.minimumPeers} peers for this survey (${organigram.peers})`, false, []);
                 
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
            debugger;

            const peerhasAssessment = lodash.indexOf(assessments, (assessment: any) => { 
              if(typeof assessment.assessor === 'string') {
                return new ObjectId(peer.user).equals(new ObjectId(assessment.assessor));
              }
              
              if(assessment.assessor._id) {
                return new ObjectId(peer.user).equals(new ObjectId(assessment.assessor._id))
              }

              if(assessment.assessor.id) {
                return new ObjectId(peer.user).equals(new ObjectId(assessment.assessor.id))
              }

              return false;
              
            }) >= 0;

            debugger

            if (!peerhasAssessment) {
              const assessment = new Assessment({
                id: new ObjectId(),
                organization: new ObjectId(survey.organization._id),
                client: new ObjectId(global.partner._id),
                delegate: new ObjectId(delegateEntry.delegate._id),
                team: null,
                assessor: new ObjectId(peer.user),
                survey: new ObjectId(survey._id),
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
            id: new ObjectId(),
            organization: new ObjectId(survey.organization._id),
            client: new ObjectId(global.partner._id),
            delegate: new ObjectId(delegateEntry.delegate._id),
            team: null,
            assessor: new ObjectId(delegateEntry.delegate._id),
            survey: new ObjectId(survey._id),
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
          emailResults = await sendSurveyEmail(survey, delegateEntry, organigram, EmailTypesForSurvey.SurveyLaunch, { assessments, relaunch }).then();
          logger.info('Email results from sending Survey Emails', emailResults);
          if (emailResults.success === true) {
            if(relaunch === true) {
              return result(`Successfully sent reminder emails ${moment().format('YYYY-MM-DD HH:mm:ss')}`, true, assessments);
            } else {
              return result(`Successfully created ${assessments.length} assessments for delegate and emails sent ${moment().format('YYYY-MM-DD HH:mm:ss')}`, true, assessments);
            }
            
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
