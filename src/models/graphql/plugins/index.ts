import { ApolloServerPlugin } from '@apollo/server';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';

const plugins: ApolloServerPlugin<Reactory.Server.IReactoryContext>[] = [];

modules.enabled.forEach((installedModule: Reactory.Server.IReactoryModule) => {
  if (installedModule.graphDefinitions) {
    logger.debug(`GraphQL: Loading Plugins - ${installedModule.name}`);
    if (installedModule.graphDefinitions.Plugins) {
      const sortedPlugins = [...installedModule.graphDefinitions.Plugins].sort((a, b) => a.ordinal - b.ordinal);
      sortedPlugins.forEach((plugin) => {
        plugins.push(plugin.component);
      });
    }
  }
});

export default plugins;