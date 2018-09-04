import co from 'co';
import _ from 'lodash';
import { getPool, querySync } from './legacy';


const selectUsersForOrganizations = (organizationIds = [1], providerId, limit, offset) => {
  if (limit && offset) {
    return `SELECT 
              id as legacyId, 
              first_name as firstName, 
              last_name as lastName, 
              username as email,
              '${providerId}' as providerId, 
              username as username from user_account
              WHERE organization_id in (${organizationIds})
              ORDER BY id
              LIMIT ${offset}, ${limit}`;
  }

  return `SELECT
            id as legacyId, 
            first_name as firstName, 
            last_name as lastName, 
            username as email,
            '${providerId}' as providerId, 
            username as username from user_account
            WHERE organization_id in (${organizationIds})
            ORDER BY id`;
};

const selectPeersForUserQuery = (userId, organizationId) => {
  return `
    SELECT 
    ua.id as legacyId,
    ua.peers_changed_date as lastUpdated,
    ua.allow_nominee_selection as allowEdit,      
    er.relation,
    er.colleague_id as legacyPeerId,      
    er.date_created as createdAt,
    er.last_updated as updatedAt,
    er.notified as notified,
    er.notified_date as notifiedDate,
    ua.peers_confirm_date as confirmDate,
    1 as isInternal
  FROM user_account as ua INNER JOIN 
    employee_relation as er ON ua.id = er.owner_id
      INNER JOIN user_account as ua2 ON er.colleague_id = ua2.id
    WHERE ua.id = ${userId} AND ua.organization_id = ${organizationId}
  `;
};

export default class Users {
  static listAll = co.wrap(function* listAllUsers(limit = 20, offset = 0) {
    try {
      const users = [];
      const requestWrapper = new Promise((resolve, reject) => {
        const resultCallback = (error, results) => {
          if (error === null || error === undefined) {
            resolve(results);
          } else {
            reject(error);
          }
        };

        getPool().query(`SELECT 
                    id as legacyId, 
                    first_name as firstName, 
                    last_name as lastName, 
                    username as email,
                    'plc' as providerId, 
                    username as username from user_account LIMIT ${offset},${limit}`, resultCallback);
      });

      const userRows = yield requestWrapper;
      _.map(userRows, userRow => users.push({ ...userRow }));
      return users;
    } catch (e) {
      console.log('Error performing query', e);
      return [];
    }
  });

  static listAllForOrganization = co.wrap(function* listAllUsersForOrganization(organizationId = 1, limit = 20, offset = 0, clientKey = 'reactory') {
    try {
      const users = [];
      const requestWrapper = new Promise((resolve, reject) => {
        const resultCallback = (error, results) => {
          if (error === null || error === undefined) {
            resolve(results);
          } else {
            reject(error);
          }
        };
        getPool().query(
          selectUsersForOrganizations([organizationId], clientKey, limit, offset),
          resultCallback,
        );
      });

      const userRows = yield requestWrapper;
      _.map(userRows, userRow => users.push({ ...userRow }));
      return users;
    } catch (e) {
      console.log('Error performing query', e);
      return [];
    }
  });

  static listPeersForUsers = co.wrap(function* listPeersForUsersGenerator(userId, organizationId, options) { // eslint-disable-line max-len
    try {
      return yield querySync(selectPeersForUserQuery(userId, organizationId, options));
    } catch (listError) {
      console.log('error running query', listError);
      return [];
    }
  });

  static listAdmins = co.wrap(function* listAdminAccounts() {
    const admins = yield [];
    return admins;
  });
}
