import { queryAsync as mysql, MySQLQueryStringGenerator } from '@reactory/server-core/database/mysql';
import {

  SQLDelete,
  SQLDeleteResult,
  
  SQLInsert,
  SQLInsertResult,

  SQLUpdate,
  SQLUpdateResult,

  SQLQuery,
  SQLQueryResult,

} from '@reactory/server-core/database/types';
import logger from 'logging';


interface SQLQueryParams {
  connectionId: string,
  input: SQLQuery
}

interface SQLInsertParams {
  connectionId: string,
  input: SQLInsert
}

interface SQLUpdateParams {
  connectionString: string,
  input: SQLUpdate
}

interface SQLDeleteParams {
  connectionId: string,
  input: SQLDelete
}




const queryFromInput = (query: SQLQuery, connectionId: string) :string => {
  
  return `SELECT FROM ${query.context.}`;
};

const ReactorySQLResolver = {
  Query : {
    ReactorySQLQuery: async (obj: any, params: SQLQueryParams): Promise<SQLQueryResult>  => {
      let result: SQLQueryResult;
      const { connectionId, input } = params;
      
      let query: string = MySQLQueryStringGenerator.fromQuery(input);
      logger.debug(`Query String Generated: ${query}`);
      
      result.data = await mysql(query, connectionId).then();
      result.columns = input.columns;
      result.paging = {
        hasNext: true,
        page: 1,
        pageSize: 100,
        total: result.data.length
      };
      result.filters = input.filters;
      result.context = input.context;
      
      return result;
    }
  },
  Mutation: {
    ReactorySQLInsert: async (obj: any, params: any): Promise<SQLInsertResult> => {
      let result: SQLInsertResult;


      return result;
    },
    ReactorySQLUpdate: async (obj: any, params: any): Promise<SQLUpdateResult> => {
      let result: SQLUpdateResult;


      return result;
    },
    ReactorySQLDelete: (obj: any, params: any) => {
      let result: SQLDeleteResult;


      return result;
    }
  }
}

export default ReactorySQLResolver