
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';

const typeDefs: any[] = [];
modules.enabled.forEach((installedModule: any) => {
  if (installedModule.graphDefinitions) {
    logger.debug(`♻ Adding Reactory Graph Types ${installedModule.name}`);
    if (installedModule.graphDefinitions.Types) {
      installedModule.graphDefinitions.Types.forEach((typeDef: any) => {
        typeDefs.push(typeDef);
      });
    }
  }
});

export default typeDefs;
