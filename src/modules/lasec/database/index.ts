import { isNil, isArray, template } from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import { IReactoryDatabase, SQLQuery, Operator } from '@reactory/server-core/database/types';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import CONSTANTS, { LasecCompany } from '@reactory/server-modules/lasec/constants';


import {
  ProductClass,
  LasecAuthentication,
} from '@reactory/server-modules/lasec/types/lasec';

import ApiError from 'exceptions';
import { fileAsString } from 'utils/io';
import logger from 'logging';

const syncActiveCompany = async (lasecAuthentication: LasecAuthentication) : Promise<LasecAuthentication> => {

  if(isNil(lasecAuthentication) === false) {
    if(isNil(lasecAuthentication.props.activeCompany) === true) {                              
      const commandText = `
      SELECT 
        live_company as activeCompany 
      FROM 
        StaffUser
      WHERE
        staffuserid = ${lasecAuthentication.props.payload.user_id}`;
      const activeCompanyResult: any[] = await mysql(commandText, 
      'mysql.lasec360').then();

      if(isArray(activeCompanyResult) === true && activeCompanyResult.length >= 1) {
        lasecAuthentication.props.activeCompany = activeCompanyResult[0].activeCompany;
      }
    }
  } 

  return lasecAuthentication;
}

const database: IReactoryDatabase = {  
  Create: {

  },
  Read: {
    LasecGet360User: async (queryCommand: SQLQuery): Promise<any> => {
      const { context } = queryCommand;          
        return await mysql(`
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;
        SELECT 
          usr.username, 
            usr.company, 
            usr.email, 
            usr.status,
            usr.sales_team_id,
            usr.department,
            usr.live_company
          from StaffUser as usr WHERE staffuserid = ${queryCommand.filters};
        COMMIT;`, 
          context.connectionId || 'mysql.lasec360'
        ).then();      
    },
    /**
     * Returns a list of product classes for the currently logged in user
     */
    LasecGetProductClasses: async (queryCommand: SQLQuery): Promise<ProductClass[]> => {
      const { user } = global;
      const { context } = queryCommand;
      let activeCompany: number = 2; //default to SysProCompany2

      if(user && user.getAuthentication) {
        const lasecAuth: LasecAuthentication = user.getAuthentication('lasec') as LasecAuthentication;
        if(isNil(lasecAuth) === false) {
          if(isNil(lasecAuth.props.activeCompany) === true) {                              
            const commandText = `
            SELECT 
              live_company as activeCompany 
            FROM 
              StaffUser
            WHERE
              staffuserid = ${lasecAuth.props.payload.user_id}`;
            const activeCompanyResult: any[] = await mysql(commandText, 
            'mysql.lasec360').then();

            if(isArray(activeCompanyResult) === true) {
              lasecAuth.props.activeCompany = activeCompanyResult[0].activeCompany;
              activeCompany = lasecAuth.props.activeCompany;
              user.setAuthentication('lasec', lasecAuth);
            }
          }
        }

        let company: LasecCompany =  CONSTANTS.GetCompanyWithId(activeCompany);
                
        return await mysql(`
          SELECT 
            ProductClass as id, 
            Description as name 
          FROM 
            SalProductClassDes
          WHERE
            SysProCompany = '${company.sysproCompany}'
          `, 
          context.connectionId || 'mysql.lasec360'
        ).then()
      } else {
        throw new ApiError('User not authenticated');
      }
      
    },
    LasecGetUserTargets: async (queryCommand: SQLQuery): Promise<any[]> => {
      logger.debug(`lasec/database.Read.LasecGetUserTargets(querCommand)`, {queryCommand});
      const { user } = global;
      const { context } = queryCommand;

      if(user && user.getAuthentication) {
        let lasecAuth: LasecAuthentication = user.getAuthentication('lasec') as LasecAuthentication;
        lasecAuth = await syncActiveCompany(lasecAuth);
        user.setAuthentication('lasec', lasecAuth);                
        return await mysql(`
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        ${context.commandText}
        COMMIT;`, context.connectionId || 'mysql.lasec360').then();  
      }
      return [];
    }
  },
  Update: {

  },
  Delete: {

  },
  StoredProcedures: {

  }
};

export default database;