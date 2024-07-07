import Reactory from '@reactory/reactory-core';

interface StatusWidgetDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  DropDownMenu: Reactory.Client.Components.DropDownMenu,
  FullScreenModal: Reactory.Client.Components.FullScreenModal,
  SupportTicket: Reactory.Client.Components.SupportTicket,
}

interface StatusWidgetProps {
  reactory: Reactory.Client.IReactoryApi,
  form?: any,
  status: string,
  ticket: Reactory.Models.IReactorySupportTicket,
  useCase: string,
  style: any
}

const StatusWidget = (props: StatusWidgetProps) => {

  const { reactory, form, status = 'new', useCase = 'grid', ticket, style = {} } = props;

  const { React, Material, DropDownMenu, FullScreenModal, SupportTicket } = reactory.getComponents<StatusWidgetDependencies>([
    "react.React", 
    "material-ui.Material", 
    "core.DropDownMenu", 
    "core.FullScreenModal",
    "core.SupportTicket"
  ]);

  const { MaterialCore, MaterialStyles } = Material;
  const { Typography } = MaterialCore;
  const [ modal, setModal ] = React.useState<boolean>(false)

  const onMenuSelect = (evt: React.SyntheticEvent, menu: Reactory.Client.Components.IDropDownMenuItem) => {
    if(menu.id === 'open') {
      setModal(true);
    }
  };

  let menus: Reactory.Client.Components.IDropDownMenuItem[] = [
    { id: 'open', icon: 'search', title: 'View', key: 'open' },
    { id: 'comment', icon: 'comment', title: 'Comment', key: 'comment'},
    { id: 'close', icon: 'close', title: 'Close', key: 'title'}
  ];

  return (
    <>
      <span style={{ display: 'flex', ...style }}>
        {useCase === 'grid' && <Typography variant="body2">
          {status.toUpperCase()}
        </Typography>}
        <DropDownMenu menus={menus} onSelect={onMenuSelect} />      
      </span>
      <FullScreenModal title={`Support ticket ${ticket.reference}`} open={modal === true} onClose={() => setModal(false)}>
        <SupportTicket reference={ticket.reference} mode={'view'} />
      </FullScreenModal>
    </>
  );
};


const Definition: any = {
  name: 'SupportTicketStatusComponent',
  nameSpace: 'core',
  version: '1.0.0',
  component: StatusWidget,
  roles: ['USER']
}

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace,
    Definition.name,
    Definition.version,
    StatusWidget,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, component: StatusWidget });
}