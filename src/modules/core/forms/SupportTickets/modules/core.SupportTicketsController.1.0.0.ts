const Controller = (props: any) => {

  const { reactory, form } = props;

  reactory.log(`SupportTicketsController`, { }, 'debug');  
}


const ComponentDefinition = { 
  name: 'SupportTicketsController',
  nameSpace: 'core',
  version: '1.0.0',
  component: Controller,
  roles: ['USER', 'ADMIN', 'DEVELOPER']
}

//@ts-ignore
if(window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(ComponentDefinition);
  //@ts-ignore
  window.reactory.api.emit('onCoreSupportTicketsControllerInstalled');
}