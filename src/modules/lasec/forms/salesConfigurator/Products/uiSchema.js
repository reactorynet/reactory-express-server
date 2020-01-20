export default {
  list: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      primaryText: '${item.name}',
      showAvatar: false,
      icon: 'history',
      variant: 'button',
      secondaryAction: {
        iconKey: 'Email',
        label: 'Send Query',
        componentFqn: 'core.SlideOutLauncher@1.0.0',
        action: 'mount:Component',
        link: '/product-query',
        props: {
          componentFqn: 'lasec-crm.ProductQuery@1.0.0',
          componentProps: {
            'formData': 'formData'
          },
          slideDirection: 'down',
          buttonTitle: 'Send Product Query',
          windowTitle: 'Send Product Query for: ${formData.name}',
          buttonVariant: 'IconButton',
        },
      },
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
