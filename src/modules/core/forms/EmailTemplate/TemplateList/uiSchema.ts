export default {
  results : {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'Id',      
      primaryText: '${item.name}',
      secondaryText: '${item.description}',
      variant: 'button',
      secondaryAction: {
        iconKey: 'edit',
        label: 'Edit',
        componentFqn: 'core.Link',
        action: 'event:onRouteChanged',
        link: '/template/edit/${item.id}'
      }
    }
  }  
};