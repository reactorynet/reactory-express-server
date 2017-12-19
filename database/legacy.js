import co from 'co';
import mysql from 'mysql';
import _ from 'lodash';
import { ObjectId } from 'mongodb';

const pool = mysql.createPool({
  connectionLimit : 100,
  host            : 'localhost',
  user            : process.env.DB_USER,
  password        : process.end.DATABASE_PASSWORD_LEGACY,
  database        : process.env.DB_NAME,
  port            : 3306
});



pool.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
  if (error) throw error;
  console.log('The solution is: ', results[0].solution);
});


const selectOrganizationWithIdQuery = (orgId) => `
SELECT 'organization'.id',
'organization'.'version',
'organization'.'code',
'organization'.'date_created',
'organization'.'default_theme_id',
'organization'.'last_updated',
'organization'.'name',
'organization'.'report_logo',
'organization'.'site_logo'
FROM organization
WHERE organization.id = ${orgId}`;


const selectAllOrganizationsQuery = () => `
SELECT SELECT 'organization'.id',
'organization'.'version',
'organization'.'code',
'organization'.'date_created',
'organization'.'default_theme_id',
'organization'.'last_updated',
'organization'.'name',
'organization'.'report_logo',
'organization'.'site_logo'
FROM organization`;

export class Organization {

    static listAll = co.wrap(function* (){        
        try{
            let organizations = [];
            const requestWrapper = new Promise((resolve, reject) => {
                const resultCallback = ( error, results, fields ) => { 
                    
                    if(error === null || error === undefined){
                        resolve(results);
                    }else{
                        reject(error);
                    }                        
                }
                
                pool.query('SELECT id, code, name, report_logo, site_logo', resultCallback);
            });
            
            const organizationRows = yield requestWrapper;
            console.log(`${organizationRows.length} organizations(s) matching query`);
            _.map(organizationRows, ( organizationRow ) => organizations.push({...organizationRow, id: ObjectId()}));

            return organizations;            
        }catch(e){
            console.log('Error performing query', e);        
            return [];
        }                
    });     
}

export class Users {
    
    static listAll = co.wrap(function* (limit = 20){        
        try{
            let users = [];
            const requestWrapper = new Promise((resolve, reject) => {
                const resultCallback = ( error, results, fields ) => { 
                    
                    if(error === null || error === undefined){
                        resolve(results);
                    }else{
                        reject(error);
                    }                        
                }
                
                pool.query(`SELECT 
                    id as legacyId, 
                    first_name as firstName, 
                    last_name as lastName, 
                    username as email, 
                    username as username from user_account LIMIT ${limit}`, resultCallback);
            });
            
            const userRows = yield requestWrapper;
            console.log(`${userRows.length} user(s) matching query`);
            _.map(userRows, ( userRow ) => users.push({...userRow, id: ObjectId()}));

            return users;            
        }catch(e){
            console.log('Error performing query', e);        
            return [];
        }                
    });     
}
