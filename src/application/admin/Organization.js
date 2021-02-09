/**
 * This file is responsible for all Organization related business functionality
 * The idea is to separate models and processes from each other.
 * Author: Werner Weber
 */
import co from 'co';
import * as dotenv from 'dotenv';
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
import { createLeadershipBrand, createSurvey } from './Survey';
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
 * 
 * Deprecated
 */
export const migrateOrganization = (id, options = { clientKey: 'plc', dataPath: LEGACY_APP_DATA_ROOT }) => {
  throw new ApiError("Deperecated");
};


export class CoreMigrationResult {
  constructor() {
    this.errors = [];
    this.scalesMigrated = 0;
    this.organizationMigrateResults = [];
  }
}

export const migrateCoreData = async (options = { clientKey: 'plc', dataPath: LEGACY_APP_DATA_ROOT }) => {
  logger.info(`Migrating Core Data: ${options.clientKey}, ${options.dataPath}`);
  const coreMigrateResult = new CoreMigrationResult();

  const scales = await legacy.Survey.listScales(options).then();
  if (scales.length > 0) {
    logger.info(`Migrating ${scales.length} Scales `);
    try {
      const scalesUpserted = await Promise.all(scales.map((scale) => {
        return Scale.findOneAndUpdate({ legacyId: scale.legacyId }, scale, { upsert: true });
      })).then();

      logger.info(`Legacy Scales Import Complete, returned (${scalesUpserted.length}) results`);
    } catch (scaleMigrationError) {
      coreMigrateResult.errors.push(`An error occured during migration scales ${scaleMigrationError.message}`);
    }
  } else {
    logger.info('No scales found in legacy system');
  }


  try {
    if (options.migrateOrganizations.length > 0) {
      let ids = options.migrateOrganizations || [];
      if (ids.length === 1 && ids[0] === -1) {
        ids = [];
        const orgs = await legacy.Organization.listAll('name', 'asc', options).then();
        orgs.forEach((org) => { ids.push(org.legacyId); });
      }
      logger.info(`Importing ${ids.length} organizaitons`);
      const upsertedOrganzations = await Promise.all(ids.map((oid) => {
        return migrateOrganization(oid, options);
      })).then();
      upsertedOrganzations.map(result => coreMigrateResult.organizationMigrateResults.push(result));
    }
  } catch (organizationImportError) {
    coreMigrateResult.errors.push(`An error occured during migration scales ${organizationImportError.message}`);
  }

  return coreMigrateResult;
};

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
