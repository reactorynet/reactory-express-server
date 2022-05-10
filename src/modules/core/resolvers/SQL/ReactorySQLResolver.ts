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
  QueryStringResultWithCount,

} from '@reactory/server-core/database/types';
import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';


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


const ReactorySQLResolver = {
  Query: {
    ReactorySQLQuery: async (obj: any, params: SQLQueryParams, context: Reactory.Server.IReactoryContext): Promise<SQLQueryResult> => {

      const { input } = params;
      const { connectionId } = input.context;

      const result: SQLQueryResult = {
        columns: input.columns,
        context: input.context,
        data: [],
        filters: input.filters || [],
        paging: {
          hasNext: true,
          page: input.paging.page,
          pageSize: input.paging.pageSize,
          total: 0,
        },
      };

      const query: QueryStringResultWithCount = await MySQLQueryStringGenerator.fromQuery(input).then();
      logger.debug(`Query String Generated: ${query}`, query);
      result.data = await mysql(query.query, connectionId, undefined, context).then();
      result.columns = input.columns;
      result.paging = {
        hasNext: (input.paging.page * input.paging.pageSize) < query.count ? true : false,
        page: input.paging.page,
        pageSize: input.paging.pageSize,
        total: query.count,
      };
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
    },
  },
};

export default ReactorySQLResolver;