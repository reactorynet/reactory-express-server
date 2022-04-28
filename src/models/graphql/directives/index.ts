import modules from '@reactory/server-core/modules';


const directiveProviders: Reactory.Graph.IGraphDirectiveProvider[] = []

modules.enabled.forEach((installedModule) => {
  if (installedModule.graphDefinitions) {  
    if (installedModule.graphDefinitions.Directives) {
      installedModule.graphDefinitions.Directives.forEach((provider) => {
        directiveProviders.push(provider);
      })
    }
  }
});


export default directiveProviders;