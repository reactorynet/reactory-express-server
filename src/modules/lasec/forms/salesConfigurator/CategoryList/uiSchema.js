export default {
  list: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'Id',
      primaryText: '${item.name}',
      showAvatar: false,
      icon: 'history',
      variant: 'button',
      secondaryAction: {
        iconKey: 'edit',
        label: 'Edit',
        componentFqn: 'core.Link',
        action: 'event:onRouteChanged',
        link: '#/capturecategory/edit/${item.id}/'
      }
    }
  },
  addMore: {
    'ui:options': {
      componentFqn: 'core.SlideOutLauncher',
      componentProps: {
        buttonVariant: 'SpeedDial',
        componentFqn: 'lasec-crm.CaptureCategory',
        actions: [
          {
            key: 'new-quote',
            title: 'New Quote',
            clickAction: 'navigate',
            icon: 'create',
            enabled: true,
            ordinal: 0,
            eventHandler: 'toBeImplemented'
          }
        ]
      }
    }
  }

};
