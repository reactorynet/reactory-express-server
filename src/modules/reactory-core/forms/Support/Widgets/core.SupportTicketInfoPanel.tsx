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

const TicketInfoPanel = (props: StatusWidgetProps) => {

  const { reactory, form, status = 'new', useCase = 'grid', ticket, style = {} } = props;

  const { React, Material, DropDownMenu, FullScreenModal, SupportTicket } = reactory.getComponents<StatusWidgetDependencies>([
    "react.React",
    "material-ui.Material",
    "core.DropDownMenu",
    "core.FullScreenModal",
    "core.SupportTicket"
  ]);

  if(ticket === null || ticket === undefined) return (<>NO TICKET DATA</>)

  const { MaterialCore, MaterialStyles } = Material;
  const { Typography, Grid } = MaterialCore;
  const [modal, setModal] = React.useState<boolean>(false)

  const onMenuSelect = (evt: React.SyntheticEvent, menu: Reactory.Client.Components.IDropDownMenuItem) => {
    if (menu.id === 'open') {
      setModal(true);
    }
  };

  let menus: Reactory.Client.Components.IDropDownMenuItem[] = [
    { id: 'open', icon: 'search', title: 'View', key: 'open' },
    { id: 'comment', icon: 'comment', title: 'Comment', key: 'comment' },
    { id: 'close', icon: 'close', title: 'Close', key: 'title' }
  ];

  let assignedTo: Reactory.Models.IUserBio = {
    firstName: 'NOT',
    lastName: 'ASSIGNED', 
  }

  if(ticket.assignedTo) {
    assignedTo = (ticket.assignedTo as Reactory.Models.IUserBio);
  }

  return (
    <Grid container>
      <Grid alignItems={'center'} item xs={12} sm={12} md={6} lg={4} xl={3}>        
        <Typography variant="body2">
          {ticket.reference || "NO REFERENCE NO"}          
        </Typography>
      </Grid>
      <Grid alignItems={'center'} item xs={12} sm={12} md={6} lg={4} xl={3}>        
        <Typography variant='body2'>
          {new Date(ticket.createdDate).toISOString()}
        </Typography>                
      </Grid>
      <Grid alignItems={'center'} item xs={12} sm={12} md={6} lg={4} xl={3}>
        <Typography variant='body2'>
          Assigned To: {assignedTo.firstName} {assignedTo.lastName}
        </Typography>        
      </Grid>      
    </Grid>
  );
};


const Definition: any = {
  name: 'SupportTicketInfoPanel',
  nameSpace: 'core',
  version: '1.0.0',
  component: TicketInfoPanel,
  roles: ['USER']
}

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace,
    Definition.name,
    Definition.version,
    TicketInfoPanel,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: TicketInfoPanel 
  });
}