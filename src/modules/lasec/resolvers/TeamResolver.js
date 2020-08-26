import om from 'object-mapper';
import { ObjectId } from 'mongodb';
import LasecAPI from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
export default {    
  Query: {
    LasecSalesTeams: async () => {

      //TODO: Check why this is still in here, does not seem to be used.

      logger.debug(`TeamResolver.LasecSalesTeams()`);
      const teamsPayload = await LasecAPI.Teams.list().then();    
      if(teamsPayload.status === "success") {        
        const { items }  = teamsPayload.payload || [];
        const teams = items.map((sales_team) => {
          return {
            id: sales_team.sales_team_id,
            title: sales_team.sales_team_id,
            description: `Sales team ${sales_team.sales_team_id}`,
            meta: {
              id: sales_team.sales_team_id,
              reference: sales_team.sales_team_id,
              owner: global.partner ? global.partner.key: 'system'
            }
          };
        });

        return teams;
      }
      
      return [];      
    },    
  },
  Mutation: {

  }
};
