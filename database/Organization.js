import moment from 'moment';
import co from 'co';
import _ from 'lodash';
import { getPool } from './legacy';

const selectOrganizationWithIdQuery = orgId => `
SELECT id as legacyId,
code,
name,
date_created as createdAt,
last_updated as updatedAt,
report_logo as reportLogo,
site_logo as logo
FROM organization
WHERE organization.id = ${orgId}`;


const selectAllOrganizationsQuery = (orderFields = 'name', sort = 'asc') => `
SELECT id as legacyId,
code,
name,
date_created as createdAt,
last_updated as updatedAt,
report_logo as reportLogo,
site_logo as logo
FROM organization
ORDER BY ${orderFields} ${sort}`;

export default class Organization {
  static listAll = co.wrap(function* listAllGenerator(orderFields = 'name', sort = 'asc', options) {
    try {
      const organizations = [];
      const requestWrapper = new Promise((resolve, reject) => {
        const resultCallback = (error, results) => {
          if (error === null || error === undefined) {
            resolve(results);
          } else {
            reject(error);
          }
        };

        getPool(typeof options === 'object' ? { ...options } : options).query(selectAllOrganizationsQuery(orderFields, sort), resultCallback);
      });

      const organizationRows = yield requestWrapper;
      console.log(`${organizationRows.length} organizations(s) matching query`);
      _.map(organizationRows, organizationRow => organizations.push({
        id: null,
        ...organizationRow,
        createdAt: moment(organizationRow.createdAt).valueOf(),
        updateAt: moment(organizationRow.updatedAt).valueOf(),
      }));

      return organizations;
    } catch (e) {
      console.error('Error performing query', e);
      return [];
    }
  });

  static findWithId = co.wrap(function* findWithIdGenerator(id, options) {
    try {
      const organizations = [];
      const requestWrapper = new Promise((resolve, reject) => {
        const resultCallback = (error, results) => {
          if (error === null || error === undefined) {
            resolve(results);
          } else {
            reject(error);
          }
        };

        getPool(typeof options === 'object' ? { ...options } : options).query(selectOrganizationWithIdQuery(id), resultCallback);
      });

      const organizationRows = yield requestWrapper;
      console.log(`${organizationRows.length} organizations matching query`);
      _.map(organizationRows, organizationRow => organizations.push({
        id: null,
        ...organizationRow,
        createdAt: moment(organizationRow.createdAt).valueOf(),
        updatedAt: moment(organizationRow.updatedAt).valueOf(),
      }));
      return organizations[0];
    } catch (queryError) {
      console.error('Could not load organization');
      return null;
    }
  });
}
