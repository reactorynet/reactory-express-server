

const Controller = (props: any) => {

  const { reactory } = props;

  reactory.log(`SupportFormController`);

  
}


const ComponentDefinition = { 
  name: 'SupportFormController',
  nameSpace: 'core',
  version: '1.0.0',
  component: Controller,
  roles: ['USER']
}

//@ts-ignore
if(window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(ComponentDefinition);
  //@ts-ignore
  window.reactory.api.emit('onCoreSupportFormControllerInstalled');
}