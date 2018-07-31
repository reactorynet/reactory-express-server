/**
 * This file is responsible for all Organization related business functionality
 * The idea is to separate models and processes from each other.
 * Author: Werner Weber
 */
import co from 'co';
import _ from 'lodash';
import { ObjectId } from 'mongodb';
import { Organization } from '../../models';
import * as legacy from '../../database';
import { OrganizationValidationError, OrganizationNotFoundError, OrganizationExistsError } from '../../exceptions';

export class MigrationResult {
  constructor() {
    this.organization = null;
    this.organizationErrors = [];
    this.brandsMigrated = 0;
    this.brandErrors = [];
    this.employeesMigrated = 0;
    this.employeeErrors = [];
  }
}
/**
 * migrates an organization from a legacy version to the new
 * mongo stores.
 */
export const migrateOrganization = co.wrap(function* migrateGenerator(id, options) {
  try {
    const result = new MigrationResult();
    result.organization = yield Organization.findOne({ legacyId: id });
    if (result.organization !== null) {
      result.organizationErrors.push('organization already exists with legacy id - skipping');
    } else {
      // lookup legacy org
      const lorg = yield legacy.Organization.findWithId(id);
      if (lorg === null) {
        result.organizationErrors.push('legacy organization with that id not found');
        return result;
      }
      
      if(options.dataPath && lorg.logo) {
        
      }

      result.organization = yield new Organization({ ...lorg }).save();
    }

    if (result.organization === null) {
      result.organizationErrors.push('Could not set/load existing organization');
    }

    if (options.migrateBrands === true) {
      result.brandsMigrated = 1;
      // const organizationBrands = yield legacy.Survey.listBrandsForOrganization(id);
    }

    if (options.migrateEmployees === true) {
      result.employeesMigrated = 1;
      const employees = yield legacy.User.listAllForOrganization(id);
      _.map(employees, (employee)=>{
        //migrate employee
      });
    }

    return result;
  } catch (migrateError) {
    console.error('migrate error', migrateError);
    throw migrateError;
  }
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
  migrateOrganization,
  createOrganization,
  findOrCreate,
  findById,
};
