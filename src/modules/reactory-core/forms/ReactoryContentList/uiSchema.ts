import { IReactoryContentItem } from "./types";

const ListOptions: Reactory.Client.Components.IMaterialListWidgetOptions<IReactoryContentItem> = {  
  showTitle: false,
  pagination: {
    pageSize: 10,
    
  },
  id: 'Id',      
  primaryText: '${item.primaryText}',
  secondaryText: '${props.reactory.utils.moment(item.secondaryText).format(\'DD MMM YYYY HH:mm\')}',
  variant: 'button',
  secondaryAction: {
    iconKey: 'edit',
    label: 'Edit',
    componentFqn: 'core.Link',
    props: {
      link: '/static-content/edit/$formData.primaryText}/'
    },
    action: 'event:onRouteChanged',
  }
};

export default {
  'ui:widget': 'MaterialListWidget',
  'ui:options':  ListOptions
};
