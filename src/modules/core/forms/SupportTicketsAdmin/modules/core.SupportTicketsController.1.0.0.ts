const SupportTicketController = (props: any) => {

  const { reactory, form } = props;

  reactory.log(`SupportTicketsController`, { }, 'debug');  
}

//@ts-ignore
if(window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent({
    name: 'SupportTicketsController',
    nameSpace: 'core',
    version: '1.0.0',
    component: Controller,
    roles: ['USER', 'ADMIN', 'DEVELOPER']
  });
  //@ts-ignore
  window.reactory.api.emit('onCoreSupportTicketsControllerInstalled');
};