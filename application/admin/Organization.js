/**
 * This file is responsible for all Organization related business functionality
 * The idea is to separate models and processes from each other.
 * Author: Werner Weber
 */
import co from 'co';
import _ from 'lodash';
import { Organization } from '../../models';
import * as legacy from '../../database';

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
