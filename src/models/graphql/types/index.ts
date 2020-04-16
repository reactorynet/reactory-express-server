
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-modules';

const typeDefs: any[] = [];
modules.enabled.forEach((installedModule) => {
/**
    "id": "0c22819f-bca0-4947-b662-9190063c8277",
    "name": "Lasec",
    "key": "lasec",
    "fqn": "lasec.LasecCRM@1.0.0",
    "moduleEntry": "./lasec/index.js",
    "license": "commercial",
    "shop": "https://reactory.net/shop/modules/0c22819f-bca0-4947-b662-9190063c8277/"
 */
  if (installedModule.graphDefinitions) {
    logger.debug(`Extending Reactory Graph Types ${installedModule.name}`);
    if (installedModule.graphDefinitions.Types) {
      installedModule.graphDefinitions.Types.forEach((typeDef) => {
        typeDefs.push(typeDef);
      });
    }
  }
});


export default typeDefs;
