
export default {
  contentList:{
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'Id',
      // showAvatar: true,
      // avatarSrc: '${props.api.getAvatar(item.who)}',
      // iconField: 'actionType',      
      primaryText: '${item.primaryText}',
      secondaryText: '${props.api.utils.moment(item.secondaryText).format(\'DD MMM YYYY HH:mm\')}',
      variant: 'button',
      secondaryAction: {
        iconKey: 'edit',
        label: 'Edit',
        componentFqn: 'core.Link',
        action: 'event:onRouteChanged',
        link: '#/content-capture/edit/${item.primaryText}/'
      }
    }
  },
};
