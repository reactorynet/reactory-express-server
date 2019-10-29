export default {
  list: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      primaryText: '${item.name}',
      showAvatar: false,
      icon: 'history'
    }
  },
  addMore: {
    'ui:options': {
      componentFqn: 'core.SlideOutLauncher',
      componentProps: {
        //buttonVariant: 'SpeedDial',
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
