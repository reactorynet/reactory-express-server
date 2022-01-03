

const StatusWidget = (props: any) => {

  const { reactory, form, status = 'new', useCase = 'grid' } = props;

  const { React, Material, DropDownMenu, FullScreenModal } = reactory.getComponents(["react.React", "material-ui.Material", "core.DropDownMenu", "core.FullScreenModal"])
  const { MaterialCore, MaterialStyles } = Material;
  const { Typography } = MaterialCore;
  return (
  <Typography variant="body2">
    {status.toUpperCase()}
  </Typography>
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