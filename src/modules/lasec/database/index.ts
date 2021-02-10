import { isNil, isArray, template } from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import { IReactoryDatabase, SQLQuery, Operator, SQLInsert } from '@reactory/server-core/database/types';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import CONSTANTS, { LasecCompany } from '@reactory/server-modules/lasec/constants';


import {
  ProductClass,
  LasecAuthentication,
  LasecDatabase,
  LasecCurrency,

} from '@reactory/server-modules/lasec/types/lasec';

import ApiError from 'exceptions';
import { fileAsString } from 'utils/io';
import logger from 'logging';
import { encode } from 'jwt-simple';
import ReactoryUserModel from 'models/schema/User';
import { getCacheItem } from '../models';

const syncActiveCompany = async (lasecAuthentication: LasecAuthentication, context: Reactory.IReactoryContext): Promise<LasecAuthentication> => {

  if (isNil(lasecAuthentication) === false) {
    if (isNil(lasecAuthentication.props.activeCompany) === true) {
      const commandText = `
      SELECT 
        live_company as activeCompany 
      FROM 
        StaffUser
      WHERE
        staffuserid = ${lasecAuthentication.props.payload.user_id}`;
      const activeCompanyResult: any[] = await mysql(commandText,
        'mysql.lasec360', null, context).then();

      if (isArray(activeCompanyResult) === true && activeCompanyResult.length >= 1) {
        lasecAuthentication.props.activeCompany = activeCompanyResult[0].activeCompany;
      }
    }
  }

  return lasecAuthentication;
}

const database: LasecDatabase = {
  Install: {
    LasecLog: async (context: Reactory.IReactoryContext): Promise<boolean> => {

      try {

        const table_exists_sql = `
        SELECT count(1) as count 
        FROM information_schema.tables
        WHERE table_schema = 'Lasec360' 
            AND table_name = 'ReactoryLog'
        LIMIT 1;`;

        let count_results: any[] = await mysql(table_exists_sql, 'mysql.lasec360', null, context).then();

        if (count_results.length === 1) {
          if (count_results[0].count === 0) {
            await mysql(`CREATE TABLE \`Lasec360\`.\`ReactoryLog\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`timestamp\` BIGINT NOT NULL,
          \`username\` VARCHAR(500) NOT NULL,
          \`message\` VARCHAR(8000) CHARACTER SET 'utf8mb4' NOT NULL,
          \`data\` JSON NULL,
          \`severity\` INT NOT NULL,
          \`source\` VARCHAR(45) NOT NULL,
          PRIMARY KEY (\`id\`));
        `, 'mysql.lasec360', null, context);
          }
        }

        return true;
      } catch (installFail) {
        logger.error('Could not install ReactoryLog for lasec', installFail);

        return false
      }



    }
  },
  Create: {
    WriteLog: async (values: any, context: Reactory.IReactoryContext): Promise<boolean> => {

      try {
        mysql(`
      INSERT INTO Lasec360.ReactoryLog(timestamp, username, message, data, severity, source) 
      VALUES ( 
        ${new Date().valueOf()}, 
        '${context.user.fullName(true)}', 
        '${values.message}', 
        '${JSON.stringify(values.data || {})}',
        ${values.severity || 0},
        '${values.source || 'not-set'}')`, 'mysql.lasec360', null, context).then().catch((sqlErr) => {
          logger.error('Could not insert log value');
          return false
        })

        return true;
      } catch (sqlError) {
        logger.error('Could not insert log value');
        return false
      }

    },
  },
  Read: {
    LasecGet360User: async (queryCommand: SQLQuery, request_context: Reactory.IReactoryContext): Promise<any> => {
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
        context.connectionId || 'mysql.lasec360',
        undefined,
        request_context
      ).then();
    },
    /**
     * Returns a list of product classes for the currently logged in user
     */
    LasecGetProductClasses: async (queryCommand: SQLQuery, request_context: Reactory.IReactoryContext): Promise<ProductClass[]> => {
      const { user } = request_context;
      const { context } = queryCommand;
      let activeCompany: number = 2; //default to SysProCompany2

      if (user && user.getAuthentication) {
        const lasecAuth: LasecAuthentication = user.getAuthentication('lasec') as LasecAuthentication;
        if (isNil(lasecAuth) === false) {
          if (isNil(lasecAuth.props.activeCompany) === true) {
            const commandText = `
            SELECT 
              live_company as activeCompany 
            FROM 
              StaffUser
            WHERE
              staffuserid = ${lasecAuth.props.payload.user_id}`;
            const activeCompanyResult: any[] = await mysql(commandText,
              'mysql.lasec360', undefined, request_context).then();

            if (isArray(activeCompanyResult) === true) {
              lasecAuth.props.activeCompany = activeCompanyResult[0].activeCompany;
              activeCompany = lasecAuth.props.activeCompany;
              user.setAuthentication('lasec', lasecAuth);
            }
          }
        }

        let company: LasecCompany = CONSTANTS.GetCompanyWithId(activeCompany);

        return await mysql(`
          SELECT 
            ProductClass as id, 
            Description as name 
          FROM 
            SalProductClassDes
          WHERE
            SysProCompany = '${company.sysproCompany}'
          `,
          context.connectionId || 'mysql.lasec360',
          undefined,
          request_context,
        ).then()
      } else {
        throw new ApiError('User not authenticated');
      }

    },
    LasecGetUserTargets: async (queryCommand: SQLQuery, request_context: Reactory.IReactoryContext): Promise<any[]> => {
      logger.debug(`lasec/database.Read.LasecGetUserTargets(querCommand)`, { queryCommand });
      const { user } = request_context;
      const { context } = queryCommand;

      if (user && user.getAuthentication) {
        let lasecAuth: LasecAuthentication = user.getAuthentication('lasec') as LasecAuthentication;
        lasecAuth = await syncActiveCompany(lasecAuth, request_context);
        user.setAuthentication('lasec', lasecAuth);
        return await mysql(`
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        ${context.commandText}
        COMMIT;`, context.connectionId || 'mysql.lasec360', undefined, request_context).then();
      }
      return [];
    },
    LasecGetCurrencies: async (querycommand: SQLQuery, context: Reactory.IReactoryContext): Promise<LasecCurrency[]> => {
      //return getCacheItem(`lasec-crm.Currencies`, , 180, context.partner);
      return mysql(`SELECT currencyid as id, code, name, symbol, spot_rate, web_rate FROM Currency`, 'mysql.lasec360', undefined, context);
    },
  },
  Update: {

  },
  Delete: {

  },
  StoredProcedures: {

  }
};

export default database;