/**
 * This file is responsible for all Organization related business functionality
 * The idea is to separate models and processes from each other.
 * Author: Werner Weber
 */
import co from 'co';
import dotenv from 'dotenv';
import _, { isNil, find, isNaN } from 'lodash';
import pngToJpeg from 'png-to-jpeg';
import uuid from 'uuid';
import { existsSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { ObjectId } from 'mongodb';
import {
  Assessment,
  Organization,
  User,
  LeadershipBrand,
  ReactoryClient,
  Survey,
  Scale,
} from '../../models';
import { createUserForOrganization, setPeersForUser } from './User';
import SurveyService from './Survey';
import legacy from '../../database';
import { getScaleForKey } from '../../data/scales';
import { OrganizationValidationError, OrganizationNotFoundError, OrganizationExistsError } from '../../exceptions';
import moment, { isMoment } from 'moment';
import logger from '../../logging';


dotenv.config();


const {
  APP_DATA_ROOT,
  LEGACY_APP_DATA_ROOT,
} = process.env;

const {
  getLeadershipBrand,
  createLeadershipBrand,
  createSurvey,
} = SurveyService;


export class MigrationResult {
  constructor() {
    this.organization = null;
    this.organizationErrors = [];
    this.brandsMigrated = 0;
    this.brandErrors = [];
    this.employeesMigrated = 0;
    this.employeeErrors = [];
    this.surveysMigrated = 0;
    this.surveyErrors = [];
    this.assessmentMigrated = 0;
    this.assessmentErrors = [];
    this.communicationsMigrated = 0;
    this.communicationsErrors = [];
  }
}


export const updateOrganizationLogo = (organization, imageData) => {
  try {
    const isPng = imageData.startsWith('data:image/png');
    const buffer = Buffer.from(imageData.split(/,\s*/)[1], 'base64');
    if (!existsSync(`${APP_DATA_ROOT}/organization`)) mkdirSync(`${APP_DATA_ROOT}/organization`);
    const path = `${APP_DATA_ROOT}/organization/${organization._id}/`;

    if (!existsSync(path)) mkdirSync(path);
    const filename = `${APP_DATA_ROOT}/organization/${organization._id}/logo_${organization._id}_default.${isPng === true ? 'png' : 'jpeg'}`;

    // if (isPng === true) {
    //  logger.info(`Converting logo for ${organization} from png to jpg`);
    //  pngToJpeg({ quality: 70 })(buffer).then(output => writeFileSync(filename, output));
    // } else writeFileSync(filename, buffer);

    writeFileSync(filename, buffer);
    return `logo_${organization._id}_default.${isPng === true ? 'png' : 'jpeg'}`;
  } catch (organizationLogoUpdate) {
    logger.error('Could not update the company logo', organizationLogoUpdate);
    return null;
  }
};

/**
 * migrates an organization from a legacy version to the new
 * mongo stores.
 */
export const migrateOrganization = co.wrap(function* migrateGenerator(id, options = { clientKey: 'plc', dataPath: LEGACY_APP_DATA_ROOT }) {
  try {
    // lookup legacy org
    logger.info(`Starting Legacy Import for organization ${id} options: clientKey = ${options.clientKey}, dataPath: ${LEGACY_APP_DATA_ROOT}`);
    const lorg = yield legacy.Organization.findWithId(id, options);
    const result = new MigrationResult();
    if (isNil(lorg)) {
      result.organizationErrors.push('legacy organization with that id not found');
      return result;
    }

    result.organization = yield Organization.findOne({ legacyId: id });
    let isNew = isNil(result.organization) === true;
    // check by code, company could have been created under different client key
    if (isNew) result.organization = yield Organization.findOne({ code: lorg.code });
    isNew = isNil(result.organization) === true;

    if (isNew === true) result.organization = yield new Organization({ ...lorg }).save();
    if (isNil(lorg.logo) === false) {
      try {
        logger.info('Organization has logo file, checking if exists');
        const sourceFile = `${options.dataPath}/organization/${lorg.legacyId}/${lorg.logo}`;
        if (existsSync(sourceFile) === true) {
          logger.info('Found legacy logo file, copying and renaming to CDN');
          if (!existsSync(`${APP_DATA_ROOT}/organization/${result.organization.id}/`)) mkdirSync(`${APP_DATA_ROOT}/organization/${result.organization.id}/`);
          copyFileSync(sourceFile, `${APP_DATA_ROOT}/organization/${result.organization.id}/${lorg.logo}`);
        } else logger.info(`File '${sourceFile}' not found`);
      } catch (error) {
        result.organizationErrors.push(`Could not copy the source file for the organization: ${error.message}`);
      }
    }

    if (result.organization === null) {
      result.organizationErrors.push('Could not set/load existing organization');
    }

    const now = new Date().valueOf();
    if (options.migrateBrands === true) {
      //console.log('Migrating Brands, for organization');
      result.brandsMigrated = 0;
      const organizationBrands = yield legacy.Survey.listBrandsForOrganization(id, options);
      for (let lbi = 0; lbi < organizationBrands.length; lbi += 1) {
        let scaleRef = yield Scale.findOne({ legacyId: organizationBrands[lbi].legacyScaleId }).then();
        if (isNil(scaleRef) === true) {
          result.brandErrors.push(`Scale Reference is invalid ${organizationBrands[lbi].legacyScaleId}`);
          scaleRef = yield Scale.findOne({ key: 'default' }).then();
        }

        const brandInput = {
          ...organizationBrands[lbi],
          scale: scaleRef._id, //eslint-disable-line
          organization: result.organization._id,
          createdAt: now,
          updatedAt: now,
        };
        const existing = yield LeadershipBrand.findOne({ legacyId: brandInput.legacyId, organization: result.organization._id }).then();
        if (isNil(existing) === true) {
          try {
            const brand = yield createLeadershipBrand(brandInput);
            result.brandsMigrated += 1;
            //console.log(`Created new brand ${brand._id}`);
          } catch (createError) {
            console.error(createError.message);
            result.brandErrors.push(createError.message);
          }
        } else {
          //console.log('Brand already imported');
        }
      }
    }

    if (options.migrateEmployees === true) {
      result.employeesMigrated = 0;
      const employees = yield legacy.Users.listAllForOrganization(id, options);
      const employeePeers = {};
      for (let eidx = 0; eidx < employees.length; eidx += 1) {
        try {
          const employee = { ...employees[eidx], createdAt: now, updatedAt: now };
          const createResult = yield createUserForOrganization(employee, uuid(), result.organization, ['USER'], 'id.reactory.net', global.partner, null);
          if (createResult.user) {
            const peerRows = yield legacy.Users.listPeersForUsers(createResult.user.legacyId, result.organization.legacyId, options);
            //console.log(`Found ${peerRows.length} peer rows`);
            if (peerRows.length && peerRows.length > 0) {
              const peers = [];
              let lastUpdated = null;
              let allowEdit = null;
              let confirmDate = null;

              for (let pid = 0; pid < peerRows.length; pid += 1) {
                lastUpdated = lastUpdated !== null ?
                  lastUpdated :
                  moment(peerRows[pid].lastUpdated).valueOf();

                allowEdit = allowEdit !== null ?
                  allowEdit :
                  peerRows[pid].allowEdit === true;

                confirmDate = confirmDate !== null ?
                  confirmDate :
                  moment(peerRows[pid].confirmDate).valueOf();

                const peer = {
                  user: peerRows[pid].id || null,
                  relationship: 'report',
                  legacyPeerId: peerRows[pid].legacyPeerId,
                  isInternal: peerRows[pid].isInternal === 1,
                };

                switch (peerRows[id].relation) {
                  case 'PEER': peer.relationship = 'peer'; break;
                  case 'SUPERVISOR': peer.relationship = 'manager'; break;
                  case 'REPORT':
                  default: peer.relationship = 'report'; break;
                }
                peers.push(peer);
              }
              // build employee-peers indexed object
              // index is based on objectId
              employeePeers[createResult.user.legacyId] = {
                user: createResult.user._id || undefined, // eslint-disable-line
                legacyId: createResult.user.legacyId, // used for lookup
                lastUpdated,
                organization: result.organization._id || undefined, // eslint-disable-line
                allowEdit,
                confirmDate,
                peers,
              };
            }
          }
          result.employeesMigrated += 1;
        } catch (createError) {
          result.employeeErrors.push(createError.message);
          console.error(createError);
        }
      }

      if (Object.keys(employeePeers).length > 0) {
        // we have employee peers and all users
        // should be created for this organization
        // debugger; // eslint-disable-line
        const userKeys = Object.keys(employeePeers);
        for (let userIdIndex = 0; userIdIndex < userKeys.length; userIdIndex += 1) {
          try {
            const userId = userKeys[userIdIndex]; // legacyId for user
            const peers = [];
            if (employeePeers[userId].peers.length > 0) {
              for (let pIndex = 0; pIndex < employeePeers[userId].peers.length; pIndex += 1) {
                if (employeePeers[userId].peers[pIndex].user === null &&
                  isNil(employeePeers[userId].peers[pIndex].legacyPeerId) === false) {
                  const peerFound = yield User.findOne({
                    legacyId: employeePeers[userId].peers[pIndex].legacyPeerId,
                  }).then();
                  if (peerFound) {
                    peers.push({
                      ...employeePeers[userId].peers[pIndex],
                      user: peerFound._id, // eslint-disable-line no-underscore-dangle
                    });
                  }
                } else {
                  peers.push(employeePeers[userId].peers[pIndex]);
                }
              }
              if (peers.length > 0) {
                //console.log(`Setting ${peers.length} peers for ${userId}`);
                const organigramEntry = yield setPeersForUser(
                  { _id: employeePeers[userId].user }, // fake user object, only need the _id,
                  peers,
                  result.organization,
                  employeePeers[userId].allowEdit,
                  moment(employeePeers[userId].confirmedAt).isMoment ?
                    moment(employeePeers[userId].confirmedAt).valueOf() :
                    new Date().valueOf(),
                );
                //console.log('Created new organigram entry', organigramEntry);
              } else {
                //console.log(`No Peers for user: ${userId}`);
              }
            }
          } catch (peerSetError) {
            console.error('PeerSet Error', peerSetError);
          }
        }
      }
    }

    if (options.migrateSurveys === true) {
      // migrate survey structure
      const surveys = yield legacy.Survey.listSurveysForOrganization(id, options);
      for (let sid = 0; sid < surveys.length; sid += 1) {
        const existing = yield Survey.findOne({
          legacyId: surveys[sid].legacyId,
          organization: result.organization,
        }).then();
        if (isNil(existing) === true) {
          //console.log('No survey found matching criteria');
          surveys[sid].organization = yield Organization.findOne({ legacyId: id }).then();
          surveys[sid].leadershipBrand = yield LeadershipBrand.findOne({
            legacyId: surveys[sid].legacyBrandId,
          }).then();
          surveys[sid].options = {
            minAssessmentsCount: surveys[sid].minAssessmentsCount || -1,
          };

          switch (surveys[sid].surveyType) {
            case 'fepl': {
              surveys[sid].surveyType = 'plc';
              break;
            }
            case 'default': {
              surveys[sid].surveyType = '360';
              break;
            }
            default: {
              surveys[sid].surveyType = '180';
              break;
            }
          }

          try {
            const surveyCreateResult = yield createSurvey(surveys[sid]);
            //console.log(`Created survey with id: ${surveyCreateResult._id} `, surveyCreateResult);
            result.surveysMigrated += 1;
          } catch (createSurveyError) {
            console.error(createSurveyError);
            result.surveyErrors.push(createSurveyError.message);
          }
        } else {
          //console.log(`Already imported survey for organization. Survey Id: ${existing._id}`);
        }
      }
      // migrate survey data
      /*
        a.assessor_id as legacyAssessorId,
        a.employee_id as legacyEmployeeId,
        a.complete as isComplete,
        a.valid_from as startDate,
        a.valid_to as endDate,
        a.scale_id as legacyScaleId,
        ab.survey_id as legacySurveyId,
      */
      const assessments = yield legacy.Survey.listAssessmentsForOrganization(id, options);
      for (let aid = 0; aid < assessments.length; aid += 1) {
        const survey = yield Survey.findOne({ legacyId: assessments[aid].legacySurveyId }).then();
        const leadershipBrand = yield LeadershipBrand.findById(survey.leadershipBrand).then();
        const delegate = yield User.findOne({ legacyId: assessments[aid].legacyEmployeeId }).then();
        const assessor = yield User.findOne({ legacyId: assessments[aid].legacyAssessorId }).then();
        // we don't use the client on global scope, as it is admin function override
        const client = yield ReactoryClient.findOne({ key: options.clientKey }).then();
        
        assessments[aid].organization = result.organization._id; //eslint-disable-line
        assessments[aid].client = client._id; //eslint-disable-line
        assessments[aid].delegate = delegate._id; //eslint-disable-line
        assessments[aid].assessor = assessor._id; //eslint-disable-line
        assessments[aid].survey = survey._id; //eslint-disable-line
        assessments[aid].startDate = moment(assessments[aid].startDate).valueOf();
        assessments[aid].endDate = moment(assessments[aid].endDate).valueOf();
        assessments[aid].complete = true; // auto set to true as it is an import

        for (let ratingId = 0; ratingId < assessments[aid].ratings.length; ratingId += 1) {
          const ratingObj = assessments[aid].ratings[ratingId];
          const quality = find(leadershipBrand.qualities, { legacyId: ratingObj.legacyQualityId.toString() });
          assessments[aid].ratings[ratingId].qualityId = quality._id; //eslint-disable-line
          assessments[aid].ratings[ratingId].behaviourId = find(quality.behaviours, { legacyId: ratingObj.legacyBehaviourId.toString() })._id; //eslint-disable-line

          delete assessments[aid].ratings[ratingId].legacyBehaviourId;
          delete assessments[aid].ratings[ratingId].legacyQualityId;
        }

        delete assessments[aid].legacyEmployeeId;
        delete assessments[aid].legacyAssessorId;
        delete assessments[aid].legacySurveyId;
        delete assessments[aid].legacyScaleId;


        try {
          let assessment = yield Assessment.findOne({ assessor: assessor._id, delegate: delegate._id, survey: survey._id }).then();
          if (isNil(assessment) === true) {
            assessment = yield new Assessment({ ...assessments[aid] }).save();
            if (isNil(assessment) === false) {
              result.assessmentsMigrated += 1;
              // add assessment to the collection reference for the delegate,
              const delegateEntry = find(survey.delegates, { delegate: delegate._id });
              if (isNil(delegateEntry) === false) {
                delegateEntry.assessments.push(assessment._id);
              } else {
                survey.delegates.push({
                  delegate: delegate._id,
                  notifications: [],
                  launched: true,
                  assessments: [assessment._id],
                  complete: true,
                  status: 'complete',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
              // debugger; //eslint-disable-line
              yield survey.save();
            } else result.assessmentErrors.push('Could not create the document');
          } else {
            //console.log('Assessment already imported', { assessment_id: assessment._id });
          }
        } catch (assessmentImportError) {
          result.assessmentErrors.push(`Could not import assessment due to an error: ${assessmentImportError.message}`);
          console.error(assessmentImportError);
        }
      }
    }

    if (options.migrateCommunications === true) {
      // migrate email content
    }

    return result;
  } catch (migrateError) {
    console.error('migrate error', migrateError);
    throw migrateError;
  }
});


export class CoreMigrationResult {
  constructor() {
    this.errors = [];
    this.scalesMigrated = 0;
    this.organizationMigrateResults = [];
  }
}

export const migrateCoreData = co.wrap(function* migrateCoreGenerator(options = { clientKey: 'plc', dataPath: LEGACY_APP_DATA_ROOT }) {
  const coreMigrateResult = new CoreMigrationResult();
  try {
    // migrate scales
    const scales = yield legacy.Survey.listScales(options);
    if (scales.length > 0) {
      for (let scaleId = 0; scaleId < scales.length; scaleId += 1) {
        const scale = yield Scale.findOneAndUpdate({ legacyId: scales[scaleId].legacyId }, scales[scaleId], { upsert: true });
        //console.log('Converting Scale', scale);
        if (isNil(scale) === true) coreMigrateResult.errors.push(`Could not create scale for ${scales[scaleId].legacyId}`);
        else coreMigrateResult.scalesMigrated += 1;
      }
    }
  } catch (coreMigrateExcetion) {
    coreMigrateResult.errors.push(`An error occured during core data migration ${coreMigrateExcetion.message}`);
  }

  if (options.migrateOrganizations.length > 0) {
    let ids = options.migrateOrganizations || [];
    if (ids.length === 1 && ids[0] === -1) {
      ids = [];
      const orgs = yield legacy.Organization.listAll('name', 'asc', options);
      orgs.forEach((org) => { ids.push(org.legacyId); });
    }

    for (let oi = 0; oi < ids.length; oi += 1) {
      const orgId = ids[oi];
      if (isNaN(orgId) === false) {
        const result = yield migrateOrganization(orgId, options);
        coreMigrateResult.organizationMigrateResults.push(result);
      }
    }
  }

  return coreMigrateResult;
});

export const createOrganization = (organizationInput) => {
  return new Promise((resolve, reject) => {
    Organization.find({ name: organizationInput.name }).then((organizationFindResult) => {
      if (organizationFindResult.length === 0) {
        const organization = new Organization(organizationInput);
        const validationResult = organization.validateSync();
        if (_.isNil(validationResult) === false) {
          if (validationResult.errors) reject(new OrganizationValidationError('Invalid organization input', validationResult.errors));
        } else {
          organization.save().then((organizationResult) => {
            resolve(organizationResult);
          }).catch((e) => {
            reject(e);
          });
        }
      } else {
        reject(new OrganizationExistsError('Organization with that name is already registered, if you believe you have rights to the name of the company, please contact our helpdesk.'));
      }
    });
  });
};

export const findOrCreate = (organizationInput) => {
  return new Promise((resolve, reject) => {
    if (_.isNil(organizationInput.id) === false) {
      Organization.findOne({ _id: ObjectId(organizationInput.id) }).then((organization) => {
        if (_.isNil(organization)) reject(new OrganizationNotFoundError('Could not load organization with given id', organizationInput.id));
        resolve(organization);
      }).catch((findError) => {
        reject(findError);
      });
    } else {
      createOrganization(organizationInput).then((organization) => {
        resolve(organization);
      }).catch((createError) => {
        reject(createError);
      });
    }
  });
};

export const findById = (id) => {
  return Organization.findOne({ _id: ObjectId(id) });
};

export default {
  migrateCoreData,
  migrateOrganization,
  createOrganization,
  findOrCreate,
  findById,
};
