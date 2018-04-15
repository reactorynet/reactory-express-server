import co from 'co';
import _ from 'lodash';
import { getPool } from './legacy';

export default class Users {
  static listAll = co.wrap(function* listAllUsers(limit = 20) {
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
                    username as username from user_account LIMIT ${limit}`, resultCallback);
      });

      const userRows = yield requestWrapper;
      _.map(userRows, userRow => users.push({ ...userRow }));
      return users;
    } catch (e) {
      console.log('Error performing query', e);
      return [];
    }
  });
}
