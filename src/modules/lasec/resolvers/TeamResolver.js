import om from 'object-mapper';
import { ObjectId } from 'mongodb';
import LasecAPI from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
export default {
  Query: {
    LasecSalesTeamsFromApi: async (obj, params, context) => {

      logger.debug(`TeamResolver.LasecSalesTeams()`);

      const teamsPayload = await LasecAPI.Teams.list(context).then();

      logger.debug(`TEAMS PAYLOAD:: :: ${JSON.stringify(teamsPayload)}`);

      if (teamsPayload.status === 'success') {
        const { items } = teamsPayload.payload || [];
        const teams = items.map((salesTeam) => {
          return {
            id: salesTeam.id,
            title: salesTeam.name,
            description: salesTeam.description,
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
