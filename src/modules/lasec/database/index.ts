import { isNil, isArray } from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import { IReactoryDatabase, SQLQuery, Operator } from '@reactory/server-core/database/types';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import CONSTANTS, { LasecCompany } from '@reactory/server-modules/lasec/constants';


import {
  ProductClass,
  LasecAuthentication,
} from '@reactory/server-modules/lasec/types/lasec';

import ApiError from 'exceptions';


const database: IReactoryDatabase = {  
  Create: {

  },
  Read: {
    LasecGet360User: async (queryCommand: SQLQuery): Promise<any> => {

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