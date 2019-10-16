import om from 'object-mapper';
import { ObjectId } from 'mongodb';
import LasecAPI from '../api';
import logger from '../../../logging';
export default {  
  Query: {
    LasecSalesTeams: async () => {
      const teamsPayload = await LasecAPI.Teams.list().then();    
      if(teamsPayload.status === "success") {        
        const { items }  = teamsPayload.payload || [];
        const teams = items.map((sales_team) => {
          return {
            _id: new ObjectId(),
            title: sales_team.sales_team_id,
            description: `Sales team ${sales_team.sales_team_id}`,
            meta: {
              _id: new ObjectId(),
              reference: sales_team.sales_team_id,
              owner: global.partner ? global.partner.key: 'system'
            }
          };
        });

        return teams;
      }
      
      return [];      
    }
  },
  Mutation: {

  }
};
