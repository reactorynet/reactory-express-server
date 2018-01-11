import co from 'co';
import mysql from 'mysql';
import _ from 'lodash';
import { ObjectId } from 'mongodb';

let pool = null;


const getPool = (database = 'plc', host = 'localhost', user = 'towerstone', password = process.end.DATABASE_PASSWORD_LEGACY,  port = 3306) => {
    if(pool === null){
        pool = mysql.createPool({
            connectionLimit : 100,
            host: host,
            user : user,
            password : password,
            database : database,
            port : port
          });
    }
    return pool;
};


export const testConnection = ( tenant = 'plc' ) => {
    getPool().query('SELECT 1 + 1 AS solution', function (error, results, fields) {
        if (error) throw error;
        console.log(results[0].solution.toString() === '2' ? 'Legacy DB Connected' : 'Legacy DB Not Connectioned');
    });      
};



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
                
                getPool().query('SELECT id, code, name, report_logo, site_logo,  date_created as createdAt, last_update as updateAt from organization ', resultCallback);
            });
            
            const organizationRows = yield requestWrapper;
            console.log(`${organizationRows.length} organizations(s) matching query`);
            _.map(organizationRows, ( organizationRow ) => organizations.push({
                ...organizationRow, 
                id: ObjectId(),
                createdAt: moment(organizationRow.createdAt).unix(),
                updateAt: moment(organizationRow.updatedAt).unix()                
            }));

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
                
                getPool().query(`SELECT 
                    id as legacyId, 
                    first_name as firstName, 
                    last_name as lastName, 
                    username as email,
                    'plc' as providerId, 
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
    
    static authenticateLegacy = co.wrap(function* (username, password){
        try{
            let user = null;
            
            const doAuth = new Promise((resolve, reject) => {                
                const cb = ( error, results, fields ) => { 
                    
                    if(error === null || error === undefined){
                        resolve(results);
                    }else{
                        reject(error);
                    }                        
                }

                getPool().query(`SELECT 
                id as legacyId, 
                first_name as firstName, 
                last_name as lastName, 
                username as email, 
                username as username from user_account 
                where username = '${username}'`, cb);
            });

            const userRow = yield doAuth;
            if(userRow.length === 1) {
                return {...userRow[0], id: ObjectID()}
            }else {
                return null;
            }

        }catch(e){
            console.log('Error performing query', e);        
            return null;
        }
    });
}
