import { merge } from 'lodash';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';
import Reactory from '@reactory/reactory-core'
import * as Scalars from './scalars'

const resolvers = {
  Query: {
    
  },
  Any: Scalars.Any,
  ObjID: Scalars.ObjID,
  Date: Scalars.Date,
  Upload: Scalars.Upload,
};

const installedModulesResolvers: Reactory.Graph.IGraphShape[] = [];

modules.enabled.forEach((installedModule: Reactory.Server.IReactoryModule) => {
  if (installedModule.graphDefinitions) {
    logger.debug(`GraphQL: Loading Resolvers - ${installedModule.name}`);
    if (installedModule.graphDefinitions.Resolvers) {      
      installedModulesResolvers.push(installedModule.graphDefinitions.Resolvers);
    }
  }
});

merge(resolvers,  ...installedModulesResolvers);

export default resolvers;
